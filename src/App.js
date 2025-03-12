import React, { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  // --- STATE MANAGEMENT ---
  // Core data
  const [image, setImage] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [categories, setCategories] = useState([
    { id: 1, name: 'Location', color: '#FF5252' },
    { id: 2, name: 'Point of Interest', color: '#2196F3' },
    { id: 3, name: 'Landmark', color: '#4CAF50' },
  ]);
  const [activeCategory, setActiveCategory] = useState(1);
  
  // UI states
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#9C27B0');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Viewport states
  const [viewportTransform, setViewportTransform] = useState({
    scale: 1,
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // --- REFS ---
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const editInputRef = useRef(null);
  
  // --- UTILITY FUNCTIONS ---
  // Show a notification
  const notify = (message, type = 'info', duration = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };
  
  // Get color brightness to determine contrasting text color
  const getContrastColor = (hexColor) => {
    if (!hexColor || hexColor.length < 7) return '#ffffff';
    
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    } catch (e) {
      return '#ffffff';
    }
  };
  
  // Generate a random color
  const getRandomColor = () => {
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', 
      '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
      '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
      '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'
    ];
    
    // Avoid colors already in use
    const availableColors = colors.filter(color => 
      !categories.some(category => category.color === color)
    );
    
    if (availableColors.length === 0) {
      // Generate a truly random color if all predefined colors are used
      const r = Math.floor(Math.random() * 225 + 30);
      const g = Math.floor(Math.random() * 225 + 30);
      const b = Math.floor(Math.random() * 225 + 30);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };
  
  // Calculate image display dimensions for optimal fit
  const getImageDisplayDimensions = () => {
    if (!image || !containerRef.current) return { width: 0, height: 0 };
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = image.width / image.height;
    
    if (imageRatio > containerRatio) {
      // Image is wider than container (relative to height)
      return {
        width: containerWidth,
        height: containerWidth / imageRatio
      };
    } else {
      // Image is taller than container (relative to width)
      return {
        width: containerHeight * imageRatio,
        height: containerHeight
      };
    }
  };
  
  // Convert screen coordinates to image coordinates
  const screenToImageCoords = (screenX, screenY) => {
    if (!containerRef.current || !image) return { x: 0, y: 0 };
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Get relative position within the container
    const relativeX = (screenX - rect.left - viewportTransform.x) / viewportTransform.scale;
    const relativeY = (screenY - rect.top - viewportTransform.y) / viewportTransform.scale;
    
    // Convert to image coordinates
    const imageDimensions = getImageDisplayDimensions();
    const scaleX = image.width / imageDimensions.width;
    const scaleY = image.height / imageDimensions.height;
    
    return {
      x: relativeX * scaleX,
      y: relativeY * scaleY
    };
  };
  
  // Convert image coordinates to screen coordinates
  const imageToScreenCoords = (imageX, imageY) => {
    if (!containerRef.current || !image) return { x: 0, y: 0 };
    
    const imageDimensions = getImageDisplayDimensions();
    const scaleX = imageDimensions.width / image.width;
    const scaleY = imageDimensions.height / image.height;
    
    return {
      x: imageX * scaleX * viewportTransform.scale + viewportTransform.x,
      y: imageY * scaleY * viewportTransform.scale + viewportTransform.y
    };
  };
  
  // --- EVENT HANDLERS ---
  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Only accept image files
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage({
          src: event.target.result,
          width: img.width,
          height: img.height,
          name: file.name,
          type: file.type
        });
        
        // Reset view
        setViewportTransform({ scale: 1, x: 0, y: 0 });
        setMarkers([]);
      };
      
      img.onerror = () => {
        notify('Failed to load image', 'error');
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      notify('Failed to read file', 'error');
    };
    
    reader.readAsDataURL(file);
  };
  
  // Handle clipboard paste
  const handlePaste = (e) => {
    if (!e.clipboardData) return;
    
    const items = e.clipboardData.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            setImage({
              src: event.target.result,
              width: img.width,
              height: img.height,
              name: 'pasted-image.png',
              type: item.type
            });
            
            // Reset view
            setViewportTransform({ scale: 1, x: 0, y: 0 });
            setMarkers([]);
            
            notify('Image pasted successfully', 'success');
          };
          
          img.onerror = () => {
            notify('Failed to load pasted image', 'error');
          };
          
          img.src = event.target.result;
        };
        
        reader.onerror = () => {
          notify('Failed to read pasted image', 'error');
        };
        
        reader.readAsDataURL(blob);
        break;
      }
    }
  };
  
  // Handle canvas click to add/remove markers
  const handleCanvasClick = (e) => {
    if (!image) return;
    
    // Get image coordinates from screen coordinates
    const coords = screenToImageCoords(e.clientX, e.clientY);
    
    // Check if clicking on an existing marker (for deletion)
    const clickedMarkerIndex = markers.findIndex(marker => {
      const dx = marker.x - coords.x;
      const dy = marker.y - coords.y;
      // Use a reasonable radius for hit detection (in image coordinates)
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });
    
    if (clickedMarkerIndex !== -1) {
      // Remove the marker
      const updatedMarkers = [...markers];
      updatedMarkers.splice(clickedMarkerIndex, 1);
      setMarkers(updatedMarkers);
    } else {
      // Add a new marker
      const category = categories.find(c => c.id === activeCategory);
      
      // Only add if we have an active category
      if (category) {
        setMarkers([
          ...markers,
          {
            id: Date.now(),
            x: coords.x,
            y: coords.y,
            categoryId: activeCategory
          }
        ]);
      }
    }
  };
  
  // Handle dragging for pan
  const handleMouseDown = (e) => {
    // Only enable panning with middle mouse button or Alt+Left button
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - viewportTransform.x,
        y: e.clientY - viewportTransform.y
      });
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setViewportTransform({
        ...viewportTransform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle mouse wheel for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    
    // Get mouse position relative to container
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(10, viewportTransform.scale * delta));
    
    // Adjust position to zoom toward/away from mouse
    const newTransform = {
      scale: newScale,
      x: mouseX - ((mouseX - viewportTransform.x) * newScale / viewportTransform.scale),
      y: mouseY - ((mouseY - viewportTransform.y) * newScale / viewportTransform.scale)
    };
    
    setViewportTransform(newTransform);
  };
  
  // Reset the zoom/pan to default
  const resetView = () => {
    setViewportTransform({ scale: 1, x: 0, y: 0 });
  };
  
  // Start editing a category name
  const startEditingCategory = (category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name);
  };
  
  // Save the edited category name
  const saveEditedCategory = () => {
    if (!editingCategoryId) return;
    
    if (newCategoryName.trim()) {
      setCategories(categories.map(category => 
        category.id === editingCategoryId 
          ? { ...category, name: newCategoryName.trim() } 
          : category
      ));
    }
    
    setEditingCategoryId(null);
  };
  
  // Add a new category
  const addNewCategory = () => {
    const newId = Math.max(0, ...categories.map(c => c.id)) + 1;
    const newCategory = {
      id: newId,
      name: `Category ${newId}`,
      color: newCategoryColor
    };
    
    setCategories([...categories, newCategory]);
    setActiveCategory(newId);
    setShowColorPicker(false);
    setNewCategoryColor(getRandomColor());
  };
  
  // Delete a category
  const deleteCategory = (categoryId) => {
    // Prevent deleting if it's the only category
    if (categories.length <= 1) {
      notify('Cannot delete the only category', 'warning');
      return;
    }
    
    // Ask for confirmation if there are markers in this category
    const markerCount = markers.filter(m => m.categoryId === categoryId).length;
    if (markerCount > 0) {
      const confirmDelete = window.confirm(
        `This category has ${markerCount} markers. Deleting it will also remove all associated markers. Continue?`
      );
      
      if (!confirmDelete) return;
    }
    
    // Remove the category
    setCategories(categories.filter(c => c.id !== categoryId));
    
    // Remove associated markers
    setMarkers(markers.filter(m => m.categoryId !== categoryId));
    
    // Update active category if needed
    if (activeCategory === categoryId) {
      setActiveCategory(categories.find(c => c.id !== categoryId)?.id || 0);
    }
  };
  
  // Clear all markers
  const clearAllMarkers = () => {
    if (markers.length === 0) return;
    
    const confirmClear = window.confirm('Are you sure you want to clear all markers?');
    if (confirmClear) {
      setMarkers([]);
    }
  };
  
  // Export the image with markers
  const exportImage = () => {
    if (!image || markers.length === 0) return;
    
    setIsExporting(true);
    
    try {
      // Create a new canvas for export
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set dimensions to match the original image
      canvas.width = image.width;
      canvas.height = image.height + 80; // Add space for legend
      
      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      const img = new Image();
      img.onload = () => {
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Calculate marker size relative to image
        const markerSize = Math.max(10, Math.min(15, Math.min(image.width, image.height) / 50));
        
        // Draw markers
        markers.forEach(marker => {
          const category = categories.find(c => c.id === marker.categoryId);
          if (!category) return;
          
          // Draw marker circle
          ctx.beginPath();
          ctx.arc(marker.x, marker.y, markerSize, 0, Math.PI * 2);
          ctx.fillStyle = category.color;
          ctx.fill();
          
          // Draw border
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Get category markers and index
          const categoryMarkers = markers
            .filter(m => m.categoryId === marker.categoryId)
            .sort((a, b) => a.id - b.id);
          
          const markerIndex = categoryMarkers.findIndex(m => m.id === marker.id);
          
          // Draw number
          ctx.fillStyle = getContrastColor(category.color);
          ctx.font = `bold ${markerSize * 0.8}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((markerIndex + 1).toString(), marker.x, marker.y);
        });
        
        // Draw legend
        const legendY = image.height + 10;
        
        // Legend background
        ctx.fillStyle = '#F8F9FA';
        ctx.fillRect(0, image.height, canvas.width, 80);
        
        // Legend border
        ctx.strokeStyle = '#E9ECEF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, image.height);
        ctx.lineTo(canvas.width, image.height);
        ctx.stroke();
        
        // Legend title
        ctx.fillStyle = '#212529';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Legend:', 15, legendY);
        
        // Category counts
        let xPos = 100;
        const categoryInfo = categories
          .filter(category => markers.some(m => m.categoryId === category.id))
          .map(category => ({
            ...category,
            count: markers.filter(m => m.categoryId === category.id).length
          }));
        
        categoryInfo.forEach(({ name, color, count }) => {
          // Check if we need to move to next row
          if (xPos > canvas.width - 100) {
            xPos = 100;
            legendY += 25;
          }
          
          // Draw color dot
          ctx.beginPath();
          ctx.arc(xPos, legendY + 8, 8, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Draw category name and count
          ctx.fillStyle = '#495057';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${name}: ${count}`, xPos + 15, legendY);
          
          xPos += Math.min(150, (canvas.width - 150) / categoryInfo.length);
        });
        
        // Draw total count
        ctx.fillStyle = '#212529';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Total: ${markers.length}`, canvas.width - 15, legendY);
        
        // Create download link
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `marked_${image.name || 'map'}.png`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setIsExporting(false);
        notify('Image exported successfully', 'success');
      };
      
      img.onerror = () => {
        setIsExporting(false);
        notify('Failed to export image', 'error');
      };
      
      img.src = image.src;
      
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      notify('Failed to export image', 'error');
    }
  };
  
  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Number keys (1-9) to select category
      const numKey = parseInt(e.key);
      if (!isNaN(numKey) && numKey > 0 && numKey <= categories.length) {
        setActiveCategory(categories[numKey - 1].id);
        return;
      }
      
      // Keyboard shortcuts
      switch (e.key.toLowerCase()) {
        case 'h': // Toggle help
          setShowHelp(!showHelp);
          break;
          
        case 's': // Save/export (Ctrl+S)
          if ((e.ctrlKey || e.metaKey) && image) {
            e.preventDefault();
            exportImage();
          }
          break;
          
        case 'v': // Paste (Ctrl+V)
          // The paste event will handle this
          break;
          
        case 'r': // Reset view
          resetView();
          break;
          
        case 'c': // Toggle sidebar
          setShowSidebar(!showSidebar);
          break;
          
        case 'escape': // Close dialogs
          setShowHelp(false);
          setEditingCategoryId(null);
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [showHelp, categories, image, showSidebar, handlePaste]);
  
  // Focus input when editing category
  useEffect(() => {
    if (editingCategoryId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCategoryId]);
  
  // Setup mouse move/up handlers for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        handleMouseMove(e);
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);
  
  // --- RENDERING ---
  // Count markers by category
  const getCategoryCount = (categoryId) => {
    return markers.filter(m => m.categoryId === categoryId).length;
  };
  
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">MapMarker Pro</h1>
            {image && (
              <span className="text-sm text-gray-500 ml-4">
                {markers.length} {markers.length === 1 ? 'marker' : 'markers'}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {image && (
              <>
                <div className="flex items-center space-x-1 text-sm px-2 py-1 bg-gray-100 rounded">
                  <button
                    onClick={() => setViewportTransform({...viewportTransform, scale: viewportTransform.scale * 1.2})}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900"
                    title="Zoom In"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <span className="text-gray-700 w-12 text-center">
                    {Math.round(viewportTransform.scale * 100)}%
                  </span>
                  
                  <button
                    onClick={() => setViewportTransform({...viewportTransform, scale: viewportTransform.scale / 1.2})}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900"
                    title="Zoom Out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={resetView}
                    className="px-2 py-1 text-gray-600 hover:text-gray-900"
                    title="Reset View (R)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  title="Toggle Sidebar (C)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Help (H)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {image && showSidebar && (
          <div className="w-72 bg-white shadow-md z-10 flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="font-medium text-gray-700">Categories</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {categories.map((category, index) => (
                  <div 
                    key={category.id} 
                    className={`flex items-center p-2 rounded ${
                      activeCategory === category.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      className="w-10 h-10 rounded-full flex items-center justify-center mr-3 shadow-sm"
                      style={{ backgroundColor: category.color }}
                      onClick={() => setActiveCategory(category.id)}
                      title={`Select category (${index + 1})`}
                    >
                      <span 
                        style={{ color: getContrastColor(category.color) }}
                        className="text-xs font-bold"
                      >
                        {getCategoryCount(category.id)}
                      </span>
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      {editingCategoryId === category.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onBlur={saveEditedCategory}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedCategory();
                            if (e.key === 'Escape') setEditingCategoryId(null);
                          }}
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      ) : (
                        <div 
                          className="truncate text-sm font-medium cursor-pointer hover:text-blue-600"
                          onClick={() => startEditingCategory(category)}
                          title="Click to rename"
                        >
                          {category.name}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Delete category"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* Add new category */}
                {categories.length < 10 && (
                  <div className="mt-4">
                    {showColorPicker ? (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Choose Color:</span>
                          <button 
                            onClick={() => setShowColorPicker(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={newCategoryColor}
                            onChange={(e) => setNewCategoryColor(e.target.value)}
                            className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer"
                          />
                          <button
                            onClick={addNewCategory}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          >
                            Add Category
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowColorPicker(true)}
                        className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add New Category
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Summary section */}
              {markers.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-medium text-gray-700 mb-2">Summary</h3>
                  <div className="space-y-1">
                    {categories.map(category => {
                      const count = getCategoryCount(category.id);
                      if (count === 0) return null;
                      
                      return (
                        <div key={category.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="truncate">{category.name}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                    
                    <div className="flex items-center justify-between text-sm font-bold mt-2 pt-2 border-t">
                      <span>Total</span>
                      <span>{markers.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="p-4 border-t">
              <div className="space-y-2">
                <button
                  onClick={exportImage}
                  disabled={!image || markers.length === 0 || isExporting}
                  className={`w-full py-2 px-4 rounded flex items-center justify-center ${
                    !image || markers.length === 0 || isExporting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isExporting ? (
                    <span>Exporting...</span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Export Image
                    </>
                  )}
                </button>
                
                <button
                  onClick={clearAllMarkers}
                  disabled={!image || markers.length === 0}
                  className={`w-full py-2 px-4 rounded ${
                    !image || markers.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Clear All Markers
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-4 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded"
                >
                  {image ? 'Change Image' : 'Upload Image'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Image workspace */}
        <div 
          className="flex-1 relative bg-gray-900 overflow-hidden flex items-center justify-center"
          ref={containerRef}
        >
          {image ? (
            <div 
              className="relative"
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                if (e.button === 0 && !e.altKey) {
                  handleCanvasClick(e);
                }
              }}
              onWheel={handleWheel}
              style={{
                cursor: isDragging ? 'grabbing' : 'crosshair',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
              }}
            >
              {/* Main image */}
              <img
                src={image.src}
                alt="Map"
                style={{
                  transform: `scale(${viewportTransform.scale})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  top: viewportTransform.y + 'px',
                  left: viewportTransform.x + 'px',
                  maxWidth: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              />
              
              {/* Markers */}
              {markers.map(marker => {
                const category = categories.find(c => c.id === marker.categoryId);
                if (!category) return null;
                
                // Calculate screen position from image coordinates
                const screenPos = imageToScreenCoords(marker.x, marker.y);
                
                // Calculate marker size, adjusting for zoom
                const markerSize = Math.max(10, Math.min(15, 15 / viewportTransform.scale));
                
                // Calculate category index for this marker
                const categoryMarkers = markers
                  .filter(m => m.categoryId === marker.categoryId)
                  .sort((a, b) => a.id - b.id);
                
                const markerIndex = categoryMarkers.findIndex(m => m.id === marker.id);
                
                return (
                  <div
                    key={marker.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      top: screenPos.y + 'px',
                      left: screenPos.x + 'px',
                    }}
                  >
                    {/* Marker circle */}
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: markerSize * 2 + 'px',
                        height: markerSize * 2 + 'px',
                        backgroundColor: category.color,
                        border: '2px solid white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        fontSize: markerSize * 0.8 + 'px',
                        color: getContrastColor(category.color),
                        fontWeight: 'bold'
                      }}
                    >
                      {markerIndex + 1}
                    </div>
                  </div>
                );
              })}
              
              {/* Instructions overlay */}
              {markers.length === 0 && image && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black bg-opacity-70 text-white p-4 rounded-lg max-w-md text-center">
                    <p>Click anywhere to add markers</p>
                    <p className="text-sm text-gray-300 mt-1">Press H for help and keyboard shortcuts</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-md p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mt-4">Upload a Map or Image</h2>
                <p className="text-gray-400 mt-2">
                  Upload an image to start adding location markers
                </p>
                <p className="text-gray-400 mt-1">
                  You can also paste an image from clipboard using Ctrl+V
                </p>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
              >
                Select Image
              </button>
            </div>
          )}
        </div>
      </main>
      
      {/* Help dialog */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">MapMarker Pro Help</h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-5">
              <section>
                <h4 className="font-medium text-gray-700 mb-2">Markers</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><span className="font-medium">Add marker:</span> Click anywhere on the image</li>
                  <li><span className="font-medium">Remove marker:</span> Click on an existing marker</li>
                  <li><span className="font-medium">Change marker type:</span> Select a different category from the sidebar before clicking</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-700 mb-2">Navigation</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><span className="font-medium">Zoom in/out:</span> Use mouse wheel or the zoom controls</li>
                  <li><span className="font-medium">Pan around:</span> Hold Alt and drag, or use middle mouse button</li>
                  <li><span className="font-medium">Reset view:</span> Click 100% button or press R</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-700 mb-2">Categories</h4>
                <ul className="space-y-1 text-gray-600">
                  <li><span className="font-medium">Select category:</span> Click on a category in the sidebar or press 1-9</li>
                  <li><span className="font-medium">Rename category:</span> Click on the category name</li>
                  <li><span className="font-medium">Add category:</span> Click "Add New Category" and choose a color</li>
                  <li><span className="font-medium">Delete category:</span> Click the trash icon next to a category</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-700 mb-2">Keyboard Shortcuts</h4>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">1-9</kbd> Select category</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">H</kbd> Show/hide help</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">C</kbd> Toggle sidebar</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">R</kbd> Reset view</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl+S</kbd> Export image</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl+V</kbd> Paste image</li>
                  <li><kbd className="bg-gray-100 px-2 py-1 rounded">Esc</kbd> Close dialogs</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-700 mb-2">Export</h4>
                <p className="text-gray-600">
                  Click "Export Image" to save your marked map as a PNG file with a legend showing the marker categories and counts.
                </p>
              </section>
            </div>
            
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'error' ? 'bg-red-500 text-white' :
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
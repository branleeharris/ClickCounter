import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import { toPng } from 'html-to-image';
import { useCollaboration } from './contexts/CollaborationContext';
import useCollaborationSync from './hooks/useCollaborationSync';
import InviteButton from './components/InviteButton';
import CollaborationStatus from './components/CollaborationStatus';


function App() {
  // --- STATE MANAGEMENT ---
  // Core data
  const [image, setImage] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [categories, setCategories] = useState([
    { id: 1, name: 'Category 1', color: '#FF5252' },
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
  
  // Mode and cursor states
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [markerToDelete, setMarkerToDelete] = useState(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  
  // Viewport states
  const [viewportTransform, setViewportTransform] = useState({
    scale: 1,
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // --- COLLABORATION ---
  // Get collaboration context and sync hook
  const { 
    isCollaborating, 
    sessionInfo, 
    receivedImage 
  } = useCollaboration();
  
  const { 
    syncAddMarker, 
    syncRemoveMarker, 
    syncUpdateCategory 
  } = useCollaborationSync({
    markers,
    setMarkers,
    categories,
    setCategories
  });
  
  // --- REFS ---
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const editInputRef = useRef(null);
  const mapAreaRef = useRef(null);
  const markerRefs = useRef({});
  
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
  
  // Add alpha channel to a hex color
  const getColorWithAlpha = (hexColor, alpha = 0.5) => {
    if (!hexColor || hexColor.length < 7) return 'rgba(255, 255, 255, 0.5)';
    
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return 'rgba(255, 255, 255, 0.5)';
    }
  };
  
  // Get a default color based on category index
  const getDefaultCategoryColor = (index) => {
    const defaultColors = [
      '#FF5252', // Red
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#FFEB3B', // Yellow
      '#795548', // Brown
      '#607D8B', // Blue Grey
      '#E91E63'  // Pink
    ];
    
    // Use modulo to cycle through colors if we have more than 10 categories
    return defaultColors[index % defaultColors.length];
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
  
  // Check if mouse is over a marker (for delete mode)
  const checkMarkerHover = (mouseX, mouseY) => {
    if (!isAltPressed || !image || !isOverCanvas) return null;
    
    // Use direct element bounding rect for hit testing
    for (const markerId in markerRefs.current) {
      const markerEl = markerRefs.current[markerId];
      if (!markerEl) continue;
      
      const rect = markerEl.getBoundingClientRect();
      
      // Add an expanded hit area for better usability
      const expandedRect = {
        left: rect.left - 10,
        right: rect.right + 10,
        top: rect.top - 10,
        bottom: rect.bottom + 10
      };
      
      if (
        mouseX >= expandedRect.left && 
        mouseX <= expandedRect.right && 
        mouseY >= expandedRect.top && 
        mouseY <= expandedRect.bottom
      ) {
        return markers.find(m => m.id.toString() === markerId);
      }
    }
    
    return null;
  };
  
  // --- EVENT HANDLERS ---
  // Handle mouse move to update cursor position
  const handleMouseMove = (e) => {
    if (isDragging) {
      setViewportTransform({
        ...viewportTransform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    // Update mouse position
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // Check for marker hover in delete mode
    if (isAltPressed && isOverCanvas) {
      const hoveredMarker = checkMarkerHover(e.clientX, e.clientY);
      setMarkerToDelete(hoveredMarker);
    } else {
      setMarkerToDelete(null);
    }
  };
  
  // Handle mouse enter/leave for canvas
  const handleCanvasMouseEnter = () => {
    setIsOverCanvas(true);
  };
  
  const handleCanvasMouseLeave = () => {
    setIsOverCanvas(false);
    setMarkerToDelete(null);
  };
  
  // Trigger file upload dialog
  const triggerFileUpload = () => {
    // Create a temporary file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleFileUpload;
    
    // Ensure the input exists in the DOM momentarily
    document.body.appendChild(input);
    input.click();
    
    // Schedule removal from DOM after click is processed
    setTimeout(() => {
      if (input && input.parentNode) {
        document.body.removeChild(input);
      }
    }, 100);
  };
  
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
        const imageData = {
          src: event.target.result,
          width: img.width,
          height: img.height,
          name: file.name,
          type: file.type
        };
        
        setImage(imageData);
        
        // Make image available for collaboration
        window.currentImage = imageData;
        
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
            const imageData = {
              src: event.target.result,
              width: img.width,
              height: img.height,
              name: 'pasted-image.png',
              type: item.type
            };
            
            setImage(imageData);
            
            // Make image available for collaboration
            window.currentImage = imageData;
            
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
    if (!image || isPanning || !isOverCanvas) return;
    
    // Check if we're in delete mode
    if (isAltPressed) {
      // Use markerToDelete which is identified during mousemove
      if (markerToDelete) {
        // Remove marker from local state
        setMarkers(markers.filter(m => m.id !== markerToDelete.id));
        
        // Sync with collaboration session
        syncRemoveMarker(markerToDelete.id);
        
        notify('Marker removed', 'info');
        setMarkerToDelete(null);
        return;
      }
      // If no marker is hovered, do nothing
      return;
    }
    
    // Add marker mode
    // Get image coordinates from screen coordinates
    const coords = screenToImageCoords(e.clientX, e.clientY);
    
    // Add a new marker
    const category = categories.find(c => c.id === activeCategory);
    
    // Only add if we have an active category
    if (category) {
      // Create new marker with unique ID
      const newMarker = {
        id: Date.now(),
        x: coords.x,
        y: coords.y,
        categoryId: activeCategory
      };
      
      // Add to local state
      setMarkers([...markers, newMarker]);
      
      // Sync with collaboration session
      syncAddMarker(newMarker);
    }
  };
  
  // Handle mouse down for dragging/panning
  const handleMouseDown = (e) => {
    // Only enable panning with middle mouse button (button 1)
    if (e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      setIsPanning(true);
      setDragStart({
        x: e.clientX - viewportTransform.x,
        y: e.clientY - viewportTransform.y
      });
    }
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
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
      // Find the category to update
      const category = categories.find(c => c.id === editingCategoryId);
      
      if (category) {
        // Create the updated category
        const updatedCategory = { 
          ...category, 
          name: newCategoryName.trim() 
        };
        
        // Update local state
        setCategories(categories.map(c => 
          c.id === editingCategoryId ? updatedCategory : c
        ));
        
        // Sync with collaboration session
        syncUpdateCategory(updatedCategory);
      }
    }
    
    setEditingCategoryId(null);
  };
  
  // Add a new category (immediately, with default color)
  const addNewCategory = () => {
    const newId = Math.max(0, ...categories.map(c => c.id)) + 1;
    const newCategory = {
      id: newId,
      name: `Category ${newId}`,
      color: getDefaultCategoryColor(newId - 1)
    };
    
    // Update local state
    setCategories([...categories, newCategory]);
    setActiveCategory(newId);
    
    // Sync with collaboration session
    syncUpdateCategory(newCategory);
    
    notify(`Added ${newCategory.name}`, 'success');
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
    
    // Get markers to remove
    const markersToRemove = markers.filter(m => m.categoryId === categoryId);
    
    // Remove the category
    setCategories(categories.filter(c => c.id !== categoryId));
    
    // Remove associated markers
    setMarkers(markers.filter(m => m.categoryId !== categoryId));
    
    // Sync category removal with collaboration session
    // (This depends on your backend handling - you might need a special "delete category" function)
    
    // Sync marker removals with collaboration session
    if (isCollaborating) {
      markersToRemove.forEach(marker => {
        syncRemoveMarker(marker.id);
      });
    }
    
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
      // Store markers to remove for collaboration sync
      const markersToRemove = [...markers];
      
      // Clear local markers
      setMarkers([]);
      
      // Sync with collaboration session
      if (isCollaborating) {
        markersToRemove.forEach(marker => {
          syncRemoveMarker(marker.id);
        });
      }
    }
  };
  
  // Update category color
  const updateCategoryColor = (categoryId, newColor) => {
    // Find the category to update
    const category = categories.find(c => c.id === categoryId);
    
    if (category) {
      // Create the updated category
      const updatedCategory = { 
        ...category, 
        color: newColor 
      };
      
      // Update local state
      setCategories(
        categories.map(c => 
          c.id === categoryId ? updatedCategory : c
        )
      );
      
      // Sync with collaboration session
      syncUpdateCategory(updatedCategory);
    }
    
    setShowColorPicker(false);
    setEditingCategoryId(null);
  };
  
  // Export the image with markers
  const exportImage = () => {
    if (!image || markers.length === 0 || !mapAreaRef.current) return;
    
    setIsExporting(true);
    notify('Preparing export...', 'info');
    
    try {
      // First, hide any UI elements we don't want in the export
      const deleteModeCursor = document.querySelector('.delete-cursor');
      const modeIndicator = document.querySelector('.mode-indicator');
      if (deleteModeCursor) deleteModeCursor.style.display = 'none';
      if (modeIndicator) modeIndicator.style.display = 'none';
      
      // Capture the exact current view using html-to-image
      toPng(mapAreaRef.current, { 
        cacheBust: true,
        skipAutoScale: true,
        quality: 1.0,
        pixelRatio: 1.5, // Higher quality
        filter: (node) => {
          // Filter out UI elements that shouldn't be in the export
          return (
            !node.classList?.contains('custom-cursor') && 
            !node.classList?.contains('mode-indicator') &&
            !node.classList?.contains('instructions-overlay')
          );
        }
      })
      .then(dataUrl => {
        // Restore any hidden UI elements
        if (deleteModeCursor) deleteModeCursor.style.display = '';
        if (modeIndicator) modeIndicator.style.display = '';
        
        // Create a new Image with the captured data
        const capturedImage = new Image();
        capturedImage.onload = () => {
          // Create canvas for the final export (image + legend)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Estimate dimensions - we need the captured image size plus space for legend
          const capturedWidth = capturedImage.width;
          const capturedHeight = capturedImage.height;
          
          // Legend height (fixed)
          const legendHeight = 80;
          
          // Set canvas size
          canvas.width = capturedWidth;
          canvas.height = capturedHeight + legendHeight;
          
          // Fill with dark background
          ctx.fillStyle = '#1F2937';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the captured image at the top
          ctx.drawImage(capturedImage, 0, 0);
          
          // Draw legend
          const legendY = capturedHeight + 10;
          
          // Legend background
          ctx.fillStyle = '#111827';
          ctx.fillRect(0, capturedHeight, canvas.width, legendHeight);
          
          // Legend border
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, capturedHeight);
          ctx.lineTo(canvas.width, capturedHeight);
          ctx.stroke();
          
          // Legend title
          ctx.fillStyle = '#F9FAFB';
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
            
            // Draw count
            ctx.fillStyle = '#D1D5DB';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${name}: ${count}`, xPos + 15, legendY);
            
            xPos += Math.min(150, (canvas.width - 150) / categoryInfo.length);
          });
          
          // Draw total count
          ctx.fillStyle = '#F9FAFB';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`Total: ${markers.length}`, canvas.width - 15, legendY);
          
          // Create download link
          const finalImageData = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = finalImageData;
          a.download = `marked_${image.name || 'map'}.png`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          setIsExporting(false);
          notify('Image exported successfully', 'success');
        };
        
        capturedImage.onerror = (error) => {
          console.error('Image processing error during export:', error);
          setIsExporting(false);
          notify('Failed to process image during export', 'error');
        };
        
        capturedImage.src = dataUrl;
      })
      .catch(error => {
        console.error('Export error:', error);
        setIsExporting(false);
        notify('Failed to capture image: ' + (error.message || 'Unknown error'), 'error');
      });
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      notify('Failed to export image: ' + (error.message || 'Unknown error'), 'error');
    }
  };
  
  // --- KEYBOARD SHORTCUTS & EVENT LISTENERS ---
  // Track Alt key state for deletion mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Detect Alt key press
      if (e.key === 'Alt') {
        setIsAltPressed(true);
        // Prevent browser's default Alt behavior
        e.preventDefault();
      }
      
      // Ignore other shortcuts when typing in an input
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
    
    const handleKeyUp = (e) => {
      // Detect Alt key release
      if (e.key === 'Alt') {
        setIsAltPressed(false);
        setMarkerToDelete(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
    };
  }, [showHelp, categories, image, showSidebar, handlePaste]);
  
  // Focus input when editing category
  useEffect(() => {
    if (editingCategoryId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCategoryId]);
  
  // Setup mouse event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      handleMouseMove(e);
    };
    
    const handleGlobalMouseUp = (e) => {
      handleMouseUp();
    };

    // Handle mouse leave to ensure we clean up any dragging state
    const handleMouseLeave = () => {
      setIsDragging(false);
      setIsPanning(false);
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDragging, isAltPressed, markers]);
  
  // Prevent losing Alt key state when window loses focus
  useEffect(() => {
    const handleBlur = () => {
      setIsAltPressed(false);
      setIsPanning(false);
      setIsDragging(false);
      setMarkerToDelete(null);
    };
    
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  // Handle received image when joining a session
  useEffect(() => {
    // Make image and categories available globally for collaboration
    if (image) {
      window.currentImage = image;
    }
    if (categories) {
      window.currentCategories = categories;
    }
    
    // If we joined a session and received an image
    if (receivedImage && !image) {
      // Create a new Image object from the received data
      const img = new Image();
      img.onload = () => {
        setImage({
          src: receivedImage.src,
          width: receivedImage.width,
          height: receivedImage.height,
          name: receivedImage.name,
          type: receivedImage.type
        });
        
        // Reset view
        setViewportTransform({ scale: 1, x: 0, y: 0 });
        
        notify('Connected to collaboration session', 'success');
      };
      
      img.src = receivedImage.src;
    }
  }, [image, categories, receivedImage]);
  
  // --- RENDERING ---
  // Count markers by category
  const getCategoryCount = (categoryId) => {
    return markers.filter(m => m.categoryId === categoryId).length;
  };
  
  // Get active category color
  const getActiveCategoryColor = () => {
    const category = categories.find(c => c.id === activeCategory);
    return category ? category.color : '#FF5252';
  };
  
  // Open color editor for a specific category
  const openColorEditor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategoryId(categoryId);
      setNewCategoryColor(category.color);
      setShowColorPicker(true);
    }
  };
  
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-white">Just Click It</h1>
            {image && (
              <span className="text-sm text-gray-400 ml-4">
                {markers.length} {markers.length === 1 ? 'marker' : 'markers'}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {image && (
              <>
                {/* Collaboration controls */}
                <InviteButton />
                <CollaborationStatus />
                
                {/* Zoom controls */}
                <div className="flex items-center space-x-1 text-sm px-2 py-1 bg-gray-700 rounded">
                  <button
                    onClick={() => setViewportTransform({...viewportTransform, scale: viewportTransform.scale * 1.2})}
                    className="px-2 py-1 text-gray-300 hover:text-white"
                    title="Zoom In"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <span className="text-gray-300 w-12 text-center">
                    {Math.round(viewportTransform.scale * 100)}%
                  </span>
                  
                  <button
                    onClick={() => setViewportTransform({...viewportTransform, scale: viewportTransform.scale / 1.2})}
                    className="px-2 py-1 text-gray-300 hover:text-white"
                    title="Zoom Out"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={resetView}
                    className="px-2 py-1 text-gray-300 hover:text-white"
                    title="Reset View (R)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700"
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
              className="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700"
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
          <div className="w-72 bg-gray-800 shadow-md z-10 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-medium text-gray-200">Categories</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {categories.map((category, index) => (
                  <div 
                    key={category.id} 
                    className={`flex items-center p-2 rounded ${
                      activeCategory === category.id ? 'bg-gray-700' : 'hover:bg-gray-700'
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
                      {editingCategoryId === category.id && !showColorPicker ? (
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
                          className="w-full px-2 py-1 text-sm border rounded bg-gray-700 text-white border-gray-600"
                        />
                      ) : (
                        <div className="flex flex-col">
                          <div 
                            className="truncate text-sm font-medium cursor-pointer text-gray-200 hover:text-blue-400"
                            onClick={() => startEditingCategory(category)}
                            title="Click to rename"
                          >
                            {category.name}
                          </div>
                          <div
                            className="text-xs text-gray-400 cursor-pointer hover:text-blue-400"
                            onClick={() => openColorEditor(category.id)}
                            title="Change color"
                          >
                            Change color
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="Delete category"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* Edit Color Dialog */}
                {showColorPicker && editingCategoryId && (
                  <div className="bg-gray-700 p-3 rounded-lg mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Edit Color:</span>
                      <button 
                        onClick={() => {
                          setShowColorPicker(false);
                          setEditingCategoryId(null);
                        }}
                        className="text-gray-400 hover:text-gray-200"
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
                        onClick={() => updateCategoryColor(editingCategoryId, newCategoryColor)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Update Color
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Add new category */}
                {categories.length < 10 && (
                  <div className="mt-4">
                    <button
                      onClick={addNewCategory}
                      className="w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center justify-center text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Category
                    </button>
                  </div>
                )}
              </div>
              
              {/* Summary section */}
              {markers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h3 className="font-medium text-gray-300 mb-2">Summary</h3>
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
                            <span className="truncate text-gray-300">{category.name}</span>
                          </div>
                          <span className="font-medium text-gray-300">{count}</span>
                        </div>
                      );
                    })}
                    
                    <div className="flex items-center justify-between text-sm font-bold mt-2 pt-2 border-t border-gray-700">
                      <span className="text-gray-300">Total</span>
                      <span className="text-gray-300">{markers.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="p-4 border-t border-gray-700">
              <div className="space-y-2">
                <button
                  onClick={exportImage}
                  disabled={!image || markers.length === 0 || isExporting}
                  className={`w-full py-2 px-4 rounded flex items-center justify-center ${
                    !image || markers.length === 0 || isExporting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
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
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Clear All Markers
                </button>
                
                <button
                  onClick={triggerFileUpload}
                  className="w-full py-2 px-4 bg-gray-700 text-gray-200 hover:bg-gray-600 rounded"
                >
                  {image ? 'Change Image' : 'Upload Image'}
                </button>
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
              ref={mapAreaRef}
              className="relative cursor-default"
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                if (e.button === 0) {
                  handleCanvasClick(e);
                }
              }}
              onWheel={handleWheel}
              onMouseEnter={handleCanvasMouseEnter}
              onMouseLeave={handleCanvasMouseLeave}
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden'
              }}
            >
              {/* Main image */}
              <img
                ref={imageRef}
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
                
                // Check if this marker is being hovered for deletion
                const isTargetedForDeletion = markerToDelete && markerToDelete.id === marker.id;
                
                // Check if this marker is from the current user (for highlighting in collaboration)
                const isCurrentUserMarker = isCollaborating && marker.createdBy === sessionInfo?.userId;
                
                // Get creator info if available
                const creatorInfo = isCollaborating && marker.createdBy ? 
                  sessionInfo?.collaborators?.[marker.createdBy] : null;
                
                return (
                  <div
                    key={marker.id}
                    ref={el => markerRefs.current[marker.id] = el}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      top: screenPos.y + 'px',
                      left: screenPos.x + 'px',
                      zIndex: isTargetedForDeletion ? 10 : 1, // Bring to front when targeted
                    }}
                    title={creatorInfo ? `Added by ${creatorInfo.name}` : undefined}
                  >
                    {/* Highlight effect for marker targeted for deletion */}
                    {isTargetedForDeletion && (
                      <div
                        className="absolute rounded-full animate-pulse"
                        style={{
                          width: (markerSize * 2) + 8 + 'px',
                          height: (markerSize * 2) + 8 + 'px',
                          backgroundColor: 'rgba(239, 68, 68, 0.3)',
                          border: '2px solid rgba(239, 68, 68, 0.7)',
                          top: '-4px',
                          left: '-4px',
                        }}
                      ></div>
                    )}
                    
                    {/* Marker circle */}
                    <div
                      className={`rounded-full flex items-center justify-center ${
                        isTargetedForDeletion ? 'ring-2 ring-red-500' : 
                        isCollaborating && !isCurrentUserMarker ? 'ring-2 ring-white' : ''
                      }`}
                      style={{
                        width: markerSize * 2 + 'px',
                        height: markerSize * 2 + 'px',
                        backgroundColor: category.color,
                        border: `2px solid ${isCollaborating && creatorInfo ? creatorInfo.color : 'white'}`,
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
              
              {/* Custom cursor - only shown when over the canvas */}
              {isOverCanvas && (
                <div
                  className="fixed pointer-events-none z-50 custom-cursor"
                  style={{
                    top: mousePosition.y,
                    left: mousePosition.x,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {isAltPressed ? (
                    /* Delete mode cursor */
                    <div className="flex flex-col items-center delete-cursor">
                      <div
                        className="rounded-full w-6 h-6 border-2 border-white flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-white bg-red-600 text-xs px-1 rounded mt-1 opacity-80">
                        Delete Mode
                      </div>
                    </div>
                  ) : isPanning ? (
                    /* Panning mode cursor */
                    <div className="flex flex-col items-center">
                      <div
                        className="rounded-full w-6 h-6 border-2 border-white flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a2 2 0 012 2v2h2a2 2 0 012 2v2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2v-2h2V8h-4V6h2V4h-4v4h2v2H8v4H6v-2H4v2H2v-2a2 2 0 012-2h2V6a2 2 0 012-2h2V2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-white bg-blue-600 text-xs px-1 rounded mt-1 opacity-80">
                        Panning
                      </div>
                    </div>
                  ) : (
                    /* Regular cursor (category dot) */
                    <div
                      className="rounded-full w-6 h-6 border-2 border-white"
                      style={{ 
                        backgroundColor: getColorWithAlpha(getActiveCategoryColor(), 0.7),
                        boxShadow: '0 0 5px rgba(0,0,0,0.3)'
                      }}
                    ></div>
                  )}
                </div>
              )}
              
              {/* Instructions overlay */}
              {markers.length === 0 && image && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none instructions-overlay">
                  <div className="bg-black bg-opacity-70 text-white p-4 rounded-lg max-w-md text-center">
                    <p>Click anywhere to add markers</p>
                    <p className="text-sm text-gray-300 mt-1">Hold Alt to remove markers</p>
                    <p className="text-sm text-gray-300 mt-1">Middle-click to pan the image</p>
                    <p className="text-sm text-gray-300 mt-1">Press H for help and keyboard shortcuts</p>
                  </div>
                </div>
              )}
              
              {/* Mode indicator */}
              {image && isOverCanvas && (isAltPressed || isPanning) && (
                <div className="fixed top-4 right-4 z-40 pointer-events-none mode-indicator">
                  {isAltPressed && (
                    <div className="bg-red-600 text-white px-3 py-1 rounded shadow-lg animate-pulse">
                      Delete Mode {markerToDelete ? '(Target Found)' : ''}
                    </div>
                  )}
                  {isPanning && (
                    <div className="bg-blue-600 text-white px-3 py-1 rounded shadow-lg animate-pulse">
                      Panning Mode
                    </div>
                  )}
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
                onClick={triggerFileUpload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
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
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Just Click It Help</h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-5">
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Markers</h4>
                <ul className="space-y-1 text-gray-400">
                  <li><span className="font-medium text-gray-300">Add marker:</span> Click anywhere on the image</li>
                  <li><span className="font-medium text-gray-300">Remove marker:</span> Hold Alt and click on a marker</li>
                  <li><span className="font-medium text-gray-300">Change marker type:</span> Select a different category from the sidebar before clicking</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Navigation</h4>
                <ul className="space-y-1 text-gray-400">
                  <li><span className="font-medium text-gray-300">Zoom in/out:</span> Use mouse wheel or the zoom controls</li>
                  <li><span className="font-medium text-gray-300">Pan image:</span> Use middle mouse button</li>
                  <li><span className="font-medium text-gray-300">Reset view:</span> Click 100% button or press R</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Collaboration</h4>
                <ul className="space-y-1 text-gray-400">
                  <li><span className="font-medium text-gray-300">Start collaboration:</span> Click "Start Collaboration" button</li>
                  <li><span className="font-medium text-gray-300">Invite others:</span> Click "Invite Collaborators" and share the link</li>
                  <li><span className="font-medium text-gray-300">Chat with collaborators:</span> Use the chat panel in the collaboration sidebar</li>
                  <li><span className="font-medium text-gray-300">View collaborators:</span> Click the collaborator count to see who's connected</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Visual Indicators</h4>
                <ul className="space-y-1 text-gray-400">
                  <li><span className="font-medium text-gray-300">Cursor dot:</span> Shows the currently selected category color (only in canvas area)</li>
                  <li><span className="font-medium text-gray-300">Delete mode:</span> Red cursor with X icon when Alt is held</li>
                  <li><span className="font-medium text-gray-300">Deletion target:</span> Markers targeted for deletion will highlight with a red pulsing border</li>
                  <li><span className="font-medium text-gray-300">Panning mode:</span> Blue cursor with move icon when panning</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Categories</h4>
                <ul className="space-y-1 text-gray-400">
                  <li><span className="font-medium text-gray-300">Select category:</span> Click on a category in the sidebar or press 1-9</li>
                  <li><span className="font-medium text-gray-300">Rename category:</span> Click on the category name</li>
                  <li><span className="font-medium text-gray-300">Change color:</span> Click "Change color" link under the category</li>
                  <li><span className="font-medium text-gray-300">Add category:</span> Click "Add New Category" button</li>
                  <li><span className="font-medium text-gray-300">Delete category:</span> Click the trash icon next to a category</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Export</h4>
                <ul className="space-y-1 text-gray-400">
                  <li><span className="font-medium text-gray-300">Export image:</span> Captures the current view exactly as you see it</li>
                  <li><span className="font-medium text-gray-300">Export format:</span> PNG file with legend showing category counts</li>
                  <li><span className="font-medium text-gray-300">Shortcut:</span> Ctrl+S (or Cmd+S on Mac)</li>
                </ul>
              </section>
              
              <section>
                <h4 className="font-medium text-gray-300 mb-2">Keyboard Shortcuts</h4>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">1-9</kbd> Select category</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">H</kbd> Show/hide help</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">C</kbd> Toggle sidebar</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">R</kbd> Reset view</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">Alt</kbd> Hold for delete mode</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+S</kbd> Export image</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+V</kbd> Paste image</li>
                  <li><kbd className="bg-gray-700 px-2 py-1 rounded">Esc</kbd> Close dialogs</li>
                </ul>
              </section>
            </div>
            
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
            notification.type === 'error' ? 'bg-red-600 text-white' :
            notification.type === 'success' ? 'bg-green-600 text-white' :
            notification.type === 'warning' ? 'bg-yellow-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
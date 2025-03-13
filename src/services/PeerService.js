import Peer from 'peerjs';

class PeerService {
  constructor() {
    this.peer = null;
    this.connections = {};
    this.onImageRequestCallback = null;
    this.onImageReceivedCallback = null;
    this.onConnectionCallback = null;
    this.onDisconnectionCallback = null;
  }

  // Initialize peer with a custom ID
  init(peerId) {
    return new Promise((resolve, reject) => {
      try {
        // Create new Peer instance
        this.peer = new Peer(peerId, {
          debug: 2,
        });

        // Handle successful peer creation
        this.peer.on('open', (id) => {
          console.log('My peer ID is: ' + id);
          this.setupEventListeners();
          resolve(id);
        });

        // Handle errors
        this.peer.on('error', (error) => {
          console.error('Peer connection error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Failed to initialize peer:', error);
        reject(error);
      }
    });
  }

  // Set up event listeners for incoming connections
  setupEventListeners() {
    this.peer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);
      
      // Store the connection
      this.connections[conn.peer] = conn;
      
      // Setup connection event handlers
      this.setupConnectionHandlers(conn);
      
      // Notify about new connection
      if (this.onConnectionCallback) {
        this.onConnectionCallback(conn.peer);
      }
    });
  }

  // Set up handlers for a specific connection
  setupConnectionHandlers(conn) {
    // Handle data received from peer
    conn.on('data', (data) => {
      console.log('Received data type:', data.type);
      
      if (data.type === 'IMAGE_REQUEST') {
        // Someone is requesting the image from us
        if (this.onImageRequestCallback) {
          this.onImageRequestCallback(conn.peer);
        }
      } 
      else if (data.type === 'IMAGE_DATA') {
        // We received an image from a peer
        if (this.onImageReceivedCallback) {
          this.onImageReceivedCallback(data.image);
        }
      }
    });

    // Handle connection close
    conn.on('close', () => {
      console.log('Connection closed with:', conn.peer);
      delete this.connections[conn.peer];
      
      // Notify about disconnection
      if (this.onDisconnectionCallback) {
        this.onDisconnectionCallback(conn.peer);
      }
    });

    // Handle connection errors
    conn.on('error', (err) => {
      console.error('Connection error:', err);
      delete this.connections[conn.peer];
      
      // Notify about disconnection due to error
      if (this.onDisconnectionCallback) {
        this.onDisconnectionCallback(conn.peer);
      }
    });
  }

  // Connect to another peer
  connectToPeer(peerId) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.peer) {
          reject(new Error('Peer not initialized'));
          return;
        }

        // Check if connection already exists
        if (this.connections[peerId]) {
          resolve(this.connections[peerId]);
          return;
        }

        // Create new connection
        const conn = this.peer.connect(peerId, {
          reliable: true
        });

        // Handle connection open
        conn.on('open', () => {
          console.log('Connected to peer:', peerId);
          this.connections[peerId] = conn;
          this.setupConnectionHandlers(conn);
          
          // Notify about new connection
          if (this.onConnectionCallback) {
            this.onConnectionCallback(peerId);
          }
          
          resolve(conn);
        });

        // Handle connection error
        conn.on('error', (err) => {
          console.error('Error connecting to peer:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Failed to connect to peer:', error);
        reject(error);
      }
    });
  }

  // Request image from a peer
  requestImage(peerId) {
    const conn = this.connections[peerId];
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return false;
    }

    conn.send({
      type: 'IMAGE_REQUEST'
    });
    
    return true;
  }

  // Send image to a peer
  sendImage(peerId, imageData) {
    const conn = this.connections[peerId];
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return false;
    }

    conn.send({
      type: 'IMAGE_DATA',
      image: imageData
    });
    
    return true;
  }

  // Send image to all connected peers
  broadcastImage(imageData) {
    Object.values(this.connections).forEach(conn => {
      conn.send({
        type: 'IMAGE_DATA',
        image: imageData
      });
    });
  }

  // Set callback for image requests
  onImageRequest(callback) {
    this.onImageRequestCallback = callback;
  }

  // Set callback for image received
  onImageReceived(callback) {
    this.onImageReceivedCallback = callback;
  }

  // Set callback for new connections
  onConnection(callback) {
    this.onConnectionCallback = callback;
  }

  // Set callback for disconnections
  onDisconnection(callback) {
    this.onDisconnectionCallback = callback;
  }

  // Disconnect from all peers and close
  destroy() {
    if (this.peer) {
      Object.values(this.connections).forEach(conn => {
        conn.close();
      });
      this.connections = {};
      this.peer.destroy();
      this.peer = null;
    }
  }

  // Get my peer ID
  getMyPeerId() {
    return this.peer ? this.peer.id : null;
  }

  // Get list of connected peer IDs
  getConnectedPeers() {
    return Object.keys(this.connections);
  }
}

// Create a singleton instance
const peerService = new PeerService();
export default peerService;
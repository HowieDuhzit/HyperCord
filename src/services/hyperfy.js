import * as THREE from 'three';

// Hyperfy client singleton using iframe approach
let hyperfyClient = null;
let hyperfyContainer = null;
let hyperfyIframe = null;
let disconnecting = false;
let serverTimeOffset = 0;
let entityMap = new Map();
let serverTime = 0;
let statusOverlay = null;

// Simple binary packet handling (mimicking Hyperfy's protocol)
const writePacket = (name, data) => {
  try {
    const jsonData = JSON.stringify({ name, data });
    return jsonData;
  } catch (error) {
    console.error('Error writing packet:', error);
    return null;
  }
};

const readPacket = (data) => {
  try {
    if (typeof data === 'string') {
      const packet = JSON.parse(data);
      return [packet.name, packet.data];
    } else if (data instanceof ArrayBuffer) {
      // In a real implementation, we would properly decode the binary packet
      // For this demo we'll convert the ArrayBuffer to a string and parse it
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(data);
      const packet = JSON.parse(jsonString);
      return [packet.name, packet.data];
    }
    return [null, null];
  } catch (error) {
    console.error('Error reading packet:', error);
    return [null, null];
  }
};

/**
 * Generate a cache-busting query parameter
 * @returns {string} A unique timestamp-based cache busting string
 */
const generateCacheBuster = () => {
  return `_cb=${Date.now()}`;
};

/**
 * Create a cache-busted URL for the Hyperfy world
 * @param {URL} baseUrl - The base URL to the Hyperfy world
 * @returns {URL} A new URL with fresh cache-busting parameters
 */
const createCacheBustedUrl = (baseUrl) => {
  const url = new URL(baseUrl.toString());
  url.searchParams.set('_cb', Date.now());
  return url;
};

/**
 * Initialize a connection to a Hyperfy world using an iframe
 * @param {Object} config - Configuration for the Hyperfy world connection
 * @param {string} config.worldUrl - URL to the Hyperfy world server
 * @param {HTMLElement} config.container - DOM element to render the world in
 * @param {Object} config.player - Player information
 * @param {string} config.player.id - Player ID (from Discord)
 * @param {string} config.player.name - Player name (from Discord)
 * @param {string} config.player.avatar - Player avatar URL (from Discord)
 * @param {string} config.room - Room ID to join (typically Discord channel ID)
 * @returns {Promise<Object>} - The Hyperfy client instance
 */
export const initHyperfyWorld = async (config) => {
  try {
    console.log('Initializing Hyperfy world with config:', config);
    
    hyperfyContainer = config.container;
    
    // Extract domain from the worldUrl
    const url = new URL(config.worldUrl);
    const domain = url.hostname;
    
    // Construct base URL with query parameters for authentication
    const baseUrl = new URL(config.worldUrl);
    
    // Add query parameters for Discord integration
    baseUrl.searchParams.append('discordUserId', config.player.id);
    baseUrl.searchParams.append('discordUserName', config.player.name);
    baseUrl.searchParams.append('discordChannelId', config.room);
    baseUrl.searchParams.append('source', 'discord-activity');
    
    if (config.player.avatar) {
      baseUrl.searchParams.append('avatar', config.player.avatar);
    }
    
    // Create status overlay
    statusOverlay = document.createElement('div');
    statusOverlay.style.position = 'absolute';
    statusOverlay.style.top = '20px';
    statusOverlay.style.left = '20px';
    statusOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    statusOverlay.style.color = 'white';
    statusOverlay.style.padding = '10px';
    statusOverlay.style.borderRadius = '5px';
    statusOverlay.style.zIndex = '1000';
    statusOverlay.textContent = 'Connecting to Hyperfy...';
    
    // Create empty iframe for Hyperfy world
    hyperfyIframe = document.createElement('iframe');
    hyperfyIframe.style.width = '100%';
    hyperfyIframe.style.height = '100%';
    hyperfyIframe.style.border = 'none';
    hyperfyIframe.style.backgroundColor = '#2a2a2a';
    hyperfyIframe.allow = 'camera; microphone; clipboard-write; autoplay; fullscreen';
    hyperfyIframe.setAttribute('fetchpriority', 'high');
    
    // Add iframe and status to container
    hyperfyContainer.appendChild(hyperfyIframe);
    hyperfyContainer.appendChild(statusOverlay);
    
    // Set up event handlers
    hyperfyIframe.onload = () => {
      statusOverlay.textContent = 'Connected to Hyperfy world';
      
      // Fade out status overlay after 2 seconds
      setTimeout(() => {
        statusOverlay.style.transition = 'opacity 1s';
        statusOverlay.style.opacity = '0';
        
        // Remove after fade
        setTimeout(() => {
          if (hyperfyContainer.contains(statusOverlay)) {
            hyperfyContainer.removeChild(statusOverlay);
          }
        }, 1000);
      }, 2000);
    };
    
    hyperfyIframe.onerror = (error) => {
      console.error('Error loading Hyperfy iframe:', error);
      statusOverlay.textContent = 'Error connecting to Hyperfy world';
      statusOverlay.style.backgroundColor = 'rgba(255,0,0,0.5)';
    };
    
    // Set up message event listener for communication with the iframe
    window.addEventListener('message', handleIframeMessage);
    
    // First, load a blank page to establish connection
    hyperfyIframe.src = 'about:blank';
    
    // Create a Hyperfy client object that interfaces with the iframe
    hyperfyClient = {
      worldUrl: config.worldUrl,
      player: config.player,
      room: config.room,
      iframe: hyperfyIframe,
      baseUrl,
      
      // Actually load the world with fresh cache busting
      loadWorld: () => {
        statusOverlay.textContent = 'Loading Hyperfy world...';
        statusOverlay.style.opacity = '1';
        
        console.log('Clearing browser cache before loading world...');
        
        // Generate a cache-busted URL right before loading
        const cacheBustedUrl = createCacheBustedUrl(baseUrl);
        console.log(`Loading Hyperfy world from ${cacheBustedUrl.toString()}`);
        
        // Apply the cache-busted URL to the iframe
        hyperfyIframe.src = cacheBustedUrl.toString();
      },
      
      // Methods to interact with the Hyperfy world
      connect: async () => {
        if (hyperfyIframe) {
          // First clear any existing content
          hyperfyIframe.src = 'about:blank';
          
          // Short delay to ensure clean state
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Now load the world with fresh cache busting
          hyperfyClient.loadWorld();
          return true;
        }
        return false;
      },
      
      disconnect: () => {
        console.log('Disconnecting from Hyperfy world');
        disconnecting = true;
        
        // Remove iframe events
        window.removeEventListener('message', handleIframeMessage);
        
        // Clear iframe
        if (hyperfyIframe && hyperfyContainer.contains(hyperfyIframe)) {
          hyperfyContainer.removeChild(hyperfyIframe);
          hyperfyIframe = null;
        }
        
        // Clear any other elements
        if (statusOverlay && hyperfyContainer.contains(statusOverlay)) {
          hyperfyContainer.removeChild(statusOverlay);
        }
      },
      
      updatePlayer: (playerId, data) => {
        console.log('Updating player', playerId, 'with data', data);
        
        // Post message to iframe with player update
        if (hyperfyIframe && hyperfyIframe.contentWindow) {
          hyperfyIframe.contentWindow.postMessage({
            type: 'discord_player_update',
            playerId,
            speaking: data.speaking,
            muted: data.muted
          }, '*');
        }
      },
      
      sendChatMessage: (message) => {
        // Post message to iframe with chat message
        if (hyperfyIframe && hyperfyIframe.contentWindow) {
          hyperfyIframe.contentWindow.postMessage({
            type: 'chat_message',
            message,
            sender: config.player.name
          }, '*');
        } else {
          console.error('Cannot send chat message: iframe not ready');
        }
      },
      
      // Force reload the world with fresh cache
      reloadWorld: () => {
        if (hyperfyIframe) {
          statusOverlay.style.opacity = '1';
          statusOverlay.textContent = 'Reloading Hyperfy world...';
          
          // Force a complete reload with cache clearing
          hyperfyIframe.src = 'about:blank';
          
          // Wait a brief moment before setting the new URL with fresh cache busting
          setTimeout(() => {
            hyperfyClient.loadWorld();
          }, 100);
          
          return true;
        }
        return false;
      },
      
      on: (event, callback) => {
        console.log('Registered event listener for', event);
        
        // In a real implementation, we would register event handlers
        // that listen for postMessage events from the iframe
        const eventKey = `hyperfy_${event}`;
        
        if (!window._hyperfyEventHandlers) {
          window._hyperfyEventHandlers = {};
        }
        
        if (!window._hyperfyEventHandlers[eventKey]) {
          window._hyperfyEventHandlers[eventKey] = [];
        }
        
        window._hyperfyEventHandlers[eventKey].push(callback);
        
        // Return unsubscribe function
        return () => {
          if (window._hyperfyEventHandlers && window._hyperfyEventHandlers[eventKey]) {
            const index = window._hyperfyEventHandlers[eventKey].indexOf(callback);
            if (index !== -1) {
              window._hyperfyEventHandlers[eventKey].splice(index, 1);
            }
          }
        };
      }
    };
    
    // Wait for next tick to ensure iframe is properly in the DOM
    setTimeout(() => {
      // Initiate the world loading after establishing connection
      hyperfyClient.loadWorld();
    }, 50);
    
    return hyperfyClient;
  } catch (error) {
    console.error('Failed to initialize Hyperfy world:', error);
    throw error;
  }
};

/**
 * Handle messages from the Hyperfy iframe
 */
const handleIframeMessage = (event) => {
  // Ensure message is from our iframe
  if (!hyperfyIframe || event.source !== hyperfyIframe.contentWindow) {
    return;
  }
  
  try {
    const data = event.data;
    
    if (typeof data !== 'object') return;
    
    console.log('Received message from Hyperfy iframe:', data);
    
    // Call appropriate handlers for the event
    const eventKey = `hyperfy_${data.type}`;
    if (window._hyperfyEventHandlers && window._hyperfyEventHandlers[eventKey]) {
      window._hyperfyEventHandlers[eventKey].forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error('Error in event handler:', err);
        }
      });
    }
  } catch (error) {
    console.error('Error processing iframe message:', error);
  }
};

/**
 * Get the current Hyperfy client instance
 * @returns {Object} The Hyperfy client instance
 */
export const getHyperfyClient = () => {
  if (!hyperfyClient) {
    throw new Error('Hyperfy client is not initialized');
  }
  return hyperfyClient;
};

/**
 * Clean up and disconnect from the Hyperfy world
 */
export const disconnectFromWorld = () => {
  if (hyperfyClient) {
    hyperfyClient.disconnect();
    hyperfyClient = null;
  }
}; 
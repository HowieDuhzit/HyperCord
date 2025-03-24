import { DiscordSDK } from '@discord/embedded-app-sdk';

// Discord SDK singleton
let discordSDK = null;
let isInitialized = false;
let isDevelopmentMode = false;

// Check if we're running in development mode (not inside Discord)
const checkDevelopmentMode = () => {
  // In Discord's iframe, frame_id query param would exist
  const urlParams = new URLSearchParams(window.location.search);
  return !urlParams.has('frame_id');
};

// Mock Discord SDK for development mode
const createMockDiscordSDK = () => {
  console.log('Creating mock Discord SDK for development');
  return {
    ready: async () => true,
    commands: {
      authorize: async () => ({
        user: {
          id: 'dev-user-123',
          username: 'DevUser',
          discriminator: '0000',
          avatar: null
        }
      }),
      getChannel: async () => ({
        id: 'dev-channel-123',
        name: 'Development Channel',
        type: 2 // Voice channel
      }),
      getChannelUsers: async () => [{
        id: 'dev-user-123',
        username: 'DevUser',
        discriminator: '0000',
        avatar: null
      }]
    },
    subscribe: (event, callback) => {
      console.log(`Subscribed to ${event} event (mock)`);
      // Return unsubscribe function
      return () => console.log(`Unsubscribed from ${event} event (mock)`);
    }
  };
};

// Initialize Discord SDK
export const initDiscord = async () => {
  if (isInitialized) return discordSDK;
  
  try {
    // Check if we're in development mode
    isDevelopmentMode = checkDevelopmentMode();
    
    if (isDevelopmentMode) {
      console.log('Running in development mode - using mock Discord SDK');
      discordSDK = createMockDiscordSDK();
      isInitialized = true;
      return discordSDK;
    }
    
    // Create a new Discord SDK instance for production
    const clientId = 'YOUR_DISCORD_CLIENT_ID';
    discordSDK = new DiscordSDK(clientId);
    
    // Wait for Discord SDK to be ready
    await discordSDK.ready();
    isInitialized = true;
    
    console.log('Discord SDK initialized successfully');
    return discordSDK;
  } catch (error) {
    console.error('Failed to initialize Discord SDK:', error);
    throw error;
  }
};

// Authorize the Discord application
export const authorizeDiscord = async (permissions = ['identify', 'activities.read', 'activities.write']) => {
  if (!isInitialized) {
    await initDiscord();
  }
  
  try {
    const result = await discordSDK.commands.authorize({ permissions });
    return result;
  } catch (error) {
    console.error('Authorization failed:', error);
    throw error;
  }
};

// Get voice channel information
export const getChannel = async () => {
  if (!isInitialized) {
    await initDiscord();
  }
  
  try {
    const channel = await discordSDK.commands.getChannel();
    return channel;
  } catch (error) {
    console.error('Failed to get channel:', error);
    throw error;
  }
};

// Get information about connected users
export const getChannelUsers = async () => {
  if (!isInitialized) {
    await initDiscord();
  }
  
  try {
    const users = await discordSDK.commands.getChannelUsers();
    return users;
  } catch (error) {
    console.error('Failed to get channel users:', error);
    throw error;
  }
};

// Subscribe to user updates in the channel
export const subscribeToEvents = (event, callback) => {
  if (!isInitialized) {
    throw new Error('Discord SDK is not initialized');
  }
  
  try {
    return discordSDK.subscribe(event, callback);
  } catch (error) {
    console.error(`Failed to subscribe to ${event}:`, error);
    throw error;
  }
};

// Get the Discord SDK instance
export const getDiscordSDK = () => {
  if (!isInitialized) {
    throw new Error('Discord SDK is not initialized');
  }
  
  return discordSDK;
};

// Check if running in development mode
export const isDevMode = () => isDevelopmentMode; 
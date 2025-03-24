import React, { useEffect, useState, useRef } from 'react';
import { initDiscord, authorizeDiscord, getChannel, getChannelUsers, subscribeToEvents, isDevMode } from '../services/discord';
import { initHyperfyWorld, disconnectFromWorld } from '../services/hyperfy';
import WorldSelector from './WorldSelector';
import LoadingIndicator from './LoadingIndicator';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [hyperfyClient, setHyperfyClient] = useState(null);
  const [selectedWorld, setSelectedWorld] = useState('play');
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [customWorldUrl, setCustomWorldUrl] = useState('');
  const worldContainerRef = useRef(null);

  // List of available Hyperfy worlds
  const worlds = [
    { id: 'play', name: 'Hyperfy Main', url: 'https://play.hyperfy.xyz' },
    { id: 'tattedalien', name: 'Tatted Alien Club', url: 'https://tattedalien.club' },
    { id: 'custom', name: 'Custom World', url: customWorldUrl || 'https://your-hyperfy-world.com' }
  ];

  // Initialize the Discord SDK and authenticate the user
  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        
        // Initialize Discord SDK
        await initDiscord();
        
        // Check if in development mode
        setIsDevelopment(isDevMode());
        
        // Authorize with Discord
        const authResult = await authorizeDiscord();
        setUser(authResult.user);
        
        // Get channel information
        const channelInfo = await getChannel();
        setChannel(channelInfo);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize Discord SDK:', err);
        setError('Failed to initialize Discord SDK: ' + err.message);
        setLoading(false);
      }
    }
    
    initialize();
    
    // Clean up on unmount
    return () => {
      disconnectFromWorld();
    };
  }, []);

  // Initialize the Hyperfy world when a world is selected and user/channel are available
  useEffect(() => {
    if (!loading && user && channel && selectedWorld && worldContainerRef.current) {
      const worldConfig = worlds.find(world => world.id === selectedWorld);
      
      if (!worldConfig) {
        setError('Selected world not found');
        return;
      }
      
      // Validate custom URL if selected
      if (selectedWorld === 'custom' && !customWorldUrl) {
        setError('Please enter a valid Hyperfy world URL');
        return;
      }
      
      async function connectToWorld() {
        try {
          setLoading(true);
          
          // Get the current URL (either predefined or custom)
          const worldUrl = selectedWorld === 'custom' ? customWorldUrl : worldConfig.url;
          
          // Initialize Hyperfy world
          const client = await initHyperfyWorld({
            worldUrl: worldUrl,
            container: worldContainerRef.current,
            player: {
              id: user.id,
              name: user.username,
              avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
            },
            room: channel.id
          });
          
          setHyperfyClient(client);
          setLoading(false);
          
          // Subscribe to Discord voice events to update Hyperfy player state
          if (!isDevelopment) {
            subscribeToEvents('VOICE_STATE_UPDATE', (event) => {
              if (client && event.userId === user.id) {
                client.updatePlayer(user.id, {
                  speaking: event.speaking,
                  muted: event.muted
                });
              }
            });
          }
        } catch (err) {
          console.error('Failed to connect to Hyperfy world:', err);
          setError('Failed to connect to Hyperfy world: ' + err.message);
          setLoading(false);
        }
      }
      
      connectToWorld();
      
      // Clean up previous world connection
      return () => {
        disconnectFromWorld();
      };
    }
  }, [loading, user, channel, selectedWorld, customWorldUrl, isDevelopment]);

  // Handle world selection
  const handleWorldSelect = (worldId) => {
    if (worldId !== selectedWorld) {
      // Clear error state
      setError(null);
      
      // Disconnect from current world before connecting to new one
      disconnectFromWorld();
      setSelectedWorld(worldId);
    }
  };
  
  // Handle custom URL changes
  const handleCustomUrlChange = (url) => {
    setCustomWorldUrl(url);
  };

  // Handle Discord server or connection errors
  const handleRetry = () => {
    window.location.reload();
  };

  // Render loading screen
  if (loading) {
    return <LoadingIndicator message="Connecting to Discord and Hyperfy..." />;
  }

  // Render error screen
  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleRetry}>Retry</button>
      </div>
    );
  }

  // Render main app UI
  return (
    <div className="app-container">
      <header>
        <h1>HyperCord</h1>
        {user && <div className="user-info">Logged in as: {user.username}</div>}
      </header>

      <main>
        <WorldSelector
          worlds={worlds}
          selectedWorld={selectedWorld}
          onSelect={handleWorldSelect}
          onCustomUrlChange={handleCustomUrlChange}
        />
        
        <div className="world-container" ref={worldContainerRef}></div>
      </main>
      
      <footer>
        <p>A Discord Activity for exploring Hyperfy worlds together</p>
      </footer>
    </div>
  );
}

export default App; 
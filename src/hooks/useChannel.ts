// Custom hook for consistent channel state management across the app
import { useState, useEffect } from 'react';

interface ChannelState {
  channelSlug: string;
  username?: string;
  isDefault: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const DEFAULT_CHANNEL = 'r-startups-founder-mode';

export function useChannel(): ChannelState {
  const [channelSlug, setChannelSlug] = useState(DEFAULT_CHANNEL);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [isDefault, setIsDefault] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const getConnectedChannel = async () => {
      setIsLoading(true);
      try {
        // Check API for most recent channel
        const response = await fetch('/api/channel-info');
        if (response.ok) {
          const data = await response.json();
          if (data.channelSlug) {
            setChannelSlug(data.channelSlug);
            setUsername(data.username);
            setIsDefault(data.isDefault || false);
          }
        }
      } catch (error) {
        console.log('Error fetching channel, using default:', error);
        // Keep default values
      } finally {
        setIsLoading(false);
      }
    };

    getConnectedChannel();
  }, [refreshTrigger]); // Re-run when refresh is called

  return { channelSlug, username, isDefault, isLoading, refresh };
}
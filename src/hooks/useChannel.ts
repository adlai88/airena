// Custom hook for consistent channel state management across the app
import { useState, useEffect } from 'react';

interface ChannelState {
  channelSlug: string;
  isDefault: boolean;
  isLoading: boolean;
}

const DEFAULT_CHANNEL = 'r-startups-founder-mode';

export function useChannel(): ChannelState {
  const [channelSlug, setChannelSlug] = useState(DEFAULT_CHANNEL);
  const [isDefault, setIsDefault] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getConnectedChannel = async () => {
      try {
        // Check API for most recent channel
        const response = await fetch('/api/channel-info');
        if (response.ok) {
          const data = await response.json();
          if (data.channelSlug) {
            setChannelSlug(data.channelSlug);
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
  }, []);

  return { channelSlug, isDefault, isLoading };
}
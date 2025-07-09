import { Badge } from "./badge";
import { HoverBorderGradient } from "./border-trail";

interface ChannelBadgeProps {
  variant: "connected" | "processing" | "generated";
  channelSlug: string;
  username?: string;
  isDefault?: boolean;
  className?: string;
  showText?: boolean;
}

const variantConfig = {
  connected: {
    icon: "🔗",
    text: "Connected to",
  },
  processing: {
    icon: "⚡",
    text: "Connected to",
  },
  generated: {
    icon: "📊",
    text: "Generated from",
  },
};

export function ChannelBadge({
  variant,
  channelSlug,
  username,
  isDefault = false,
  className = "",
  showText = true,
}: ChannelBadgeProps) {
  const config = variantConfig[variant];
  
  const channelUrl = username 
    ? `https://www.are.na/${username.toLowerCase().replace(/[^a-z0-9]/g, '')}/${channelSlug}`
    : `https://www.are.na/${channelSlug}`;

  return (
    <HoverBorderGradient duration={3}>
      <Badge variant="secondary" className={`px-3 py-1 ${className}`}>
        {showText && config.icon} {showText && (isDefault ? 'Default channel' : `${config.text}`)}
        {showText && ': '}
        <a 
          href={channelUrl}
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:no-underline transition-all"
        >
          {channelSlug}
        </a>
        {isDefault && showText && <span className="ml-1 text-xs">(curated)</span>}
      </Badge>
    </HoverBorderGradient>
  );
}
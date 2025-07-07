'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Home, User, Settings, MessageSquare, Wand2, Cog } from 'lucide-react';

interface HamburgerMenuProps {
  homeNav?: boolean;
}

export function HamburgerMenu({ homeNav = false }: HamburgerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Determine active page for highlighting
  const isActivePage = (path: string) => {
    if (path === '/setup') return pathname === '/setup' || pathname === '/options';
    if (path === '/generate') return pathname === '/generate' || pathname.startsWith('/generate');
    if (path === '/chat') return pathname === '/chat' || pathname.startsWith('/chat');
    return pathname === path;
  };

  // Navigate with query params preserved
  const navigateWithParams = async (path: string) => {
    // Close menu immediately to prevent mobile freezing
    setOpen(false);
    
    if (path === '/chat') {
      // For chat, we need to get the current channel and use path-based routing
      try {
        // Add timeout to prevent hanging on mobile
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('/api/channel-info', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          router.push(`/chat/${data.channelSlug}`);
        } else {
          router.push('/chat/r-startups-founder-mode'); // fallback to default
        }
      } catch {
        router.push('/chat/r-startups-founder-mode'); // fallback to default
      }
    } else {
      // For other pages, preserve query parameters when navigating
      const searchParams = new URLSearchParams(window.location.search);
      const queryString = searchParams.toString();
      const fullPath = queryString ? `${path}?${queryString}` : path;
      router.push(fullPath);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Home Navigation Items */}
        {homeNav ? (
          <>
            <DropdownMenuItem onClick={() => router.push('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Log in
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Sign up
            </DropdownMenuItem>
          </>
        ) : (
          /* App Navigation Items - Include all navigation */
          <>
            <DropdownMenuItem onClick={() => router.push('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            {/* Main App Navigation */}
            <DropdownMenuItem 
              onClick={() => navigateWithParams('/setup')}
              className={isActivePage('/setup') ? 'bg-accent text-accent-foreground' : ''}
            >
              <Cog className="mr-2 h-4 w-4" />
              Setup
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigateWithParams('/chat')}
              className={isActivePage('/chat') ? 'bg-accent text-accent-foreground' : ''}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigateWithParams('/generate')}
              className={isActivePage('/generate') ? 'bg-accent text-accent-foreground' : ''}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Generate
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* User Actions */}
            <DropdownMenuItem>
              <div className="flex items-center">
                <Avatar className="h-4 w-4 mr-2">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="text-xs">U</AvatarFallback>
                </Avatar>
                Profile
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <div className="flex items-center justify-between">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
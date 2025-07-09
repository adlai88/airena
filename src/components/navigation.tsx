'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { HamburgerMenu } from '@/components/hamburger-menu';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Cog, MessageSquare, Wand2 } from 'lucide-react';
import Link from 'next/link';

interface NavigationProps {
  homeNav?: boolean;
}

export function Navigation({ homeNav = false }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  // const isActive = (path: string) => pathname === path;
  
  // Determine if we're on an app page (not homepage)
  const isAppPage = !homeNav && pathname !== '/';
  
  // Determine active tab based on current route
  const navigateWithParams = async (path: string) => {
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

  const isActivePage = (path: string) => {
    if (path === '/setup') return pathname === '/setup' || pathname === '/options';
    if (path === '/generate') return pathname === '/generate' || pathname.startsWith('/generate');
    if (path === '/chat') return pathname === '/chat' || pathname.startsWith('/chat');
    return false;
  };

  // Get current active page name for mobile dropdown
  const getActivePage = () => {
    if (isActivePage('/setup')) return { name: 'Channel', icon: Cog };
    if (isActivePage('/chat')) return { name: 'Chat', icon: MessageSquare };
    if (isActivePage('/generate')) return { name: 'Generate', icon: Wand2 };
    return { name: 'Channel', icon: Cog }; // default
  };

  const activePage = getActivePage();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="relative flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="text-base sm:text-lg font-bold p-1 sm:p-0 h-auto hover:bg-transparent cursor-pointer"
            >
              Airena
            </Button>
          </div>

          {/* Center Navigation - Absolutely centered */}
          {isAppPage && (
            <div className="absolute left-1/2 transform -translate-x-1/2">
              {/* Mobile: Active page dropdown */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                      <activePage.icon className="h-4 w-4" />
                      {activePage.name}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => navigateWithParams('/setup')}
                      className={isActivePage('/setup') ? 'bg-accent text-accent-foreground' : ''}
                    >
                      <Cog className="mr-2 h-4 w-4" />
                      Channel
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Desktop: Tab navigation */}
              <div className="hidden sm:block">
                <NavigationMenu className="p-1 rounded-lg border border-border bg-background">
                <NavigationMenuList className="gap-1">
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        onClick={() => navigateWithParams('/setup')}
                        className={`rounded-md px-4 py-2 transition-colors text-sm font-medium cursor-pointer ${
                          isActivePage('/setup')
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        Channel
                      </Button>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        onClick={() => navigateWithParams('/chat')}
                        className={`rounded-md px-4 py-2 transition-colors text-sm font-medium cursor-pointer ${
                          isActivePage('/chat')
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        Chat
                      </Button>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        onClick={() => navigateWithParams('/generate')}
                        className={`rounded-md px-4 py-2 transition-colors text-sm font-medium cursor-pointer ${
                          isActivePage('/generate')
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        Generate
                      </Button>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
                </NavigationMenu>
              </div>
            </div>
          )}

          {/* Right Side Navigation */}
          {homeNav ? (
            /* Home Navigation: Show hamburger on mobile, buttons on desktop */
            <>
              {/* Mobile: Hamburger Menu */}
              <div className="sm:hidden">
                <HamburgerMenu homeNav={true} />
              </div>
              
              {/* Desktop: Log in / Sign up */}
              <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="sm" className="font-medium min-h-[44px] sm:min-h-auto text-sm" asChild>
                  <Link href="#">Log in</Link>
                </Button>
                <Button variant="ghost" size="sm" className="font-medium min-h-[44px] sm:min-h-auto text-sm" asChild>
                  <Link href="#">Sign up</Link>
                </Button>
              </div>
            </>
          ) : (
            /* App Navigation: Show hamburger on mobile, theme + avatar on desktop */
            <>
              {/* Mobile: Hamburger Menu */}
              <div className="sm:hidden">
                <HamburgerMenu homeNav={false} />
              </div>
              
              {/* Desktop: Theme toggle + Avatar */}
              <div className="hidden sm:flex items-center gap-1 sm:gap-3">
                <ThemeToggle />
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="text-xs font-medium">
                    U
                  </AvatarFallback>
                </Avatar>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
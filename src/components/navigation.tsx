'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const navigateWithParams = (path: string) => {
    // Preserve query parameters when navigating
    const searchParams = new URLSearchParams(window.location.search);
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    router.push(fullPath);
  };

  const isActivePage = (path: string) => {
    if (path === '/setup') return pathname === '/setup' || pathname === '/options';
    if (path === '/generate') return pathname === '/generate' || pathname.startsWith('/generate');
    if (path === '/chat') return pathname === '/chat' || pathname.startsWith('/chat');
    return false;
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
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

          {/* Center Navigation (only on app pages) */}
          {isAppPage && (
            <div className="flex justify-center flex-1 mx-2 sm:mx-4">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        onClick={() => navigateWithParams('/setup')}
                        className={`cursor-pointer transition-colors px-2 py-1.5 text-sm font-medium min-h-[44px] sm:min-h-auto rounded-sm ${
                          isActivePage('/setup')
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        Setup
                      </Button>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Button
                        variant="ghost"
                        onClick={() => navigateWithParams('/chat')}
                        className={`cursor-pointer transition-colors px-2 py-1.5 text-sm font-medium min-h-[44px] sm:min-h-auto rounded-sm ${
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
                        className={`cursor-pointer transition-colors px-2 py-1.5 text-sm font-medium min-h-[44px] sm:min-h-auto rounded-sm ${
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
          )}

          {/* Right Side Navigation */}
          {homeNav ? (
            /* Home Navigation: Log in / Sign up */
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="font-medium min-h-[44px] sm:min-h-auto text-sm" asChild>
                <Link href="#">Log in</Link>
              </Button>
              <Button variant="ghost" size="sm" className="font-medium min-h-[44px] sm:min-h-auto text-sm" asChild>
                <Link href="#">Sign up</Link>
              </Button>
            </div>
          ) : (
            /* App Navigation: Theme toggle + Avatar */
            <div className="flex items-center gap-1 sm:gap-3">
              <ThemeToggle />
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="text-xs font-medium">
                  U
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
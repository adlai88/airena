'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const getActiveTab = () => {
    if (pathname === '/setup' || pathname === '/options') return 'sync';
    if (pathname === '/generate' || pathname.startsWith('/generate')) return 'generate';
    if (pathname === '/chat' || pathname.startsWith('/chat')) return 'chat';
    return 'sync';
  };

  const handleTabClick = (tabId: string) => {
    // Preserve query parameters when switching tabs
    const searchParams = new URLSearchParams(window.location.search);
    const queryString = searchParams.toString();
    
    let path = '';
    switch (tabId) {
      case 'sync':
        path = '/setup';
        break;
      case 'generate':
        path = '/generate';
        break;
      case 'chat':
        path = '/chat';
        break;
      default:
        return;
    }
    
    const fullPath = queryString ? `${path}?${queryString}` : path;
    router.push(fullPath);
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
              className="text-lg font-bold p-0 h-auto hover:bg-transparent cursor-pointer"
            >
              Airena
            </Button>
          </div>

          {/* Center Tabs (only on app pages) */}
          {isAppPage && (
            <div className="flex justify-center flex-1">
              <Tabs value={getActiveTab()} onValueChange={handleTabClick}>
                <TabsList className="grid w-full grid-cols-3 max-w-xs sm:max-w-md overflow-x-auto min-w-0">
                  <TabsTrigger value="sync" className="cursor-pointer hover:bg-muted transition">Sync</TabsTrigger>
                  <TabsTrigger value="generate" className="cursor-pointer hover:bg-muted transition">Generate</TabsTrigger>
                  <TabsTrigger value="chat" className="cursor-pointer hover:bg-muted transition">Chat</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Right Side Navigation */}
          {homeNav ? (
            /* Home Navigation: Log in / Sign up */
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="font-medium min-h-[44px] sm:min-h-auto" asChild>
                <Link href="#">Log in</Link>
              </Button>
              <Button variant="ghost" size="sm" className="font-medium min-h-[44px] sm:min-h-auto" asChild>
                <Link href="#">Sign up</Link>
              </Button>
            </div>
          ) : (
            /* App Navigation: Theme toggle + Avatar */
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Avatar className="h-8 w-8">
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
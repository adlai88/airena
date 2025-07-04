'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

interface NavigationProps {
  homeNav?: boolean;
}

export function Navigation({ homeNav = false }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-lg font-bold p-0 h-auto hover:bg-transparent"
          >
            Airena
          </Button>
        </div>

        {/* Conditional Navigation */}
        {homeNav ? (
          /* Home Navigation: Log in / Sign up */
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="font-medium" asChild>
              <Link href="#">Log in</Link>
            </Button>
            <Button variant="ghost" size="sm" className="font-medium" asChild>
              <Link href="#">Sign up</Link>
            </Button>
          </div>
        ) : (
          /* App Navigation: Navigation Links */
          <>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <nav className="hidden md:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/')}
                  size="sm"
                  className={isActive('/') ? 'bg-black text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white' : ''}
                >
                  Home
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/setup')}
                  size="sm"
                  className={isActive('/setup') ? 'bg-black text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white' : ''}
                >
                  Setup
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/generate')}
                  size="sm"
                  className={isActive('/generate') || pathname.startsWith('/generate') ? 'bg-black text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white' : ''}
                >
                  Generate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/chat')}
                  size="sm"
                  className={isActive('/chat') || pathname.startsWith('/chat') ? 'bg-black text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white' : ''}
                >
                  Chat
                </Button>
              </nav>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button variant="ghost" size="sm">
                  Menu
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
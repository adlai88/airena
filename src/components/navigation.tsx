'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
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

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Button
            variant={isActive('/') ? 'default' : 'ghost'}
            onClick={() => router.push('/')}
            size="sm"
          >
            Home
          </Button>
          <Button
            variant={isActive('/setup') ? 'default' : 'ghost'}
            onClick={() => router.push('/setup')}
            size="sm"
          >
            Setup
          </Button>
          <Button
            variant={isActive('/generate') || pathname.startsWith('/generate') ? 'default' : 'ghost'}
            onClick={() => router.push('/generate')}
            size="sm"
          >
            Generate
          </Button>
          <Button
            variant={isActive('/chat') || pathname.startsWith('/chat') ? 'default' : 'ghost'}
            onClick={() => router.push('/chat')}
            size="sm"
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
    </header>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Home, User, Settings, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { BetterAuthUserButton } from '@/components/better-auth-user-button';

interface HamburgerMenuProps {
  homeNav?: boolean;
}

export function HamburgerMenu({ homeNav = false }: HamburgerMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();

  // Close menu when navigating
  const handleNavigation = (path: string) => {
    setOpen(false);
    router.push(path);
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
            <DropdownMenuItem onClick={() => handleNavigation('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isSignedIn ? (
              <DropdownMenuItem asChild>
                <div className="flex items-center">
                  <BetterAuthUserButton />
                </div>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleNavigation('/sign-up')}>
                <User className="mr-2 h-4 w-4" />
                Sign up
              </DropdownMenuItem>
            )}
          </>
        ) : (
          /* App Navigation Items - Other items (main nav moved to mobile dropdown) */
          <>
            <DropdownMenuItem onClick={() => handleNavigation('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigation('/usage')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Usage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            {/* User Actions */}
            {isSignedIn ? (
              <>
                <DropdownMenuItem asChild>
                  <div className="flex items-center">
                    <BetterAuthUserButton />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => handleNavigation('/sign-in')}>
                <User className="mr-2 h-4 w-4" />
                Sign in
              </DropdownMenuItem>
            )}
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
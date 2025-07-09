'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Menu, Home, User, Settings } from 'lucide-react';

interface HamburgerMenuProps {
  homeNav?: boolean;
}

export function HamburgerMenu({ homeNav = false }: HamburgerMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
          /* App Navigation Items - Other items (main nav moved to mobile dropdown) */
          <>
            <DropdownMenuItem onClick={() => handleNavigation('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
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
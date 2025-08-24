'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/auth-provider';
import { authClient } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart3, CreditCard, Home, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BetterAuthUserButtonProps {
  children?: React.ReactNode;
}

export function BetterAuthUserButton({ children }: BetterAuthUserButtonProps) {
  const user = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBilling = async () => {
    try {
      // Use Polar customer portal
      await authClient.customer.portal();
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      // Fallback to pricing page
      router.push('/pricing');
    }
  };
  
  if (!user) return null;
  
  // Get initials for avatar fallback
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || user.email || 'User'} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Custom menu items from children or default items */}
        {children || (
          <>
            <DropdownMenuItem onClick={() => router.push('/channels')} className="cursor-pointer">
              <Home className="mr-2 h-4 w-4" />
              <span>Channels</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/usage')} className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Usage</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/pricing')} className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Plan</span>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        {user.tier !== 'free' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBilling} className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing Portal</span>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut} 
          disabled={isLoading}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper component for UserButton MenuItems API
BetterAuthUserButton.MenuItems = function MenuItems({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
};

// Helper component for UserButton Link API
BetterAuthUserButton.Link = function Link({ 
  label, 
  labelIcon, 
  href 
}: { 
  label: string; 
  labelIcon?: React.ReactNode; 
  href: string;
}) {
  const router = useRouter();
  
  return (
    <DropdownMenuItem onClick={() => router.push(href)} className="cursor-pointer">
      {labelIcon && <span className="mr-2">{labelIcon}</span>}
      <span>{label}</span>
    </DropdownMenuItem>
  );
};
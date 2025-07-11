'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  tier: string;
}

export function CheckoutModal({ isOpen, onClose, planName, planPrice, tier }: CheckoutModalProps) {
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && tier) {
      createCheckoutSession();
    }
  }, [isOpen, tier]); // eslint-disable-line react-hooks/exhaustive-deps

  const createCheckoutSession = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔍 Creating checkout session for tier:', tier);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('🔍 Checkout URL received:', data.checkoutUrl);
        setCheckoutUrl(data.checkoutUrl);
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('❌ Checkout modal error:', err);
      setError('Failed to load checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCheckoutUrl('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscribe to {planName} - {planPrice}/month
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading secure checkout...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-red-600">❌ {error}</p>
              <Button variant="outline" onClick={createCheckoutSession}>
                Try Again
              </Button>
            </div>
          )}

          {checkoutUrl && !isLoading && !error && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CreditCard className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Ready to subscribe?</h3>
                  <p className="text-muted-foreground">
                    Click below to complete your subscription in a secure checkout window.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    window.open(checkoutUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                    handleClose();
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-base"
                >
                  Open Secure Checkout
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-center border-t pt-4">
                🔒 Secure checkout powered by Polar.sh
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
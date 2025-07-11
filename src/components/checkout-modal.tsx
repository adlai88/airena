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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
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
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  src={checkoutUrl}
                  className="w-full h-[600px] border-0"
                  title="Secure Checkout"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                🔒 Secure checkout powered by Polar.sh
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
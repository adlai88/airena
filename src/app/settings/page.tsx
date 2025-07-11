'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Key, Settings, User, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserTierInfo {
  tier: string;
  name: string;
  price?: string;
  features: string[];
}

interface ApiKeyStatus {
  isValid: boolean;
  message: string;
  testing: boolean;
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [apiKey, setApiKey] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    isValid: false,
    message: '',
    testing: false
  });
  const [tierInfo, setTierInfo] = useState<UserTierInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load user tier and API key on mount
  useEffect(() => {
    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user]);

  const loadUserData = async () => {
    try {
      // Load tier info
      const tierResponse = await fetch('/api/user-tier');
      if (tierResponse.ok) {
        const tierData = await tierResponse.json();
        setTierInfo(tierData);
      }

      // Load current API key status
      const keyResponse = await fetch('/api/user-settings');
      if (keyResponse.ok) {
        const keyData = await keyResponse.json();
        setCurrentApiKey(keyData.hasApiKey ? '•••••••••••••••' : '');
        if (keyData.hasApiKey) {
          setApiKeyStatus({
            isValid: true,
            message: 'API key is configured and working',
            testing: false
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const testApiKey = async (key: string) => {
    if (!key) {
      setApiKeyStatus({
        isValid: false,
        message: 'Please enter an API key',
        testing: false
      });
      return;
    }

    setApiKeyStatus({ isValid: false, message: '', testing: true });

    try {
      const response = await fetch('/api/test-arena-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      const result = await response.json();

      if (response.ok) {
        setApiKeyStatus({
          isValid: true,
          message: `✓ Connected as ${result.username}`,
          testing: false
        });
      } else {
        setApiKeyStatus({
          isValid: false,
          message: result.error || 'Invalid API key',
          testing: false
        });
      }
    } catch {
      setApiKeyStatus({
        isValid: false,
        message: 'Failed to test API key',
        testing: false
      });
    }
  };

  const saveApiKey = async () => {
    if (!apiKey) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arenaApiKey: apiKey })
      });

      if (response.ok) {
        setSaved(true);
        setCurrentApiKey('•••••••••••••••');
        setApiKey('');
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeApiKey = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user-settings', {
        method: 'DELETE'
      });

      if (response.ok) {
        setCurrentApiKey('');
        setApiKey('');
        setApiKeyStatus({
          isValid: false,
          message: '',
          testing: false
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error removing API key:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-orange-500" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Account Information</CardTitle>
          </div>
          <CardDescription>Your account details and subscription status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-gray-600">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Current Plan</Label>
              <div className="flex items-center gap-2">
                <Badge variant={tierInfo?.tier === 'free' ? 'secondary' : 'default'}>
                  {tierInfo?.name || 'Free'}
                </Badge>
                {tierInfo?.price && (
                  <span className="text-sm text-gray-600">{tierInfo.price}</span>
                )}
              </div>
            </div>
          </div>

          {tierInfo?.features && (
            <div>
              <Label className="text-sm font-medium">Plan Features</Label>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-1">
                {tierInfo.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {tierInfo?.tier === 'free' && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Upgrade to Starter ($5/month) to access private channels and unlimited usage.{' '}
                <Button variant="link" className="p-0 h-auto font-semibold text-orange-600">
                  View pricing
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Are.na API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>Are.na API Key</CardTitle>
          </div>
          <CardDescription>
            Configure your personal Are.na API key to access private channels
            {tierInfo?.tier === 'free' && (
              <span className="text-orange-600 font-medium"> (Starter plan required)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tierInfo?.tier === 'free' ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Private channel access requires a Starter plan or higher. Upgrade to access your private channels.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder={currentApiKey || 'Enter your Are.na API key'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (apiKeyStatus.message && !apiKeyStatus.testing) {
                        setApiKeyStatus({ isValid: false, message: '', testing: false });
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => testApiKey(apiKey)}
                    disabled={!apiKey || apiKeyStatus.testing}
                  >
                    {apiKeyStatus.testing ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                
                {apiKeyStatus.message && (
                  <p className={`text-sm ${apiKeyStatus.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {apiKeyStatus.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveApiKey}
                  disabled={!apiKey || !apiKeyStatus.isValid || saving}
                  className="flex items-center gap-2"
                >
                  {saved ? <Check className="h-4 w-4" /> : null}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save API Key'}
                </Button>
                
                {currentApiKey && (
                  <Button
                    variant="outline"
                    onClick={removeApiKey}
                    disabled={saving}
                  >
                    Remove Key
                  </Button>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>How to get your API key:</strong>
                  <br />
                  1. Go to{' '}
                  <a 
                    href="https://dev.are.na" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline"
                  >
                    dev.are.na
                  </a>
                  <br />
                  2. Sign in with your Are.na account
                  <br />
                  3. Create a new application or use an existing one
                  <br />
                  4. Copy your Personal Access Token
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage & Billing */}
      {tierInfo?.tier !== 'free' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Usage & Billing</CardTitle>
            </div>
            <CardDescription>Manage your subscription and view usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <a href="/usage">View Usage Dashboard</a>
              </Button>
              <Button variant="outline">
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
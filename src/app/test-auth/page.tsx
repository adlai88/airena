'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function TestAuthPage() {
  const auth = useAuth();
  const user = useUser();
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Auto-run test on page load
    runTest();
  }, []);
  
  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-auth');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Auth System Test Page</h1>
      
      {/* Current Auth State */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
          <CardDescription>Frontend auth hook status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Auth System:</span>
              <Badge variant="default">
                Better Auth
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Is Loaded:</span>
              <Badge variant={auth.isLoaded ? 'default' : 'outline'}>
                {auth.isLoaded ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Is Signed In:</span>
              <Badge variant={auth.isSignedIn ? 'default' : 'outline'}>
                {auth.isSignedIn ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">User ID:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {auth.userId || 'null'}
              </code>
            </div>
          </div>
          
          {user && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">User Details:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* API Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>API Test Results</CardTitle>
          <CardDescription>Backend auth configuration test</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTest} 
            disabled={loading}
            className="mb-4"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Test
          </Button>
          
          {testResult && (
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
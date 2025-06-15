'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testAPIConnection, testRailwayDirect } from '@/lib/api-config';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestAPIPage() {
  const [proxyResult, setProxyResult] = useState<any>(null);
  const [directResult, setDirectResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setProxyResult(null);
    setDirectResult(null);

    try {
      // Test proxy through Netlify
      const proxy = await testAPIConnection();
      setProxyResult(proxy);

      // Test Railway backend directly
      const direct = await testRailwayDirect();
      setDirectResult(direct);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ title, result, type }: { title: string; result: any; type: 'proxy' | 'direct' }) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result?.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : result ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <div className="h-5 w-5" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Status:</strong> {result.status || 'N/A'}
              </div>
              <div>
                <strong>Success:</strong> {result.success ? 'Yes' : 'No'}
              </div>
              <div className="col-span-2">
                <strong>URL:</strong> 
                <div className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                  {result.url || 'N/A'}
                </div>
              </div>
              {result.error && (
                <div className="col-span-2">
                  <strong>Error:</strong>
                  <div className="text-red-600 text-xs bg-red-50 p-2 rounded mt-1">
                    {result.error}
                  </div>
                </div>
              )}
              {result.headers && (
                <div className="col-span-2">
                  <strong>Headers:</strong>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(result.headers, null, 2)}
                  </pre>
                </div>
              )}
              {result.data && (
                <div className="col-span-2">
                  <strong>Response Data:</strong>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                    {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">No test results yet</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">API Connection Test</h1>
          <p className="text-muted-foreground mb-6">
            Test API routing to diagnose proxy configuration issues
          </p>
          
          <Button onClick={runTests} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run API Tests'
            )}
          </Button>
        </div>

        <div className="grid gap-6">
          <ResultCard 
            title="Netlify Proxy Test (/api/health)" 
            result={proxyResult} 
            type="proxy" 
          />
          
          <ResultCard 
            title="Railway Direct Test (Full URL)" 
            result={directResult} 
            type="direct" 
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {proxyResult && directResult && (
                <>
                  {directResult.success && !proxyResult.success && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <strong>Issue Identified:</strong> Railway backend is working, but Netlify proxy is not routing correctly.
                      This indicates a configuration issue with the redirect rules.
                    </div>
                  )}
                  {!directResult.success && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <strong>Backend Issue:</strong> Railway backend is not responding. Check backend deployment.
                    </div>
                  )}
                  {proxyResult.success && directResult.success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <strong>Success:</strong> Both proxy and direct connections are working correctly!
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
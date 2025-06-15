'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { testAPIRouting } from '@/lib/api-config';
import { api } from '@/lib/api-client';

export function APITestComponent() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runAPITests = async () => {
    setIsLoading(true);
    const results = [];

    try {
      // Test 1: Configuration test
      console.log('🧪 Running API configuration test...');
      const configTest = await testAPIRouting();
      results.push({
        name: 'API Configuration',
        ...configTest,
        timestamp: new Date().toISOString(),
      });

      // Test 2: Health check
      console.log('🧪 Running health check test...');
      try {
        const response = await fetch('/api/health');
        results.push({
          name: 'Health Check',
          success: response.ok,
          status: response.status,
          url: response.url,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        results.push({
          name: 'Health Check',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Test 3: Image describe API
      console.log('🧪 Running image describe test...');
      try {
        await api.describeImage('https://res.cloudinary.com/demo/image/upload/sample.jpg');
        results.push({
          name: 'Image Describe API',
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        results.push({
          name: 'Image Describe API',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error: any) {
      results.push({
        name: 'Test Suite',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>API Routing Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test API routing to Railway backend through Netlify proxy
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAPITests} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Running Tests...' : 'Test API Routing'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.name}</span>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
                
                {result.status && (
                  <p className="text-sm text-muted-foreground">
                    Status: {result.status}
                  </p>
                )}
                
                {result.url && (
                  <p className="text-sm text-muted-foreground break-all">
                    URL: {result.url}
                  </p>
                )}
                
                {result.error && (
                  <p className="text-sm text-destructive">
                    Error: {result.error}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
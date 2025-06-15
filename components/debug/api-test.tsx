'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { testAPIRouting, testSpecificEndpoints } from '@/lib/api-config';

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  url?: string;
  responseUrl?: string;
  error?: string;
  timestamp: string;
  details?: any;
}

export function APITestComponent() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runComprehensiveTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    const results: TestResult[] = [];

    try {
      // Test 1: Basic configuration
      console.log('🧪 Running basic configuration test...');
      const configTest = await testAPIRouting();
      results.push({
        name: 'Basic Health Check',
        success: configTest.success,
        status: configTest.status,
        url: configTest.requestUrl,
        responseUrl: configTest.url,
        error: configTest.error,
        timestamp: new Date().toISOString(),
        details: configTest,
      });

      // Test 2: Multiple endpoints
      console.log('🧪 Running multiple endpoint tests...');
      const endpointTests = await testSpecificEndpoints();
      endpointTests.forEach((test, index) => {
        results.push({
          name: `Endpoint: ${test.endpoint}`,
          success: test.success,
          status: test.status,
          url: test.url,
          responseUrl: test.responseUrl,
          error: test.error,
          timestamp: new Date().toISOString(),
        });
      });

      // Test 3: Direct fetch test
      console.log('🧪 Running direct fetch test...');
      try {
        const directResponse = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
        });
        
        results.push({
          name: 'Direct Fetch Test',
          success: directResponse.ok,
          status: directResponse.status,
          url: '/api/health',
          responseUrl: directResponse.url,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        results.push({
          name: 'Direct Fetch Test',
          success: false,
          error: error.message,
          url: '/api/health',
          timestamp: new Date().toISOString(),
        });
      }

      // Test 4: Network inspection
      console.log('🧪 Running network inspection...');
      results.push({
        name: 'Environment Check',
        success: true,
        timestamp: new Date().toISOString(),
        details: {
          environment: process.env.NODE_ENV,
          origin: typeof window !== 'undefined' ? window.location.origin : 'server',
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        },
      });

    } catch (error: any) {
      results.push({
        name: 'Test Suite Error',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge className="bg-green-100 text-green-800">PASS</Badge>;
    }
    return <Badge variant="destructive">FAIL</Badge>;
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          API Routing Diagnostic
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive test of API routing through Netlify proxy to Railway backend
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Button 
            onClick={runComprehensiveTests} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run Comprehensive API Tests'
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Test Results</h3>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {testResults.filter(r => r.success).length} Passed
                </Badge>
                <Badge variant="outline">
                  {testResults.filter(r => !r.success).length} Failed
                </Badge>
              </div>
            </div>
            
            <div className="grid gap-4">
              {testResults.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      {getStatusBadge(result)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {result.status && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={result.status === 200 ? 'text-green-600' : 'text-red-600'}>
                            {result.status}
                          </span>
                        </div>
                      )}
                      
                      {result.url && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Request URL:</span>
                          <span className="font-mono text-xs break-all max-w-md text-right">
                            {result.url}
                          </span>
                        </div>
                      )}
                      
                      {result.responseUrl && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Response URL:</span>
                          <span className="font-mono text-xs break-all max-w-md text-right">
                            {result.responseUrl}
                          </span>
                        </div>
                      )}
                      
                      {result.error && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <span className="text-red-700 text-xs">{result.error}</span>
                        </div>
                      )}
                      
                      {result.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground">
                            View Details
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Expected Results:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Health check should return status 200</li>
            <li>• Response URLs should show Railway backend domain</li>
            <li>• No 404 errors on API endpoints</li>
            <li>• Proxy should be transparent (no CORS errors)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
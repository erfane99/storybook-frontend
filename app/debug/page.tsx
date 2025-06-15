'use client';

import { APITestComponent } from '@/components/debug/api-test';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal, Globe, Settings } from 'lucide-react';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">API Debug Dashboard</h1>
          <p className="text-muted-foreground">
            Diagnose and test API routing from Netlify frontend to Railway backend
          </p>
        </div>
        
        <div className="grid gap-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />
                  Frontend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Platform:</span>
                    <Badge variant="outline">Netlify</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Domain:</span>
                    <span className="text-sm font-mono">aistorybook.netlify.app</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Terminal className="h-5 w-5" />
                  Backend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Platform:</span>
                    <Badge variant="outline">Railway</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Domain:</span>
                    <span className="text-sm font-mono">railway.app</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Proxy Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Method:</span>
                    <Badge variant="outline">Netlify Redirects</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Testing</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="flex justify-center mb-8">
          <APITestComponent />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">If tests fail:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Check Netlify deployment logs</li>
                  <li>2. Verify _redirects file is deployed</li>
                  <li>3. Confirm Railway backend is running</li>
                  <li>4. Test Railway endpoints directly</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Console Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">Available in browser console:</h4>
                <ul className="text-sm font-mono text-muted-foreground space-y-1">
                  <li>testAPIRouting()</li>
                  <li>testSpecificEndpoints()</li>
                  <li>getApiBaseUrl()</li>
                  <li>buildApiUrl('api/health')</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
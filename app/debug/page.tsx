'use client';

import { APITestComponent } from '@/components/debug/api-test';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">API Debug Dashboard</h1>
          <p className="text-muted-foreground">
            Test and debug API routing to Railway backend
          </p>
        </div>
        
        <div className="flex justify-center">
          <APITestComponent />
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Open browser console for detailed logging during tests
          </p>
        </div>
      </div>
    </div>
  );
}
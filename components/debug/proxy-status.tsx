'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ProxyStatus {
  isWorking: boolean;
  responseUrl?: string;
  status?: number;
  error?: string;
  timestamp: string;
}

export function ProxyStatusIndicator() {
  const [status, setStatus] = useState<ProxyStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkProxyStatus = async () => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      const isProxied = response.url.includes('railway.app') || response.status === 200;
      
      setStatus({
        isWorking: isProxied,
        responseUrl: response.url,
        status: response.status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      setStatus({
        isWorking: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkProxyStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkProxyStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (isChecking) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!status) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    if (status.isWorking) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (isChecking) return <Badge variant="outline">Checking...</Badge>;
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    if (status.isWorking) return <Badge className="bg-green-100 text-green-800">Working</Badge>;
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Proxy Status
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status && (
          <div className="space-y-2 text-sm">
            {status.status && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">HTTP Status:</span>
                <span className={status.status === 200 ? 'text-green-600' : 'text-red-600'}>
                  {status.status}
                </span>
              </div>
            )}
            
            {status.responseUrl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Response URL:</span>
                <span className="font-mono text-xs break-all max-w-xs text-right">
                  {status.responseUrl}
                </span>
              </div>
            )}
            
            {status.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <span className="text-red-700 text-xs">{status.error}</span>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(status.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
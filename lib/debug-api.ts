// Debug utilities for API troubleshooting
export function debugAPICall(endpoint: string, method: string = 'GET') {
  console.log('🔍 DEBUG: Testing API call...');
  console.log('🔍 Endpoint:', endpoint);
  console.log('🔍 Method:', method);
  
  // Test buildApiUrl function
  const { buildApiUrl } = require('./api');
  const fullUrl = buildApiUrl(endpoint);
  
  console.log('🔍 Full URL:', fullUrl);
  console.log('🔍 URL hostname:', new URL(fullUrl).hostname);
  console.log('🔍 Is Railway?', fullUrl.includes('railway.app'));
  console.log('🔍 Is Netlify?', fullUrl.includes('netlify.app'));
  
  return fullUrl;
}

export function testAPIImport() {
  try {
    const apiModule = require('./api');
    console.log('✅ API module imported successfully');
    console.log('✅ Available methods:', Object.keys(apiModule.api));
    console.log('✅ buildApiUrl function:', typeof apiModule.buildApiUrl);
    return true;
  } catch (error) {
    console.error('❌ Failed to import API module:', error);
    return false;
  }
}

// Global debug functions for browser console
if (typeof window !== 'undefined') {
  (window as any).debugAPICall = debugAPICall;
  (window as any).testAPIImport = testAPIImport;
  console.log('🔧 Debug functions available: debugAPICall(), testAPIImport()');
}
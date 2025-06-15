// Debug utilities for API troubleshooting - RAILWAY BACKEND VERIFICATION
import { buildApiUrl, api } from './api';

export function debugAPICall(endpoint: string, method: string = 'GET') {
  console.log('🔍 DEBUG: Testing API call to Railway backend...');
  console.log('🔍 Endpoint:', endpoint);
  console.log('🔍 Method:', method);
  
  // Test buildApiUrl function
  const fullUrl = buildApiUrl(endpoint);
  
  console.log('🔍 Full URL:', fullUrl);
  console.log('🔍 URL hostname:', new URL(fullUrl).hostname);
  console.log('🔍 Is Railway?', fullUrl.includes('railway.app'));
  console.log('🔍 Is Netlify?', fullUrl.includes('netlify.app'));
  
  // SAFETY CHECK
  if (!fullUrl.includes('railway.app')) {
    console.error('❌ CRITICAL ERROR: URL is not Railway backend!');
    throw new Error(`Expected Railway backend, got: ${fullUrl}`);
  }
  
  console.log('✅ URL verification passed - using Railway backend');
  return fullUrl;
}

export function testAPIImport() {
  try {
    console.log('✅ API module imported successfully');
    console.log('✅ Available methods:', Object.keys(api));
    console.log('✅ buildApiUrl function:', typeof buildApiUrl);
    
    // Test a sample URL
    const testUrl = buildApiUrl('api/test');
    console.log('✅ Sample URL test:', testUrl);
    console.log('✅ Sample URL uses Railway?', testUrl.includes('railway.app'));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to import API module:', error);
    return false;
  }
}

export async function testRailwayConnection() {
  console.log('🧪 Testing Railway backend connection...');
  
  try {
    // Test with a simple endpoint
    const testUrl = buildApiUrl('api/health');
    console.log('🧪 Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    console.log('🧪 Response status:', response.status);
    console.log('🧪 Response URL:', response.url);
    console.log('🧪 Response from Railway?', response.url.includes('railway.app'));
    
    const result = {
      success: response.ok,
      status: response.status,
      url: response.url,
      isRailway: response.url.includes('railway.app'),
      timestamp: new Date().toISOString(),
    };
    
    if (result.isRailway) {
      console.log('✅ Railway backend connection successful');
    } else {
      console.error('❌ Response not from Railway backend!');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Railway connection test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testDescribeImageAPI() {
  console.log('🔍 Testing describeImage API on Railway backend...');
  
  try {
    // Use a test image URL
    const testImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    
    console.log('🔍 Calling api.describeImage with test image...');
    const result = await api.describeImage(testImageUrl);
    
    console.log('✅ describeImage API test successful:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ describeImage API test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Global debug functions for browser console
if (typeof window !== 'undefined') {
  (window as any).debugAPICall = debugAPICall;
  (window as any).testAPIImport = testAPIImport;
  (window as any).testRailwayConnection = testRailwayConnection;
  (window as any).testDescribeImageAPI = testDescribeImageAPI;
  
  console.log('🔧 Debug functions available:');
  console.log('🔧 - debugAPICall(endpoint, method)');
  console.log('🔧 - testAPIImport()');
  console.log('🔧 - testRailwayConnection()');
  console.log('🔧 - testDescribeImageAPI()');
}
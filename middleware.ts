import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect all API calls to Railway backend
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const railwayUrl = `https://storybook-backend-production-cb71.up.railway.app${request.nextUrl.pathname}${request.nextUrl.search}`;
    
    console.log(`🔄 MIDDLEWARE: Redirecting ${request.nextUrl.pathname} to Railway: ${railwayUrl}`);
    
    return NextResponse.redirect(railwayUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
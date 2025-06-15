'use client';

import { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import Navbar from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

// Navbar loading fallback component
function NavbarFallback() {
  return (
    <header className="fixed w-full z-50 bg-background/80 backdrop-blur-sm py-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-muted animate-pulse rounded"></div>
          <div className="w-32 h-6 bg-muted animate-pulse rounded"></div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
          <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
          <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
        </nav>
        
        <div className="hidden md:flex items-center space-x-4">
          <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
          <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
          <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
        </div>
        
        <div className="md:hidden w-6 h-6 bg-muted animate-pulse rounded"></div>
      </div>
    </header>
  );
}

export function RootClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {/* Always render navbar with proper fallback */}
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
        
        {/* Main content */}
        <main className="min-h-screen">
          {children}
        </main>
        
        {/* Toast notifications */}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
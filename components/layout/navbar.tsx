'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme/mode-toggle';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Book, Menu, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  // Ensure component is mounted before rendering auth-dependent content
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Scroll detection
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path: string) => pathname === path;

  const handleHowItWorksClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If we're not on the home page, navigate there first
    if (pathname !== '/') {
      router.push('/#how-it-works');
    } else {
      // If we're already on the home page, scroll to the section
      const element = document.getElementById('how-it-works');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    // Close mobile menu if open
    setIsOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/#how-it-works', label: 'How It Works', onClick: handleHowItWorksClick },
  ];

  // Always render the navbar structure, but show loading states for auth-dependent content
  const renderAuthButtons = () => {
    if (!isMounted) {
      // Show placeholder during SSR/hydration
      return (
        <div className="flex items-center space-x-4">
          <div className="w-20 h-9 bg-muted animate-pulse rounded"></div>
          <div className="w-24 h-9 bg-muted animate-pulse rounded"></div>
        </div>
      );
    }

    if (isLoading) {
      // Show loading state
      return (
        <div className="flex items-center space-x-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      );
    }

    if (user) {
      return (
        <>
          <Button variant="ghost" onClick={() => router.push('/storybook/library')}>
            My Stories
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </>
      );
    }

    return (
      <>
        <Button variant="ghost" onClick={() => router.push('/auth')}>
          Sign In
        </Button>
        <Button onClick={() => router.push('/create')}>
          Get Started
        </Button>
      </>
    );
  };

  const renderMobileAuthButtons = () => {
    if (!isMounted) {
      // Show placeholder during SSR/hydration
      return (
        <div className="space-y-3">
          <div className="w-full h-10 bg-muted animate-pulse rounded"></div>
          <div className="w-full h-10 bg-muted animate-pulse rounded"></div>
        </div>
      );
    }

    if (isLoading) {
      // Show loading state
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      );
    }

    if (user) {
      return (
        <>
          <Button variant="outline" onClick={() => {
            router.push('/storybook/library');
            setIsOpen(false);
          }}>
            My Stories
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </>
      );
    }

    return (
      <>
        <Button variant="outline" onClick={() => {
          router.push('/auth');
          setIsOpen(false);
        }}>
          Sign In
        </Button>
        <Button onClick={() => {
          router.push('/create');
          setIsOpen(false);
        }}>
          Get Started
        </Button>
      </>
    );
  };

  return (
    <header 
      className={cn(
        'fixed w-full z-50 transition-all duration-300 py-4',
        isScrolled ? 'bg-background/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      )}
    >
      <div className="container flex items-center justify-between">
        {/* Logo - Always visible */}
        <Link href="/" className="flex items-center space-x-2">
          <Book className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">StoryCanvas</span>
        </Link>

        {/* Desktop Navigation - Always visible */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            link.onClick ? (
              <button
                key={link.href}
                onClick={link.onClick}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <ModeToggle />
          {renderAuthButtons()}
        </div>

        {/* Mobile navigation toggle - Always visible */}
        <button 
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden pt-2 pb-4 px-8 bg-background/95 backdrop-blur-sm border-t">
          <nav className="flex flex-col space-y-4 py-4">
            {navLinks.map((link) => (
              link.onClick ? (
                <button
                  key={link.href}
                  onClick={link.onClick}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary text-left',
                    isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="pt-2 flex flex-col space-y-3">
              {renderMobileAuthButtons()}
              <div className="pt-2 flex justify-center">
                <ModeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
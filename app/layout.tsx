import './globals.css';
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { RootClientWrapper } from '@/app/_components/root-client-wrapper';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StoryCanvas - AI Storybook Generator',
  description: 'Create beautiful cartoon storybooks with AI using your own images',
  keywords: ['AI', 'storybook', 'children', 'cartoon', 'generator', 'DALL-E', 'OpenAI'],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  authors: [{ name: 'StoryCanvas Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'StoryCanvas - AI Storybook Generator',
    description: 'Create beautiful cartoon storybooks with AI using your own images',
    type: 'website',
    siteName: 'StoryCanvas',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('antialiased', fontSans.variable)}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen bg-background font-sans">
        <RootClientWrapper>
          {children}
        </RootClientWrapper>
      </body>
    </html>
  );
}
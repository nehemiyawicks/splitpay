import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'splitpay',
  description: 'Group expense splitter with instant MiniPay settle',
  other: {
    'talentapp:project_verification':
      '739bfc86394b8cfcae79298c58f90e838df1ab3e7eb533c6d3366d1b84a10c35eabdb9bc48053c7c9e83322392e91fa2578ee8feb2b2ceb113409e8f6efcf1e0',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </WalletProvider>
        </div>
        <Analytics />
      </body>
    </html>
  );
}

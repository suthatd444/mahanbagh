import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mohan Bagh',
  description: 'Real estate broker hierarchy platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

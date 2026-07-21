import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { MonthProvider } from '@/contexts/MonthContext'
import { ToastProvider } from '@/contexts/ToastContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CGD Sales Dashboard',
  description: 'PT Central Group Development · MASCOL Division Weekly Report',
}

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('cgd-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.add(t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MonthProvider>
                {children}
              </MonthProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

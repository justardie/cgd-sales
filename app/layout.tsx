import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { MonthProvider } from '@/contexts/MonthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CGD Sales Dashboard',
  description: 'PT Central Group Development · MASCOL Division Weekly Report',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <MonthProvider>
              {children}
            </MonthProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

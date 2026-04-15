import type { Metadata } from 'next'
import { Cinzel } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cinzel',
})

export const metadata: Metadata = {
  title: 'Fortress Factions',
  description: 'Teens vs. Parents Tower Defense Home RPG',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body className="bg-dark-stone font-medieval antialiased">
        {children}
      </body>
    </html>
  )
}

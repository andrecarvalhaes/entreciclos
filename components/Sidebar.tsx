'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contas-a-pagar', label: 'Contas a Pagar', icon: ArrowDownCircle },
  { href: '/contas-a-receber', label: 'Contas a Receber', icon: ArrowUpCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 flex flex-col"
      style={{ backgroundColor: '#2D2566' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center px-6 py-8 border-b border-white/10">
        <Image
          src="/logo.png"
          alt="Entre Ciclos Lavanderia"
          width={100}
          height={100}
          className="rounded-xl mb-3"
          priority
        />
        <p className="text-white/50 text-xs font-medium tracking-widest uppercase">
          Sistema Financeiro
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={
                isActive
                  ? { backgroundColor: '#E8A0B8', color: '#2D2566' }
                  : { color: 'rgba(255,255,255,0.7)' }
              }
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = '#fff'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)'
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs text-center">Entre Ciclos &copy; {new Date().getFullYear()}</p>
      </div>
    </aside>
  )
}

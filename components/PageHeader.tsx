'use client'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{ backgroundColor: '#2D2566', height: '56px' }}
      >
        <div>
          <h1 className="text-white font-semibold text-base leading-tight">{title}</h1>
          {subtitle && <p className="text-white/50 text-xs">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {/* Spacer mobile */}
      <div className="md:hidden h-14" />

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </>
  )
}

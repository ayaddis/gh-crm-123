'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { adminNav, mainNav, type NavItem } from './nav'

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] font-medium text-white/85 transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
        active && 'bg-white/15 text-white',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {item.label}
    </Link>
  )
}

export function Sidebar({ isSupervisor }: { isSupervisor: boolean }) {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  return (
    <aside className="fixed inset-y-0 left-0 flex w-[220px] flex-col bg-navy p-3">
      <div className="px-3 py-3 text-[17px] font-bold text-white">CRM-123</div>
      <nav aria-label="Principal" className="mt-2 flex flex-col gap-1">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>
      {isSupervisor && (
        <nav aria-label="Administración" className="mt-6 flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-200">
            Administración
          </p>
          {adminNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
      )}
    </aside>
  )
}

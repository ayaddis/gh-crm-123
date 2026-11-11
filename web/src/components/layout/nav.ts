import {
  LayoutDashboard, Users, Briefcase, FileText, Wallet, ShieldAlert, BarChart3,
  User, Percent, Flag, History, SlidersHorizontal, type LucideIcon,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

export const mainNav: NavItem[] = [
  { href: '/', label: 'Tablero', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/oportunidades', label: 'Oportunidades', icon: Briefcase },
  { href: '/polizas', label: 'Pólizas', icon: FileText },
  { href: '/cobranza', label: 'Cobranza', icon: Wallet },
  { href: '/siniestros', label: 'Siniestros', icon: ShieldAlert },
  { href: '/comisiones', label: 'Comisiones', icon: BarChart3 },
]

export const adminNav: NavItem[] = [
  { href: '/admin/usuarios', label: 'Usuarios', icon: User },
  { href: '/admin/catalogos', label: 'Catálogos', icon: SlidersHorizontal },
  { href: '/admin/comisiones', label: 'Porcentajes de comisión', icon: Percent },
  { href: '/admin/metas', label: 'Metas', icon: Flag },
  { href: '/admin/historial', label: 'Historial', icon: History },
]

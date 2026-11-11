import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database'

const PUBLIC_PATHS = ['/login', '/offline']

/**
 * Refresca la sesión y aplica las reglas de acceso:
 * sin sesión → /login · perfil inactivo/inexistente → cierra sesión · contraseña obligatoria → /cambiar-contrasena
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const path = request.nextUrl.pathname
  const redirectTo = (to: string, search = '') => {
    const url = request.nextUrl.clone()
    url.pathname = to
    url.search = search
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  const isPublic = PUBLIC_PATHS.includes(path)

  if (!user) return isPublic ? response : redirectTo('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, must_change_password')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut()
    return redirectTo('/login', '?motivo=inactivo')
  }

  if (profile.must_change_password && path !== '/cambiar-contrasena') {
    return redirectTo('/cambiar-contrasena')
  }
  // Quien ya entró no necesita volver a la pantalla de inicio de sesión.
  if (path === '/login') return redirectTo('/')
  return response
}

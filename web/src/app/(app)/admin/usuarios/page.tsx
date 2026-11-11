import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { LABELS, label } from '@/lib/labels'
import { Table, Th, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FormModal } from '@/components/form-modal'
import { SelectField, TextField } from '@/components/field'
import { options } from '@/lib/labels'
import { createUser, resetUserPassword, setUserAccess, updateUserProfile } from './actions'

export default async function UsuariosPage() {
  const me = await getCurrentProfile()
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, is_active, must_change_password').order('full_name')
  if (error) return <ErrorNotice />
  const users = data ?? []
  const active = (role: string) => users.filter((u) => u.role === role && u.is_active).length

  return (
    <>
      <PageHeader title="Usuarios" action={
        <FormModal title="Nuevo usuario" triggerLabel="Nuevo usuario" action={createUser} submitLabel="Crear usuario" pendingLabel="Creando usuario…">
          <TextField label="Nombre completo" name="full_name" maxLength={120} required />
          <TextField label="Correo" name="email" type="email" maxLength={254} required />
          <SelectField label="Rol" name="role" options={options(LABELS.role)} />
          <p className="text-xs text-ink-soft">Se generará una contraseña temporal que se mostrará una sola vez.</p>
        </FormModal>
      }>
        <p className="text-sm text-ink-soft">Vendedores activos {active('vendedor')} de 10 · Supervisores activos {active('supervisor')} de 2</p>
      </PageHeader>
      {users.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay usuarios.</EmptyState></div> : (
        <Table><thead><tr><Th>Nombre</Th><Th>Correo</Th><Th>Rol</Th><Th>Estado</Th><Th /></tr></thead><tbody>
          {users.map((u) => {
            const self = u.id === me?.id
            return (
              <tr key={u.id}>
                <Td className="font-medium">{u.full_name}</Td><Td>{u.email}</Td><Td>{label(LABELS.role, u.role)}</Td>
                <Td><Badge variant={u.is_active ? 'positive' : 'neutral'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>{u.must_change_password && <Badge variant="attention" className="ml-2">Contraseña temporal pendiente</Badge>}</Td>
                <Td className="text-right"><div className="flex justify-end gap-2">
                  <FormModal title="Editar usuario" triggerLabel="Editar" triggerVariant="outline" triggerSize="sm" kind="drawer" action={updateUserProfile} submitLabel="Guardar" pendingLabel="Guardando…">
                    <input type="hidden" name="id" value={u.id} />
                    <TextField label="Nombre completo" name="full_name" defaultValue={u.full_name} maxLength={120} required />
                    <SelectField label="Rol" name="role" defaultValue={u.role} options={options(LABELS.role)} disabled={self} hint={self ? 'No puedes cambiar tu propio rol.' : undefined} />
                    {self && <input type="hidden" name="role" value={u.role} />}
                  </FormModal>
                  {!self && (
                    <>
                      <FormModal title="Restablecer contraseña" triggerLabel="Restablecer contraseña" triggerVariant="outline" triggerSize="sm" action={resetUserPassword} submitLabel="Restablecer" pendingLabel="Restableciendo…">
                        <input type="hidden" name="id" value={u.id} /><p className="text-sm">Se generará una contraseña temporal para {u.full_name} y deberá cambiarla al entrar.</p>
                      </FormModal>
                      <FormModal title={u.is_active ? 'Desactivar usuario' : 'Reactivar usuario'} triggerLabel={u.is_active ? 'Desactivar' : 'Reactivar'} triggerVariant="outline" triggerSize="sm" action={setUserAccess} submitLabel={u.is_active ? 'Desactivar' : 'Reactivar'} pendingLabel="Guardando…">
                        <input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={String(!u.is_active)} />
                        <p className="text-sm">{u.is_active ? `${u.full_name} ya no podrá entrar al sistema. Su historial se conserva.` : `${u.full_name} podrá volver a entrar al sistema.`}</p>
                      </FormModal>
                    </>
                  )}
                </div></Td>
              </tr>
            )
          })}</tbody></Table>
      )}
    </>
  )
}

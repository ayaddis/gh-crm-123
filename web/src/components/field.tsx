import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, Textarea } from '@/components/ui/select'

type Opt = { value: string; text: string }

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  )
}

export function TextField({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <Input id={name} name={name} {...props} />
    </Field>
  )
}

export function SelectField({
  label, name, options, placeholder, hint, ...props
}: { label: string; name: string; options: Opt[]; placeholder?: string; hint?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <Select id={name} name={name} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.text}</option>
        ))}
      </Select>
    </Field>
  )
}

export function TextAreaField({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <Textarea id={name} name={name} {...props} />
    </Field>
  )
}

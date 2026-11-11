// Verificación automática de seguridad (CLAUDE.md §10 y TECHNICAL_SPEC.md §13).
// Uso: npm run check:security
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const SRC = join(root, 'src')
const problems = []

// Rutas donde SÍ se permite la llave secreta (TECHNICAL_SPEC.md §5), relativas a la app.
const ALLOWED_SECRET = [
  'src/lib/supabase/admin.ts',
  'src/lib/env.server.ts',
  'src/app/(app)/admin/',
  'src/app/api/n8n/',
  'src/app/api/summary/',
]

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (name === 'node_modules' || name === '.next') continue
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const rel = (f) => relative(root, f).split(sep).join('/')
const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f))
const isTest = (f) => /\.test\.tsx?$/.test(f)

for (const f of files) {
  const r = rel(f)
  const text = readFileSync(f, 'utf8')
  const lines = text.split('\n')
  const isClient = /^\s*['"]use client['"]/.test(text)

  // 1. Llave secreta o admin.ts fuera de las rutas permitidas
  const usesSecret = /SUPABASE_SERVICE_ROLE_KEY|supabase\/admin|from ['"]\.\/admin['"]/.test(text)
  if (usesSecret && !ALLOWED_SECRET.some((p) => r.startsWith(p) || r === p)) {
    problems.push(`${r}: referencia la llave secreta o admin.ts fuera de las rutas permitidas`)
  }

  // 2. Componentes cliente que importan código de servidor o leen variables privadas
  if (isClient) {
    if (/server-only|supabase\/admin|env\.server/.test(text)) problems.push(`${r}: archivo 'use client' importa código de servidor`)
    if (/process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)/.test(text)) problems.push(`${r}: archivo 'use client' lee variables sin prefijo NEXT_PUBLIC_`)
  }

  if (isTest(f)) continue

  // 3. Palabras prohibidas en la interfaz (solo archivos de componentes y páginas)
  if (f.endsWith('.tsx')) {
    lines.forEach((line, i) => {
      if (/\b(eliminar|eliminación|borrar|delete)\b/i.test(line)) problems.push(`${r}:${i + 1}: texto prohibido (eliminar/borrar/delete)`)
    })
  }

  lines.forEach((line, i) => {
    // 4. Comparación de secretos con === / !==
    if (/(secret|token|webhook)/i.test(line) && /[!=]==/.test(line) && !/typeof|undefined|null/.test(line)) {
      problems.push(`${r}:${i + 1}: posible comparación de secreto con ===/!== (usa safeEqual)`)
    }
    // 5. Rol desde el JWT, metadata o getSession()
    if (/app_metadata|user_metadata|getSession\s*\(|\.claims\b|getClaims\s*\(/.test(line)) {
      problems.push(`${r}:${i + 1}: lectura de rol/identidad desde JWT, metadata o getSession()`)
    }
  })
}

// 6. Archivos .env versionados y valores que parecen llaves
try {
  const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
  for (const t of tracked) {
    if (/(^|\/)\.env(\.|$)/.test(t) && !t.endsWith('.env.example')) problems.push(`${t}: archivo .env versionado`)
  }
} catch {
  /* sin git disponible: se omite */
}
const keyLike = /sb_secret_|\bre_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{20,}/
for (const f of [...files, join(root, '.env.example')]) {
  try {
    if (keyLike.test(readFileSync(f, 'utf8'))) problems.push(`${rel(f)}: contiene un valor que parece una llave`)
  } catch {
    /* archivo ausente */
  }
}

if (problems.length) {
  console.error('check:security FALLÓ:\n' + problems.map((p) => ` - ${p}`).join('\n'))
  process.exit(1)
}
console.log(`check:security OK (${files.length} archivos revisados)`)

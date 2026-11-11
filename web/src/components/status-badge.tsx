import { Badge } from '@/components/ui/badge'
import { toneOf } from '@/lib/labels'

export function StatusBadge({ status, labels }: { status: string | null; labels: Record<string, string> }) {
  if (!status) return <span className="text-ink-mute">—</span>
  return <Badge variant={toneOf(status)}>{labels[status] ?? status}</Badge>
}

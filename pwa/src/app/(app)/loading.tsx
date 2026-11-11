import { Screen } from '@/components/layout/screen'
import { CardsSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <Screen title="CRM-123">
      <CardsSkeleton />
    </Screen>
  )
}

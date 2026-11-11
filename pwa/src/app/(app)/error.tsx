'use client'
import { Screen } from '@/components/layout/screen'
import { ErrorNotice } from '@/components/page-state'

export default function ErrorPage() {
  return (
    <Screen title="CRM-123">
      <ErrorNotice />
    </Screen>
  )
}

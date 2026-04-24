import { Suspense } from 'react'
import History from '@/app/components/dashboard/History/history'

export default function Page() {
  return (
    <div>
      <Suspense fallback={<div className="p-6 text-gray-600">Loading history...</div>}>
        <History />
      </Suspense>
    </div>
  )
}
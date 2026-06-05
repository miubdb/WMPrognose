import { NextResponse } from 'next/server'
import { runAllTests } from '@/lib/__tests__/metrics.test'

export const dynamic = 'force-dynamic'

export async function GET() {
  const suites = runAllTests()
  const totalPassed = suites.reduce((s, t) => s + t.passed, 0)
  const totalFailed = suites.reduce((s, t) => s + t.failed, 0)

  return NextResponse.json({
    ok: totalFailed === 0,
    totalPassed,
    totalFailed,
    suites,
  })
}

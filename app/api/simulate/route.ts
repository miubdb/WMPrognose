import { NextRequest, NextResponse } from 'next/server'
import { simulateTournament } from '@/lib/modelAdapter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { simulations?: number }
    const simulations = Math.min(body.simulations ?? 1000, 10000)

    const result = simulateTournament(simulations)

    return NextResponse.json({
      simulations,
      results: result,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}

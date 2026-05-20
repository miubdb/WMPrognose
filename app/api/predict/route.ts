import { NextRequest, NextResponse } from 'next/server'
import { getMatchPrediction } from '@/lib/modelAdapter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { teamAId?: string; teamBId?: string; venueId?: string }

    if (!body.teamAId || !body.teamBId) {
      return NextResponse.json(
        { error: 'teamAId und teamBId sind erforderlich' },
        { status: 400 }
      )
    }

    const result = await getMatchPrediction({
      teamAId: body.teamAId,
      teamBId: body.teamBId,
      venueId: body.venueId ?? 'new_york',
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}

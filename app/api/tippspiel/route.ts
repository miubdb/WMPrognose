import { NextResponse } from 'next/server'
import { generateTipSuggestions } from '@/lib/modelAdapter'

export async function GET() {
  try {
    const tips = generateTipSuggestions()
    return NextResponse.json({ tips, count: tips.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { evaluateModel } from '@/lib/evaluateModel'

export async function GET() {
  const result = evaluateModel()
  return NextResponse.json(result)
}

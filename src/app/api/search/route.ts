import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/parser'
import { SemanticSearch } from '../../../lib/search'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Fetch all transactions from database
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' }
    })

    // Convert to ParsedTransaction format
    const parsedTransactions = transactions.map((tx: any) => ({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      description: tx.description,
      type: tx.type as 'income' | 'expense' | 'transfer',
      category: tx.category || undefined,
      account: tx.account || undefined,
      merchant: tx.merchant || undefined,
      isRecurring: tx.isRecurring
    }))

    // Perform semantic search
    const searchEngine = new SemanticSearch()
    const results = searchEngine.semanticSearch(parsedTransactions, query)

    return NextResponse.json(results)

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

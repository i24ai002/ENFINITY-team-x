import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/parser'
import { RunwayCalculator } from '../../../lib/runway'
import { AnomalyDetector } from '../../../lib/anomaly'
import { SemanticSearch } from '../../../lib/search'

export async function GET() {
  try {
    // Fetch all transactions from database
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' }
    })

    if (transactions.length === 0) {
      return NextResponse.json({ 
        runwayCalculation: null,
        summary: null,
        anomalies: { anomalies: [], summary: { totalAnomalies: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, totalAnomalousAmount: 0 } }
      })
    }

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

    // Calculate runway
    const calculator = new RunwayCalculator()
    const runwayCalculation = calculator.calculateRunway(parsedTransactions)
    const summary = calculator.getTransactionSummary(parsedTransactions)

    // Detect anomalies
    const anomalyDetector = new AnomalyDetector()
    const anomalies = anomalyDetector.detectAnomalies(parsedTransactions)

    return NextResponse.json({
      runwayCalculation,
      summary,
      anomalies
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

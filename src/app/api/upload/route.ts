import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/parser'
import { parseCSVData, parseJSONData, ParsedTransaction } from '../../../lib/parser'
import { Categorizer, RecurringDetector } from '../../../lib/categorizer'
import { Deduplicator } from '../../../lib/deduplicator'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    let transactions: ParsedTransaction[] = []

    // Parse based on file type
    if (file.name.endsWith('.csv')) {
      transactions = parseCSVData(text)
    } else if (file.name.endsWith('.json')) {
      transactions = parseJSONData(text)
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 })
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'No valid transactions found' }, { status: 400 })
    }

    // Process transactions
    const categorizer = new Categorizer()
    const recurringDetector = new RecurringDetector()
    const deduplicator = new Deduplicator()

    // Categorize transactions
    const categorizedTransactions = await categorizer.categorizeTransactions(transactions)

    // Detect recurring expenses
    const transactionsWithRecurring = recurringDetector.detectRecurringExpenses(categorizedTransactions)

    // Remove duplicates
    const { clean: cleanTransactions } = deduplicator.detectDuplicates(transactionsWithRecurring)

    // Save to database
    await prisma.transaction.deleteMany() // Clear existing data
    
    for (const tx of cleanTransactions) {
      await prisma.transaction.create({
        data: {
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          type: tx.type,
          category: tx.category,
          account: tx.account,
          isRecurring: tx.isRecurring || false,
          merchant: tx.merchant
        }
      })
    }

    // Save custom categories to database
    const customCategories = categorizer['categories'].filter((cat: any) => 
      !DEFAULT_CATEGORIES.some((defaultCat: any) => defaultCat.name === cat.name)
    )

    for (const cat of customCategories) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: { keywords: cat.keywords.join(',') },
        create: {
          name: cat.name,
          keywords: cat.keywords.join(',')
        }
      })
    }

    return NextResponse.json({ 
      message: 'Upload successful',
      transactionsProcessed: cleanTransactions.length,
      duplicatesRemoved: transactions.length - cleanTransactions.length
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Upload failed. Please check your file format and try again.' 
    }, { status: 500 })
  }
}

const DEFAULT_CATEGORIES = [
  { name: 'subscriptions', keywords: ['netflix', 'spotify', 'prime', 'disney+', 'hotstar'] },
  { name: 'housing', keywords: ['rent', 'mortgage', 'lease', 'property tax'] },
  { name: 'food', keywords: ['swiggy', 'zomato', 'uber eats', 'foodpanda', 'restaurant'] },
  { name: 'transport', keywords: ['uber', 'ola', 'lyft', 'taxi', 'metro', 'bus'] },
  { name: 'shopping', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa'] },
  { name: 'utilities', keywords: ['electricity', 'water', 'gas', 'internet', 'phone'] },
  { name: 'healthcare', keywords: ['hospital', 'doctor', 'medicine', 'pharmacy'] },
  { name: 'entertainment', keywords: ['movie', 'cinema', 'concert', 'game'] },
  { name: 'education', keywords: ['school', 'college', 'university', 'course'] },
  { name: 'banking', keywords: ['interest', 'fee', 'charge', 'penalty', 'atm'] }
]

import { PrismaClient } from '@prisma/client'
import Papa from 'papaparse'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export interface RawTransaction {
  date?: string
  amount?: string | number
  description?: string
  type?: string
  account?: string
  [key: string]: any
}

export interface ParsedTransaction {
  date: Date
  amount: number
  description: string
  type: 'income' | 'expense' | 'transfer'
  account?: string
  merchant?: string
  category?: string
  isRecurring?: boolean
}

export function parseAmount(amount: string | number | undefined): number {
  if (!amount) return 0
  
  if (typeof amount === 'number') return amount
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = amount.toString()
    .replace(/[₹$€£¥]/g, '')
    .replace(/,/g, '')
    .trim()
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date()
  
  // Handle various date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ]
  
  for (const format of formats) {
    if (format.test(dateStr)) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) return date
    }
  }
  
  // Try parsing as-is
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? new Date() : date
}

export function inferTransactionType(amount: number, description: string): 'income' | 'expense' | 'transfer' {
  const desc = description.toLowerCase()
  
  // Transfer indicators
  if (desc.includes('transfer') || desc.includes('moved') || desc.includes('sent to') || desc.includes('received from')) {
    return 'transfer'
  }
  
  // Income indicators
  if (amount > 0 || desc.includes('salary') || desc.includes('deposit') || desc.includes('payment received')) {
    return 'income'
  }
  
  return 'expense'
}

export function extractMerchant(description: string): string | undefined {
  const desc = description.toLowerCase()
  
  // Common merchant patterns
  const merchants = [
    'netflix', 'spotify', 'amazon', 'swiggy', 'zomato', 'uber', 'ola',
    'google', 'apple', 'microsoft', 'adobe', 'zoom', 'slack',
    'flipkart', 'myntra', 'ajio', 'nykaa', 'bigbasket', 'grofers'
  ]
  
  for (const merchant of merchants) {
    if (desc.includes(merchant)) {
      return merchant.charAt(0).toUpperCase() + merchant.slice(1)
    }
  }
  
  return undefined
}

export function parseCSVData(csvText: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = []
  
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: (parsed) => {
      parsed.data.forEach((row: any) => {
        const rawTx = row as RawTransaction
        
        // Try to find common column names
        const date = rawTx.date || rawTx.Date || rawTx.DATE || rawTx.transaction_date
        const amount = rawTx.amount || rawTx.Amount || rawTx.AMOUNT || rawTx.transaction_amount
        const description = rawTx.description || rawTx.Description || rawTx.DESCRIPTION || rawTx.particulars
        const type = rawTx.type || rawTx.Type || rawTx.TYPE || rawTx.transaction_type
        const account = rawTx.account || rawTx.Account || rawTx.ACCOUNT
        
        if (!date || !amount || !description) return
        
        const parsedAmount = parseAmount(amount)
        const parsedDate = parseDate(date)
        const parsedType = type ? type.toLowerCase() as 'income' | 'expense' | 'transfer' : inferTransactionType(parsedAmount, description)
        const merchant = extractMerchant(description)
        
        results.push({
          date: parsedDate,
          amount: parsedAmount,
          description: description.trim(),
          type: parsedType,
          account: account?.trim(),
          merchant
        })
      })
    }
  })
  
  return results
}

export function parseJSONData(jsonText: string): ParsedTransaction[] {
  try {
    const data = JSON.parse(jsonText)
    const results: ParsedTransaction[] = []
    
    const transactions = Array.isArray(data) ? data : data.transactions || data.data || []
    
    transactions.forEach((rawTx: any) => {
      const date = rawTx.date || rawTx.Date || rawTx.transaction_date
      const amount = rawTx.amount || rawTx.Amount || rawTx.transaction_amount
      const description = rawTx.description || rawTx.Description || rawTx.particulars
      const type = rawTx.type || rawTx.Type || rawTx.transaction_type
      const account = rawTx.account || rawTx.Account
      
      if (!date || !amount || !description) return
      
      const parsedAmount = parseAmount(amount)
      const parsedDate = parseDate(date)
      const parsedType = type ? type.toLowerCase() as 'income' | 'expense' | 'transfer' : inferTransactionType(parsedAmount, description)
      const merchant = extractMerchant(description)
      
      results.push({
        date: parsedDate,
        amount: parsedAmount,
        description: description.trim(),
        type: parsedType,
        account: account?.trim(),
        merchant
      })
    })
    
    return results
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return []
  }
}

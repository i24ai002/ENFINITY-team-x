import { ParsedTransaction } from './parser'
import { prisma } from './parser'

export interface CategoryRule {
  name: string
  keywords: string[]
  priority: number
}

export const DEFAULT_CATEGORIES: CategoryRule[] = [
  {
    name: 'subscriptions',
    keywords: ['netflix', 'spotify', 'prime', 'disney+', 'hotstar', 'youtube premium', 'adobe', 'microsoft', 'office 365', 'zoom', 'slack'],
    priority: 1
  },
  {
    name: 'housing',
    keywords: ['rent', 'mortgage', 'lease', 'property tax', 'home insurance', 'maintenance', 'repair'],
    priority: 2
  },
  {
    name: 'food',
    keywords: ['swiggy', 'zomato', 'uber eats', 'foodpanda', 'restaurant', 'cafe', 'grocery', 'bigbasket', 'grofers', 'dining'],
    priority: 3
  },
  {
    name: 'transport',
    keywords: ['uber', 'ola', 'lyft', 'taxi', 'metro', 'bus', 'train', 'flight', 'booking', 'cab', 'auto'],
    priority: 4
  },
  {
    name: 'shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'shopping', 'store', 'mall', 'purchase'],
    priority: 5
  },
  {
    name: 'utilities',
    keywords: ['electricity', 'water', 'gas', 'internet', 'broadband', 'phone', 'mobile', 'recharge', 'bill'],
    priority: 6
  },
  {
    name: 'healthcare',
    keywords: ['hospital', 'doctor', 'medicine', 'pharmacy', 'clinic', 'health', 'medical', 'insurance'],
    priority: 7
  },
  {
    name: 'entertainment',
    keywords: ['movie', 'cinema', 'theater', 'concert', 'game', 'playstation', 'xbox', 'netflix', 'spotify'],
    priority: 8
  },
  {
    name: 'education',
    keywords: ['school', 'college', 'university', 'course', 'tuition', 'books', 'education', 'learning'],
    priority: 9
  },
  {
    name: 'banking',
    keywords: ['interest', 'fee', 'charge', 'penalty', 'atm', 'bank', 'transfer', 'deposit'],
    priority: 10
  }
]

export class Categorizer {
  private categories: CategoryRule[] = []

  constructor() {
    this.categories = [...DEFAULT_CATEGORIES]
  }

  async loadCustomCategories(): Promise<void> {
    const customCategories = await prisma.category.findMany()
    
    customCategories.forEach(cat => {
      this.categories.push({
        name: cat.name,
        keywords: cat.keywords.split(',').map(k => k.trim()),
        priority: this.categories.length
      })
    })

    // Sort by priority (lower number = higher priority)
    this.categories.sort((a, b) => a.priority - b.priority)
  }

  categorizeTransaction(transaction: ParsedTransaction): string {
    const description = transaction.description.toLowerCase()
    const merchant = transaction.merchant?.toLowerCase() || ''

    // Skip transfers
    if (transaction.type === 'transfer') {
      return 'transfer'
    }

    // Check each category in priority order
    for (const category of this.categories) {
      for (const keyword of category.keywords) {
        if (description.includes(keyword.toLowerCase()) || merchant.includes(keyword.toLowerCase())) {
          return category.name
        }
      }
    }

    // Default categorization based on amount and type
    if (transaction.type === 'income') {
      return 'income'
    }

    return 'uncategorized'
  }

  async categorizeTransactions(transactions: ParsedTransaction[]): Promise<ParsedTransaction[]> {
    await this.loadCustomCategories()
    
    return transactions.map(tx => ({
      ...tx,
      category: this.categorizeTransaction(tx)
    }))
  }
}

export class RecurringDetector {
  detectRecurringExpenses(transactions: ParsedTransaction[]): ParsedTransaction[] {
    const monthlyExpenses = transactions.filter(tx => 
      tx.type === 'expense' && tx.amount < 0
    )

    const groupedByAmount = new Map<string, ParsedTransaction[]>()
    
    monthlyExpenses.forEach(tx => {
      const key = Math.abs(tx.amount).toFixed(2)
      if (!groupedByAmount.has(key)) {
        groupedByAmount.set(key, [])
      }
      groupedByAmount.get(key)!.push(tx)
    })

    const recurring: ParsedTransaction[] = []

    groupedByAmount.forEach((txs, amount) => {
      if (txs.length >= 2) {
        // Check if they occur in different months
        const months = new Set(txs.map(tx => `${tx.date.getFullYear()}-${tx.date.getMonth()}`))
        
        if (months.size >= 2) {
          // Check if descriptions are similar
          const descriptions = txs.map(tx => tx.description.toLowerCase())
          const similarity = this.calculateDescriptionSimilarity(descriptions)
          
          if (similarity > 0.6) {
            // Mark all as recurring
            txs.forEach(tx => {
              tx.isRecurring = true
            })
            recurring.push(...txs)
          }
        }
      }
    })

    return recurring
  }

  private calculateDescriptionSimilarity(descriptions: string[]): number {
    if (descriptions.length < 2) return 0

    let totalSimilarity = 0
    let comparisons = 0

    for (let i = 0; i < descriptions.length; i++) {
      for (let j = i + 1; j < descriptions.length; j++) {
        totalSimilarity += this.stringSimilarity(descriptions[i], descriptions[j])
        comparisons++
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}

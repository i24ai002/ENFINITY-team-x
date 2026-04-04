import { ParsedTransaction } from './parser'

export interface SearchQuery {
  text: string
  category?: string
  dateRange?: {
    start: Date
    end: Date
  }
  amountRange?: {
    min: number
    max: number
  }
  type?: 'income' | 'expense' | 'transfer'
  merchant?: string
}

export interface SearchResult {
  query: SearchQuery
  transactions: ParsedTransaction[]
  summary: {
    total: number
    totalAmount: number
    count: number
    averageAmount: number
  }
}

export class SemanticSearch {
  private categories = [
    'food', 'housing', 'transport', 'shopping', 'utilities', 
    'healthcare', 'entertainment', 'education', 'subscriptions',
    'banking', 'income', 'uncategorized'
  ]

  private merchants = [
    'netflix', 'spotify', 'amazon', 'swiggy', 'zomato', 'uber', 
    'ola', 'google', 'apple', 'microsoft', 'flipkart', 'myntra'
  ]

  private timePatterns = {
    'today': () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'yesterday': () => {
      const start = new Date()
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'this week': () => {
      const start = new Date()
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'last week': () => {
      const start = new Date()
      start.setDate(start.getDate() - start.getDay() - 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'this month': () => {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'last month': () => {
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'this year': () => {
      const start = new Date()
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setMonth(11)
      end.setDate(31)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'last year': () => {
      const start = new Date()
      start.setFullYear(start.getFullYear() - 1)
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setFullYear(end.getFullYear() - 1)
      end.setMonth(11)
      end.setDate(31)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    'last 30 days': () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return { start, end }
    },
    'last 90 days': () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 90)
      return { start, end }
    },
    'last 6 months': () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 6)
      return { start, end }
    }
  }

  parseQuery(queryText: string): SearchQuery {
    const text = queryText.toLowerCase().trim()
    
    const query: SearchQuery = {
      text: queryText
    }

    // Extract time patterns
    for (const [pattern, timeRange] of Object.entries(this.timePatterns)) {
      if (text.includes(pattern)) {
        query.dateRange = timeRange()
        break
      }
    }

    // Extract category
    for (const category of this.categories) {
      if (text.includes(category)) {
        query.category = category
        break
      }
    }

    // Extract merchant
    for (const merchant of this.merchants) {
      if (text.includes(merchant)) {
        query.merchant = merchant
        break
      }
    }

    // Extract transaction type
    if (text.includes('income') || text.includes('earned') || text.includes('salary') || text.includes('deposit')) {
      query.type = 'income'
    } else if (text.includes('expense') || text.includes('spent') || text.includes('paid') || text.includes('bought')) {
      query.type = 'expense'
    } else if (text.includes('transfer') || text.includes('moved') || text.includes('sent')) {
      query.type = 'transfer'
    }

    // Extract amount patterns
    const amountMatches = text.match(/(?:over|above|more than|greater than)\s+(\d+)/i)
    if (amountMatches) {
      query.amountRange = { min: parseFloat(amountMatches[1]), max: Infinity }
    }

    const amountMatches2 = text.match(/(?:under|below|less than)\s+(\d+)/i)
    if (amountMatches2) {
      query.amountRange = { min: 0, max: parseFloat(amountMatches2[1]) }
    }

    const amountMatches3 = text.match(/(?:between|from)\s+(\d+)\s+(?:and|to)\s+(\d+)/i)
    if (amountMatches3) {
      query.amountRange = { 
        min: parseFloat(amountMatches3[1]), 
        max: parseFloat(amountMatches3[2]) 
      }
    }

    return query
  }

  search(transactions: ParsedTransaction[], query: SearchQuery): SearchResult {
    let filteredTransactions = [...transactions]

    // Filter by category
    if (query.category) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.category === query.category
      )
    }

    // Filter by date range
    if (query.dateRange) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.date >= query.dateRange!.start && tx.date <= query.dateRange!.end
      )
    }

    // Filter by amount range
    if (query.amountRange) {
      filteredTransactions = filteredTransactions.filter(tx => {
        const amount = Math.abs(tx.amount)
        return amount >= query.amountRange!.min && amount <= query.amountRange!.max
      })
    }

    // Filter by type
    if (query.type) {
      filteredTransactions = filteredTransactions.filter(tx => tx.type === query.type)
    }

    // Filter by merchant
    if (query.merchant) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.merchant?.toLowerCase() === query.merchant
      )
    }

    // Text search in description
    if (query.text && !query.category && !query.merchant) {
      const searchTerms = query.text.toLowerCase().split(' ')
      filteredTransactions = filteredTransactions.filter(tx => {
        const description = tx.description.toLowerCase()
        return searchTerms.some(term => description.includes(term))
      })
    }

    // Calculate summary
    const totalAmount = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    const averageAmount = filteredTransactions.length > 0 ? totalAmount / filteredTransactions.length : 0

    return {
      query,
      transactions: filteredTransactions,
      summary: {
        total: totalAmount,
        totalAmount: Math.abs(totalAmount),
        count: filteredTransactions.length,
        averageAmount: Math.abs(averageAmount)
      }
    }
  }

  semanticSearch(transactions: ParsedTransaction[], queryText: string): SearchResult {
    const query = this.parseQuery(queryText)
    return this.search(transactions, query)
  }

  getSuggestions(transactions: ParsedTransaction[], partial: string): string[] {
    const suggestions: string[] = []
    const partialLower = partial.toLowerCase()

    // Category suggestions
    this.categories.forEach(category => {
      if (category.includes(partialLower)) {
        suggestions.push(`Show ${category} transactions`)
      }
    })

    // Merchant suggestions
    this.merchants.forEach(merchant => {
      if (merchant.includes(partialLower)) {
        suggestions.push(`Show ${merchant} transactions`)
      }
    })

    // Time-based suggestions
    Object.keys(this.timePatterns).forEach(pattern => {
      if (pattern.includes(partialLower)) {
        suggestions.push(`Transactions from ${pattern}`)
      }
    })

    // Amount-based suggestions
    if (partialLower.includes('amount')) {
      suggestions.push('Expenses over 1000')
      suggestions.push('Expenses under 500')
      suggestions.push('Transactions between 500 and 1000')
    }

    return suggestions.slice(0, 8) // Limit to 8 suggestions
  }

  explainQuery(query: SearchQuery): string {
    const parts: string[] = []

    if (query.type) {
      parts.push(query.type)
    }

    if (query.category) {
      parts.push(`in ${query.category}`)
    }

    if (query.merchant) {
      parts.push(`from ${query.merchant}`)
    }

    if (query.dateRange) {
      const start = query.dateRange.start.toLocaleDateString()
      const end = query.dateRange.end.toLocaleDateString()
      parts.push(`from ${start} to ${end}`)
    }

    if (query.amountRange) {
      if (query.amountRange.max === Infinity) {
        parts.push(`over ${query.amountRange.min}`)
      } else if (query.amountRange.min === 0) {
        parts.push(`under ${query.amountRange.max}`)
      } else {
        parts.push(`between ${query.amountRange.min} and ${query.amountRange.max}`)
      }
    }

    return parts.length > 0 ? parts.join(' ') : 'all transactions'
  }
}

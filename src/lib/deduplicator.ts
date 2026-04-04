import { ParsedTransaction } from './parser'

export interface DuplicateGroup {
  transactions: ParsedTransaction[]
  reason: string
  confidence: number
}

export class Deduplicator {
  detectDuplicates(transactions: ParsedTransaction[]): {
    clean: ParsedTransaction[]
    duplicates: DuplicateGroup[]
  } {
    const duplicates: DuplicateGroup[] = []
    const processed = new Set<string>()
    const clean: ParsedTransaction[] = []

    // Detect internal transfers (same amount, same date, opposite signs)
    const transferGroups = this.detectInternalTransfers(transactions)
    duplicates.push(...transferGroups)

    // Detect exact duplicates
    const exactGroups = this.detectExactDuplicates(transactions)
    duplicates.push(...exactGroups)

    // Detect near duplicates (similar amounts and dates)
    const nearGroups = this.detectNearDuplicates(transactions)
    duplicates.push(...nearGroups)

    // Mark all transactions in duplicate groups
    const duplicateIds = new Set<string>()
    duplicates.forEach(group => {
      group.transactions.forEach(tx => {
        duplicateIds.add(this.getTransactionKey(tx))
      })
    })

    // Return clean transactions
    transactions.forEach(tx => {
      const key = this.getTransactionKey(tx)
      if (!duplicateIds.has(key)) {
        clean.push(tx)
      }
    })

    return { clean, duplicates }
  }

  private detectInternalTransfers(transactions: ParsedTransaction[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = []
    const processed = new Set<string>()

    transactions.forEach((tx1, i) => {
      if (processed.has(this.getTransactionKey(tx1))) return

      const matches = transactions.filter((tx2, j) => {
        if (i === j || processed.has(this.getTransactionKey(tx2))) return false
        
        // Check for internal transfer pattern:
        // - Same absolute amount
        // - Opposite signs
        // - Same or very close dates
        // - Different accounts (if available)
        
        const amountMatch = Math.abs(Math.abs(tx1.amount) - Math.abs(tx2.amount)) < 0.01
        const signMatch = (tx1.amount > 0 && tx2.amount < 0) || (tx1.amount < 0 && tx2.amount > 0)
        const dateMatch = Math.abs(tx1.date.getTime() - tx2.date.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
        const accountMatch = !tx1.account || !tx2.account || tx1.account !== tx2.account
        
        return amountMatch && signMatch && dateMatch && accountMatch
      })

      if (matches.length > 0) {
        const group = [tx1, ...matches]
        groups.push({
          transactions: group,
          reason: 'Internal transfer detected',
          confidence: 0.9
        })

        group.forEach(tx => processed.add(this.getTransactionKey(tx)))
      }
    })

    return groups
  }

  private detectExactDuplicates(transactions: ParsedTransaction[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = []
    const seen = new Map<string, ParsedTransaction[]>()

    transactions.forEach(tx => {
      const key = this.getExactKey(tx)
      if (!seen.has(key)) {
        seen.set(key, [])
      }
      seen.get(key)!.push(tx)
    })

    seen.forEach((txs, key) => {
      if (txs.length > 1) {
        groups.push({
          transactions: txs,
          reason: 'Exact duplicate transactions',
          confidence: 1.0
        })
      }
    })

    return groups
  }

  private detectNearDuplicates(transactions: ParsedTransaction[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = []
    const processed = new Set<string>()

    transactions.forEach((tx1, i) => {
      if (processed.has(this.getTransactionKey(tx1))) return

      const matches = transactions.filter((tx2, j) => {
        if (i === j || processed.has(this.getTransactionKey(tx2))) return false
        
        // Check for near duplicate pattern:
        // - Similar amounts (within 1%)
        // - Same date
        // - Similar descriptions (80% similarity)
        
        const amountMatch = Math.abs(tx1.amount - tx2.amount) / Math.max(Math.abs(tx1.amount), Math.abs(tx2.amount)) < 0.01
        const dateMatch = tx1.date.toDateString() === tx2.date.toDateString()
        const descMatch = this.stringSimilarity(tx1.description.toLowerCase(), tx2.description.toLowerCase()) > 0.8
        
        return amountMatch && dateMatch && descMatch
      })

      if (matches.length > 0) {
        const group = [tx1, ...matches]
        groups.push({
          transactions: group,
          reason: 'Near duplicate transactions',
          confidence: 0.7
        })

        group.forEach(tx => processed.add(this.getTransactionKey(tx)))
      }
    })

    return groups
  }

  private getTransactionKey(tx: ParsedTransaction): string {
    return `${tx.date.getTime()}-${tx.amount}-${tx.description}-${tx.account || ''}`
  }

  private getExactKey(tx: ParsedTransaction): string {
    return `${tx.date.toISOString()}-${tx.amount}-${tx.description}-${tx.account || ''}-${tx.type}`
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

  getDuplicateSummary(duplicates: DuplicateGroup[]): {
    totalDuplicates: number
    totalDuplicateAmount: number
    duplicateGroups: number
    reasons: Array<{ reason: string; count: number }>
  } {
    const totalDuplicates = duplicates.reduce((sum, group) => sum + group.transactions.length, 0)
    const totalDuplicateAmount = duplicates.reduce((sum, group) => 
      sum + group.transactions.reduce((groupSum, tx) => groupSum + Math.abs(tx.amount), 0), 0
    )
    
    const reasonCounts = new Map<string, number>()
    duplicates.forEach(group => {
      reasonCounts.set(group.reason, (reasonCounts.get(group.reason) || 0) + 1)
    })

    const reasons = Array.from(reasonCounts.entries()).map(([reason, count]) => ({
      reason,
      count
    }))

    return {
      totalDuplicates,
      totalDuplicateAmount,
      duplicateGroups: duplicates.length,
      reasons
    }
  }
}

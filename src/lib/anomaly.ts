import { ParsedTransaction } from './parser'

export interface Anomaly {
  transaction: ParsedTransaction
  type: 'spike' | 'drop' | 'new_category' | 'unusual_amount'
  description: string
  percentage: number
  severity: 'low' | 'medium' | 'high'
  historicalAverage: number
  currentValue: number
}

export interface AnomalyReport {
  anomalies: Anomaly[]
  summary: {
    totalAnomalies: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
    totalAnomalousAmount: number
  }
}

export class AnomalyDetector {
  detectAnomalies(transactions: ParsedTransaction[], threshold: number = 15): AnomalyReport {
    const anomalies: Anomaly[] = []

    // Detect spending spikes
    const spikes = this.detectSpendingSpikes(transactions, threshold)
    anomalies.push(...spikes)

    // Detect unusual drops (might indicate missing data)
    const drops = this.detectSpendingDrops(transactions, threshold)
    anomalies.push(...drops)

    // Detect new categories
    const newCategories = this.detectNewCategories(transactions)
    anomalies.push(...newCategories)

    // Detect unusual amounts
    const unusualAmounts = this.detectUnusualAmounts(transactions)
    anomalies.push(...unusualAmounts)

    // Calculate summary
    const summary = this.calculateAnomalySummary(anomalies)

    return { anomalies, summary }
  }

  private detectSpendingSpikes(transactions: ParsedTransaction[], threshold: number): Anomaly[] {
    const anomalies: Anomaly[] = []
    const categoryAverages = this.calculateCategoryAverages(transactions)

    transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        const average = categoryAverages.get(category)
        
        if (average && average.count >= 3) { // Need at least 3 transactions for baseline
          const currentAmount = Math.abs(tx.amount)
          const percentage = ((currentAmount - average.amount) / average.amount) * 100
          
          if (percentage > threshold) {
            anomalies.push({
              transaction: tx,
              type: 'spike',
              description: `${category} spending ↑${percentage.toFixed(1)}%`,
              percentage,
              severity: this.getSeverity(percentage),
              historicalAverage: average.amount,
              currentValue: currentAmount
            })
          }
        }
      })

    return anomalies
  }

  private detectSpendingDrops(transactions: ParsedTransaction[], threshold: number): Anomaly[] {
    const anomalies: Anomaly[] = []
    const categoryAverages = this.calculateCategoryAverages(transactions)

    transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        const average = categoryAverages.get(category)
        
        if (average && average.count >= 3) {
          const currentAmount = Math.abs(tx.amount)
          const percentage = ((average.amount - currentAmount) / average.amount) * 100
          
          if (percentage > threshold && currentAmount < average.amount * 0.5) {
            anomalies.push({
              transaction: tx,
              type: 'drop',
              description: `${category} spending ↓${percentage.toFixed(1)}%`,
              percentage: -percentage,
              severity: 'low', // Drops are less critical
              historicalAverage: average.amount,
              currentValue: currentAmount
            })
          }
        }
      })

    return anomalies
  }

  private detectNewCategories(transactions: ParsedTransaction[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const categories = new Set<string>()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // First pass: identify categories from last 6 months
    transactions
      .filter(tx => tx.date >= sixMonthsAgo)
      .forEach(tx => {
        if (tx.category && tx.category !== 'uncategorized') {
          categories.add(tx.category)
        }
      })

    // Second pass: find transactions with new categories in recent period
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    transactions
      .filter(tx => tx.date >= oneMonthAgo && (tx.type === 'expense' || tx.amount < 0))
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        
        if (category !== 'uncategorized' && !categories.has(category)) {
          anomalies.push({
            transaction: tx,
            type: 'new_category',
            description: `New spending category: ${category}`,
            percentage: 0,
            severity: 'medium',
            historicalAverage: 0,
            currentValue: Math.abs(tx.amount)
          })
        }
      })

    return anomalies
  }

  private detectUnusualAmounts(transactions: ParsedTransaction[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    
    // Group by category and find outliers using standard deviation
    const categoryStats = this.calculateCategoryStats(transactions)

    transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        const stats = categoryStats.get(category)
        
        if (stats && stats.count >= 5) { // Need enough data for meaningful stats
          const currentAmount = Math.abs(tx.amount)
          const zScore = Math.abs((currentAmount - stats.mean) / stats.stdDev)
          
          // Flag transactions more than 2 standard deviations from mean
          if (zScore > 2) {
            const percentage = ((currentAmount - stats.mean) / stats.mean) * 100
            anomalies.push({
              transaction: tx,
              type: 'unusual_amount',
              description: `Unusual ${category} amount`,
              percentage,
              severity: zScore > 3 ? 'high' : 'medium',
              historicalAverage: stats.mean,
              currentValue: currentAmount
            })
          }
        }
      })

    return anomalies
  }

  private calculateCategoryAverages(transactions: ParsedTransaction[]): Map<string, { amount: number; count: number }> {
    const categoryData = new Map<string, { total: number; count: number }>()

    transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        const amount = Math.abs(tx.amount)
        
        if (!categoryData.has(category)) {
          categoryData.set(category, { total: 0, count: 0 })
        }
        
        const data = categoryData.get(category)!
        data.total += amount
        data.count += 1
      })

    const averages = new Map<string, { amount: number; count: number }>()
    categoryData.forEach((data, category) => {
      averages.set(category, {
        amount: data.total / data.count,
        count: data.count
      })
    })

    return averages
  }

  private calculateCategoryStats(transactions: ParsedTransaction[]): Map<string, { mean: number; stdDev: number; count: number }> {
    const categoryAmounts = new Map<string, number[]>()

    transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        const amount = Math.abs(tx.amount)
        
        if (!categoryAmounts.has(category)) {
          categoryAmounts.set(category, [])
        }
        
        categoryAmounts.get(category)!.push(amount)
      })

    const stats = new Map<string, { mean: number; stdDev: number; count: number }>()
    
    categoryAmounts.forEach((amounts, category) => {
      if (amounts.length >= 5) {
        const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length
        const stdDev = Math.sqrt(variance)
        
        stats.set(category, { mean, stdDev, count: amounts.length })
      }
    })

    return stats
  }

  private getSeverity(percentage: number): 'low' | 'medium' | 'high' {
    if (percentage > 50) return 'high'
    if (percentage > 25) return 'medium'
    return 'low'
  }

  private calculateAnomalySummary(anomalies: Anomaly[]): AnomalyReport['summary'] {
    const highSeverity = anomalies.filter(a => a.severity === 'high').length
    const mediumSeverity = anomalies.filter(a => a.severity === 'medium').length
    const lowSeverity = anomalies.filter(a => a.severity === 'low').length
    const totalAnomalousAmount = anomalies.reduce((sum, a) => sum + a.currentValue, 0)

    return {
      totalAnomalies: anomalies.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      totalAnomalousAmount
    }
  }

  getTopAnomalies(anomalies: Anomaly[], limit: number = 5): Anomaly[] {
    return anomalies
      .sort((a, b) => {
        // Sort by severity first, then by percentage
        const severityOrder = { high: 3, medium: 2, low: 1 }
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
        
        if (severityDiff !== 0) return severityDiff
        
        return Math.abs(b.percentage) - Math.abs(a.percentage)
      })
      .slice(0, limit)
  }
}

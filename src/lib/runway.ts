import { ParsedTransaction } from './parser'

export interface RunwayCalculation {
  balance: number
  totalIncome: number
  totalExpenses: number
  recurringExpenses: number
  usableMoney: number
  safeDailySpend: number
  runwayDays: number
  status: 'healthy' | 'warning' | 'critical'
}

export interface TransactionSummary {
  totalTransactions: number
  incomeTransactions: number
  expenseTransactions: number
  transferTransactions: number
  averageIncome: number
  averageExpense: number
  biggestExpense: ParsedTransaction | null
  biggestIncome: ParsedTransaction | null
}

export class RunwayCalculator {
  calculateRunway(transactions: ParsedTransaction[]): RunwayCalculation {
    // Filter out transfers from calculations
    const nonTransferTransactions = transactions.filter(tx => tx.type !== 'transfer')
    
    const income = nonTransferTransactions
      .filter(tx => tx.type === 'income' || tx.amount > 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    
    const expenses = nonTransferTransactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    
    const recurring = transactions
      .filter(tx => tx.isRecurring && tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    
    const balance = income - expenses
    const usableMoney = balance - recurring
    const safeDailySpend = usableMoney > 0 ? usableMoney / 30 : 0
    const runwayDays = safeDailySpend > 0 ? Math.floor(usableMoney / safeDailySpend) : 0
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    if (safeDailySpend < 100) {
      status = 'critical'
    } else if (safeDailySpend < 500) {
      status = 'warning'
    }
    
    return {
      balance,
      totalIncome: income,
      totalExpenses: expenses,
      recurringExpenses: recurring,
      usableMoney,
      safeDailySpend,
      runwayDays,
      status
    }
  }

  getTransactionSummary(transactions: ParsedTransaction[]): TransactionSummary {
    const incomeTransactions = transactions.filter(tx => tx.type === 'income' || tx.amount > 0)
    const expenseTransactions = transactions.filter(tx => tx.type === 'expense' || tx.amount < 0)
    const transferTransactions = transactions.filter(tx => tx.type === 'transfer')
    
    const biggestExpense = expenseTransactions
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0] || null
    
    const biggestIncome = incomeTransactions
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0] || null
    
    const averageIncome = incomeTransactions.length > 0 
      ? incomeTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / incomeTransactions.length 
      : 0
    
    const averageExpense = expenseTransactions.length > 0 
      ? expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / expenseTransactions.length 
      : 0
    
    return {
      totalTransactions: transactions.length,
      incomeTransactions: incomeTransactions.length,
      expenseTransactions: expenseTransactions.length,
      transferTransactions: transferTransactions.length,
      averageIncome,
      averageExpense,
      biggestExpense,
      biggestIncome
    }
  }

  adjustForInflation(calculation: RunwayCalculation, inflationRate: number): RunwayCalculation {
    const adjustedDailySpend = calculation.safeDailySpend / (1 + inflationRate / 100)
    const adjustedUsableMoney = adjustedDailySpend * 30
    const adjustedRunwayDays = adjustedDailySpend > 0 ? Math.floor(adjustedUsableMoney / adjustedDailySpend) : 0
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    
    if (adjustedDailySpend < 100) {
      status = 'critical'
    } else if (adjustedDailySpend < 500) {
      status = 'warning'
    }
    
    return {
      ...calculation,
      usableMoney: adjustedUsableMoney,
      safeDailySpend: adjustedDailySpend,
      runwayDays: adjustedRunwayDays,
      status
    }
  }

  getMonthlyTrends(transactions: ParsedTransaction[]): Array<{
    month: string
    income: number
    expenses: number
    net: number
  }> {
    const monthlyData = new Map<string, { income: number; expenses: number }>()
    
    transactions
      .filter(tx => tx.type !== 'transfer')
      .forEach(tx => {
        const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { income: 0, expenses: 0 })
        }
        
        const data = monthlyData.get(monthKey)!
        
        if (tx.type === 'income' || tx.amount > 0) {
          data.income += Math.abs(tx.amount)
        } else {
          data.expenses += Math.abs(tx.amount)
        }
      })
    
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  getCategoryBreakdown(transactions: ParsedTransaction[]): Array<{
    category: string
    amount: number
    percentage: number
    count: number
  }> {
    const categoryData = new Map<string, { amount: number; count: number }>()
    const totalExpenses = transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    
    transactions
      .filter(tx => tx.type === 'expense' || tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || 'uncategorized'
        
        if (!categoryData.has(category)) {
          categoryData.set(category, { amount: 0, count: 0 })
        }
        
        const data = categoryData.get(category)!
        data.amount += Math.abs(tx.amount)
        data.count += 1
      })
    
    return Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
  }
}

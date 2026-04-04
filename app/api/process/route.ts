import { NextRequest, NextResponse } from 'next/server';

interface Transaction {
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  category: string;
  isRecurring: boolean;
  isInternalTransfer?: boolean;
}

interface ProcessedData {
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  recurringExpenses: number;
  safeDailySpend: number;
  biggestExpense: Transaction | null;
  anomalies: string[];
  categoryBreakdown: { [key: string]: number };
  daysRemaining: number;
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes("swiggy") || desc.includes("zomato") || desc.includes("restaurant") || desc.includes("food") || desc.includes("cafe")) {
    return "food";
  }
  if (desc.includes("uber") || desc.includes("ola") || desc.includes("fuel") || desc.includes("petrol") || desc.includes("transport")) {
    return "transport";
  }
  if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("prime") || desc.includes("subscription")) {
    return "subscriptions";
  }
  if (desc.includes("rent") || desc.includes("mortgage") || desc.includes("housing")) {
    return "housing";
  }
  if (desc.includes("amazon") || desc.includes("flipkart") || desc.includes("shopping") || desc.includes("store")) {
    return "shopping";
  }
  if (desc.includes("salary") || desc.includes("income") || desc.includes("deposit")) {
    return "salary";
  }
  if (desc.includes("electric") || desc.includes("water") || desc.includes("bill") || desc.includes("utility")) {
    return "utilities";
  }
  
  return "other";
}

function detectRecurring(transactions: Transaction[]): Transaction[] {
  const descriptionMap = new Map<string, number>();
  
  transactions.forEach(tx => {
    const key = tx.description.toLowerCase();
    descriptionMap.set(key, (descriptionMap.get(key) || 0) + 1);
  });
  
  return transactions.map(tx => ({
    ...tx,
    isRecurring: (descriptionMap.get(tx.description.toLowerCase()) || 0) >= 2
  }));
}

function detectInternalTransfers(transactions: Transaction[]): Transaction[] {
  const markedTransactions = [...transactions];
  
  for (let i = 0; i < markedTransactions.length; i++) {
    for (let j = i + 1; j < markedTransactions.length; j++) {
      const tx1 = markedTransactions[i];
      const tx2 = markedTransactions[j];
      
      if (tx1.isInternalTransfer || tx2.isInternalTransfer) continue;
      
      const amountDiff = Math.abs(tx1.amount - tx2.amount);
      const amountThreshold = Math.max(tx1.amount, tx2.amount) * 0.05;
      
      const date1 = new Date(tx1.date);
      const date2 = new Date(tx2.date);
      const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      
      if (amountDiff < amountThreshold && daysDiff <= 2 && tx1.type !== tx2.type) {
        markedTransactions[i].isInternalTransfer = true;
        markedTransactions[j].isInternalTransfer = true;
      }
    }
  }
  
  return markedTransactions;
}

function detectAnomalies(transactions: Transaction[]): string[] {
  const categoryAverages = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  
  transactions.forEach(tx => {
    if (tx.type === "expense" && !tx.isInternalTransfer) {
      const current = categoryAverages.get(tx.category) || 0;
      const count = categoryCounts.get(tx.category) || 0;
      categoryAverages.set(tx.category, current + tx.amount);
      categoryCounts.set(tx.category, count + 1);
    }
  });
  
  categoryAverages.forEach((total, category) => {
    const count = categoryCounts.get(category) || 1;
    categoryAverages.set(category, total / count);
  });
  
  return transactions
    .filter(tx => tx.type === "expense" && !tx.isInternalTransfer)
    .filter(tx => {
      const avg = categoryAverages.get(tx.category) || 0;
      return tx.amount > avg * 1.5;
    })
    .map(tx => `${tx.description}: ₹${tx.amount.toFixed(0)} (${tx.category})`);
}

function calculateCategoryBreakdown(transactions: Transaction[]): { [key: string]: number } {
  const breakdown: { [key: string]: number } = {};
  
  transactions
    .filter(tx => tx.type === "expense" && !tx.isInternalTransfer)
    .forEach(tx => {
      breakdown[tx.category] = (breakdown[tx.category] || 0) + tx.amount;
    });
  
  return breakdown;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 });
    }

    let processedTransactions: Transaction[] = transactions.map((tx: any) => {
      if (!tx.date || !tx.amount || !tx.description) {
        return null;
      }

      return {
        date: tx.date,
        amount: Number(tx.amount),
        description: tx.description,
        type: tx.type,
        category: tx.category || categorizeTransaction(tx.description),
        isRecurring: false,
      };
    }).filter(Boolean) as Transaction[];

    if (processedTransactions.length > 300) {
      processedTransactions = processedTransactions.slice(0, 300);
    }

    processedTransactions = detectRecurring(processedTransactions);
    processedTransactions = detectInternalTransfers(processedTransactions);

    const income = processedTransactions.filter((t: Transaction) => t.type === "income" && !t.isInternalTransfer);
    const expense = processedTransactions.filter((t: Transaction) => t.type === "expense" && !t.isInternalTransfer);

    const totalIncome = income.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const totalExpenses = expense.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;

    const recurringExpenses = expense
      .filter((t: Transaction) => t.isRecurring)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const safeDailySpend = Math.max(0, (balance - recurringExpenses) / 30);
    const daysRemaining = totalExpenses > 0 ? Math.round(balance / (totalExpenses / 30)) : 0;

    const biggestExpense = expense.length > 0
      ? expense.reduce((max: Transaction, t: Transaction) => (t.amount > max.amount ? t : max))
      : null;

    const anomalies = detectAnomalies(processedTransactions);
    const categoryBreakdown = calculateCategoryBreakdown(processedTransactions);

    const result: ProcessedData = {
      transactions: processedTransactions.slice(0, 50),
      totalIncome,
      totalExpenses,
      balance,
      recurringExpenses,
      safeDailySpend,
      biggestExpense,
      anomalies,
      categoryBreakdown,
      daysRemaining,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({ error: 'Failed to process transactions' }, { status: 500 });
  }
}

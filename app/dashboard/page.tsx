"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function DashboardPage() {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [inflationAdjusted, setInflationAdjusted] = useState(false);
  const [reduceExpenses, setReduceExpenses] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem("financialData");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setData(parsedData);
      } catch (error) {
        console.error("Error parsing data:", error);
        router.push("/upload");
      }
    } else {
      router.push("/upload");
    }
    setLoading(false);
    setIsVisible(true);
  }, [router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!data || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = data.transactions.filter(tx => 
      tx.description.toLowerCase().includes(query.toLowerCase()) ||
      tx.category.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(filtered.slice(0, 5));
  };

  const getStatus = () => {
    if (!data) return { status: "LOADING", color: "text-gray-400", message: "" };
    
    if (data.totalExpenses > data.totalIncome) {
      return { status: "CRITICAL", color: "text-red-400", message: "You are overspending" };
    } else if (data.safeDailySpend < 500) {
      return { status: "WARNING", color: "text-yellow-400", message: "Low daily limit" };
    } else {
      return { status: "HEALTHY", color: "text-green-400", message: "Finances on track" };
    }
  };

  const getAISummary = () => {
    if (!data) return { summary: "", suggestion: "" };
    
    const monthlyDiff = data.totalIncome - data.totalExpenses;
    const topCategory = Object.entries(data.categoryBreakdown)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (monthlyDiff < 0) {
      return {
        summary: `You are overspending by ${formatCurrency(Math.abs(monthlyDiff))}`,
        suggestion: topCategory ? `Reduce ${topCategory[0]} to save ${formatCurrency(topCategory[1] * 0.2)}` : ""
      };
    } else {
      return {
        summary: `You are saving ${formatCurrency(monthlyDiff)} per month`,
        suggestion: topCategory ? `Reduce ${topCategory[0]} to save extra ${formatCurrency(topCategory[1] * 0.1)}` : ""
      };
    }
  };

  const getBiggestLeak = () => {
    if (!data || !data.categoryBreakdown) return null;
    
    const topCategory = Object.entries(data.categoryBreakdown)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      category: topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1),
      amount: topCategory[1]
    };
  };

  const getTopCategories = () => {
    if (!data || !data.categoryBreakdown) return [];
    
    return Object.entries(data.categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name, amount]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        amount: formatCurrency(amount)
      }));
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!data) return null;

  const status = getStatus();
  const aiSummary = getAISummary();
  const biggestLeak = getBiggestLeak();
  const topCategories = getTopCategories();
  const baseSafeDailySpend = inflationAdjusted ? data.safeDailySpend * 0.95 : data.safeDailySpend;
  const currentSafeDailySpend = reduceExpenses ? baseSafeDailySpend * 1.1 : baseSafeDailySpend;
  const runwayText = data.daysRemaining < 0 ? "No runway" : `${data.daysRemaining} days`;

  return (
    <main className={`min-h-screen bg-black text-white transition-all duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className={`max-w-6xl mx-auto px-8 py-20 transition-all duration-1000 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-4'
      }`}>

        {/* 1️⃣ AI SUMMARY */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gray-900 px-6 py-3 rounded-lg border border-gray-800">
            <p className="text-lg font-semibold text-white mb-2">
              {aiSummary.summary}
            </p>
            {aiSummary.suggestion && (
              <p className="text-sm text-gray-400">
                {aiSummary.suggestion}
              </p>
            )}
          </div>
        </div>

        {/* STATUS SECTION */}
        <div className="text-center mb-16">
          <p className="text-gray-500 text-sm mb-2">STATUS</p>
          <p className={`text-2xl font-bold mb-2 ${status.color}`}>
            STATUS: {status.status}
          </p>
          <p className={`text-lg ${status.color}`}>
            {status.message}
          </p>
        </div>

        {/* MAIN VALUE - SAFE DAILY SPEND */}
        <div className="text-center mb-20">
          <h1 className="text-8xl md:text-9xl font-black mb-6">
            {formatCurrency(currentSafeDailySpend)}
          </h1>
          <p className="text-gray-400 text-xl">
            Safe to spend per day
          </p>
          {reduceExpenses && (
            <p className="text-green-400 text-sm mt-2">
              (+10% with reduced expenses)
            </p>
          )}
        </div>

        {/* BIGGEST LEAK */}
        {biggestLeak && (
          <div className="text-center mb-16">
            <p className="text-gray-500 text-sm mb-2">BIGGEST EXPENSE</p>
            <p className="text-xl text-red-400">
              {biggestLeak.category}: {formatCurrency(biggestLeak.amount)}
            </p>
          </div>
        )}

        {/* WHAT IF SIMULATION */}
        <div className="text-center mb-20">
          <button
            onClick={() => setReduceExpenses(!reduceExpenses)}
            className={`px-6 py-3 rounded-lg transition-colors duration-300 ${
              reduceExpenses 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {reduceExpenses ? 'Remove 10% reduction' : 'Reduce expenses by 10%'}
          </button>
        </div>

        {/* KEY METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">INCOME</p>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(data.totalIncome)}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">EXPENSES</p>
            <p className="text-3xl font-bold text-red-400">
              {formatCurrency(data.totalExpenses)}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">BALANCE</p>
            <p className={`text-3xl font-bold ${
              data.balance > 0 ? "text-white" : "text-red-400"
            }`}>
              {formatCurrency(data.balance)}
            </p>
          </div>
        </div>

        {/* FINANCIAL RUNWAY */}
        <div className="text-center mb-20">
          <p className="text-gray-500 text-sm mb-2">FINANCIAL RUNWAY</p>
          <p className="text-2xl text-white">
            Your money will last <span className="font-bold">{runwayText}</span>
          </p>
        </div>

        {/* ALERTS - ANOMALIES */}
        {data.anomalies?.length > 0 && (
          <div className="text-center mb-20">
            <p className="text-gray-500 text-sm mb-4">ALERTS</p>
            <div className="space-y-2">
              {data.anomalies.slice(0, 3).map((anomaly, index) => (
                <div key={index} className="text-red-400 text-lg">
                  ⚠ {anomaly}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORY BREAKDOWN */}
        {topCategories.length > 0 && (
          <div className="text-center mb-20">
            <p className="text-gray-500 text-sm mb-6">TOP SPENDING</p>
            <div className="space-y-3">
              {topCategories.map((category, index) => (
                <div key={index} className="flex justify-center items-center gap-4">
                  <span className="text-gray-300">{category.name}</span>
                  <span className="text-white font-semibold">{category.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="text-center mb-20">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md mx-auto block bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-800 focus:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50 transition-all duration-300"
          />
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((tx, index) => (
                <div key={index} className="text-sm text-gray-400">
                  {tx.description} - {formatCurrency(tx.amount)} ({tx.category})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INFLATION TOGGLE */}
        <div className="text-center mb-16">
          <label className="flex items-center justify-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inflationAdjusted}
              onChange={(e) => setInflationAdjusted(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 rounded focus:ring-blue-500"
            />
            <span className="text-gray-400">
              Adjust for inflation (5%)
            </span>
          </label>
        </div>

        {/* RESTART BUTTON */}
        <div className="text-center mb-10">
          <button
            onClick={() => {
              localStorage.removeItem("financialData");
              router.push("/upload");
            }}
            className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-300"
          >
            Upload New Data
          </button>
        </div>

        {/* SIGNATURE */}
        <p className="text-center text-gray-600 text-sm">
          Built for clarity. Not complexity.
        </p>

      </div>
    </main>
  );
}
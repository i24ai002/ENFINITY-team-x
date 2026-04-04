"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  category?: string;
  isRecurring?: boolean;
}

interface ProcessedData {
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  recurringExpenses: number;
  safeDailySpend: number;
  biggestExpense: any;
  anomalies: string[];
}

export default function DashboardPage() {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string>("");
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
  }, [router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !data) return;
    
    const query = searchQuery.toLowerCase();
    let result = "";
    
    // Simple semantic search logic
    if (query.includes("food") && query.includes("last month")) {
      const foodExpenses = data.transactions
        .filter(tx => tx.type === "expense" && tx.category === "food")
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      if (foodExpenses > 0) {
        result = `You spent ${formatCurrency(foodExpenses)} on food last month`;
      }
    } else if (query.includes("subscription") || query.includes("subscriptions")) {
      const subscriptions = data.transactions
        .filter(tx => tx.category === "subscriptions")
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      if (subscriptions > 0) {
        result = `Your subscriptions cost ${formatCurrency(subscriptions)} per month`;
      }
    } else if (query.includes("how much")) {
      if (query.includes("spent")) {
        const totalExpenses = data.totalExpenses;
        result = `You spent ${formatCurrency(totalExpenses)} in total`;
      }
    }
    
    setSearchResult(result);
  };

  const handleUploadNew = () => {
    localStorage.removeItem("financialData");
    router.push("/upload");
  };

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">No Data Found</h1>
          <button onClick={handleUploadNew} className="bg-white text-black px-6 py-3 rounded-lg">
            Upload Data
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white animate-fade-in">
      <div className="max-w-6xl mx-auto px-6 py-20">
        
        {/* Search Bar */}
        <div className="mb-20">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask about your spending..."
                className="w-full px-6 py-4 bg-gray-900 text-white rounded-full text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:placeholder-gray-400"
              />
            </div>
          </div>
          
          {/* Search Result */}
          {searchResult && (
            <div className="mt-6 p-6 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-light text-gray-300 mb-4">
                  💡 {searchResult}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="text-center mb-32">
          <div className="inline-block">
            <div className="text-9xl font-extralight tracking-tight mb-4">
              {formatCurrency(data.safeDailySpend)}
            </div>
            <div className="text-2xl font-light text-gray-500 mb-8 tracking-wide">
              SAFE TO SPEND
            </div>
            <div className="text-xl font-light text-gray-400">
              PER DAY
            </div>
          </div>
          
          {/* Status */}
          <div className={`mt-12 inline-block px-8 py-3 rounded-full border ${
            data.safeDailySpend > 1000 
              ? "border-green-500 bg-green-500/10" 
              : data.safeDailySpend > 500 
                ? "border-yellow-500 bg-yellow-500/10" 
                  : "border-red-500 bg-red-500/10"
          }`}>
            <span className={`text-lg font-medium ${
              data.safeDailySpend > 1000 
                ? "text-green-400" 
                : data.safeDailySpend > 500 
                  ? "text-yellow-400" 
                    : "text-red-400"
            }`}>
              {data.safeDailySpend > 1000 ? "HEALTHY" : data.safeDailySpend > 500 ? "CAUTION" : "CRITICAL"}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-32">
          <div className="text-center">
            <div className="text-4xl font-light text-gray-500 mb-4">
              INCOME
            </div>
            <div className="text-5xl font-extralight text-white mb-2">
              {formatCurrency(data.totalIncome)}
            </div>
            <div className="text-sm text-gray-600">
              TOTAL
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-light text-gray-500 mb-4">
              EXPENSES
            </div>
            <div className="text-5xl font-extralight text-white mb-2">
              {formatCurrency(data.totalExpenses)}
            </div>
            <div className="text-sm text-gray-600">
              TOTAL
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-light text-gray-500 mb-4">
              BALANCE
            </div>
            <div className={`text-5xl font-extralight mb-2 ${
              data.balance > 0 ? "text-white" : "text-red-400"
            }`}>
              {formatCurrency(data.balance)}
            </div>
            <div className="text-sm text-gray-600">
              NET
            </div>
          </div>
        </div>

        {/* Biggest Expense */}
        {data.biggestExpense && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-3xl p-12 mb-32 border border-gray-800">
            <div className="text-center">
              <div className="text-2xl font-light text-gray-500 mb-8 tracking-wide">
                BIGGEST EXPENSE
              </div>
              <div className="text-4xl font-extralight text-white mb-4">
                {data.biggestExpense.description}
              </div>
              <div className="text-3xl font-light text-gray-300">
                {formatCurrency(data.biggestExpense.amount)}
              </div>
              <div className="text-lg text-gray-500 mt-2">
                {data.biggestExpense.category} • {new Date(data.biggestExpense.date).toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </div>
            </div>
          </div>
        )}

        {/* Anomalies */}
        {data.anomalies?.length > 0 && (
          <div className="bg-red-900/20 backdrop-blur-sm rounded-3xl p-12 mb-32 border border-red-800/50">
            <div className="text-center">
              <div className="text-2xl font-light text-red-400 mb-8 tracking-wide">
                ⚠️ ANOMALIES DETECTED
              </div>
              <div className="max-w-4xl mx-auto space-y-4">
                {data.anomalies.map((anomaly, index) => (
                  <div key={index} className="bg-red-900/40 rounded-xl p-6 border border-red-800/30">
                    <div className="text-red-300 font-medium text-lg">
                      {anomaly}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recurring Expenses */}
        {data.recurringExpenses > 0 && (
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-3xl p-12 mb-32 border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-light text-gray-500 mb-8 tracking-wide">
                MONTHLY COMMITMENTS
              </div>
              <div className="text-5xl font-extralight text-white mb-4">
                {formatCurrency(data.recurringExpenses)}
              </div>
              <div className="text-lg text-gray-500">
                Fixed recurring expenses
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="bg-gray-900/20 backdrop-blur-sm rounded-3xl p-12 mb-32 border border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-light text-gray-500 mb-12 tracking-wide">
              INSIGHTS
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-gray-400">
              <div>
                <div className="text-3xl font-light text-white mb-2">
                  {data.transactions.filter(tx => tx.type === "income").length}
                </div>
                <div className="text-sm text-gray-600">Income</div>
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-2">
                  {data.transactions.filter(tx => tx.type === "expense").length}
                </div>
                <div className="text-sm text-gray-600">Expenses</div>
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-2">
                  {data.transactions.filter(tx => tx.isRecurring).length}
                </div>
                <div className="text-sm text-gray-600">Recurring</div>
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-2">
                  {formatCurrency(data.totalExpenses / data.transactions.filter(tx => tx.type === "expense").length)}
                </div>
                <div className="text-sm text-gray-600">Avg Expense</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="text-center">
          <button
            onClick={handleUploadNew}
            className="inline-flex items-center px-12 py-4 bg-white text-black rounded-full text-lg font-medium hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
          >
            <span className="mr-3">📊</span>
            Upload New Data
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
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

export default function UploadPage() {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const cleanNumber = (val: any): number => {
    if (!val) return 0;
    const cleaned = val.toString().replace(/[₹,$,\s,CR,DR]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getSafeDate = (dateStr: any): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const alternative = new Date(Date.parse(dateStr));
      if (isNaN(alternative.getTime())) {
        return new Date().toISOString().split("T")[0];
      }
      return alternative.toISOString().split("T")[0];
    }
    return d.toISOString().split("T")[0];
  };

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      let json: any[] = [];

      try {
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        json = XLSX.utils.sheet_to_json(sheet, { raw: false });
      } catch {
        console.log("⚠ XLSX failed → CSV fallback");
        const text = new TextDecoder().decode(data);
        const lines = text.split("\n").filter(l => l.trim());
        
        if (lines.length === 0) {
          throw new Error("Empty file");
        }

        const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
        json = lines.slice(1, 301).map(line => {
          const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
          const obj: any = {};
          headers.forEach((h, i) => (obj[h] = values[i]));
          return obj;
        });
      }

      if (json.length === 0) {
        throw new Error("No data found");
      }

      console.log("DATA SAMPLE:", json.slice(0, 5));

      let transactions: Transaction[] = json
        .filter((r: any) => r && Object.keys(r).length > 0)
        .map((r: any) => {
          const debit = cleanNumber(r.Debit || r.debit);
          const credit = cleanNumber(r.Credit || r.credit);

          let amount = 0;
          let type: "income" | "expense" = "expense";

          if (credit > 0) {
            amount = credit;
            type = "income";
          } else if (debit > 0) {
            amount = debit;
            type = "expense";
          } else {
            const raw = cleanNumber(r.amount);
            if (!raw || raw === 0) return null;

            amount = raw;

            const txType = (r.type || "").toLowerCase();
            type = txType === "cash_in" || txType === "deposit" || txType === "credit" ? "income" : "expense";
          }

          const description = 
            r.Description ||
            r.description ||
            r.Narration ||
            r.narration ||
            r.name ||
            r.type ||
            "Transaction";

          return {
            date: getSafeDate(r.Date || r.date || r.DATE),
            amount,
            description,
            type,
            category: "other",
            isRecurring: false,
          };
        })
        .filter(Boolean) as Transaction[];

      if (transactions.length === 0) {
        throw new Error("No valid transactions found");
      }

      if (transactions.length > 300) {
        transactions = transactions.slice(0, 300);
      }

      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const result: ProcessedData = await response.json();

      const lightweightData = {
        transactions: result.transactions,
        totalIncome: result.totalIncome,
        totalExpenses: result.totalExpenses,
        balance: result.balance,
        recurringExpenses: result.recurringExpenses,
        safeDailySpend: result.safeDailySpend,
        biggestExpense: result.biggestExpense,
        anomalies: result.anomalies.slice(0, 10),
        categoryBreakdown: result.categoryBreakdown,
        daysRemaining: result.daysRemaining,
      };

      localStorage.removeItem("financialData");
      localStorage.setItem("financialData", JSON.stringify(lightweightData));

      router.push("/dashboard");
    } catch (err) {
      console.error("Upload error:", err);
      alert(err instanceof Error ? err.message : "File processing failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className={`relative z-10 max-w-6xl mx-auto px-8 py-20 transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-black mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Turn Your Expenses Into Clarity
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
            Upload your data and instantly understand your money
          </p>
        </div>

        <div className="max-w-md mx-auto mb-20">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h2 className="text-2xl font-semibold mb-2">Upload your file</h2>
              <p className="text-gray-400 text-sm mb-6">Supports CSV & Excel files</p>
              
              <label className="cursor-pointer">
                <div className="bg-white text-black px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 hover:bg-gray-100 inline-block">
                  {loading ? "Processing..." : "Upload CSV / Excel"}
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileName && !loading && (
                <p className="mt-4 text-green-400 text-sm">
                  ✅ {fileName}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:bg-white/10">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold mb-2">Smart Insights</h3>
            <p className="text-gray-400 text-sm">Instant spending clarity</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:bg-white/10">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Daily Limit</h3>
            <p className="text-gray-400 text-sm">Know how much you can spend</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:bg-white/10">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Anomaly Detection</h3>
            <p className="text-gray-400 text-sm">Spot unusual expenses</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:bg-white/10">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Zero Clutter</h3>
            <p className="text-gray-400 text-sm">No charts. Just clarity.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
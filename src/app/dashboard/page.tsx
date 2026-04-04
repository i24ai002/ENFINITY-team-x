'use client'

import { useState, useEffect } from 'react'
import { RunwayCalculator, RunwayCalculation, TransactionSummary } from '../../lib/runway'
import { AnomalyDetector, Anomaly } from '../../lib/anomaly'
import { SemanticSearch, SearchResult } from '../../lib/search'
import { ParsedTransaction } from '../../lib/parser'

export default function DashboardPage() {
  const [runwayCalc, setRunwayCalc] = useState<RunwayCalculation | null>(null)
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [inflationRate, setInflationRate] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (runwayCalc) {
      const calculator = new RunwayCalculator()
      const adjusted = calculator.adjustForInflation(runwayCalc, inflationRate)
      setRunwayCalc(adjusted)
    }
  }, [inflationRate])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      
      setRunwayCalc(data.runwayCalculation)
      setSummary(data.summary)
      setAnomalies(data.anomalies.anomalies.slice(0, 3)) // Show top 3 anomalies
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })
      
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-gray-900'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-900'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 font-bold'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!runwayCalc || !summary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-light text-gray-900 mb-4">No Data Available</h1>
          <p className="text-gray-600 mb-8">Please upload your transaction data first</p>
          <a href="/upload" className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800">
            Upload Data
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light text-gray-900 mb-4">
            Financial Forecast
          </h1>
          <div className="text-gray-600">
            Last 30 days analysis
          </div>
        </div>

        {/* Main Metric */}
        <div className="text-center mb-16">
          <div className="text-6xl font-light text-gray-900 mb-2">
            {formatCurrency(runwayCalc.safeDailySpend)}
          </div>
          <div className="text-xl text-gray-600 mb-1">
            SAFE TO SPEND
          </div>
          <div className="text-lg text-gray-500">
            per day
          </div>
          <div className={`text-lg mt-4 ${getStatusColor(runwayCalc.status)}`}>
            {runwayCalc.status.toUpperCase()}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="text-3xl font-light text-gray-900 mb-2">
              {formatCurrency(runwayCalc.totalIncome)}
            </div>
            <div className="text-gray-600">Total Income</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-light text-gray-900 mb-2">
              {formatCurrency(runwayCalc.totalExpenses)}
            </div>
            <div className="text-gray-600">Total Expenses</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-light text-gray-900 mb-2">
              {runwayCalc.runwayDays}
            </div>
            <div className="text-gray-600">Runway Days</div>
          </div>
        </div>

        {/* Biggest Expense */}
        {summary.biggestExpense && (
          <div className="text-center mb-16">
            <div className="text-lg text-gray-600 mb-2">BIGGEST EXPENSE</div>
            <div className="text-2xl font-light text-gray-900">
              {summary.biggestExpense.description}
            </div>
            <div className="text-xl text-gray-700">
              {formatCurrency(Math.abs(summary.biggestExpense.amount))}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="text-lg text-gray-600 mb-4">ANOMALIES</div>
            </div>
            <div className="space-y-4">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="text-center">
                  <div className={getSeverityColor(anomaly.severity)}>
                    {anomaly.description}
                  </div>
                  <div className="text-sm text-gray-600">
                    {anomaly.transaction.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inflation Adjustment */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-lg text-gray-600 mb-4">INFLATION ADJUSTMENT</div>
          </div>
          <div className="max-w-md mx-auto">
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">0%</span>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={inflationRate}
                onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-gray-700">{inflationRate}%</span>
            </div>
            <div className="text-center mt-4">
              <div className="text-sm text-gray-600">
                Adjusted daily spend: {formatCurrency(runwayCalc.safeDailySpend)}
              </div>
            </div>
          </div>
        </div>

        {/* Semantic Search */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-lg text-gray-600 mb-4">SEARCH TRANSACTIONS</div>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="flex space-x-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g., 'how much spent on food last month'"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            
            {searchResults && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    {searchResults.summary.count} transactions found
                  </div>
                  <div className="text-lg text-gray-900">
                    Total: {formatCurrency(searchResults.summary.totalAmount)}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.transactions.slice(0, 5).map((tx: any, index: number) => (
                    <div key={index} className="text-sm text-gray-700 border-b border-gray-200 pb-2">
                      <div>{tx.description}</div>
                      <div className="text-gray-600">
                        {formatCurrency(tx.amount)} • {tx.date.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a href="/upload" className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Upload New Data
          </a>
        </div>
      </div>
    </div>
  )
}

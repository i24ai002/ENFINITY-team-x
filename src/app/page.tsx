import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-light text-gray-900 mb-6">
          Zero-Clutter Financial Forecaster
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Calculate your safe-to-spend daily amount with ultra-minimalist design
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/upload" 
            className="inline-block w-full md:w-auto px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
          >
            Get Started
          </Link>
          
          <div className="text-sm text-gray-500">
            Upload your bank transactions (CSV/JSON) to begin
          </div>
        </div>
      </div>
    </div>
  )
}

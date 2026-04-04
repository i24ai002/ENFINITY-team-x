'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const fileType = selectedFile.type
      const fileName = selectedFile.name.toLowerCase()

      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        setFile(selectedFile)
        setError(null)
      } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Please upload a CSV or JSON file')
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const fileType = droppedFile.type
      const fileName = droppedFile.name.toLowerCase()

      if (fileType === 'text/csv' || fileName.endsWith('.csv') || 
          fileType === 'application/json' || fileName.endsWith('.json')) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Please upload a CSV or JSON file')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-900 mb-4">
            Upload Your Transactions
          </h1>
          <p className="text-lg text-gray-600">
            Export your bank data as CSV or JSON and upload it here
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {file ? (
              <div>
                <div className="text-lg text-gray-900 mb-2">
                  {file.name}
                </div>
                <div className="text-sm text-gray-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg text-gray-900 mb-2">
                  Drop your file here or click to browse
                </div>
                <div className="text-sm text-gray-600">
                  Supports CSV and JSON files
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-900">{error}</div>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-900">Upload successful! Redirecting...</div>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full py-4 px-6 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {uploading ? 'Processing...' : 'Upload & Analyze'}
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-light text-gray-900 mb-4">
              Expected Format
            </h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <div className="font-medium text-gray-900 mb-2">CSV columns:</div>
                <div className="font-mono bg-gray-50 p-3 rounded">
                  date, amount, description, type, account
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-2">JSON structure:</div>
                <div className="font-mono bg-gray-50 p-3 rounded text-xs">
                  {`[{"date": "2024-01-01", "amount": 1000, "description": "Salary", "type": "income"}]`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

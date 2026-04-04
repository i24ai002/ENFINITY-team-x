# Zero-Clutter Financial Forecaster

An ultra-minimalist web application that calculates your safe-to-spend daily amount from raw bank transaction data. Built for hackathons with speed and clarity in mind.

## 🎯 Goal

Calculate a user's safe-to-spend daily amount for the next 30 days using only typography and whitespace - no charts, graphs, or visual clutter.

## ✨ Features

- **Data Ingestion**: Upload CSV/JSON transaction files with smart parsing
- **Categorization Engine**: Rule-based transaction categorization
- **Runway Calculator**: Core financial logic for daily spending limits
- **Multi-Account Deduplication**: Detect and remove internal transfers
- **Anomaly Detection**: Flag unusual spending patterns (>15% increase)
- **Semantic Search**: Natural language transaction queries
- **Inflation Adjustment**: Real-time inflation impact calculations

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma ORM
- **Parsing**: PapaParse for CSV processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   cd zero-clutter
   npm install
   ```

2. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Sample Data

Use the provided `public/data/transactions.csv` to test the application:

1. Go to [http://localhost:3000/upload](http://localhost:3000/upload)
2. Upload the `transactions.csv` file
3. View your financial forecast at [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## 📁 Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── dashboard/    # Dashboard page
│   ├── upload/       # File upload page
│   └── page.tsx      # Landing page
├── lib/
│   ├── parser.ts     # CSV/JSON parsing logic
│   ├── categorizer.ts # Transaction categorization
│   ├── runway.ts     # Financial calculations
│   ├── deduplicator.ts # Duplicate detection
│   ├── anomaly.ts    # Anomaly detection
│   └── search.ts     # Semantic search
├── prisma/
│   └── schema.prisma # Database schema
└── public/data/
    └── transactions.csv # Test data
```

## 💾 Data Format

### CSV Format
```csv
date,amount,description,type,account
2024-01-01,50000,Salary,income,HDFC Bank
2024-01-02,-10000,Rent Payment,expense,HDFC Bank
```

### JSON Format
```json
[
  {
    "date": "2024-01-01",
    "amount": 50000,
    "description": "Salary",
    "type": "income",
    "account": "HDFC Bank"
  }
]
```

## 🧠 Core Logic

### Runway Calculation
```
balance = sum(income) - sum(expenses)
recurring_expenses = sum(recurring)
usable_money = balance - recurring_expenses
safe_daily_spend = usable_money / 30
```

### Anomaly Detection
- Compare current expense vs 6-month average
- Flag if >15% increase
- Display via typography (bold/red text)

### Semantic Search Examples
- "how much spent on food last month"
- "show all Netflix transactions"
- "expenses over 1000 this month"

## 🎨 Design Philosophy

- **Typography only**: No charts, graphs, or visual elements
- **Minimal colors**: Black, white, gray only
- **Large text**: Emphasis on readability
- **Whitespace**: Clean, uncluttered layout

## 🔧 Development

### Adding New Categories

Edit `src/lib/categorizer.ts`:

```typescript
export const DEFAULT_CATEGORIES: CategoryRule[] = [
  {
    name: 'your-category',
    keywords: ['keyword1', 'keyword2'],
    priority: 11
  },
  // ... existing categories
]
```

### Database Schema

```prisma
model Transaction {
  id          String   @id @default(cuid())
  date        DateTime
  amount      Float
  description String
  type        String   // income, expense, transfer
  category    String?  // housing, food, subscriptions, etc.
  account     String?
  isRecurring Boolean  @default(false)
  merchant    String?
  // ... timestamps
}
```

## 📝 API Endpoints

- `POST /api/upload` - Upload and process transaction files
- `GET /api/dashboard` - Get dashboard data and calculations
- `POST /api/search` - Semantic search transactions

## 🏗 Build & Deploy

### Build for production
```bash
npm run build
npm start
```

### Environment Variables
Create a `.env.local` file:
```env
DATABASE_URL="file:./dev.db"
```

## 🎯 Hackathon Tips

1. **Focus on the core runway calculation** - this is the main value proposition
2. **Use the sample data** to quickly demo features
3. **Emphasize the minimalist design** - no charts is a key differentiator
4. **Demo semantic search** - shows advanced functionality
5. **Show anomaly detection** - demonstrates practical insights

## 🐛 Troubleshooting

### Common Issues

1. **Database not found**: Run `npx prisma migrate dev`
2. **File upload fails**: Check CSV/JSON format matches expected schema
3. **No data displayed**: Ensure transactions were processed successfully

### Reset Database
```bash
npx prisma migrate reset
npx prisma migrate dev
```

## 📄 License

MIT License - feel free to use and modify for your projects.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

-----------------x----------------


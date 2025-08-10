<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Environment Variables

The following environment variables are required to run the application:

### Required Variables

- `FMP_API_KEY` - API key from [Financial Modeling Prep](https://financialmodelingprep.com/) for stock data
- `REDIS_URL` - Redis connection URL for caching (default: `redis://localhost:6379`)
- `DATABASE_URL` - Neon PostgreSQL connection URL
- `AUTH_SECRET` - Secret key for authentication
- `XAI_API_KEY` - xAI Grok API key for AI responses

### Optional Variables

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token for file uploads

## Running locally

### Prerequisites

1. **Redis Server** - Install and run locally:
   ```bash
   # macOS (using Homebrew)
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis-server
   
   # Or using Docker
   docker run -d -p 6379:6379 redis:latest
   ```

2. **Neon Database** - Create a free PostgreSQL database:
   - Go to [Neon Console](https://console.neon.tech/)
   - Create a new project
   - Copy the connection string to use as `DATABASE_URL`

3. **Financial Modeling Prep API Key**:
   - Sign up at [Financial Modeling Prep](https://financialmodelingprep.com/)
   - Get your API key from the dashboard

### Setup Instructions

1. Clone and install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env.local` file with your environment variables:
   ```bash
   # Copy the example and fill in your values
   cp .env.example .env.local
   ```

3. Run database migrations:
   ```bash
   pnpm db:migrate
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

Your app should now be running on [localhost:3000](http://localhost:3000).

### Alternative Setup with Vercel

You can also use Vercel Environment Variables:

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts: `vercel link`
3. Download your environment variables: `vercel env pull`

## Testing and Examples

### Stock Portfolio Query Examples

The application includes a financial analysis tool that can query stock portfolios. Here are some example prompts and expected responses:

#### Example 1: Basic Portfolio Query
**Prompt:**
```
"Como estão as ações AAPL, MSFT e GOOGL hoje?"
```

**Expected Response Structure:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestedTickers": ["AAPL", "MSFT", "GOOGL"],
  "stocksFound": 3,
  "stocks": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "price": 185.25,
      "change": 2.15,
      "changePercentage": 1.17,
      "volume": 45678900,
      "marketCap": 2850000000000
    }
  ],
  "portfolioMetrics": {
    "totalValue": 555.75,
    "averageChange": 1.05,
    "bestPerformer": {"ticker": "AAPL", "changePercentage": 1.17},
    "worstPerformer": {"ticker": "MSFT", "changePercentage": 0.85}
  },
  "exchangeRate": {
    "usdToBrl": 5.20,
    "usdToBrlFormatted": "R$ 5,20"
  }
}
```

#### Example 2: Brazilian Stocks Query
**Prompt:**
```
"What's the current price of VALE3, PETR4, and BBAS3?"
```

**Expected Behavior:**
- Normalizes Brazilian tickers (VALE3 → VALE3.SA)
- Returns prices in BRL
- Provides USD conversion using current exchange rate
- Responds in English (matching user's language)

#### Example 3: Mixed Portfolio
**Prompt:**
```
"Analise meu portfólio: AAPL, VALE3, TSLA, BBAS3"
```

**Expected Features:**
- Handles both US and Brazilian stocks
- Caches data in Redis for 5 minutes
- Persists query data in PostgreSQL
- Returns comprehensive analysis with metrics
- Responds in Portuguese (matching user's language)

### API Response Guidelines

The system follows these response guidelines:
- Always responds in the same language as the user's question
- Brazilian stocks: shows BRL first, USD conversion second
- US stocks: shows USD first, BRL conversion second
- Never assumes asset quantities without explicit data
- Provides exchange rate information with formatted display

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

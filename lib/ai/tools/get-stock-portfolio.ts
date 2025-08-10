import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from 'redis';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { portfolioQuery } from '@/lib/db/schema';

// Interface for Financial Modeling Prep API data
interface StockData {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

// Normalized interface for our return - ALL API data
// Values can be number/string or "Not Available" according to specification
interface NormalizedStockData {
  ticker: string;
  name: string | 'Not Available';
  price: number | 'Not Available';
  change: number | 'Not Available';
  changePercentage: number | 'Not Available';
  volume: number | 'Not Available';
  marketCap: number | 'Not Available';
  dayLow: number | 'Not Available';
  dayHigh: number | 'Not Available';
  yearHigh: number | 'Not Available';
  yearLow: number | 'Not Available';
  priceAvg50: number | 'Not Available';
  priceAvg200: number | 'Not Available';
  avgVolume: number | 'Not Available';
  exchange: string | 'Not Available';
  open: number | 'Not Available';
  previousClose: number | 'Not Available';
  eps: number | 'Not Available';
  pe: number | 'Not Available';
  earningsAnnouncement: string | 'Not Available';
  sharesOutstanding: number | 'Not Available';
  timestamp: number;
}

// Redis configuration
let redisClient: any = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
  }
  return redisClient;
}

// Database configuration
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Function to normalize ticker based on pattern
function normalizeTicker(ticker: string): string {
  // 4 alphanumeric characters = American stock (ex: AAPL, MSFT, B3SA)
  if (/^[A-Z0-9]{4}$/.test(ticker)) {
    return ticker; // Keep as is
  }
  
  // 4 alphanumeric characters + 1 or 2 numbers = Brazilian stock (ex: BBAS3, PETR4, EGAF11, B3SA3)
  if (/^[A-Z0-9]{4}\d{1,2}$/.test(ticker) && !ticker.includes('.')) {
    return `${ticker}.SA`; // Add .SA suffix
  }
  
  // Other cases, keep as is
  return ticker;
}

// Function to fetch individual ticker data with retry
async function fetchTickerData(ticker: string, retryCount = 0): Promise<NormalizedStockData | null> {
  const maxRetries = 2;
  const timeout = 20000; // 20 seconds - increased to avoid AbortError

  try {
    // Normalize ticker based on pattern
    const normalizedTicker = normalizeTicker(ticker);
    console.log(`Fetching data for ${normalizedTicker} (attempt ${retryCount + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Timeout of ${timeout}ms reached for ${normalizedTicker}`);
      controller.abort();
    }, timeout);

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${normalizedTicker}?apikey=${process.env.FMP_API_KEY}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pierre-Finance-Portfolio/1.0'
        }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: StockData[] = await response.json();
    
    if (!data || data.length === 0) {
      console.warn(`No data found for ${ticker}`);
      return null;
    }

    const stockInfo = data[0];
    
    // Normalize data with adequate precision - ALL API data
    // IMPORTANT: Use "Not Available" as default according to specification
    const normalizedData: NormalizedStockData = {
      ticker: ticker, // Use original ticker, not from API
      name: stockInfo.name || 'Not Available',
      price: stockInfo.price !== undefined && stockInfo.price !== null ? roundFinancial(stockInfo.price) : 'Not Available',
      change: stockInfo.change !== undefined && stockInfo.change !== null ? roundFinancial(stockInfo.change) : 'Not Available',
      changePercentage: stockInfo.changesPercentage !== undefined && stockInfo.changesPercentage !== null ? roundFinancial(stockInfo.changesPercentage) : 'Not Available',
      volume: stockInfo.volume !== undefined && stockInfo.volume !== null ? Math.round(stockInfo.volume) : 'Not Available',
      marketCap: stockInfo.marketCap !== undefined && stockInfo.marketCap !== null ? Math.round(stockInfo.marketCap) : 'Not Available',
      dayLow: stockInfo.dayLow !== undefined && stockInfo.dayLow !== null ? roundFinancial(stockInfo.dayLow) : 'Not Available',
      dayHigh: stockInfo.dayHigh !== undefined && stockInfo.dayHigh !== null ? roundFinancial(stockInfo.dayHigh) : 'Not Available',
      yearHigh: stockInfo.yearHigh !== undefined && stockInfo.yearHigh !== null ? roundFinancial(stockInfo.yearHigh) : 'Not Available',
      yearLow: stockInfo.yearLow !== undefined && stockInfo.yearLow !== null ? roundFinancial(stockInfo.yearLow) : 'Not Available',
      priceAvg50: stockInfo.priceAvg50 !== undefined && stockInfo.priceAvg50 !== null ? roundFinancial(stockInfo.priceAvg50) : 'Not Available',
      priceAvg200: stockInfo.priceAvg200 !== undefined && stockInfo.priceAvg200 !== null ? roundFinancial(stockInfo.priceAvg200) : 'Not Available',
      avgVolume: stockInfo.avgVolume !== undefined && stockInfo.avgVolume !== null ? Math.round(stockInfo.avgVolume) : 'Not Available',
      exchange: stockInfo.exchange || 'Not Available',
      open: stockInfo.open !== undefined && stockInfo.open !== null ? roundFinancial(stockInfo.open) : 'Not Available',
      previousClose: stockInfo.previousClose !== undefined && stockInfo.previousClose !== null ? roundFinancial(stockInfo.previousClose) : 'Not Available',
      eps: stockInfo.eps !== undefined && stockInfo.eps !== null ? roundFinancial(stockInfo.eps) : 'Not Available',
      pe: stockInfo.pe !== undefined && stockInfo.pe !== null ? roundFinancial(stockInfo.pe) : 'Not Available',
      earningsAnnouncement: stockInfo.earningsAnnouncement || 'Not Available',
      sharesOutstanding: stockInfo.sharesOutstanding !== undefined && stockInfo.sharesOutstanding !== null ? Math.round(stockInfo.sharesOutstanding) : 'Not Available',
      timestamp: stockInfo.timestamp || Date.now(),
    };

    const priceDisplay = typeof normalizedData.price === 'number' ? `$${normalizedData.price}` : normalizedData.price;
    const changeDisplay = typeof normalizedData.changePercentage === 'number' ? `${normalizedData.changePercentage.toFixed(2)}%` : normalizedData.changePercentage;
    console.log(`Data obtained for ${ticker}: ${priceDisplay} (${changeDisplay})`);
    return normalizedData;

  } catch (error) {
    // Simplified error handling
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn(`Timeout for ${ticker} (attempt ${retryCount + 1})`);
      } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.warn(`${ticker} not found in API`);
        return null; // No retry for 404
      } else {
        console.error(`Error fetching ${ticker}:`, error.message);
      }
    } else {
      console.error(`Unknown error fetching ${ticker}:`, error);
    }

    // Retry only for temporary errors (timeout, network, etc)
    if (retryCount < maxRetries && !(error instanceof Error && error.message.includes('404'))) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Waiting ${delay}ms before trying again...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchTickerData(ticker, retryCount + 1);
    }

    console.warn(`${ticker} not available after ${retryCount + 1} attempts`);
    return null;
  }
}

// Function to fetch USD/BRL exchange rate from FMP API
async function fetchExchangeRate(): Promise<number> {
  try {
    console.log('Fetching USD/BRL exchange rate...');
    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/fx/USDBRL?apikey=${process.env.FMP_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Pierre-Finance-Portfolio/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.warn('Exchange data not found, using default rate');
      return 5.20; // Fallback rate
    }

    const exchangeRate = data[0]?.price || 5.20;
    console.log(`USD/BRL rate obtained: ${exchangeRate}`);
    return parseFloat(exchangeRate.toFixed(4));

  } catch (error) {
    console.warn('Error fetching exchange rate, using default rate:', error);
    return 5.20; // Fallback rate in case of error
  }
}

// Function to fetch data for multiple tickers
async function fetchMultipleTickersData(tickers: string[]): Promise<NormalizedStockData[]> {
  console.log(`Starting query for ${tickers.length} tickers: ${tickers.join(', ')}`);
  
  // Execute queries in parallel with concurrency limit
  const batchSize = 5; // Maximum 5 simultaneous queries
  const results: NormalizedStockData[] = [];
  
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(ticker => fetchTickerData(ticker));
    const batchResults = await Promise.all(batchPromises);
    
    // Filter null results and add to results
    batchResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });
  }
  
  console.log(`Query completed: ${results.length}/${tickers.length} tickers successful`);
  return results;
}

// Function to generate cache key based on tickers
// For public quote data, we don't need userId (data is the same for everyone)
function generateCacheKey(tickers: string[]): string {
  const sortedTickers = [...tickers].sort().join(',');
  return `portfolio:quotes:${Buffer.from(sortedTickers).toString('base64')}`;
}

// Function to round financial values with precision
function roundFinancial(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Function to calculate portfolio statistics (compatible with "Not Available")
function calculatePortfolioStats(data: NormalizedStockData[]) {
  if (data.length === 0) {
    return {
      totalValue: 'Not Available' as const,
      averageChange: 'Not Available' as const,
      totalVolume: 'Not Available' as const,
      totalMarketCap: 'Not Available' as const,
      bestPerformer: null,
      worstPerformer: null
    };
  }

  // Filter only valid numeric values
  const validPrices = data.filter(s => typeof s.price === 'number').map(s => s.price as number);
  const validChanges = data.filter(s => typeof s.changePercentage === 'number').map(s => s.changePercentage as number);
  const validVolumes = data.filter(s => typeof s.volume === 'number').map(s => s.volume as number);
  const validMarketCaps = data.filter(s => typeof s.marketCap === 'number').map(s => s.marketCap as number);

  // Calculate statistics only with valid values
  const totalValue = validPrices.length > 0 ? roundFinancial(validPrices.reduce((sum, price) => sum + price, 0)) : 'Not Available' as const;
  const averageChange = validChanges.length > 0 ? roundFinancial(validChanges.reduce((sum, change) => sum + change, 0) / validChanges.length) : 'Not Available' as const;
  const totalVolume = validVolumes.length > 0 ? Math.round(validVolumes.reduce((sum, vol) => sum + vol, 0)) : 'Not Available' as const;
  const totalMarketCap = validMarketCaps.length > 0 ? Math.round(validMarketCaps.reduce((sum, cap) => sum + cap, 0)) : 'Not Available' as const;
  
  const bestPerformer = validChanges.length > 0 ? data.reduce((best, current) => {
    const currentChange = typeof current.changePercentage === 'number' ? current.changePercentage : -Infinity;
    const bestChange = typeof best.changePercentage === 'number' ? best.changePercentage : -Infinity;
    return currentChange > bestChange ? current : best;
  }) : null;
  
  const worstPerformer = validChanges.length > 0 ? data.reduce((worst, current) => {
    const currentChange = typeof current.changePercentage === 'number' ? current.changePercentage : Infinity;
    const worstChange = typeof worst.changePercentage === 'number' ? worst.changePercentage : Infinity;
    return currentChange < worstChange ? current : worst;
  }) : null;

  return {
    totalValue,
    averageChange,
    totalVolume,
    totalMarketCap,
    bestPerformer,
    worstPerformer
  };
}

export const getStockPortfolio = tool({
  description: 'Gets quote data and variations for a list of stock tickers, with cache and persistence',
  inputSchema: z.object({
    tickers: z.array(z.string().min(1)).min(1).describe('List of stock tickers (ex: ["AAPL", "MSFT", "BBAS3", "TAEE11"])'),
    userId: z.string().optional().describe('User ID (optional, for persistence)'),
    userLanguage: z.string().optional().describe('User question language (pt/en) - CRITICAL for response in correct language'),
  }),
  execute: async ({ tickers, userId, userLanguage }) => {
    try {
      console.log(`Starting portfolio query for: ${tickers.join(', ')}`);
      
      // Normalize tickers (uppercase and trim)
      const normalizedTickers = tickers.map(ticker => ticker.trim().toUpperCase());
      
      // Check cache first
      const cacheKey = generateCacheKey(normalizedTickers);
      let portfolioData: NormalizedStockData[] = [];
      let exchangeRate: number;
      
      try {
        const redis = await getRedisClient();
        const cachedData = await redis.get(cacheKey);
        
        if (cachedData) {
          console.log('📦 COMPLETE data found in cache');
          const parsedCache = JSON.parse(cachedData);
          portfolioData = parsedCache.data || parsedCache;
        }
      } catch (cacheError) {
        console.warn('Redis cache error, continuing without cache:', cacheError);
      }
      
      // fetch exchange rate (real-time updated data)
      exchangeRate = await fetchExchangeRate();
      
      // If no data in cache, fetch from API
      if (portfolioData.length === 0) {
        console.log('🌐 Fetching data from Financial Modeling Prep API');
        portfolioData = await fetchMultipleTickersData(normalizedTickers);
        
        // redis cache
        if (portfolioData.length > 0) {
          try {
            const redis = await getRedisClient();
            const completeDataForStorage = {
              timestamp: new Date().toISOString(),
              tickers: normalizedTickers,
              data: portfolioData,
            };
            await redis.setEx(cacheKey, 300, JSON.stringify(completeDataForStorage));
            console.log('COMPLETE data saved in Redis for 5 minutes');
          } catch (cacheError) {
            console.warn('Error saving to cache:', cacheError);
          }
        }
      }
    
    // database persistence
    if (userId && portfolioData.length > 0) {
      try {
        await db.insert(portfolioQuery).values({
          tickers: normalizedTickers,
          data: portfolioData, // ALL API data
          userId: userId,
        });
        console.log('COMPLETE data persisted in PostgreSQL');
      } catch (dbError) {
        console.warn('Error persisting to database:', dbError);
      }
    }
    
    // OPTIMIZED RESPONSE: AI SDK receives relevant data + response guidelines
    const aiOptimizedResponse = generateAIOptimizedResponse(portfolioData, normalizedTickers, exchangeRate, userLanguage);
    
    console.log('Portfolio query completed!');
    return aiOptimizedResponse;
      
    } catch (error) {
      console.error('Critical error in portfolio query:', error);
      
      return {
        success: false,
        error: 'Internal error processing portfolio',
        timestamp: new Date().toISOString(),
        tickers: tickers,
        data: [],
        summary: null,
        naturalLanguageSummary: 'Sorry, it was not possible to get your portfolio data at the moment. Please try again in a few moments.',
      };
    }
  },
});

// Function to generate AI-optimized response with response guidelines
function generateAIOptimizedResponse(data: NormalizedStockData[], tickers: string[], exchangeRate: number, userLanguage?: string) {
  // Complete data for natural LLM interpretation
  const aiData = data.map(stock => ({
    ticker: stock.ticker,
    name: stock.name,
    price: stock.price,
    change: stock.change,
    changePercentage: stock.changePercentage,
    volume: stock.volume,
    marketCap: stock.marketCap,
    exchange: stock.exchange,
    dayLow: stock.dayLow,
    dayHigh: stock.dayHigh,
    yearHigh: stock.yearHigh,
    yearLow: stock.yearLow,
    priceAvg50: stock.priceAvg50,
    priceAvg200: stock.priceAvg200,
  }));

  // Calculate basic statistics for AI (with "Not Available" handling)
  const validPrices = data.filter(s => typeof s.price === 'number').map(s => s.price as number);
  const validChanges = data.filter(s => typeof s.changePercentage === 'number').map(s => s.changePercentage as number);
  const validVolumes = data.filter(s => typeof s.volume === 'number').map(s => s.volume as number);
  const validMarketCaps = data.filter(s => typeof s.marketCap === 'number').map(s => s.marketCap as number);

  const totalValue = validPrices.length > 0 ? roundFinancial(validPrices.reduce((sum, price) => sum + price, 0)) : 'Not Available';
  const averageChange = validChanges.length > 0 ? roundFinancial(validChanges.reduce((sum, change) => sum + change, 0) / validChanges.length) : 'Not Available';
  const totalVolume = validVolumes.length > 0 ? Math.round(validVolumes.reduce((sum, vol) => sum + vol, 0)) : 'Not Available';
  const totalMarketCap = validMarketCaps.length > 0 ? Math.round(validMarketCaps.reduce((sum, cap) => sum + cap, 0)) : 'Not Available';

  const bestPerformer = validChanges.length > 0 ? data.reduce((best, current) => {
    const currentChange = typeof current.changePercentage === 'number' ? current.changePercentage : -Infinity;
    const bestChange = typeof best.changePercentage === 'number' ? best.changePercentage : -Infinity;
    return currentChange > bestChange ? current : best;
  }) : null;

  const worstPerformer = validChanges.length > 0 ? data.reduce((worst, current) => {
    const currentChange = typeof current.changePercentage === 'number' ? current.changePercentage : Infinity;
    const worstChange = typeof worst.changePercentage === 'number' ? worst.changePercentage : Infinity;
    return currentChange < worstChange ? current : worst;
  }) : null;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    requestedTickers: tickers,
    stocksFound: data.length,
    stocks: aiData,
    portfolioMetrics: {
      totalValue,
      averageChange,
      totalVolume,
      totalMarketCap,
      bestPerformer,
      worstPerformer,
    },
    exchangeRate: {
      usdToBrl: exchangeRate,
      usdToBrlFormatted: `R$ ${exchangeRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      timestamp: new Date().toISOString(),
      source: 'Financial Modeling Prep API'
    },
    detectedUserLanguage: userLanguage || "unknown",
    responseGuidelines: {
      CRITICAL_LANGUAGE_RULE: "RESPONDER SEMPRE NO MESMO IDIOMA DA PERGUNTA DO USUÁRIO - Este é um requisito absoluto!",
      currency_display: "Ações brasileiras: mostrar em BRL primeiro. Ações americanas: mostrar em USD primeiro. Fazer conversões conforme idioma da pergunta.",
      no_assumptions: "JAMAIS presumir quantidades de ativos. JAMAIS calcular net worth sem dados explícitos de quantidade.",
      response_scope: "Responder APENAS o que foi perguntado especificamente",
      analysis_suggestions: "Pode sugerir análises adicionais, mas sem assumir dados não fornecidos",
      language_detection_hint: userLanguage ? `Usuário perguntou em: ${userLanguage === 'pt' ? 'PORTUGUÊS' : 'ENGLISH'}` : "Idioma não detectado - inferir da pergunta",
      currency_examples: {
        pt_question_us_stock: "AAPL está a $150.25 (R$ 781,30 no câmbio atual de R$ 5,20)",
        en_question_br_stock: "BBAS3.SA is at R$ 43.94 ($8.45 USD at current rate of R$ 5.20 per dollar)",
        pt_question_br_stock: "BBAS3 está a R$ 43.94",
        en_question_us_stock: "AAPL is at $150.25"
      },
      exchange_rate_display: "Sempre usar a versão formatada: usdToBrlFormatted (ex: R$ 5,20) ao invés do número bruto"
    }
  };
}

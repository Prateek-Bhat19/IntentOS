import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  timeout?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

/**
 * Create a configured HTTP client with timeout and retry handling
 */
export function createHttpClient(config: HttpClientConfig = {}): AxiosInstance {
  const {
    timeout = 10000, // 10 seconds default
    maxRedirects = 5,
    headers = {},
  } = config;

  const instance = axios.create({
    timeout: config?.timeout || 10000,
    maxRedirects, // Keep maxRedirects from original config
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      ...headers, // Merge user-provided headers last
    },
    validateStatus: (status) => status < 500, // Don't throw on 4xx errors
  });

  return instance;
}

/**
 * Make HTTP request with automatic error classification
 */
export async function makeRequest(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig
) {
  try {
    const response = await client.get(url, config);
    return response;
  } catch (error: any) {
    // Error will be classified by adapter
    throw error;
  }
}

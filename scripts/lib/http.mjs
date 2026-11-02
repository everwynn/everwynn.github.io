export class HttpError extends Error {
  constructor(message, { status = 0, url = '' } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJson(url, {
  headers = {},
  timeoutMs = 15000,
  retries = 3,
  expectText = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { headers, signal: controller.signal });
      if (!response.ok) {
        throw new HttpError(`HTTP ${response.status} ${response.statusText}`, {
          status: response.status,
          url,
        });
      }
      return expectText ? await response.text() : await response.json();
    } catch (error) {
      lastError = error;
      const status = error instanceof HttpError ? error.status : 0;
      const retryable = status === 0 || status === 403 || status === 429 || status >= 500;
      if (!retryable || attempt === retries) break;
      await sleep(400 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new HttpError('请求失败', { url });
}

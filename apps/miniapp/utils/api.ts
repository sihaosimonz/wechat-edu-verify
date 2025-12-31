/**
 * API wrapper for the WeChat mini program. Handles session and verification tokens
 * stored in local storage and automatically includes them in the Authorization header.
 */

const BASE_URL = 'http://localhost:8080';

function getSessionToken(): string | null {
  return wx.getStorageSync('session_token') || null;
}

function getVerificationToken(): string | null {
  return wx.getStorageSync('verification_token') || null;
}

type ApiRequestOptions = {
  url: string;
  method?: WechatMiniprogram.RequestOption['method'];
  data?: Record<string, any>;
  headers?: Record<string, string>;
};

function buildAuthHeader(path: string): string | null {
  const verificationToken = getVerificationToken();
  const sessionToken = getSessionToken();

  if (verificationToken && path.startsWith('/groups/')) {
    return `Bearer ${verificationToken}`;
  }

  if (sessionToken) {
    return `Bearer ${sessionToken}`;
  }

  return null;
}

// converting callback to promise style
export function apiRequest<T = any>(options: ApiRequestOptions): Promise<T> {
  const url = options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`;
  const authHeader = buildAuthHeader(options.url);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authHeader && !headers.Authorization && !headers.authorization) {
    headers.Authorization = authHeader;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: headers,
      success: (resp: WechatMiniprogram.RequestSuccessCallbackResult) => {
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          resolve(resp.data as T);
          return;
        }
        reject(resp.data || { error: `Request failed with status ${resp.statusCode}` });
      },
      fail: (err: any) => {
        reject(err);
      }
    });
  });
}

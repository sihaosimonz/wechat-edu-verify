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

export function apiRequest<T>({ url, method = 'GET', data, headers: customHeaders = {} }: { url: string; method?: 'GET' | 'POST' | 'DELETE'; data?: any; headers?: Record<string, string>; }): Promise<T> {
  return new Promise((resolve, reject) => {
    const headers: any = { 'Content-Type': 'application/json', ...customHeaders };
    const sessionToken = getSessionToken();
    const verificationToken = getVerificationToken();
    // Prefer session token; use verification token for join/invite requests and scan tokens
    if (url.includes('/groups/') || url.includes('/verify/qr-token') || url.includes('/moderation/')) {
      if (verificationToken) {
        headers['Authorization'] = `Bearer ${verificationToken}`;
      }
    } else if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    wx.request({
      url: BASE_URL + url,
      method: method as any,
      data,
      header: headers,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          reject(res.data);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}
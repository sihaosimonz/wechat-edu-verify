/**
 * API wrapper for the WeChat mini program.
 *
 * Why this exists:
 * - WeChat's wx.request is callback-based.
 * - This wraps it in a Promise so page code can use async/await.
 * - It also auto-attaches session_token / verification_token.
 */

const BASE_URL = 'http://localhost:8080';

function getSessionToken() {
  return wx.getStorageSync('session_token') || null;
}

function getVerificationToken() {
  return wx.getStorageSync('verification_token') || null;
}

function buildAuthHeader(path) {
  const verificationToken = getVerificationToken();
  const sessionToken = getSessionToken();

  // group endpoints require a verification token (stronger credential)
  if (verificationToken && path.startsWith('/groups/')) {
    return `Bearer ${verificationToken}`;
  }

  if (sessionToken) {
    return `Bearer ${sessionToken}`;
  }

  return null;
}

function apiRequest(options) {
  const url = options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`;
  const authHeader = buildAuthHeader(options.url);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
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
      success: (resp) => {
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          resolve(resp.data);
          return;
        }
        reject(resp.data || { error: `Request failed with status ${resp.statusCode}` });
      },
      fail: (err) => reject(err)
    });
  });
}

module.exports = { apiRequest };

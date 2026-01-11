// upon OTP success, this page shows up

const { t } = require('../../utils/i18n');
const { get, resolveUrl } = require('../../utils/api');

Page({
  data: {
    status: 'loading',
    loading: false,
    loadingQr: false,
    validUntil: '',
    qrUrl: '',
    qrUrlWithCacheBust: '',
    ui: {
      loading: t('loading') || 'Loading...',
      not_verified: t('not_verified') || 'You are not verified yet',
      reverify: t('reverify') || 'Re-verify',
      verified_until: t('verified_until') || 'Verified until',
      loading_qr: t('loading_qr') || 'Loading QR...',
      qr_unavailable: t('qr_unavailable') || 'QR code not available',
      error: t('error') || 'Error'
    }
  },

  onLoad() {
    this.checkStatus();
  },

  async checkStatus() {
    this.setData({ loading: true });
    try {
      const res = await get('/verify/status');
      if (res.status === 'verified') {
        this.setData({ status: 'verified', validUntil: this.formatValidUntil(res.valid_until) });
        await this.fetchQr();
      } else {
        this.setData({ status: 'unverified', qrUrl: '', qrUrlWithCacheBust: '' });
      }
    } catch (e) {
      this.setData({ status: 'unverified', qrUrl: '', qrUrlWithCacheBust: '' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async fetchQr() {
    this.setData({ loadingQr: true });
    try {
      const res = await get('/groups/qr');
      const qrUrl = res && res.qrUrl;
      if (!qrUrl) {
        this.setData({ qrUrl: '', qrUrlWithCacheBust: '' });
        return;
      }
      this.setData({
        qrUrl,
        qrUrlWithCacheBust: this.buildQrUrlWithCacheBust(qrUrl)
      });
    } catch (err) {
      wx.showToast({ title: (err && err.error) || this.data.ui.error, icon: 'none' });
      this.setData({ qrUrl: '', qrUrlWithCacheBust: '' });
    } finally {
      this.setData({ loadingQr: false });
    }
  },

  buildQrUrlWithCacheBust(qrUrl) {
    const fullUrl = resolveUrl(qrUrl);
    const joiner = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${joiner}v=${Date.now()}`;
  },

  formatValidUntil(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${hours}:${minutes}, ${year}-${month}-${day}`;
  },

  reverify() {
    wx.navigateTo({ url: '/pages/verify/email' });
  }
});

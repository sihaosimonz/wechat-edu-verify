import { t } from '../../utils/i18n';
import { apiRequest } from '../../utils/api';

Page({
  data: {
    status: 'loading',
    emailDomain: '',
    validUntil: '',
    qrToken: '',
    t,
    loading: false
  },
  onShow() {
    this.loadStatus();
  },
  async loadStatus() {
    this.setData({ loading: true });
    try {
      const res: any = await apiRequest({ url: '/verify/status', method: 'GET' });
      if (res.status === 'verified') {
        this.setData({ status: 'verified', emailDomain: res.email_domain, validUntil: res.valid_until });
      } else {
        this.setData({ status: 'unverified' });
      }
    } catch (e) {
      this.setData({ status: 'unverified' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async revokeVerification() {
    try {
      await apiRequest({ url: '/profile/revoke', method: 'POST' });
      wx.showToast({ title: t('revoke_success'), icon: 'none' });
      this.loadStatus();
    } catch (e) {
      wx.showToast({ title: t('error'), icon: 'none' });
    }
  },
  async deleteData() {
    try {
      await apiRequest({ url: '/profile', method: 'DELETE' });
      wx.showToast({ title: t('delete_success'), icon: 'none' });
      wx.removeStorageSync('verification_token');
      this.loadStatus();
    } catch (e) {
      wx.showToast({ title: t('error'), icon: 'none' });
    }
  },
  async generateQrToken() {
    try {
      const res: any = await apiRequest({ url: '/verify/qr-token', method: 'POST' });
      this.setData({ qrToken: res.token });
      wx.setClipboardData({ data: res.token, success() { wx.showToast({ title: 'Copied', icon: 'none' }); } });
    } catch (e) {
      wx.showToast({ title: t('error'), icon: 'none' });
    }
  },
  reverify() {
    wx.navigateTo({ url: '/pages/verify/email' });
  }
});
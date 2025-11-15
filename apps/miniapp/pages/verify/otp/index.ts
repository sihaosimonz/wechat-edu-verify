import { t } from '../../../utils/i18n';
import { apiRequest } from '../../../utils/api';

Page({
  data: {
    email: '',
    otp: '',
    t,
    verifying: false
  },
  onLoad(query: any) {
    const email = query?.email ? decodeURIComponent(query.email) : wx.getStorageSync('last_email') || '';
    this.setData({ email });
  },
  onOtpInput(e: any) {
    this.setData({ otp: e.detail.value });
  },
  async verifyCode() {
    const { email, otp } = this.data;
    if (!otp) {
      wx.showToast({ title: t('code_prompt'), icon: 'none' });
      return;
    }
    this.setData({ verifying: true });
    try {
      const res: any = await apiRequest({ url: '/verify/confirm', method: 'POST', data: { email, otp } });
      wx.setStorageSync('verification_token', res.verification_token);
      wx.showToast({ title: t('verified_until') + ': ' + (res.valid_until ? res.valid_until.split('T')[0] : ''), icon: 'none' });
      // Navigate to join page
      wx.reLaunch({ url: '/pages/join/index' });
    } catch (err: any) {
      const msg = err?.error || err?.message || t('otp.invalid_or_expired');
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      this.setData({ verifying: false });
    }
  }
});
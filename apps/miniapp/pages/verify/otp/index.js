const { t } = require('../../../utils/i18n');
const { apiRequest } = require('../../../utils/api');

Page({
  data: {
    email: '',
    otp: '',
    verifying: false,
    ui: {
      code_prompt: t('code_prompt') || 'Enter the code sent to your email',
      verify: t('verify') || 'Verify',
      verified_until: t('verified_until') || 'Verified until',
      otp_invalid_or_expired: t('otp.invalid_or_expired') || 'Invalid or expired code'
    }
  },

  onLoad(query) {
    const email = query && query.email
      ? decodeURIComponent(query.email)
      : (wx.getStorageSync('last_email') || '');
    this.setData({ email });
  },

  onOtpInput(e) {
    this.setData({ otp: e.detail.value });
  },

  async verifyCode() {
    const email = this.data.email;
    const otp = this.data.otp;

    if (!otp) {
      wx.showToast({ title: this.data.ui.code_prompt, icon: 'none' });
      return;
    }

    this.setData({ verifying: true });

    try {
      const res = await apiRequest({
        url: '/verify/confirm',
        method: 'POST',
        data: { email, otp }
      });

      wx.setStorageSync('verification_token', res.verification_token);

      const until = res.valid_until ? String(res.valid_until).split('T')[0] : '';
      wx.showToast({ title: this.data.ui.verified_until + ': ' + until, icon: 'none' });

      wx.reLaunch({ url: '/pages/join/index' });
    } catch (err) {
      const msg = (err && (err.error || err.message)) || this.data.ui.otp_invalid_or_expired;
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      this.setData({ verifying: false });
    }
  }
});

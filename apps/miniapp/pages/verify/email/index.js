const { t } = require('../../../utils/i18n');
const { apiRequest } = require('../../../utils/api');

Page({
  data: {
    email: '',
    t,
    sending: false,
    message: ''
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value });
  },

  async sendCode() {
    const email = (this.data.email || '').trim();
    if (!email) {
      wx.showToast({ title: t('email_prompt'), icon: 'none' });
      return;
    }

    this.setData({ sending: true, message: '' });

    try {
      // Deduplicate repeated taps within ~60s
      const idempotencyKey = Math.random().toString(36).substring(2);

      await apiRequest({
        url: '/verify/request',
        method: 'POST',
        data: { email },
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });

      wx.setStorageSync('last_email', email);
      wx.showToast({ title: t('otp_sent_if_eligible'), icon: 'none' });

      wx.navigateTo({
        url: '/pages/verify/otp?email=' + encodeURIComponent(email)
      });
    } catch (err) {
      const msg = (err && (err.error || err.message)) || t('error');
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      this.setData({ sending: false });
    }
  }
});

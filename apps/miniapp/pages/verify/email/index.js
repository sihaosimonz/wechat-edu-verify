const { t } = require('../../../utils/i18n');
const { apiRequest } = require('../../../utils/api');

Page({
  data: {
    email: '',
    sending: false,
    ui: {
      email_prompt: t('email_prompt') || 'Enter your school email',
      send_code: t('send_code') || 'Send Code',
      otp_sent_if_eligible: t('otp_sent_if_eligible') || 'If eligible, you will receive a code via email.',
      error: t('error') || 'Something went wrong'
    }
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value });
  },

  async sendCode() {
    const email = (this.data.email || '').trim();
    console.log('[email] sendCode tapped:', email);

    if (!email) {
      wx.showToast({ title: this.data.ui.email_prompt, icon: 'none', duration: 4000 });
      return;
    }

    this.setData({ sending: true });

    try {
      const res = await apiRequest({
        url: '/verify/request',
        method: 'POST',
        data: { email },
      });

      wx.setStorageSync('last_email', email);
      const msg = (res && res.message) || this.data.ui.otp_sent_if_eligible;
      wx.showToast({ title: msg, icon: 'none', duration: 2000 });

      // Use full route to avoid routing ambiguity
      wx.navigateTo({
        url: '/pages/verify/otp/index?email=' + encodeURIComponent(email),
      });
    } catch (err) {
      const msg = (err && (err.error || err.message)) || this.data.ui.error;
      console.log('[email] sendCode error:', err);
      wx.showToast({ title: msg, icon: 'none', duration: 2000 });
    } finally {
      this.setData({ sending: false });
    }
  }
});

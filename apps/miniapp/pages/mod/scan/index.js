const { t } = require('../../../utils/i18n');
const { apiRequest } = require('../../../utils/api');

Page({
  data: {
    scanResult: null,
    t
  },

  async onScan() {
    try {
      const res = await wx.scanCode({ scanType: ['qrCode'] });
      const token = res.result;
      const result = await apiRequest({
        url: '/moderation/verify-scan',
        method: 'POST',
        data: { token }
      });
      this.setData({ scanResult: result });
    } catch (e) {
      wx.showToast({ title: t('error'), icon: 'none' });
    }
  }
});

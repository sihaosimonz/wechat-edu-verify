import { t } from '../../../utils/i18n';
import { apiRequest } from '../../../utils/api';

Page({
  data: {
    scanResult: null as any,
    t
  },
  async onScan() {
    try {
      const res = await wx.scanCode({ scanType: ['qrCode'] });
      const token = res.result;
      const result: any = await apiRequest({ url: '/moderation/verify-scan', method: 'POST', data: { token } });
      this.setData({ scanResult: result });
    } catch (e: any) {
      wx.showToast({ title: t('error'), icon: 'none' });
    }
  }
});
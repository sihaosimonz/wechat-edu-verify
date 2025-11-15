import { t } from '../../utils/i18n';

Page({
  data: {
    t
  },
  goToEmail() {
    wx.navigateTo({ url: '/pages/verify/email' });
  }
});
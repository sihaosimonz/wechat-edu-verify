// pages/start/index.js
Page({
  data: {},

  // Navigate to the email input page
  goToEmail() {
    // path matches app.json page entry
    wx.navigateTo({
      url: '/pages/verify/email/index',
    });
  },
});

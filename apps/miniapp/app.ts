App<IAppOption>({
  globalData: {},
  onLaunch() {
    // Perform WeChat login on launch to obtain a session token from the API.
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            const resp = await wx.request({
              url: 'http://localhost:8080/auth/wechat/login',
              method: 'POST',
              data: { code: res.code },
              header: { 'Content-Type': 'application/json' }
            });
            if (resp.statusCode === 200 && resp.data.session_token) {
              wx.setStorageSync('session_token', resp.data.session_token);
              // Optionally store openid if needed
              wx.setStorageSync('openid', resp.data.openid);
            }
          } catch (e) {
            console.error('Login failed', e);
          }
        }
      }
    });
  }
});
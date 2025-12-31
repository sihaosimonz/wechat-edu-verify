App({
  globalData: {},

  onLaunch() {
    console.log('[miniapp] onLaunch (JS entry)');

    wx.login({
      success(res) {
        console.log('[miniapp] wx.login success', res);

        if (!res.code) return;

        wx.request({
          url: 'http://localhost:8080/auth/wechat/login',
          method: 'POST',
          data: { code: res.code },
          header: { 'Content-Type': 'application/json' },

          success(resp) {
            console.log('[miniapp] login resp', resp);

            if (
              resp.statusCode === 200 &&
              resp.data &&
              resp.data.session_token
            ) {
              wx.setStorageSync('session_token', resp.data.session_token);
              wx.setStorageSync('openid', resp.data.openid);
              console.log('[miniapp] session_token saved');
            } else {
              console.error(
                '[miniapp] bad status or data',
                resp.statusCode,
                resp.data
              );
            }
          },

          fail(err) {
            console.error('[miniapp] login request failed', err);
          },
        });
      },

      fail(err) {
        console.error('[miniapp] wx.login failed', err);
      },
    });
  },
});

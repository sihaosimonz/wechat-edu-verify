/**
 * Simple client‑side i18n helper for the mini program. Translates keys to
 * English or Chinese based on the device language setting. Additional
 * languages can be added by extending the `messages` object.
 */
const messages: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome to Verification',
    email_prompt: 'Enter your school email',
    send_code: 'Send Code',
    code_prompt: 'Enter the 6‑digit code sent to your email',
    verify: 'Verify',
    join_group: 'Join Group',
    not_verified: 'You are not verified yet',
    verified_until: 'Verified until',
    revoke: 'Revoke',
    delete_data: 'Delete data',
    loading: 'Loading...'
    , enter_group_id: 'Enter group ID',
    fetch_invite: 'Fetch Invite',
    invite_link: 'Invite Link',
    reverify: 'Re-verify',
    scan_token: 'Show Verification QR',
    revoke_success: 'Verification revoked',
    delete_success: 'Data deleted',
    error: 'Error'
    , otp_sent_if_eligible: 'If eligible, you will receive a code via email.'
  },
  zh: {
    welcome: '欢迎使用验证系统',
    email_prompt: '请输入你的学校邮箱',
    send_code: '发送验证码',
    code_prompt: '请输入邮箱收到的6位验证码',
    verify: '验证',
    join_group: '加入群组',
    not_verified: '你还未通过验证',
    verified_until: '有效期至',
    revoke: '撤销验证',
    delete_data: '删除数据',
    loading: '加载中...'
    , enter_group_id: '输入群组ID',
    fetch_invite: '获取邀请',
    invite_link: '邀请链接',
    reverify: '重新验证',
    scan_token: '出示验证二维码',
    revoke_success: '验证已撤销',
    delete_success: '数据已删除',
    error: '出错了'
    , otp_sent_if_eligible: '如果符合条件，您将收到一封包含验证码的邮件。'
  }
};

function getLang(): 'en' | 'zh' {
  const sys = wx.getSystemInfoSync();
  return sys.language.startsWith('zh') ? 'zh' : 'en';
}

export function t(key: string): string {
  const lang = getLang();
  return messages[lang][key] || messages.en[key] || key;
}
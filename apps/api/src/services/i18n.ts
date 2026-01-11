/**
 * Simple i18n service that loads translation bundles and returns a translator
 * function. Only English and Chinese are supported in this example. Additional
 * languages can be added by extending the `messages` object.
 */

type Lang = 'en' | 'zh';

const messages: Record<Lang, Record<string, string>> = {
  en: {
    'otp.sent_if_eligible': 'If eligible, you will receive a code via email.',
    'otp.invalid_or_expired': 'Invalid or expired code',
    'otp.email_required': 'Please provide a valid email',
    'otp.code_required': 'Please provide the code',
    'otp.not_school_email': 'Email entered is not a school email',
    'rate.too_many_requests': 'Too many requests',
    'rate.resend_wait': 'Please wait before requesting another code',
    'auth.missing_token': 'Missing session token',
    'auth.invalid_token': 'Invalid session token'
  },
  zh: {
    'otp.sent_if_eligible': '如果符合条件，您将收到一封包含验证码的邮件。',
    'otp.invalid_or_expired': '验证码无效或已过期',
    'otp.email_required': '请输入有效的邮箱地址',
    'otp.code_required': '请输入验证码',
    'otp.not_school_email': '电邮地址非学校邮箱',
    'rate.too_many_requests': '请求过多',
    'rate.resend_wait': '请稍后再试',
    'auth.missing_token': '缺少会话令牌',
    'auth.invalid_token': '会话令牌无效'
  }
};

export function getTranslator(lang: string): (key: string) => string {
  const language: Lang = lang && lang.startsWith('zh') ? 'zh' : 'en';
  const bundle = messages[language];
  return (key: string) => {
    return bundle[key] || messages.en[key] || key;
  };
}

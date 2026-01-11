// upon OTP success, this page shows up

const { t } = require('../../utils/i18n');
const { apiRequest } = require('../../utils/api');

Page({
  data: {
    groupId: '',
    invite: null,
    status: 'loading',
    loadingInvite: false,
    validUntil: '',
    ui: {
      loading: t('loading') || 'Loading...',
      not_verified: t('not_verified') || 'You are not verified yet',
      reverify: t('reverify') || 'Re-verify',
      verified_until: t('verified_until') || 'Verified until',
      enter_group_id: t('enter_group_id') || 'Enter group ID',
      fetch_invite: t('fetch_invite') || 'Fetch Invite',
      invite_link: t('invite_link') || 'Invite Link',
      copy: t('copy') || 'Copy',
      copied_invite: t('copied_invite') || 'Copied invite link',
      qr_media_id: t('qr_media_id') || 'QR Media ID',
      error: t('error') || 'Error'
    }
  },

  onLoad() {
    this.checkStatus();
  },

  async checkStatus() {
    try {
      const res = await apiRequest({ url: '/verify/status', method: 'GET' });
      if (res.status === 'verified') {
        this.setData({ status: 'verified', validUntil: this.formatValidUntil(res.valid_until) });
      } else {
        this.setData({ status: 'unverified' });
      }
    } catch (e) {
      this.setData({ status: 'unverified' });
    }
  },

  formatValidUntil(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${hours}:${minutes}, ${year}-${month}-${day}`;
  },

  onGroupIdInput(e) {
    this.setData({ groupId: e.detail.value });
  },

  async fetchInvite() {
    const groupId = (this.data.groupId || '').trim();
    if (!groupId) {
      wx.showToast({ title: this.data.ui.enter_group_id, icon: 'none' });
      return;
    }

    this.setData({ loadingInvite: true });

    try {
      const invite = await apiRequest({
        url: `/groups/${groupId}/invite`,
        method: 'GET'
      });
      this.setData({ invite });
    } catch (err) {
      wx.showToast({ title: (err && err.error) || this.data.ui.error, icon: 'none' });
    } finally {
      this.setData({ loadingInvite: false });
    }
  },

  openInvite() {
    const invite = this.data.invite;
    if (!invite) return;

    if (invite.invite_url) {
      wx.setClipboardData({
        data: invite.invite_url,
        success: () => {
          wx.showToast({ title: this.data.ui.copied_invite, icon: 'none' });
        }
      });
    }
  }
});

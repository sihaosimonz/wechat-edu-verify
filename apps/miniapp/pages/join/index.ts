import { t } from '../../utils/i18n';
import { apiRequest } from '../../utils/api';

Page({
  data: {
    groupId: '',
    invite: null as any,
    status: 'loading',
    t,
    loadingInvite: false
  },
  onLoad() {
    this.checkStatus();
  },
  async checkStatus() {
    try {
      const res: any = await apiRequest({ url: '/verify/status', method: 'GET' });
      if (res.status === 'verified') {
        this.setData({ status: 'verified', validUntil: res.valid_until });
      } else {
        this.setData({ status: 'unverified' });
      }
    } catch (e) {
      this.setData({ status: 'unverified' });
    }
  },
  onGroupIdInput(e: any) {
    this.setData({ groupId: e.detail.value });
  },
  async fetchInvite() {
    const groupId = this.data.groupId.trim();
    if (!groupId) {
      wx.showToast({ title: t('enter_group_id'), icon: 'none' });
      return;
    }
    this.setData({ loadingInvite: true });
    try {
      const invite: any = await apiRequest({ url: `/groups/${groupId}/invite`, method: 'GET' });
      this.setData({ invite });
    } catch (err: any) {
      wx.showToast({ title: err?.error || t('error'), icon: 'none' });
    } finally {
      this.setData({ loadingInvite: false });
    }
  },
  openInvite() {
    const invite = this.data.invite;
    if (!invite) return;
    if (invite.invite_url) {
      wx.setClipboardData({ data: invite.invite_url, success() { wx.showToast({ title: 'Copied invite link', icon: 'none' }); } });
    }
  }
});
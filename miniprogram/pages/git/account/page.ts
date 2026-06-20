// pages/git/account/page.ts
import {
  getCredentials,
  removeCredential,
  getActiveCredentialId,
  setActiveCredentialId,
  PLATFORMS,
  getPlatformConfig,
  getAuthTypeConfig,
  GitCredential,
} from '../../../utils/git-api'

interface CredentialDisplay extends GitCredential {
  platformLabel: string
  platformColor: string
  platformShort: string
  platformBg: string
  authTypeLabel: string
  displayUsername: string
  isActive: boolean
  tokenActiveClass: string
  isNotActive: boolean
}

Page({
  data: {
    credentials: [] as CredentialDisplay[],
    activeCredId: '',
  },

  onShow() {
    this.loadCredentials()
  },

  loadCredentials() {
    const activeId = getActiveCredentialId()
    const list = getCredentials().map(c => this.toDisplay(c, activeId))
    this.setData({ credentials: list, activeCredId: activeId || '' })
  },

  toDisplay(c: GitCredential, activeId: string | null): CredentialDisplay {
    const config = getPlatformConfig(c.platform)!
    const authConfig = getAuthTypeConfig(c.authType)
    const isActive = c.id === activeId
    return {
      ...c,
      platformLabel: config.label,
      platformColor: config.color,
      platformShort: config.shortLabel,
      platformBg: this.hexToBg(config.color),
      authTypeLabel: authConfig?.label || '',
      displayUsername: c.resolvedUsername || c.username || '未验证',
      isActive,
      tokenActiveClass: isActive ? 'token-active' : '',
      isNotActive: !isActive,
    }
  },

  hexToBg(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, 0.1)`
  },

  /** 切换为当前使用账号 */
  onSetActive(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    setActiveCredentialId(id)
    wx.showToast({ title: '已切换', icon: 'success' })
    this.loadCredentials()
    // 延迟返回首页
    setTimeout(() => wx.navigateBack(), 800)
  },

  onAddCredential() {
    wx.showActionSheet({
      itemList: PLATFORMS.map(p => p.label),
      success: (res) => {
        const platform = PLATFORMS[res.tapIndex].value
        wx.navigateTo({ url: `/pages/git/account/edit/page?platform=${platform}` })
      },
    })
  },

  onDeleteCredential(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    const isActive = id === this.data.activeCredId
    wx.showModal({
      title: '确认删除',
      content: isActive ? '此账号当前正在使用，删除后将需要重新选择账号' : '删除后需要重新添加凭证才能访问仓库',
      success: (res) => {
        if (res.confirm) {
          removeCredential(id)
          if (isActive) {
            setActiveCredentialId('')
          }
          this.loadCredentials()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  },

  onEditCredential(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/git/account/edit/page?id=${id}` })
  },
})

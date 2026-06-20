// pages/git/account/edit/page.ts
import { getTokens, addToken, saveTokens, GitToken, PLATFORMS } from '../../../../utils/git-api'

Page({
  data: {
    isEdit: false,
    tokenId: '',
    platform: 'github' as 'github' | 'gitee',
    platformLabel: 'GitHub',
    platformIndex: 0,
    name: '',
    token: '',
    platforms: PLATFORMS,
    saving: false,
    showToken: false,
  },

  toggleToken() {
    this.setData({ showToken: !this.data.showToken })
  },

  onLoad(options: any) {
    if (options.platform) {
      this.setPlatform(options.platform)
    }
    if (options.id) {
      this.loadToken(options.id)
    }
  },

  /** 设置平台并更新 label */
  setPlatform(platform: 'github' | 'gitee') {
    const idx = PLATFORMS.findIndex(p => p.value === platform)
    this.setData({
      platform,
      platformIndex: idx >= 0 ? idx : 0,
      platformLabel: idx >= 0 ? PLATFORMS[idx].label : 'GitHub',
    })
  },

  loadToken(id: string) {
    const token = getTokens().find(t => t.id === id)
    if (token) {
      this.setPlatform(token.platform)
      this.setData({
        isEdit: true,
        tokenId: id,
        name: token.name,
        token: token.token,
      })
    }
  },

  onPlatformChange(e: WechatMiniprogram.Picker.Change) {
    const idx = e.detail.value
    this.setPlatform(PLATFORMS[idx].value)
  },

  onNameInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ name: e.detail.value })
  },

  onTokenInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ token: e.detail.value })
  },

  async onSave() {
    const { platform, name, token, isEdit, tokenId } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入备注名称', icon: 'none' })
      return
    }
    if (!token.trim()) {
      wx.showToast({ title: '请输入令牌', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      if (isEdit) {
        const tokens = getTokens()
        const idx = tokens.findIndex(t => t.id === tokenId)
        if (idx !== -1) {
          tokens[idx].platform = platform
          tokens[idx].name = name.trim()
          tokens[idx].token = token.trim()
          saveTokens(tokens)
        }
      } else {
        addToken({
          id: Date.now().toString(),
          platform,
          name: name.trim(),
          token: token.trim(),
        })
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } finally {
      this.setData({ saving: false })
    }
  },
})

// pages/git/account/page.ts
import { getTokens, removeToken, GitToken, PLATFORMS } from '../../../utils/git-api'

Page({
  data: {
    tokens: [] as GitToken[],
    platforms: PLATFORMS,
  },

  onShow() {
    this.loadTokens()
  },

  loadTokens() {
    this.setData({ tokens: getTokens() })
  },

  onAddToken() {
    wx.showActionSheet({
      itemList: PLATFORMS.map(p => p.label),
      success: (res) => {
        const platform = PLATFORMS[res.tapIndex].value
        wx.navigateTo({ url: `/pages/git/account/edit/page?platform=${platform}` })
      },
    })
  },

  onDeleteToken(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后需要重新添加令牌才能访问仓库',
      success: (res) => {
        if (res.confirm) {
          removeToken(id)
          this.loadTokens()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  },

  onEditToken(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/git/account/edit/page?id=${id}` })
  },
})

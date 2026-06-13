// auth.js
Page({
  data: {
    token: ''
  },

  onInput: function(e) {
    this.setData({
      token: e.detail.value.trim()
    })
  },

  onSubmit: function() {
    const token = this.data.token
    const app = getApp()

    wx.showLoading({
      title: '验证中...',
    })

    // 先将token保存到globalData，以便request函数使用
    app.globalData.token = token
    
    // 验证token是否有效
    app.request('/user')
      .then(() => {
        // token有效，保存到本地存储
        app.setToken(token)
        wx.hideLoading()
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500,
          mask: true,
        })
        // 跳转到首页
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/home/home'
          })
        }, 1500)
      })
      .catch(() => {
        // 验证失败，清除globalData中的token
        app.globalData.token = ''
        wx.hideLoading()
        wx.showToast({
          title: 'Token无效',
          icon: 'none',
          duration: 2000
        })
      })
  },

  onHowToGetToken: function() {
    wx.navigateTo({
      url: 'https://docs.github.com/cn/github/authenticating-to-github/creating-a-personal-access-token'
    })
  }
})
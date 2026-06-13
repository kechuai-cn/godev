// app.js
App({
  globalData: {
    token: '',
    userInfo: null
  },
  onLaunch: function() {
    // 从本地存储获取token
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
    }
  },
  // 请求GitHub API
  request: function(url, method = 'GET', data = {}) {
    const token = this.globalData.token
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://api.github.com${url}`,
        method: method,
        data: data,
        header: {
          'Authorization': token ? `token ${token}` : '',
          'Accept': 'application/vnd.github.v3+json'
        },
        success: res => {
          if (res.statusCode === 401) {
            // token无效，清除本地存储
            wx.removeStorageSync('token')
            this.globalData.token = ''
            reject(new Error('Unauthorized'))
          } else {
            resolve(res.data)
          }
        },
        fail: err => {
          reject(err)
        }
      })
    })
  },
  // 检查是否已授权
  checkAuth: function() {
    return !!this.globalData.token
  },
  // 设置token
  setToken: function(token) {
    this.globalData.token = token
    wx.setStorageSync('token', token)
  },
  // 清除token
  clearToken: function() {
    this.globalData.token = ''
    wx.removeStorageSync('token')
  }
})
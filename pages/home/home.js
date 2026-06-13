// home.js
Page({
  data: {
    isRefreshing: false,
    a: 0,
    repos: [],
    isAuth: false,
    page: 1,
    perPage: 10,
    hasMore: true
  },

  onLoad: function () {
    this.checkAuth()
  },

  onShow: function () {
    // 每次显示页面时检查授权状态
    this.checkAuth()
  },

  onPullDownRefresh: function () {
    this.setData({ isRefreshing: true, a: 1 })
    // 下拉刷新
    this.setData({
      repos: [],
      page: 1,
      hasMore: true
    })
    this.loadRepos(true)
  },

  onReachBottom: function () {
    // 上滑加载更多
    if (this.data.hasMore) {
      this.loadRepos(false)
    }
  },

  // 检查授权状态
  checkAuth: function () {
    const app = getApp()
    const isAuth = app.checkAuth()
    this.setData({
      isAuth: isAuth
    })

    if (isAuth) {
      this.loadRepos(true)
    }
  },

  // 加载仓库列表
  loadRepos(refresh) {
    const app = getApp()
    const page = refresh ? 1 : this.data.page + 1

    if (!refresh) {
      wx.showLoading({
        title: '加载中...',
      })
    }

    app.request(`/user/repos?page=${page}&per_page=${this.data.perPage}&sort=updated`)
      .then(res => {
        if (refresh) {
          this.setData({ isRefreshing:false})
        } else {
          wx.hideLoading()
        }

        if (res.length === 0) {
          this.setData({
            hasMore: false
          })
          return
        }

        // 格式化仓库数据
        const formattedRepos = res.map(repo => ({
          id: repo.id,
          full_name: repo.full_name,
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          updated_at: this.formatDate(repo.updated_at),
          owner: repo.owner.login,
          private: repo.private
        }))

        this.setData({
          repos: refresh ? formattedRepos : [...this.data.repos, ...formattedRepos],
          page: page,
          hasMore: res.length === this.data.perPage
        })
      })
      .catch(err => {
        if (refresh) {
          this.setData({ isRefreshing:false})
        } else {
          wx.hideLoading()
        }
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 格式化日期
  formatDate: function (dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString()
    }
  },

  // 跳转到仓库详情
  goToRepo: function (e) {
    const repo = e.currentTarget.dataset.repo
    wx.navigateTo({
      url: `/pages/repo/repo?owner=${repo.owner}&repo=${repo.name}`
    })
  },

  // 跳转到授权页面
  goToAuth: function () {
    wx.navigateTo({
      url: '/pages/auth/auth'
    })
  }
})
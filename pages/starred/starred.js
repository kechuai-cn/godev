// starred.js
Page({
  data: {
    repos: [],
    isAuth: false,
    isLoading: false,
    isRefreshing: false,
    page: 1,
    perPage: 10,
    hasMore: true
  },

  onLoad: function() {
    this.checkAuth()
  },

  onShow: function() {
    // 每次显示页面时检查授权状态并刷新数据
    this.checkAuth()
  },

  onPullDownRefresh: function() {
    this.setData({ isRefreshing: true })
    // 下拉刷新
    this.setData({
      repos: [],
      page: 1,
      hasMore: true
    })
    this.loadStarredRepos(true)
  },

  onReachBottom: function() {
    // 上滑加载更多
    if (this.data.hasMore) {
      this.loadStarredRepos(false)
    }
  },

  // 检查授权状态
  checkAuth: function() {
    const app = getApp()
    const isAuth = app.checkAuth()
    this.setData({
      isAuth: isAuth
    })
    
    if (isAuth) {
      this.loadStarredRepos(true)
    }
  },

  // 加载收藏的仓库列表
  loadStarredRepos: function(refresh) {
    const app = getApp()
    const page = refresh ? 1 : this.data.page + 1
    
    if (!refresh) {
      wx.showLoading({
        title: '加载中...',
      })
    }

    app.request(`/user/starred?page=${page}&per_page=${this.data.perPage}&sort=updated`)
      .then(res => {
        if (refresh) {
          this.setData({ isRefreshing: false })
          wx.stopPullDownRefresh()
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
          owner: repo.owner.login,
          starred: true
        }))

        this.setData({
          repos: refresh ? formattedRepos : [...this.data.repos, ...formattedRepos],
          page: page,
          hasMore: res.length === this.data.perPage
        })
      })
      .catch(err => {
        if (refresh) {
          this.setData({ isRefreshing: false })
          wx.stopPullDownRefresh()
        } else {
          wx.hideLoading()
        }
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 取消收藏
  unstarRepo: function(e) {
    e.stopPropagation() // 阻止事件冒泡
    const repo = e.currentTarget.dataset.repo
    const app = getApp()

    wx.showLoading({
      title: '取消收藏中...',
    })

    app.request(`/user/starred/${repo.full_name}`, 'DELETE')
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '取消收藏成功',
          icon: 'success'
        })

        // 从列表中移除该仓库
        const repos = this.data.repos
        const index = repos.findIndex(item => item.id === repo.id)
        if (index !== -1) {
          repos.splice(index, 1)
          this.setData({
            repos: repos
          })
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({
          title: '取消收藏失败',
          icon: 'none'
        })
      })
  },

  // 跳转到仓库详情
  goToRepo: function(e) {
    const repo = e.currentTarget.dataset.repo
    wx.navigateTo({
      url: `/pages/repo/repo?owner=${repo.owner}&repo=${repo.name}`
    })
  },

  // 跳转到授权页面
  goToAuth: function() {
    wx.navigateTo({
      url: '/pages/auth/auth'
    })
  }
})
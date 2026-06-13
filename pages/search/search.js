// search.js
Page({
  data: {
    keyword: '',
    repos: [],
    isSearching: false,
    isRefreshing: false,
    page: 1,
    perPage: 10,
    hasMore: true
  },

  onInput: function(e) {
    this.setData({
      keyword: e.detail.value.trim()
    })
  },

  onSearch: function() {
    const keyword = this.data.keyword
    if (!keyword) return

    // 重置搜索状态
    this.setData({
      repos: [],
      page: 1,
      hasMore: true,
      isSearching: true
    })

    this.loadSearchResults(true)
  },

  onPullDownRefresh: function() {
    if (!this.data.keyword) {
      wx.stopPullDownRefresh()
      return
    }
    this.setData({ isRefreshing: true })
    // 下拉刷新
    this.setData({
      repos: [],
      page: 1,
      hasMore: true
    })
    this.loadSearchResults(true)
  },

  onReachBottom: function() {
    // 上滑加载更多
    if (this.data.hasMore && this.data.keyword) {
      this.loadSearchResults(false)
    }
  },

  // 加载搜索结果
  loadSearchResults: function(refresh) {
    const app = getApp()
    const keyword = this.data.keyword
    const page = refresh ? 1 : this.data.page + 1

    if (!refresh) {
      wx.showLoading({
        title: '加载中...',
      })
    }

    app.request(`/search/repositories?q=${keyword}&page=${page}&per_page=${this.data.perPage}`)
      .then(res => {
        if (refresh) {
          this.setData({ isRefreshing: false })
          wx.stopPullDownRefresh()
        } else {
          wx.hideLoading()
        }
        this.setData({
          isSearching: false
        })

        if (res.items.length === 0) {
          this.setData({
            hasMore: false
          })
          return
        }

        // 格式化仓库数据
        const formattedRepos = res.items.map(repo => ({
          id: repo.id,
          full_name: repo.full_name,
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          owner: repo.owner.login,
          starred: false // 默认未收藏，需要单独检查
        }))

        // 检查每个仓库是否已收藏
        this.checkStarStatus(formattedRepos).then(reposWithStarStatus => {
          this.setData({
            repos: refresh ? reposWithStarStatus : [...this.data.repos, ...reposWithStarStatus],
            page: page,
            hasMore: res.items.length === this.data.perPage
          })
        })
      })
      .catch(err => {
        if (refresh) {
          this.setData({ isRefreshing: false })
          wx.stopPullDownRefresh()
        } else {
          wx.hideLoading()
        }
        this.setData({
          isSearching: false
        })
        wx.showToast({
          title: '搜索失败',
          icon: 'none'
        })
      })
  },

  // 检查仓库收藏状态
  checkStarStatus: function(repos) {
    const app = getApp()
    const promises = repos.map(repo => {
      return app.request(`/user/starred/${repo.full_name}`, 'GET')
        .then(() => {
          return {
            ...repo,
            starred: true
          }
        })
        .catch(() => {
          return {
            ...repo,
            starred: false
          }
        })
    })
    return Promise.all(promises)
  },

  // 切换收藏状态
  toggleStar: function(e) {
    e.stopPropagation() // 阻止事件冒泡
    const repo = e.currentTarget.dataset.repo
    const app = getApp()
    const isStarred = repo.starred

    wx.showLoading({
      title: isStarred ? '取消收藏中...' : '收藏中...',
    })

    const method = isStarred ? 'DELETE' : 'PUT'
    app.request(`/user/starred/${repo.full_name}`, method)
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: isStarred ? '取消收藏成功' : '收藏成功',
          icon: 'success'
        })

        // 更新本地仓库列表中的收藏状态
        const repos = this.data.repos
        const index = repos.findIndex(item => item.id === repo.id)
        if (index !== -1) {
          repos[index].starred = !isStarred
          this.setData({
            repos: repos
          })
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({
          title: isStarred ? '取消收藏失败' : '收藏失败',
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
  }
})
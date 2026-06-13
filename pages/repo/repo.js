// repo.js
Page({
  data: {
    owner: '',
    repo: '',
    repoInfo: null,
    files: [],
    dirs: [],
    isLoading: false,
    currentPath: '',
    breadcrumbs: [],
    ref: 'master' // 默认分支
  },

  onLoad: function (options) {
    this.setData({
      owner: options.owner,
      repo: options.repo
    })
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: options.repo
    })
    // 加载仓库信息和根目录文件
    this.loadRepoInfo().then((res) => {
      this.loadFiles('')
    })
  },

  // 加载仓库基本信息
  loadRepoInfo() {
    const app = getApp()
    const { owner, repo } = this.data

    return Promise.all([
      // 获取仓库基本信息
      app.request(`/repos/${owner}/${repo}`),
      // 检查是否已收藏
      app.request(`/user/starred/${owner}/${repo}`, 'GET').then(() => true).catch(() => false)
    ])
      .then(([repoData, starred]) => {
        const repoInfo = {
          id: repoData.id,
          full_name: repoData.full_name,
          name: repoData.name,
          description: repoData.description,
          language: repoData.language,
          stargazers_count: repoData.stargazers_count,
          forks_count: repoData.forks_count,
          updated_at: this.formatDate(repoData.updated_at),
          starred: starred,
          default_branch: repoData.default_branch,
        }
        this.setData({
          repoInfo: repoInfo
        })
        return repoInfo
      })
      .catch(err => {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        return Promise.reject(err)
      })
  },

  // 加载文件列表
  loadFiles: function (path) {
    const app = getApp()
    const { owner, repo } = this.data
    const ref = this.data.repoInfo.default_branch

    this.setData({
      isLoading: true,
      currentPath: path
    })

    // 更新面包屑导航
    this.updateBreadcrumbs(path)

    // 构建正确的API URL，避免空路径时出现多余斜杠
    const url = path ? `/repos/${owner}/${repo}/contents/${path}?ref=${ref}` : `/repos/${owner}/${repo}/contents?ref=${ref}`
    app.request(url)
      .then(res => {
        this.setData({
          isLoading: false
        })

        // 分离目录和文件
        const dirs = res.filter(item => item.type === 'dir')
        const files = res.filter(item => item.type === 'file')

        this.setData({
          dirs: dirs,
          files: files
        })
      })
      .catch(err => {
        this.setData({
          isLoading: false
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 更新面包屑导航
  updateBreadcrumbs: function (path) {
    const breadcrumbs = [{ name: '根目录', path: '' }]

    if (path) {
      const pathParts = path.split('/')
      let currentPath = ''

      pathParts.forEach(part => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        breadcrumbs.push({
          name: part,
          path: currentPath
        })
      })
    }

    this.setData({
      breadcrumbs: breadcrumbs
    })
  },

  // 跳转到子目录
  goToDir: function (e) {
    const file = e.currentTarget.dataset.file
    const newPath = this.data.currentPath ? `${this.data.currentPath}/${file.name}` : file.name
    this.loadFiles(newPath)
  },

  // 跳转到文件详情
  goToFile: function (e) {
    const file = e.currentTarget.dataset.file
    wx.navigateTo({
      url: `/pages/file/file?owner=${this.data.owner}&repo=${this.data.repo}&path=${file.path}&name=${file.name}&sha=${file.sha}`
    })
  },

  // 跳转到指定路径
  goToPath: function (e) {
    const path = e.currentTarget.dataset.path
    this.loadFiles(path)
  },

  // 切换收藏状态
  toggleStar: function () {
    const app = getApp()
    const { owner, repo, repoInfo } = this.data
    const isStarred = repoInfo.starred

    wx.showLoading({
      title: isStarred ? '取消收藏中...' : '收藏中...',
    })

    const method = isStarred ? 'DELETE' : 'PUT'
    app.request(`/user/starred/${owner}/${repo}`, method)
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: isStarred ? '取消收藏成功' : '收藏成功',
          icon: 'success'
        })

        // 更新本地收藏状态
        this.setData({
          'repoInfo.starred': !isStarred
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({
          title: isStarred ? '取消收藏失败' : '收藏失败',
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
  }
})
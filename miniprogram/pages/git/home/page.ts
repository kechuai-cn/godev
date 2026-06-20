// pages/git/home/page.ts
import {
  getTokens,
  getTokenByPlatform,
  fetchRepos,
  fetchUser,
  formatTime,
  GitToken,
  GitRepo,
  PLATFORMS,
} from '../../../utils/git-api'

/** 语言 → 颜色映射 */
const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
}

interface RepoDisplay extends GitRepo {
  avatarText: string
  avatarBg: string
  langColor: string
  updatedAtFormatted: string
}

Page({
  data: {
    platforms: PLATFORMS,
    currentPlatform: 'github' as 'github' | 'gitee',
    token: null as GitToken | null,
    username: '',
    repos: [] as RepoDisplay[],
    filteredRepos: [] as RepoDisplay[],
    searchKey: '',
    loading: false,
    error: '',
    showEmpty: true,
    // 预计算视图标志（WXML 不支持复杂表达式）
    viewState: 'empty' as 'empty' | 'loading' | 'list' | 'none',
    showNoResult: false,
    currentPlatformLabel: 'GitHub',
    tabs: [] as { value: string; label: string; color: string; isActive: boolean }[],
    isEmpty: true,
    isLoading: false,
    isList: false,
    accountColor: '#f4430c',
    accountInitial: '?',
  },

  onLoad() {
    this.selectPlatform('github')
  },

  onShow() {
    this.checkToken()
  },

  onPullDownRefresh() {
    this.loadRepos().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 检查当前平台是否有令牌 */
  checkToken() {
    const platform = this.data.currentPlatform
    const label = platform === 'github' ? 'GitHub' : 'Gitee'
    const token = getTokenByPlatform(platform)
    const storedName = token?.username || ''
    this.setData({
      token,
      username: storedName,
      currentPlatformLabel: label,
      showEmpty: !token,
      error: '',
      isEmpty: !token,
      isLoading: false,
      isList: false,
      showNoResult: false,
      accountColor: platform === 'github' ? '#f4430c' : '#c71d23',
      accountInitial: storedName ? storedName[0].toUpperCase() : '?',
    })
    if (token) {
      this.loadRepos()
    }
  },

  /** 切换平台 Tab */
  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const platform = e.currentTarget.dataset.platform as 'github' | 'gitee'
    if (platform === this.data.currentPlatform) return
    this.selectPlatform(platform)
  },

  /** 重新计算 tabs（含 isActive） */
  computeTabs() {
    const { currentPlatform } = this.data
    const tabs = PLATFORMS.map(p => ({
      ...p,
      isActive: p.value === currentPlatform,
    }))
    this.setData({ tabs })
  },

  selectPlatform(platform: 'github' | 'gitee') {
    const label = platform === 'github' ? 'GitHub' : 'Gitee'
    this.setData({
      currentPlatform: platform,
      currentPlatformLabel: label,
      searchKey: '',
      viewState: 'empty',
    })
    this.computeTabs()
    this.checkToken()
  },

  /** 加载仓库列表 */
  async loadRepos() {
    const { token, currentPlatform } = this.data
    if (!token) return

    this.setData({ isLoading: true, error: '', showNoResult: false })
    try {
      const [user, repos] = await Promise.all([
        fetchUser(token.token, currentPlatform),
        fetchRepos(token.token, currentPlatform),
      ])
      // 更新 token 中的 username（首次获取）
      if (!token.username) {
        token.username = user.username
        const tokens = getTokens()
        const idx = tokens.findIndex(t => t.id === token.id)
        if (idx !== -1) {
          tokens[idx].username = user.username
          wx.setStorageSync('git_tokens', tokens)
        }
      }
      const displayRepos = repos
        .map(r => toDisplayRepo(r))
        .sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      const filtered = this.applyFilter(displayRepos, this.data.searchKey)
      const hasKey = this.data.searchKey.trim().length > 0
      this.setData({
        username: user.username,
        repos: displayRepos,
        filteredRepos: filtered,
        isEmpty: false,
        isLoading: false,
        isList: filtered.length > 0,
        showNoResult: hasKey && filtered.length === 0,
        accountColor: currentPlatform === 'github' ? '#f4430c' : '#c71d23',
        accountInitial: (user.username[0] || '?').toUpperCase(),
      })
    } catch (err: any) {
      this.setData({ error: err.message || '加载失败', isLoading: false, isList: false })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  /** 搜索输入 */
  onSearchInput(e: WechatMiniprogram.Input.Input) {
    const key = e.detail.value
    const filtered = this.applyFilter(this.data.repos, key)
    const hasKey = key.trim().length > 0
    this.setData({
      searchKey: key,
      filteredRepos: filtered,
      isList: filtered.length > 0,
      showNoResult: hasKey && filtered.length === 0 && !this.data.error,
    })
  },

  applyFilter(repos: RepoDisplay[], key: string): RepoDisplay[] {
    if (!key.trim()) return repos
    const k = key.toLowerCase()
    return repos.filter(r =>
      r.name.toLowerCase().includes(k) ||
      r.fullName.toLowerCase().includes(k) ||
      (r.description && r.description.toLowerCase().includes(k))
    )
  },

  /** 去配置令牌 */
  goToAccount() {
    wx.navigateTo({ url: '/pages/git/account/page' })
  },

  /** 进入仓库详情 */
  onRepoTap(e: WechatMiniprogram.TouchEvent) {
    const repo = e.currentTarget.dataset.repo as RepoDisplay
    const owner = repo.fullName.split('/')[0]
    wx.navigateTo({
      url: `/pages/git/repo/page?platform=${repo.platform}&owner=${owner}&repo=${repo.name}`,
    })
  },
})

/** 将 GitRepo 转为显示用对象（预计算所有模板需要的值） */
function toDisplayRepo(r: GitRepo): RepoDisplay {
  return {
    ...r,
    avatarText: (r.name[0] || 'R').toUpperCase(),
    avatarBg: r.platform === 'github' ? '#f4430c' : '#c71d23',
    langColor: LANG_COLOR[r.language] || '#888888',
    updatedAtFormatted: formatTime(r.updatedAt),
  }
}

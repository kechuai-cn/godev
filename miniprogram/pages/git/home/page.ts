// pages/git/home/page.ts
import {
  getCredentials,
  getActiveCredential,
  getActiveCredentialId,
  setActiveCredentialId,
  fetchReposPage,
  fetchUser,
  formatTime,
  GitCredential,
  GitRepo,
  RepoPage,
  PLATFORMS,
  getPlatformConfig,
  PlatformType,
} from '../../../utils/git-api'

/** 语言 → 颜色映射 */
const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
}

/** 平台颜色映射 */
const PLATFORM_COLOR: Record<string, string> = {
  github: '#f4430c',
  gitee: '#c71d23',
  gitlab: '#fc6d26',
}

interface RepoDisplay extends GitRepo {
  avatarText: string
  avatarBg: string
  langColor: string
  updatedAtFormatted: string
}

interface PlatformInfo {
  label: string
  color: string
}

Page({
  data: {
    // 活跃凭证
    activeCred: null as GitCredential | null,
    activeCredId: '',
    accountName: '',
    accountPlatform: '' as '',
    accountPlatformLabel: '',
    accountPlatformColor: '',
    accountInitial: '',

    // 仓库列表
    repos: [] as RepoDisplay[],
    filteredRepos: [] as RepoDisplay[],
    searchKey: '',

    // 分页
    page: 1,
    perPage: 10,
    hasMore: false,
    loadingMore: false,

    // 状态
    error: '',
    isEmpty: true,       // 无活跃凭证
    isLoading: false,     // 首次加载中
    isList: false,        // 列表有数据
    isLoadingMore: false,  // 上拉加载中
    showNoResult: false,  // 搜索无结果
    showLoadEnd: false,   // 显示"没有更多"
  },

  onLoad() {
    this.initActiveCred()
  },

  onShow() {
    this.initActiveCred()
  },

  onPullDownRefresh() {
    this.loadRepos().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.loadMore()
    }
  },

  /** 初始化活跃凭证 */
  initActiveCred() {
    let cred = getActiveCredential()
    const allCreds = getCredentials()

    if (!cred && allCreds.length > 0) {
      // 没有活跃凭证但有凭证，自动选第一个
      cred = allCreds[0]
      setActiveCredentialId(cred.id)
    }

    if (!cred) {
      this.setData({
        activeCred: null,
        activeCredId: '',
        accountName: '',
        accountPlatformLabel: '',
        isEmpty: true,
        isList: false,
        repos: [],
        filteredRepos: [],
      })
      return
    }

    const platformConfig = getPlatformConfig(cred.platform)!
    const displayUsername = cred.resolvedUsername || cred.username || '未验证'

    this.setData({
      activeCred: cred,
      activeCredId: cred.id,
      accountName: cred.name,
      accountPlatform: cred.platform,
      accountPlatformLabel: platformConfig.label,
      accountPlatformColor: platformConfig.color,
      accountInitial: displayUsername ? displayUsername[0].toUpperCase() : '?',
      isEmpty: false,
      error: '',
    })

    this.loadRepos()
  },

  /** 加载首页（第 1 页） */
  async loadRepos() {
    const cred = getActiveCredential()
    if (!cred) return

    this.setData({ isLoading: true, error: '', showNoResult: false })
    try {
      const { repos: rawRepos, hasMore } = await fetchReposPage(cred, 1, this.data.perPage)
      const displayRepos = rawRepos.map(r => toDisplayRepo(r))
      const filtered = this.applyFilter(displayRepos, this.data.searchKey)
      this.setData({
        page: 1,
        repos: displayRepos,
        filteredRepos: filtered,
        hasMore,
        isLoading: false,
        isList: displayRepos.length > 0,
        showNoResult: false,
        showLoadEnd: !hasMore && filtered.length > 0,
      })
    } catch (err: any) {
      this.setData({
        error: err.message || '加载失败',
        isLoading: false,
        isList: false,
      })
    }
  },

  /** 加载更多（下一页） */
  async loadMore() {
    const cred = getActiveCredential()
    if (!cred || this.data.isLoadingMore) return

    const nextPage = this.data.page + 1
    this.setData({ isLoadingMore: true })

    try {
      const { repos, hasMore } = await fetchReposPage(cred, nextPage, this.data.perPage)
      const newDisplay = repos.map(r => toDisplayRepo(r))
      const merged = [...this.data.repos, ...newDisplay]
      const filtered = this.applyFilter(merged, this.data.searchKey)

      this.setData({
        page: nextPage,
        repos: merged,
        filteredRepos: filtered,
        hasMore,
        isLoadingMore: false,
        showLoadEnd: !hasMore && filtered.length > 0,
      })
    } catch (err: any) {
      this.setData({ isLoadingMore: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
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
      showNoResult: hasKey && filtered.length === 0 && !this.data.error,
    })
  },

  /** 清空搜索 */
  onClearSearch() {
    this.setData({
      searchKey: '',
      filteredRepos: this.data.repos,
      showNoResult: false,
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

  /** 去账号管理页 */
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

/** 将 GitRepo 转为显示用对象 */
function toDisplayRepo(r: GitRepo): RepoDisplay {
  return {
    ...r,
    avatarText: (r.name[0] || 'R').toUpperCase(),
    avatarBg: PLATFORM_COLOR[r.platform] || '#888888',
    langColor: LANG_COLOR[r.language] || '#888888',
    updatedAtFormatted: formatTime(r.updatedAt),
  }
}

// pages/git/home/page.ts
import { definePage, ref, computed, onShow, onPullDownRefresh, onReachBottom } from '@vue-mini/core'
import {
  getCredentials,
  getActiveCredential,
  setActiveCredentialId,
  fetchReposPage,
  formatTime,
  GitCredential,
  GitRepo,
  getPlatformConfig,
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

export default definePage(() => {
  // ======================== 响应式状态 ========================

  // 活跃凭证
  const activeCred = ref<GitCredential | null>(null)
  const activeCredId = ref('')
  const accountName = ref('')
  const accountPlatform = ref('')
  const accountPlatformLabel = ref('')
  const accountPlatformColor = ref('')
  const accountInitial = ref('')

  // 仓库列表
  const repos = ref<RepoDisplay[]>([])
  const searchKey = ref('')

  // 分页
  const page = ref(1)
  const perPage = 10
  const hasMore = ref(false)

  // 状态
  const error = ref('')
  const isEmpty = ref(true)
  const isLoading = ref(false)
  const isList = ref(false)
  const isLoadingMore = ref(false)
  const showNoResult = ref(false)
  const showLoadEnd = ref(false)

  // ======================== 计算属性 ========================

  /** 根据 searchKey 自动过滤仓库列表 */
  const filteredRepos = computed(() => {
    const key = searchKey.value.trim()
    if (!key) return repos.value
    const k = key.toLowerCase()
    return repos.value.filter(
      r =>
        r.name.toLowerCase().includes(k) ||
        r.fullName.toLowerCase().includes(k) ||
        (r.description && r.description.toLowerCase().includes(k)),
    )
  })

  // ======================== 核心逻辑 ========================

  function initActiveCred() {
    let cred = getActiveCredential()
    const allCreds = getCredentials()

    if (!cred && allCreds.length > 0) {
      cred = allCreds[0]
      setActiveCredentialId(cred.id)
    }

    if (!cred) {
      activeCred.value = null
      activeCredId.value = ''
      accountName.value = ''
      accountPlatformLabel.value = ''
      isEmpty.value = true
      isList.value = false
      repos.value = []
      return
    }

    const platformConfig = getPlatformConfig(cred.platform)!
    const displayUsername = cred.resolvedUsername || cred.username || '未验证'

    activeCred.value = cred
    activeCredId.value = cred.id
    accountName.value = cred.name
    accountPlatform.value = cred.platform
    accountPlatformLabel.value = platformConfig.label
    accountPlatformColor.value = platformConfig.color
    accountInitial.value = displayUsername ? displayUsername[0].toUpperCase() : '?'
    isEmpty.value = false
    error.value = ''

    loadRepos()
  }

  async function loadRepos() {
    const cred = getActiveCredential()
    if (!cred) return

    isLoading.value = true
    error.value = ''
    showNoResult.value = false
    try {
      const { repos: rawRepos, hasMore: more } = await fetchReposPage(cred, 1, perPage)
      const displayRepos = rawRepos.map(r => toDisplayRepo(r))
      page.value = 1
      repos.value = displayRepos
      hasMore.value = more
      isLoading.value = false
      isList.value = displayRepos.length > 0
      showNoResult.value = false
      showLoadEnd.value = !more && displayRepos.length > 0
    } catch (err: any) {
      error.value = err.message || '加载失败'
      isLoading.value = false
      isList.value = false
    }
  }

  async function loadMore() {
    const cred = getActiveCredential()
    if (!cred || isLoadingMore.value) return

    const nextPage = page.value + 1
    isLoadingMore.value = true

    try {
      const { repos: newRepos, hasMore: more } = await fetchReposPage(cred, nextPage, perPage)
      const newDisplay = newRepos.map(r => toDisplayRepo(r))
      const merged = [...repos.value, ...newDisplay]
      page.value = nextPage
      repos.value = merged
      hasMore.value = more
      isLoadingMore.value = false
      showLoadEnd.value = !more
    } catch (err: any) {
      isLoadingMore.value = false
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  }

  // ======================== 事件处理 ========================

  function onSearchInput(e: WechatMiniprogram.Input) {
    const key = e.detail.value
    searchKey.value = key
    const hasKey = key.trim().length > 0
    // filteredRepos 是 computed，会自动更新；这里手动更新 showNoResult
    const filtered = filteredRepos.value
    showNoResult.value = hasKey && filtered.length === 0 && !error.value
  }

  function onClearSearch() {
    searchKey.value = ''
    showNoResult.value = false
  }

  function goToAccount() {
    wx.navigateTo({ url: '/pages/git/credential/page' })
  }

  function onRepoTap(e: WechatMiniprogram.TouchEvent) {
    const repo = e.currentTarget.dataset.repo as RepoDisplay
    const owner = repo.fullName.split('/')[0]
    wx.navigateTo({
      url: `/pages/git/repo/page?platform=${repo.platform}&owner=${owner}&repo=${repo.name}`,
    })
  }

  // ======================== 生命周期 ========================

  onShow(() => {
    initActiveCred()
  })

  onPullDownRefresh(() => {
    loadRepos().finally(() => {
      wx.stopPullDownRefresh()
    })
  })

  onReachBottom(() => {
    if (hasMore.value && !isLoadingMore.value) {
      loadMore()
    }
  })

  // ======================== 导出到模板 ========================

  return {
    // 状态（非函数值 → 自动同步到 data）
    activeCred,
    activeCredId,
    accountName,
    accountPlatform,
    accountPlatformLabel,
    accountPlatformColor,
    accountInitial,
    repos,
    searchKey,
    page,
    hasMore,
    error,
    isEmpty,
    isLoading,
    isList,
    isLoadingMore,
    showNoResult,
    showLoadEnd,
    filteredRepos,

    // 方法（函数值 → 自动绑定为页面方法）
    onSearchInput,
    onClearSearch,
    goToAccount,
    onRepoTap,
    loadRepos,
    loadMore,
  }
})

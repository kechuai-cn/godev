// miniprogram/utils/git-api.ts
// Git 多平台 API 封装（GitHub / Gitee）

export interface GitToken {
  id: string
  platform: 'github' | 'gitee'
  name: string
  token: string
  username?: string
}

export interface GitRepo {
  id: number
  platform: 'github' | 'gitee'
  name: string
  fullName: string
  description: string
  private: boolean
  stars: number
  language: string
  updatedAt: string
  url: string
  defaultBranch: string
  avatarUrl: string
}

export interface GitUser {
  platform: 'github' | 'gitee'
  username: string
  avatarUrl: string
  name: string
}

const STORAGE_KEY = 'git_tokens'

/** 获取所有令牌 */
export function getTokens(): GitToken[] {
  try {
    return wx.getStorageSync(STORAGE_KEY) || []
  } catch {
    return []
  }
}

/** 保存令牌列表 */
export function saveTokens(tokens: GitToken[]): void {
  wx.setStorageSync(STORAGE_KEY, tokens)
}

/** 添加令牌 */
export function addToken(token: GitToken): void {
  const tokens = getTokens()
  tokens.push(token)
  saveTokens(tokens)
}

/** 删除令牌 */
export function removeToken(id: string): void {
  const tokens = getTokens().filter(t => t.id !== id)
  saveTokens(tokens)
}

/** 获取指定平台的令牌 */
export function getTokenByPlatform(platform: 'github' | 'gitee'): GitToken | undefined {
  return getTokens().find(t => t.platform === platform)
}

/** 平台列表（供 UI 使用） */
export const PLATFORMS = [
  { value: 'github', label: 'GitHub', color: '#f4430c' },
  { value: 'gitee', label: 'Gitee', color: '#c71d23' },
]

/** 平台配置 */
const PLATFORM_CONFIG = {
  github: {
    baseUrl: 'https://api.github.com',
    authHeader: (token: string) => ({ Authorization: `token ${token}` }),
  },
  gitee: {
    baseUrl: 'https://gitee.com/api/v5',
    authHeader: (token: string) => ({ Authorization: `token ${token}` }),
  },
}

/** 通用请求封装 */
function request<T>(url: string, token: string, platform: 'github' | 'gitee'): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      header: {
        ...PLATFORM_CONFIG[platform].authHeader(token),
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GoDev-Miniprogram',
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else if (res.statusCode === 401) {
          reject(new Error('令牌无效或已过期，请重新配置'))
        } else {
          reject(new Error(`请求失败 (${res.statusCode})`))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

/** 获取用户信息 */
export async function fetchUser(token: string, platform: 'github' | 'gitee'): Promise<GitUser> {
  if (platform === 'github') {
    const url = `${PLATFORM_CONFIG.github.baseUrl}/user`
    const data = await request<any>(url, token, 'github')
    return {
      platform: 'github',
      username: data.login,
      avatarUrl: data.avatar_url,
      name: data.name || data.login,
    }
  } else {
    const url = `${PLATFORM_CONFIG.gitee.baseUrl}/user`
    const data = await request<any>(url, token, 'gitee')
    return {
      platform: 'gitee',
      username: data.login,
      avatarUrl: data.avatar_url,
      name: data.name || data.login,
    }
  }
}

/** 获取仓库列表（含组织仓库） */
export async function fetchRepos(token: string, platform: 'github' | 'gitee'): Promise<GitRepo[]> {
  if (platform === 'github') {
    return fetchGitHubRepos(token)
  } else {
    return fetchGiteeRepos(token)
  }
}

async function fetchGitHubRepos(token: string): Promise<GitRepo[]> {
  const url = `${PLATFORM_CONFIG.github.baseUrl}/user/repos?per_page=100&type=all&sort=updated`
  const data = await request<any[]>(url, token, 'github')
  return data.map(normalizeGitHubRepo)
}

async function fetchGiteeRepos(token: string): Promise<GitRepo[]> {
  const url = `${PLATFORM_CONFIG.gitee.baseUrl}/user/repos?per_page=100&type=all&sort=updated`
  const data = await request<any[]>(url, token, 'gitee')
  return data.map(normalizeGiteeRepo)
}

function normalizeGitHubRepo(r: any): GitRepo {
  return {
    id: r.id,
    platform: 'github',
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    private: r.private,
    stars: r.stargazers_count || 0,
    language: r.language || '',
    updatedAt: r.updated_at,
    url: r.html_url,
    defaultBranch: r.default_branch || 'main',
    avatarUrl: r.owner?.avatar_url || '',
  }
}

function normalizeGiteeRepo(r: any): GitRepo {
  return {
    id: r.id,
    platform: 'gitee',
    name: r.name,
    fullName: r.full_name || r.name,
    description: r.description || '',
    private: r.private,
    stars: r.stargazers_count || 0,
    language: r.language || '',
    updatedAt: r.updated_at,
    url: r.html_url || r.url || '',
    defaultBranch: r.default_branch || 'master',
    avatarUrl: r.owner?.avatar_url || '',
  }
}

/** 格式化时间 */
export function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}天前`
  return iso.slice(0, 10)
}

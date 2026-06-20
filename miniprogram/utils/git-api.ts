// miniprogram/utils/git-api.ts
// Git 多平台 API 封装（GitHub / Gitee / GitLab 私有部署）
// 支持多种认证方式：Access Token、用户名密码

// ============================================================
// 类型定义
// ============================================================

/** 支持的平台类型 */
export type PlatformType = 'github' | 'gitee' | 'gitlab'

/** 认证方式 */
export type AuthType = 'access_token' | 'username_password'

/** 平台配置 */
export interface PlatformConfig {
  value: PlatformType
  label: string
  color: string
  shortLabel: string          // GH / GT / GL
  authTypes: AuthType[]       // 该平台支持的认证方式
  needsBaseUrl: boolean       // 是否需要用户填写服务器地址
  defaultBaseUrl?: string     // 默认 API 地址（SaaS 版）
}

/** 认证方式配置 */
export interface AuthTypeConfig {
  value: AuthType
  label: string
  desc: string
}

/** 凭证（统一抽象，替代原 GitToken） */
export interface GitCredential {
  id: string
  platform: PlatformType
  authType: AuthType
  name: string                // 备注名称
  // access_token 模式
  token?: string
  // username_password 模式
  username?: string
  password?: string
  // GitLab 私有部署
  baseUrl?: string            // 服务器 API 地址
  // 运行时获取（API 返回的用户信息）
  resolvedUsername?: string
  avatarUrl?: string
}

/** 统一的仓库数据结构 */
export interface GitRepo {
  id: number
  platform: PlatformType
  name: string
  fullName: string
  description: string
  private: boolean
  archived: boolean
  stars: number
  language: string
  updatedAt: string
  url: string
  defaultBranch: string
  avatarUrl: string
}

/** 统一的用户信息 */
export interface GitUser {
  platform: PlatformType
  username: string
  avatarUrl: string
  name: string
}

// ============================================================
// 平台 & 认证方式配置
// ============================================================

export const PLATFORMS: PlatformConfig[] = [
  {
    value: 'github',
    label: 'GitHub',
    color: '#f4430c',
    shortLabel: 'GH',
    authTypes: ['access_token'],
    needsBaseUrl: false,
    defaultBaseUrl: 'https://api.github.com',
  },
  {
    value: 'gitee',
    label: 'Gitee',
    color: '#c71d23',
    shortLabel: 'GT',
    authTypes: ['access_token'],
    needsBaseUrl: false,
    defaultBaseUrl: 'https://gitee.com/api/v5',
  },
  {
    value: 'gitlab',
    label: 'GitLab',
    color: '#fc6d26',
    shortLabel: 'GL',
    authTypes: ['access_token', 'username_password'],
    needsBaseUrl: true,
    defaultBaseUrl: '',
  },
]

export const AUTH_TYPES: AuthTypeConfig[] = [
  { value: 'access_token', label: 'Access Token', desc: '使用个人访问令牌认证' },
  { value: 'username_password', label: '用户名密码', desc: '使用账号密码登录' },
]

/** 获取平台配置 */
export function getPlatformConfig(platform: PlatformType): PlatformConfig | undefined {
  return PLATFORMS.find(p => p.value === platform)
}

/** 获取认证方式配置 */
export function getAuthTypeConfig(authType: AuthType): AuthTypeConfig | undefined {
  return AUTH_TYPES.find(a => a.value === authType)
}

// ============================================================
// Base64 编码（用于 Basic Auth，小程序无原生 btoa）
// ============================================================

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function utf8ToBytes(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = str.charCodeAt(++i)
      const combined = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
      bytes.push(
        0xf0 | (combined >> 18),
        0x80 | ((combined >> 12) & 0x3f),
        0x80 | ((combined >> 6) & 0x3f),
        0x80 | (combined & 0x3f),
      )
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

function base64Encode(str: string): string {
  const bytes = utf8ToBytes(str)
  let result = ''
  let i = 0
  while (i < bytes.length) {
    const b1 = bytes[i++]
    const b2 = i < bytes.length ? bytes[i++] : -1
    const b3 = i < bytes.length ? bytes[i++] : -1
    result += BASE64_CHARS[b1 >> 2]
    result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >= 0 ? b2 >> 4 : 0)]
    result += b2 >= 0 ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >= 0 ? b3 >> 6 : 0)] : '='
    result += b3 >= 0 ? BASE64_CHARS[b3 & 63] : '='
  }
  return result
}

// ============================================================
// 凭证存储（本地 Storage）
// ============================================================

const STORAGE_KEY = 'git_credentials'

/** 获取所有凭证 */
export function getCredentials(): GitCredential[] {
  try {
    return wx.getStorageSync(STORAGE_KEY) || []
  } catch {
    return []
  }
}

/** 保存凭证列表 */
export function saveCredentials(list: GitCredential[]): void {
  wx.setStorageSync(STORAGE_KEY, list)
}

/** 添加凭证 */
export function addCredential(cred: GitCredential): void {
  const list = getCredentials()
  list.push(cred)
  saveCredentials(list)
}

/** 更新凭证 */
export function updateCredential(cred: GitCredential): void {
  const list = getCredentials()
  const idx = list.findIndex(c => c.id === cred.id)
  if (idx !== -1) {
    list[idx] = cred
    saveCredentials(list)
  }
}

/** 删除凭证 */
export function removeCredential(id: string): void {
  saveCredentials(getCredentials().filter(c => c.id !== id))
}

/** 获取指定平台的凭证 */
export function getCredentialByPlatform(platform: PlatformType): GitCredential | undefined {
  return getCredentials().find(c => c.platform === platform)
}

/** 获取指定 ID 的凭证 */
export function getCredentialById(id: string): GitCredential | undefined {
  return getCredentials().find(c => c.id === id)
}

// ============================================================
// 活跃凭证（当前正在使用的账号）
// ============================================================

const ACTIVE_KEY = 'git_active_credential_id'

/** 获取活跃凭证 ID */
export function getActiveCredentialId(): string | null {
  try {
    return wx.getStorageSync(ACTIVE_KEY) || null
  } catch {
    return null
  }
}

/** 设置活跃凭证 ID */
export function setActiveCredentialId(id: string): void {
  wx.setStorageSync(ACTIVE_KEY, id)
}

/** 获取活跃凭证 */
export function getActiveCredential(): GitCredential | undefined {
  const id = getActiveCredentialId()
  if (!id) return undefined
  return getCredentials().find(c => c.id === id)
}

// ============================================================
// 向后兼容（过渡期保留旧接口名，内部转发）
// ============================================================

export const GitToken = undefined // 标记已废弃，编译时提醒

// ============================================================
// API 请求层
// ============================================================

/** 构建认证 header */
function buildAuthHeader(cred: GitCredential): Record<string, string> {
  if (cred.authType === 'access_token' && cred.token) {
    if (cred.platform === 'gitlab') {
      return { Authorization: `Bearer ${cred.token}` }
    }
    // GitHub / Gitee
    return { Authorization: `token ${cred.token}` }
  }
  if (cred.authType === 'username_password' && cred.username && cred.password) {
    return { Authorization: `Basic ${base64Encode(`${cred.username}:${cred.password}`)}` }
  }
  return {}
}

/** 获取 API base URL */
function getBaseUrl(cred: GitCredential): string {
  if (cred.platform === 'github') return 'https://api.github.com'
  if (cred.platform === 'gitee') return 'https://gitee.com/api/v5'
  if (cred.platform === 'gitlab') {
    // 去除尾部斜杠，补 /api/v4
    let base = (cred.baseUrl || '').trim().replace(/\/+$/, '')
    if (!base) throw new Error('请先配置 GitLab 服务器地址')
    if (!base.endsWith('/api/v4')) base += '/api/v4'
    return base
  }
  return ''
}

/** 通用请求 */
function request<T>(
  url: string,
  cred: GitCredential,
  extraHeader?: Record<string, string>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      header: {
        ...buildAuthHeader(cred),
        Accept: 'application/json',
        'User-Agent': 'GoDev-Miniprogram',
        ...extraHeader,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else if (res.statusCode === 401) {
          reject(new Error('认证失败，请检查凭证是否正确'))
        } else if (res.statusCode === 404) {
          reject(new Error('资源不存在，请检查服务器地址'))
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

// ============================================================
// 连接测试（不保存凭证，仅验证是否可用）
// ============================================================

export interface TestResult {
  success: boolean
  message: string
  username?: string
  avatarUrl?: string
}

/** 测试凭证是否可用，返回用户信息 */
export async function testConnection(cred: GitCredential): Promise<TestResult> {
  try {
    const user = await fetchUser(cred)
    return {
      success: true,
      message: '连接成功',
      username: user.username,
      avatarUrl: user.avatarUrl,
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || '连接失败',
    }
  }
}

// ============================================================
// 用户信息 API
// ============================================================

export async function fetchUser(cred: GitCredential): Promise<GitUser> {
  const base = getBaseUrl(cred)
  const url = `${base}/user`
  const data = await request<any>(url, cred)
  return {
    platform: cred.platform,
    username: data.login || data.username || '',
    avatarUrl: data.avatar_url || data.avatar_url || '',
    name: data.name || data.login || data.username || '',
  }
}

/** 分页结果 */
export interface RepoPage {
  repos: GitRepo[]
  hasMore: boolean   // 是否还有下一页
}

// ============================================================
// 仓库列表 API（支持分页）
// ============================================================

/** 获取仓库列表（单页） */
export async function fetchReposPage(
  cred: GitCredential,
  page: number = 1,
  perPage: number = 10,
): Promise<RepoPage> {
  const base = getBaseUrl(cred)
  if (cred.platform === 'github') {
    const url = `${base}/user/repos?page=${page}&per_page=${perPage}&type=all&sort=updated`
    const data = await request<any[]>(url, cred)
    // GitHub 通过响应头 Link 判断是否还有更多页，这里用数组长度判断
    return { repos: data.map(normalizeGitHubRepo), hasMore: data.length >= perPage }
  }
  if (cred.platform === 'gitee') {
    const url = `${base}/user/repos?page=${page}&per_page=${perPage}&type=all&sort=updated`
    const data = await request<any[]>(url, cred)
    return { repos: data.map(normalizeGiteeRepo), hasMore: data.length >= perPage }
  }
  // GitLab
  const url = `${base}/projects?membership=true&page=${page}&per_page=${perPage}&order_by=updated_at&sort=desc`
  const data = await request<any[]>(url, cred)
  return { repos: data.map(r => normalizeGitLabRepo(r, base)), hasMore: data.length >= perPage }
}

/** 获取全部仓库（兼容旧调用，逐页拉取最多 100 条） */
export async function fetchRepos(cred: GitCredential): Promise<GitRepo[]> {
  const all: GitRepo[] = []
  let page = 1
  const perPage = 30
  while (all.length < 100) {
    const { repos, hasMore } = await fetchReposPage(cred, page, perPage)
    all.push(...repos)
    if (!hasMore || repos.length === 0) break
    page++
  }
  return all
}

function normalizeGitHubRepo(r: any): GitRepo {
  return {
    id: r.id,
    platform: 'github',
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    private: r.private,
    archived: r.archived || false,
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
    archived: r.archived || false,
    stars: r.stargazers_count || 0,
    language: r.language || '',
    updatedAt: r.updated_at,
    url: r.html_url || r.url || '',
    defaultBranch: r.default_branch || 'master',
    avatarUrl: r.owner?.avatar_url || '',
  }
}

function normalizeGitLabRepo(r: any, baseUrl: string): GitRepo {
  return {
    id: r.id,
    platform: 'gitlab',
    name: r.path || r.name,
    fullName: r.path_with_namespace || r.name,
    description: r.description || '',
    private: r.visibility === 'private',
    archived: r.archived || false,
    stars: r.star_count || 0,
    language: '',  // GitLab 项目列表不返回语言
    updatedAt: r.last_activity_at,
    url: r.web_url || `${baseUrl.replace(/\/api\/v4$/, '')}/${r.path_with_namespace}`,
    defaultBranch: r.default_branch || 'main',
    avatarUrl: r.avatar_url || '',
  }
}

// ============================================================
// 工具函数
// ============================================================

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

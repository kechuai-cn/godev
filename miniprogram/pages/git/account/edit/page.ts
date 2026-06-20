// pages/git/account/edit/page.ts
import {
  getCredentials,
  addCredential,
  updateCredential,
  PLATFORMS,
  AUTH_TYPES,
  getPlatformConfig,
  getAuthTypeConfig,
  testConnection,
  GitCredential,
  PlatformType,
  AuthType,
} from '../../../../utils/git-api'

Page({
  data: {
    isEdit: false,
    credentialId: '',
    platform: 'github' as PlatformType,
    authType: 'access_token' as AuthType,
    name: '',
    token: '',
    username: '',
    password: '',
    baseUrl: '',
    saving: false,
    showSecret: false,
    // 测试连接状态
    testStatus: 'idle' as 'idle' | 'testing' | 'success' | 'fail',
    testMessage: '',
    testUsername: '',
    canSave: false,
    // 预计算（WXML 不支持复杂表达式）
    platformLabel: 'GitHub',
    platformIndex: 0,
    authTypeLabel: 'Access Token',
    authTypeIndex: 0,
    availableAuthTypes: [] as { value: string; label: string }[],
    availableAuthTypeLabels: [] as string[],
    showTokenField: false,
    showUserPassFields: false,
    showBaseUrlField: false,
    // WXML 预计算字段
    secretBtnText: '显示',
    testBtnClass: '',
    saveBtnClass: 'btn-disabled',
    saveBtnText: '添加凭证',
    isTesting: false,
    isSuccess: false,
    isFail: false,
    platforms: PLATFORMS.map(p => ({ value: p.value, label: p.label })),
    platformLabels: PLATFORMS.map(p => p.label),
  },

  onLoad(options: any) {
    const isEdit = !!options.id
    this.setData({
      isEdit,
      saveBtnText: isEdit ? '保存修改' : '添加凭证',
    })
    if (options.platform) {
      this.setPlatform(options.platform)
    }
    if (options.id) {
      this.loadCredential(options.id)
    }
  },

  /** 切换平台 */
  onPlatformChange(e: WechatMiniprogram.Picker.Change) {
    const idx = Number(e.detail.value)
    const platform = PLATFORMS[idx].value
    this.setPlatform(platform)
  },

  /** 设置平台 + 联动认证方式 */
  setPlatform(platform: PlatformType) {
    const config = getPlatformConfig(platform)
    if (!config) return
    const idx = PLATFORMS.findIndex(p => p.value === platform)

    // 获取该平台支持的认证方式
    const availableAuthTypes = config.authTypes.map(at => {
      const atConfig = getAuthTypeConfig(at)!
      return { value: at, label: atConfig.label }
    })
    const availableAuthTypeLabels = availableAuthTypes.map(a => a.label)

    // 如果当前 authType 不在新平台的支持列表里，切到第一个
    let authType = this.data.authType
    if (!config.authTypes.includes(authType)) {
      authType = config.authTypes[0]
    }

    this.setData({
      platform,
      platformLabel: config.label,
      platformIndex: idx,
      availableAuthTypes,
      availableAuthTypeLabels,
    })
    this.setAuthType(authType)
    this.resetTest()
  },

  /** 切换认证方式 */
  onAuthTypeChange(e: WechatMiniprogram.Picker.Change) {
    const idx = Number(e.detail.value)
    const authType = this.data.availableAuthTypes[idx].value as AuthType
    this.setAuthType(authType)
  },

  setAuthType(authType: AuthType) {
    const config = getAuthTypeConfig(authType)
    const idx = this.data.availableAuthTypes.findIndex(a => a.value === authType)
    const platformConfig = getPlatformConfig(this.data.platform)!
    this.setData({
      authType,
      authTypeLabel: config?.label || '',
      authTypeIndex: idx >= 0 ? idx : 0,
      showTokenField: authType === 'access_token',
      showUserPassFields: authType === 'username_password',
      showBaseUrlField: platformConfig.needsBaseUrl,
    })
    this.resetTest()
  },

  /** 加载已有凭证（编辑模式） */
  loadCredential(id: string) {
    const cred = getCredentials().find(c => c.id === id)
    if (!cred) return
    this.setPlatform(cred.platform)
    this.setAuthType(cred.authType)
    this.setData({
      isEdit: true,
      credentialId: id,
      name: cred.name,
      token: cred.token || '',
      username: cred.username || '',
      password: cred.password || '',
      baseUrl: cred.baseUrl || '',
    })
  },

  onNameInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ name: e.detail.value })
    this.resetTest()
  },

  onTokenInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ token: e.detail.value })
    this.resetTest()
  },

  onUsernameInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ username: e.detail.value })
    this.resetTest()
  },

  onPasswordInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ password: e.detail.value })
    this.resetTest()
  },

  onBaseUrlInput(e: WechatMiniprogram.Input.Input) {
    this.setData({ baseUrl: e.detail.value })
    this.resetTest()
  },

  toggleSecret() {
    const show = !this.data.showSecret
    this.setData({
      showSecret: show,
      secretBtnText: show ? '隐藏' : '显示',
    })
  },

  /** 修改任何字段后重置测试状态 */
  resetTest() {
    if (this.data.testStatus !== 'idle') {
      this.setData({
        testStatus: 'idle',
        testMessage: '',
        testUsername: '',
        canSave: false,
        testBtnClass: '',
        saveBtnClass: 'btn-disabled',
        isTesting: false,
        isSuccess: false,
        isFail: false,
      })
    }
  },

  /** 测试连接 */
  async onTest() {
    if (!this.validate()) return
    this.setData({
      testStatus: 'testing',
      testMessage: '',
      testUsername: '',
      canSave: false,
      testBtnClass: 'btn-disabled',
      saveBtnClass: 'btn-disabled',
      isTesting: true,
      isSuccess: false,
      isFail: false,
    })
    const { platform, authType, name, token, username, password, baseUrl } = this.data

    // 构建临时凭证对象（不保存）
    const cred: GitCredential = {
      id: 'temp',
      platform,
      authType,
      name: name.trim(),
    }
    if (authType === 'access_token') cred.token = token.trim()
    if (authType === 'username_password') {
      cred.username = username.trim()
      cred.password = password.trim()
    }
    const platformConfig = getPlatformConfig(platform)!
    if (platformConfig.needsBaseUrl) {
      cred.baseUrl = baseUrl.trim().replace(/\/+$/, '')
    }

    const result = await testConnection(cred)
    if (result.success) {
      this.setData({
        testStatus: 'success',
        testMessage: '连接成功',
        testUsername: result.username || '',
        canSave: true,
        testBtnClass: '',
        saveBtnClass: '',
        isTesting: false,
        isSuccess: true,
        isFail: false,
      })
    } else {
      this.setData({
        testStatus: 'fail',
        testMessage: result.message,
        canSave: false,
        testBtnClass: '',
        saveBtnClass: 'btn-disabled',
        isTesting: false,
        isSuccess: false,
        isFail: true,
      })
    }
  },

  /** 表单校验 */
  validate(): boolean {
    const { name, platform, authType, token, username, password, baseUrl } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入备注名称', icon: 'none' })
      return false
    }
    const platformConfig = getPlatformConfig(platform)!
    if (platformConfig.needsBaseUrl && !baseUrl.trim()) {
      wx.showToast({ title: '请输入服务器地址', icon: 'none' })
      return false
    }
    if (authType === 'access_token' && !token.trim()) {
      wx.showToast({ title: '请输入 Access Token', icon: 'none' })
      return false
    }
    if (authType === 'username_password') {
      if (!username.trim()) {
        wx.showToast({ title: '请输入用户名', icon: 'none' })
        return false
      }
      if (!password.trim()) {
        wx.showToast({ title: '请输入密码', icon: 'none' })
        return false
      }
    }
    return true
  },

  /** 保存 */
  async onSave() {
    if (!this.data.canSave) {
      wx.showToast({ title: '请先测试连接', icon: 'none' })
      return
    }
    if (!this.validate()) return
    const { isEdit, credentialId, platform, authType, name, token, username, password, baseUrl, testUsername } = this.data

    this.setData({ saving: true })
    try {
      const cred: GitCredential = {
        id: isEdit ? credentialId : Date.now().toString(),
        platform,
        authType,
        name: name.trim(),
        resolvedUsername: testUsername,
      }
      if (authType === 'access_token') cred.token = token.trim()
      if (authType === 'username_password') {
        cred.username = username.trim()
        cred.password = password.trim()
      }
      const platformConfig = getPlatformConfig(platform)!
      if (platformConfig.needsBaseUrl) {
        cred.baseUrl = baseUrl.trim().replace(/\/+$/, '')
      }

      if (isEdit) {
        updateCredential(cred)
      } else {
        addCredential(cred)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } finally {
      this.setData({ saving: false })
    }
  },
})

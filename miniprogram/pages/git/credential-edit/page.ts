// pages/git/credential-edit/page.ts
import { definePage, ref, computed } from '@vue-mini/core'
import {
  getCredentials,
  addCredential,
  updateCredential,
  PLATFORMS,
  getPlatformConfig,
  getAuthTypeConfig,
  testConnection,
  GitCredential,
  PlatformType,
  AuthType,
} from '../../../utils/git-api'

export default definePage((query: Record<string, string | undefined>) => {
  // ======================== 基础状态 ========================

  const isEdit = !!query.id
  const credentialId = ref(query.id || '')

  const platform = ref<PlatformType>('github')
  const authType = ref<AuthType>('access_token')
  const name = ref('')
  const token = ref('')
  const username = ref('')
  const password = ref('')
  const baseUrl = ref('')
  const saving = ref(false)
  const showSecret = ref(false)

  // 测试连接
  const testStatus = ref<'idle' | 'testing' | 'success' | 'fail'>('idle')
  const testMessage = ref('')
  const testUsername = ref('')
  const canSave = ref(false)

  // ======================== 计算属性 ========================

  const platformConfig = computed(() => getPlatformConfig(platform.value)!)

  const platformLabel = computed(() => platformConfig.value.label)
  const platformIndex = computed(() => PLATFORMS.findIndex(p => p.value === platform.value))

  const availableAuthTypes = computed(() =>
    platformConfig.value.authTypes.map(at => {
      const atConfig = getAuthTypeConfig(at)!
      return { value: at, label: atConfig.label }
    }),
  )
  const availableAuthTypeLabels = computed(() => availableAuthTypes.value.map(a => a.label))
  const authTypeLabel = computed(() => {
    const at = availableAuthTypes.value.find(a => a.value === authType.value)
    return at?.label || getAuthTypeConfig(authType.value)?.label || ''
  })
  const authTypeIndex = computed(() => availableAuthTypes.value.findIndex(a => a.value === authType.value))

  const showTokenField = computed(() => authType.value === 'access_token')
  const showUserPassFields = computed(() => authType.value === 'username_password')
  const showBaseUrlField = computed(() => platformConfig.value.needsBaseUrl)

  const secretBtnText = computed(() => (showSecret.value ? '隐藏' : '显示'))
  const saveBtnText = computed(() => (isEdit ? '保存修改' : '添加凭证'))

  const isTesting = computed(() => testStatus.value === 'testing')
  const isSuccess = computed(() => testStatus.value === 'success')
  const isFail = computed(() => testStatus.value === 'fail')

  const testBtnClass = computed(() => (testStatus.value === 'testing' ? 'btn-disabled' : ''))
  const saveBtnClass = computed(() => (canSave.value ? '' : 'btn-disabled'))

  // picker 静态数据
  const platforms = PLATFORMS.map(p => ({ value: p.value, label: p.label }))
  const platformLabels = PLATFORMS.map(p => p.label)

  // ======================== 初始化 ========================

  function initPlatform(p: string) {
    const config = getPlatformConfig(p as PlatformType)
    if (!config) return
    platform.value = p as PlatformType
    // 如果当前 authType 不在新平台支持列表里，切到第一个
    if (!config.authTypes.includes(authType.value)) {
      authType.value = config.authTypes[0]
    }
    resetTest()
  }

  function loadCredential(id: string) {
    const cred = getCredentials().find(c => c.id === id)
    if (!cred) return
    initPlatform(cred.platform)
    authType.value = cred.authType
    credentialId.value = id
    name.value = cred.name
    token.value = cred.token || ''
    username.value = cred.username || ''
    password.value = cred.password || ''
    baseUrl.value = cred.baseUrl || ''
  }

  if (query.platform) {
    initPlatform(query.platform)
  }
  if (query.id) {
    loadCredential(query.id)
  }

  // ======================== 事件处理 ========================

  function onPlatformChange(e: WechatMiniprogram.Picker.Change) {
    const idx = Number(e.detail.value)
    const p = PLATFORMS[idx].value
    initPlatform(p)
  }

  function onAuthTypeChange(e: WechatMiniprogram.Picker.Change) {
    const idx = Number(e.detail.value)
    const at = availableAuthTypes.value[idx]?.value
    if (at) {
      authType.value = at
      resetTest()
    }
  }

  function onNameInput(e: WechatMiniprogram.Input) {
    name.value = e.detail.value
    resetTest()
  }

  function onTokenInput(e: WechatMiniprogram.Input) {
    token.value = e.detail.value
    resetTest()
  }

  function onUsernameInput(e: WechatMiniprogram.Input) {
    username.value = e.detail.value
    resetTest()
  }

  function onPasswordInput(e: WechatMiniprogram.Input) {
    password.value = e.detail.value
    resetTest()
  }

  function onBaseUrlInput(e: WechatMiniprogram.Input) {
    baseUrl.value = e.detail.value
    resetTest()
  }

  function toggleSecret() {
    showSecret.value = !showSecret.value
  }

  function resetTest() {
    if (testStatus.value !== 'idle') {
      testStatus.value = 'idle'
      testMessage.value = ''
      testUsername.value = ''
      canSave.value = false
    }
  }

  // ======================== 核心逻辑 ========================

  function validate(): boolean {
    if (!name.value.trim()) {
      wx.showToast({ title: '请输入备注名称', icon: 'none' })
      return false
    }
    if (platformConfig.value.needsBaseUrl && !baseUrl.value.trim()) {
      wx.showToast({ title: '请输入服务器地址', icon: 'none' })
      return false
    }
    if (authType.value === 'access_token' && !token.value.trim()) {
      wx.showToast({ title: '请输入 Access Token', icon: 'none' })
      return false
    }
    if (authType.value === 'username_password') {
      if (!username.value.trim()) {
        wx.showToast({ title: '请输入用户名', icon: 'none' })
        return false
      }
      if (!password.value.trim()) {
        wx.showToast({ title: '请输入密码', icon: 'none' })
        return false
      }
    }
    return true
  }

  async function onTest() {
    if (!validate()) return
    testStatus.value = 'testing'
    testMessage.value = ''
    testUsername.value = ''
    canSave.value = false

    const cred: GitCredential = {
      id: 'temp',
      platform: platform.value,
      authType: authType.value,
      name: name.value.trim(),
    }
    if (authType.value === 'access_token') cred.token = token.value.trim()
    if (authType.value === 'username_password') {
      cred.username = username.value.trim()
      cred.password = password.value.trim()
    }
    if (platformConfig.value.needsBaseUrl) {
      cred.baseUrl = baseUrl.value.trim().replace(/\/+$/, '')
    }

    const result = await testConnection(cred)
    if (result.success) {
      testStatus.value = 'success'
      testMessage.value = '连接成功'
      testUsername.value = result.username || ''
      canSave.value = true
    } else {
      testStatus.value = 'fail'
      testMessage.value = result.message
      canSave.value = false
    }
  }

  async function onSave() {
    if (!canSave.value) {
      wx.showToast({ title: '请先测试连接', icon: 'none' })
      return
    }
    if (!validate()) return
    saving.value = true
    try {
      const cred: GitCredential = {
        id: isEdit ? credentialId.value : Date.now().toString(),
        platform: platform.value,
        authType: authType.value,
        name: name.value.trim(),
        resolvedUsername: testUsername.value,
      }
      if (authType.value === 'access_token') cred.token = token.value.trim()
      if (authType.value === 'username_password') {
        cred.username = username.value.trim()
        cred.password = password.value.trim()
      }
      if (platformConfig.value.needsBaseUrl) {
        cred.baseUrl = baseUrl.value.trim().replace(/\/+$/, '')
      }
      if (isEdit) {
        updateCredential(cred)
      } else {
        addCredential(cred)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } finally {
      saving.value = false
    }
  }

  // ======================== 导出到模板 ========================

  return {
    // 基础状态
    isEdit,
    credentialId,
    platform,
    authType,
    name,
    token,
    username,
    password,
    baseUrl,
    saving,
    showSecret,
    testStatus,
    testMessage,
    testUsername,
    canSave,
    // 计算属性
    platformLabel,
    platformIndex,
    availableAuthTypes,
    availableAuthTypeLabels,
    authTypeLabel,
    authTypeIndex,
    showTokenField,
    showUserPassFields,
    showBaseUrlField,
    secretBtnText,
    saveBtnText,
    isTesting,
    isSuccess,
    isFail,
    testBtnClass,
    saveBtnClass,
    platformLabels,
    // 方法
    onPlatformChange,
    onAuthTypeChange,
    onNameInput,
    onTokenInput,
    onUsernameInput,
    onPasswordInput,
    onBaseUrlInput,
    toggleSecret,
    onTest,
    onSave,
  }
})

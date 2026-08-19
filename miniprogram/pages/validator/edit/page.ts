// pages/validator/edit/page.ts
import { definePage, ref, reactive, onLoad } from '@vue-mini/core'
import {
  getTotpItems,
  addTotpItem,
  updateTotpItem,
  parseOtpAuthUri,
  normalizeSecret,
  isValidSecret,
  generateTotp,
  TotpItem,
} from '../../../utils/totp'

const THEME_COLOR = '#1a73e8'
const THEME_LIGHT = '#e8f0fe'

export default definePage(() => {
  const isEdit = ref(false)
  const editId = ref('')

  // 表单数据
  const form = reactive({
    issuer: '',
    account: '',
    secret: '',
    digits: 6,
    period: 30,
  })

  const themeColor = ref(THEME_COLOR)
  const themeLight = ref(THEME_LIGHT)
  const previewCode = ref('-- ----')
  const secretError = ref('')
  const saving = ref(false)

  function refreshPreview() {
    const secret = normalizeSecret(form.secret)
    if (secret.length > 0 && isValidSecret(secret)) {
      const code = generateTotp(secret, Date.now(), form.digits, form.period)
      const mid = Math.ceil(code.length / 2)
      previewCode.value = `${code.slice(0, mid)} ${code.slice(mid)}`
    } else {
      previewCode.value = '-- ----'
    }
  }

  function onIssuerInput(e: WechatMiniprogram.Input) {
    form.issuer = e.detail.value
  }
  function onAccountInput(e: WechatMiniprogram.Input) {
    form.account = e.detail.value
  }
  function onSecretInput(e: WechatMiniprogram.Input) {
    form.secret = e.detail.value
    secretError.value = ''
    refreshPreview()
  }
  function onDigitsInput(e: WechatMiniprogram.Input) {
    const v = parseInt(e.detail.value, 10)
    if (!isNaN(v)) {
      form.digits = Math.min(8, Math.max(6, v))
      refreshPreview()
    }
  }
  function onPeriodInput(e: WechatMiniprogram.Input) {
    const v = parseInt(e.detail.value, 10)
    if (!isNaN(v)) {
      form.period = Math.min(60, Math.max(10, v))
      refreshPreview()
    }
  }

  // 扫码识别 otpauth:// URI
  function onScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: res => {
        const uri = res.result || ''
        if (uri.startsWith('otpauth://')) {
          const parsed = parseOtpAuthUri(uri)
          if (parsed) {
            form.issuer = parsed.issuer
            form.account = parsed.account
            form.secret = parsed.secret
            form.digits = parsed.digits
            form.period = parsed.period
            secretError.value = ''
            refreshPreview()
            wx.showToast({ title: '已识别', icon: 'success' })
          } else {
            wx.showToast({ title: '无法解析该二维码', icon: 'none' })
          }
        } else if (uri) {
          // 直接是一串 secret
          form.secret = uri
          secretError.value = ''
          refreshPreview()
        }
      },
    })
  }

  function onSave() {
    const secret = normalizeSecret(form.secret)
    if (!isValidSecret(secret)) {
      secretError.value = '请填写有效的密钥（Base32，仅含 A-Z 与 2-7）'
      return
    }
    if (!form.issuer.trim() && !form.account.trim()) {
      wx.showToast({ title: '请至少填写发行方或账号', icon: 'none' })
      return
    }

    saving.value = true
    const payload = {
      issuer: form.issuer.trim() || form.account.trim(),
      account: form.account.trim(),
      secret,
      algorithm: 'SHA1' as const,
      digits: form.digits,
      period: form.period,
    }

    if (isEdit.value) {
      const existing = getTotpItems().find(c => c.id === editId.value)
      if (existing) {
        updateTotpItem({ ...existing, ...payload })
      }
    } else {
      addTotpItem(payload)
    }

    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }

  onLoad((query: Record<string, string>) => {
    if (query && query.id) {
      const item = getTotpItems().find(c => c.id === query.id)
      if (item) {
        isEdit.value = true
        editId.value = item.id
        form.issuer = item.issuer
        form.account = item.account
        form.secret = item.secret
        form.digits = item.digits
        form.period = item.period
        refreshPreview()
      }
    }
    if (query && query.uri) {
      const parsed = parseOtpAuthUri(decodeURIComponent(query.uri))
      if (parsed) {
        form.issuer = parsed.issuer
        form.account = parsed.account
        form.secret = parsed.secret
        form.digits = parsed.digits
        form.period = parsed.period
        refreshPreview()
      }
    }
  })

  return {
    isEdit,
    form,
    themeColor,
    themeLight,
    previewCode,
    secretError,
    saving,
    onIssuerInput,
    onAccountInput,
    onSecretInput,
    onDigitsInput,
    onPeriodInput,
    onScan,
    onSave,
  }
})

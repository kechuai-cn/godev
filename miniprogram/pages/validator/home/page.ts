// pages/validator/home/page.ts
import { definePage, ref, onShow, onHide, onUnload } from '@vue-mini/core'
import {
  getTotpItems,
  computeTotp,
  removeTotpItem,
  TotpItem,
  TotpCode,
} from '../../../utils/totp'

interface TotpDisplay extends TotpItem {
  code: string
  codeFirst: string
  codeLast: string
  remainSeconds: number
  period: number
  remainRatio: number // 进度条剩余比例 0~1
  initials: string // 图标首字母
}

// 品牌主色（验证器模块）
const THEME_COLOR = '#1a73e8'
const THEME_LIGHT = '#e8f0fe'

/** 将验证码拆成两段便于显示（如 123 456） */
function splitCode(code: string): { first: string; last: string } {
  const mid = Math.ceil(code.length / 2)
  return { first: code.slice(0, mid), last: code.slice(mid) }
}

export default definePage(() => {
  const items = ref<TotpDisplay[]>([])
  const isEmpty = ref(true)
  const themeColor = ref(THEME_COLOR)
  const themeLight = ref(THEME_LIGHT)

  let timer: ReturnType<typeof setInterval> | null = null

  /** 由原始条目计算展示数据（含实时验证码） */
  function toDisplay(item: TotpItem, now: number = Date.now()): TotpDisplay {
    const codeInfo: TotpCode = computeTotp(item, now)
    const initials = (item.issuer || item.account || '?').trim()[0]?.toUpperCase() || '?'
    const parts = splitCode(codeInfo.code)
    return {
      ...item,
      code: codeInfo.code,
      codeFirst: parts.first,
      codeLast: parts.last,
      remainSeconds: codeInfo.remainSeconds,
      period: codeInfo.period,
      remainRatio: codeInfo.remainSeconds / item.period,
      initials,
    }
  }

  function tick() {
    const now = Date.now()
    items.value = items.value.map(it => {
      const codeInfo = computeTotp(it, now)
      const parts = splitCode(codeInfo.code)
      return {
        ...it,
        code: codeInfo.code,
        codeFirst: parts.first,
        codeLast: parts.last,
        remainSeconds: codeInfo.remainSeconds,
        remainRatio: codeInfo.remainSeconds / it.period,
      }
    })
  }

  function loadItems() {
    const list = getTotpItems()
    items.value = list.map(it => toDisplay(it))
    isEmpty.value = list.length === 0
    tick()
  }

  function startTimer() {
    if (timer) return
    timer = setInterval(tick, 1000)
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function onCopy(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as TotpDisplay
    wx.setClipboardData({
      data: item.code,
      success: () => wx.showToast({ title: '已复制验证码', icon: 'success' }),
    })
  }

  function onAdd() {
    wx.navigateTo({ url: '/pages/validator/edit/page' })
  }

  function onEdit(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/validator/edit/page?id=${id}` })
  }

  function onDelete(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '确认删除',
      content: '删除后将不再生成该账户的验证码，且无法恢复。',
      success: res => {
        if (res.confirm) {
          removeTotpItem(id)
          loadItems()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  }

  onShow(() => {
    loadItems()
    startTimer()
  })

  onHide(() => stopTimer())
  onUnload(() => stopTimer())

  return {
    items,
    isEmpty,
    themeColor,
    themeLight,
    onCopy,
    onAdd,
    onEdit,
    onDelete,
  }
})

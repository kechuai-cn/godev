// pages/home/page.ts

interface FeatureItem {
  id: string
  title: string
  desc: string
  icon: string
  color: string
  bgColor: string
  path: string
  badge?: string
}

Page({
  data: {
    features: [
      {
        id: 'git',
        title: 'Git 仓库管理',
        desc: '浏览 GitHub、Gitee 等多平台仓库',
        icon: '⑂',
        iconSvg: 'git',
        color: '#f4430c',
        bgColor: '#fff3f0',
        path: '/pages/git/home/page',
      },
      {
        id: 'validator',
        title: '验证器管理',
        desc: '管理 TOTP、密钥等验证凭证',
        icon: '🔐',
        iconSvg: 'shield',
        color: '#1a73e8',
        bgColor: '#e8f0fe',
        path: '',
        badge: '即将上线',
      },
      {
        id: 'llm-text',
        title: '文本大模型',
        desc: 'ChatGPT、Claude、Gemini 等 AI 对话',
        icon: '💬',
        iconSvg: 'chat',
        color: '#0ea47a',
        bgColor: '#e6f9f3',
        path: '',
        badge: '即将上线',
      },
      {
        id: 'llm-image',
        title: '图片生成',
        desc: 'DALL·E、Midjourney 等图像 AI',
        icon: '🎨',
        iconSvg: 'image',
        color: '#9334ea',
        bgColor: '#f3e8fd',
        path: '',
        badge: '即将上线',
      },
      {
        id: 'llm-video',
        title: '视频生成',
        desc: 'Sora、Runway 等视频 AI 创作',
        icon: '🎬',
        iconSvg: 'video',
        color: '#e8710a',
        bgColor: '#fef3e2',
        path: '',
        badge: '即将上线',
      },
    ] as FeatureItem[],
    greeting: '',
  },

  onLoad() {
    this.setGreeting()
  },

  onShow() {
    this.setGreeting()
  },

  setGreeting() {
    const hour = new Date().getHours()
    let greeting = ''
    if (hour >= 5 && hour < 12) greeting = '早上好 ☀️'
    else if (hour >= 12 && hour < 18) greeting = '下午好 🌤'
    else greeting = '晚上好 🌙'
    this.setData({ greeting })
  },

  onFeatureTap(e: WechatMiniprogram.TouchEvent) {
    const { id, path } = e.currentTarget.dataset as { id: string; path: string }
    if (!path) {
      wx.showToast({ title: '功能即将上线', icon: 'none' })
      return
    }
    wx.navigateTo({ url: path })
  },
})

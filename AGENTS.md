# AGENTS.md

> 本文件面向 AI 编程助手（如 WorkBuddy、Cursor、Copilot 等）。
> 描述项目的结构、规范和开发约定，方便 AI 快速理解上下文、少走弯路。

---

## 项目简介

**GoDev** 是一个面向开发者的微信小程序工具集，目前计划涵盖：

| 模块 | 状态 |
|------|------|
| Git 仓库管理 | 🚧 进行中 |
| 验证器管理（TOTP / 密钥） | ✅ 已完成 |
| 文本大模型（ChatGPT / Claude 等） | ⏳ 待开发 |
| 图片生成大模型（DALL·E / Midjourney 等） | ⏳ 待开发 |
| 视频生成大模型（Sora / Runway 等） | ⏳ 待开发 |

---

## 目录结构

```
godev/
├── AGENTS.md              # 本文件：AI 助手上下文指引
├── README.md              # 项目说明
├── tsconfig.json          # TypeScript 配置（输出目录 miniprogram/）
├── project.config.json    # 微信开发者工具配置
└── miniprogram/           # 小程序源码根目录（miniprogramRoot）
    ├── app.ts             # 应用入口
    ├── app.json           # 页面路由 & 全局窗口配置
    ├── app.wxss           # 全局样式（CSS 变量体系）
    ├── env.d.ts           # TypeScript 全局类型声明
    ├── sitemap.json
    └── pages/
        ├── home/          # ✅ 首页（已完成）
        └── git/           # Git 模块
            ├── home/      # ✅ Git 首页（已完成）
            ├── credential/         # ✅ 凭据管理列表（已完成）
            ├── credential-edit/    # ✅ 凭据新增/编辑（已完成）
            ├── repo/               # 🚧 仓库详情（占位）
            ├── repo-files/         # 🚧 文件夹浏览（占位）
            └── file/              # 🚧 文件详情（占位）
```

每个页面目录包含四个同名文件：`.ts` / `.json` / `.wxml` / `.wxss`。

---

## 技术栈

- **微信小程序原生**（非 uni-app / Taro）
- **TypeScript** — `tsconfig.json` 已配置，类型严格模式开启
- **miniprogram-api-typings** — 小程序 API 类型声明包

---

## 页面路由一览

| 路径 | 描述 |
|------|------|
| `pages/home/page` | 首页，所有功能模块入口 |
| `pages/git/home/page` | Git 首页，支持多凭据切换，罗列所有仓库；无凭据时引导前往凭据管理页 |
| `pages/git/credential/page` | Git 凭据管理，支持 GitHub / Gitee / GitLab 等平台凭据录入、编辑、删除 |
| `pages/git/credential-edit/page` | 凭据新增/编辑页，支持测试连接 |
| `pages/git/repo/page` | 仓库详情（README、Star、语言、分支等） |
| `pages/git/repo-files/page` | 仓库内容文件夹浏览 |
| `pages/git/file/page` | 文件详情，代码高亮浏览 |

---

## 设计规范

### 颜色系统

| 用途 | 色值 |
|------|------|
| 页面背景 | `#f5f6fa` |
| 卡片 / 导航栏背景 | `#ffffff` |
| 主文本 | `#1c1e21` |
| 次要文本 | `#888888` |
| 分割线 | `#f0f0f0` |
| 品牌主色（蓝） | `#1a73e8` |

**功能模块主题色：**

| 模块 | 主色 | 浅背景 |
|------|------|--------|
| Git 仓库 | `#f4430c` | `#fff3f0` |
| 验证器 | `#1a73e8` | `#e8f0fe` |
| 文本大模型 | `#0ea47a` | `#e6f9f3` |
| 图片生成 | `#9334ea` | `#f3e8fd` |
| 视频生成 | `#e8710a` | `#fef3e2` |

### 组件规范

- **卡片**：`border-radius: 24rpx`，`background: #ffffff`，`box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06)`
- **图标容器**：`width/height: 88rpx`，`border-radius: 22rpx`，使用对应功能浅背景色
- **字体**：`font-family: -apple-system, "PingFang SC", sans-serif`
- **布局**：主要使用 2 列大卡片网格（`grid-template-columns: 1fr 1fr`）
- **间距单位**：`rpx`（响应式像素）

---

## 编码约定

1. **文件命名**：页面文件统一命名为 `page.ts/json/wxml/wxss`，组件命名用小写连字符（如 `repo-card`）
2. **TypeScript 接口**：数据模型定义在文件顶部，使用 `interface` 而非 `type`
3. **Page 数据**：`data` 中的字段需明确类型，避免 `any`
4. **导航**：统一使用 `wx.navigateTo`，返回用 `wx.navigateBack`
5. **Toast**：错误用 `icon: 'none'`，成功用 `icon: 'success'`，持续 1500ms
6. **样式隔离**：每个页面的 `.wxss` 只写本页面样式，全局共用样式写在 `app.wxss`
7. **注释**：`.wxml` 和 `.ts` 文件顶部保留路径注释，例如 `<!-- pages/home/page.wxml -->`

---

## Git 模块开发说明

Git 仓库管理模块的核心逻辑：

- **凭据存储**：使用 `wx.setStorageSync` 本地持久化，key 格式 `git_credentials`，存储结构为凭据对象数组
- **多平台支持**：目前规划 GitHub（`https://api.github.com`）、Gitee（`https://gitee.com/api/v5`）、GitLab（含私有部署）
- **凭据切换**：`git/home` 页面顶部支持切换当前活跃凭据，数据不混用
- **仓库数据结构**（参考）：

```typescript
interface GitCredential {
  id: string       // 唯一标识（时间戳）
  platform: 'github' | 'gitee' | 'gitlab'
  authType: 'access_token' | 'username_password'
  name: string     // 用户自定义备注名
  token?: string    // Personal Access Token（authType=access_token 时必填）
  username?: string // 用户名（authType=username_password 时必填）
  password?: string // 密码 / 个人访问令牌（authType=username_password 时必填）
  baseUrl?: string  // 私有部署 GitLab 服务器地址
  resolvedUsername?: string // 测试连接后解析出的用户名
}

interface GitRepo {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  stargazers_count: number
  language: string
  updated_at: string
  html_url: string
  default_branch: string
}
```

---

## 开发前必读

- 先跑通 `pages/git/home/page` 的凭据判断逻辑（无凭据 → 引导去 `git/credential`）
- 网络请求统一封装在 `miniprogram/utils/request.ts`（待创建），避免各页面直接调用 `wx.request`
- 所有平台 API 的 baseURL、headers（`Authorization` 等）在 utils 层处理

---

*最后更新：2026-06-20*

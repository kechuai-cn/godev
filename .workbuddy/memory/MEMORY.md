# GoDev 项目长期记忆

## 项目概况
- 微信小程序，面向开发者的工具集
- 技术栈：微信小程序原生 + TypeScript
- miniprogramRoot: miniprogram/

## 页面路由
- pages/home/page — 首页（已完成）
- pages/git/home/page — Git 仓库首页（已完成）
- pages/git/account/page — 凭证管理列表（已完成）
- pages/git/account/edit/page — 凭证编辑/新增（已完成）
- pages/git/repo/page — 仓库详情（占位）
- pages/git/repo-files/page — 文件夹浏览（占位）
- pages/git/file/page — 文件详情（占位）

## 凭证系统
- 统一模型 `GitCredential`，支持多平台多认证方式
- 平台：GitHub / Gitee / GitLab（含私有部署）
- 认证方式：Access Token / 用户名密码
- Storage key: `git_credentials`
- 核心文件：`miniprogram/utils/git-api.ts`
- WXML 约定：模板中不能使用 `===`、`>`、`&&`、`||`、三元表达式、`findIndex()` 等复杂 JS，全部在 TS 中预计算为布尔标志或简单值

## 设计规范
- 风格：现代简约，白底 #ffffff，页面背景 #f5f6fa
- 主色：#1a73e8（蓝）
- 功能色：Git=#f4430c, 验证器=#1a73e8, 文本AI=#0ea47a, 图片AI=#9334ea, 视频AI=#e8710a
- 平台色：GitHub=#f4430c, Gitee=#c71d23, GitLab=#fc6d26
- 圆角：卡片 24rpx，图标背景 22rpx
- 字体：font-family: -apple-system, "PingFang SC"

## 用户偏好
- 布局：大卡片网格（2列）

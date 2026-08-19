// miniprogram/utils/totp.ts
// TOTP（基于时间的一次性密码）工具，遵循 RFC 6238 / RFC 4226。
// 纯 JS 实现 HMAC-SHA1，无需任何第三方依赖，适配微信小程序运行时。

// ============================================================
// 类型定义
// ============================================================

/** 验证器条目（用于本地存储） */
export interface TotpItem {
  id: string // 唯一标识
  issuer: string // 发行方 / 服务名
  account: string // 账号（邮箱或用户名）
  secret: string // Base32 编码的密钥
  algorithm: 'SHA1' | 'SHA256' | 'SHA512' // 摘要算法（本实现支持 SHA1）
  digits: number // 验证码位数（默认 6）
  period: number // 周期（秒，默认 30）
  createdAt: number // 创建时间戳
}

/** TOTP 计算结果 */
export interface TotpCode {
  code: string // 验证码
  remainSeconds: number // 剩余秒数
  period: number // 周期
}

// ============================================================
// Base32 编解码（RFC 4648，无填充标准用于 TOTP）
// ============================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** 规范化 secret：去空格、转大写、剔除非法字符 */
export function normalizeSecret(raw: string): string {
  return raw
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
}

/** Base32 解码为字节数组 */
function base32Decode(input: string): number[] {
  const clean = normalizeSecret(input)
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i])
    if (val === -1) continue
    buffer = (buffer << 5) | val
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return bytes
}

// ============================================================
// SHA-1 与 HMAC-SHA1 纯 JS 实现
// ============================================================

/** 32 位整型左循环移位 */
function rotl(n: number, s: number): number {
  return (n << s) | (n >>> (32 - s))
}

/** 将字符串按 UTF-8 转为字节数组 */
function strToBytes(str: string): number[] {
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

/** SHA-1 计算，返回 20 字节数组 */
function sha1(msg: number[]): number[] {
  const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]
  const ml = msg.length * 8

  // 填充
  const padded = msg.slice()
  padded.push(0x80)
  while (padded.length % 64 !== 56) padded.push(0x00)
  // 64 位长度（高位在低版本环境可能溢出，但一般验证码长度远小于 2^32 字节）
  const hi = Math.floor(ml / 0x100000000)
  const lo = ml >>> 0
  padded.push(
    (hi >>> 24) & 0xff,
    (hi >>> 16) & 0xff,
    (hi >>> 8) & 0xff,
    hi & 0xff,
    (lo >>> 24) & 0xff,
    (lo >>> 16) & 0xff,
    (lo >>> 8) & 0xff,
    lo & 0xff,
  )

  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(80)
    for (let t = 0; t < 16; t++) {
      w[t] =
        ((padded[i + t * 4] << 24) |
          (padded[i + t * 4 + 1] << 16) |
          (padded[i + t * 4 + 2] << 8) |
          padded[i + t * 4 + 3]) >>>
        0
    }
    for (let t = 16; t < 80; t++) {
      w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1)
    }

    let [a, b, c, d, e] = H
    for (let t = 0; t < 80; t++) {
      let f: number
      let k: number
      if (t < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (t < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (rotl(a, 5) + f + e + k + w[t]) >>> 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }

    H[0] = (H[0] + a) >>> 0
    H[1] = (H[1] + b) >>> 0
    H[2] = (H[2] + c) >>> 0
    H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0
  }

  const out: number[] = []
  for (let i = 0; i < 5; i++) {
    out.push((H[i] >>> 24) & 0xff, (H[i] >>> 16) & 0xff, (H[i] >>> 8) & 0xff, H[i] & 0xff)
  }
  return out
}

/** HMAC-SHA1，key 与 message 均为字节数组 */
function hmacSha1(key: number[], message: number[]): number[] {
  const blockSize = 64
  let keyBytes = key
  if (keyBytes.length > blockSize) {
    keyBytes = sha1(keyBytes)
  }
  const paddedKey = keyBytes.slice()
  while (paddedKey.length < blockSize) paddedKey.push(0x00)

  const oKey = paddedKey.map(b => b ^ 0x5c)
  const iKey = paddedKey.map(b => b ^ 0x36)
  return sha1(oKey.concat(sha1(iKey.concat(message))))
}

// ============================================================
// TOTP 生成
// ============================================================

/** 将 8 字节计数器（64 位大端）转为字节数组 */
function counterToBytes(counter: number): number[] {
  const bytes: number[] = []
  // 小程序内时间戳远达不到 2^32 * 30，高位恒为 0
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Math.floor(counter / Math.pow(2, 8 * (7 - i))) & 0xff
  }
  return bytes
}

/** 生成指定时间点的 TOTP 验证码 */
export function generateTotp(
  secret: string,
  time: number = Date.now(),
  digits: number = 6,
  period: number = 30,
): string {
  const keyBytes = base32Decode(secret)
  const counter = Math.floor(time / 1000 / period)
  const msg = counterToBytes(counter)
  const hash = hmacSha1(keyBytes, msg)

  // 动态截断
  const offset = hash[hash.length - 1] & 0x0f
  const bin =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)

  const otp = bin % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

/** 生成带剩余时间的 TOTP 结果 */
export function computeTotp(item: TotpItem, time: number = Date.now()): TotpCode {
  const code = generateTotp(item.secret, time, item.digits, item.period)
  const elapsed = Math.floor(time / 1000) % item.period
  const remainSeconds = item.period - elapsed
  return { code, remainSeconds, period: item.period }
}

// ============================================================
// 解析 otpauth:// URI
// ============================================================

/** 解析 otpauth://totp/... URI，返回可写入的条目（不含 id/createdAt） */
export function parseOtpAuthUri(uri: string): Omit<TotpItem, 'id' | 'createdAt'> | null {
  try {
    if (!uri.startsWith('otpauth://')) return null
    const url = uri
    // 提取标签部分：otpauth://totp/<label>?...
    const qIndex = url.indexOf('?')
    if (qIndex === -1) return null
    const schemeLabel = url.slice(0, qIndex)
    const labelPart = decodeURIComponent(schemeLabel.replace(/^otpauth:\/\/totp\//, ''))
    const [issuerInLabel, account] = labelPart.includes(':')
      ? labelPart.split(':').map(s => s.trim())
      : [undefined, labelPart.trim()]

    const queryStr = url.slice(qIndex + 1)
    const params = new URLSearchParams(queryStr)
    const secret = normalizeSecret(params.get('secret') || '')
    if (!secret) return null

    const issuer = params.get('issuer') || issuerInLabel || account || '未知服务'
    const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase() as TotpItem['algorithm']
    const digits = parseInt(params.get('digits') || '6', 10) || 6
    const period = parseInt(params.get('period') || '30', 10) || 30

    return {
      issuer,
      account,
      secret,
      algorithm: algorithm === 'SHA256' || algorithm === 'SHA512' ? 'SHA1' : algorithm,
      digits,
      period,
    }
  } catch {
    return null
  }
}

// ============================================================
// 存储（本地 Storage）
// ============================================================

const STORAGE_KEY = 'totp_items'

/** 获取全部条目 */
export function getTotpItems(): TotpItem[] {
  try {
    return wx.getStorageSync(STORAGE_KEY) || []
  } catch {
    return []
  }
}

/** 保存全部条目 */
export function saveTotpItems(list: TotpItem[]): void {
  wx.setStorageSync(STORAGE_KEY, list)
}

/** 添加条目（自动生成 id 与 createdAt） */
export function addTotpItem(item: Omit<TotpItem, 'id' | 'createdAt'>): TotpItem {
  const full: TotpItem = {
    ...item,
    id: `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    createdAt: Date.now(),
  }
  const list = getTotpItems()
  list.push(full)
  saveTotpItems(list)
  return full
}

/** 更新条目 */
export function updateTotpItem(item: TotpItem): void {
  const list = getTotpItems()
  const idx = list.findIndex(c => c.id === item.id)
  if (idx !== -1) {
    list[idx] = item
    saveTotpItems(list)
  }
}

/** 删除条目 */
export function removeTotpItem(id: string): void {
  saveTotpItems(getTotpItems().filter(c => c.id !== id))
}

/** 校验 secret 是否有效（可解码且非空） */
export function isValidSecret(secret: string): boolean {
  return normalizeSecret(secret).length > 0
}

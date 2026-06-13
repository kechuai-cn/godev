// file.js
Page({
  data: {
    owner: '',
    repo: '',
    path: '',
    fileName: '',
    filePath: '',
    content: '',
    contentLines: [],
    isLoading: false,
    imageUrl: ''
  },

  onLoad: function(options) {
    this.setData({
      owner: options.owner,
      repo: options.repo,
      path: options.path,
      fileName: options.name,
      filePath: options.path
    })
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: options.name
    })
    // 加载文件内容
    this.loadFileContent()
  },

  // 加载文件内容
  loadFileContent: function() {
    const app = getApp()
    const { owner, repo, path, fileName } = this.data
    
    this.setData({
      isLoading: true
    })

    app.request(`/repos/${owner}/${repo}/contents/${path}`)
      .then(res => {
        this.setData({
          isLoading: false
        })

        // 检查是否为图片文件
        const isImage = this.isImageFile(fileName)
        
        if (isImage) {
          // 图片文件处理：直接使用微信图片预览或显示图片
          this.handleImageFile(res)
        } else if (res.encoding === 'base64') {
          // 非图片的base64文件，尝试解码为文本
          try {
            const content = wx.base64ToArrayBuffer(res.content)
            const decodedContent = this.arrayBufferToString(content)
            this.setData({
              content: decodedContent,
              contentLines: decodedContent.split('\n')
            })
          } catch (e) {
            // 解码失败，可能是二进制文件
            this.handleBinaryFile(fileName)
          }
        } else {
          // 直接文本内容
          this.setData({
            content: res.content,
            contentLines: res.content.split('\n')
          })
        }
      })
      .catch(err => {
        this.setData({
          isLoading: false,
          content: ''
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 判断是否为图片文件
  isImageFile: function(fileName) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp']
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(ext)
  },

  // 处理图片文件
  handleImageFile: function(res) {
    let imageUrl = ''
    if (res.download_url) {
      // 如果有download_url，使用download_url
      imageUrl = res.download_url
    } else if (res.content) {
      // 否则使用base64内容创建图片URL
      try {
        imageUrl = `data:image/${this.getImageType(this.data.fileName)};base64,${res.content}`
      } catch (e) {
        console.error('创建base64图片URL失败:', e)
        this.setData({
          content: '图片处理失败',
          contentLines: ['图片处理失败']
        })
        return
      }
    }
    
    // 保存图片URL到data中，用于页面显示
    this.setData({
      imageUrl: imageUrl
    })
    
    // 使用微信图片预览
    wx.previewImage({
      urls: [imageUrl],
      fail: (err) => {
        console.error('图片预览失败:', err)
        this.setData({
          imageUrl: '',
          content: '图片预览失败，请重试',
          contentLines: ['图片预览失败，请重试']
        })
      }
    })
  },

  // 点击查看大图
  previewFullImage: function() {
    if (this.data.imageUrl) {
      wx.previewImage({
        urls: [this.data.imageUrl],
        fail: (err) => {
          console.error('查看大图失败:', err)
          wx.showToast({
            title: '查看大图失败',
            icon: 'none'
          })
        }
      })
    }
  },

  // 处理二进制文件
  handleBinaryFile: function(fileName) {
    this.setData({
      content: `该文件为二进制文件，无法直接显示\n文件名: ${fileName}\n类型: 二进制文件`,
      contentLines: [`该文件为二进制文件，无法直接显示`, `文件名: ${fileName}`, `类型: 二进制文件`]
    })
  },

  // 获取图片类型
  getImageType: function(fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1)
    const imageTypes = {
      'png': 'png',
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'gif': 'gif',
      'bmp': 'bmp',
      'svg': 'svg+xml',
      'webp': 'webp'
    }
    return imageTypes[ext] || 'jpeg'
  },

  // 将ArrayBuffer转换为字符串
  arrayBufferToString: function(buffer) {
    try {
      // 对于微信小程序，使用TextDecoder API进行UTF-8解码
      // 先检查是否支持TextDecoder
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(buffer)
      } else {
        // 兼容处理：使用原生的wx.base64Decode（如果可用）
        // 或者使用另一种UTF-8解码方式
        let str = ''
        const uint8Array = new Uint8Array(buffer)
        let i = 0
        while (i < uint8Array.length) {
          let codePoint
          let bytesRead
          const byte = uint8Array[i]
          
          if (byte < 0x80) {
            codePoint = byte
            bytesRead = 1
          } else if (byte < 0xE0) {
            codePoint = ((byte & 0x1F) << 6) | (uint8Array[i + 1] & 0x3F)
            bytesRead = 2
          } else if (byte < 0xF0) {
            codePoint = ((byte & 0x0F) << 12) | ((uint8Array[i + 1] & 0x3F) << 6) | (uint8Array[i + 2] & 0x3F)
            bytesRead = 3
          } else {
            codePoint = ((byte & 0x07) << 18) | ((uint8Array[i + 1] & 0x3F) << 12) | ((uint8Array[i + 2] & 0x3F) << 6) | (uint8Array[i + 3] & 0x3F)
            bytesRead = 4
          }
          
          str += String.fromCodePoint(codePoint)
          i += bytesRead
        }
        return str
      }
    } catch (e) {
      console.error('UTF-8解码失败:', e)
      // 降级处理
      let str = ''
      const uint8Array = new Uint8Array(buffer)
      for (let i = 0; i < uint8Array.length; i++) {
        str += String.fromCharCode(uint8Array[i])
      }
      return str
    }
  }
})
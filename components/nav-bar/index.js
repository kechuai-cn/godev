Component({
  properties: {
    // 导航栏标题
    title: {
      type: String,
      value: ''
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      value: true
    },
    // 右侧按钮文字
    rightText: {
      type: String,
      value: ''
    }
  },

  data: {
    statusBarHeight: 0,  // 状态栏高度
    navContentHeight: 0, // 导航栏内容高度
    navBarHeight: 0      // 导航栏总高度
  },

  lifetimes: {
    attached() {
      this.calcNavBarHeight();
    }
  },

  methods: {
    // 计算导航栏高度（适配不同机型）
    calcNavBarHeight() {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync();
      // 状态栏高度
      const statusBarHeight = systemInfo.statusBarHeight;
      // 获取胶囊按钮位置信息
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      // 导航栏内容高度 = 胶囊按钮高度 + (胶囊按钮top - 状态栏高度) * 2
      const navContentHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;
      // 导航栏总高度 = 状态栏高度 + 导航栏内容高度
      const navBarHeight = statusBarHeight + navContentHeight;

      this.setData({
        statusBarHeight,
        navContentHeight,
        navBarHeight
      });
    },

    // 返回上一页
    handleBack() {
      wx.navigateBack({
        delta: 1
      });
    },

    // 右侧按钮点击事件（向外传递）
    handleRightClick() {
    }
  }
});
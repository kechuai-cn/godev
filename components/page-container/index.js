Component({

  options: {
    multipleSlots: true,
    dynamicSlots: true, 
  },


  /**
   * 组件的属性列表
   */
  properties: {
    refreshable: {
      type: Boolean,
      value: false
    },
    isRefreshing: {
      type: Boolean,
      value: false
    },
  },


  /**
   * 组件的初始数据
   */
  data: {
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onPullDownRefresh() {
      this.triggerEvent('refresh');
    },
    onReachBottom() {
      this.triggerEvent('loadMore');
    }
  }
})
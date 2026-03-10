App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-env-id', // 从环境变量读取
        traceUser: true
      })
    }

    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      location: null,
      config: {
        tencentMapKey: process.env.TENCENT_MAP_KEY
      }
    }
  },

  onShow() {
    // 页面显示
  },

  onHide() {
    // 页面隐藏
  },

  onError(msg) {
    console.error('小程序错误：', msg)
  }
})

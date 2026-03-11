// app.js - 小豆子旅行轨迹
App({
  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    navigationBarHeight: 44,
    cloudEnv: 'bean-postion-0gwpv82hf2e100ed'
  },

  onLaunch(options) {
    console.log('小程序启动', options);
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true
      });
      console.log('云开发初始化成功');
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }
    
    // 检查更新
    this.checkUpdate();
  },

  getSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      this.globalData.statusBarHeight = systemInfo.statusBarHeight;
      console.log('系统信息获取成功', systemInfo);
    } catch (error) {
      console.error('获取系统信息失败', error);
    }
  },

  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新', res.hasUpdate);
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      
      updateManager.onUpdateFailed(() => {
        wx.showModal({
          title: '更新失败',
          content: '新版本下载失败，请检查网络后重试',
          showCancel: false
        });
      });
    }
  },

  onShow(options) {
    console.log('小程序显示', options);
  },

  onHide() {
    console.log('小程序隐藏');
  }
});

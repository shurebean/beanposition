Page({
  data: {
    title: '打卡列表页面',
    loading: false,
    error: null
  },

  onLoad(options) {
    console.log('打卡列表 页面加载', options);
    this.getData();
  },

  onShow() {
    // 页面显示时刷新
    this.getData();
  },

  async getData() {
    try {
      this.setData({ loading: true, error: null });
      // TODO: 获取页面数据
      const result = await this.fetchData();
      this.setData({
        ...result,
        loading: false
      });
    } catch (error) {
      console.error('获取数据失败', error);
      this.setData({
        error: error.message || '获取数据失败',
        loading: false
      });
      wx.showToast({
        title: error.message || '获取数据失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  async fetchData() {
    // TODO: 实现数据获取
    return {};
  },

  onPullDownRefresh() {
    this.getData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
})
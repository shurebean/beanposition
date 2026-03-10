_ENV })

// 压缩配置
const MAX_SIZE = 800 * 1024  // 800KB
const COMPRESS_QUALITY = 80
const MAX_WIDTH = 1920

exports.main = async (event, context) => {
  const { imageId, userId } = event
  const { fileID, tempFileURL } = cloud.getWXContext()
  
  try {
    // 1. 获取图片信息
    const imageInfo = await cloud.getTempFileURL({
      fileList: [tempFileURL]
    })
    
    // 2. 如果图片超过800KB，进行压缩
    let finalFileID = fileID
    
    if (imageInfo.fileList[0].size > MAX_SIZE) {
      // 下载图片
      const imageBuffer = await request.get(tempFileURL, { encoding: null })
      
      // 使用第三方服务压缩图片（如：cloudinary）
      // 这里简化处理，实际需要使用图片压缩库
      const compressedImage = await compressImage(imageBuffer, {
        maxWidth: MAX_WIDTH,
        quality: COMPRESS_QUALITY
      })
      
      // 上传压缩后的图片
      const uploadResult = await cloud.uploadFile({
        cloudPath: `checkin/${userId}_${Date.now()}.jpg`,
        fileContent: compressedImage
      })
      
      finalFileID = uploadResult.fileID
    }
    
    return {
      code: 0,
      data: {
        fileID: finalFileID,
        compressed: imageInfo.fileList[0].size > MAX_SIZE
      }
    }
  } catch (error) {
    return { code: -1, message: error.message }
  }
}

// 图片压缩函数（需要安装sharp库）
async function compressImage(buffer, options) {
  const sharp = require('sharp')
  let image = sharp(buffer)
  
  // 调整尺寸
  const metadata = await image.metadata()
  if (metadata.width > options.maxWidth) {
    image = image.resize(options.maxWidth, null, {
      withoutEnlargement: true
    })
  }
  
  // 压缩质量
  image = image.jpeg({ quality: options.quality })
  
  return image.toBuffer()
}
```

### 6.2 时间线数据查询（支持年份筛选）

```javascript
// 云函数：getTimelineData（更新版）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { 
    userId, 
    page = 1, 
    pageSize = 100,
    filter = {},
    sortBy = 'asc'  // 'asc'从远到近 | 'desc'从近到远
  } = event
  
  try {
    // 1. 构建查询条件
    let whereCondition = { userId }
    
    // 年份筛选
    if (filter.year) {
      whereCondition['timeline.year'] = filter.year
    }
    
    // 2. 获取打卡记录
    const { data: checkins } = await db.collection('checkins')
      .where(whereCondition)
      .orderBy('visitDate', sortBy === 'asc' ? 'asc' : 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 3. 按年份、月份、城市分组
    const timeline = {}
    
    for (const checkin of checkins) {
      const date = new Date(checkin.visitDate)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      
      if (!timeline[year]) {
        timeline[year] = {}
      }
      if (!timeline[year][month]) {
        timeline[year][month] = {}
      }
      if (!timeline[year][month][checkin.city]) {
        timeline[year][month][checkin.city] = []
      }
      
      timeline[year][month][checkin.city].push({
        placeId: checkin.placeId,
        placeName: checkin.placeName,
        placeType: checkin.placeType,
        visitDate: checkin.visitDate,
        photos: checkin.photos,
        notes: checkin.notes
      })
    }
    
    // 4. 获取场所详情
    for (const year in timeline) {
      for (const month in timeline[year]) {
        for (const city in timeline[year][month]) {
          for (const item of timeline[year][month][city]) {
            let detail = null
            
            if (item.placeType === 'museum') {
              const res = await db.collection('museums')
                .doc(item.placeId)
                .get()
              detail = res.data
            } else if (item.placeType === 'themePark') {
              const res = await db.collection('themeParks')
                .doc(item.placeId)
                .get()
              detail = res.data
            }
            
            item.detail = detail
          }
        }
      }
    }
    
    return {
      code: 0,
      data: {
        timeline,
        total: checkins.length,
        hasMore: checkins.length === pageSize
      }
    }
  } catch (error) {
    return { code: -1, message: error.message }
  }
}
```

### 6.3 统计数据查询（更新）

```javascript
// 云函数：getStatistics（更新版）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { userId } = event
  
  try {
    const _ = db.command
    
    // 1. 总打卡次数
    const totalCheckins = await db.collection('checkins')
      .where({ userId })
      .count()
    
    // 2. 去过的城市数量
    const cityResult = await db.collection('checkins')
      .aggregate()
      .match({ userId })
      .group({
        _id: '$city'
      })
      .end()
    
    const cityCount = cityResult.list.length
    
    // 3. 去过的博物馆数量（新增）
    const museumResult = await db.collection('checkins')
      .aggregate()
      .match({ userId, placeType: 'museum' })
      .group({
        _id: '$placeId'
      })
      .end()
    
    const museumCount = museumResult.list.length
    
    // 4. 去过的游乐场数量（新增）
    const themeParkResult = await db.collection('checkins')
      .aggregate()
      .match({ userId, placeType: 'themePark' })
      .group({
        _id: '$placeId'
      })
      .end()
    
    const themeParkCount = themeParkResult.list.length
    
    // 5. 本月旅行次数
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const thisMonthCheckins = await db.collection('checkins')
      .where({
        userId,
        visitDate: _.gte(thisMonth + '-01')
      })
      .count()
    
    // 6. 覆盖的省份数量
    const provinceResult = await db.collection('checkins')
      .aggregate()
      .match({ userId })
      .group({
        _id: '$province'
      })
      .end()
    
    const provinceCount = provinceResult.list.length
    
    return {
      code: 0,
      data: {
        totalCheckins,
        cityCount,
        museumCount,        // 新增
        themeParkCount,     // 新增
        thisMonthCheckins,
        provinceCount
      }
    }
  } catch (error) {
    return { code: -1, message: error.message }
  }
}
```

### 6.4 清单数据查询（支持省份、类型过滤）

```javascript
// 云函数：getPlaceList（新增）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { 
    userId,
    placeType,         // 'museum' | 'themePark'
    filter = {}
  } = event
  
  try {
    const _ = db.command
    let collectionName = placeType === 'museum' ? 'museums' : 'themeParks'
    
    // 1. 构建查询条件
    let whereCondition = {}
    
    // 省份筛选
    if (filter.province) {
      whereCondition.province = filter.province
    }
    
    // 城市筛选
    if (filter.city) {
      whereCondition.city = filter.city
    }
    
    // 博物馆级别筛选
    if (filter.level && placeType === 'museum') {
      whereCondition['info.level'] = filter.level
    }
    
    // 游乐场品牌筛选
    if (filter.brand && placeType === 'themePark') {
      whereCondition.brand = filter.brand
    }
    
    // 2. 查询场所列表
    const { data: places } = await db.collection(collectionName)
      .where(whereCondition)
      .get()
    
    // 3. 查询用户的打卡和收藏记录
    const { data: checkins } = await db.collection('checkins')
      .where({ userId, placeType })
      .get()
    
    const { data: favorites } = await db.collection('userFavorites')
      .where({ userId, placeType })
      .get()
    
    // 4. 添加状态标记
    const checkinPlaceIds = checkins.map(c => c.placeId)
    const favoritePlaceIds = favorites.map(f => f.placeId)
    
    const placesWithStatus = places.map(place => {
      return {
        ...place,
        status: {
          isVisited: checkinPlaceIds.includes(place._id),
          isWantToGo: favoritePlaceIds.includes(place._id),
          visitDate: checkins.find(c => c.placeId === place._id)?.visitDate
        }
      }
    })
    
    // 5. 按城市分组
    const cityGroups = {}
    for (const place of placesWithStatus) {
      if (!cityGroups[place.city]) {
        cityGroups[place.city] = []
      }
      cityGroups[place.city].push(place)
    }
    
    // 6. 统计数据
    const total = places.length
    const visited = checkinPlaceIds.length
    const wantToGo = favoritePlaceIds.length
    
    return {
      code: 0,
      data: {
        cityGroups,
        total,
        visited,
        wantToGo
      }
    }
  } catch (error) {
    return { code: -1, message: error.message }
  }
}
```

---

## 七、开发计划（最终确认版）

### 7.1 开发阶段划分

| 阶段 | 任务 | 工作量 | 关键交付 |
|------|------|--------|----------|
| **第一阶段** | 项目初始化+数据库设计 | 2天 | 项目框架、数据表 |
| **第二阶段** | 数据同步+API集成 | 4天 | 博物馆数据、11品牌游乐场数据 |
| **第三阶段** | 首页+打卡功能 | 3天 | 首页、打卡表单、照片压缩 |
| **第四阶段** | 足迹+地图+时间线 | 5天 | 足迹页、时间线页（年份筛选、排序） |
| **第五阶段** | 清单+搜索功能 | 3天 | 清单页（省份、类型过滤） |
| **第六阶段** | 优化+测试 | 4天 | 性能优化、测试报告 |
| **总计** | | **21天** | **上线版本** |

### 7.2 详细任务清单

#### 第一阶段：项目初始化（第1-2天）
- [ ] 创建微信小程序项目
- [ ] 配置云开发环境
- [ ] 设计并创建6个数据库集合
- [ ] 配置腾讯地图SDK
- [ ] 准备11个品牌游乐场配置文件
- [ ] 配置国家文物局API Key

#### 第二阶段：数据同步+API集成（第3-6天）
- [ ] 设计博物馆数据模型
- [ ] 开发博物馆数据同步云函数
- [ ] 集成国家文物局API
- [ ] 准备GitHub数据源备用
- [ ] 开发11个品牌游乐场数据初始化脚本
- [ ] 实现数据导入云函数
- [ ] 实现定时同步任务
- [ ] 测试数据同步功能

#### 第三阶段：首页+打卡（第7-9天）
- [ ] 开发首页UI（含博物馆/游乐场统计）
- [ ] 实现统计数据计算（新增字段）
- [ ] 实现打卡记录列表（最近3次）
- [ ] 开发打卡页UI
- [ ] 实现表单验证
- [ ] 实现图片上传（自动压缩）
- [ ] 实现打卡提交（含时间线字段）

#### 第四阶段：足迹+地图+时间线（第10-14天）
- [ ] 开发足迹页UI
- [ ] 实现足迹统计
- [ ] 集成腾讯地图
- [ ] 实现气泡标记
- [ ] 实现地图交互
- [ ] 开发城市清单
- [ ] 开发时间线页面（新增）
- [ ] 实现时间线数据聚合
- [ ] 实现时间线渲染（年份、月份、城市三层）
- [ ] 实现年份筛选（新增）
- [ ] 实现排序切换（新增）
- [ ] 实现详情弹窗

#### 第五阶段：清单+搜索（第15-17天）
- [ ] 开发清单页UI
- [ ] 实现双列表（博物馆/游乐场）
- [ ] 实现省份筛选（新增）
- [ ] 实现城市筛选（联动省份）
- [ ] 实现类型筛选（博物馆级别/游乐场品牌）【新增】
- [ ] 实现状态筛选（去过/想去）
- [ ] 实现收藏功能
- [ ] 实现场所搜索
- [ ] 实现位置匹配

#### 第六阶段：优化+测试（第18-21天）
- [ ] 性能优化（时间线虚拟列表）
- [ ] 图片压缩性能优化
- [ ] 数据查询优化
- [ ] 兼容性测试
- [ ] 功能测试（全部）
- [ ] 数据同步测试
- [ ] 照片上传测试
- [ ] 筛选功能测试
- [ ] Bug修复
- [ ] 提交审核
- [ ] 准备上线

---

## 八、项目结构（最终确认版）

```
小豆子旅行轨迹/
├── pages/
│   ├── index/          # 首页
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.js
│   ├── footprint/      # 足迹页
│   ├── timeline/       # 时间线页
│   │   ├── timeline.wxml
│   │   ├── timeline.wxss
│   │   └── timeline.js
│   ├── list/           # 清单页
│   │   ├── list.wxml
│   │   ├── list.wxss
│   │   └── list.js
│   ├── checkin/        # 打卡页
│   │   ├── checkin.wxml
│   │   ├── checkin.wxss
│   │   └── checkin.js
│   └── checkin-list/   # 打卡详情页
├── components/
│   ├── map-marker/     # 地图标记组件
│   ├── place-card/     # 场所卡片组件
│   ├── timeline-card/  # 时间线卡片组件
│   ├── image-upload/   # 图片上传组件（含压缩）
│   ├── detail-modal/   # 详情弹窗组件
│   ├── filter-bar/     # 筛选栏组件（新增）
│   └── city-group/     # 城市分组组件（新增）
├── config/
│   ├── museums.json    # 博物馆备选数据
│   └── theme-parks.json # 游乐场配置（11个品牌）
├── cloudfunctions/
│   ├── addCheckin/
│   ├── getStatistics/
│   ├── getCheckins/
│   ├── searchPlaces/
│   ├── toggleFavorite/
│   ├── getNearbyPlaces/
│   ├── uploadImage/    # 照片上传+压缩
│   ├── syncMuseumData/
│   ├── syncThemeParkData/
│   ├── getTimelineData/
│   ├── getPlaceDetail/
│   └── getPlaceList/  # 场所列表查询（新增）
├── utils/
│   ├── request.js
│   ├── storage.js
│   ├── map.js
│   ├── timeline.js
│   ├── image.js        # 图片压缩工具（新增）
│   └── filter.js       # 筛选工具（新增）
├── styles/
│   └── common.wxss
├── images/
│   └── ...
├── app.js
├── app.json
└── app.wxss
```

---

## 九、测试方案（最终确认版）

### 9.1 功能测试清单

#### 打卡功能测试
- [ ] 新增打卡成功
- [ ] 场所选择正常
- [ ] 日期选择正常
- [ ] 笔记输入限制500字
- [ ] 照片上传最多9张
- [ ] 照片自动压缩生效（超过800KB）
- [ ] 表单验证生效
- [ ] 打卡记录保存
- [ ] 统计数据更新

#### 首页功能测试
- [ ] 统计数据显示正确
- [ ] 博物馆数量统计正确（新增）
- [ ] 游乐场数量统计正确（新增）
- [ ] 最近打卡显示3次
- [ ] 点击查看全部跳转

#### 足迹功能测试
- [ ] 地图显示正常
- [ ] 气泡标记正确
- [ ] 城市清单准确
- [ ] 统计数据正确
- [ ] 点击时间线跳转

#### 时间线功能测试（新增）
- [ ] 时间线显示正常
- [ ] 年份、月份、城市分组正确
- [ ] 年份筛选生效（新增）
- [ ] 排序切换生效（新增）
- [ ] 点击场所显示详情
- [ ] 详情弹窗信息完整
- [ ] 分页加载正常

#### 清单功能测试
- [ ] 场所列表显示正常
- [ ] 省份筛选生效（新增）
- [ ] 类型筛选生效（新增）
- [ ] 状态筛选生效
- [ ] 搜索功能正常
- [ ] 收藏功能正常
- [ ] 想去功能正常
- [ ] 城市分组显示正常

#### 数据同步测试
- [ ] 博物馆数据同步成功
- [ ] 游乐场数据初始化成功（11个品牌）
- [ ] 增量同步正常
- [ ] 定时任务执行
- [ ] 同步日志记录

---

## 十、最终确认总结

### 10.1 用户确认内容

| 确认项 | 用户选择 | 实现方案 |
|--------|----------|----------|
| 1. 数据源 | 1A（有API Key） | 使用国家文物局API |
| 2. 时间线排序 | 2C（支持切换） | 用户可选从远到近/从近到远 |
| 3. 开发优先级 | 不变 | 按原6阶段推进 |
| 4. 游乐场范围 | 支持11个品牌 | 迪士尼、环球影城、长隆、欢乐谷、欢乐大世界、方特、宋城演艺、中华恐龙园、海洋公园、冰雪大世界 |
| 5. 时间线筛选 | 支持按年份筛选 | 增加年份筛选器 |
| 6. 照片上传 | 保持9张，支持自动压缩 | 超过800KB自动压缩 |
| 7. 地图展示 | 保持现状 | 城市气泡显示 |
| 8. 统计数据 | 需要增加 | 增加博物馆/游乐场数量 |
| 9. 首页最近打卡 | 保持3次 | 不变 |
| 10. 清单过滤 | 需要 | 增加省份、类型筛选 |

### 10.2 核心功能清单

- ✅ 首页：旅行统计（含博物馆/游乐场）、最近3次打卡
- ✅ 足迹：地图足迹、城市清单、时间线入口
- ✅ 时间线：按时间回顾、年份筛选、排序切换、详情查看
- ✅ 清单：博物馆/游乐场清单、省份筛选、类型筛选、收藏、想去
- ✅ 打卡：新增打卡、照片上传（自动压缩）、位置匹配

### 10.3 数据源清单

**博物馆：**
- ✅ 国家文物局API（主）
- ✅ GitHub开源数据（备用）

**游乐场（11个品牌）：**
- ✅ 迪士尼（上海、香港）
- ✅ 环球影城（北京）
- ✅ 长隆（广州欢乐世界、珠海海洋王国）
- ✅ 欢乐谷（北京、上海）
- ✅ 欢乐大世界（武汉）
- ✅ 方特（郑州、武汉等）
- ✅ 宋城演艺（杭州、三亚等）
- ✅ 中华恐龙园（常州）
- ✅ 海洋公园（北京海洋馆、长隆海洋王国等）
- ✅ 冰雪大世界（哈尔滨等）

### 10.4 技术实现要点

1. **照片自动压缩**
   - 超过800KB自动压缩
   - 使用sharp库处理
   - 保持质量80%

2. **时间线筛选**
   - 支持年份筛选
   - 支持排序切换
   - 按年份、月份、城市三层分组

3. **统计数据扩展**
   - 博物馆数量
   - 游乐场数量
   - 云函数聚合计算

4. **清单过滤增强**
   - 省份筛选
   - 博物馆级别筛选
   - 游乐场品牌筛选

### 10.5 开发周期

**总工作量：21个工作日**

| 阶段 | 任务 | 工作量 | 开始日期 | 结束日期 |
|------|------|--------|----------|----------|
| 第一阶段 | 项目初始化+数据库设计 | 2天 | Day 1 | Day 2 |
| 第二阶段 | 数据同步+API集成 | 4天 | Day 3 | Day 6 |
| 第三阶段 | 首页+打卡功能 | 3天 | Day 7 | Day 9 |
| 第四阶段 | 足迹+地图+时间线 | 5天 | Day 10 | Day 14 |
| 第五阶段 | 清单+搜索功能 | 3天 | Day 15 | Day 17 |
| 第六阶段 | 优化+测试 | 4天 | Day 18 | Day 21 |

### 10.6 交付物清单

**第一阶段：**
- [ ] 微信小程序项目框架
- [ ] 6个数据库集合设计文档
- [ ] 配置文件（地图Key、API Key）
- [ ] 游乐场数据配置文件

**第二阶段：**
- [ ] 博物馆数据同步云函数
- [ ] 游乐场数据初始化云函数
- [ ] 数据同步日志功能
- [ ] 定时同步任务配置
- [ ] 数据同步测试报告

**第三阶段：**
- [ ] 首页页面（WXML/WXSS/JS）
- [ ] 打卡页面
- [ ] 统计数据云函数
- [ ] 照片上传云函数（含压缩）
- [ ] 打卡提交云函数

**第四阶段：**
- [ ] 足迹页面
- [ ] 时间线页面
- [ ] 地图组件
- [ ] 时间线数据云函数
- [ ] 场所详情云函数

**第五阶段：**
- [ ] 清单页面
- [ ] 筛选组件
- [ ] 场所列表云函数
- [ ] 搜索云函数

**第六阶段：**
- [ ] 性能优化报告
- [ ] 功能测试报告
- [ ] 兼容性测试报告
- [ ] Bug修复清单
- [ ] 上线版本
- [ ] 用户手册

---

## 十一、下一步行动

### 立即行动

1. **✅ 方案确认** - 用户已完成所有细节确认
2. **⏭️ 准备API Key** - 请提供国家文物局API Key
3. **⏭️ 搭建开发环境** - 安装微信开发者工具
4. **⏭️ 配置腾讯地图** - 确认地图Key可用

### 开发准备

**需要提供：**
- [ ] 国家文物局API Key
- [ ] 腾讯地图小程序Key
- [ ] 高德地图Key（备用）
- [ ] 微信小程序AppID

**开始开发前检查：**
- [ ] 云开发环境已开通
- [ ] 数据库已创建
- [ ] 云存储已开通
- [ ] 地图Key已配置
- [ ] API Key已配置

---

## 本方案总结

### ✅ 方案完整性

1. **功能覆盖** - 四个页面全覆盖，时间线功能完整
2. **数据源丰富** - 博物馆5000+，游乐场11个品牌
3. **技术实现** - 云函数、数据库、地图集成
4. **开发计划** - 6阶段21天，任务明确
5. **测试方案** - 功能、性能、兼容性全覆盖

### 🎯 核心优势

1. **用户体验优先**
   - 时间线直观回顾
   - 照片自动压缩
   - 筛选功能丰富

2. **数据权威可靠**
   - 国家文物局API
   - 11大游乐场品牌
   - 定时同步更新

3. **技术先进**
   - 微信云开发
   - 云函数聚合
   - 性能优化

4. **可扩展性强**
   - 模块化设计
   - 易于新增品牌
   - 预留扩展接口

### 📦 文档清单

已生成文档：
1. ✅ 小豆子旅行轨迹-开发方案-含时间线.md
2. ✅ 小豆子旅行轨迹-开发方案-含时间线-续.md
3. ✅ 小豆子旅行轨迹-完整开发方案.md
4. ✅ 小豆子旅行轨迹-方案摘要与确认.md
5. ✅ 小豆子旅行轨迹-开发方案-最终确认版.md
6. ✅ 小豆子旅行轨迹-开发方案-最终确认版-续.md

---

*最终确认版版本：v3.0*  
*确认时间：2026-03-10*  
*所有用户需求已确认，准备开始开发！*  

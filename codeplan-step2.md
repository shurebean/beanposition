# 小豆子旅行轨迹 - 阶段2：数据层开发

**项目名称：** 小豆子旅行轨迹  
**阶段名称：** 数据层开发  
**生成时间：** 2026-03-11  
**版本：** v1.0  

---

## 📐 阶段概述

本阶段主要完成数据层的开发，包括：
1. 创建数据库集合
2. 初始化游乐场数据
3. 同步博物馆数据

**任务数量：** 3个  
**预计时间：** 1天（480分钟）  
**前置条件：** 阶段1（环境搭建）完成  

---

## 📋 开发任务列表

### 任务2.1：创建数据库集合

**任务描述：**  
在微信云开发数据库中创建6个集合，并配置索引的索引。

**集合列表：**
1. `users` - 用户表
2. `checkins` - 打卡记录表
3. `museums` - 博物馆表
4. `themeParks` - 游乐场表
5. `userFavorites` - 用户收藏/想去表
6. `dataSyncLog` - 数据同步日志表

**集合设计：**

#### users（用户表）
```json
{
  "_id": "用户ID",
  "openid": "微信openid",
  "nickName": "昵称",
  "avatarUrl": "头像",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

#### checkins（打卡记录表）
```json
{
  "_id": "记录ID",
  "userId": "用户ID",
  "placeType": "场所类型",
  "placeId": "场所ID",
  "placeName": "场所名称",
  "city": "城市",
  "province": "省份",
  "visitDate": "参观日期",
  "visitTime": "参观时间",
  "notes": "参观笔记",
  "photos": ["照片云存储路径"],
  "location": {
    "latitude": 纬度,
    "longitude": 经度
  },
  "timeline": {
    "year": 2025,
    "month": 1,
    "season": "winter"
  },
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

#### museums（博物馆表）
```json
{
  "_id": "博物馆ID",
  "source": "ncha" | "github",
  "sourceId": "源数据ID",
  "name": "博物馆名称",
  "englishName": "英文名称",
  "province": "省份",
  "city": "城市",
  "district": "区县",
  "address": "详细地址",
  "location": {
    "latitude": 纬度,
    "longitude": 经度
  },
  "info": {
    "openTime": "开放时间",
    "ticketInfo": "门票信息",
    "level": "博物馆级别",
    "type": "博物馆类型",
    "phone": "联系电话",
    "website": "官方网站",
    "tags": ["标签数组"],
    "introduction": "简介"
  },
  "syncTime": "同步时间",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

#### themeParks（游乐场表）
```json
{
  "_id": "游乐场ID",
  "brand": "品牌",
  "name": "游乐场名称",
  "location": {
    "province": "省份",
    "city": "城市",
    "district": "区县",
    "address": "详细地址",
    "coordinates": [纬度, 经度]
  },
  "facilities": ["设施列表"],
  "ticketInfo": {
    "adult": "成人票价格",
    "child": "儿童票价格",
    "student": "学生票价格",
    "annual": "年卡价格",
    "night": "夜场价格",
    "peak": "高峰票价格"
  },
  "openTime": "开放时间",
  "website": "官方网站",
  "phone": "联系电话",
  "tags": ["标签"],
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

#### userFavorites（用户收藏/想去表）
```json
{
  "_id": "记录ID",
  "userId": "用户ID",
  "placeType": "museum" | "themePark",
  "placeId": "场所ID",
  "isWantToGo": true/false,
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

#### dataSyncLog（数据同步日志表）
```json
{
  "_id": "日志ID",
  "dataType": "museum" | "themePark",
  "source": "数据来源",
  "status": "success" | "failed" | "partial",
  "totalCount": "总记录数",
  "successCount": "成功数量",
  "failedCount": "失败数量",
  "errorMessage": "错误信息",
  "syncTime": "同步时间",
  "duration": "耗时（秒）"
}
```

**索引设计：**

```json
{
  "users": {
    "indexes": [
      {
        "name": "openid",
        "fields": ["openid"],
        "unique": true
      }
    ]
  },
  "checkins": {
    "indexes": [
      {
        "name": "userId",
        "fields": ["userId"]
      },
      {
        "name": "userId_visitDate",
        "fields": ["userId", "visitDate"]
      },
      {
        "name": "timeline",
        "fields": ["timeline.year", "timeline.month"]
      }
    ]
  },
  "museums": {
    "indexes": [
      {
        "name": "province_city",
        "fields": ["province", "city"]
      },
      {
        "name": "level",
        "fields": ["info.level"]
      },
      {
        "name": "type",
        "fields": ["info.type"]
      }
    ]
  },
  "themeParks": {
    "indexes": [
      {
        "name": "brand",
        "fields": ["brand"]
      },
      {
        "name": "province_city",
        "fields": ["location.province", "location.city"]
      }
    ]
  },
  "userFavorites": {
    "indexes": [
      {
        "name": "userId",
        "fields": ["userId"]
      },
      {
        "name": "userId_placeType_placeId",
        "fields": ["userId", "placeType", "placeId"],
        "unique": true
      }
    ]
  },
  "dataSyncLog": {
    "indexes": [
      {
        "name": "dataType",
        "fields": ["dataType"]
      },
      {
        "name": "syncTime",
        "fields": ["syncTime"]
      }
    ]
  }
}
```

**验收标准：**
- [ ] 6个集合都创建成功
- [ ] 每个集合有正确的索引
- [ ] users 集合的 openid 索引设置为 unique
- [ ] checkins 集合的复合索引正确
- [ ] userFavorites 集合的复合索引设置为 unique
- [ ] 权限设置正确（所有用户可读，仅创建者可写）

**预计时间：** 20分钟

---

### 任务2.2：初始化游乐场数据

**任务描述：**  
将开发方案中定义的11个品牌、18个游乐场的初始化数据写入 `themeParks` 集合。

**数据来源：** 开发方案中的 18 个游乐场配置

**数据格式：**

```javascript
const THEME_PARKS_DATA = [
  // 11个品牌，18个游乐场
  // ... (详细数据见 DEVELOPMENT_PLAN.md)
];
```

**数据初始化脚本：**

```javascript
// cloudfunctions/syncThemeParkData/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 1. 获取游乐场数据
    const themeParks = require('../../data/theme-parks.json');
    
    // 2. 批量写入数据库
    const writeResult = await db.collection('themeParks').add({
      data: themeParks
    });
    
    // 3. 记录同步日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'themePark',
        source: 'internal',
        status: 'success',
        totalCount: themeParks.length,
        successCount: themeParks.length,
        failedCount: 0,
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000
      }
    });
    
    return {
      success: true,
      count: themeParks.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

**验收标准：**
- [ ] 18个游乐场数据写入成功
- [ ] 数据格式正确
- [ ] 坐标数据正确（latitude/longitude）
- [ ] 品牌信息正确
- [ ] 设施数据正确
- [ ] 门票信息正确
- [ ] 同步日志记录正确

**预计时间：** 15分钟

---

### 任务2.3：同步博物馆数据

**任务描述：**  
从GitHub开源数据源同步博物馆数据到 `museums` 集合。

**数据源：** GitHub开源博物馆列表

**数据源URL：**  
```
https://raw.githubusercontent.com/xxxxx/xxxxx/master/museums.json
```

**数据转换逻辑：**

```javascript
// 数据转换函数
function transformMuseumData(githubData) {
  return githubData.map(item => ({
    _id: `museum_${item.id}`,
    source: 'github',
    sourceId: item.id,
    name: item.name,
    englishName: item.englishName || '',
    province: item.province || '',
    city: item.city || '',
    district: item.district || '',
    address: item.address || '',
    location: {
      latitude: item.latitude || 0,
      longitude: item.longitude || 0
    },
    info: {
      openTime: item.openTime || '',
      ticketInfo: item.ticketInfo || '',
      level: item.level || '',
      type: item.type || '',
      phone: item.phone || '',
      website: item.website || '',
      tags: item.tags || [],
      introduction: item.introduction || ''
    },
    syncTime: new Date().toISOString(),
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  }));
}
```

**数据同步脚本：**

```javascript
// cloudfunctions/syncMuseumData/index.js
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const startTime = Date.now();
  
  try {
    // 1. 从GitHub拉取数据
    const response = await axios.get('https://raw.githubusercontent.com/xxxxx/xxxxx/master/museums.json');
    const githubData = response.data;
    
    // 2. 转换数据格式
    const museums = transformMuseumData(githubData);
    
    // 3. 删除旧数据（可选）
    // await db.collection('museums').where({ source: 'github' }).remove();
    
    // 4. 批量写入新数据
    const writeResult = await db.collection('museums').add({
      data: museums
    });
    
    // 5. 记录同步日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'museum',
        source: 'github',
        status: 'success',
        totalCount: museums.length,
        successCount: museums.length,
        failedCount: 0,
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000
      }
    });
    
    return {
      success: true,
      count: museums.length,
      duration: (Date.now() - startTime) / 1000
    };
    
  } catch (error) {
    // 记录失败日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'museum',
        source: 'github',
        status: 'failed',
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        errorMessage: error.message,
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000
    }
    });
    
    return {
      success: false,
      error: error.message
    };
  }
};
```

**数据去重逻辑：**

```javascript
// 去重函数
function deduplicateMuseums(newMuseums) {
  return db.collection('museums').where({
    source: 'github'
  }).get().then(result => {
    const existingIds = result.data.map(m => m._id);
    return newMuseums.filter(m => !existingIds.includes(m._id));
  });
}
```

**验收标准：**
- [ ] 博物馆数据同步成功
- [ ] 数据格式转换正确
- [ ] 坐标数据正确
- [ ] 博物馆级别信息正确
- [ ] 去重处理正确（避免重复）
- [ ] 同步日志记录完整
- [ ] 错误处理正确（失败时记录日志）

**预计时间：** 25分钟

---

## 📂 目录结构划分

### 阶段2完成后的新增目录结构

```
/home/beanposition/
├── data/                           # 数据目录（新建）
│   ├── theme-parks.json            # 游乐场初始化数据
│   └── museums-backup.json         # 博物馆备份数据
├── cloudfunctions/
│   ├── syncMuseumData/
│   │   ├── index.js
│   │   └── package.json
│   └── syncThemeParkData/
│       ├── index.js
│       └── package.json
└── docs/
    └── 数据库设计.md               # 数据库详细设计文档（新建）
```

---

## 💻 代码功能划分

### 数据库管理

**db-manager.js - 数据库管理器**

```javascript
class DatabaseManager {
  constructor(db) {
    this.db = db;
  }
  
  // 创建集合
  async createCollection(collectionName, schema) {}
  
  // 创建索引
  async createIndex(collectionName, indexConfig) {}
  
  // 批量插入数据
  async bulkInsert(collectionName, data) {}
  
  // 查询数据
  async query(collectionName, where, options) {}
  
  // 更新数据
  async update(collectionName, where, data) {}
  
  // 删除数据
  async delete(collectionName, where) {}
  
  // 去重
  async deduplicate(collectionName, uniqueFields) {}
}

module.exports = DatabaseManager;
```

### 数据同步器

**data-sync.js - 数据同步器**

```javascript
class DataSync {
  constructor(db) {
    this.db = db;
    this.dbManager = new DatabaseManager(db);
  }
  
  // 同步博物馆数据
  async syncMuseums(source) {}
  
  // 同步游乐场数据
  async syncThemeParks() {}
  
  // 记录同步日志
  async logSyncResult(result) {}
  
  // 转换博物馆数据
  transformMuseumData(rawData) {}
  
  // 验证数据格式
  validateData(data, schema) {}
}

module.exports = DataSync;
```

---

## 🧪 测试场景

### 场景1：数据库集合创建测试

**场景描述：** 验证6个数据库集合创建成功。

**测试步骤：**
1. 登录云开发控制台
2. 进入数据库管理
3. 验证6个集合都存在
4. 验证每个集合的索引正确

**预期结果：**
- 6个集合都存在
- users 集合有 openid 索引
- checkins 集合有复合索引
- userFavorites 集合有唯一索引

---

### 场景2：游乐场数据初始化测试

**场景描述：** 验证游乐场数据初始化成功。

**测试步骤：**
1. 调用 syncThemeParkData 云函数
2. 查询 themeParks 集合
3. 验证数据数量为18
4. 验证数据格式正确

**预期结果：**
- 数据数量为18
- 每个游乐场包含必要字段
- 坐标数据正确
- 品牌信息正确

---

### 场景3：博物馆数据同步测试

**场景描述：** 验证博物馆数据同步成功。

**测试步骤：**
1. 调用 syncMuseumData 云函数
2. 查询 museums 集合
3. 验证数据数量合理（1000+）
4. 验证数据格式正确
5. 验证去重功能正确

**预期结果：**
- 数据数量合理
- 每个博物馆包含必要字段
- 级别信息正确
- 去重功能正常

---

### 场景4：数据去重测试

**场景描述：** 验证数据去重功能正常。

**测试步骤：**
1. 第一次同步博物馆数据
2. 记录数据数量
3. 第二次同步博物馆数据
4. 验证数据数量不变

**预期结果：**
- 第一次同步成功
- 第二次同步不新增重复数据
- 数据数量保持不变

---

### 场景5：索引功能测试

**场景描述：** 验证数据库索引功能正常。

**测试步骤：**
1. 使用索引查询 users 集合（by openid）
2. 使用索引查询 checkins 集合（by userId + visitDate）
3. 验证查询速度合理

**预期结果：**
- 索引查询正常
- 查询速度合理（< 1秒）
- 复合索引正常工作

---

## ✅ 测试用例开发计划

### 用例2.1：验证数据库集合创建

```javascript
describe('任务2.1：创建数据库集合', () => {
  it('应该创建 6 个集合', async () => {
    const collections = await db.listCollections();
    expect(collections.length).toBeGreaterThanOrEqual(6);
  });

  it('users 集合应该有 openid 索引', async () => {
    const indexes = await db.collection('users').getIndexes();
    expect(indexes).toContain('openid');
  });

  it('checkins 集合应该有复合索引', async () => {
    const indexes = await db.collection('checkins').getIndexes();
    expect(indexes).toContain('userId_visitDate');
  });

  it('userFavorites 集合应该有唯一索引', async () => {
    const indexes = await db.collection('userFavorites').getIndexes();
    expect(indexes).toContain('userId_placeType_placeId');
  });
});
```

### 用例2.2：验证游乐场数据初始化

```javascript
describe('任务2.2：初始化游乐场数据', () => {
  it('应该写入 18 个游乐场数据', async () => {
    const result = await cloud.callFunction({
      name: 'syncThemeParkData',
      data: {}
    });
    
    expect(result.result.success).toBe(true);
    expect(result.result.count).toBe(18);
  });

  it('游乐场数据应该包含必要字段', async () => {
    const result = await db.collection('themeParks').get();
    expect(result.data.length).toBe(18);
    
    result.data.forEach(park => {
      expect(park).toHaveProperty('brand');
      expect(park).toHaveProperty('name');
      expect(park).toHaveProperty('location');
      expect(park).toHaveProperty('facilities');
      expect(park).toHaveProperty('ticketInfo');
    });
  });

  it('坐标数据应该正确', async () => {
    const result = await db.collection('themeParks').get();
    
    result.data.forEach(park => {
      expect(park.location.coordinates).toHaveLength(2);
      expect(park.location.coordinates[0]).toBeGreaterThanOrEqual(-90);
      expect(park.location.coordinates[0]).toBeLessThanOrEqual(90);
      expect(park.location.coordinates[1]).toBeGreaterThanOrEqual(-180);
      expect(park.location.coordinates[1]).toBeLessThanOrEqual(180);
    });
  });
});
```

### 用例2.3：验证博物馆数据同步

```javascript
describe('任务2.3：同步博物馆数据', () => {
  it('应该同步博物馆数据', async () => {
    const result = await cloud.callFunction({
      name: 'syncMuseumData',
      data: {}
    });
    
    expect(result.result.success).toBe(true);
    expect(result.result.count).toBeGreaterThan(0);
  });

  it('博物馆数据应该包含必要字段', async () => {
    const result = await db.collection('museums').limit(10).get();
    
    result.data.forEach(museum => {
      expect(museum).toHaveProperty('name');
      expect(museum).toHaveProperty('province');
      expect(museum).toHaveProperty('city');
      expect(museum).toHaveProperty('location');
      expect(museum).toHaveProperty('info');
      expect(museum.info).toHaveProperty('level');
      expect(museum.info).toHaveProperty('type');
    });
  });

  it('级别数据应该正确', async () => {
    const result = await db.collection('museums').where({
      'info.level': db.RegExp({
        regexp: '^(国家一级|国家二级|国家三级)'
      })
    }).get();
    
    expect(result.data.length).toBeGreaterThanGreaterThan(0);
  });

  it('坐标数据应该正确', async () => {
    const result = await db.collection('museums').limit(10).get();
    
    result.data.forEach(museum => {
      expect(museum.location.latitude).toBeGreaterThanOrEqual(-90);
      expect(museum.location.latitude).toBeLessThanOrEqual(90);
      expect(museum.location.longitude).toBeGreaterThanOrEqual(-180);
      expect(museum.location.longitude).toBeLessThanOrEqual(180);
    });
  });

  it('应该记录同步日志', async () => {
    const result = await cloud.callFunction({
      name: 'syncMuseumData',
      data: {}
    });
    
    const logs = await db.collection('dataSyncLog').where({
      dataType: 'museum',
      syncTime: db.command.gt(new Date(Date.now() - 60000))
    }).get();
    
    expect(logs.data.length).toBeGreaterThan(0);
    expect(logs.data[0].status).toBe('success');
  });
});
```

---

## ✅ 阶段验收标准

### 完整性验收

**数据库集合：**
- [ ] 6个集合都创建成功
- [ ] users 集合结构正确
- [ ] checkins 集合结构正确
- [ ] museums 集合结构正确
- [ ] themeParks 集合结构正确
- [ ] userFavorites 集合结构正确
- [ ] dataSyncLog 集合结构正确

**数据库索引：**
- [ ] users 集合有 openid 索引（unique）
- [ ] checkins 集合有 userId 索引
- [ ] checkins 集合有 userId_visitDate 索引
- [ ] museums 集合有 province_city 索引
- [ ] museums 集合有 level 索引
- [ ] themeParks 集合有 brand 索引
- [ ] userFavorites 集合有 userId_placeType_placeId 索引（unique）

**数据初始化：**
- [ ] 游乐场数据初始化成功（18条）
- [ ] 博物馆数据同步成功（1000+条）
- [ ] 数据格式正确
- [ ] 数据去重正常

---

### 功能性验收

**数据库功能：**
- [ ] 集合创建功能正常
- [ ] 索引创建功能正常
- [ ] 数据插入功能正常
- [ ] 数据查询功能正常
- [ ] 数据更新功能正常
- [ ] 数据删除功能正常

**数据同步功能：**
- [ ] GitHub数据拉取正常
- [ ] 数据格式转换正确
- [ ] 数据去重功能正常
- [ ] 同步日志记录完整
- [ ] 错误处理正确

---

### 性能性验收

**查询性能：**
- [ ] 索引查询响应时间 < 1秒
- [ ] 复合索引查询响应时间 < 1秒
- [ ] 分页查询响应时间 < 1秒

**数据同步性能：**
- [ ] 游乐场数据同步完成（< 30秒）
- [ ] 博物馆数据同步完成（< 2分钟）
- [ ] 数据去重处理正常

---

### 安全性验收

**权限控制：**
- [ ] 数据库权限设置正确
- [ ] 敏感数据不泄露
- [ ] 用户数据隔离正确

**数据验证：**
- [ ] 输入数据验证正确
- [ ] 数据格式验证正确
- [ ] 数据范围验证正确

---

## 📊 预计时间

| 任务 | 预计时间 | 累计时间 |
|------|----------|----------|
| 任务2.1：创建数据库集合 | 20分钟 | 20分钟 |
| 任务2.2：初始化游乐场数据 | 15分钟 | 35分钟 |
| 任务2.3：同步博物馆数据 |[ 25分钟 | **60分钟（1小时）** |

---

## 🔄 任务确认流程

### 开始确认阶段2

请对以下3个任务逐一确认：

**任务2.1：创建数据库集合**
- 回复 "确认" - 同意执行
- 回复 "跳过" - 跳过该任务
- 回复复 "修改：你的意见" - 提出修改意见

**任务2.2：初始化游乐场数据**
- 回复 "确认" - 同意执行
- 回复 "跳过" - 跳过该任务
- 回复 "修改：你的意见" - 提出修改意见

**任务2.3：同步博物馆数据**
- 回复 "确认" - 同意执行
- 回复 "跳过" - 跳过该任务
- 回复 "修改：你的意见" - 提出修改意见

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|----------|--------|
| 2026-03-11 | v1.0 | 初始版本 | OpenClaw |

---

*文档版本：v1.0*  
*生成时间：2026-03-11*  
*状态：等待确认*

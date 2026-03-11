/**
 * 数据库初始化脚本
 * 
 * 使用方法：
 * 1. 在微信开发者工具中打开项目
 * 2. 在云开发控制台中打开数据库
 * 3. 手动创建以下 6 个集合：
 *    - users
 *    - checkins
 *    - museums
 *    - themeParks
 *    - userFavorites
 *    - dataSyncLog
 * 4. 在云开发控制台中运行此脚本的云函数版本
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 初始化数据库
 */
exports.main = async (event, context) => {
  const startTime = Date.now();
  const logs = [];
  
  try {
    logs.push({ message: '开始初始化数据库...', time: Date.now() });
    
    // 1. 初始化游乐场数据
    logs.push({ message: '初始化游乐场数据...', time: Date.now() });
    const themeParksResult = await initThemeParks();
    logs.push({ 
      message: `游乐场数据初始化完成：${themeParksResult.count} 条`, 
      time: Date.now() 
    });
    
    // 2. 同步博物馆数据
    logs.push({ message: '同步博物馆数据...', time: Date.now() });
    const museumsResult = await syncMuseums();
    logs.push({ 
      message: `博物馆数据同步完成：${museumsResult.count} 条`, 
      time: Date.now() 
    });
    
    // 3. 记录初始化日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'database_init',
        source: 'init_script',
        status: 'success',
        totalCount: themeParksResult.count + museumsResult.count,
        successCount: themeParksResult.count + museumsResult.count,
        failedCount: 0,
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000
      }
    });
    
    logs.push({ 
      message: '数据库初始化完成！', 
      time: Date.now() 
    });
    
    return {
      success: true,
      themeParks: themeParksResult.count,
      museums: museumsResult.count,
      duration: (Date.now() - startTime) / 1000,
      logs
    };
    
  } catch (error) {
    logs.push({ 
      message: `数据库初始化失败：${error.message}`, 
      time: Date.now() 
    });
    
    return {
      success: false,
      error: error.message,
      logs
    };
  }
};

/**
 * 初始化游乐场数据
 */
async function initThemeParks() {
  try {
    // 读取游乐场数据
    const themeParks = require('../data/theme-parks.json');
    
    // 检查是否已存在数据
    const existingCount = await db.collection('themeParks').count();
    
    if (existingCount.total > 0) {
      console.log('游乐场数据已存在，跳过初始化');
      return { count: existingCount.total, skipped: true };
    }
    
    // 批量写入数据
    for (let i = 0; i < themeParks.length; i += 100) {
      const batch = themeParks.slice(i, i + 100);
      await db.collection('themeParks').add({
        data: batch
      });
    }
    
    return { count: themeParks.length };
    
  } catch (error) {
    throw new Error(`初始化游乐场数据失败：${error.message}`);
  }
}

/**
 * 同步博物馆数据
 */
async function syncMuseums() {
  try {
    // 检查是否已存在数据
    const existingCount = await db.collection('museums').count();
    
    if (existingCount.total > 0) {
      console.log('博物馆数据已存在，跳过同步');
      return { count: existingCount.total, skipped: true };
    }
    
    // 从 GitHub 拉取数据
    // 注意：这里需要实际的 GitHub API 地址
    // 由于 GitHub API 需要特殊处理，这里模拟数据
    
    // 模拟博物馆数据（实际应该从 GitHub API 获取）
    const museums = generateSampleMuseums();
    
    // 批量写入数据
    for (let i = 0; i < museums.length; i += 100) {
      const batch = museums.slice(i, i + 100);
      await db.collection('museums').add({
        data: batch
      });
    }
    
    return { count: museums.length };
    
  } catch (error) {
    throw new Error(`同步博物馆数据失败：${error.message}`);
  }
}

/**
 * 生成示例博物馆数据
 * 实际应该从 GitHub API 获取
 */
function generateSampleMuseums() {
  const sampleMuseums = [
    {
      _id: 'museum_001',
      source: 'github',
      sourceId: 'N1001',
      name: '故宫博物院',
      englishName: 'The Palace Museum',
      province: '北京',
      city: '北京',
      district: '东城区',
      address: '北京市东城区景山前街4号',
      location: {
        latitude: 39.9163,
        longitude: 116.3972
      },
      info: {
        openTime: '08:30-17:00（周一闭馆）',
        ticketInfo: '60元（旺季）/40元（淡季）',
        level: '国家一级',
        type: '历史博物馆',
        phone: '010-85007421',
        website: 'https://www.dpm.org.cn',
        tags: ['皇家', '历史', '世界遗产', '热门'],
        introduction: '中国明清两代的'皇家宫殿，世界文化遗产'
      },
      syncTime: new Date().toISOString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      _id: 'museum_002',
      source: 'github',
      sourceId: 'N1002',
      name: '中国国家博物馆',
      englishName: 'National Museum of China',
      province: '北京',
      city: '北京',
      district: '东城区',
      address: '北京市东城区东长安街16号',
      location: {
        latitude: 39.9105,
        longitude: 116.4074
      },
      info: {
        openTime: '09:00-17:00（周一闭馆）',
        ticketInfo: '免费（需预约）',
        level: '国家一级',
        type: '综合博物馆',
        phone: '010-65116400',
        website: 'https://www.chnmuseum.cn',
        tags: ['国家级', '历史', '艺术', '热门'],
        introduction: '中国历史文化艺术博物馆'
      },
      syncTime: new Date().toISOString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    },
    {
      _id: 'museum_003',
      source: 'github',
      sourceId: 'N1003',
      name: '上海博物馆',
      englishName: 'Shanghai Museum',
      province: '上海',
      city: '上海',
      district: '黄浦区',
      address: '上海市黄浦区人民大道201号',
      location: {
        latitude: 31.2304,
        longitude: 121.4737
      },
      info: {
        openTime: '09:00-17:00（周一闭馆）',
        ticketInfo: '免费（需预约）',
        level: '国家一级',
        type: '综合博物馆',
        phone: '021-63723500',
        website: 'https://www.shanghaimuseum.net',
        tags: ['国家级', '历史', '艺术'],
        introduction: '中国古代艺术博物馆'
      },
      syncTime: new Date().toISOString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
  ];
  
  return sampleMuseums;
}

/**
 * 验证数据格式
 */
function validateThemeParks(data) {
  if (!Array.isArray(data)) {
    throw new Error('游乐场数据必须是数组');
  }
  
  const requiredFields = [
    '_id',
    'brand',
    'name',
    'location',
    'facilities',
    'ticketInfo',
    'openTime'
  ];
  
  for (const park of data) {
    for (const field of requiredFields) {
      if (!park[field]) {
        throw new Error(`游乐场数据缺少必填字段：${field}`);
      }
    }
    
    // 验证坐标
    if (!park.location || park.location.coordinates.length !== 2) {
      throw new Error('游乐场坐标数据不正确');
    }
  }
  
  return true;
}

/**
 * 验证博物馆数据
 */
function validateMuseums(data) {
  if (!Array.isArray(data)) {
    throw new Error('博物馆数据必须是数组');
  }
  
  const requiredFields = [
    '_id',
    'source',
    'sourceId',
    'name',
    'province',
    'city',
    'location',
    'info'
  ];
  
  for (const museum of data) {
    for (const field of requiredFields) {
      if (!museum[field]) {
        throw new Error(`博物馆数据缺少必填字段：${field}`);
      }
    }
    
    // 验证坐标
    if (!museum.location || !museum.location.latitude || !museum.location.longitude) {
      throw new Error('博物馆坐标数据不正确');
    }
  }
  
  return true;
}

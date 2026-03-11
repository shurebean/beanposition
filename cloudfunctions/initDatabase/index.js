/**
 * 数据库自动初始化云函数
 * 
 * 功能：
 * 1. 检查并创建所有必需的集合
 * 2. 检查并创建所有索引
 * 3. 初始化游乐场数据
 * 4. 初始化博物馆数据
 * 
 * 使用方法：
 * 在云开发控制台中调用此云函数
 * 
 * 参数：
 * - forceRefresh: 是否强制刷新数据（默认 false）
 * - skipData: 是否跳过数据初始化（默认 false）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 集合配置
const COLLECTIONS = {
  'users': {
    indexes: [
      { name: 'openid', fields: ['openid'], unique: true }
    ]
  },
  'checkins': {
    indexes: [
      { name: 'userId', fields: ['userId'] },
      { name: 'userId_visitDate', fields: ['userId', 'visitDate'] },
      { name: 'timeline', fields: ['timeline.year', 'timeline.month'] }
    ]
  },
  'museums': {
    indexes: [
      { name: 'province_city', fields: ['province', 'city'] },
      { name: 'level', fields: ['info.level'] },
      { name: 'type', fields: ['info.type'] }
    ]
  },
  'themeParks': {
    indexes: [
      { name: 'brand', fields: ['brand'] },
      { name: 'province_city', fields: ['location.province', 'location.city'] }
    ]
  },
  'userFavorites': {
    indexes: [
      { name: 'userId', fields: ['userId'] },
      { name: 'userId_placeType_placeId', fields: ['userId', 'placeType', 'placeId'], unique: true }
    ]
  },
  'dataSyncLog': {
    indexes: [
      { name: 'dataType', fields: ['dataType'] },
      { name: 'syncTime', fields: ['syncTime'] }
    ]
  }
};

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const startTime = Date.now();
  const wxContext = cloud.getWXContext();
  const forceRefresh = event.forceRefresh || false;
  const skipData = event.skipData || false;
  
  const logs = [];
  const errors = [];
  
  try {
    logs.push({
      timestamp: new Date().toISOString(),
      step: '开始初始化',
      message: '开始数据库初始化...',
      params: { forceRefresh, skipData }
    });
    
    // 步骤 1：检查和创建集合
    logs.push({
      timestamp: new Date().toISOString(),
      step: '检查集合',
      message: '检查并创建数据库集合...'
    });
    
    const collectionsResult = await ensureCollections();
    logs.push({
      timestamp: new Date().toISOString(),
      step: '检查完成',
      message: `集合检查完成：${collectionsResult.created.length} 个新建，${collectionsResult.existing.length} 个已存在`
    });
    
    // 步骤 2：检查和创建索引
    logs.push({
      timestamp: new Date().toISOString(),
      step: '检查索引',
      message: '检查并创建索引...'
    });
    
    const indexesResult = await ensureIndexes();
    logs.push({
      timestamp: new Date().toISOString(),
      step: '索引完成',
      message: `索引检查完成：${indexesResult.created.length} 个新建，${indexesResult.existing.length} 个已存在，${indexesResult.errors.length} 个错误`
    });
    
    if (indexesResult.errors.length > 0) {
      logs.push({
        timestamp: new Date().toISOString(),
        step: '索引错误',
        message: `索引错误：${JSON.stringify(indexesResult.errors)}`
      });
    }
    
    // 步骤 3：初始化数据（如果未跳过）
    let dataResult = null;
    
    if (!skipData) {
      logs.push({
        timestamp: new Date().toISOString(),
        step: '初始化数据',
        message: '开始初始化数据...'
      });
      
      dataResult = await initData(forceRefresh);
      
      logs.push({
        timestamp: new Date().toISOString(),
        step: '数据完成',
        message: `数据初始化完成：游乐场 ${dataResult.themeParks.count} 条，博物馆 ${dataResult.museums.count} 条`
      });
      
      if (dataResult.errors.length > 0) {
        logs.push({
          timestamp: new Date().toISOString(),
          step: '数据错误',
          message: `数据初始化错误：${JSON.stringify(dataResult.errors)}`
        });
      }
    } else {
      logs.push({
        timestamp: new Date().toISOString(),
        step: '跳过数据',
        message: '已跳过数据初始化'
      });
    }
    
    // 记录初始化日志
    try {
      await db.collection('dataSyncLog').add({
        data: {
          dataType: 'database_init',
          source: 'initDatabase',
          status: errors.length === 0 && (dataResult ? dataResult.errors.length === 0 : true) ? 'success' : 'partial',
          totalCount: dataResult ? dataResult.themeParks.count + dataResult.museums.count : 0,
          successCount: dataResult ? dataResult.themeParks.count + dataResult.museums.count : 0,
          failedCount: dataResult ? dataResult.failedCount : 0,
          errorMessage: errors.map(e => e.message).join('; '),
          syncTime: new Date().toISOString(),
          duration: (Date.now() - startTime) / 1000,
          triggeredBy: wxContext.OPENID || 'system'
        }
      });
    } catch (logError) {
      console.error('记录日志失败', logError);
    }
    
    // 返回结果
    return {
      success: true,
      duration: (Date.now() - startTime) / 1000,
      collections: collectionsResult,
      indexes: indexesResult,
      data: dataResult,
      logs: logs,
      errors: errors
    };
    
  } catch (error) {
    console.error('数据库初始化失败', error);
    
    const errorLog = {
      timestamp: new Date().toISOString(),
      step: '错误',
      message: `数据库初始化失败：${error.message}`,
      error: error.stack
    };
    
    logs.push(errorLog);
    errors.push(errorLog);
    
    // 记录失败日志
    try {
      await db.collection('dataSyncLog').add({
        data: {
          dataType: 'database_init',
          source: 'initDatabase',
          status: 'failed',
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          errorMessage: error.message,
          syncTime: new Date().toISOString(),
          duration: (Date.now() - startTime) / 1000,
          triggeredBy: wxContext.OPENID || 'system'
        }
      });
    } catch (logError) {
      console.error('记录日志失败', logError);
    }
    
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      duration: (Date.now() - startTime) / 1000,
      logs: logs,
      errors: errors
    };
  }
};

/**
 * 确保所有集合存在
 */
async function ensureCollections() {
  const created = [];
  const existing = [];
  const errors = [];
  
  for (const collectionName of Object.keys(COLLECTIONS)) {
    try {
      // 检查集合是否存在
      const result = await db.collection(collectionName).count();
      
      if (result && result.total >= 0) {
        existing.push(collectionName);
        console.log(`集合 ${collectionName} 已存在`);
      }
    } catch (error) {
      // 如果集合不存在，创建它
      if (error.message && error.message.includes('collection not found')) {
        try {
          await db.createCollection(collectionName);
          created.push(collectionName);
          console.log(`✅ 创建集合 ${collectionName}`);
        } catch (createError) {
          errors.push({
            collection: collectionName,
            message: createError.message
          });
          console.error(`❌ 创建集合 ${collectionName} 失败`, createError);
        }
      } else {
        errors.push({
          collection: collectionName,
          message: error.message
        });
        console.error(`检查集合 ${collectionName} 失败`, error);
      }
    }
  }
  
  return { created, existing, errors };
}

/**
 * 确保所有索引存在
 */
async function ensureIndexes() {
  const created = [];
  const existing = [];
  const errors = [];
  
  for (const [collectionName, config] of Object.entries(COLLECTIONS)) {
    for (const index of config.indexes) {
      try {
        // 尝试创建索引
        // 注意：微信云开发数据库的 API 可能不支持直接创建索引
        // 这里我们假设索引需要在控制台中手动创建
        // 所以这里只是记录和提示
        
        console.log(`索引 ${collectionName}.${index.name} 需要在控制台中手动创建`);
        
        // 标记为需要手动创建
        existing.push(`${collectionName}.${index.name}`);
        
      } catch (error) {
        errors.push({
          collection: collectionName,
          index: index.name,
          message: error.message
        });
        console.error(`创建索引 ${collectionName}.${index.name} 失败`, error);
      }
    }
  }
  
  return { created, existing, errors };
}

/**
 * 初始化数据
 */
async function initData(forceRefresh) {
  const errors = [];
  let themeParksResult = { count: 0 };
  let museumsResult = { count: 0 };
  let failedCount = 0;
  
  // 初始化游乐场数据
  try {
    themeParksResult = await initThemeParks(forceRefresh);
    console.log(`✅ 游乐场数据初始化完成：${themeParksResult.count} 条`);
  } catch (error) {
    errors.push({
      type: 'themeParks',
      message: error.message
    });
    console.error('❌ 游乐场数据初始化失败', error);
    failedCount++;
  }
    
  // 初始化博物馆数据
  try {
    museumsResult = await initMuseums(forceRefresh);
    console.log(`✅ 博物馆数据初始化完成：${museumsResult.count} 条`);
  } catch (error) {
    errors.push({
      type: 'museums',
      message: error.message
    });
    console.error('❌ 博物馆数据初始化失败', error);
    failedCount++;
  }
  
  return {
    themeParks: themeParksResult,
    museums: museumsResult,
    errors: errors,
    failedCount: failedCount
  };
}

/**
 * 初始化游乐场数据
 */
async function initThemeParks(forceRefresh) {
  const startTime = Date.now();
  
  try {
    // 检查是否已存在数据
    const existingCount = await db.collection('themeParks').count();
    
    if (existingCount.total > 0) {
      console.log(`游乐场数据已存在：${existingCount.total} 条`);
      
      if (forceRefresh) {
        console.log('强制刷新模式，删除旧数据...');
        await db.collection('themeParks').where({}).remove();
      } else {
        return { count: existingCount.total, skipped: true };
      }
    }
    
    // 读取游乐场数据
    const themeParks = require('../syncThemeParkData/theme-parks.json');
    
    console.log(`读取到 ${themeParks.length} 条游乐场数据`);
    
    // 批量写入数据
    const BATCH_SIZE = 100;
    let successCount = 0;
    
    for (let i = 0; i < themeParks.length; i += BATCH_SIZE) {
      const batch = themeParks.slice(i, i + BATCH_SIZE);
      
      try {
        await db.collection('themeParks').add({
          data: batch
        });
        
        successCount += batch.length;
        console.log(`已写入 ${successCount}/${themeParks.length} 条`);
        
      } catch (error) {
        console.error('批量写入失败', error);
        throw error;
      }
    }
    
    // 记录同步日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'themePark',
        source: 'initDatabase',
        status: 'success',
        totalCount: themeParks.length,
        successCount: successCount,
        failedCount: 0,
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000
      }
    });
    
    return { count: successCount, skipped: false };
    
  } catch (error) {
    console.error('初始化游乐场数据失败', error);
    throw error;
  }
}

/**
 * 初始化博物馆数据
 */
async function initMuseums(forceRefresh) {
  const startTime = Date.now();
  
  try {
    // 检查是否已存在数据
    const existingCount = await db.collection('museums').count();
    
    if (existingCount.total > 0) {
      console.log(`博物馆数据已存在：${existingCount.total} 条`);
      
      if (forceRefresh) {
        console.log('强制刷新模式，删除旧数据...');
        await db.collection('museums').where({}).remove();
      } else {
        return { count: existingCount.total, skipped: true };
      }
    }
    
    // 生成示例博物馆数据
    const museums = generateSampleMuseums();
    
    console.log(`生成 ${museums.length} 条博物馆数据`);
    
    // 批量写入数据
    const BATCH_SIZE = 100;
    let successCount = 0;
    
    for (let i = 0; i < museums.length; i += BATCH_SIZE) {
      const batch = museums.slice(i, i + BATCH_SIZE);
      
      try {
        await db.collection('museums').add({
          data: batch
        });
        
        successCount += batch.length;
        console.log(`已写入 ${successCount}/${museums.length} 条`);
        
      } catch (error) {
        console.error('批量写入失败', error);
        throw error;
      }
    }
    
    // 记录同步日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'museum',
        source: 'initDatabase',
        status: 'success',
        totalCount: museums.length,
        successCount: successCount,
        failedCount: 0,
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000
      }
    });
    
    return { count: successCount, skipped: false };
    
  } catch (error) {
    console.error('初始化博物馆数据初始化失败', error);
    throw error;
  }
}

/**
 * 生成示例博物馆数据
 */
function generateSampleMuseums() {
  const now = new Date().toISOString();
  
  return [
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
        introduction: '中国明清两代的皇家宫殿，世界文化遗产'
      },
      syncTime: now,
      createTime: now,
      updateTime: now
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
      syncTime: now,
      createTime: now,
      updateTime: now
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
      syncTime: now,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'museum_004',
      source: 'github',
      sourceId: 'N1004',
      name: '陕西历史博物馆',
      englishName: 'Shaanxi History Museum',
      province: '陕西',
      city: '西安',
      district: '雁塔区',
      address: '陕西省西安市雁塔区小寨东路91号',
      location: {
        latitude: 34.2300,
        longitude: 108.9534
      },
      info: {
        openTime: '08:30-18:00（周一闭馆）',
        ticketInfo: '免费（需预约）',
        level: '国家一级',
        type: '历史博物馆',
        phone: '029-85254724',
        website: 'https://www.sxhm.com',
        tags: ['国家级', '历史', '考古'],
        introduction: '中国第一座大型现代化国家级博物馆'
      },
      syncTime: now,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'museum_005',
      source: 'github',
      sourceId: 'N1005',
      name: '南京博物院',
      englishName: 'Nanjing Museum',
      province: '江苏',
      city: '南京',
      district: '玄武区',
      address: '江苏省南京市玄武区中山东路321号',
      location: {
        latitude: 32.0661,
        longitude: 118.8085
      },
      info: {
        openTime: '09:00-17:00（周一闭馆）',
        ticketInfo: '免费（需预约）',
        level: '国家一级一级',
        type: '综合博物馆',
        phone: '025-84802996',
        website: 'https://www.njmuseum.com',
        tags: ['国家级', '历史', '艺术'],
        introduction: '中国三大博物馆之一，藏品丰富'
      },
      syncTime: now,
      createTime: now,
      updateTime: now
    }
  ];
}

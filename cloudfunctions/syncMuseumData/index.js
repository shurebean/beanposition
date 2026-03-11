const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 同步博物馆数据
 * 
 * 使用方法：
 * 1. 在微信开发者工具中上传并部署云函数
 * 2. 在云开发控制台中调用云函数
 * 3. 或在小程序中通过 cloud.callFunction 调用
 * 
 * 参数：
 * - forceRefresh: 强制刷新，true 时删除旧数据重新写入
 */
exports.main = async (event, context) => {
  const startTime = Date.now();
  const wxContext = cloud.getWXContext();
  
  try {
    console.log('开始同步博物馆数据...');
    
    // 1. 检查是否已有数据
    const existingCount = await db.collection('museums').count();
    
    if (existingCount.total > 0) {
      console.log(`博物馆数据已存在：${existingCount.total} 条`);
      
      // 如果强制刷新，先删除旧数据
      if (event.forceRefresh) {
        console.log('强制刷新模式，删除旧数据...');
        await db.collection('museums').where({}).remove();
      } else {
        return {
          success: true,
          skipped: true,
          count: existingCount.total,
          message: '博物馆数据已存在，使用 forceRefresh 参数强制刷新',
          duration: (Date.now() - startTime) / 1000
        };
      }
    }
    
    // 2. 从 GitHub 拉取数据
    // 注意：这里需要实际的 GitHub API 地址
    // 由于网络限制，这里使用模拟数据
    
    console.log('从 GitHub 拉取博物馆数据...');
    const museums = await fetchMuseumsFromGitHub();
    
    console.log(`获取到 ${museums.length} 条博物馆数据`);
    
    // 3. 批量写入数据
    const BATCH_SIZE = 100;
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    for (let i = 0; i < museums.length; i += BATCH_SIZE) {
      const batch = museums.slice(i, i + BATCH_SIZE);
      
      try {
        await db.collection('museums').add({
          data: batch
        });
        
        successCount += batch.length;
        console.log(`已写入 ${successCount}/${museums.length} 条`);
        
      } catch (error) {
        failedCount += batch.length;
        errors.push(error.message);
        console.error('写入失败', error.message);
      }
    }
    
    // 4. 记录同步日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'museum',
        source: 'github',
        status: failedCount > 0 ? 'partial' : 'success',
        totalCount: museums.length,
        successCount: successCount,
        failedCount: failedCount,
        errorMessage: errors.join('; '),
        syncTime: new Date().toISOString(),
        duration: (Date.now() - startTime) / 1000,
        triggeredBy: wxContext.OPENID || 'system'
      }
    });
    
    return {
      success: true,
      skipped: false,
      count: successCount,
      failedCount: failedCount,
      errors: errors,
      duration: (Date.now() - startTime) / 1000
    };
    
  } catch (error) {
    console.error('同步博物馆数据失败', error);
    
    // 记录失败日志
    try {
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
      duration: (Date.now() - startTime) / 1000
    };
  }
};

/**
 * 从 GitHub 拉取博物馆数据
 * 
 * 实际应该从 GitHub API 拉取，这里使用模拟数据
 */
async function fetchMuseumsFromGitHub() {
  try {
    // 模拟的 GitHub API 调用
    // 实际应该使用：
    // const axios = require('axios');
    // const response = await axios.get('https://raw.githubusercontent.com/xxxxx/xxxxx/master/museums.json');
    // return response.data;
    
    // 返回示例数据
    return generateSampleMuseums();
    
  } catch (error) {
    throw new Error(`从 GitHub 拉取数据失败：${error.message}`);
  }
}

/**
 * 生成示例博物馆数据
 * 
 * 实际应该从 GitHub 获取，这里提供示例数据
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
        level: '国家一级',
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

/**
 * 数据转换函数
 */
function transformMuseumData(githubData) {
  const now = new Date().toISOString();
  
  return githubData.map(item => ({
    _id: `museum_${item.sourceId}`,
    source: 'github',
    sourceId: item.sourceId,
    name: item.name,
    englishName: item.englishName || '',
    province: item.province || '',
    city: item.city || '',
    district: item.district || '',
    address: item.address || '',
    location: {
      latitude: item.location.latitude || 0,
      longitude: item.location.longitude || 0
    },
    info: {
      openTime: item.info.openTime || '',
      ticketInfo: item.info.ticketInfo || '',
      level: item.info.level || '',
      type: item.info.type || '',
      phone: item.info.phone || '',
      website: item.info.website || '',
      tags: item.info.tags || [],
      introduction: item.info.introduction || ''
    },
    syncTime: now,
    createTime: now,
    updateTime: now
  }));
}

/**
 * 数据去重函数
 */
async function deduplicateMuseums(newMuseums) {
  try {
    const result = await db.collection('museums')
      .where({ source: 'github' })
      .get();
    
    const existingIds = result.data.map(m => m._id);
    return newMuseums.filter(m => !existingIds.includes(m._id));
  } catch (error) {
    throw new Error(`去重失败：${error.message}`);
  }
}

/**
 * 数据验证函数
 */
function validateMuseums(museums) {
  if (!Array.isArray(museums)) {
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
  
  for (const museum of museums) {
    for (const field of requiredFields) {
      if (!museum[field]) {
        throw new Error(`博物馆数据缺少必填字段：${field}`);
      }
    }
    
    // 验证坐标
    if (!museum.location || 
        typeof museum.location.latitude !== 'number' ||
        typeof museum.location.longitude !== 'number') {
      throw new Error('博物馆坐标数据不正确');
    }
  }
  
  return true;
}

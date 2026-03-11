const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 同步游乐场数据
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
    console.log('开始同步游乐场数据...');
    
    // 1. 检查是否已有数据
    const existingCount = await db.collection('themeParks').count();
();
    
    if (existingCount.total > 0) {
      console.log(`游乐场数据已存在：${existingCount.total} 条`);
      
      // 如果强制刷新，先删除旧数据
      if (event.forceRefresh) {
        console.log('强制刷新模式，删除旧数据...');
        await db.collection('themeParks').where({}).remove();
      } else {
        return {
          success: true,
          skipped: true,
          count: existingCount.total,
          message: '游乐场数据已存在，使用 forceRefresh 参数强制刷新',
          duration: (Date.now() - startTime) / 1000
        };
      }
    }
    
    // 2. 读取游乐场数据（从本地文件）
    const themeParks = require('./theme-parks.json');
    
    console.log(`读取到 ${themeParks.length} 条游乐场数据`);
    
    // 3. 批量写入数据
    const BATCH_SIZE = 100;
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    for (let i = 0; i < themeParks.length; i += BATCH_SIZE) {
      const batch = themeParks.slice(i, i + BATCH_SIZE);
      
      try {
        await db.collection('themeParks').add({
          data: batch
        });
        
        successCount += batch.length;
        console.log(`已写入 ${successCount}/${themeParks.length} 条`);
        
      } catch (error) {
        failedCount += batch.length;
        errors.push(error.message);
        console.error('写入失败', error.message);
      }
    }
    
    // 4. 记录同步日志
    await db.collection('dataSyncLog').add({
      data: {
        dataType: 'themePark',
        source: 'internal',
        status: failedCount > 0 ? 'partial' : 'success',
        totalCount: themeParks.length,
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
    console.error('同步游乐场数据失败', error);
    
    // 记录失败日志
    try {
      await db.collection('dataSyncLog').add({
        data: {
          dataType: 'themePark',
          source: 'internal',
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

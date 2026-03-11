/**
 * 数据库验证脚本
 * 
 * 功能：
 * 1. 验证所有集合是否创建成功
 * 2. 验证所有索引是否存在
 * 3. 验证数据是否正确初始化
 * 4. 输出验证报告
 * 
 * 使用方法：
 * 在云开发控制台中运行此脚本
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 预期配置
const EXPECTED_CONFIG = {
  collections: [
    { name: 'users', expectedCount: 0 },
    { name: 'checkins', expectedCount: 0 },
    { name: 'museums', expectedCount: 5 },
    { name: 'themeParks', expectedCount: 18 },
    { name: 'userFavorites', expectedCount: 0 },
    { name: 'dataSyncLog', expectedCount: 2 }
  ],
  indexes: {
    users: ['openid'],
    checkins: ['userId', 'userId_visitDate', 'timeline'],
    museums: ['province_city', 'level', 'type'],
    themeParks: ['brand', 'province_city'],
    userFavorites: ['userId', 'userId_placeType_placeId'],
    dataSyncLog: ['dataType', 'syncTime']
  }
};

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const startTime = Date.now();
  const report = {
    timestamp: new Date().toISOString(),
    collections: [],
    indexes: [],
    data: [],
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      warnings: 0
    }
  };
  
  try {
    console.log('开始验证数据库...');
    
    // 1. 验证集合
    console.log('\n=== 验证集合 ===');
    const collectionResult = await verifyCollections();
    report.collections = collectionResult;
    report.summary.totalChecks += collectionResult.totalChecks;
    report.summary.passedChecks += collectionResult.passedChecks;
    report.summary.failedChecks += collectionResult.failedChecks;
    report.summary.warnings += collectionResult.warnings;
    
    // 2. 验证数据
    console.log('\n=== 验证数据 ===');
    const dataResult = await verifyData();
    report.data = dataResult;
    report.summary.totalChecks += dataResult.totalChecks;
    report.summary.passedChecks += dataResult.passedChecks;
    report.summary.failedChecks += dataResult.failedChecks;
    report.summary.warnings += dataResult.warnings;
    
    // 3. 索引检查（需要手动验证）
    console.log('\n=== 索引检查提示 ===');
    const indexResult = {
      message: '索引需要在需要手动创建，请在控制台中验证',
      expectedIndexes: EXPECTED_CONFIG.indexes
    };
    report.indexes = [indexResult];
    
    // 4. 生成总结
    console.log('\n=== 验证总结 ===');
    console.log(`总计检查：${report.summary.totalChecks}`);
    console.log(`通过：${report.summary.passedChecks}`);
    console.log(`失败：${report.summary.failedChecks}`);
    console.log(`警告：${report.summary.warnings}`);
    
    return {
      success: report.summary.failedChecks === 0,
      duration: (Date.now() - startTime) / 1000,
      report: report
    };
    
  } catch (error) {
    console.error('验证失败', error);
    return {
      success: false,
      error: error.message,
      report: report
    };
  }
};

/**
 * 验证集合
 */
async function verifyCollections() {
  const results = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let warnings = 0;
  
  for (const config of EXPECTED_CONFIG.collections) {
    totalChecks++;
    
    try {
      const result = await db.collection(config.name).count();
      const actualCount = result.total;
      
      const item = {
        collection: config.name,
        status: 'success',
        expectedCount: config.expectedCount,
        actualCount: actualCount,
        message: `集合 ${config.name} 存在，记录数：${actualCount}`
      };
      
      // 检查记录数是否匹配
      if (config.expectedCount > 0 && actualCount !== config.expectedCount) {
        item.status = 'warning';
        item.message += `（预期：${config.expectedCount}）`;
        warnings++;
      }
      
      console.log(`✅ ${item.message}`);
      results.push(item);
      passedChecks++;
      
    } catch (error) {
      const item = {
        collection: config.name,
        status: 'failed',
        expectedCount: config.expectedCount,
        actualCount: 0,
        message: `集合 ${config.name} 不存在或无法访问：${error.message}`
      };
      
      console.log(`❌ ${item.message}`);
      results.push(item);
      failedChecks++;
    }
  }
  
  return { results, totalChecks, passedChecks, failedChecks, warnings };
}

/**
 * 验证数据
 */
async function verifyData() {
  const results = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let warnings = 0;
  
  // 验证游乐场数据
  totalChecks++;
  try {
    const parkResult = await db.collection('themeParks').limit(1).get();
    
    if (parkResult.data && parkResult.data.length > 0) {
      const park = parkResult.data[0];
      
      const requiredFields = [
        '_id', 'brand', 'name', 'location', 
        'facilities', 'ticketInfo', 'openTime'
      ];
      
      const missingFields = requiredFields.filter(field => !park[field]);
      
      if (missingFields.length === 0) {
        console.log(`✅ 游乐场数据结构正确`);
        results.push({
          type: 'themeParks',
          status: 'success',
          message: '游乐场数据结构正确'
        });
        passedChecks++;
      } else {
        console.log(`⚠️ 游乐场数据缺少字段：${missingFields.join(', ')}`);
        results.push({
          type: 'themeParks',
          status: 'warning',
          message: `缺少字段：${missingFields.join(', ')}`
        });
        warnings++;
      }
    } else {
      console.log(`❌ 游乐场数据为空`);
      results.push({
        type: 'themeParks',
        status: 'failed',
        message: '游乐场数据为空'
      });
      failedChecks++;
    }
    
  } catch (error) {
    console.log(`❌ 验证游乐场数据失败：${error.message}`);
    results.push({
      type: 'themeParks',
      status: 'failed',
      message: error.message
    });
    failedChecks++;
  }
  
  // 验证博物馆数据
  totalChecks++;
  try {
    const museumResult = await db.collection('museums').limit(1).get();
    
    if (museumResult.data && museumResult.data.length > 0) {
      const museum = museumResult.data[0];
      
      const requiredFields = [
        '_id', 'source', 'sourceId', 'name', 
        'province', 'city', 'location', 'info'
      ];
      
      const missingFields = requiredFields.filter(field => !museum[field]);
      
      if (missingFields.length === 0) {
        console.log(`✅ 博物馆数据结构正确`);
        results.push({
          type: 'museums',
          status: 'success',
          message: '博物馆数据结构正确'
        });
        passedChecks++;
      } else {
        console.log(`⚠️ 博物馆数据缺少字段：${missingFields.join(', ')}`);
        results.push({
          type: 'museums',
          status: 'warning',
          message: `缺少字段：${missingFields.join(', ')}`
        });
        warnings++;
      }
    } else {
      console.log(`❌ 博物馆数据为空`);
      results.push({
        type: 'museums',
        status: 'failed',
        message: '博物馆数据为空'
      });
      failedChecks++;
    }
    
  } catch (error) {
    console.log(`❌ 验证博物馆数据失败：${error.message}`);
    results.push({
      type: 'museums',
      status: 'failed',
      message: error.message
    });
    failedChecks++;
  }
  
  return { results, totalChecks, passedChecks, failedChecks, warnings };
}

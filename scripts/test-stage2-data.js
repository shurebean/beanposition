/**
 * 阶段2：数据文件验证脚本
 * 
 * 使用方法：
 * node scripts/test-stage2-data.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/home/beanposition';
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const DOCS_DIR = path.join(PROJECT_DIR, 'docs');

console.log('='.repeat(60));
console.log('🧪 阶段2：数据文件验证测试');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * 测试游乐场数据文件
 */
function testThemeParksData() {
  console.log('\n📋 测试1：验证游乐场数据文件');
  console.log('-'.repeat(40));
  
  totalTests++;
  
  try {
    const filePath = path.join(DATA_DIR, 'theme-parks.json');
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log('❌ 文件不存在：theme-parks.json');
      failedTests++;
      return false;
    }
    
    // 读取文件
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('✅ 文件读取成功');
    
    // 验证 JSON 格式
    let themeParks;
    try {
      themeParks = JSON.parse(fileContent);
      console.log('✅ JSON 格式正确');
    } catch (error) {
      console.log('❌ JSON 格式错误：', error.message);
      failedTests++;
      return false;
    }
    
    // 验证是否为数组
    if (!Array.isArray(themeParks)) {
      console.log('❌ 数据不是数组');
      failedTests++;
      return false;
    }
    
    console.log(`✅ 数据格式正确（数组，${themeParks.length} 条）`);
    
    // 验证数据数量
    if (themeParks.length !== 18) {
      console.log(`⚠️  数据数量不符合预期（期望18，实际${themeParks.length}）`);
    } else {
      console.log('✅ 数据数量正确（18 条）');
    }
    
    // 验证每条记录的必填字段
    const requiredFields = [
      '_id',
      'brand',
      'name',
      'location',
      'facilities',
      'ticketInfo',
      'openTime'
    ];
    
    let invalidCount = 0;
    themeParks.forEach((park, index) => {
      for (const field of requiredFields) {
        if (!park[field]) {
          console.log(`⚠️  第${index} 条记录缺少必填字段：${field}`);
          invalidCount++;
        }
      }
    });
    
    if (invalidCount === 0) {
      console.log('✅ 所有记录的必填字段完整');
    } else {
      console.log(`⚠️  ${invalidCount} 个字段缺失`);
    }
    
    // 验证坐标数据
    let coordinateErrors = 0;
    themeParks.forEach((park, index) => {
      if (!park.location || !park.location.coordinates) {
        console.log(`❌ 第${index} 条记录缺少坐标数据`);
        coordinateErrors++;
        return;
      }
      
      const [lat, lng] = park.location.coordinates;
      
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.log(`❌ 第${index} 条记录坐标类型错误`);
        coordinateErrors++;
        return;
      }
      
      if (lat < -90 || lat > 90) {
        console.log(`❌ 第${index} 条记录纬度超出范围：${lat}`);
        coordinateErrors++;
      }
      
      if (lng < -180 || lng > 180) {
        console.log(`❌ 第${index} 条记录经度超出范围：${lng}`);
        coordinateErrors++;
      }
    });
    
    if (coordinateErrors === 0) {
      console.log('✅ 所有坐标数据正确');
      passedTests++;
    } else {
      console.log(`❌ ${coordinateErrors} 个坐标错误`);
      failedTests++;
    }
    
    return coordinateErrors === 0;
    
  } catch (error) {
    console.log('❌ 测试失败：', error.message);
    failedTests++;
    return false;
  }
}

/**
 * 测试云函数文件
 */
function testCloudFunctions() {
  console.log('\n📋 测试2：验证云函数文件');
  console.log('-'.repeat(40));
  
  const cloudFunctions = [
    'syncThemeParkData',
    'syncMuseumData',
    'initDatabase'
  ];
  
  cloudFunctions.forEach(funcName => {
    totalTests++;
    
    try {
      const funcDir = path.join(PROJECT_DIR, 'cloudfunctions', funcName);
      
      // 检查目录是否存在
      if (!fs.existsSync(funcDir)) {
        console.log(`❌ 云函数目录不存在：${funcName}`);
        failedTests++;
        return;
      }
      
      // 检查必需文件
      const requiredFiles = ['index.js', 'package.json'];
      let missingFiles = [];
      
      requiredFiles.forEach(file => {
        const filePath = path.join(funcDir, file);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(file);
        }
      });
      
      if (missingFiles.length > 0) {
        console.log(`❌ ${funcName} 缺少文件：${missingFiles.join(', ')}`);
        failedTests++;
      } else {
        console.log(`✅ ${funcName} 文件完整`);
        
        // 尝试读取 index.js
        const indexContent = fs.readFileSync(path.join(funcDir, 'index.js'), 'utf8');
        
        // 检查是否有 exports.main
        if (indexContent.includes('exports.main')) {
          console.log(`✅ ${funcName} 导出正确`);
          passedTests++;
        } else {
          console.log(`❌ ${funcName} 未导出 main 函数`);
          failedTests++;
        }
      }
      
    } catch (error) {
      console.log(`❌ 测试 ${funcName} 失败：`, error.message);
      failedTests++;
    }
  });
}

/**
 * 测试文档文件
 */
function testDocs() {
  console.log('\n📋 测试3：验证文档文件');
  console.log('-'.repeat(40));
  
  const docFiles = [
    '数据库设计.md',
    '数据库初始化操作指南.md',
    '快速操作指南.md',
    '测试报告.md',
    '测试计划.md',
    '验收标准.md',
    '阶段2评审报告.md',
    '任务完成总结.md'
  ];
  
  docFiles.forEach(fileName => {
    totalTests++;
    
    try {
      const filePath = path.join(DOCS_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ 文档不存在：${fileName}`);
        failedTests++;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.length > 0) {
          console.log(`✅ ${fileName} (${(content.length / 1024).toFixed(1)} KB)`);
          passedTests++;
        } else {
          console.log(`❌ ${fileName} 文件为空`);
          failedTests++;
        }
      }
      
    } catch (error) {
      console.log(`❌ 测试 ${fileName} 失败：`, error.message);
      failedTests++;
    }
  });
}

/**
 * 测试 Git 状态
 */
function testGitStatus() {
  console.log('\n📋 测试4：验证 Git 状态');
  console.log('-'.repeat(40));
  
  totalTests++;
  
  try {
    const { execSync } = require('child_process');
    
    // 检查 Git 状态
    const statusResult = execSync('git status --porcelain', {
      cwd: PROJECT_DIR,
      encoding: 'utf8'
    });
    
    if (statusResult.trim() === '') {
      console.log('✅ Git 工作目录干净（无未提交更改）');
      passedTests++;
    } else {
      console.log('⚠️  Git 有未提交的更改');
      failedTests++;
    }
    
  } catch (error) {
    console.log('❌ 无法检查 Git 状态：', error.message);
    failedTests++;
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告');
  console.log('='.repeat(60));
  console.log('');
  console.log(`总测试数：${totalTests}`);
  console.log(`✅ 通过：${passedTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`);
  console.log(`❌ 失败：${failedTests} (${(failedTests / totalTests * 100).toFixed(1)}%)`);
  console.log('');
  
  if (failedTests === 0) {
    console.log('🎉 所有测试通过！');
    console.log('');
    console.log('💡 下一步建议：');
    console.log('   1. 在微信开发者工具中创建数据库集合');
    console.log('   2. 上传并部署云函数');
    console.log('   3. 调用云函数初始化数据');
  } else {
    console.log('⚠️  存在测试失败，请修复后再试');
  }
  
  console.log('');
  console.log('='.repeat(60));
}

/**
 * 主函数
 */
function main() {
  // 执行所有测试
  testThemeParksData();
  testCloudFunctions();
  testDocs();
  testGitStatus();
  
  // 生成报告
  generateReport();
  
  // 返回退出码
  process.exit(failedTests > 0 ? 1 : 0);
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testThemeParksData,
  testCloudFunctions,
  testDocs,
  testGitStatus,
  generateReport
};

import { createClient } from '@supabase/supabase-js';
import bodyParser from 'body-parser';

// 1. 初始化 JSON 请求体解析器（Vercel 必须手动配置）
const jsonParser = bodyParser.json({
  limit: '1mb', // 限制请求体大小（防止恶意请求）
});

// 2. 临时内存存储（测试用，生产环境建议替换为 Supabase 数据库）
let submissions = [];

// 3. 初始化 Supabase 客户端（若后续要用数据库，取消注释并配置）
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

// 4. 主处理函数（包裹解析器中间件）
export default async function handler(req, res) {
  try {
    // 第一步：解析 JSON 请求体（必须在所有逻辑之前）
    await new Promise((resolve, reject) => {
      jsonParser(req, res, (err) => {
        if (err) {
          console.error('❌ 请求体解析失败:', err.message);
          reject(new Error('请求格式错误，仅支持 JSON 格式'));
        } else {
          resolve();
        }
      });
    });

    // 第二步：配置 CORS（允许前端跨域请求）
    res.setHeader('Access-Control-Allow-Origin', '*'); // 生产环境建议指定具体域名（如 'https://你的前端域名'）
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 缓存预检请求（24小时）

    // 第三步：处理 OPTIONS 预检请求（浏览器跨域会先发送该请求）
    if (req.method === 'OPTIONS') {
      return res.status(204).end(); // 204 No Content 更规范
    }

    // 第四步：处理 POST 请求（前端提交数据）
    if (req.method === 'POST') {
      const userData = req.body || {}; // 兜底：防止 body 为 undefined

      // 验证必填字段
      if (!userData.name?.trim() || !userData.phone?.trim()) {
        return res.status(400).json({
          success: false,
          error: '姓名和联系电话为必填项，请补充完整',
        });
      }

      // 验证量表分数格式（必须是数组）
      if (
        !Array.isArray(userData.stateAnxietyScores) ||
        !Array.isArray(userData.traitAnxietyScores)
      ) {
        return res.status(400).json({
          success: false,
          error: '量表分数格式错误，请重新提交',
        });
      }

      // 计算总分（过滤非数字分数，避免计算错误）
      const stateTotal = userData.stateAnxietyScores
        .filter(score => typeof score === 'number' && !isNaN(score))
        .reduce((a, b) => a + b, 0);

      const traitTotal = userData.traitAnxietyScores
        .filter(score => typeof score === 'number' && !isNaN(score))
        .reduce((a, b) => a + b, 0);

      // 判断是否符合条件
      const isEligible = stateTotal >= 10 && traitTotal >= 14;

      // 构建完整记录（包含唯一ID、时间戳等）
      const record = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), // 唯一ID
        timestamp: new Date().toISOString(), // 提交时间（UTC格式）
        name: userData.name.trim(), // 去空格
        phone: userData.phone.trim(), // 去空格
        stateAnxietyScores: userData.stateAnxietyScores, // 状态焦虑量表分数
        traitAnxietyScores: userData.traitAnxietyScores, // 特质焦虑量表分数
        stateTotal: stateTotal, // 状态焦虑总分
        traitTotal: traitTotal, // 特质焦虑总分
        isEligible: isEligible, // 是否符合条件
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown', // 提交IP（用于统计）
        userAgent: req.headers['user-agent'] || 'unknown', // 设备信息（用于统计）
      };

      // 保存到临时内存（测试用）
      submissions.push(record);
      // 限制内存存储数量（避免溢出，保留最近1000条）
      if (submissions.length > 1000) {
        submissions = submissions.slice(-1000);
      }

      // 【可选】保存到 Supabase 数据库（生产环境使用）
      // const { error: supabaseError } = await supabase
      //   .from('mindfulness_submissions') // 你的表名
      //   .insert([record]);
      // if (supabaseError) throw supabaseError;

      // 打印日志（Vercel 控制台可查看）
      console.log('✅ 数据提交成功:', {
        id: record.id,
        name: record.name,
        phone: record.phone,
        stateTotal: record.stateTotal,
        traitTotal: record.traitTotal,
        isEligible: record.isEligible,
      });

      // 返回成功响应（前端需要用到 isEligible 判断结果）
      return res.status(200).json({
        success: true,
        message: '数据提交成功！',
        data: {
          recordId: record.id,
          isEligible: isEligible,
          stateTotal: stateTotal,
          traitTotal: traitTotal,
        },
      });
    }

    // 第五步：处理 GET 请求（查看已提交数据，需密码验证）
    if (req.method === 'GET') {
      const { password } = req.query;

      // 简单密码验证（生产环境建议用更安全的验证方式）
      if (password !== 'mindfulness2024') {
        return res.status(401).json({
          success: false,
          error: '未授权访问，请提供正确的密码',
        });
      }

      // 返回所有数据（测试用，生产环境建议分页）
      return res.status(200).json({
        success: true,
        count: submissions.length,
        totalRecords: submissions.length,
        data: submissions.reverse(), // 倒序排列（最新的在前面）
        message: `共收集到 ${submissions.length} 条有效数据`,
      });
    }

    // 第六步：处理不支持的请求方法
    return res.status(405).json({
      success: false,
      error: `方法不允许，仅支持 POST、GET、OPTIONS 请求`,
    });

  } catch (error) {
    // 全局错误捕获（避免服务崩溃）
    console.error('❌ 服务器处理失败:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误，请稍后再试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined, // 开发环境显示错误详情
    });
  }
}

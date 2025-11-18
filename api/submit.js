import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const userData = req.body;
    
    // 简单的数据验证
    if (!userData.name || !userData.phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // 计算分数
    const stateTotal = userData.stateAnxietyScores?.reduce((a, b) => a + b, 0) || 0;
    const traitTotal = userData.traitAnxietyScores?.reduce((a, b) => a + b, 0) || 0;
    const isEligible = stateTotal >= 10 && traitTotal >= 14;
    
    // 这里先返回成功，稍后配置Supabase
    return res.status(200).json({
      success: true,
      message: '数据提交成功（测试模式）',
      is_eligible: isEligible,
      state_total: stateTotal,
      trait_total: traitTotal
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

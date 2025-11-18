export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 简单验证
  if (req.query.password !== 'mindfulness2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  return res.status(200).json({
    success: true,
    message: '数据查看接口（测试模式）',
    data: []
  });
}

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 密码验证
  if (req.query.password !== 'mindfulness2024') {
    return res.status(401).json({ error: '未授权访问' });
  }
  
  if (req.method === 'GET') {
    try {
      // 方案1：从数据库获取数据（推荐）
      // const { data: submissions, error } = await supabase
      //   .from('mindfulness_submissions')
      //   .select('*')
      //   .order('timestamp', { ascending: false });
      
      // 方案2：从内存共享（简化版）
      // 需要与 submit.js 共享数据存储
      const submissions = []; // 这里需要实际的数据源
      
      if (!submissions || submissions.length === 0) {
        return res.status(404).json({ error: '暂无数据可导出' });
      }
      
      // 生成CSV格式
      const csvHeader = '编号,姓名,电话,状态焦虑总分,特质焦虑总分,是否符合条件,提交时间\n';
      const csvRows = submissions.map((record, index) => 
        `${index + 1},"${record.name || ''}","${record.phone || ''}",${record.stateTotal || 0},${record.traitTotal || 0},"${record.isEligible ? '是' : '否'}","${record.timestamp || ''}"`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // 返回CSV下载
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="正念呼吸训练数据_${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.status(200).send(csvContent);
      
    } catch (error) {
      console.error('导出失败:', error);
      return res.status(500).json({ error: '导出失败: ' + error.message });
    }
  }
  
  return res.status(405).json({ error: '方法不允许' });
}
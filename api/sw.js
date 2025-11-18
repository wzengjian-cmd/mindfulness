// Service Worker - 离线支持
const CACHE_NAME = 'mindfulness-v1';
const urlsToCache = [
  '/',
  '/questionnaire.html',
  '/styles.css',  // 如果有样式文件的话
  '/script.js'    // 如果有单独的JS文件的话
];

// 安装阶段
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
  );
});

// 拦截请求
self.addEventListener('fetch', event => {
  // 不缓存API请求
  if (event.request.url.includes('/submit')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 返回缓存或网络请求
        return response || fetch(event.request);
      })
  );
});

// 同步离线数据（简化版）
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 简化的后台同步函数
async function doBackgroundSync() {
  try {
    console.log('执行后台同步');
    
    // 从localStorage获取离线数据
    const offlineData = localStorage.getItem('offlineSubmissions');
    if (offlineData) {
      const submissions = JSON.parse(offlineData);
      
      for (let submission of submissions) {
        try {
          // 使用相对路径，不要硬编码域名
          const response = await fetch('/submit', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Offline-Sync': 'true'  // 标记为离线同步
            },
            body: JSON.stringify(submission)
          });
          
          if (response.ok) {
            console.log('离线数据同步成功:', submission.timestamp);
            // 可以从localStorage中移除已同步的数据
            removeSyncedSubmission(submission.timestamp);
          }
        } catch (error) {
          console.log('单条数据同步失败:', error);
        }
      }
    }
  } catch (error) {
    console.log('后台同步失败:', error);
  }
}

// 辅助函数
function removeSyncedSubmission(timestamp) {
  try {
    const offlineData = localStorage.getItem('offlineSubmissions');
    if (offlineData) {
      const submissions = JSON.parse(offlineData);
      const filtered = submissions.filter(sub => sub.timestamp !== timestamp);
      localStorage.setItem('offlineSubmissions', JSON.stringify(filtered));
    }
  } catch (error) {
    console.log('移除已同步数据失败:', error);
  }
}
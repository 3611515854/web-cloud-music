//UI 交互：标签页、歌单、搜索、导入、初始化
/**项目的页面导航是单页应用(SPA)模式，通过CSS类切换实现不同页面的显示/隐藏 */
/* ============================
   标签页切换核心函数
   控制侧边栏高亮 + 主内容区显示
   ============================ */
function switchTab(tab) {
    //记录上一个（当前）的标签页，用于返回导航（querySelector() 方法返回文档中匹配指定 CSS 选择器的一个元素）
    const currentActive = document.querySelector('.nav-item.active');
    //如果有上一个便签而且不为设置标签，把标签保存到previousTab里面
    if  (currentActive && currentActive.dataset.tab != 'settings') {
        state.previousTab = currentActive.dataset.tab;
    }
    // 清除所有导航按钮和内容区的激活状态（querySelectorAll() 方法返回文档中匹配指定 CSS 选择器的所有元素，返回 NodeList 对象。）
    document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // ---- 特殊标签页处理 ----
    // 切换到歌单页时，重置为网格视图（退出详情页）
    if (tab === 'playlists') {
        state.viewingPlaylistId = null;
        // TODO: 歌单相关功能待实现
        // document.getElementById('playlistGridView').style.display = 'block';
        // document.getElementById('playlistDetailView').style.display = 'none';
        // document.getElementById('playlistHeader').style.display = 'flex';
        // document.getElementById('playlistTabs').style.display = 'flex';
        // renderNeteasePlaylists();
    }
    // 切换到每日推荐时，加载推荐歌曲
    if (tab === 'daily') {
        // TODO: 每日推荐功能待实现
        //loadDailyRecommend();  
    }
    // ---- 激活对应的导航按钮和内容区 ----
    if (tab === 'settings') {
        // 设置页没有导航按钮，直接激活内容区
        const tabEl =document.getElementById('tabSettings');
        if (tabEl) tabEl.classList.add('active');
    } else {
        // 激活导航按钮
        const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
        if (navItem) navItem.classList.add('active');
        // 激活内容区（将tab首字母大写，如 all → tabAll）
        const tabEl = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
        if (tabEl) tabEl.classList.add('active');
    }
}
// 绑定侧边栏导航按钮的点击事件
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab))
})

// 设置按钮
const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => switchTab('settings'))
}

// 返回按钮、登录按钮、登录返回按钮
document.getElementById('settingsBackBtn').addEventListener('click', () => switchTab(state.previousTab || 'all'));
document.querySelector('.login-btn').addEventListener('click', () => { state.previousTab = 'settings'; switchTab('login'); });
document.getElementById('loginBackBtn').addEventListener('click', () => { stopQrLogin(); switchTab(state.previousTab || 'all'); });

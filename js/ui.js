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
//document.getElementById('loginBackBtn').addEventListener('click', () => { stopQrLogin(); switchTab(state.previousTab || 'all'); });

/* ============================
   本地音乐导入功能
   使用 File System Access API 选择文件夹并扫描音频文件
   ============================ */
function setupImport() {
    document.getElementById('dropZone').addEventListener('click', pickDirectory);
}

async function pickDirectory() {
    // 检查浏览器是否支持文件夹选择API（仅Chrome/Edge支持）
    if (!('showDirectoryPicker' in window)) { alert('你的浏览器不支持文件夹选择API，请使用最新版Chrome或Edge'); return; }
    try {
        // 打开文件夹选择对话框
        const dirHandle = await window.showDirectoryPicker();
        const scanStatus = document.getElementById('scanStatus');//getElementById返回对拥有指定 ID 的第一个对象的引用
        const scanPath = document.getElementById('scanPath');
        const scanResult = document.getElementById('scanResult');
        const importList = document.getElementById('importList');
        scanStatus.style.display = 'block';
        scanPath.textContent = dirHandle.name;
        scanResult.textContent = '正在扫描...';
        importList.innerHTML = '';

        // 遍历文件夹中的所有文件
        const files = [];
        for await (const entry of dirHandle.values()) { if (entry.kind === 'file') files.push(entry); }

        // 按扩展名分类：音频文件、封面图片、歌词文件
        const audioFiles = [], coverFiles = {}, lrcFiles = {};
        for (const entry of files) {
            const name = entry.name, dotIdx = name.lastIndexOf('.');
            if (dotIdx === -1) continue;
            const ext = name.slice(dotIdx).toLowerCase(), base = name.slice(0, dotIdx);
            if (AUDIO_EXTS.has(ext)) audioFiles.push({ entry, base, name });
            else if (COVER_EXTS.has(ext)) coverFiles[base.toLowerCase()] = entry;
            else if (LRC_EXTS.has(ext)) lrcFiles[base.toLowerCase()] = entry;
        }

        // 逐个处理音频文件
        let addedCount = 0, skippedCount = 0 , errorCount = 0;
        for (const { entry, base } of audioFiles) {
            try {
                // 将文件名中的 - _ 替换为空格，作为歌曲标题
            const title = base.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
            // 跳过已存在的重复歌曲
            if (state.musicList.some(s => s.title === title)) { skippedCount++; continue; }

            // 读取音频文件
            const file = await entry.getFile();
            // 按文件名匹配封面（同名的jpg/png等）
            let coverBlob = null;
            if (coverFiles[base.toLowerCase()]) coverBlob = await coverFiles[base.toLowerCase()].getFile();
            // 按文件名匹配歌词（同名的lrc文件）
            let lrcText = null;
            if (lrcFiles[base.toLowerCase()]) lrcText = await (await lrcFiles[base.toLowerCase()].getFile()).text();

            // 创建歌曲对象，生成Blob URL供播放使用
            const id = Date.now() + Math.random();
            const song = { id, title, artist: '未知艺术家', audioBlob: file, coverBlob, lrcText, audioUrl: URL.createObjectURL(file), coverUrl: coverBlob ? URL.createObjectURL(coverBlob) : null };
            // 保存到IndexedDB
            await saveSongToDB(song);
            state.musicList.push(song);
            addedCount++;
            } catch (e) {
                console.error('处理文件失败:', entry.name, e);
                errorCount++;
            }
        } 

        // 保存元数据到localStorage，更新播放队列
        saveMusicMeta();
        state.playQueue = [...state.musicList];

        // 显示扫描结果
        let resultText = `扫描完成：找到 ${audioFiles.length} 音频，已添加 ${addedCount} 首`;
        if (skippedCount > 0) resultText += `，跳过 ${skippedCount} 首重复`;
        if (errorCount > 0) resultText += `，${errorCount} 首处理失败`;
        scanResult.textContent = resultText;
        renderMusicList();
    } catch (err) { 
        if (err.name !== 'AbortError') 
        console.error('Directory picker error:', err); 
        // 更新扫描状态，提示用户出错
        const scanResult = document.getElementById('scanResult');
        if (scanResult) scanResult.textContent = '扫描出错：' + (err.message || '未知错误');
    }
}

/* ============================
   渲染本地音乐列表
   支持搜索过滤，显示封面/歌名/歌手/播放指示器
   ============================ */
function renderMusicList() {
    //更新侧边栏的音乐数量
    document.getElementById('allMusicCount').textContent = state.musicList.length;
    const list = document.getElementById('musicList');
    //根据搜索框内容过滤
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = state.musicList.filter(m => !q || m.title.toLowerCase().includes(q) || m.artist.toLowerCase().includes(q));
    //空状态
    if (filtered.length === 0) {
        list.innerHTML =   `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg><p>暂无音乐</p><p class="hint">点击"导入音乐"添加本地文件</p></div>`
        return;
    }
    //生成歌单列表html
    list.innerHTML = filtered.map( s => `
        <div class="music-item ${state.currentSong?.id === s.id ? 'playing' : ''}" data-id="${s.id}">
            <div class="cover">${s.coverUrl ? `<img src="${s.coverUrl}" onerror="this.style.display='none'">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`}</div>
            <div class="info"><div class="title">${s.title}</div><div class="artist">${s.artist}</div></div>
            <div class="playing-indicator"><span></span><span></span><span></span></div>
            <button class="more-btn" data-id="${s.id}" title="添加到歌单"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
        </div>`
    ).join('');
    //绑定歌曲点击事件 点击播放
    list.querySelectorAll('.music-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if(e.target.closest('.more-btn')) return ;//点击更多按钮不播放
            const song = state.musicList.find(s => s.id == item.dataset.id);
            if (song) {
                state.playQueue = [...filtered];
                playSong(song);
            }
        })
    })
    // 绑定更多按钮点击事件 - 显示右键菜单
    list.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); showContextMenu(btn.dataset.id, e.clientX, e.clientY); });
    });
}
// 搜索框输入时实时过滤音乐列表
document.getElementById('searchInput').addEventListener('input', renderMusicList);

/* ============================
   应用初始化
   页面加载完成后执行，恢复状态并绑定所有事件
   ============================ */

async function init() {

    //绑定事件
    setupImport();// 导入音乐
    
}

init();
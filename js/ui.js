//UI 交互：标签页、歌单、搜索、导入、初始化
/**项目的页面导航是单页应用(SPA)模式，通过CSS类切换实现不同页面的显示/隐藏 */

/* ============================
   设置应用 - 从state.settings恢复到UI
   页面初始化时调用，将持久化的设置值同步到界面
   ============================ */
function applySettings() {
    const s = state.settings;
    //console.log(s);
    // 更新CSS变量，控制全局字号和歌词字号
    document.documentElement.style.setProperty('--font-size', s.fontSize + 'px');
    document.documentElement.style.setProperty('--lyric-size', s.lyricSize + 'px');
    // 恢复主题颜色
    if (s.themeColor) {
        setThemeColor(s.themeColor);
        // 同步主题色按钮的激活状态
        document.querySelectorAll('.theme-color-btn').forEach(b => b.classList.toggle('active', b.dataset.color === s.themeColor));
        // 同步自定义颜色输入框
        const picker = document.getElementById('customColorPicker');
        const text = document.getElementById('customColorText');
        if (picker) picker.value = s.themeColor;
        if (text) text.value = s.themeColor;
    }
    // 同步字号按钮的激活状态
    document.querySelectorAll('.font-size-btn').forEach(b => b.classList.toggle('active', b.dataset.size == s.fontSize));

    // 同步歌词字号滑块
    const slider = document.getElementById('lyricSizeSlider');
    const val = document.getElementById('lyricSizeValue');
    if (slider) { slider.value = s.lyricSize; val.textContent = s.lyricSize + 'px'; }

    // 同步开关状态
    const fade = document.getElementById('fadeToggle');
    const autoNext = document.getElementById('autoNextToggle');
    if (fade) fade.checked = s.fade;
    if (autoNext) autoNext.checked = s.autoNext;

    // 恢复 API 代理地址输入框
    const apiInput = document.getElementById('apiBaseInput');
    if (apiInput) apiInput.value = loadApiBase();

    // 同步音质选择
    const level = s.quality || 'standard';
    const qualBtn = document.getElementById('qualBtn');
    const settingsQualBtn = document.getElementById('settingsQualBtn');
    const qualItem = document.querySelector(`.quality-item[data-level="${level}"]`);
    if (qualItem) {
        const text = qualItem.textContent;
        if (qualBtn) qualBtn.textContent = text;         // 全屏播放器音质按钮
        if (settingsQualBtn) settingsQualBtn.textContent = text; // 设置页音质按钮
        // 同步所有音质选项的激活状态
        document.querySelectorAll('.quality-item').forEach(i => i.classList.toggle('active', i.dataset.level === level));
    }
}




/* ============================
   设置面板事件绑定
   主题色、字号、歌词字号、开关、音质的选择交互
   ============================ */
function setupSettings() {
    // 点击设置按钮，跳转到设置页
    document.getElementById('settingsBtn').addEventListener('click', () => switchTab('settings'));
    // ---- 主题色选择（8个预设色块） ---
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 取消其他按钮的激活状态
            document.querySelectorAll('.theme-color-btn').forEach(b => b.classList.remove('active'));
            // 激活当前按钮
            btn.classList.add('active');
            // 应用主题色到CSS变量
            setThemeColor(btn.dataset.color);
            state.settings.themeColor = btn.dataset.color;
            // 同步到自定义颜色输入框
            document.getElementById('customColorPicker').value = btn.dataset.color;
            document.getElementById('customColorText').value = btn.dataset.color;
            saveSettings();
        })
    })
    // ---- 自定义颜色选择器（颜色面板） ----
    const picker = document.getElementById('customColorPicker');
    const text = document.getElementById('customColorText');

    // 颜色面板实时预览
    picker.addEventListener('input', () => {
        setThemeColor(picker.value);
        text.value = picker.value;
        state.settings.themeColor = picker.value;
        // 选择自定义颜色时，取消预设色块的激活
        document.querySelectorAll('.theme-color-btn').forEach(b => b.classList.remove('active'));
        saveSettings();
    });

    // 手动输入颜色值（需验证格式）
    text.addEventListener('input', () => {
        // 只允许 #RRGGBB 格式
        if (/^#[0-9A-Fa-f]{6}$/.test(text.value)) {
            setThemeColor(text.value);
            picker.value = text.value;
            state.settings.themeColor = text.value;
            document.querySelectorAll('.theme-color-btn').forEach(b => b.classList.remove('active'));
            saveSettings();
        }
    });

    // ---- 字号选择按钮 ----
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const size = btn.dataset.size;
            // 实时更新CSS变量，页面字号立即变化
            document.documentElement.style.setProperty('--font-size', size + 'px');
            state.settings.fontSize = size;
            saveSettings();
        });
    });

    // ---- 歌词字号滑块 ----
    const slider = document.getElementById('lyricSizeSlider');
    const val = document.getElementById('lyricSizeValue');
    slider.addEventListener('input', () => {
        const size = slider.value;
        document.documentElement.style.setProperty('--lyric-size', size + 'px');
        val.textContent = size + 'px';
        state.settings.lyricSize = size;
        saveSettings();
    });

    // ---- 开关选项（淡入淡出 / 自动播放下一首） ----
    document.getElementById('fadeToggle').addEventListener('change', (e) => { state.settings.fade = e.target.checked; saveSettings(); });
    document.getElementById('autoNextToggle').addEventListener('change', (e) => { state.settings.autoNext = e.target.checked; saveSettings(); });

    // ---- API 代理地址输入 ----
    const apiInput = document.getElementById('apiBaseInput');
    if (apiInput) {
        // 用户输入时实时保存到 localStorage
        apiInput.addEventListener('input', () => saveApiBase(apiInput.value.trim()));
    }

    // ---- 音质选择弹出面板 ----
    const settingsQualBtn = document.getElementById('settingsQualBtn');
    const settingsQualPopup = document.getElementById('settingsQualPopup');

    // 点击按钮切换弹出面板显示/隐藏
    settingsQualBtn.addEventListener('click', (e) => { e.stopPropagation(); settingsQualPopup.classList.toggle('active'); });

    // 点击面板外部关闭
    document.addEventListener('click', (e) => { if (!e.target.closest('.quality-select-wrapper')) settingsQualPopup.classList.remove('active'); });

    // 每个音质选项的点击事件
    settingsQualPopup.querySelectorAll('.quality-item').forEach(item => {
        item.addEventListener('click', () => {
            // 更新激活状态
            settingsQualPopup.querySelectorAll('.quality-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            // 保存设置
            state.settings.quality = item.dataset.level;
            settingsQualBtn.textContent = item.textContent;
            settingsQualPopup.classList.remove('active');
            saveSettings();
            // 同步全屏播放器的音质按钮
            const qualBtn = document.getElementById('qualBtn');
            const qualPopup = document.getElementById('qualityPopup');
            if (qualBtn) { qualBtn.textContent = item.textContent; }
            if (qualPopup) {
                qualPopup.querySelectorAll('.quality-item').forEach(i => {
                    i.classList.toggle('active', i.dataset.level === item.dataset.level);
                });
            }
        });
    });
}


/* ============================
   设置主题颜色
   将十六进制颜色转为RGB，并更新CSS变量
   ============================ */
function setThemeColor(hex) {
    // 解析 #RRGGBB 为 r, g, b 分量
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // 更新CSS变量 --theme-color（纯色）和 --theme-color-rgb（RGB分量，用于rgba）
    document.documentElement.style.setProperty('--theme-color', hex);
    document.documentElement.style.setProperty('--theme-color-rgb', `${r}, ${g}, ${b}`);
}


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
        loadDailyRecommend();  
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

// 返回按钮、登录按钮、登录返回按钮
document.getElementById('settingsBackBtn').addEventListener('click', () => switchTab(state.previousTab || 'all'));
document.querySelector('.login-btn').addEventListener('click', () => { state.previousTab = 'settings'; switchTab('login'); });
document.getElementById('loginBackBtn').addEventListener('click', () => { /*stopQrLogin();*/ switchTab(state.previousTab || 'all'); });

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
   工具函数 - 文件大小格式化
   ============================ */
function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
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
    const filtered = state.musicList.filter(m => !q || m.title.toLowerCase().includes(q) || m.artist.toLowerCase().includes(q));//从musicList里面筛选，搜索框为空或者歌曲标题或歌曲名包含关键词（忽略大小写），m 是遍历到的每一首歌曲对象，箭头函数返回 true（保留）或 false（过滤掉）
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
            const song = state.musicList.find(s => s.id == item.dataset.id);//找到歌曲对象
            if (song) {
                state.playQueue = [...filtered];//设置播放列表为当前列表
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
   每日推荐
   ============================ */
async function loadDailyRecommend() {
    const list = document.getElementById('dailyList');
    const info = document.getElementById('dailyInfo');
    const today = new Date();

    // 显示今日日期
    info.innerHTML = `<h2>${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 每日推荐</h2><p>根据你的口味生成，每天6:00更新</p>`;
    list.innerHTML = '<div class="search-loading">加载中...</div>';
    const songs = await getDailyRecommend();
    // 未登录或无数据时提示
    if (songs.length === 0) { list.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg><p>请先登录以获取每日推荐</p></div>`; return; }
    list.innerHTML = songs.map(s => {
        const artists = (s.ar || []).map(a => a.name).join(' / ');
        const coverUrl = s.al && s.al.picUrl ? s.al.picUrl + '?param=800y800' : null;
        return `<div class="music-item" data-id="${s.id}" data-name="${s.name}" data-artist="${artists}" data-cover="${coverUrl || ''}"><div class="cover">${coverUrl ? `<img src="${coverUrl}">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`}</div><div class="info"><div class="title">${s.name}</div><div class="artist">${artists}</div></div><div class="playing-indicator"><span></span><span></span><span></span></div></div>`;
    }).join('');
    //给每首歌加点击事件
    list.querySelectorAll('.music-item').forEach(item => {
        item.addEventListener('click', async () => {
            state.playQueue = songs.map(s => ({ id: s.id, title: s.name, artist: (s.ar || []).map(a => a.name).join(' / '), coverUrl: s.al && s.al.picUrl ? s.al.picUrl + '?param=800y800' : null, neteaseId: s.id }));
            const queueSong = state.playQueue.find(s => s.neteaseId === parseInt(item.dataset.id));
            await playSong(queueSong);
        });
    });
    updatePlayingState();
}
/* ============================
   歌单管理 - 事件绑定
   新建、删除、歌单标签页切换
   ============================ */
function setupPlaylists() {
    // // 新建歌单按钮（两个入口：侧边栏 + 主内容区）
    // document.getElementById('newPlaylistBtn').addEventListener('click', openNewPlaylist);
    // document.querySelector('.add-playlist-btn').addEventListener('click', openNewPlaylist);

    // // 新建歌单弹窗的取消/确认/回车
    // document.getElementById('cancelPlaylistBtn').addEventListener('click', closeNewPlaylist);
    // document.getElementById('confirmPlaylistBtn').addEventListener('click', createPlaylist);
    // document.getElementById('playlistNameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') createPlaylist(); });

    // 歌单详情页的返回/删除
    //TODO:document.getElementById('playlistBackBtn').addEventListener('click', closePlaylistDetail);
    //TODO:document.getElementById('deletePlaylistBtn').addEventListener('click', deletePlaylist);

    // 歌单标签页切换（本地/创建/收藏/专辑）
    document.querySelectorAll('.playlist-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.playlist-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentPlaylistTab = tab.dataset.type;
            renderNeteasePlaylists();
        });
    });
}

/* ============================
   加载网易云歌单和专辑
   登录后调用，获取用户的歌单列表
   ============================ */
async function loadNeteasePlaylists() {
    //没有登录时 清空歌单和专辑列表
    if (!state.user){
        state.neteasePlaylists = [];
        state.neteaseAlbums = [];
        return;
    };
    state.neteasePlaylists = await getUserPlayLists(state.user.userId);
    state.neteaseAlbums = await getUserAlbums(state.user.userId);
    //渲染歌单和专辑到UI
    renderNeteasePlaylists();
    //渲染侧边栏歌单列表
    renderSidebarPlaylists();
}

/* ============================
   渲染歌单网格
   根据当前标签（local/created/collected/album）显示不同内容
   ============================ */
function renderNeteasePlaylists() {
    const grid = document.getElementById('playlistsGrid');
    // ---- 网易云歌单（需登录） ----
    if (!state.user) {
        if (state.currentPlaylistTab === 'created') {
            grid.innerHTML = '<div class="empty-state"><p>请先登录以查看创建的歌单</p></div>';
        } else {
            grid.innerHTML = '<div class="empty-state"><p>请先登录以查看歌单</p></div>';
        }
        return;
    }
    // 区分用户创建的歌单和收藏的歌单
    const created = state.neteasePlaylists.filter(p => p.creator.userId === state.user.userId);
    const collected = state.neteasePlaylists.filter(p => p.creator.userId !== state.user.userId);

    let items = [];
    if(state.currentPlaylistTab === 'created') items = created;
    else if (state.currentPlaylistTab === 'collected') items = collected;
    else items = state.neteaseAlbums;

    if (items.length === 0) { grid.innerHTML = '<div class="empty-state"><p>暂无内容</p></div>'; return; }
    // ---- 专辑标签渲染 ----
    if (state.currentPlaylistTab === 'album') {
        grid.innerHTML = items.map(a => {
            const cover = a.picUrl ? a.picUrl + '?param=300y300' : null;
            return `<div class="playlist-card" data-id="${a.id}" data-type="album"><div class="card-cover" ${cover ? `style="background-image:url('${cover}')"` : ''}>${!cover ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>' : ''}</div><div class="card-info"><div class="name">${a.name}</div><div class="count">${a.size || 0} 首歌曲</div></div></div>`;
        }).join('');
    } else {
        // ---- 网易云歌单渲染 ----
        grid.innerHTML = items.map(p => {
            const cover = p.coverImgUrl ? p.coverImgUrl + '?param=300y300' : null;
            return `<div class="playlist-card" data-id="${p.id}" data-type="playlist"><div class="card-cover" ${cover ? `style="background-image:url('${cover}')"` : ''}>${!cover ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>' : ''}</div><div class="card-info"><div class="name">${p.name}</div><div class="count">${p.trackCount || 0} 首歌曲</div></div></div>`;
        }).join('');
    }

    // 绑定卡片点击事件 - 打开歌单/专辑详情
    grid.querySelectorAll('.playlist-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const type = card.dataset.type;
            openNeteasePlaylistDetail(id, type);
        });
    });
}
/* ============================
   渲染侧边栏歌单列表
   只显示用户创建的网易云歌单
   ============================ */
function renderSidebarPlaylists() {
    const list = document.getElementById('playlistsList');
    if (!state.user) { list.innerHTML = '<div class="playlist-item" style="color:var(--text-secondary);font-size:0.857em">请先登录</div>'; return; }
    const created = state.neteasePlaylists.filter(p => p.creator.userId === state.user.userId);
    list.innerHTML = created.map(p => {
        const cover = p.coverImgUrl ? p.coverImgUrl + '?param=100y100' : null;
        return `<div class="playlist-item" data-id="${p.id}"><div class="playlist-item-cover" style="width:40px;height:40px;${cover ? `background-image:url('${cover}')` : ''}">${!cover ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>` : ''}</div><span>${p.name}</span></div>`;
    }).join('');
    // 点击侧边栏歌单 → 跳转到歌单页并打开详情
    list.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => { switchTab('playlists'); openNeteasePlaylistDetail(parseInt(item.dataset.id), 'playlist'); });
    });
}

/* ============================
   登录方式管理 - 事件绑定
   账号密码/验证码/扫码 四个标签，切换时动态加载对应的登录表单
   ============================ */
function renderLoginForm(type) {
    const loginMethod = document.getElementById('loginMethod');
    if (!loginMethod) return;
    if (type === 'account') {
        loginMethod.innerHTML = `
            <div class="login-phone-area">
                <div class="login-form">
                    <div class="login-input-group">
                        <input type="tel" placeholder="手机号" id="loginPhone">
                    </div>
                    <div class="login-input-group">
                        <input type="password" placeholder="密码" id="loginPassword">
                    </div>
                    <button class="btn-primary login-submit-btn">
                        <p class="btn-text">登录</p>
                    </button>
                </div>
            </div>`;
    }
    else if (type === 'phone') {
        loginMethod.innerHTML = `
            <div class="login-phone-area">
                <div class="login-form">
                    <div class="login-input-group">
                        <input type="tel" placeholder="手机号" id="loginPhone">
                    </div>
                    <div class="login-input-group">
                        <input type="text" placeholder="验证码" id="loginIdentifyCode">
                    </div>
                    <button class="btn-primary login-get-indentify-code-btn">
                        <p class="btn-text">获取验证码</p>
                    </button>
                    <button class="btn-primary login-indentify-submit-btn">
                        <p class="btn-text">登录</p>
                    </button>
                </div>
            </div>`;
    } else if (type === 'QRcode') {
        loginMethod.innerHTML = `
            <div class="login-qr-area">
                <div class="login-qr-placeholder" id="qrPlaceholder">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                        <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 18h2v2h-2zM15 14h2v4h-2zM13 22h2v-2h-2zM19 18h-2v2h2zM17 14h2v4h-2zM19 22h2v-2h-2zM13 14h2v2h-2z"/>
                    </svg>
                    <p>点击获取二维码</p>
                </div>
                <img id="qrCodeImg" style="display:none; width:200px; height:200px; border-radius:8px;">
                <p class="qr-status" id="qrStatus"></p>
            </div>`;
        // 渲染完成后绑定扫码占位区域的点击事件（元素此时才存在于 DOM 中）
        const placeholder = document.getElementById('qrPlaceholder');
        if (placeholder) placeholder.addEventListener('click', startQrLogin);
    }
}

function setupLoginTabs() {
    const tabs = document.querySelectorAll('.login-tab');
    // 渲染默认激活的tab对应的表单
    const activeTab = document.querySelector('.login-tab.active');
    if (activeTab) {
        state.loginType = activeTab.dataset.type;
        renderLoginForm(state.loginType);
    }
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            //切换激活状态
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.loginType = tab.dataset.type;
            renderLoginForm(state.loginType);
        })
    })
}

/* ============================
   登录功能
   手机号密码登录 + 二维码扫码登录
   ============================ */
function setupLogin() {
    const loginBtn = document.querySelector('.login-btn');
    const loginBackBtn = document.getElementById('loginBackBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // 从设置页进入登录页：切换到扫码登录 tab 并自动开始获取二维码
    loginBtn.addEventListener('click', () => {
        state.previousTab = 'settings';
        switchTab('login');
        updateLoginUI();
        if (!state.user) {
            // 激活扫码登录 tab 并渲染对应表单
            document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
            const qrTab = document.querySelector('.login-tab[data-type="QRcode"]');
            if (qrTab) { qrTab.classList.add('active'); state.loginType = 'QRcode'; }
            renderLoginForm('QRcode');
            // renderLoginForm 已绑定 qrPlaceholder 点击事件，直接调用启动扫码
            startQrLogin();
        }
    });

    // 登录页返回按钮
    loginBackBtn.addEventListener('click', () => { stopQrLogin(); switchTab(state.previousTab || 'all'); });

    // 登录表单内按钮的事件委托（因为这些按钮是动态渲染的，直接在 #loginMethod 上委托）
    const loginMethod = document.getElementById('loginMethod');
    loginMethod.addEventListener('click', async (e) => {
        // 账号密码登录按钮
        if (state.loginType === 'account') {
            const submitBtn = e.target.closest('.login-submit-btn');
            const phone = document.getElementById('loginPhone')?.value?.trim();
            const password = document.getElementById('loginPassword')?.value?.trim();
            if (!phone || !password) { alert('请输入手机号和密码'); return; }
            submitBtn.textContent = '登录中...'; submitBtn.disabled = true;
            const result = await loginWithPhone(phone, password);
            submitBtn.textContent = '登录'; submitBtn.disabled = false;
            if (result.success) {
                // cookie 已由 loginWithPhone 内部保存，这里只需更新UI
                stopQrLogin();              // 停止二维码轮询
                renderUserStatus();         // 更新UI显示
                await loadNeteasePlaylists();    // 加载歌单
                setTimeout(() => switchTab('playlists'), 1000); // 1秒后跳转到首页
            } else alert(result.msg);
        }
        // 手机号验证码登录
        if (state.loginType === 'phone') {
            const getCodeBtn = e.target.closest('.login-get-indentify-code-btn');
            const submitBtn = e.target.closest('.login-indentify-submit-btn');
            const phone = document.getElementById('loginPhone')?.value?.trim();
            if (getCodeBtn) {
                if (!phone) { alert('请输入手机号'); return; }
                getCodeBtn.textContent = '发送中...'; getCodeBtn.disabled = true;
                const result = await sendIdentifyCode(phone);
                getCodeBtn.textContent = '获取验证码'; getCodeBtn.disabled = false;
                if (result.success) alert('验证码已发送，请注意查收');
                else alert(result.msg);
            }
            if (submitBtn) {
                const code = document.getElementById('loginIdentifyCode')?.value?.trim();
                if (!phone || !code) { alert('请输入手机号和验证码'); return; }
                submitBtn.textContent = '登录中...'; submitBtn.disabled = true;
                const result = await loginWithIdentifyCode(phone, code);
                submitBtn.textContent = '登录'; submitBtn.disabled = false;
                if (result.success) {
                    // cookie 已由 loginWithIdentifyCode 内部保存，这里只需更新UI
                    stopQrLogin();              // 停止二维码轮询
                    renderUserStatus();         // 更新UI显示
                    await loadNeteasePlaylists();    // 加载歌单
                    setTimeout(() => switchTab('playlists'), 1000); // 1秒后跳转到首页
                } else alert(result.msg);
            }
        }
    });

    // 退出登录
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        await logout();
        state.neteasePlaylists = [];
        state.neteaseAlbums = [];
        renderUserStatus();
        renderNeteasePlaylists();
        renderSidebarPlaylists();
        alert('已退出登录');
    });
}
/* ============================
   应用初始化
   页面加载完成后执行，恢复状态并绑定所有事件
   ============================ */

async function init() {
    //加载持久化数据
    loadSettings();           // 从localStorage加载设置
    await loadAllSongs();     // 从IndexedDB加载所有歌曲
    state.playQueue = [...state.musicList]; // 初始化播放队列
    //应用设置到UI
    applySettings();
    //渲染初始页面
    renderMusicList();        // 渲染本地音乐列表
    //绑定事件
    setupSettings();          // 设置面板事件
    setupQueue();             // 播放队列
    setupImport();            // 导入音乐
    setupControls();          // 播放控制按钮
    setupProgress();          // 进度条
    setupVolume();            // 音量控制
    updateModeBtn();          // 播放模式按钮
    setupPlayerBar();         // 播放器栏事件
    setupPlaylists();         // 歌单管理
    setupLoginTabs();         // 登录方式切换
    setupLogin();             // 登录功能
    //setupDailyRecommend();    // 每日推荐
    await loadPlayerState();

    // 6. 如果已登录，加载用户信息和歌单
    if (state.cookie) {
        await fetchUserInfo();
        renderUserStatus();
        await loadNeteasePlaylists();
    }
}

init();
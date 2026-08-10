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

// // 设置按钮
// const settingsBtn = document.getElementById('settingsBtn');
// if (settingsBtn) {
//     settingsBtn.addEventListener('click', () => switchTab('settings'))
// }

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
    setupLoginTabs();         // 登录方式切换
    await loadPlayerState();
}

init();
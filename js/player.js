//播放器核心：控制、进度、音量、队列、歌词
/* ============================
   核心播放函数 - 播放指定歌曲
   设置音频源、更新所有UI、保存状态
   ============================ */
async function playSong(song) {
    state.currentSong = song;//当前播放音乐设置为选中的音乐
    state.isPlaying = true;//设置播放状态

    //网易云歌曲处理
    //TODO: 

    //本地音乐播放，没有audioUrl说明播放异常
    if (!song.audioUrl) {
        console.error('没有音频链接',song);
        state.isPlaying = false;
        updatePlayButtons();
        return;
    }

    //设置音频源并播放
    audio.src = song.audioUrl;
    audio.play().catch(e => {
        console.error('播放失败',e.error,'歌曲',song.title);
        state.isPlaying = false;
        updatePlayButtons();
    })

    //更新所有UI
    updatePlayerInfo();      // 更新底部栏歌名/歌手/封面
    updatePlayButtons();     // 更新播放/暂停图标
    //updateAlbumCover();      // 更新全屏播放器封面
    renderMusicList();       // 重新渲染歌曲列表（高亮当前歌曲）
    //renderQueue();           // 更新播放队列面板
    updatePlayingState();    // 给当前歌曲行添加 .playing 类
    //loadLyricsFromText(song.lrcText);  // 解析并显示歌词
    savePlayerState();       // 保存播放状态到localStorage（刷新恢复用）
}
/* ============================
   更新播放器栏歌曲信息
   底部栏 + 全屏播放器的文字和封面
   ============================ */
function updatePlayerInfo() {
    const s = state.currentSong;
    //底部栏
    document.getElementById('playerTitle').textContent = s ? s.title : '未播放';
    document.getElementById('playerArtist').textContent = s ? s.artist : '选择音乐进行播放';
    //全屏播放器
    //TODO:

    //底部栏封面
    const cover = document.getElementById('playerCover');
    if( s && s.coverUrl) {
        cover.innerHTML = `<img src="${s.coverUrl}" onerror="this.style.display='none'">`;
    } else {
        cover.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    }
}

/* ============================
   更新播放/暂停按钮图标
   播放中显示暂停图标，暂停时显示播放图标
   同时更新底部栏和全屏播放器的图标
   ============================ */
function updatePlayButtons() {
    document.querySelectorAll('.play-icon').forEach(i => i.style.display = state.isPlaying ? 'none' : '');
    document.querySelectorAll('.pause-icon').forEach(i => i.style.display = state.isPlaying ? '' : 'none');
}
/* ============================
   更新歌曲列表中当前播放歌曲的高亮状态
   给正在播放的歌曲行添加 .playing 类
   ============================ */
function updatePlayingState() {
    const curId = state.currentSong?.id;
    const curNeteaseId = state.currentSong?.neteaseId;
    document.querySelectorAll('.music-item').forEach(item => {
        const itemId = parseFloat(item.dataset.id);
        const isPlaying = itemId === curId || itemId === curNeteaseId;
        item.classList.toggle('playing', isPlaying);
    })
}
/* ============================
   播放控制按钮事件绑定
   播放/暂停、上一首/下一首、播放模式、音质选择
   ============================ */
function setupControls() {
    //播放暂停
    document.getElementById('playBtn').addEventListener('click',togglePlay);
    //上一首/下一首
    document.getElementById('nextBtn').addEventListener('click',playNext);
    document.getElementById('prevBtn').addEventListener('click', playPrev);
}

/* ============================
   进度条和时间更新
   监听audio的timeupdate事件，实时更新进度条和时间显示
   ============================ */
function setupProgress() {
    // 音频时间更新事件（每秒触发多次）
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        // 更新底部栏进度条
        document.getElementById('progressFill').style.width = pct + '%';
        // 更新全屏播放器进度条
        //document.getElementById('progressFillLarge').style.width = pct + '%';
        // 更新时间显示
        //document.getElementById('currentTime').textContent = fmt(audio.currentTime);
        //document.getElementById('totalTime').textContent = fmt(audio.duration);
        document.getElementById('timeInfo').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
        // 同步歌词高亮
        //syncLyrics(audio.currentTime);
    });

    // 播放结束事件（自动播放下一首）
    audio.addEventListener('ended', () => { if (state.settings.autoNext) playNext(); });

    // ---- 点击底部栏进度条跳转 ----
    document.getElementById('playerProgress').addEventListener('click', (e) => {
        if (!audio.duration) return;
        // 计算点击位置的百分比，转换为播放时间
        audio.currentTime = ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width) * audio.duration;
    });

    // ---- 点击全屏播放器进度条跳转 ----
    // document.getElementById('progressBarLarge').addEventListener('click', (e) => {
    //     if (!audio.duration) return;
    //     audio.currentTime = ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width) * audio.duration;
    // });
}
/* ============================
   时间格式化工具函数
   秒数 → "MM:SS" 格式
   ============================ */
function fmt(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
/* ============================
   播放/暂停切换
   处理播放状态、URL过期重获、播放控制
   ============================ */
async function togglePlay() {
    if(!state.currentSong) return;//没有歌曲时不做处理

    if(state.isPlaying) {
        //暂停
        audio.pause();
        state.isPlaying = false;
    } else {
        //播放
        if(state.currentSong.neteaseId && !state.currentSong.audioUrl) {
            const url = await getSongUrl(state.currentSong.neteaseId);
            if(url) state.currentSong.audioUrl = url;
        }
        // 没有播放链接则提示
        if (!state.currentSong.audioUrl) {
            alert('无法获取播放链接');
            return;
        }
        // 设置音频源（如果URL没变化则跳过，避免重新加载）
        const currentTime = audio.currentTime;
        if (audio.src !== state.currentSong.audioUrl) {
            audio.src = state.currentSong.audioUrl;
        }
        audio.currentTime = currentTime;
        try {
            await audio.play();
            state.isPlaying = true;
        } catch (e) {
            console.error('播放失败',e);
            state.isPlaying = false;
        }
    }
    updatePlayButtons();
    //TODO: updateAlbumCover();    // 更新全屏封面动画
}
/* ============================
   播放下一首
   根据播放模式决定下一首歌曲
   ============================ */
async function playNext() {
    const queue = state.playQueue;
    if (queue.length === 0) return;

    //TODO:单曲循环
    //TODO:随机播放

    //顺序播放下一首
    const curId = state.currentSong?.neteaseId || state.currentSong?.id;
    const idx = queue.findIndex(s => (s.neteaseId || s.id) === curId);
    await playSong(queue[(idx + 1) % queue.length]);//% queue.length 是必须的，否则播放到最后一首时会报错。

}
/* ============================
   播放上一首
   循环到列表末尾
   ============================ */
async function playPrev() {
    const queue = state.playQueue;
    if (queue.length === 0) return;
    const curId = state.currentSong?.neteaseId || state.currentSong?.id;
    const idx = queue.findIndex(s => (s.neteaseId || s.id) === curId);
    // idx-1 如果为-1则变成 queue.length-1（最后一首）
    await playSong(queue[(idx - 1 + queue.length) % queue.length]);
}
/* ============================
   音量控制
   竖向滑块 + 拖拽 + 持久化
   ============================ */
function setupVolume() {
    const volumeBtn = document.getElementById('volumeBtn');
    const volumePopup = document.getElementById('volumePopup');
    const volumeTrack = document.getElementById('volumeTrack');
    const volumeFillVertical = document.getElementById('volumeFillVertical');
    const volumeThumb = document.getElementById('volumeThumb');
    const volumePercent = document.getElementById('volumePercent');
    const volIconOn = volumeBtn.querySelector('.vol-icon-on');
    const volIconOff = volumeBtn.querySelector('.vol-icon-off');

    // 从localStorage恢复上次音量（默认80%）
    const sacedVolume = parseFloat(localStorage.getItem('mp_volume') || '0.5');
    audio.volume = sacedVolume;
    updateVolumeUI(sacedVolume);

    //点击音量按钮弹出面板
    volumeBtn.addEventListener('click',(e)=> { e.stopPropagation();volumePopup.classList.toggle('active');})

    //点击音量按钮外关闭弹窗
    document.addEventListener('click', (e) => {
        if( !e.target.closest('.volume-wrapper')) {
            volumePopup.classList.remove('active');
        }
    })
    // 点击音量轨道直接设置音量（竖向：底部=100%，顶部=0%）
    volumeTrack.addEventListener('click', (e)=> {
        const rect = volumeTrack.getBoundingClientRect();
        setVolume(Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)));
    })
    // ---- 拖拽音量手柄 ----
    let dragging = false;
    volumeThumb.addEventListener('mousedown', (e) => { e.preventDefault(); dragging = true; });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const rect = volumeTrack.getBoundingClientRect();
        setVolume(Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)));
    });
    document.addEventListener('mouseup', () => { dragging = false; });
    // 设置音量并更新UI
    function setVolume(v) {
        audio.volume = v;
        updateVolumeUI(v);
        localStorage.setItem('mp_volume', v);  // 持久化音量
    }

    // 更新音量滑块UI（填充高度、手柄位置、百分比文字、图标切换）
    function updateVolumeUI(v) {
        const pct = v * 100;
        volumeFillVertical.style.height = pct + '%';
        volumeThumb.style.bottom = `calc(${pct}% - 6px)`;  // 手柄位置
        volumePercent.textContent = Math.round(pct) + '%';
        volIconOn.style.display = v === 0 ? 'none' : 'block';   // 音量>0显示正常图标
        volIconOff.style.display = v === 0 ? 'block' : 'none';  // 音量=0显示静音图标
    }
}
/* ============================
   播放队列面板
   底部栏的队列弹出面板
   ============================ */
function setupQueue() {
    const queueBtn = document.getElementById('queueBtn');
    const queuePopup = document.getElementById('queuePopup');

    // 点击队列按钮切换面板
    queueBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        renderQueue(); 
        queuePopup.classList.toggle('active'); 
    });
    // 点击面板外部关闭（底部栏和全屏播放器的队列面板都关闭）
    document.addEventListener('click', (e) => {
        if(!e.target.closest('.queue-wrapper')) {
            document.getElementById('queuePopup').classList.remove('active');
            //document.getElementById('queuePopupLarge').classList.remove('active');
        }
    })
}
/* ============================
   渲染播放队列列表
   同时更新底部栏和全屏播放器的队列面板
   ============================ */
function renderQueue() {
    const songs = state.playQueue;
    const countText = songs.length + '首歌';
    document.getElementById('queueCount').textContent = countText;
    //document.getElementById('queueCountLarge').textContent = countText;

    //空列表显示
    if  (songs.length === 0) {
        const empty = '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:0.857em">暂无歌曲</div>';
        document.getElementById('queueList').innerHTML = empty;
        document.getElementById('queueListLarge').innerHTML = empty;
        return;
    }
    //生成队列歌曲列表html
    const html = songs.map(s =>`
        <div class="queue-item ${state.currentSong?.id === s.id || state.currentSong?.neteaseId === s.id ? 'playing' : ''}" data-id="${s.id}">
            <div class="q-cover">${s.coverUrl ? `<img src="${s.coverUrl}" loading="lazy" onerror="this.style.display='none'">` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`}</div>
            <div class="q-info"><div class="q-title">${s.title}</div><div class="q-artist">${s.artist}</div></div>
            <div class="q-playing"><span></span><span></span><span></span></div>
        </div>`).join('');
    //同时更新两个队列面板
    document.getElementById('queueList').innerHTML = html;
    //document.getElementById('queueListLarge').innerHTML = html;

    //绑定点击事件
    document.querySelectorAll('.queue-item').forEach(item =>{
        item.addEventListener('click', ()=>{
            const song = state.playQueue.find(s => s.id == item.dataset.id);
            if (song) playSong(song);
            renderQueue();  // 刷新队列（更新高亮）
        })
    })
    // 自动滚动到当前播放歌曲
    if (state.currentSong) {
        const active = document.querySelector('.queue-item.playing');
        if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}
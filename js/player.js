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
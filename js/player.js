// 播放器核心：控制、进度、音量、队列、歌词

import { state, audio, MODE_NAMES } from './state.js';
import { getSongUrl, getLyric } from './api.js';
import { savePlayerState, saveSettings } from './persistence.js';
import { renderMusicList } from './ui.js';

/* ============================
   播放器栏交互
   点击播放器栏打开全屏播放器（避开控制按钮区域）
   ============================ */
export function setupPlayerBar() {
    const playerBar = document.getElementById('playerBar');
    const fullscreen = document.getElementById('fullscreenPlayer');
    // 点击播放器栏 → 打开全屏播放器
    // 排除控制按钮、音量、队列区域的点击，避免误触
    playerBar.addEventListener('click', (e) => {
        if(e.target.closest('.player-controls, .control-btn, .player-progress, .volume-wrapper, .queue-popup')) return;
        //if (!state.currentSong) return;  // 未播放任何歌曲时不打开
        fullscreen.classList.add('active');
        updateAlbumCover();
    })
     // 关闭全屏播放器
    document.getElementById('closePlayer').addEventListener('click', () => fullscreen.classList.remove('active'));
}

/* ============================
   核心播放函数 - 播放指定歌曲
   设置音频源、更新所有UI、保存状态
   ============================ */
export async function playSong(song) {
    state.currentSong = song;//当前播放音乐设置为选中的音乐
    state.isPlaying = true;//设置播放状态

    // ---- 网易云歌曲处理 ----
    // URL可能过期或缺失，需要重新获取
    if (song.neteaseId && !song.audioUrl) {
        const url = await getSongUrl(song.neteaseId);
        if (!url) { alert('无法获取播放链接'); state.isPlaying = false; updatePlayButtons(); return; }
        song.audioUrl = url;
    }
    // 歌词也需要异步获取
    if (song.neteaseId && !song.lrcText) {
        song.lrcText = await getLyric(song.neteaseId);
    }

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
    updateAlbumCover();      // 更新全屏播放器封面
    renderMusicList();       // 重新渲染歌曲列表（高亮当前歌曲）
    renderQueue();           // 更新播放队列面板
    updatePlayingState();    // 给当前歌曲行添加 .playing 类
    loadLyricsFromText(song.lrcText);  // 解析并显示歌词
    savePlayerState();       // 保存播放状态到localStorage（刷新恢复用）
}
/* ============================
   更新播放器栏歌曲信息
   底部栏 + 全屏播放器的文字和封面
   ============================ */
export function updatePlayerInfo() {
    const s = state.currentSong;
    //底部栏
    document.getElementById('playerTitle').textContent = s ? s.title : '未播放';
    document.getElementById('playerArtist').textContent = s ? s.artist : '选择音乐进行播放';
    //全屏播放器
    document.getElementById('songTitle').textContent = s ? s.title : '未播放';
    document.getElementById('songArtist').textContent = s ? s.artist : '选择音乐进行播放';
    //底部栏封面
    const cover = document.getElementById('playerCover');
    if( s && s.coverUrl) {
        cover.innerHTML = `<img src="${s.coverUrl}" onerror="this.style.display='none'">`;
    } else {
        cover.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    }
}
/* ============================
   更新全屏播放器的专辑封面
   有封面显示图片，无封面显示默认音符图标
   ============================ */
export function updateAlbumCover() {
    const cover = document.getElementById('albumCover');
    if (state.currentSong && state.currentSong.coverUrl) {
        // 将封面URL参数替换为800x800（全屏需要更高清）
        const largeCover = state.currentSong.coverUrl.replace(/param=\d+y\d+/, '/800x800');
        cover.innerHTML = `<img src="${largeCover}" onerror="this.style.display='none'">`;
        cover.classList.add('playing'); // 添加旋转动画
    } else {
        // 无封面时显示默认SVG图标
        cover.innerHTML = `<svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
        cover.classList.remove('playing');
    }
}

/* ============================
   更新播放/暂停按钮图标
   播放中显示暂停图标，暂停时显示播放图标
   同时更新底部栏和全屏播放器的图标
   ============================ */
export function updatePlayButtons() {
    document.querySelectorAll('.play-icon').forEach(i => i.style.display = state.isPlaying ? 'none' : '');
    document.querySelectorAll('.pause-icon').forEach(i => i.style.display = state.isPlaying ? '' : 'none');
}
/* ============================
   更新歌曲列表中当前播放歌曲的高亮状态
   给正在播放的歌曲行添加 .playing 类
   ============================ */
export function updatePlayingState() {
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
export function setupControls() {
    //播放暂停
    document.getElementById('playBtn').addEventListener('click',togglePlay);
    document.getElementById('playBtnLarge').addEventListener('click',togglePlay);
    //上一首/下一首
    document.getElementById('nextBtn').addEventListener('click',playNext);
    document.getElementById('prevBtn').addEventListener('click', playPrev);
    document.getElementById('nextBtnLarge').addEventListener('click',playNext);
    document.getElementById('prevBtnLarge').addEventListener('click', playPrev);
    //播放模式切换
    document.getElementById('modeBtn').addEventListener('click',togglePlayMode);
    document.getElementById('modeBtnLarge').addEventListener('click', togglePlayMode);
    // ---- 音质选择弹出面板（全屏播放器内） ----
    const qualBtn = document.getElementById('qualBtn');
    const qualPopup = document.getElementById('qualityPopup');
    if (!qualBtn || !qualPopup) return;  // 元素不存在则跳过

    // 点击音质按钮切换弹出面板
    qualBtn.addEventListener('click', (e) => {
        e.stopPropagation(); //阻止冒泡，避免触发document的关闭逻辑
        qualPopup.classList.toggle('active');
    })
    // 点击面板外部关闭
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.control-quality')) qualPopup.classList.remove('active');
    });
     // 每个音质选项的点击事件（标准/较高/极高/无损/Hi-Res）
    qualPopup.querySelectorAll('.quality-item').forEach(item => {
        item.addEventListener('click', async () => {
            // 更新所有音质选项的激活状态
            document.querySelectorAll('.quality-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            // 保存设置
            state.settings.quality = item.dataset.level;
            qualBtn.textContent = item.textContent;
            // 同步设置页音质按钮文字
            const settingsQualBtn = document.getElementById('settingsQualBtn');
            if (settingsQualBtn) settingsQualBtn.textContent = item.textContent;
            qualPopup.classList.remove('active');
            saveSettings();
            // 如果当前正在播放网易云歌曲，重新获取URL（音质可能变化）
            if (state.currentSong?.neteaseId) {
                const currentTime = audio.currentTime;  // 记录当前播放位置
                state.currentSong.audioUrl = null;       // 清空旧URL，强制重新获取
                await playSong(state.currentSong);       // 重新播放
                audio.currentTime = currentTime;         // 恢复播放位置
            }
        });
    });

    // ---- 全屏播放器的播放列表弹出面板 ----
    const queueBtnLarge = document.getElementById('queueBtnLarge');
    const queuePopupLarge = document.getElementById('queuePopupLarge');

    queueBtnLarge.addEventListener('click', (e) => {
        e.stopPropagation();
        renderQueue();
        queuePopupLarge.classList.toggle('active');
    });
    // 点击面板外部关闭（底部栏和全屏播放器的队列面板都关闭）
    document.getElementById('queueWrapperLarge').addEventListener('click', (e) => {
        if (!e.target.closest('#queuePopupLarge') && !e.target.closest('#queueBtnLarge')) {
            queuePopupLarge.classList.remove('active');
        }
    });

}

/* ============================
   进度条和时间更新
   监听audio的timeupdate事件，实时更新进度条和时间显示
   ============================ */
export function setupProgress() {
    // 音频时间更新事件（每秒触发多次）
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        // 更新底部栏进度条
        document.getElementById('progressFill').style.width = pct + '%';
        // 更新全屏播放器进度条
        document.getElementById('progressFillLarge').style.width = pct + '%';
        // 更新时间显示
        document.getElementById('currentTime').textContent = fmt(audio.currentTime);
        document.getElementById('totalTime').textContent = fmt(audio.duration);
        document.getElementById('timeInfo').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
        // 同步歌词高亮
        syncLyrics(audio.currentTime);
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
    document.getElementById('progressBarLarge').addEventListener('click', (e) => {
        if (!audio.duration) return;
        audio.currentTime = ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width) * audio.duration;
    });
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
export async function togglePlay() {
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
    updateAlbumCover();    // 更新全屏封面动画
}
/* ============================
   播放下一首
   根据播放模式决定下一首歌曲
   ============================ */
export async function playNext() {
    const queue = state.playQueue;
    if (queue.length === 0) return;

    //单曲循环
    if(state.playMode === 1) {
        await playSong(state.currentSong);
        return;
    }
    //随机播放
    if(state.playMode === 2) {
        await playSong(queue[Math.floor(Math.random()* queue.length)]);
        return;
    }

    //顺序播放下一首
    const curId = state.currentSong?.neteaseId || state.currentSong?.id;
    const idx = queue.findIndex(s => (s.neteaseId || s.id) === curId);
    await playSong(queue[(idx + 1) % queue.length]);//% queue.length 是必须的，否则播放到最后一首时会报错。

}
/* ============================
   播放上一首
   循环到列表末尾
   ============================ */
export async function playPrev() {
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
export function setupVolume() {
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
export function setupQueue() {
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
            document.getElementById('queuePopupLarge').classList.remove('active');
        }
    })
}
/* ============================
   渲染播放队列列表
   同时更新底部栏和全屏播放器的队列面板
   ============================ */
export function renderQueue() {
    const songs = state.playQueue;
    const countText = songs.length + '首歌';
    document.getElementById('queueCount').textContent = countText;
    document.getElementById('queueCountLarge').textContent = countText;

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
    document.getElementById('queueListLarge').innerHTML = html;

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
/* ============================
   播放模式切换
   0→1→2→0 循环（顺序→单曲→随机→顺序）
   ============================ */
export function togglePlayMode() {
    state.playMode = (state.playMode +1) % 3;
    updateModeBtn();
    if( state.currentSong) savePlayerState();//保存播放模式
}
/* ============================
   更新播放模式按钮图标
   通过opacity切换三个叠加的SVG图标（带过渡动画）
   ============================ */
export function updateModeBtn() {
    document.querySelectorAll('.mode-btn, .mode-btn-large').forEach(btn => {
        btn.title = MODE_NAMES[state.playMode];
        btn.querySelectorAll('svg').forEach(s => {
            s.style.opacity = '0'
        });//全部隐藏
        // 只显示当前模式的图标
        if (state.playMode === 0) btn.querySelector('.mode-seq').style.opacity = '1';
        else if (state.playMode === 1) btn.querySelector('.mode-single').style.opacity = '1';
        else btn.querySelector('.mode-shuffle').style.opacity = '1';
    })
}

/* ============================
   歌词解析
   将LRC格式歌词文本解析为 [{time, text}] 数组
   ============================ */
export function loadLyricsFromText(text) {
    //console.log(text);//打印歌词
    state.lyrics = [];
    state.currentLyricIndex = -1;
    const container = document.getElementById('lyricsContainer');
    // 无歌词时显示占位文字
    if (!text) {
        container.innerHTML = '<div class="lyric-line placeholder">暂无歌词</div>';
        return;
    }
    // 逐行解析LRC格式
    const lines = text.split('\n');
    const parsed = [];
    for (const line of lines) {
        // 匹配 [分:秒.毫秒] 歌词内容 格式
        const match = line.match(/\[(\d+):(\d+\.?\d*)\](.*)/);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseFloat(match[2]);// 转为秒数
            const text = match[3].trim();
            if (text) parsed.push({ time, text });
        }
    }
    // 按时间排序
    parsed.sort((a, b) => a.time - b.time);
    state.lyrics = parsed;

    if (parsed.length === 0) {
        container.innerHTML = '<div class="lyric-line placeholder">暂无歌词</div>';
    } else {
        // 生成歌词HTML
        container.innerHTML = parsed.map((lyric, i) => `<div class="lyric-line" data-index="${i}">${lyric.text}</div>`).join('');
        // 绑定点击事件 - 点击歌词行跳转到对应时间
        container.querySelectorAll('.lyric-line').forEach(line => {
            line.addEventListener('click', () => {
                const index = parseInt(line.dataset.index);
                if (state.lyrics[index]) audio.currentTime = state.lyrics[index].time;
            });
        });
    }
}

/* ============================
   歌词同步
   根据当前播放时间高亮对应的歌词行，并自动滚动居中
   ============================ */
export function syncLyrics(time) {

    if (state.lyrics.length === 0) return;

    // 从后往前找到当前时间对应的歌词行索引
    // 减0.3秒是为了提前0.3秒高亮，视觉上更跟手
    let idx = -1;
    for (let i = state.lyrics.length - 1; i >= 0; i--) {
        if (time >= state.lyrics[i].time - 0.3) {
            idx = i;
            break;
        }
    }
    // 没有变化则跳过
    if (idx === state.currentLyricIndex) return;
    state.currentLyricIndex = idx;
    console.log(state.lyrics[idx]);

    // 更新所有歌词行的激活状态
    const container = document.getElementById('lyricsContainer');
    if (!container) return;
    // 清除旧激活状态
    container.querySelectorAll('.lyric-line.active').forEach(el => el.classList.remove('active'));
    // 自动滚动到当前歌词行，使其垂直居中
    if (idx >= 0) {
        const activeLine = container.querySelector(`.lyric-line[data-index="${idx}"]`);
        if (activeLine) {
            activeLine.classList.add('active');
            const containerRect = container.getBoundingClientRect();
            const activeRect = activeLine.getBoundingClientRect();
            // 计算滚动偏移量：让当前歌词行居中显示
            container.scrollBy({
                top: activeRect.top - containerRect.top - container.clientHeight / 2 + activeRect.height / 2,
                behavior: 'smooth'
            })
        }
    }
}

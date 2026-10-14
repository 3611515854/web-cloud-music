// 持久化存储：歌单、设置、歌曲数据

import { state, audio } from './state.js';
import { dbPut, dbGet } from './db.js';
import { getSongUrl } from './api.js';
import { updateModeBtn, updatePlayerInfo, updateAlbumCover, loadLyricsFromText } from './player.js';

export async function saveSongToDB(song) {
    const meta = { id: song.id, title: song.title, artist: song.artist, hasAudio: !!song.audioBlob, hasCover: !!song.coverBlob, hasLrc: !!song.lrcText };
    if (song.audioBlob) await dbPut(`audio_${song.id}`, song.audioBlob);
    if (song.coverBlob) await dbPut(`cover_${song.id}`, song.coverBlob);
    if (song.lrcText) await dbPut(`lrc_${song.id}`, song.lrcText);
    return meta;
}

export function saveMusicMeta() {
    const meta = state.musicList.map(s => ({ id: s.id, title: s.title, artist: s.artist, hasAudio: !!s.audioBlob, hasCover: !!s.coverBlob, hasLrc: !!s.lrcText }));
    localStorage.setItem('mp_musicMeta', JSON.stringify(meta));
}

export async function loadAllSongs() {
    try {
        const meta = localStorage.getItem('mp_musicMeta');
        if (!meta) return;
        const list = JSON.parse(meta);
        for (const m of list) {
            try {
                const song = await loadSongFromDB(m);
                state.musicList.push(song);
            } catch (e) {
                console.error('加载歌曲失败:', m.title, e);
            }
        }
    } catch (e) {
        console.error('加载音乐列表失败:', e);
    }
}

async function loadSongFromDB(meta) {
    const song = { id: meta.id, title: meta.title, artist: meta.artist, audioUrl: null, coverUrl: null, lrcText: null, audioBlob: null, coverBlob: null  };
    // 尝试加载音频（不管 hasAudio 标记，直接按 key 取）
    try {
        const blob = await dbGet(`audio_${meta.id}`);
        if (blob) { song.audioBlob = blob; song.audioUrl = URL.createObjectURL(blob); }
    } catch {}
    // 尝试加载封面
    try {
        const blob = await dbGet(`cover_${meta.id}`);
        if (blob) { song.coverBlob = blob; song.coverUrl = URL.createObjectURL(blob); }
    } catch {}
    // 尝试加载歌词
    try {
        const text = await dbGet(`lrc_${meta.id}`);
        if (text) song.lrcText = text;
    } catch {}
    return song;
}

export function savePlayerState() {
    const s = state.currentSong;
    if (!s) return;
    const queueMeta = state.playQueue.map(q => ({ id: q.id, title: q.title, artist: q.artist, coverUrl: q.coverUrl, neteaseId: q.neteaseId, audioUrl: q.audioUrl, lrcText: q.lrcText }));
    localStorage.setItem('mp_playerState', JSON.stringify({
        songId: s.neteaseId || s.id,
        isNetease: !!s.neteaseId,
        title: s.title,
        artist: s.artist,
        coverUrl: s.coverUrl,
        lrcText: s.lrcText,
        audioUrl: s.audioUrl,
        playMode: state.playMode,
        currentTime: audio.currentTime,
        queue: queueMeta
    }));
}

export async function loadPlayerState() {
    try {
        const raw = localStorage.getItem('mp_playerState');
        if (!raw) return;
        const saved = JSON.parse(raw);
        state.playMode = saved.playMode || 0;
        updateModeBtn();

        let song = null;
        if (saved.isNetease) {
            // Re-fetch URL for netease songs (old URLs may expire)
            const url = await getSongUrl(saved.songId);
            song = { id: Date.now(), title: saved.title, artist: saved.artist, coverUrl: saved.coverUrl, lrcText: saved.lrcText, audioUrl: url, neteaseId: saved.songId };
        } else {
            const local = state.musicList.find(s => s.id == saved.songId);
            if (local) song = local;
        }

        if (song && song.audioUrl) {
            state.currentSong = song;
            audio.src = song.audioUrl;
            audio.currentTime = saved.currentTime || 0;
            updatePlayerInfo();
            updateAlbumCover();
            loadLyricsFromText(song.lrcText);
        }

        if (saved.queue && saved.queue.length > 0) {
            state.playQueue = saved.queue.map(q => {
                if (q.neteaseId) return q;
                const local = state.musicList.find(s => s.id == q.id);
                return local || q;
            });
        }
    } catch {}
}

export function saveSettings() {
    localStorage.setItem('mp_settings', JSON.stringify(state.settings));
}

export function loadSettings() {
    try {
        const s = localStorage.getItem('mp_settings');
        if (s) state.settings = { ...state.settings, ...JSON.parse(s) };
    } catch {}
}

/* ============================
   API代理地址存取
   将用户自定义的网易云API代理地址
   存入localStorage，页面初始化时恢复
   存储 key: "netease_api"（与 state.js 中 API_BASE 常量对应）
   ============================ */

/**
 * 保存 API 代理地址到 localStorage
 * @param {string} url - 用户输入的 API 地址
 */
export function saveApiBase(url) {
    if (url) {
        localStorage.setItem('netease_api', url);
    } else {
        // 如果清空输入框，则删除缓存
        localStorage.removeItem('netease_api');
    }
}

/**
 * 从 localStorage 读取已保存的 API 代理地址
 * @returns {string} 已保存的 API 地址，无保存则返回空字符串
 */
export function loadApiBase() {
    return localStorage.getItem('netease_api') || '';
}

//持久化存储：歌单、设置、歌曲数据

async function saveSongToDB(song) {
    const meta = { id: song.id, title: song.title, artist: song.artist, hasAudio: !!song.audioBlob, hasCover: !!song.coverBlob, hasLrc: !!song.lrcText };
    if (song.audioBlob) await dbPut(`audio_${song.id}`, song.audioBlob);
    if (song.coverBlob) await dbPut(`cover_${song.id}`, song.coverBlob);
    if (song.lrcText) await dbPut(`lrc_${song.id}`, song.lrcText);
    return meta;
}

function saveMusicMeta() {
    const meta = state.musicList.map(s => ({ id: s.id, title: s.title, artist: s.artist, hasAudio: !!s.audioBlob, hasCover: !!s.coverBlob, hasLrc: !!s.lrcText }));
    localStorage.setItem('mp_musicMeta', JSON.stringify(meta));
}

async function loadAllSongs() {
    try {
        const meta = localStorage.getItem('mp_musicMeta');
        if (!meta) return;
        const list = JSON.parse(meta);
        for (const m of list) {
            const song = await loadSongFromDB(m);
            state.musicList.push(song);
        }
    } catch {}
}

async function loadSongFromDB(meta) {
    const song = { id: meta.id, title: meta.title, artist: meta.artist, audioUrl: null, coverUrl: null, lrcText: null, audioBlob: null, coverBlob: null  };
    if (meta.hasAudio) {
        const blob = await dbGet(`audio_${meta.id}`);
        if (blob) { song.audioBlob = blob; song.audioUrl = URL.createObjectURL(blob); }
    }
    if (meta.hasCover) {
        const blob = await dbGet(`cover_${meta.id}`);
        if (blob) { song.coverBlob = blob; song.coverUrl = URL.createObjectURL(blob); }
    }
    if (meta.hasLrc) {
        song.lrcText = await dbGet(`lrc_${meta.id}`);
    }
    return song;
}

function savePlayerState() {
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

async function loadPlayerState() {
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

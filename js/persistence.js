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
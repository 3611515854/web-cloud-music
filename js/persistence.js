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
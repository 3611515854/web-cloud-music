//全局状态对象、常量定义
/* ============================
   常量定义
   ============================ */
// "我喜欢的音乐" 歌单固定ID为0，不可删除
const FAVORITES_ID = 0;
// 默认歌单列表，包含一个固定的"我喜欢的音乐"歌单
const DEFAULT_PLAYLISTS = [{ id: FAVORITES_ID, name: '我喜欢的音乐', songs: [] }];

// 网易云API代理服务器地址
// 优先从 localStorage 读取用户自定义地址，否则使用默认地址
const API_BASE = localStorage.getItem('netease_api') || 'http://106.14.205.179:1000';

/* ============================
   全局状态对象
   存储应用运行时的所有状态数据
   ============================ */
const state  = {
    musicList: [],          //本地音乐列表（从IndexeDB加载的歌曲数组）
    playlists: [],          //用户创建的本地歌单数组
    currentSong: null,      //当前正在播放的音乐对象
    isPlaying: false,       //当前是否正在播放
    playlistIdCounter: 1,   //歌单ID自增（新建歌单时递增）
    lyrics: [],             // 当前歌曲的歌词数组 [{time: 秒数, text: "歌词内容"}]
    currentLyricIndex: -1,    // 当前播放到的歌词行索引（-1表示无歌词）
    previousTab: 'playlists' ,//上一个打开的标签 用于返回导航
    viewingPlaylistId: null, //当前正在查看的歌单id null表示没有进入详情页
    contextSongId: null,     // 右键菜单（更多按钮）当前操作的歌曲ID
    playMode: 0,              // 播放模式：0=顺序播放, 1=单曲循环, 2=随机播放
    playQueue: [],            // 当前播放队列（歌曲数组，播放/上一首/下一首从这里取）
    user: null,               // 当前登录的网易云用户信息（昵称、头像等）
    cookie: localStorage.getItem('netease_cookie') || '', // 网易云登录凭证
    neteasePlaylists: [],     // 用户在网易云创建/收藏的歌单列表
    neteaseAlbums: [],        // 用户在网易云收藏的专辑列表
    currentPlaylistTab: 'created', // 当前歌单标签：created/collected/album/local
    settings: {
        fontSize: 14,         // 全局字号（px），可在设置中调整
        lyricSize: 20,        // 全屏歌词字号（px）
        fade: true,           // 是否启用淡入淡出效果
        autoNext: true        // 播放结束后是否自动播放下一首
    }
};

/* ============================
   Audio 元素引用
   页面唯一的 <audio> 元素，所有音频播放都通过它
   ============================ */
const audio = document.getElementById('audioPlayer');

/* ============================
   播放模式名称映射
   用于 UI 显示和 tooltip
   ============================ */
const MODE_NAMES = ['顺序播放', '单曲循环', '随机播放'];

/* ============================
   文件扩展名集合
   用于导入音乐时按扩展名分类
   ============================ */

// 支持的音频格式
const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma', '.opus']);

// 支持的封面图片格式
const COVER_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

// 支持的歌词文件格式
const LRC_EXTS = new Set(['.lrc']);
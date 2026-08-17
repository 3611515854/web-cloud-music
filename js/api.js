//网易云 API 调用、QR 登录、用户信息
/* ============================
   网易云音乐 API 封装
   所有与网易云服务器的通信都通过这里
   API代理服务器地址在 state.js 中定义
   ============================ */

/* ============================
   GET 请求封装
   通用的 GET 请求函数，自动附加 cookie 和参数
   ============================ */
async function apiFetch(path, params = {}) {
    // 拼接完整URL
    const url = new URL(API_BASE + path);

    // 将参数对象转为URL查询参数
    // 例：{ id: 123, limit: 50 } → ?id=123&limit=50
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    // 如果用户已登录，自动附加cookie参数（API代理服务器需要）
    if (state.cookie) url.searchParams.set('cookie', state.cookie);

    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        console.error('API fetch error:', path, e);
        return { code: -1, msg: e.message }; // 网络错误时返回统一格式
    }
}

/* ============================
   POST 请求封装
   用于登录等需要POST的接口
   ============================ */
async function apiPost(path, body = {}) {
    const url = new URL(API_BASE + path);

    // 附加cookie
    if (state.cookie) url.searchParams.set('cookie', state.cookie);

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        // 将对象转为表单格式：{ phone: '138', password: '123' } → "phone=138&password=123"
        body: new URLSearchParams(body).toString()
    });
    return res.json();
}

/* ============================
   手机号密码登录
   ============================ */
async function loginWithPhone(phone, password) {
    try {
        const data = await apiPost('/login/cellphone', { phone, password });
        if (data.code === 200) {
            // 登录成功，保存cookie
            state.cookie = data.cookie || '';
            localStorage.setItem('netease_cookie', state.cookie);
            // 立即获取用户信息
            await fetchUserInfo();
            return { success: true, profile: data.profile };
        }
        return { success: false, msg: data.msg || '登录失败' };
    } catch (e) {
        return { success: false, msg: '网络错误' };
    }
}
/* ============================
   发送验证码
   ============================ */
async function sendIdentifyCode(phone) {
    try {
        const data = await apiPost('/captcha/sent', { phone });
        if (data.code === 200) return { success: true };
        return { success: false, msg: data.msg || '发送失败' };
    } catch (e) {
        return { success: false, msg: '网络错误' };
    }
}
/* ============================
    验证码登录
    注意：验证码登录实际调用的是 /login/cellphone 接口，
    传入 captcha 参数（此时 password 参数失效）。
    /captcha/verify 仅用于"校验验证码是否正确"，不登录也不返回 cookie。
    ============================ */
async function loginWithIdentifyCode(phone, code) {
    try {
        // 用验证码代替密码登录：/login/cellphone?phone=xxx&captcha=1234
        const data = await apiPost('/login/cellphone', { phone, captcha: code });
        if (data.code === 200) {
            // 登录成功，保存cookie
            state.cookie = data.cookie || '';
            localStorage.setItem('netease_cookie', state.cookie);
            // 立即获取用户信息
            await fetchUserInfo();
            return { success: true, profile: data.profile };
        }
        return { success: false, msg: data.msg || '登录失败' };
    } catch (e) {
        return { success: false, msg: '网络错误' };
    }
}
/* ============================
   获取当前登录用户信息
   昵称、头像、用户ID等
   ============================ */
async function fetchUserInfo() {
    if (!state.cookie) return null;
    try {
        const data = await apiFetch('/user/account');
        if (data.code === 200 && data.profile) {
            state.user = data.profile;  // 保存用户信息到全局状态
            return data.profile;
        }
    } catch {}
    return null;
}

/* ============================
   退出登录
   清除cookie和用户信息
   ============================ */
async function logout() {
    try { await apiFetch('/logout'); } catch {}
    state.cookie = '';
    state.user = null;
    localStorage.removeItem('netease_cookie');
}

/* ============================
   二维码登录相关变量
   ============================ */
let qrKey = '';            // 当前二维码的唯一标识
let qrCheckTimer = null;   // 轮询定时器ID

/* ============================
   获取二维码key
   向服务器申请一个唯一的二维码标识
   ============================ */
async function getQrKey() {
    try {
        const data = await apiFetch('/login/qr/key', { timestamp: Date.now() });
        if (data.code === 200 && data.data && data.data.unikey) return data.data.unikey;
    } catch {}
    return null;
}

/* ============================
   生成二维码图片
   用key换取二维码的base64图片数据
   ============================ */
async function createQrCode(key) {
    try {
        const data = await apiFetch('/login/qr/create', { key, qrimg: true, timestamp: Date.now() });
        if (data.code === 200 && data.data) return data.data.qrimg; // base64图片
    } catch {}
    return null;
}

/* ============================
   检查二维码扫码状态
   轮询调用，获取用户扫码进度
   ============================ */
async function checkQrStatus(key) {
    try {
        return await apiFetch('/login/qr/check', { key, timestamp: Date.now() });
    } catch {}
    return { code: -1 };
}

/* ============================
   二维码登录主流程
   获取key → 生成二维码 → 轮询状态 → 登录成功
   ============================ */
async function startQrLogin() {
    const qrImg = document.getElementById('qrCodeImg');
    const qrStatus = document.getElementById('qrStatus');
    const qrPlaceholder = document.getElementById('qrPlaceholder');

    // 第1步：获取二维码key
    qrStatus.textContent = '正在获取二维码...';
    qrKey = await getQrKey();
    if (!qrKey) { qrStatus.textContent = '获取二维码失败，请检查网络或服务器'; return; }

    // 第2步：用key生成二维码图片
    const qrimg = await createQrCode(qrKey);
    if (qrimg) {
        // 显示二维码图片，隐藏占位区域
        qrPlaceholder.style.display = 'none';
        qrImg.style.display = 'block';
        qrImg.src = qrimg;
        qrStatus.textContent = '请使用网易云音乐APP扫码';
    } else {
        qrStatus.textContent = '生成二维码失败';
    }

    // 第3步：每2秒轮询扫码状态
    if (qrCheckTimer) clearInterval(qrCheckTimer);
    qrCheckTimer = setInterval(async () => {
        const result = await checkQrStatus(qrKey);

        if (result.code === 803) {
            // ---- 登录成功 ----
            clearInterval(qrCheckTimer);
            state.cookie = result.cookie || '';
            localStorage.setItem('netease_cookie', state.cookie);
            await fetchUserInfo();           // 获取用户信息
            renderUserStatus();              // 更新UI显示
            //TODO:await loadNeteasePlaylists();    // 加载歌单
            qrStatus.textContent = '登录成功！';
            setTimeout(() => switchTab('playlists'), 1000); // 1秒后跳转到首页

        } else if (result.code === 800) {
            // ---- 二维码已过期 ----
            qrStatus.textContent = '二维码已过期，点击刷新';
            qrImg.style.display = 'none';
            qrPlaceholder.style.display = 'flex';
            clearInterval(qrCheckTimer);
            qrPlaceholder.onclick = startQrLogin; // 点击重新获取

        } else if (result.code === 801) {
            // ---- 等待扫码 ----
            qrStatus.textContent = '等待扫码...';

        } else if (result.code === 802) {
            // ---- 已扫码，等待用户在手机上确认 ----
            qrStatus.textContent = '已扫码，请在手机上确认';
        }
    }, 2000); // 每2秒轮询一次
}

/* ============================
   停止二维码轮询
   用户离开登录页或登录成功后调用
   ============================ */
function stopQrLogin() {
    if (qrCheckTimer) { clearInterval(qrCheckTimer); qrCheckTimer = null; }
}

/* ============================
   搜索网易云音乐
   keywords: 搜索关键词
   limit: 返回数量（默认30）
   ============================ */
async function searchMusic(keywords, limit = 30) {
    try {
        const data = await apiFetch('/cloudsearch', { keywords, limit, type: 1 });
        if (data.code === 200 && data.result && data.result.songs) return data.result.songs;
    } catch {}
    return [];
}

/* ============================
   获取每日推荐歌曲
   需要登录状态
   ============================ */
async function getDailyRecommend() {
    try {
        const data = await apiFetch('/recommend/songs');
        if (data.code === 200 && data.data && data.data.dailySongs) return data.data.dailySongs;
    } catch {}
    return [];
}

/* ============================
   获取歌曲播放链接
   优先使用指定音质，失败则降级
   id: 网易云歌曲ID
   ============================ */
async function getSongUrl(id) {
    const level = state.settings.quality || 'standard';

    // 第1次尝试：使用用户选择的音质
    try {
        const data = await apiFetch('/song/url/v1', { id, level });
        if (data.code === 200 && data.data && data.data[0] && data.data[0].url) return data.data[0].url;
    } catch {}

    // 第2次尝试：降级为最高音质（兜底）
    try {
        const data = await apiFetch('/song/url', { id, br: 999000 });
        if (data.code === 200 && data.data && data.data[0] && data.data[0].url) return data.data[0].url;
    } catch {}

    return null; // 两次都失败
}

/* ============================
   获取歌曲歌词
   id: 网易云歌曲ID
   返回LRC格式歌词文本
   ============================ */
async function getLyric(id) {
    try {
        const data = await apiFetch('/lyric', { id });
        if (data.code === 200 && data.lrc && data.lrc.lyric) return data.lrc.lyric;
    } catch {}
    return null;
}

/* ============================
   获取用户的网易云歌单列表
   uid: 用户ID
   ============================ */
async function getUserPlayLists(uid) {
    try {
        const data = await apiFetch('/user/playlist', { uid, limit: 50 });
        if (data.code === 200 && data.playlist) return data.playlist;
    } catch {}
    return [];
}

/* ============================
   获取用户收藏的专辑列表
   ============================ */
async function getUserAlbums(uid) {
    try {
        const data = await apiFetch('/album/sublist', { limit: 50 });
        if (data.code === 200 && data.data) return data.data;
    } catch {}
    return [];
}

/* ============================
   更新用户状态显示
   设置按钮显示用户昵称或"设置"
   ============================ */
function renderUserStatus() {
    const btn = document.getElementById('settingsBtn');
    btn.querySelector('span').textContent = state.user ? state.user.nickname : '设置';
    updateLoginUI();
}

/* ============================
   更新登录页UI
   已登录：显示用户头像/昵称/退出按钮
   未登录：显示登录表单
   ============================ */
function updateLoginUI() {
    const loginForm = document.querySelector('.login-content');
    const userInfo = document.getElementById('loginUserInfo');

    if (state.user) {
        // 已登录状态
        loginForm.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('userNickname').textContent = state.user.nickname;
        document.getElementById('userId').textContent = 'ID: ' + state.user.userId;
        // 设置头像（加载失败则隐藏）
        const avatar = document.getElementById('userAvatar');
        if (state.user.avatarUrl) avatar.innerHTML = `<img src="${state.user.avatarUrl}" onerror="this.style.display='none'">`;
    } else {
        // 未登录状态
        loginForm.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

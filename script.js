/* ============================================================
   MIND FORGE — منصة درب عقلك
   script.js — النسخة النهائية v2
   ============================================================ */

/* ============================================================
   1. الحالة العامة
   ============================================================ */
let currentAgeGroup = null;
let activeTimer = null;
let timeLimit = 10;
let timeLeft = 10;
let lastGame = null;
const LAUNCHERS = {};

/* ============================================================
   2. نظام الأصوات (Web Audio API)
   ============================================================ */
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            return null;
        }
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/* صوت نقرة على الزر */
function playClick() {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
}

/* صوت إجابة صحيحة */
function playCorrect() {
    const ctx = getAudioCtx();
    if (!ctx) return;

    [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.2);
    });
}

/* صوت إجابة خاطئة */
function playWrong() {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
}

/* صوت ألعاب نارية (احتفال) */
function playFireworks() {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // 5 انفجارات متتالية
    for (let i = 0; i < 5; i++) {
        const start = ctx.currentTime + i * 0.25;

        // انفجار (noise)
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
            data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufferSize, 2);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800 + i * 200, start);
        filter.frequency.exponentialRampToValueAtTime(200, start + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(start);
        noise.stop(start + 0.2);

        // صافرة
        const whistle = ctx.createOscillator();
        const wGain = ctx.createGain();
        whistle.type = 'sine';
        whistle.frequency.setValueAtTime(1200 + i * 100, start - 0.15);
        whistle.frequency.exponentialRampToValueAtTime(2000, start);

        wGain.gain.setValueAtTime(0.05, start - 0.15);
        wGain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

        whistle.connect(wGain);
        wGain.connect(ctx.destination);
        whistle.start(start - 0.15);
        whistle.stop(start + 0.05);
    }
}

/* ربط صوت النقرة بكل الأزرار */
function attachClickSound() {
    document.addEventListener('click', (e) => {
        const t = e.target.closest('button, .game-card, .age-card, .back-btn, .sig-btn');
        if (t) playClick();
    });
}

/* ============================================================
   3. أيقونات SVG الملونة
   ============================================================ */
const ICONS = {
    stroop: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" stroke="#7C3AED" stroke-width="3" fill="none"/>
        <circle cx="24" cy="24" r="11" stroke="#EC4899" stroke-width="3" fill="none"/>
        <circle cx="24" cy="24" r="5" fill="#F59E0B"/>
        <circle cx="36" cy="12" r="3" fill="#EC4899"/>
        <circle cx="12" cy="36" r="3" fill="#7C3AED"/>
    </svg>`,

    decision: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 6 L10 26 L22 26 L20 42 L38 20 L26 20 Z" fill="#F59E0B" stroke="#B45309" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="38" cy="10" r="3" fill="#7C3AED"/>
        <circle cx="10" cy="40" r="2.5" fill="#EC4899"/>
    </svg>`,

    differences: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="12" stroke="#7C3AED" stroke-width="3.5" fill="none"/>
        <line x1="29" y1="29" x2="40" y2="40" stroke="#EC4899" stroke-width="4" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="4" fill="#F59E0B"/>
        <circle cx="14" cy="14" r="1.5" fill="#EC4899"/>
    </svg>`,

    counting: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4" fill="#7C3AED"/>
        <circle cx="24" cy="12" r="4" fill="#EC4899"/>
        <circle cx="36" cy="12" r="4" fill="#F59E0B"/>
        <circle cx="12" cy="24" r="4" fill="#60A5FA"/>
        <circle cx="24" cy="24" r="4" fill="#7C3AED"/>
        <circle cx="36" cy="24" r="4" fill="#EC4899"/>
        <circle cx="12" cy="36" r="4" fill="#F59E0B"/>
        <circle cx="24" cy="36" r="4" fill="#60A5FA"/>
        <circle cx="36" cy="36" r="4" fill="#7C3AED"/>
    </svg>`,

    spatial: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="14" height="14" rx="2" fill="#7C3AED"/>
        <rect x="24" y="6" width="14" height="14" rx="2" stroke="#EC4899" stroke-width="2.5" fill="none"/>
        <rect x="6" y="24" width="14" height="14" rx="2" stroke="#F59E0B" stroke-width="2.5" fill="none"/>
        <rect x="24" y="24" width="14" height="14" rx="2" fill="#EC4899"/>
    </svg>`,

    colors: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="20" r="9" fill="#7C3AED" opacity="0.85"/>
        <circle cx="32" cy="20" r="9" fill="#EC4899" opacity="0.85"/>
        <circle cx="24" cy="32" r="9" fill="#F59E0B" opacity="0.85"/>
        <circle cx="24" cy="22" r="3" fill="#FFF"/>
    </svg>`,

    stories: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="8" width="28" height="32" rx="3" fill="#7C3AED"/>
        <rect x="14" y="12" width="20" height="24" rx="2" fill="#F3E8FF"/>
        <line x1="18" y1="18" x2="30" y2="18" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"/>
        <line x1="18" y1="23" x2="30" y2="23" stroke="#EC4899" stroke-width="2" stroke-linecap="round"/>
        <line x1="18" y1="28" x2="26" y2="28" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    reverse: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 20 A14 14 0 0 1 38 20" stroke="#7C3AED" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <polyline points="34,14 38,20 32,24" fill="none" stroke="#7C3AED" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M38 28 A14 14 0 0 1 10 28" stroke="#EC4899" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <polyline points="14,34 10,28 16,24" fill="none" stroke="#EC4899" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    math: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="8" y1="14" x2="20" y2="14" stroke="#7C3AED" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="14" y1="8" x2="14" y2="20" stroke="#7C3AED" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="28" y1="14" x2="40" y2="14" stroke="#EC4899" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="8" y1="34" x2="20" y2="34" stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="28" y1="30" x2="40" y2="38" stroke="#60A5FA" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="40" y1="30" x2="28" y2="38" stroke="#60A5FA" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,

    logic: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" stroke="#7C3AED" stroke-width="3" fill="none"/>
        <path d="M20 20 C20 16, 28 16, 28 20 C28 24, 24 25, 24 28" stroke="#EC4899" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="2.5" fill="#F59E0B"/>
    </svg>`,

    timeline: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" stroke="#7C3AED" stroke-width="3" fill="none"/>
        <line x1="24" y1="24" x2="24" y2="12" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>
        <line x1="24" y1="24" x2="33" y2="28" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
        <circle cx="24" cy="24" r="2" fill="#7C3AED"/>
    </svg>`,

    patterns: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="5" fill="#7C3AED"/>
        <circle cx="24" cy="12" r="5" fill="#EC4899"/>
        <circle cx="36" cy="12" r="5" fill="#F59E0B"/>
        <circle cx="12" cy="24" r="5" fill="#EC4899"/>
        <circle cx="24" cy="24" r="5" fill="#F59E0B"/>
        <circle cx="36" cy="24" r="5" fill="#7C3AED"/>
        <circle cx="12" cy="36" r="5" fill="#F59E0B"/>
        <circle cx="24" cy="36" r="5" fill="#7C3AED"/>
        <circle cx="36" cy="36" r="5" fill="#EC4899"/>
    </svg>`,

    twins: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="24" r="11" fill="#7C3AED" opacity="0.9"/>
        <circle cx="31" cy="24" r="11" fill="#EC4899" opacity="0.9"/>
        <circle cx="17" cy="24" r="4" fill="#FFF"/>
        <circle cx="31" cy="24" r="4" fill="#FFF"/>
    </svg>`,

    odd: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="4" fill="#7C3AED"/>
        <circle cx="24" cy="10" r="4" fill="#7C3AED"/>
        <circle cx="38" cy="10" r="4" fill="#7C3AED"/>
        <circle cx="10" cy="24" r="4" fill="#7C3AED"/>
        <circle cx="24" cy="24" r="4" fill="#F59E0B"/>
        <circle cx="38" cy="24" r="4" fill="#7C3AED"/>
        <circle cx="10" cy="38" r="4" fill="#7C3AED"/>
        <circle cx="24" cy="38" r="4" fill="#7C3AED"/>
        <circle cx="38" cy="38" r="4" fill="#7C3AED"/>
    </svg>`,

    missing: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" stroke="#7C3AED" stroke-width="3" fill="none"/>
        <path d="M20 20 C20 16, 28 16, 28 20 C28 24, 24 25, 24 28" stroke="#EC4899" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="2.5" fill="#F59E0B"/>
        <path d="M38 10 L44 4" stroke="#EC4899" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,

    match: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="15" height="15" rx="2" fill="#7C3AED"/>
        <rect x="27" y="6" width="15" height="15" rx="2" fill="#EC4899"/>
        <rect x="6" y="27" width="15" height="15" rx="2" fill="#F59E0B"/>
        <rect x="27" y="27" width="15" height="15" rx="2" fill="#7C3AED" opacity="0.6"/>
        <path d="M33 34 L36 37 L42 32" stroke="#FFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    overlap: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="24" r="14" fill="#7C3AED" opacity="0.85"/>
        <circle cx="28" cy="24" r="14" fill="#EC4899" opacity="0.75"/>
        <circle cx="24" cy="24" r="3" fill="#FFF"/>
    </svg>`,

    topdown: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="6" width="20" height="10" rx="2" fill="#7C3AED"/>
        <rect x="14" y="19" width="20" height="10" rx="2" fill="#EC4899"/>
        <rect x="14" y="32" width="20" height="10" rx="2" fill="#F59E0B"/>
    </svg>`,

    half: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6 A18 18 0 0 1 24 42 Z" fill="#7C3AED"/>
        <path d="M24 6 A18 18 0 0 0 24 42 Z" fill="#EC4899" opacity="0.5"/>
        <circle cx="24" cy="24" r="18" stroke="#7C3AED" stroke-width="2" fill="none"/>
    </svg>`,

    pieces: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6 H22 V22 H6 Z" fill="#7C3AED"/>
        <path d="M26 6 H42 V22 H26 Z" fill="#EC4899"/>
        <path d="M6 26 H22 V42 H6 Z" fill="#F59E0B"/>
        <path d="M26 26 H42 V42 H26 Z" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-dasharray="4 3"/>
    </svg>`
};

/* ============================================================
   4. سجل الألعاب
   ============================================================ */
const GAMES = [
    { key: 'stroop', title: "تعارض اللون والكلمة", desc: "سرعة التركيز ومنع الاستجابة التلقائية تحت الضغط البصري.", under16: true, over16: true },
    { key: 'decision', title: "سرعة اتخاذ القرار", desc: "الضغط فقط عند ظهور الرموز الصحيحة وتجاهل المخادعة.", under16: true, over16: true },
    { key: 'differences', title: "كشف الاختلافات", desc: "البحث عن الفروق الدقيقة بين الأنماط المتشابهة.", under16: true, over16: true },
    { key: 'spatial', title: "الذاكرة المكانية", desc: "تذكر مواقع المربعات المضيئة بعد اختفائها.", under16: true, over16: true },
    { key: 'colors', title: "ذاكرة الألوان", desc: "تذكر تسلسل الألوان وأعد ترتيبها بدقة.", under16: true, over16: true },
    { key: 'stories', title: "الألغاز القصصية", desc: "ربط خيوط الأدلة للوصول للنتيجة المنطقية السليمة.", under16: true, over16: true },
    { key: 'reverse', title: "الذاكرة العكسية", desc: "استقبال سلاسل أرقام وعكسها عقلياً بدقة عالية.", under16: true, over16: true },
    { key: 'logic', title: "المنطق المجرد", desc: "استنتاجات منطقية تحتاج تفكيراً عميقاً.", under16: true, over16: true },
    { key: 'patterns', title: "تعرف الأنماط البصرية", desc: "اكتشاف الأنماط الخفية في تسلسل الأشكال.", under16: true, over16: true },
    { key: 'twins', title: "الرمزان المتشابهان", desc: "هل الرمزان متطابقان تماماً أم فيهما فرق دقيق؟", under16: true, over16: true },
    { key: 'odd', title: "الرمز الغريب", desc: "اكتشف الرمز المختلف في شبكة مليئة بالرموز المتشابهة.", under16: true, over16: true },
    { key: 'missing', title: "الرمز المختفي", desc: "أي رمز لم يكن موجوداً في المجموعة التي ظهرت؟", under16: true, over16: true },
    { key: 'overlap', title: "الأشكال المتداخلة", desc: "كم شكل ترى داخل الصورة المتداخلة؟", under16: true, over16: true },
    { key: 'topdown', title: "أعلى / أسفل", desc: "تحديد ترتيب الأشكال عمودياً بدقة.", under16: true, over16: true },
    { key: 'pieces', title: "القطع المفقودة", desc: "اختيار القطعة المكملة للصورة الناقصة.", under16: true, over16: true },
    { key: 'counting', title: "العد السريع", desc: "تذكر عدد العناصر التي ظهرت لفترة قصيرة.", under16: true, over16: false },
    { key: 'math', title: "الرياضيات السريعة", desc: "عمليات ضرب وقسمة بسيطة ضد الوقت.", under16: true, over16: false },
    { key: 'timeline', title: "التسلسل الزمني", desc: "ترتيب الأحداث حسب تسلسلها الصحيح.", under16: true, over16: false },
    { key: 'match', title: "التطابق ضد الوقت", desc: "اختيار الرمز المطابق بأسرع وقت ممكن.", under16: true, over16: false },
    { key: 'half', title: "أكمل النصف", desc: "اختيار النصف المكمل للصورة المعروضة.", under16: true, over16: false }
];

/* ============================================================
   5. الإحصائيات
   ============================================================ */
const STATS_KEY = 'mindforge-stats';

function getStats() {
    try {
        const raw = sessionStorage.getItem(STATS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function saveStats(s) {
    try { sessionStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
}

function recordScore(key, score) {
    const stats = getStats();
    if (!stats[key] || score > stats[key]) {
        stats[key] = score;
        saveStats(stats);
    }
    updateStats();
}

function updateStats() {
    const stats = getStats();
    const active = currentAgeGroup
        ? GAMES.filter(g => currentAgeGroup === 'under16' ? g.under16 : g.over16)
        : GAMES;

    const maxTotal = active.length * 100;
    let total = 0, played = 0;
    let best = -1, bestName = '—';
    let worst = 101, worstName = '—';

    active.forEach(g => {
        if (stats[g.key] !== undefined) {
            total += stats[g.key];
            played++;
            if (stats[g.key] > best) { best = stats[g.key]; bestName = g.title; }
            if (stats[g.key] < worst) { worst = stats[g.key]; worstName = g.title; }
        }
    });

    const percent = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

    const $ = id => document.getElementById(id);
    if ($('stats-current')) $('stats-current').innerText = total;
    if ($('stats-total')) $('stats-total').innerText = maxTotal;
    if ($('stats-percent')) $('stats-percent').innerText = percent + '%';
    if ($('stats-best')) $('stats-best').innerText = played > 0 ? `${bestName} — ${best}` : '—';
    if ($('stats-worst')) $('stats-worst').innerText = played > 0 ? `${worstName} — ${worst}` : '—';
    if ($('stats-bar-fill')) $('stats-bar-fill').style.width = percent + '%';
}

/* ============================================================
   6. التنقل
   ============================================================ */
function selectAge(group) {
    currentAgeGroup = group;
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('games-screen').classList.remove('hidden');
    renderGames();
    updateStats();
    window.scrollTo(0, 0);
}

function goHome() {
    stopTimer();
    document.getElementById('games-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
    updateStats();
    window.scrollTo(0, 0);
}

function renderGames() {
    const grid = document.getElementById('games-grid');
    grid.innerHTML = '';

    const active = GAMES.filter(g => currentAgeGroup === 'under16' ? g.under16 : g.over16);

    active.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="game-card-header">
                <h3 class="game-card-title">${game.title}</h3>
                <div class="game-card-icon">${ICONS[game.key] || ICONS.logic}</div>
            </div>
            <p class="game-card-desc">${game.desc}</p>
            <div class="game-card-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                ابدأ التحدي
            </div>
        `;
        card.onclick = () => openGame(game);
        grid.appendChild(card);
    });
}

/* ============================================================
   7. فتح/إغلاق اللعبة
   ============================================================ */
function openGame(game) {
    stopTimer();
    lastGame = game;
    const content = document.getElementById('game-content');
    content.innerHTML = '';

    const launcher = LAUNCHERS[game.key];
    if (launcher) {
        launcher(content, game);
    } else {
        content.innerHTML = `<p style="padding:40px;font-size:20px;font-weight:800;">اللعبة قيد التطوير</p>`;
    }

    document.getElementById('game-modal').classList.remove('hidden');
}

function closeGame() {
    stopTimer();
    document.getElementById('game-modal').classList.add('hidden');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const m = document.getElementById('game-modal');
        if (m && !m.classList.contains('hidden')) closeGame();
    }
});

/* ============================================================
   8. المؤقت
   ============================================================ */
function stopTimer() {
    if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
    }
}

function startTimer(onEnd) {
    stopTimer();
    timeLeft = timeLimit;
    const fill = document.getElementById('timer-fill');
    if (fill) {
        fill.style.width = '100%';
        fill.className = 'timer-fill';
    }

    activeTimer = setInterval(() => {
        timeLeft--;
        const pct = (timeLeft / timeLimit) * 100;
        const f = document.getElementById('timer-fill');
        if (f) {
            f.style.width = pct + '%';
            if (pct <= 25) f.className = 'timer-fill danger';
            else if (pct <= 55) f.className = 'timer-fill warning';
            else f.className = 'timer-fill';
        }
        if (timeLeft <= 0) {
            stopTimer();
            if (typeof onEnd === 'function') onEnd();
        }
    }, 1000);
}

/* ============================================================
   9. Confetti + أصوات
   ============================================================ */
function fireConfetti() {
    const colors = ['#7C3AED', '#EC4899', '#A78BFA', '#F472B6', '#60A5FA', '#F59E0B'];
    for (let i = 0; i < 100; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDelay = (Math.random() * 0.6) + 's';
        p.style.animationDuration = (2.5 + Math.random() * 1.5) + 's';
        if (Math.random() > 0.5) p.style.borderRadius = '50%';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 4500);
    }
    playFireworks();
}

/* ============================================================
   10. شاشة النتائج
   ============================================================ */
function showResult(container, game, score, correct, wrong, time) {
    stopTimer();

    let message = 'حاول مرة أخرى';
    let stars = '⭐';
    let trophy = '🎯';

    if (score >= 90) { message = 'أسطوري! أداء مذهل'; stars = '⭐⭐⭐⭐⭐'; trophy = '🏆'; }
    else if (score >= 75) { message = 'ممتاز! عمل رائع'; stars = '⭐⭐⭐⭐'; trophy = '🥇'; }
    else if (score >= 50) { message = 'جيد جداً! استمر'; stars = '⭐⭐⭐'; trophy = '🥈'; }
    else if (score >= 25) { message = 'جيد، حاول التحسين'; stars = '⭐⭐'; trophy = '🥉'; }

    container.innerHTML = `
        <div class="result-screen">
            <div class="result-trophy">${trophy}</div>
            <div class="result-score-box">
                <span class="result-score">${score}</span>
                <span class="result-score-max">/ 100</span>
            </div>
            <div class="result-stars">${stars}</div>
            <div class="result-message">${message}</div>
            <div class="result-stats">
                <div class="result-stat">
                    <span class="result-stat-value">${correct}</span>
                    <span class="result-stat-label">صحيحة</span>
                </div>
                <div class="result-stat">
                    <span class="result-stat-value">${wrong}</span>
                    <span class="result-stat-label">خاطئة</span>
                </div>
                <div class="result-stat">
                    <span class="result-stat-value">${time}s</span>
                    <span class="result-stat-label">الوقت</span>
                </div>
            </div>
            <div class="result-actions">
                <button class="result-btn primary" onclick="replay()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                    إعادة اللعب
                </button>
                <button class="result-btn secondary" onclick="closeGame()">
                    الرئيسية
                </button>
            </div>
        </div>
    `;

    if (score > 50) setTimeout(fireConfetti, 300);
    recordScore(game.key, score);
}

function replay() {
    if (lastGame) openGame(lastGame);
}

/* ============================================================
   11. دوال مساعدة
   ============================================================ */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pick(arr, n) {
    return shuffle(arr).slice(0, n);
}

/* ============================================================
   12. قالب السؤال (يستخدمه كل الألعاب)
   ============================================================ */
function renderQuestion(container, { num, total, shape, question, options, onAnswer }) {
    container.innerHTML = `
        <div style="width:100%;">
            <p class="question-number">السؤال ${num} من ${total}</p>
            <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
            ${shape ? `<div class="shape-display">${shape}</div>` : ''}
            <p class="question-text">${question}</p>
            <div class="options-grid">
                ${options.map(o => `<button class="option-btn" data-answer="${o}">${o}</button>`).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.option-btn').forEach(btn => {
        btn.onclick = () => onAnswer(btn.dataset.answer, btn);
    });
}


/* ============================================================
   🎯 بنوك الأسئلة الحقيقية — MIND FORGE v3.0
   ============================================================ */

const MF_BANKS = {};

function MF_getBank(gameKey) {
    const bank = MF_BANKS[gameKey];
    if (!bank) return [];
    return currentAgeGroup === 'under16' ? bank.under : bank.over;
}

function MF_shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function MF_pickUnique(bank, count) {
    if (bank.length <= count) return MF_shuffle(bank);
    return MF_shuffle(bank).slice(0, count);
}

console.log('%c📚 MF Banks System v3.0 Loaded', 'color:#7C3AED;font-weight:bold;');


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 1: Stroop — تعارض اللون والكلمة
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (4 ألوان أساسية) ═══ */
(function buildStroopUnder() {
    const COLORS = [
        { name: 'أحمر', hex: '#DC2626' },
        { name: 'أزرق', hex: '#2563EB' },
        { name: 'أخضر', hex: '#16A34A' },
        { name: 'أصفر', hex: '#CA8A04' }
    ];

    const bank = [];
    const used = new Set();

    let attempts = 0;
    while (bank.length < 60 && attempts < 500) {
        attempts++;
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        const colorIdx = Math.floor(Math.random() * COLORS.length);
        const isMatching = Math.random() < 0.2;
        const finalColorIdx = isMatching ? wordIdx : colorIdx;
        const key = `${wordIdx}-${finalColorIdx}`;
        if (used.has(key)) continue;
        used.add(key);
        bank.push({
            word: COLORS[wordIdx].name,
            color: COLORS[finalColorIdx].name,
            colorHex: COLORS[finalColorIdx].hex
        });
    }

    while (bank.length < 60) {
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        const colorIdx = Math.floor(Math.random() * COLORS.length);
        bank.push({
            word: COLORS[wordIdx].name,
            color: COLORS[colorIdx].name,
            colorHex: COLORS[colorIdx].hex
        });
    }

    if (!MF_BANKS.stroop) MF_BANKS.stroop = {};
    MF_BANKS.stroop.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (8 ألوان متقدمة) ═══ */
(function buildStroopOver() {
    const COLORS = [
        { name: 'أحمر', hex: '#DC2626' },
        { name: 'أزرق', hex: '#2563EB' },
        { name: 'أخضر', hex: '#16A34A' },
        { name: 'أصفر', hex: '#CA8A04' },
        { name: 'بنفسجي', hex: '#7C3AED' },
        { name: 'برتقالي', hex: '#EA580C' },
        { name: 'وردي', hex: '#DB2777' },
        { name: 'سماوي', hex: '#0891B2' }
    ];

    const bank = [];
    const used = new Set();

    let attempts = 0;
    while (bank.length < 60 && attempts < 500) {
        attempts++;
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        const colorIdx = Math.floor(Math.random() * COLORS.length);
        const isMatching = Math.random() < 0.1;
        const finalColorIdx = isMatching ? wordIdx : colorIdx;
        const key = `${wordIdx}-${finalColorIdx}`;
        if (used.has(key)) continue;
        used.add(key);
        bank.push({
            word: COLORS[wordIdx].name,
            color: COLORS[finalColorIdx].name,
            colorHex: COLORS[finalColorIdx].hex
        });
    }

    while (bank.length < 60) {
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        const colorIdx = Math.floor(Math.random() * COLORS.length);
        bank.push({
            word: COLORS[wordIdx].name,
            color: COLORS[colorIdx].name,
            colorHex: COLORS[colorIdx].hex
        });
    }

    MF_BANKS.stroop.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.stroop = function(container, game) {
    const bank = MF_getBank('stroop');
    const rounds = MF_pickUnique(bank, 10);
    timeLimit = 5;

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const q = rounds[idx];
        const answer = q.color;

        const allColors = ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'بنفسجي', 'برتقالي', 'وردي', 'سماوي'];
        let opts = [answer];
        while (opts.length < 4) {
            const r = allColors[Math.floor(Math.random() * allColors.length)];
            if (!opts.includes(r)) opts.push(r);
        }
        opts = shuffle(opts);

        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: `<span style="color:${q.colorHex};">${q.word}</span>`,
            question: 'ما هو لون الخط؟',
            options: opts,
            onAnswer: (sel) => submit(sel, answer)
        });

        startTimer(() => { wrong++; idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);

        if (sel === answer) {
            correct++; score += 10;
            playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++;
            playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 2: كشف الاختلافات
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (40 سؤال) ═══ */
(function buildDiffUnder() {
    const bank = [
        { display: '🍎 🍎 🍎 🍊 🍎 🍎', options: ['برتقالة', 'تفاحة', 'موزة', 'عنب'], answer: 'برتقالة' },
        { display: '🍌 🍌 🍇 🍌 🍌', options: ['عنب', 'موز', 'تفاح', 'بطيخ'], answer: 'عنب' },
        { display: '🍇 🍇 🍇 🍓 🍇', options: ['فراولة', 'عنب', 'كرز', 'توت'], answer: 'فراولة' },
        { display: '🍊 🍊 🍋 🍊 🍊', options: ['ليمون', 'برتقال', 'يوسفي', 'جريب'], answer: 'ليمون' },
        { display: '🍓 🍓 🍓 🍒 🍓 🍓', options: ['كرز', 'فراولة', 'توت', 'رمان'], answer: 'كرز' },
        { display: '🍉 🍉 🍈 🍉 🍉', options: ['شمام', 'بطيخ', 'كنتالوب', 'أناناس'], answer: 'شمام' },
        { display: '🍑 🍑 🍑 🍐 🍑', options: ['كمثرى', 'خوخ', 'مشمش', 'دراق'], answer: 'كمثرى' },
        { display: '🥝 🥝 🥥 🥝 🥝', options: ['جوز هند', 'كيوي', 'ليمون', 'أفوكادو'], answer: 'جوز هند' },
        { display: '🐶 🐶 🐱 🐶 🐶', options: ['قطة', 'كلب', 'أرنب', 'فأر'], answer: 'قطة' },
        { display: '🐭 🐭 🐹 🐭 🐭', options: ['هامستر', 'فأر', 'جرذ', 'سنجاب'], answer: 'هامستر' },
        { display: '🐮 🐮 🐷 🐮 🐮', options: ['خنزير', 'بقرة', 'خروف', 'ماعز'], answer: 'خنزير' },
        { display: '🐰 🐰 🐿️ 🐰 🐰', options: ['سنجاب', 'أرنب', 'فأر', 'قنفذ'], answer: 'سنجاب' },
        { display: '🦁 🦁 🐯 🦁 🦁', options: ['نمر', 'أسد', 'فهد', 'يغور'], answer: 'نمر' },
        { display: '🐴 🐴 🦓 🐴 🐴', options: ['حمار وحشي', 'حصان', 'حمار', 'بغل'], answer: 'حمار وحشي' },
        { display: '🐘 🐘 🦏 🐘 🐘', options: ['وحيد قرن', 'فيل', 'فرس نهر', 'زرافة'], answer: 'وحيد قرن' },
        { display: '🔴 🔴 🔵 🔴 🔴', options: ['أزرق', 'أحمر', 'أخضر', 'أصفر'], answer: 'أزرق' },
        { display: '🟢 🟢 🟡 🟢 🟢', options: ['أصفر', 'أخضر', 'أزرق', 'أحمر'], answer: 'أصفر' },
        { display: '🟣 🟣 🟠 🟣 🟣', options: ['برتقالي', 'بنفسجي', 'وردي', 'أزرق'], answer: 'برتقالي' },
        { display: '⚫ ⚫ ⚪ ⚫ ⚫', options: ['أبيض', 'أسود', 'رمادي', 'فضي'], answer: 'أبيض' },
        { display: '🔺 🔺 🔻 🔺 🔺', options: ['مثلث مقلوب', 'مثلث', 'مربع', 'دائرة'], answer: 'مثلث مقلوب' },
        { display: '⬛ ⬛ ⬜ ⬛ ⬛', options: ['مربع أبيض', 'مربع أسود', 'دائرة', 'مثلث'], answer: 'مربع أبيض' },
        { display: '⚽ ⚽ ⚽ 🏀 ⚽', options: ['كرة سلة', 'كرة قدم', 'كرة تنس', 'كرة يد'], answer: 'كرة سلة' },
        { display: '🎾 🎾 🏐 🎾 🎾', options: ['كرة طائرة', 'كرة تنس', 'كرة تنس طاولة', 'ريشة'], answer: 'كرة طائرة' },
        { display: '🏀 🏀 ⚽ 🏀 🏀', options: ['كرة قدم', 'كرة سلة', 'كرة يد', 'كرة ماء'], answer: 'كرة قدم' },
        { display: '🏈 🏈 ⚾ 🏈 🏈', options: ['بيسبول', 'كرة قدم أمريكية', 'رجبي', 'بولينج'], answer: 'بيسبول' },
        { display: '🏓 🏓 🏸 🏓 🏓', options: ['ريشة طائرة', 'تنس طاولة', 'تنس', 'سكواش'], answer: 'ريشة طائرة' },
        { display: '🚗 🚗 🚙 🚗 🚗', options: ['سيارة دفع رباعي', 'سيارة صغيرة', 'شاحنة', 'حافلة'], answer: 'سيارة دفع رباعي' },
        { display: '🚕 🚕 🚙 🚕 🚕', options: ['سيارة دفع رباعي', 'تاكسي', 'سيارة شرطة', 'سيارة إسعاف'], answer: 'سيارة دفع رباعي' },
        { display: '🚌 🚌 🚐 🚌 🚌', options: ['فان', 'حافلة', 'شاحنة', 'قطار'], answer: 'فان' },
        { display: '✈️ ✈️ 🚁 ✈️ ✈️', options: ['مروحية', 'طائرة', 'صاروخ', 'منطاد'], answer: 'مروحية' },
        { display: '🚲 🚲 🛵 🚲 🚲', options: ['دراجة نارية', 'دراجة هوائية', 'سكوتر', 'توك توك'], answer: 'دراجة نارية' },
        { display: '🚂 🚂 🚆 🚂 🚂', options: ['قطار كهربائي', 'قاطرة', 'ترام', 'مترو'], answer: 'قطار كهربائي' },
        { display: '🌟 🌟 ✨ 🌟 🌟', options: ['بريق', 'نجمة', 'قمر', 'شمس'], answer: 'بريق' },
        { display: '🌳 🌳 🌲 🌳 🌳', options: ['شجرة صنوبر', 'شجرة عادية', 'نخلة', 'وردة'], answer: 'شجرة صنوبر' },
        { display: '🌹 🌹 🌷 🌹 🌹', options: ['زنبقة', 'وردة', 'ياسمين', 'قرنفل'], answer: 'زنبقة' },
        { display: '🌊 🌊 🌋 🌊 🌊', options: ['بركان', 'موجة', 'شلال', 'بحر'], answer: 'بركان' },
        { display: '☀️ ☀️ 🌤️ ☀️ ☀️', options: ['شمس مع غيوم', 'شمس', 'قمر', 'غيوم'], answer: 'شمس مع غيوم' },
        { display: '🌙 🌙 ⭐ 🌙 🌙', options: ['نجمة', 'قمر', 'شمس', 'كوكب'], answer: 'نجمة' },
        { display: '📕 📕 📗 📕 📕', options: ['كتاب أخضر', 'كتاب أحمر', 'قلم', 'دفتر'], answer: 'كتاب أخضر' },
        { display: '📘 📘 📙 📘 📘', options: ['كتاب برتقالي', 'كتاب أزرق', 'كتاب أخضر', 'كتاب أصفر'], answer: 'كتاب برتقالي' }
    ];

    MF_BANKS.differences = MF_BANKS.differences || {};
    MF_BANKS.differences.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (40 سؤال) ═══ */
(function buildDiffOver() {
    const bank = [
        { display: '⌘ ⌘ ⌘ ⚙ ⌘ ⌘', options: ['ترس', 'أمر', 'خيار', 'قائمة'], answer: 'ترس' },
        { display: '† † ‡ † †', options: ['رمز مزدوج', 'خنجر', 'نجمة', 'صليب'], answer: 'رمز مزدوج' },
        { display: '§ § ¶ § §', options: ['فقرة', 'قسم', 'دبوس', 'علامة'], answer: 'فقرة' },
        { display: '© © ® © ©', options: ['علامة تجارية', 'حقوق', 'نسخ', 'ملكية'], answer: 'علامة تجارية' },
        { display: '∞ ∞ Ω ∞ ∞', options: ['أوميغا', 'مالانهاية', 'ألفا', 'بيتا'], answer: 'أوميغا' },
        { display: 'ا ا أ ا ا', options: ['ألف بهمزة', 'ألف', 'همزة', 'واو'], answer: 'ألف بهمزة' },
        { display: 'ة ة ه ة ة', options: ['هاء', 'تاء مربوطة', 'تاء', 'نون'], answer: 'هاء' },
        { display: 'ض ض ظ ض ض', options: ['ظاء', 'ضاد', 'صاد', 'طاء'], answer: 'ظاء' },
        { display: 'س س ش س س', options: ['شين', 'سين', 'صاد', 'ضاد'], answer: 'شين' },
        { display: 'ق ق ف ق ق', options: ['فاء', 'قاف', 'واو', 'غين'], answer: 'فاء' },
        { display: 'كتاب كتاب كتاف كتاب كتاب', options: ['كتاف', 'كتاب', 'كتابة', 'كاتب'], answer: 'كتاف' },
        { display: 'مدرسة مدرسة مدرست مدرسة', options: ['مدرست', 'مدرسة', 'مدرس', 'مدرسي'], answer: 'مدرست' },
        { display: 'طالب طالب طلاب طالب', options: ['طلاب', 'طالب', 'طالبة', 'طلب'], answer: 'طلاب' },
        { display: 'عالم عالم علم عالم عالم', options: ['علم', 'عالم', 'عالمي', 'علي'], answer: 'علم' },
        { display: 'شمس شمس شمش شمس شمس', options: ['شمش', 'شمس', 'شموس', 'شمسي'], answer: 'شمش' },
        { display: '٢ ٢ ٢ ٣ ٢ ٢', options: ['3', '2', '4', '1'], answer: '3' },
        { display: '٥ ٥ ٤ ٥ ٥', options: ['4', '5', '6', '3'], answer: '4' },
        { display: '7 7 7 1 7 7', options: ['1', '7', '4', '9'], answer: '1' },
        { display: '8 8 8 3 8 8', options: ['3', '8', '5', '6'], answer: '3' },
        { display: '3 3 8 3 3', options: ['8', '3', '6', '9'], answer: '8' },
        { display: '← ← ↑ ← ←', options: ['أعلى', 'يسار', 'يمين', 'أسفل'], answer: 'أعلى' },
        { display: '→ → ↓ → →', options: ['أسفل', 'يمين', 'يسار', 'أعلى'], answer: 'أسفل' },
        { display: '↖ ↖ ↗ ↖ ↖', options: ['أعلى-يمين', 'أعلى-يسار', 'أسفل-يمين', 'أسفل-يسار'], answer: 'أعلى-يمين' },
        { display: '↙ ↙ ↘ ↙ ↙', options: ['أسفل-يمين', 'أسفل-يسار', 'أعلى-يمين', 'أعلى-يسار'], answer: 'أسفل-يمين' },
        { display: '◆ ◆ ◇ ◆ ◆', options: ['معين فارغ', 'معين', 'مربع', 'مثلث'], answer: 'معين فارغ' },
        { display: '▲ ▲ △ ▲ ▲', options: ['مثلث فارغ', 'مثلث', 'مربع', 'دائرة'], answer: 'مثلث فارغ' },
        { display: '◐ ◐ ◑ ◐ ◐', options: ['نصف دائرة معكوس', 'نصف دائرة', 'دائرة', 'قوس'], answer: 'نصف دائرة معكوس' },
        { display: '◼ ◼ ◻ ◼ ◼', options: ['مربع فارغ', 'مربع', 'مستطيل', 'معين'], answer: 'مربع فارغ' },
        { display: '★ ★ ☆ ★ ★', options: ['نجمة فارغة', 'نجمة', 'برق', 'شمس'], answer: 'نجمة فارغة' },
        { display: '♪ ♪ ♫ ♪ ♪', options: ['نوتة مزدوجة', 'نوتة', 'موسيقى', 'صوت'], answer: 'نوتة مزدوجة' },
        { display: '⚡ ⚡ ⚡ ✨ ⚡', options: ['بريق', 'برق', 'شمس', 'ضياء'], answer: 'بريق' },
        { display: '❤️ ❤️ 💛 ❤️ ❤️', options: ['قلب أصفر', 'قلب أحمر', 'قلب أزرق', 'قلب أخضر'], answer: 'قلب أصفر' },
        { display: '🔥 🔥 💧 🔥 🔥', options: ['قطرة', 'نار', 'ماء', 'بخار'], answer: 'قطرة' },
        { display: '⭐ ⭐ ⭐ 🌟 ⭐', options: ['نجمة مضيئة', 'نجمة', 'قمر', 'شمس'], answer: 'نجمة مضيئة' },
        { display: '♂ ♂ ⚥ ♂ ♂', options: ['رمز مختلط', 'ذكر', 'أنثى', 'توأم'], answer: 'رمز مختلط' },
        { display: '♠ ♠ ♣ ♠ ♠', options: ['لون السباتي', 'لون البستوني', 'لون القلوب', 'لون الديناري'], answer: 'لون السباتي' },
        { display: '♩ ♩ ♬ ♩ ♩', options: ['نوتة مزدوجة', 'نوتة', 'نوتتان', 'أوركسترا'], answer: 'نوتة مزدوجة' },
        { display: '卍 卍 卐 卍 卍', options: ['صليب معقوف', 'صليب', 'نجمة', 'دائرة'], answer: 'صليب معقوف' },
        { display: '☯ ☯ ☮ ☯ ☯', options: ['رمز السلام', 'يين يانغ', 'صليب', 'دائرة'], answer: 'رمز السلام' },
        { display: '◢ ◢ ◣ ◢ ◢', options: ['مثلث أسفل-يسار', 'مثلث أسفل-يمين', 'مثلث أعلى', 'مربع'], answer: 'مثلث أسفل-يسار' }
    ];

    MF_BANKS.differences.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.differences = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 5 : 10;
    const bank = MF_getBank('differences');
    const rounds = MF_pickUnique(bank, 10);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: r.display,
            question: 'اكتشف العنصر الشاذ',
            options: shuffle(r.options),
            onAnswer: (sel) => submit(sel, r.answer)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 10; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};

console.log('%c✅ الجزء 0 + 1 محمّلان بنجاح', 'color:#EC4899;font-weight:bold;font-size:14px;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 3: العد السريع
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك العد السريع — تحت 16 فقط (30 سؤال) ═══
   يُظهر مجموعة من الرموز لفترة قصيرة ثم يخفيها
   ═══ */
(function buildCountingUnder() {
    const bank = [
        // رمز ● — عدد من 5 إلى 20
        { count: 5, shape: '●' },
        { count: 6, shape: '●' },
        { count: 7, shape: '●' },
        { count: 8, shape: '●' },
        { count: 9, shape: '●' },
        { count: 10, shape: '●' },
        { count: 11, shape: '●' },
        { count: 12, shape: '●' },
        { count: 13, shape: '●' },
        { count: 14, shape: '●' },

        // رمز ★
        { count: 5, shape: '★' },
        { count: 7, shape: '★' },
        { count: 9, shape: '★' },
        { count: 11, shape: '★' },
        { count: 13, shape: '★' },
        { count: 15, shape: '★' },

        // رمز ◆
        { count: 6, shape: '◆' },
        { count: 8, shape: '◆' },
        { count: 10, shape: '◆' },
        { count: 12, shape: '◆' },
        { count: 14, shape: '◆' },

        // رمز ▲
        { count: 5, shape: '▲' },
        { count: 7, shape: '▲' },
        { count: 9, shape: '▲' },
        { count: 11, shape: '▲' },
        { count: 16, shape: '▲' },

        // رمز ■
        { count: 6, shape: '■' },
        { count: 8, shape: '■' },
        { count: 10, shape: '■' },
        { count: 15, shape: '■' },
        { count: 20, shape: '■' }
    ];

    MF_BANKS.counting = MF_BANKS.counting || {};
    MF_BANKS.counting.under = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.counting = function(container, game) {
    timeLimit = 5;
    const bank = MF_BANKS.counting.under;
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const items = Array(r.count).fill(r.shape).join(' ');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <p class="question-text">👀 احفظ العدد... سيختفي بعد لحظات</p>
                <div class="shape-display" style="font-size:44px;letter-spacing:8px;line-height:1.6;max-width:600px;">${items}</div>
            </div>
        `;
        setTimeout(() => showQ(r), 3000);
    }

    function showQ(r) {
        const opts = new Set([r.count]);
        while (opts.size < 4) {
            const delta = [-3, -2, -1, 1, 2, 3][Math.floor(Math.random() * 6)];
            const v = r.count + delta;
            if (v > 0) opts.add(v);
        }
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: null,
            question: `كم ${r.shape} رأيت؟`,
            options: shuffle([...opts]),
            onAnswer: (sel) => submit(parseInt(sel), r.count)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (parseInt(b.dataset.answer) === sel) b.classList.add('wrong');
                if (parseInt(b.dataset.answer) === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 4: الذاكرة المكانية
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (25 عملية) ═══
   شبكة 3×3 أو 4×4 — عدد المربعات المضيئة: 3-5
   ═══ */
(function buildSpatialUnder() {
    const bank = [];

    // 12 عملية 3×3
    for (let i = 0; i < 12; i++) {
        const size = 3;
        const total = size * size;
        const lightCount = 3 + Math.floor(Math.random() * 2); // 3-4

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }
        bank.push({ size, targets });
    }

    // 13 عملية 4×4
    for (let i = 0; i < 13; i++) {
        const size = 4;
        const total = size * size;
        const lightCount = 3 + Math.floor(Math.random() * 3); // 3-5

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }
        bank.push({ size, targets });
    }

    MF_BANKS.spatial = MF_BANKS.spatial || {};
    MF_BANKS.spatial.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (25 عملية) ═══
   شبكة 5×5 حتى 8×8 — عدد المربعات المضيئة: 5-10
   ═══ */
(function buildSpatialOver() {
    const bank = [];

    // 7 عملية 5×5
    for (let i = 0; i < 7; i++) {
        const size = 5;
        const total = size * size;
        const lightCount = 5 + Math.floor(Math.random() * 3); // 5-7

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }
        bank.push({ size, targets });
    }

    // 8 عمليات 6×6
    for (let i = 0; i < 8; i++) {
        const size = 6;
        const total = size * size;
        const lightCount = 6 + Math.floor(Math.random() * 3); // 6-8

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }
        bank.push({ size, targets });
    }

    // 5 عمليات 7×7
    for (let i = 0; i < 5; i++) {
        const size = 7;
        const total = size * size;
        const lightCount = 7 + Math.floor(Math.random() * 3); // 7-9

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }
        bank.push({ size, targets });
    }

    // 5 عمليات 8×8
    for (let i = 0; i < 5; i++) {
        const size = 8;
        const total = size * size;
        const lightCount = 8 + Math.floor(Math.random() * 3); // 8-10

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }
        bank.push({ size, targets });
    }

    MF_BANKS.spatial.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.spatial = function(container, game) {
    timeLimit = 10;
    const bank = MF_getBank('spatial');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const size = r.size;
        const total = size * size;
        const cellSize = size <= 4 ? 60 : (size === 6 ? 50 : (size === 5 ? 55 : 40));

        const targets = r.targets;
        const selected = [];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">النمط ${idx + 1} من ${rounds.length}</p>
                <p class="question-text" id="mem-inst">👀 احفظ المربعات المضيئة...</p>
                <div class="memory-grid" id="mem-grid" style="grid-template-columns: repeat(${size}, ${cellSize}px);">
                    ${Array(total).fill(0).map((_, i) => `<div class="memory-cell" data-i="${i}" style="height:${cellSize}px;"></div>`).join('')}
                </div>
            </div>
        `;

        const cells = container.querySelectorAll('.memory-cell');

        setTimeout(() => targets.forEach(i => cells[i].classList.add('highlight')), 400);

        setTimeout(() => {
            targets.forEach(i => cells[i].classList.remove('highlight'));
            document.getElementById('mem-inst').innerText = '🧠 الآن حدد المربعات!';

            cells.forEach(cell => {
                cell.onclick = () => {
                    if (cell.classList.contains('selected')) return;
                    cell.classList.add('selected');
                    selected.push(parseInt(cell.dataset.i));

                    if (selected.length === targets.length) {
                        stopTimer();
                        const isOk = targets.every(v => selected.includes(v)) && selected.every(v => targets.includes(v));
                        if (isOk) { correct++; score += 20; playCorrect(); }
                        else { wrong++; playWrong(); }
                        setTimeout(() => { idx++; render(); }, 800);
                    }
                };
            });

            startTimer(() => { wrong++; playWrong(); idx++; render(); });
        }, 2600);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 5: ذاكرة الألوان
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (25 عملية) ═══
   من 3 إلى 4 ألوان في كل عملية
   ═══ */
(function buildColorsUnder() {
    const PALETTE = [
        { name: 'أحمر', hex: '#DC2626' },
        { name: 'أزرق', hex: '#2563EB' },
        { name: 'أخضر', hex: '#16A34A' },
        { name: 'أصفر', hex: '#CA8A04' }
    ];

    const bank = [];
    for (let i = 0; i < 25; i++) {
        const count = 3 + Math.floor(Math.random() * 2); // 3-4
        const shuffled = MF_shuffle(PALETTE).slice(0, count);
        bank.push({
            sequence: shuffled.map(c => c.name),
            colors: shuffled
        });
    }

    MF_BANKS.colors = MF_BANKS.colors || {};
    MF_BANKS.colors.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (25 عملية) ═══
   من 5 إلى 7 ألوان في كل عملية
   ═══ */
(function buildColorsOver() {
    const PALETTE = [
        { name: 'أحمر', hex: '#DC2626' },
        { name: 'أزرق', hex: '#2563EB' },
        { name: 'أخضر', hex: '#16A34A' },
        { name: 'أصفر', hex: '#CA8A04' },
        { name: 'بنفسجي', hex: '#7C3AED' },
        { name: 'برتقالي', hex: '#EA580C' },
        { name: 'وردي', hex: '#DB2777' },
        { name: 'سماوي', hex: '#0891B2' }
    ];

    const bank = [];
    for (let i = 0; i < 25; i++) {
        const count = 5 + Math.floor(Math.random() * 3); // 5-7
        const shuffled = MF_shuffle(PALETTE).slice(0, count);
        bank.push({
            sequence: shuffled.map(c => c.name),
            colors: shuffled
        });
    }

    MF_BANKS.colors.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */

console.log('%c✅ الجزء 2 محمّل — العد السريع + الذاكرة المكانية + ذاكرة الألوان', 'color:#EC4899;font-weight:bold;font-size:14px;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 6: الألغاز القصصية
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (40 لغز) ═══ */
(function buildStoriesUnder() {
    const bank = [
        { q: 'رجل يمشي تحت المطر بدون مظلة، ولم يبتل شعره! كيف؟', options: ['كان أصلع', 'كان في سيارة', 'المطر توقف', 'كان يرتدي قبعة'], answer: 'كان أصلع' },
        { q: 'ما هو الشيء الذي كلما أخذت منه كبر، وكلما وضعت فيه صغر؟', options: ['الحفرة', 'الصندوق', 'الكيس', 'الجبل'], answer: 'الحفرة' },
        { q: 'شيء له أسنان كثيرة لكنه لا يعض، ما هو؟', options: ['المشط', 'الأسد', 'السكين', 'المقص'], answer: 'المشط' },
        { q: 'يمشي بلا أرجل، ويبكي بلا عيون، ما هو؟', options: ['السحاب', 'الريح', 'النهر', 'الظل'], answer: 'السحاب' },
        { q: 'بيت بلا أبواب ولا نوافذ، ما هو؟', options: ['البيضة', 'الخيمة', 'الكهف', 'الصندوق'], answer: 'البيضة' },
        { q: 'كلما زاد نقص، ما هو؟', options: ['العمر', 'المال', 'الماء', 'الوقت'], answer: 'العمر' },
        { q: 'شيء يسمع بلا أذن، ويتكلم بلا لسان، ما هو؟', options: ['الهاتف', 'الراديو', 'التلفاز', 'الحاسوب'], answer: 'الهاتف' },
        { q: 'له وجه وعقارب لكن ليس له عيون، ما هو؟', options: ['الساعة', 'المرآة', 'الباب', 'الكتاب'], answer: 'الساعة' },
        { q: 'شيء إذا وضعته في الماء لا يبتل، ما هو؟', options: ['الظل', 'الزجاج', 'الحديد', 'الخشب'], answer: 'الظل' },
        { q: 'ما هو الشيء الذي يكتب ولا يقرأ؟', options: ['القلم', 'الكتاب', 'الدفتر', 'الورقة'], answer: 'القلم' },
        { q: 'شيء يرتفع ولا ينزل أبداً، ما هو؟', options: ['العمر', 'الدخان', 'الهواء', 'السعر'], answer: 'العمر' },
        { q: 'ما هو الشيء الذي يسمع بلا أذن، ويرى بلا عين؟', options: ['الرادار', 'الظل', 'الهواء', 'الريح'], answer: 'الرادار' },
        { q: 'شيء يأكل ولا يشبع، ويشرب ولا يرتوي، ما هو؟', options: ['النار', 'الأسد', 'التراب', 'الحجر'], answer: 'النار' },
        { q: 'أخضر في الأرض، أسود في السوق، أحمر في البيت، ما هو؟', options: ['الشاي', 'الفحم', 'الفلفل', 'القهوة'], answer: 'الشاي' },
        { q: 'شيء يلد ولا يولد، ما هو؟', options: ['الديك', 'الشجرة', 'النار', 'البحر'], answer: 'الديك' },
        { q: 'كم بيضة يستطيع رجل أن يأكل على معدة فارغة؟', options: ['واحدة فقط', 'اثنتان', 'ثلاث', 'عشر'], answer: 'واحدة فقط' },
        { q: 'أين توجد البحار التي بلا ماء؟', options: ['على الخريطة', 'في الصحراء', 'في القمر', 'في الجبال'], answer: 'على الخريطة' },
        { q: 'ما هو الشيء الذي ينبض بلا قلب؟', options: ['الساعة', 'الهاتف', 'الباب', 'النافذة'], answer: 'الساعة' },
        { q: 'شيء يراك ولا تراه في الضوء، ما هو؟', options: ['الظل', 'الظلام', 'الهواء', 'الضوء'], answer: 'الظل' },
        { q: 'ما هو الشيء الذي يمتلئ بسرعة ويفرغ بسرعة؟', options: ['البالون', 'الكيس', 'الصندوق', 'الزجاجة'], answer: 'البالون' },
        { q: 'له رأس بلا عيون، ورجل بلا أرجل، ما هو؟', options: ['الدبوس', 'القلم', 'المسمار', 'السكين'], answer: 'الدبوس' },
        { q: 'شيء يخاف من الماء، ما هو؟', options: ['النار', 'الملح', 'السكر', 'التراب'], answer: 'النار' },
        { q: 'له أوراق كثيرة وليس شجرة، ما هو؟', options: ['الكتاب', 'الدفتر', 'الشجرة', 'الورقة'], answer: 'الكتاب' },
        { q: 'شيء يطير بلا أجنحة، ما هو؟', options: ['الوقت', 'الطائرة', 'العصفور', 'الفراشة'], answer: 'الوقت' },
        { q: 'ما هو الشيء الذي يتكلم جميع لغات العالم؟', options: ['الصدى', 'الهاتف', 'الترجمان', 'المذياع'], answer: 'الصدى' },
        { q: 'له عين واحدة ولا يرى، ما هو؟', options: ['الإبرة', 'القط', 'الباب', 'المرآة'], answer: 'الإبرة' },
        { q: 'يُشترى ولا يُؤكل، ما هو؟', options: ['الكتاب', 'الطعام', 'الفاكهة', 'الخبز'], answer: 'الكتاب' },
        { q: 'شيء إذا فقدته صار عمرك أكبر، ما هو؟', options: ['الوقت', 'الشباب', 'المال', 'الصحة'], answer: 'الشباب' },
        { q: 'بحر بلا ماء، ما هو؟', options: ['بحر الشعر', 'البحر الأحمر', 'البحر المتوسط', 'المحيط'], answer: 'بحر الشعر' },
        { q: 'ما هو الشيء الذي يحملك وأنت تحمله؟', options: ['الحذاء', 'القبعة', 'الحزام', 'القميص'], answer: 'الحذاء' },
        { q: 'يأكل الحجر ويشرب الماء، ما هو؟', options: ['القطار', 'السيارة', 'السفينة', 'الطائرة'], answer: 'القطار' },
        { q: 'شيء يزيد ولا ينقص، ما هو؟', options: ['الظل وقت الفجر', 'العمر', 'المال', 'الماء'], answer: 'الظل وقت الفجر' },
        { q: 'له أذنان ولا يسمع، ما هو؟', options: ['الكوب', 'القطة', 'الأرنب', 'الفيل'], answer: 'الكوب' },
        { q: 'شيء ينكسر بلا لمس، ما هو؟', options: ['الوعد', 'الزجاج', 'الخشب', 'الحجر'], answer: 'الوعد' },
        { q: 'يأكل ولا يشبع، ويتكلم ولا يسمع، ما هو؟', options: ['النار', 'الريح', 'المذياع', 'النهر'], answer: 'النار' },
        { q: 'ما هو الشيء الذي يذهب ولا يعود؟', options: ['الوقت', 'القطار', 'الطائرة', 'الريح'], answer: 'الوقت' },
        { q: 'يشرب الماء ولا يبتل، ما هو؟', options: ['الإسفنج', 'الحجر', 'النبات', 'الحديد'], answer: 'الإسفنج' },
        { q: 'له جسم ويختفي عندما تلمسه، ما هو؟', options: ['الظل', 'الضوء', 'الهواء', 'الريح'], answer: 'الظل' },
        { q: 'يأكل ويشرب وهو مقلوب، ما هو؟', options: ['الخيط في الإبرة', 'القلم', 'الكتاب', 'الملعقة'], answer: 'الخيط في الإبرة' },
        { q: 'له فم ولا يتكلم، له بطن ولا يأكل، ما هو؟', options: ['القربة', 'الصندوق', 'الكيس', 'الجرة'], answer: 'القربة' }
    ];

    MF_BANKS.stories = MF_BANKS.stories || {};
    MF_BANKS.stories.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (60 لغز) ═══ */
(function buildStoriesOver() {
    const bank = [
        // ألغاز منطقية
        { q: 'غرفة مغلقة من الداخل، وجد فيها شخص مقتول، لا أثر لدخول أو خروج. كيف؟', options: ['انتحار', 'قتل من فتحة سرية', 'قتل نفسه بحيلة', 'لا يمكن'], answer: 'انتحار' },
        { q: 'رجل يشرب ماء من كوب مسموم، لم يمت. لماذا؟', options: ['السم في الثلج', 'لم يشرب كل الكوب', 'السم مغشوش', 'كان محصناً'], answer: 'السم في الثلج' },
        { q: 'ساعتان على الحائط: الأولى متأخرة 5 دقائق، الثانية متقدمة 5 دقائق. الفرق بينهما؟', options: ['10 دقائق', '5 دقائق', 'لا فرق', 'ساعة'], answer: '10 دقائق' },
        { q: 'شخص ولد في 1990، وعمره الآن 35 سنة. كيف؟', options: ['هو في 2025', 'خطأ حسابي', 'مسافر زمنياً', 'لا يمكن'], answer: 'هو في 2025' },
        { q: '5 صناديق، في كل واحد 5 قطط، كل قطة عندها 5 قطط صغيرة. مجموع الأرجل؟', options: ['620', '500', '600', '650'], answer: '620' },

        // ألغاز استنتاجية
        { q: 'ثلاثة أشخاص: أحمد أكبر من سامي، سامي أكبر من كريم. من الأكبر؟', options: ['أحمد', 'سامي', 'كريم', 'متساوون'], answer: 'أحمد' },
        { q: 'إذا كان 5 عمال ينجزون العمل في 5 أيام، فكم يحتاج 1 عامل؟', options: ['25 يوماً', '5 أيام', '10 أيام', '20 يوماً'], answer: '25 يوماً' },
        { q: 'قطار يسير بسرعة 100 كم/س. كم يقطع في 45 دقيقة؟', options: ['75 كم', '100 كم', '50 كم', '45 كم'], answer: '75 كم' },
        { q: 'إذا كانت فاطمة أخت أمي، فما صلة فاطمة بي؟', options: ['خالتي', 'عمتي', 'جدتي', 'ابنة خالتي'], answer: 'خالتي' },
        { q: 'رجل عمره 4 أضعاف عمر ابنه. بعد 10 سنوات سيصبح 2 أضعاف. كم عمر الرجل؟', options: ['20', '30', '40', '50'], answer: '20' },

        // مفارقات
        { q: 'شخص يقول: "أنا أكذب دائماً". هل هو صادق أم كاذب؟', options: ['مفارقة منطقية', 'صادق', 'كاذب', 'لا معنى'], answer: 'مفارقة منطقية' },
        { q: 'إذا قال شخص: "كل ما أقوله كذب"، وكان صادقاً، فهذا يعني…', options: ['مفارقة', 'حقيقة', 'كذب', 'لا شيء'], answer: 'مفارقة' },
        { q: 'حلاق يحلق لكل من لا يحلق لنفسه فقط. من يحلق للحلاق؟', options: ['مفارقة', 'غيره', 'لا أحد', 'هو نفسه'], answer: 'مفارقة' },
        { q: 'برنامج يقرر: إذا توقف، يفعل شيئاً، وإذا لم يتوقف، لا يفعل. هذه…', options: ['مفارقة', 'برمجة عادية', 'خطأ', 'حل'], answer: 'مفارقة' },

        // ألغاز أرقام
        { q: 'أرقام: 2, 6, 12, 20, 30, [ ؟ ]', options: ['42', '40', '36', '44'], answer: '42' },
        { q: 'أكمل: 1, 4, 9, 16, 25, [ ؟ ]', options: ['36', '30', '49', '42'], answer: '36' },
        { q: 'أكمل: 1, 1, 2, 3, 5, 8, [ ؟ ]', options: ['13', '11', '10', '12'], answer: '13' },
        { q: 'إذا كانت 3 + 4 = 21، و 5 + 6 = 55، فما 7 + 8 = ؟', options: ['105', '56', '91', '120'], answer: '105' },
        { q: 'ثلاثة أرقام متتالية مجموعها 33. ما هو الأكبر؟', options: ['12', '11', '13', '10'], answer: '12' },
        { q: 'كم مرة يمكن طرح 5 من 25؟', options: ['مرة واحدة', '5 مرات', '4 مرات', 'مرات لا نهائية'], answer: 'مرة واحدة' },

        // ألغاز فيزيائية
        { q: 'لماذا نشعر بدوران الأرض؟', options: ['لا نشعر بها', 'بسبب الجاذبية', 'بسبب الهواء', 'بسبب القمر'], answer: 'لا نشعر بها' },
        { q: 'كيلو حديد أم كيلو قطن أثقل؟', options: ['متساويان', 'الحديد', 'القطن', 'يعتمد'], answer: 'متساويان' },
        { q: 'لو سقطت عملة من برج 100 متر، أيهما يصل أولاً: العملة أم الريشة؟', options: ['العملة', 'الريشة', 'معاً', 'يعتمد على الجاذبية'], answer: 'العملة' },
        { q: 'إذا كان الجليد يطفو على الماء، فهذا يعني…', options: ['الجليد أخف كثافة', 'الجليد أثقل', 'الماء أخف', 'لا معنى'], answer: 'الجليد أخف كثافة' },
        { q: 'لماذا لا تسقط الطائرة رغم ثقلها؟', options: ['قوة الرفع من الأجنحة', 'الجاذبية صفر', 'المحرك قوي', 'الهواء يحملها'], answer: 'قوة الرفع من الأجنحة' },

        // ألغاز كيميائية
        { q: 'إذا وضعت ملحاً في ماء، هل يزيد الوزن؟', options: ['نعم', 'لا', 'يعتمد', 'يقل'], answer: 'نعم' },
        { q: 'الماء يغلي عند 100 درجة مئوية على مستوى البحر. وعلى قمة إيفرست؟', options: ['أقل من 100', 'أكثر من 100', '100 بالضبط', 'لا يغلي'], answer: 'أقل من 100' },
        { q: 'لماذا يصدأ الحديد؟', options: ['تفاعل مع الأكسجين', 'تفاعل مع الماء', 'تفاعل مع الهواء', 'بسبب الحرارة'], answer: 'تفاعل مع الأكسجين' },
        { q: 'إذا أضفت سكراً لماء ساخن ثم بردته، ما يحدث؟', options: ['يتبلور', 'يختفي', 'يزيد حلاوة', 'يطفو'], answer: 'يتبلور' },

        // ألغاز نفسية ومنطقية
        { q: 'غرفة فيها 3 مفاتيح، وفيها غرفة أخرى فيها 3 مصابيح. كيف تعرف كل مفتاح لأي مصباح بزيارة واحدة؟', options: ['أشعل الأول، انتظر، أطفئه وأشعل الثاني', 'أشعل الكل', 'أشعل واحداً فقط', 'لا يمكن'], answer: 'أشعل الأول، انتظر، أطفئه وأشعل الثاني' },
        { q: 'أب وابنه في حادث، الأب يموت، الابن يحتاج عملية، الجراح يقول: "لا أستطيع، هذا ابني". كيف؟', options: ['الجراح أمه', 'الجراح عمه', 'الجراح أخوه', 'خطأ'], answer: 'الجراح أمه' },
        { q: 'رجل يسكن الطابق 10، يخرج كل يوم بالمصعد للطابق 1، وعند العودة يأخذ المصعد للطابق 7 ثم يكمل درجاً. لماذا؟', options: ['قصير القامة', 'رياضي', 'خائف', 'المصعد معطل'], answer: 'قصير القامة' },
        { q: 'غرفة باردة، شمعة وموقد ومصباح. أيها تشعل أولاً؟', options: ['عود الثقاب', 'الشمعة', 'الموقد', 'المصباح'], answer: 'عود الثقاب' },
        { q: 'في سباق، تجاوزت المتسابق الثاني. ما ترتيبك الآن؟', options: ['الثاني', 'الأول', 'الثالث', 'لا يمكن'], answer: 'الثاني' },

        // ألغاز لغوية
        { q: 'ما الكلمة التي إذا حذفت أول حرف منها صار معناها مختلفاً تماماً؟', options: ['كتاب / تاب', 'قلم / لم', 'بيت / يت', 'جميعها'], answer: 'جميعها' },
        { q: 'كلمة تقرأ من الاتجاهين بنفس المعنى، ما هي؟', options: ['ليل', 'باب', 'خوخ', 'جميعها'], answer: 'جميعها' },
        { q: 'ما الكلمة التي تبدأ بحرف الـ"م" وتنتهي بحرف الـ"م" وفيها ياء؟', options: ['مريم', 'مقلم', 'محمد', 'مأتم'], answer: 'مريم' },
        { q: 'ما جمع كلمة "ماء"؟', options: ['مياه', 'أمواه', 'ماءات', 'جميعها'], answer: 'جميعها' },
        { q: 'ما هي الكلمة التي تتغير قراءتها بتغيير التشكيل؟', options: ['عَلِم / عِلْم / عَلَم', 'كتاب', 'قلم', 'بيت'], answer: 'عَلِم / عِلْم / عَلَم' },

        // ألغاز رياضية
        { q: 'إذا كان 1 + 4 = 5، و 2 + 5 = 12، و 3 + 6 = 21، فما 8 + 11 = ؟', options: ['96', '40', '19', '88'], answer: '96' },
        { q: 'قطاران على نفس المسار يتجهان لبعضهما. الأول 60 كم/س، الثاني 40 كم/س. المسافة 200 كم. متى يتقابلان؟', options: ['بعد ساعتين', 'بعد 3 ساعات', 'بعد 4 ساعات', 'بعد ساعة'], answer: 'بعد ساعتين' },
        { q: 'كم مثلثاً في نجمة داود؟', options: ['8', '6', '4', '12'], answer: '8' },
        { q: 'مكعب، إذا قسمته لنصفين ثم نصفين ثم نصفين، كم مكعب صغير تحصل؟', options: ['8', '6', '4', '16'], answer: '8' },
        { q: 'إذا كان ثمن قلم 5 ريال، ودفتر 10 ريال، وكتاب 15 ريال، فما ثمن 3 كتب و2 أقلام؟', options: ['55', '50', '60', '45'], answer: '55' },

        // ألغاز عامة صعبة
        { q: 'إذا كانت الأرض كروية، لماذا لا نشعر بها؟', options: ['لأنها كبيرة جداً والجاذبية موحدة', 'لأنها مسطحة', 'لأننا نتحرك معها', 'لا نعرف'], answer: 'لأنها كبيرة جداً والجاذبية موحدة' },
        { q: 'لماذا يظهر القمر بأحجام مختلفة؟', options: ['بسبب بعده', 'بسبب دورانه', 'بسبب الغلاف الجوي', 'بسبب حجمه'], answer: 'بسبب بعده' },
        { q: 'ما الفرق بين الوزن والكتلة؟', options: ['الوزن قوة والكتلة مقدار', 'نفس الشيء', 'الوزن بالكيلو', 'لا فرق'], answer: 'الوزن قوة والكتلة مقدار' },
        { q: 'لماذا ينام الناس؟', options: ['لإعادة بناء الجسم والدماغ', 'لأنهم متعبون', 'عادة', 'لا سبب'], answer: 'لإعادة بناء الجسم والدماغ' },
        { q: 'لماذا ينسى الناس؟', options: ['لأن الذاكرة انتقائية', 'لأن الدماغ ضعيف', 'بسبب العمر', 'لا نعرف'], answer: 'لأن الذاكرة انتقائية' },

        // ألغاز فلسفية
        { q: 'إذا تغيرت كل ذرات جسمك، هل تبقى أنت نفسك؟', options: ['نعم، الهوية مستمرة', 'لا', 'ممكن', 'لا معنى'], answer: 'نعم، الهوية مستمرة' },
        { q: 'هل يمكن أن يكون هناك لون لا نراه؟', options: ['نعم، الأشعة فوق البنفسجية', 'لا', 'ممكن', 'لا معنى'], answer: 'نعم، الأشعة فوق البنفسجية' },
        { q: 'هل الحقيقة مطلقة أم نسبية؟', options: ['يعتمد على السياق', 'مطلقة', 'نسبية تماماً', 'لا معنى'], answer: 'يعتمد على السياق' },
        { q: 'هل يمكن أن يفكر الحاسوب مثل الإنسان؟', options: ['ممكن في المستقبل', 'لا', 'نعم', 'مستحيل'], answer: 'ممكن في المستقبل' },

        // ألغاز ذكية
        { q: 'ثلاثة صناديق: ذهب، فضة، مختلط. كل ملصق خطأ. من أي صندوق تبدأ؟', options: ['من المختلط', 'من الذهب', 'من الفضة', 'لا يمكن'], answer: 'من المختلط' },
        { q: 'رجل يوزع الماء على البيوت، كل بيت يعطيه لتراً واحداً. رجع بـ 6 لترات، وفي يده لتر واحد. كم بيت؟', options: ['5 بيوت', '6 بيوت', '4 بيوت', '7 بيوت'], answer: '5 بيوت' },
        { q: 'لغز الثمانية 8: كيف تحصل على 1000 باستخدام 8 ثمانيات؟', options: ['888 + 88 + 8 + 8 + 8', 'لا يمكن', '888 + 88 + 8', 'جميعها'], answer: '888 + 88 + 8 + 8 + 8' },
        { q: 'هل يمكن أن تكون نقطة في الفراغ؟', options: ['لا، النقطة موضع', 'نعم', 'ممكن', 'لا معنى'], answer: 'لا، النقطة موضع' },
        { q: 'كيف تقيس 4 لترات بمكيال 3 لتر ومكيال 5 لتر؟', options: ['املأ الخمسة ثم أفرغ منها الثلاثة', 'لا يمكن', 'ملء الثلاثة', 'مستحيل'], answer: 'املأ الخمسة ثم أفرغ منها الثلاثة' },
        { q: 'شيء إذا أخذته منك زاد، وإذا أعطيته نقص، ما هو؟', options: ['العلم', 'المال', 'الماء', 'الطعام'], answer: 'العلم' }
    ];

    MF_BANKS.stories.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.stories = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 15 : 20;
    const bank = MF_getBank('stories');
    const rounds = MF_pickUnique(bank, currentAgeGroup === 'under16' ? 5 : 10);
    const points = Math.floor(100 / rounds.length);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: null,
            question: r.q,
            options: shuffle(r.options),
            onAnswer: (sel) => submit(sel, r.answer)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += points; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 900);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 7: الذاكرة العكسية
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (25 عملية)
   4-6 أرقام
   ═══ */
(function buildReverseUnder() {
    const bank = [];
    for (let i = 0; i < 25; i++) {
        const len = 4 + Math.floor(Math.random() * 3); // 4-6
        const nums = [];
        while (nums.length < len) {
            nums.push(String(1 + Math.floor(Math.random() * 9)));
        }
        bank.push({ nums, reverse: [...nums].reverse() });
    }
    MF_BANKS.reverse = MF_BANKS.reverse || {};
    MF_BANKS.reverse.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (60 عملية)
   7-10 أرقام
   ═══ */
(function buildReverseOver() {
    const bank = [];
    for (let i = 0; i < 60; i++) {
        const len = 7 + Math.floor(Math.random() * 4); // 7-10
        const nums = [];
        while (nums.length < len) {
            nums.push(String(1 + Math.floor(Math.random() * 9)));
        }
        bank.push({ nums, reverse: [...nums].reverse() });
    }
    MF_BANKS.reverse.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 8: الرياضيات السريعة
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (35 سؤال) ═══ */
(function buildMathUnder() {
    const bank = [
        // ضرب
        { q: '3 × 4 = ؟', answer: 12 },
        { q: '5 × 6 = ؟', answer: 30 },
        { q: '7 × 8 = ؟', answer: 56 },
        { q: '6 × 9 = ؟', answer: 54 },
        { q: '4 × 8 = ؟', answer: 32 },
        { q: '7 × 7 = ؟', answer: 49 },
        { q: '9 × 9 = ؟', answer: 81 },
        { q: '6 × 6 = ؟', answer: 36 },
        { q: '8 × 8 = ؟', answer: 64 },
        { q: '5 × 9 = ؟', answer: 45 },
        { q: '4 × 7 = ؟', answer: 28 },
        { q: '3 × 9 = ؟', answer: 27 },
        { q: '8 × 9 = ؟', answer: 72 },
        { q: '6 × 7 = ؟', answer: 42 },
        { q: '5 × 8 = ؟', answer: 40 },
        { q: '20 × 4 = ؟', answer: 80 },
        { q: '30 × 3 = ؟', answer: 90 },
        { q: '12 × 5 = ؟', answer: 60 },
        { q: '15 × 4 = ؟', answer: 60 },
        { q: '11 × 6 = ؟', answer: 66 },

        // قسمة
        { q: '20 ÷ 4 = ؟', answer: 5 },
        { q: '36 ÷ 6 = ؟', answer: 6 },
        { q: '42 ÷ 7 = ؟', answer: 6 },
        { q: '56 ÷ 8 = ؟', answer: 7 },
        { q: '63 ÷ 9 = ؟', answer: 7 },
        { q: '72 ÷ 8 = ؟', answer: 9 },
        { q: '48 ÷ 6 = ؟', answer: 8 },
        { q: '81 ÷ 9 = ؟', answer: 9 },
        { q: '24 ÷ 3 = ؟', answer: 8 },
        { q: '35 ÷ 5 = ؟', answer: 7 },
        { q: '40 ÷ 8 = ؟', answer: 5 },
        { q: '54 ÷ 9 = ؟', answer: 6 },
        { q: '30 ÷ 6 = ؟', answer: 5 },
        { q: '45 ÷ 5 = ؟', answer: 9 },
        { q: '28 ÷ 4 = ؟', answer: 7 }
    ];

    MF_BANKS.math = MF_BANKS.math || {};
    MF_BANKS.math.under = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.math = function(container, game) {
    timeLimit = 10;
    const bank = MF_BANKS.math.under;
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const opts = new Set([r.answer]);
        while (opts.size < 4) {
            const delta = [-3, -2, -1, 1, 2, 3][Math.floor(Math.random() * 6)];
            const v = r.answer + delta;
            if (v > 0) opts.add(v);
        }
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: r.q,
            question: 'احسب الناتج',
            options: shuffle([...opts].map(String)),
            onAnswer: (sel) => submit(parseInt(sel), r.answer)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (parseInt(b.dataset.answer) === sel) b.classList.add('wrong');
                if (parseInt(b.dataset.answer) === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};

console.log('%c✅ الجزء 3 محمّل — الألغاز + الذاكرة العكسية + الرياضيات', 'color:#EC4899;font-weight:bold;font-size:14px;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 9: المنطق المجرد
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (25 سؤال) ═══ */
(function buildLogicUnder() {
    const bank = [
        { q: "كل القطط حيوانات. ميمي قطة. إذن ميمي…", options: ["حيوان", "طائر", "سمكة", "نبات"], answer: "حيوان" },
        { q: "كل الأزهار تحتاج ماء. الوردة زهرة. إذن الوردة…", options: ["تحتاج ماء", "لا تحتاج ماء", "ذابلة", "بلا لون"], answer: "تحتاج ماء" },
        { q: "أحمد أطول من سامي، وسامي أطول من كريم. إذن أحمد…", options: ["أطول من كريم", "أقصر من كريم", "نفس طول كريم", "لا نعرف"], answer: "أطول من كريم" },
        { q: "كل الأسماك تسبح. الحوت يسبح. هل الحوت سمكة؟", options: ["لا", "نعم", "ربما", "لا نعرف"], answer: "لا" },
        { q: "كل الطيور لها أجنحة. البطريق طائر. إذن البطريق…", options: ["له أجنحة", "يطير", "لا يطير", "ثديي"], answer: "له أجنحة" },
        { q: "الأخوان دائماً متشابهان؟", options: ["لا، ليس دائماً", "نعم دائماً", "فقط التوأم", "لا أعرف"], answer: "لا، ليس دائماً" },
        { q: "كل المعلمين قرأوا كتباً. سعيد لم يقرأ كتباً. إذن سعيد…", options: ["ليس معلماً", "معلم", "طالب", "لا نعرف"], answer: "ليس معلماً" },
        { q: "الأرقام الزوجية تقبل القسمة على 2. 7 فردي. إذن 7…", options: ["لا يقبل القسمة على 2", "يقبل", "زوجي", "صفر"], answer: "لا يقبل القسمة على 2" },
        { q: "كل السيارات لها عجلات. الدراجة لها عجلات. هل الدراجة سيارة؟", options: ["لا", "نعم", "ربما", "لا نعرف"], answer: "لا" },
        { q: "كل الأشجار لها جذور. النخلة شجرة. إذن النخلة…", options: ["لها جذور", "لا جذور", "زهرة", "عشبة"], answer: "لها جذور" },
        { q: "إذا كانت الشمس مشرقة فالنهار. الآن نهار. إذن…", options: ["الشمس مشرقة قطعاً", "لا نعرف", "الليل قادم", "لا شيء"], answer: "الشمس مشرقة قطعاً" },
        { q: "كل الأصدقاء يزورون بعضهم. أحمد صديق. إذن أحمد…", options: ["يزور أصدقاءه", "لا يزور", "وحيد", "لا نعرف"], answer: "يزور أصدقاءه" },
        { q: "الحيوانات الأليفة تعيش في البيوت. القطة حيوان أليف. إذن القطة…", options: ["تعيش في البيت", "تعيش في الغابة", "بريّة", "لا نعرف"], answer: "تعيش في البيت" },
        { q: "كل الحلويات تحتوي سكراً. الشوكولاتة حلوى. إذن الشوكولاتة…", options: ["تحتوي سكراً", "بدون سكر", "مالحة", "لا نعرف"], answer: "تحتوي سكراً" },
        { q: "إذا كانت أمي أكبر من خالتي، وخالتي أكبر من عمتي، من الأصغر؟", options: ["عمتي", "أمي", "خالتي", "متساوون"], answer: "عمتي" },
        { q: "الرياضيون أصحاء. علي رياضي. إذن علي…", options: ["صحيح", "مريض", "ضعيف", "لا نعرف"], answer: "صحيح" },
        { q: "كل من درسوا نجحوا. سامي لم ينجح. إذن سامي…", options: ["لم يدرس", "درس", "مهمل", "لا نعرف"], answer: "لم يدرس" },
        { q: "الماء يغلي على النار. الحليب سائل. هل الحليب يغلي؟", options: ["نعم، إذا سُخّن", "لا", "ربما", "لا نعرف"], answer: "نعم، إذا سُخّن" },
        { q: "5 أكبر من 3، و3 أكبر من 1. أيّهم الأصغر؟", options: ["1", "3", "5", "متساوون"], answer: "1" },
        { q: "كل الأطباء درسوا الطب. مريم طبيبة. إذن مريم…", options: ["درست الطب", "لم تدرس", "ممرضة", "لا نعرف"], answer: "درست الطب" },
        { q: "الأغنياء لديهم مال. فقير لا يملك مالاً. إذن هو…", options: ["ليس غنياً", "غني", "متوسط", "لا نعرف"], answer: "ليس غنياً" },
        { q: "كل الطلاب في الصف يلبسون زياً موحداً. خالد طالب. إذن خالد…", options: ["يلبس الزي الموحد", "لا يلبس", "يلبس شيئاً آخر", "لا نعرف"], answer: "يلبس الزي الموحد" },
        { q: "الطائرات تطير. الصاروخ ليس طائرة. هل الصاروخ يطير؟", options: ["نعم، لكن ليس كطائرة", "لا", "ربما", "لا نعرف"], answer: "نعم، لكن ليس كطائرة" },
        { q: "كل الرجال بشر. المرأة ليست رجلاً. إذن المرأة…", options: ["بشر", "ليست بشراً", "حيوان", "لا نعرف"], answer: "بشر" },
        { q: "الحصان حيوان، والحيوان كائن حي. إذن الحصان…", options: ["كائن حي", "غير حي", "نبات", "جماد"], answer: "كائن حي" }
    ];

    MF_BANKS.logic = MF_BANKS.logic || {};
    MF_BANKS.logic.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (40 سؤال) ═══ */
(function buildLogicOver() {
    const bank = [
        { q: "كل الفلاسفة عقلاء. بعض العقلاء أغنياء. إذن…", options: ["لا يمكن الجزم", "كل الفلاسفة أغنياء", "لا فلاسفة أغنياء", "كل الأغنياء فلاسفة"], answer: "لا يمكن الجزم" },
        { q: "أليس تقول 'أنا أكذب دائماً'. هذا…", options: ["مفارقة منطقية", "صحيحة", "كاذبة", "لا معنى لها"], answer: "مفارقة منطقية" },
        { q: "إذا كانت A > B، و B > C، فإن…", options: ["A > C", "C > A", "A = C", "لا نعرف"], answer: "A > C" },
        { q: "كل المربعات مستطيلات. ليس كل مستطيل مربع. إذن…", options: ["صحيح", "خطأ", "لا نعرف", "العكس صحيح"], answer: "صحيح" },
        { q: "5 أشخاص تصافحوا جميعاً. كم مصافحة؟", options: ["10", "5", "15", "20"], answer: "10" },
        { q: "أب عمره ضعف ابنه. بعد 10 سنوات سيصبح 1.5 مرة. كم عمره الآن؟", options: ["40", "30", "50", "20"], answer: "40" },
        { q: "قطار بسرعة 60 كم/س. كم يقطع في 30 دقيقة؟", options: ["30 كم", "60 كم", "20 كم", "40 كم"], answer: "30 كم" },
        { q: "5 عمال ينجزون العمل في 10 أيام. 10 عمال كم يحتاجون؟", options: ["5 أيام", "10 أيام", "20 يوماً", "15 يوماً"], answer: "5 أيام" },
        { q: "إذا كان 'صحيح' تعني 'خطأ'، فإن 'كل شي صحيح' تعني…", options: ["كل شي خطأ", "كل شي صحيح", "لا معنى", "لا نعرف"], answer: "كل شي خطأ" },
        { q: "ساعة تتأخر 5 دقائق كل ساعة. بعد 12 ساعة، كم تأخرت؟", options: ["60 دقيقة", "30 دقيقة", "45 دقيقة", "50 دقيقة"], answer: "60 دقيقة" },
        { q: "كل الحدود صحيحة. لا يمكن أن يكون هناك حد صحيح وكاذب في نفس الوقت. هذا مبدأ…", options: ["عدم التناقض", "السببية", "الهوية", "الثالث المرفوع"], answer: "عدم التناقض" },
        { q: "شيء إما صحيح أو كاذب، لا ثالث بينهما. هذا مبدأ…", options: ["الثالث المرفوع", "الهوية", "عدم التناقض", "السببية"], answer: "الثالث المرفوع" },
        { q: "كل A هو B. كل B هو C. إذن…", options: ["كل A هو C", "كل C هو A", "لا علاقة", "بعض A هو C"], answer: "كل A هو C" },
        { q: "لا A هو B. بعض C هو A. إذن…", options: ["بعض C ليس B", "كل C هو B", "لا علاقة", "كل B هو C"], answer: "بعض C ليس B" },
        { q: "كل الأعداد الأولية > 1. 1 ليس عدداً أولياً. إذن 1…", options: ["ليس عدداً أولياً", "أولي", "زوجي", "صفر"], answer: "ليس عدداً أولياً" },
        { q: "نصف الكوب ممتلئ = نصف الكوب فارغ. هذا…", options: ["صحيح", "خطأ", "مفارقة", "لغز"], answer: "صحيح" },
        { q: "شخص يبيع شيئاً بـ 100 ريال ربح 25%. كم اشتراه؟", options: ["80", "75", "70", "85"], answer: "80" },
        { q: "لو قطعت 1 كم شرقاً، ثم 1 كم شمالاً، ثم 1 كم غرباً، ثم 1 كم جنوباً. أين أنت؟", options: ["نفس المكان", "شرقاً", "شمالاً", "غرباً"], answer: "نفس المكان" },
        { q: "أي الجمل الآتية صحيحة؟", options: ["هذه الجملة كاذبة", "1+1=2", "السماء خضراء", "لا شيء"], answer: "1+1=2" },
        { q: "3 ضيوف وصلوا لبيت. الأم أعدت 4 كعكات. كل ضيف أكل كعكة، والأم أكلت كعكة. كم بقيت؟", options: ["صفر", "1", "2", "3"], answer: "صفر" },
        { q: "إذا كان اليوم الاثنين، فبعد 100 يوم، أي يوم؟", options: ["الأربعاء", "الخميس", "الثلاثاء", "الجمعة"], answer: "الأربعاء" },
        { q: "شيء لا يمكن أن يكون صحيحاً وكاذباً في نفس الوقت. هذا…", options: ["قانون منطقي", "خرافة", "رأي", "نظرية"], answer: "قانون منطقي" },
        { q: "إذا كان 2x + 3 = 11، فما قيمة x؟", options: ["4", "5", "3", "6"], answer: "4" },
        { q: "مربع طول ضلعه 5، مساحته؟", options: ["25", "20", "10", "30"], answer: "25" },
        { q: "دائرة نصف قطرها 7، محيطها (π ≈ 22/7)؟", options: ["44", "22", "14", "49"], answer: "44" },
        { q: "كل المخلوقات تموت. الإنسان مخلوق. إذن…", options: ["الإنسان يموت", "الإنسان لا يموت", "الإنسان خالد", "لا نعرف"], answer: "الإنسان يموت" },
        { q: "لا يمكن للشيء أن يكون في مكانين في نفس الوقت. هذا…", options: ["بديهية", "نظرية", "ظن", "رأي"], answer: "بديهية" },
        { q: "إذا كان كل A هو B، ولم يكن أي B هو C، فإن…", options: ["لا A هو C", "بعض A هو C", "كل C هو A", "لا علاقة"], answer: "لا A هو C" },
        { q: "أي هذه الجمل صحيحة؟", options: ["الجملة التي بعدها كاذبة", "كل الجمل التالية كاذبة", "الجملة السابقة صحيحة", "لا شيء"], answer: "لا شيء" },
        { q: "شخص يقول: 'كل ما أقوله كذب'. هذا…", options: ["مفارقة", "صحيح", "كاذب", "لا معنى"], answer: "مفارقة" },
        { q: "أكبر من كل الأعداد = ؟", options: ["لا وجود له", "مليون", "مليار", "لانهاية"], answer: "لا وجود له" },
        { q: "مجموع الأعداد من 1 إلى 10؟", options: ["55", "50", "60", "45"], answer: "55" },
        { q: "إذا كان 3/4 من عدد = 12، فما العدد؟", options: ["16", "15", "18", "20"], answer: "16" },
        { q: "5% من 200 = ؟", options: ["10", "5", "20", "15"], answer: "10" },
        { q: "لو كان لديك 10 تفاحات، أخذت 3، أعطيت صديقك 2، ووضعت 1 في السلة. كم بقي؟", options: ["4", "5", "3", "6"], answer: "4" },
        { q: "قطعة قماش طولها 10 متر، قطعت متراً كل دقيقة. بعد كم دقيقة ستقطعها كلها؟", options: ["9", "10", "11", "5"], answer: "9" },
        { q: "أي شيء إذا أخذت منه زاد؟", options: ["الحفرة", "المال", "الماء", "الطعام"], answer: "الحفرة" },
        { q: "رجلان يمشيان، إذا أكل أحدهما الآخر، ما مصير الثاني؟", options: ["مستحيل منطقياً", "مات", "نجا", "لا معنى"], answer: "مستحيل منطقياً" },
        { q: "كل الأعداد الزوجية تقبل القسمة على 2. 4 زوجي. إذن 4…", options: ["يقبل القسمة على 2", "لا يقبل", "فردي", "صفر"], answer: "يقبل القسمة على 2" },
        { q: "إذا كانت النتيجة صحيحة، فالمقدمات…", options: ["قد تكون خاطئة", "صحيحة قطعاً", "لا علاقة", "كاذبة"], answer: "قد تكون خاطئة" }
    ];

    MF_BANKS.logic.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.logic = function(container, game) {
    timeLimit = 15;
    const bank = MF_getBank('logic');
    const rounds = MF_pickUnique(bank, currentAgeGroup === 'under16' ? 5 : 10);
    const points = Math.floor(100 / rounds.length);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: null,
            question: r.q,
            options: shuffle(r.options),
            onAnswer: (sel) => submit(sel, r.answer)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += points; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 900);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 10: التسلسل الزمني
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (25 سؤال) ═══ */
(function buildTimelineUnder() {
    const bank = [
        { q: "رتب الأحداث اليومية:", items: ["استيقظت", "تناولت الفطور", "ذهبت للعمل", "نمت"], answer: ["استيقظت", "تناولت الفطور", "ذهبت للعمل", "نمت"] },
        { q: "رتب مراحل نمو النبات:", items: ["بذرة", "برعم", "نبتة", "زهرة"], answer: ["بذرة", "برعم", "نبتة", "زهرة"] },
        { q: "رتب مراحل حياة الفراشة:", items: ["بيضة", "يرقة", "شرنقة", "فراشة"], answer: ["بيضة", "يرقة", "شرنقة", "فراشة"] },
        { q: "رتب أوقات اليوم:", items: ["الفجر", "الظهر", "العصر", "الليل"], answer: ["الفجر", "الظهر", "العصر", "الليل"] },
        { q: "رتب الفصول:", items: ["الربيع", "الصيف", "الخريف", "الشتاء"], answer: ["الربيع", "الصيف", "الخريف", "الشتاء"] },
        { q: "رتب أيام الأسبوع:", items: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء"], answer: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء"] },
        { q: "رتب عملية الطبخ:", items: ["تحضير المكونات", "الطبخ", "التقديم", "الأكل"], answer: ["تحضير المكونات", "الطبخ", "التقديم", "الأكل"] },
        { q: "رتب مراحل بناء البيت:", items: ["الأساس", "الجدران", "السقف", "التشطيب"], answer: ["الأساس", "الجدران", "السقف", "التشطيب"] },
        { q: "رتب رحلة الطائرة:", items: ["الحجز", "الوصول للمطار", "الصعود", "الإقلاع"], answer: ["الحجز", "الوصول للمطار", "الصعود", "الإقلاع"] },
        { q: "رتب ترتيب الأرقام:", items: ["واحد", "اثنان", "ثلاثة", "أربعة"], answer: ["واحد", "اثنان", "ثلاثة", "أربعة"] },
        { q: "رتب مراحل حياة الإنسان:", items: ["طفل", "شاب", "كهل", "شيخ"], answer: ["طفل", "شاب", "كهل", "شيخ"] },
        { q: "رتب مراحل نمو الضفدع:", items: ["بيضة", "شرغوف", "ضفدع صغير", "ضفدع"], answer: ["بيضة", "شرغوف", "ضفدع صغير", "ضفدع"] },
        { q: "رتب ترتيب صلاة اليوم:", items: ["الفجر", "الظهر", "العصر", "المغرب"], answer: ["الفجر", "الظهر", "العصر", "المغرب"] },
        { q: "رتب مراحل تنظيف الأسنان:", items: ["وضع المعجون", "الفرشاة", "المضمضة", "التنشيف"], answer: ["وضع المعجون", "الفرشاة", "المضمضة", "التنشيف"] },
        { q: "رتب رحلة السيارة:", items: ["فتح الباب", "الجلوس", "تشغيل المحرك", "الانطلاق"], answer: ["فتح الباب", "الجلوس", "تشغيل المحرك", "الانطلاق"] },
        { q: "رتب مراحل كتابة قصة:", items: ["الفكرة", "التخطيط", "الكتابة", "المراجعة"], answer: ["الفكرة", "التخطيط", "الكتابة", "المراجعة"] },
        { q: "رتب ترتيب الأشهر:", items: ["يناير", "فبراير", "مارس", "أبريل"], answer: ["يناير", "فبراير", "مارس", "أبريل"] },
        { q: "رتب مراحل زراعة الزهرة:", items: ["حفر الحفرة", "وضع البذرة", "الري", "النمو"], answer: ["حفر الحفرة", "وضع البذرة", "الري", "النمو"] },
        { q: "رتب مراحل بناء الجسر:", items: ["التصميم", "الأعمدة", "الهيكل", "السطح"], answer: ["التصميم", "الأعمدة", "الهيكل", "السطح"] },
        { q: "رتب مراحل تحضير الشاي:", items: ["غلي الماء", "وضع الشاي", "الصب", "الشرب"], answer: ["غلي الماء", "وضع الشاي", "الصب", "الشرب"] },
        { q: "رتب مراحل تعلم القراءة:", items: ["الحروف", "الكلمات", "الجمل", "الفقرات"], answer: ["الحروف", "الكلمات", "الجمل", "الفقرات"] },
        { q: "رتب مراحل رحلة الحج:", items: ["الإحرام", "الطواف", "السعي", "عرفة"], answer: ["الإحرام", "الطواف", "السعي", "عرفة"] },
        { q: "رتب مراحل بناء السفينة:", items: ["الهيكل", "الألواح", "الصاري", "الشراع"], answer: ["الهيكل", "الألواح", "الصاري", "الشراع"] },
        { q: "رتب مراحل يوم المدرسة:", items: ["الذهاب", "الحصص", "الاستراحة", "العودة"], answer: ["الذهاب", "الحصص", "الاستراحة", "العودة"] },
        { q: "رتب مراحل حياة النجمة:", items: ["سحابة غاز", "نجم", "عملاق أحمر", "قزم أبيض"], answer: ["سحابة غاز", "نجم", "عملاق أحمر", "قزم أبيض"] }
    ];

    MF_BANKS.timeline = MF_BANKS.timeline || {};
    MF_BANKS.timeline.under = bank;
})();

/* ═══ تشغيل اللعبة ═══ */


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 11: تعرف الأنماط البصرية
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (25 سؤال) ═══ */
(function buildPatternsUnder() {
    const bank = [
        { q: "🔺 🔵 🔺 🔵 🔺 [ ؟ ]", options: ["🔵", "🔺", "⬛", "⭐"], answer: "🔵" },
        { q: "⭐ ⭐ 🌙 ⭐ ⭐ 🌙 ⭐ [ ؟ ]", options: ["⭐", "🌙", "☀️", "●"], answer: "⭐" },
        { q: "🔴 🟡 🔴 🟡 🔴 [ ؟ ]", options: ["🟡", "🔴", "🟢", "⚫"], answer: "🟡" },
        { q: "▲ ■ ● ▲ ■ ● ▲ ■ [ ؟ ]", options: ["●", "▲", "■", "◆"], answer: "●" },
        { q: "1 2 3 1 2 3 1 [ ؟ ]", options: ["2", "1", "3", "4"], answer: "2" },
        { q: "🌟 🌟 🌟 🌙 🌟 🌟 🌟 [ ؟ ]", options: ["🌙", "🌟", "☀️", "⭐"], answer: "🌙" },
        { q: "أ ب ت أ ب ت أ [ ؟ ]", options: ["ب", "أ", "ت", "ث"], answer: "ب" },
        { q: "🔺 🔻 🔺 🔻 🔺 [ ؟ ]", options: ["🔻", "🔺", "◀", "▶"], answer: "🔻" },
        { q: "🔵 🔵 🟢 🔵 🔵 🟢 🔵 🔵 [ ؟ ]", options: ["🟢", "🔵", "🟡", "🔴"], answer: "🟢" },
        { q: "◼ ◼ ◻ ◼ ◼ ◻ ◼ ◼ [ ؟ ]", options: ["◻", "◼", "⚫", "⚪"], answer: "◻" },
        { q: "❤️ 💙 ❤️ 💙 ❤️ [ ؟ ]", options: ["💙", "❤️", "💚", "💛"], answer: "💙" },
        { q: "🍎 🍌 🍎 🍌 🍎 [ ؟ ]", options: ["🍌", "🍎", "🍇", "🍊"], answer: "🍌" },
        { q: "🐶 🐱 🐶 🐱 🐶 [ ؟ ]", options: ["🐱", "🐶", "🐭", "🐰"], answer: "🐱" },
        { q: "♦ ♣ ♦ ♣ ♦ [ ؟ ]", options: ["♣", "♦", "♥", "♠"], answer: "♣" },
        { q: "1 2 1 2 1 2 1 [ ؟ ]", options: ["2", "1", "3", "0"], answer: "2" },
        { q: "أ ب أ ب أ ب أ [ ؟ ]", options: ["ب", "أ", "ت", "ث"], answer: "ب" },
        { q: "☀️ 🌙 ☀️ 🌙 ☀️ [ ؟ ]", options: ["🌙", "☀️", "⭐", "🌟"], answer: "🌙" },
        { q: "🔺 🔺 🔻 🔺 🔺 🔻 🔺 🔺 [ ؟ ]", options: ["🔻", "🔺", "◀", "▶"], answer: "🔻" },
        { q: "🟥 🟦 🟥 🟦 🟥 [ ؟ ]", options: ["🟦", "🟥", "🟩", "🟨"], answer: "🟦" },
        { q: "5 10 5 10 5 [ ؟ ]", options: ["10", "5", "15", "20"], answer: "10" },
        { q: "◯ △ ◯ △ ◯ [ ؟ ]", options: ["△", "◯", "□", "◇"], answer: "△" },
        { q: "🌹 🌷 🌹 🌷 🌹 [ ؟ ]", options: ["🌷", "🌹", "🌻", "🌼"], answer: "🌷" },
        { q: "🎈 🎁 🎈 🎁 🎈 [ ؟ ]", options: ["🎁", "🎈", "🎂", "🎉"], answer: "🎁" },
        { q: "A B A B A [ ؟ ]", options: ["B", "A", "C", "D"], answer: "B" },
        { q: "🔴 🔴 🟡 🔴 🔴 🟡 🔴 🔴 [ ؟ ]", options: ["🟡", "🔴", "🟢", "🔵"], answer: "🟡" }
    ];

    MF_BANKS.patterns = MF_BANKS.patterns || {};
    MF_BANKS.patterns.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (55 سؤال) ═══ */
(function buildPatternsOver() {
    const bank = [
        // متتاليات عددية
        { q: "2 4 8 16 32 [ ؟ ]", options: ["64", "48", "60", "72"], answer: "64" },
        { q: "1 1 2 3 5 8 13 [ ؟ ]", options: ["21", "20", "24", "18"], answer: "21" },
        { q: "1 4 9 16 25 [ ؟ ]", options: ["36", "30", "32", "40"], answer: "36" },
        { q: "3 6 12 24 48 [ ؟ ]", options: ["96", "72", "84", "60"], answer: "96" },
        { q: "2 3 5 7 11 13 [ ؟ ]", options: ["17", "15", "19", "16"], answer: "17" },
        { q: "1 8 27 64 [ ؟ ]", options: ["125", "100", "144", "121"], answer: "125" },
        { q: "1 2 6 24 120 [ ؟ ]", options: ["720", "600", "480", "360"], answer: "720" },
        { q: "0 1 1 2 3 5 8 [ ؟ ]", options: ["13", "11", "12", "14"], answer: "13" },
        { q: "5 10 20 40 80 [ ؟ ]", options: ["160", "120", "140", "100"], answer: "160" },
        { q: "2 5 10 17 26 [ ؟ ]", options: ["37", "35", "39", "40"], answer: "37" },
        { q: "1 3 6 10 15 21 [ ؟ ]", options: ["28", "26", "30", "24"], answer: "28" },
        { q: "1 2 4 7 11 16 [ ؟ ]", options: ["22", "20", "24", "18"], answer: "22" },
        { q: "3 9 27 81 [ ؟ ]", options: ["243", "216", "243", "189"], answer: "243" },
        { q: "2 6 12 20 30 [ ؟ ]", options: ["42", "40", "36", "44"], answer: "42" },
        { q: "100 50 25 12.5 [ ؟ ]", options: ["6.25", "5", "7.5", "8"], answer: "6.25" },
        { q: "4 8 16 32 64 [ ؟ ]", options: ["128", "96", "112", "144"], answer: "128" },
        { q: "1 5 13 29 61 [ ؟ ]", options: ["125", "120", "128", "130"], answer: "125" },
        { q: "2 7 17 37 77 [ ؟ ]", options: ["157", "150", "160", "155"], answer: "157" },
        { q: "3 5 9 17 33 [ ؟ ]", options: ["65", "60", "70", "55"], answer: "65" },
        { q: "1 4 10 22 46 [ ؟ ]", options: ["94", "90", "92", "96"], answer: "94" },

        // متتاليات معقدة
        { q: "1 2 4 8 16 [ ؟ ]", options: ["32", "24", "28", "36"], answer: "32" },
        { q: "1 2 6 42 [ ؟ ]", options: ["1806", "1000", "1200", "2400"], answer: "1806" },
        { q: "1 3 7 15 31 [ ؟ ]", options: ["63", "60", "62", "65"], answer: "63" },
        { q: "2 4 12 48 [ ؟ ]", options: ["240", "200", "180", "300"], answer: "240" },
        { q: "1 9 36 100 [ ؟ ]", options: ["225", "200", "180", "256"], answer: "225" },
        { q: "5 6 9 14 21 [ ؟ ]", options: ["30", "28", "26", "32"], answer: "30" },
        { q: "1 2 10 20 100 [ ؟ ]", options: ["200", "150", "500", "300"], answer: "200" },
        { q: "2 3 5 8 13 [ ؟ ]", options: ["21", "18", "19", "22"], answer: "21" },
        { q: "7 14 28 56 [ ؟ ]", options: ["112", "98", "120", "84"], answer: "112" },
        { q: "1000 100 10 [ ؟ ]", options: ["1", "0.1", "0.5", "10"], answer: "1" },

        // أنماط هندسية
        { q: "🔺 🔺 🔺 🔻 🔻 🔺 🔺 🔺 [ ؟ ]", options: ["🔻", "🔺", "◀", "▶"], answer: "🔻" },
        { q: "◯ ◯ △ △ ◯ ◯ △ △ ◯ ◯ [ ؟ ]", options: ["△", "◯", "□", "◇"], answer: "△" },
        { q: "1 4 9 16 [ ؟ ]", options: ["25", "20", "22", "24"], answer: "25" },
        { q: "8 27 64 125 [ ؟ ]", options: ["216", "200", "243", "196"], answer: "216" },
        { q: "2 8 18 32 [ ؟ ]", options: ["50", "48", "42", "52"], answer: "50" },

        // أنماط مركبة
        { q: "5 8 14 23 35 [ ؟ ]", options: ["50", "48", "46", "52"], answer: "50" },
        { q: "1 2 3 5 7 11 [ ؟ ]", options: ["13", "12", "15", "14"], answer: "13" },
        { q: "2 4 3 6 5 10 [ ؟ ]", options: ["9", "8", "7", "11"], answer: "9" },
        { q: "1 2 6 7 21 22 [ ؟ ]", options: ["66", "60", "63", "69"], answer: "66" },
        { q: "3 3 6 9 15 24 [ ؟ ]", options: ["39", "36", "42", "45"], answer: "39" },
        { q: "7 8 6 9 5 10 [ ؟ ]", options: ["4", "3", "5", "6"], answer: "4" },
        { q: "10 20 15 30 25 50 [ ؟ ]", options: ["45", "40", "48", "50"], answer: "45" },
        { q: "1 3 5 7 9 [ ؟ ]", options: ["11", "10", "13", "12"], answer: "11" },
        { q: "2 5 11 23 47 [ ؟ ]", options: ["95", "93", "94", "96"], answer: "95" },
        { q: "3 6 4 8 6 12 [ ؟ ]", options: ["10", "9", "11", "14"], answer: "10" },
        { q: "8 6 7 5 6 4 [ ؟ ]", options: ["5", "4", "6", "3"], answer: "5" },
        { q: "1 2 4 5 10 11 [ ؟ ]", options: ["22", "20", "21", "24"], answer: "22" },
        { q: "5 10 9 18 17 34 [ ؟ ]", options: ["33", "35", "30", "32"], answer: "33" },
        { q: "2 3 6 7 14 15 [ ؟ ]", options: ["30", "28", "32", "29"], answer: "30" },
        { q: "4 8 12 16 20 [ ؟ ]", options: ["24", "22", "26", "28"], answer: "24" },
        { q: "1 4 16 64 [ ؟ ]", options: ["256", "128", "192", "320"], answer: "256" },
        { q: "2 12 36 80 [ ؟ ]", options: ["150", "140", "144", "160"], answer: "150" },
        { q: "6 11 21 41 [ ؟ ]", options: ["81", "80", "82", "78"], answer: "81" },
        { q: "2 5 10 17 26 [ ؟ ]", options: ["37", "36", "38", "35"], answer: "37" }
    ];

    MF_BANKS.patterns.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.patterns = function(container, game) {
    timeLimit = 15;
    const bank = MF_getBank('patterns');
    const rounds = MF_pickUnique(bank, currentAgeGroup === 'under16' ? 5 : 10);
    const points = Math.floor(100 / rounds.length);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: r.q,
            question: 'أكمل السلسلة',
            options: shuffle(r.options),
            onAnswer: (sel) => submit(sel, r.answer)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += points; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

console.log('%c✅ الجزء 4 محمّل — المنطق + التسلسل + الأنماط', 'color:#EC4899;font-weight:bold;font-size:14px;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 12: الرمزان المتشابهان
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (30 سؤال)
   حروف لاتينية متشابهة بصرياً
   ═══ */
(function buildTwinsUnder() {
    const bank = [
        // متطابقة
        { s1: 'A', s2: 'A', isSame: true },
        { s1: 'B', s2: 'B', isSame: true },
        { s1: 'C', s2: 'C', isSame: true },
        { s1: 'D', s2: 'D', isSame: true },
        { s1: 'E', s2: 'E', isSame: true },
        { s1: 'F', s2: 'F', isSame: true },
        { s1: 'G', s2: 'G', isSame: true },
        { s1: 'H', s2: 'H', isSame: true },
        { s1: 'K', s2: 'K', isSame: true },
        { s1: 'M', s2: 'M', isSame: true },
        { s1: 'N', s2: 'N', isSame: true },
        { s1: 'O', s2: 'O', isSame: true },
        { s1: 'P', s2: 'P', isSame: true },
        { s1: 'R', s2: 'R', isSame: true },
        { s1: 'T', s2: 'T', isSame: true },

        // مختلفة
        { s1: 'A', s2: 'B', isSame: false },
        { s1: 'C', s2: 'D', isSame: false },
        { s1: 'E', s2: 'F', isSame: false },
        { s1: 'G', s2: 'H', isSame: false },
        { s1: 'K', s2: 'M', isSame: false },
        { s1: 'N', s2: 'O', isSame: false },
        { s1: 'P', s2: 'R', isSame: false },
        { s1: 'T', s2: 'A', isSame: false },
        { s1: 'B', s2: 'C', isSame: false },
        { s1: 'D', s2: 'E', isSame: false },
        { s1: 'F', s2: 'G', isSame: false },
        { s1: 'H', s2: 'K', isSame: false },
        { s1: 'M', s2: 'N', isSame: false },
        { s1: 'O', s2: 'P', isSame: false },
        { s1: 'R', s2: 'T', isSame: false }
    ];

    MF_BANKS.twins = MF_BANKS.twins || {};
    MF_BANKS.twins.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (30 سؤال)
   حروف متشابهة بصرياً (شكل متطابق لكن مختلف)
   ═══ */
(function buildTwinsOver() {
    const bank = [
        // متطابقة (صعبة بصرياً)
        { s1: 'O', s2: 'O', isSame: true },
        { s1: 'I', s2: 'I', isSame: true },
        { s1: 'l', s2: 'l', isSame: true },
        { s1: 'M', s2: 'M', isSame: true },
        { s1: 'W', s2: 'W', isSame: true },
        { s1: 'V', s2: 'V', isSame: true },
        { s1: 'X', s2: 'X', isSame: true },
        { s1: 'Z', s2: 'Z', isSame: true },
        { s1: 'C', s2: 'C', isSame: true },
        { s1: 'S', s2: 'S', isSame: true },
        { s1: 'A', s2: 'A', isSame: true },
        { s1: 'B', s2: 'B', isSame: true },
        { s1: 'D', s2: 'D', isSame: true },
        { s1: 'E', s2: 'E', isSame: true },
        { s1: 'F', s2: 'F', isSame: true },

        // مختلفة بصرياً (متشابهة جداً)
        { s1: 'O', s2: 'Q', isSame: false },  // O و Q
        { s1: 'I', s2: 'l', isSame: false },  // I و l
        { s1: 'M', s2: 'W', isSame: false },  // M و W (منقلب)
        { s1: 'b', s2: 'd', isSame: false },  // b و d
        { s1: 'p', s2: 'q', isSame: false },  // p و q
        { s1: 'n', s2: 'u', isSame: false },  // n و u (منقلب)
        { s1: 'V', s2: 'Λ', isSame: false },  // V و Λ
        { s1: 'C', s2: 'G', isSame: false },
        { s1: 'E', s2: 'F', isSame: false },
        { s1: 'D', s2: 'B', isSame: false },
        { s1: 'A', s2: 'V', isSame: false },
        { s1: 'S', s2: 'Z', isSame: false },
        { s1: 'T', s2: 'Γ', isSame: false },
        { s1: 'X', s2: 'χ', isSame: false },
        { s1: 'Z', s2: '2', isSame: false }
    ];

    MF_BANKS.twins.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.twins = function(container, game) {
    timeLimit = 5;
    const bank = MF_getBank('twins');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">هل الرمزان متطابقان؟</p>
                <div class="shape-display" style="font-size:100px;letter-spacing:60px;padding:30px 80px;font-family:'Space Grotesk',monospace;">${r.s1}${r.s2}</div>
                <div class="options-grid">
                    <button class="option-btn" data-answer="same">✓ متطابقان</button>
                    <button class="option-btn" data-answer="diff">✗ مختلفان</button>
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.answer);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel) {
        stopTimer();
        const r = rounds[idx];
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        const answer = r.isSame ? 'same' : 'diff';
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 600);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 13: الرمز الغريب
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (30 سؤال) ═══ */
(function buildOddUnder() {
    const bank = [];
    const configs = [
        // شبكات بسيطة 3×3
        { size: 3, base: '●', odd: '◆' },
        { size: 3, base: '■', odd: '□' },
        { size: 3, base: '★', odd: '☆' },
        { size: 3, base: '▲', odd: '△' },
        { size: 3, base: '○', odd: '◯' },
        { size: 3, base: '❤', odd: '♡' },

        // شبكات 4×4
        { size: 4, base: '●', odd: '○' },
        { size: 4, base: '◆', odd: '◇' },
        { size: 4, base: '■', odd: '▪' },
        { size: 4, base: '★', odd: '✦' },

        // شبكات 5×5
        { size: 5, base: '●', odd: '◉' },
        { size: 5, base: '◆', odd: '♦' },
        { size: 5, base: '■', odd: '▫' },
        { size: 5, base: '★', odd: '✩' }
    ];

    for (let i = 0; i < 30; i++) {
        const cfg = configs[i % configs.length];
        const total = cfg.size * cfg.size;
        bank.push({
            size: cfg.size,
            total: total,
            oddIndex: Math.floor(Math.random() * total),
            base: cfg.base,
            odd: cfg.odd
        });
    }

    MF_BANKS.odd = MF_BANKS.odd || {};
    MF_BANKS.odd.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (30 سؤال)
   رموز متشابهة جداً
   ═══ */
(function buildOddOver() {
    const bank = [];
    const configs = [
        // رموز متشابهة (فرق بسيط جداً)
        { size: 5, base: 'l', odd: 'I' },       // L صغيرة و I كبيرة
        { size: 5, base: 'O', odd: 'Q' },       // O و Q
        { size: 5, base: 'b', odd: 'd' },       // b و d
        { size: 5, base: 'p', odd: 'q' },       // p و q
        { size: 5, base: 'n', odd: 'u' },       // n و u
        { size: 5, base: 'v', odd: 'y' },       // v و y
        { size: 6, base: '◆', odd: '◇' },
        { size: 6, base: '●', odd: '◉' },
        { size: 6, base: '○', odd: '◯' },
        { size: 6, base: '■', odd: '□' },
        { size: 7, base: '★', odd: '☆' },
        { size: 7, base: '▲', odd: '△' },
        { size: 7, base: 'M', odd: 'W' },
        { size: 7, base: 'E', odd: 'F' }
    ];

    for (let i = 0; i < 30; i++) {
        const cfg = configs[i % configs.length];
        const total = cfg.size * cfg.size;
        bank.push({
            size: cfg.size,
            total: total,
            oddIndex: Math.floor(Math.random() * total),
            base: cfg.base,
            odd: cfg.odd
        });
    }

    MF_BANKS.odd.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.odd = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 8 : 5;
    const bank = MF_getBank('odd');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const cellSize = r.size <= 4 ? 55 : (r.size <= 6 ? 48 : 42);

        let cells = '';
        for (let i = 0; i < r.total; i++) {
            const c = i === r.oddIndex ? r.odd : r.base;
            cells += `<div class="memory-cell" data-i="${i}" style="height:${cellSize}px;width:${cellSize}px;display:flex;align-items:center;justify-content:center;font-size:${cellSize * 0.55}px;font-weight:900;">${c}</div>`;
        }

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">🔍 ابحث عن الرمز الشاذ</p>
                <div class="memory-grid" style="grid-template-columns: repeat(${r.size}, ${cellSize}px);">${cells}</div>
            </div>
        `;

        const cs = container.querySelectorAll('.memory-cell');
        cs.forEach(c => {
            c.onclick = () => submit(parseInt(c.dataset.i), r.oddIndex);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const cs = container.querySelectorAll('.memory-cell');
        cs.forEach(c => c.style.pointerEvents = 'none');
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            cs[sel].style.background = '#10B981';
            cs[sel].style.color = '#fff';
        } else {
            wrong++; playWrong();
            cs[sel].style.background = '#DC2626';
            cs[sel].style.color = '#fff';
            cs[answer].style.background = '#10B981';
            cs[answer].style.color = '#fff';
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 14: الرمز المختفي
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (30 سؤال)
   5 رموز تظهر، ثم يُسأل عن الغائب
   ═══ */
(function buildMissingUnder() {
    const ALL = ['★', '●', '◆', '▲', '■', '♥', '✦', '✱', '⬟', '⬢', '◈', '☾'];
    const bank = [];

    for (let i = 0; i < 30; i++) {
        const shown = MF_shuffle(ALL).slice(0, 5);
        const absentPool = ALL.filter(s => !shown.includes(s));
        const absent = absentPool[Math.floor(Math.random() * absentPool.length)];
        const wrongs = MF_shuffle(shown).slice(0, 3);
        bank.push({
            shown: MF_shuffle(shown),
            absent,
            options: MF_shuffle([absent, ...wrongs])
        });
    }

    MF_BANKS.missing = MF_BANKS.missing || {};
    MF_BANKS.missing.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (30 سؤال)
   7 رموز تظهر
   ═══ */
(function buildMissingOver() {
    const ALL = ['★', '●', '◆', '▲', '■', '♥', '✦', '✱', '⬟', '⬢', '◈', '☾', '☀', '♦', '♣', '♠'];
    const bank = [];

    for (let i = 0; i < 30; i++) {
        const shown = MF_shuffle(ALL).slice(0, 7);
        const absentPool = ALL.filter(s => !shown.includes(s));
        const absent = absentPool[Math.floor(Math.random() * absentPool.length)];
        const wrongs = MF_shuffle(shown).slice(0, 3);
        bank.push({
            shown: MF_shuffle(shown),
            absent,
            options: MF_shuffle([absent, ...wrongs])
        });
    }

    MF_BANKS.missing.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.missing = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 10 : 5;
    const bank = MF_getBank('missing');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <p class="question-text">👀 احفظ الرموز...</p>
                <div class="shape-display" style="font-size:52px;letter-spacing:16px;direction:ltr;">${r.shown.join(' ')}</div>
            </div>
        `;
        setTimeout(() => showQ(r), 2500);
    }

    function showQ(r) {
        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: null,
            question: 'أي رمز لم يظهر في المجموعة؟',
            options: r.options,
            onAnswer: (sel) => submit(sel, r.absent)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

console.log('%c✅ الجزء 5 محمّل — الرمزان + الغريب + المختفي', 'color:#EC4899;font-weight:bold;font-size:14px;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 15: التطابق ضد الوقت
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (20 سؤال)
   3 خيارات + إجابة صحيحة
   ═══ */
(function buildMatchUnder() {
    const bank = [
        { target: '★', options: ['★', '☆', '✦'] },
        { target: '●', options: ['●', '○', '◉'] },
        { target: '◆', options: ['◆', '◇', '♦'] },
        { target: '▲', options: ['▲', '△', '▽'] },
        { target: '■', options: ['■', '□', '▪'] },
        { target: '♥', options: ['♥', '♡', '❤'] },
        { target: '✦', options: ['✦', '✧', '✩'] },
        { target: '✱', options: ['✱', '✲', '✳'] },
        { target: '⬟', options: ['⬟', '⬠', '⬡'] },
        { target: '⬢', options: ['⬢', '⬣', '⬡'] },
        { target: '◈', options: ['◈', '◇', '◊'] },
        { target: '☾', options: ['☾', '☽', '☀'] },
        { target: '♦', options: ['♦', '♠', '♣'] },
        { target: '♠', options: ['♠', '♣', '♥'] },
        { target: '♣', options: ['♣', '♠', '♦'] },
        { target: 'A', options: ['A', 'B', 'C'] },
        { target: 'B', options: ['B', 'D', 'A'] },
        { target: 'C', options: ['C', 'G', 'O'] },
        { target: 'X', options: ['X', 'Y', 'Z'] },
        { target: 'M', options: ['M', 'N', 'W'] }
    ];

    MF_BANKS.match = MF_BANKS.match || {};
    MF_BANKS.match.under = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.match = function(container, game) {
    timeLimit = 5;
    const bank = MF_BANKS.match.under;
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">اختر الرمز المطابق</p>
                <div class="shape-display" style="font-size:100px;padding:30px 80px;">${r.target}</div>
                <div class="options-grid" style="grid-template-columns:repeat(3,1fr);max-width:600px;">
                    ${shuffle(r.options).map(o => `<button class="option-btn" data-answer="${o}" style="font-size:52px;padding:24px;">${o}</button>`).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.answer, r.target);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 16: الأشكال المتداخلة
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (30 سؤال)
   2-3 أشكال
   ═══ */
(function buildOverlapUnder() {
    const SHAPES = ['circle', 'triangle', 'square', 'diamond'];
    const bank = [];

    for (let i = 0; i < 30; i++) {
        const count = 2 + Math.floor(Math.random() * 2); // 2-3
        const shapes = [];
        for (let j = 0; j < count; j++) {
            shapes.push(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
        }
        const opts = new Set([count]);
        while (opts.size < 4) opts.add(1 + Math.floor(Math.random() * 5));

        bank.push({
            shapes,
            count,
            options: MF_shuffle([...opts])
        });
    }

    MF_BANKS.overlap = MF_BANKS.overlap || {};
    MF_BANKS.overlap.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (30 سؤال)
   3-5 أشكال
   ═══ */
(function buildOverlapOver() {
    const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'pentagon', 'hexagon'];
    const bank = [];

    for (let i = 0; i < 30; i++) {
        const count = 3 + Math.floor(Math.random() * 3); // 3-5
        const shapes = [];
        for (let j = 0; j < count; j++) {
            shapes.push(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
        }
        const opts = new Set([count]);
        while (opts.size < 4) opts.add(2 + Math.floor(Math.random() * 6));

        bank.push({
            shapes,
            count,
            options: MF_shuffle([...opts])
        });
    }

    MF_BANKS.overlap.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.overlap = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 10 : 5;
    const bank = MF_getBank('overlap');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const SZ = 280;
        const colors = ['#7C3AED', '#EC4899', '#A78BFA', '#F472B6', '#60A5FA', '#F59E0B'];

        const svg = r.shapes.map((sh, i) => {
            const cx = SZ / 2 + (i - (r.shapes.length - 1) / 2) * 35;
            const cy = SZ / 2 + (i % 2 === 0 ? -15 : 15);
            const size = 70 - i * 6;
            const color = colors[i % colors.length];

            if (sh === 'circle') {
                return `<circle cx="${cx}" cy="${cy}" r="${size}" stroke="${color}" stroke-width="4" fill="none"/>`;
            } else if (sh === 'triangle') {
                const h = size * 1.7;
                return `<polygon points="${cx},${cy - h / 2} ${cx - size},${cy + h / 2} ${cx + size},${cy + h / 2}" stroke="${color}" stroke-width="4" fill="none"/>`;
            } else if (sh === 'square') {
                return `<rect x="${cx - size}" y="${cy - size}" width="${size * 2}" height="${size * 2}" stroke="${color}" stroke-width="4" fill="none"/>`;
            } else if (sh === 'diamond') {
                return `<polygon points="${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}" stroke="${color}" stroke-width="4" fill="none"/>`;
            } else if (sh === 'pentagon') {
                const points = [];
                for (let k = 0; k < 5; k++) {
                    const angle = (Math.PI * 2 * k) / 5 - Math.PI / 2;
                    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
                }
                return `<polygon points="${points.join(' ')}" stroke="${color}" stroke-width="4" fill="none"/>`;
            } else if (sh === 'hexagon') {
                const points = [];
                for (let k = 0; k < 6; k++) {
                    const angle = (Math.PI * 2 * k) / 6 - Math.PI / 2;
                    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
                }
                return `<polygon points="${points.join(' ')}" stroke="${color}" stroke-width="4" fill="none"/>`;
            }
        }).join('');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">كم شكل ترى؟</p>
                <div style="display:flex;justify-content:center;margin:20px 0;">
                    <svg width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}">${svg}</svg>
                </div>
                <div class="options-grid">
                    ${r.options.map(o => `<button class="option-btn" data-answer="${o}" style="font-size:24px;">${o}</button>`).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(parseInt(btn.dataset.answer), r.count);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (parseInt(b.dataset.answer) === sel) b.classList.add('wrong');
                if (parseInt(b.dataset.answer) === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 17: أعلى / أسفل
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (30 سؤال)
   3 رموز — السؤال عن الأعلى أو الأوسط أو الأسفل
   ═══ */
(function buildTopdownUnder() {
    const ITEMS = [
        { icon: '★', name: 'نجمة' },
        { icon: '●', name: 'دائرة' },
        { icon: '▲', name: 'مثلث' },
        { icon: '■', name: 'مربع' },
        { icon: '♥', name: 'قلب' },
        { icon: '◆', name: 'معين' }
    ];

    const bank = [];
    for (let i = 0; i < 30; i++) {
        const picked = MF_shuffle(ITEMS).slice(0, 3);
        const askIdx = Math.floor(Math.random() * 3);
        bank.push({
            stack: picked,
            askIdx,
            posName: ['الأعلى', 'الأوسط', 'الأسفل'][askIdx],
            answer: picked[askIdx].name,
            options: MF_shuffle(picked.map(p => p.name))
        });
    }

    MF_BANKS.topdown = MF_BANKS.topdown || {};
    MF_BANKS.topdown.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (30 سؤال)
   4 رموز — السؤال عن مواقع مختلفة
   ═══ */
(function buildTopdownOver() {
    const ITEMS = [
        { icon: '★', name: 'نجمة' },
        { icon: '●', name: 'دائرة' },
        { icon: '▲', name: 'مثلث' },
        { icon: '■', name: 'مربع' },
        { icon: '♥', name: 'قلب' },
        { icon: '◆', name: 'معين' },
        { icon: '✦', name: 'بريق' },
        { icon: '◈', name: 'ماسة' }
    ];

    const bank = [];
    for (let i = 0; i < 30; i++) {
        const picked = MF_shuffle(ITEMS).slice(0, 4);
        const askIdx = Math.floor(Math.random() * 4);
        bank.push({
            stack: picked,
            askIdx,
            posName: ['الأعلى', 'الثاني', 'الثالث', 'الأسفل'][askIdx],
            answer: picked[askIdx].name,
            options: MF_shuffle(picked.map(p => p.name))
        });
    }

    MF_BANKS.topdown.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.topdown = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 10 : 5;
    const bank = MF_getBank('topdown');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const colors = ['#7C3AED', '#EC4899', '#A78BFA', '#F472B6'];
        const stackHTML = r.stack.map((s, i) =>
            `<div style="font-size:64px;padding:6px 0;color:${colors[i % colors.length]};">${s.icon}</div>`
        ).join('');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">ما هو الرمز في الموضع <span style="color:#EC4899;">${r.posName}</span>؟</p>
                <div style="display:flex;flex-direction:column;align-items:center;margin:20px auto;background:#E5EAE6;border-radius:20px;padding:20px 60px;width:fit-content;">${stackHTML}</div>
                <div class="options-grid">
                    ${r.options.map(o => `<button class="option-btn" data-answer="${o}">${o}</button>`).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.answer, r.answer);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

console.log('%c✅ الجزء 6 محمّل — التطابق + المتداخلة + أعلى/أسفل', 'color:#EC4899;font-weight:bold;font-size:14px;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 18: أكمل النصف
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (20 سؤال)
   النصف المكمل للأشكال
   ═══ */
(function buildHalfUnder() {
    const SHAPES = [
        { l: '◐', r: '◑' },
        { l: '◧', r: '◨' },
        { l: '⬒', r: '⬓' },
        { l: '◭', r: '◮' },
        { l: '⬖', r: '⬗' },
        { l: '◔', r: '◕' },
        { l: '◴', r: '◵' },
        { l: '◶', r: '◷' },
        { l: '▤', r: '▥' },
        { l: '▦', r: '▧' }
    ];

    const bank = [];
    for (let i = 0; i < 20; i++) {
        const s = SHAPES[i % SHAPES.length];
        const wrongs = MF_shuffle(SHAPES.filter(x => x.r !== s.r)).slice(0, 3).map(x => x.r);
        bank.push({
            l: s.l,
            r: s.r,
            options: MF_shuffle([s.r, ...wrongs])
        });
    }

    MF_BANKS.half = MF_BANKS.half || {};
    MF_BANKS.half.under = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.half = function(container, game) {
    timeLimit = 5;
    const bank = MF_BANKS.half.under;
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">اختر النصف المكمل</p>
                <div class="shape-display" style="font-size:110px;padding:30px 60px;">${r.l}</div>
                <div class="options-grid">
                    ${r.options.map(o => `<button class="option-btn" data-answer="${o}" style="font-size:64px;padding:22px;">${o}</button>`).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.answer, r.r);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 19: القطع المفقودة
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (20 سؤال) ═══ */
(function buildPiecesUnder() {
    const bank = [
        { scene: '🚗', answer: 'عجلة', options: ['عجلة', 'باب', 'مرآة', 'مصباح'] },
        { scene: '🏠', answer: 'باب', options: ['باب', 'نافذة', 'سقف', 'مدخنة'] },
        { scene: '🌸', answer: 'بتلة', options: ['بتلة', 'ساق', 'ورقة', 'جذر'] },
        { scene: '🐦', answer: 'جناح', options: ['جناح', 'منقار', 'ذيل', 'عين'] },
        { scene: '🕐', answer: 'عقرب', options: ['عقرب', 'أرقام', 'إطار', 'زجاج'] },
        { scene: '🪑', answer: 'ساق', options: ['ساق', 'مسند', 'ظهر', 'ذراع'] },
        { scene: '🌳', answer: 'فرع', options: ['فرع', 'ورقة', 'جذر', 'لحاء'] },
        { scene: '🚲', answer: 'سلسلة', options: ['سلسلة', 'مقعد', 'عجلة', 'مقود'] },
        { scene: '📱', answer: 'شاشة', options: ['شاشة', 'بطارية', 'كاميرا', 'زر'] },
        { scene: '☂️', answer: 'مقبض', options: ['مقبض', 'قماش', 'قضيب', 'طرف'] },
        { scene: '🐘', answer: 'خرطوم', options: ['خرطوم', 'ذيل', 'أذن', 'ناب'] },
        { scene: '⌚', answer: 'سوار', options: ['سوار', 'عقارب', 'شاشة', 'تاج'] },
        { scene: '🎸', answer: 'وتر', options: ['وتر', 'رقبة', 'جسم', 'مفاتيح'] },
        { scene: '🖥️', answer: 'لوحة مفاتيح', options: ['لوحة مفاتيح', 'شاشة', 'فأرة', 'سماعة'] },
        { scene: '🚁', answer: 'مروحة', options: ['مروحة', 'مقصورة', 'ذيل', 'هيكل'] },
        { scene: '📚', answer: 'غلاف', options: ['غلاف', 'صفحة', 'عنوان', 'فهرس'] },
        { scene: '🛏️', answer: 'وسادة', options: ['وسادة', 'بطانية', 'شرشف', 'إطار'] },
        { scene: '🚪', answer: 'مقبض', options: ['مقبض', 'مفصلة', 'قفل', 'خشب'] },
        { scene: '🍽️', answer: 'ملعقة', options: ['ملعقة', 'شوكة', 'سكين', 'طبق'] },
        { scene: '👓', answer: 'عدسة', options: ['عدسة', 'إطار', 'ذراع', 'أنف'] }
    ];

    MF_BANKS.pieces = MF_BANKS.pieces || {};
    MF_BANKS.pieces.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (30 سؤال) ═══ */
(function buildPiecesOver() {
    const bank = [
        { scene: '🏛️', answer: 'عمود', options: ['عمود', 'سقف', 'أساس', 'قوس'] },
        { scene: '⌚', answer: 'سوار', options: ['سوار', 'عقارب', 'شاشة', 'تاج'] },
        { scene: '🎸', answer: 'وتر', options: ['وتر', 'رقبة', 'جسم', 'مفاتيح'] },
        { scene: '🖥️', answer: 'لوحة مفاتيح', options: ['لوحة مفاتيح', 'شاشة', 'فأرة', 'سماعة'] },
        { scene: '🚁', answer: 'مروحة', options: ['مروحة', 'مقصورة', 'ذيل', 'هيكل'] },
        { scene: '⚙️', answer: 'ترس', options: ['ترس', 'محرك', 'عمود', 'مسمار'] },
        { scene: '🔬', answer: 'عدسة', options: ['عدسة', 'أنبوب', 'منصة', 'ضوء'] },
        { scene: '🔭', answer: 'مرآة', options: ['مرآة', 'أنبوب', 'قاعدة', 'عدسة'] },
        { scene: '📡', answer: 'طبق', options: ['طبق', 'هوائي', 'سلك', 'قاعدة'] },
        { scene: '🎥', answer: 'عدسة', options: ['عدسة', 'جسم', 'شاشة', 'ميكروفون'] },
        { scene: '🛰️', answer: 'ألواح شمسية', options: ['ألواح شمسية', 'هوائي', 'محرك', 'كاميرا'] },
        { scene: '🔌', answer: 'قابس', options: ['قابس', 'سلك', 'مقبس', 'مفتاح'] },
        { scene: '💡', answer: 'فتيل', options: ['فتيل', 'زجاج', 'قاعدة', 'سلك'] },
        { scene: '🔋', answer: 'أقطاب', options: ['أقطاب', 'غلاف', 'سائل', 'علامة'] },
        { scene: '🚀', answer: 'وقود', options: ['وقود', 'محرك', 'جناح', 'كبسولة'] },
        { scene: '✈️', answer: 'جناح', options: ['جناح', 'محرك', 'ذيل', 'قمرة'] },
        { scene: '🚂', answer: 'عجلات', options: ['عجلات', 'مدخنة', 'مقصورة', 'فحم'] },
        { scene: '⛵', answer: 'شراع', options: ['شراع', 'صاري', 'دقة', 'مرساة'] },
        { scene: '🎯', answer: 'مركز', options: ['مركز', 'حلقة', 'سهم', 'قوس'] },
        { scene: '🎨', answer: 'فرشاة', options: ['فرشاة', 'ألوان', 'لوحة', 'ماء'] },
        { scene: '🖊️', answer: 'حبر', options: ['حبر', 'سن', 'جسم', 'غطاء'] },
        { scene: '📷', answer: 'عدسة', options: ['عدسة', 'فلاش', 'شاشة', 'زر'] },
        { scene: '🔒', answer: 'مفتاح', options: ['مفتاح', 'قفل', 'مزلاج', 'حلقة'] },
        { scene: '🚗', answer: 'محرك', options: ['محرك', 'عجلة', 'مقود', 'فرامل'] },
        { scene: '🏹', answer: 'وتر', options: ['وتر', 'سهم', 'قوس', 'هدف'] },
        { scene: '🎹', answer: 'مفاتيح', options: ['مفاتيح', 'دواسات', 'غطاء', 'مقعد'] },
        { scene: '🎺', answer: 'صمام', options: ['صمام', 'فوهة', 'جسم', 'مبسم'] },
        { scene: '🥁', answer: 'عصا', options: ['عصا', 'جلد', 'إطار', 'حلقة'] },
        { scene: '🚿', answer: 'رأس', options: ['رأس', 'خرطوم', 'مقبض', 'فتحة'] },
        { scene: '🧭', answer: 'إبرة', options: ['إبرة', 'قرص', 'زجاج', 'إطار'] }
    ];

    MF_BANKS.pieces.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.pieces = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 5 : 10;
    const bank = MF_getBank('pieces');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">ما هي القطعة المفقودة؟</p>
                <div class="shape-display" style="font-size:110px;padding:30px 60px;">${r.scene}</div>
                <div class="options-grid">
                    ${shuffle(r.options).map(o => `<button class="option-btn" data-answer="${o}" style="font-size:18px;">${o}</button>`).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.answer, r.answer);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};


/* ============================================================
   🎉 قائمة التشغيل النهائية
   ============================================================ */
console.log('%c═══════════════════════════════════════════════════════', 'color:#7C3AED;font-weight:bold;');
console.log('%c🎉 MIND FORGE — كل الألعاب جاهزة بنظام البنوك الجديد!', 'color:#EC4899;font-size:16px;font-weight:bold;');
console.log('%c═══════════════════════════════════════════════════════', 'color:#7C3AED;font-weight:bold;');
console.log('%c📊 عدد البنوك: 19 بنك', 'color:#7C3AED;font-weight:bold;');
console.log('%c✅ Stroop (60+60)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ كشف الاختلافات (40+40)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ العد السريع (30)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الذاكرة المكانية (25+25)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ ذاكرة الألوان (25+25)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الألغاز القصصية (40+60)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الذاكرة العكسية (25+60)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الرياضيات السريعة (35)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ المنطق المجرد (25+40)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ التسلسل الزمني (25)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ تعرف الأنماط (25+55)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الرمزان المتشابهان (30+30)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الرمز الغريب (30+30)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الرمز المختفي (30+30)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ التطابق ضد الوقت (20)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الأشكال المتداخلة (30+30)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ أعلى / أسفل (30+30)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ أكمل النصف (20)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ القطع المفقودة (20+30)', 'color:#10B981;font-weight:bold;');
console.log('%c═══════════════════════════════════════════════════════', 'color:#7C3AED;font-weight:bold;');
console.log('%c🔊 الأصوات مفعّلة (نقرة + احتفال)', 'color:#7C3AED;font-weight:bold;');
/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🎮 لعبة 20: سرعة اتخاذ القرار (Go / No-Go)
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

/* ═══ بنك تحت 16 — متوسط (60 جولة) ═══
   ★ = اضغط (نعم)
   ● ▲ ■ ◆ ✦ ♥ = تجاهل (لا)
   ═══ */
(function buildDecisionUnder() {
    const bank = [];

    // 30 جولة "اضغط"
    for (let i = 0; i < 30; i++) {
        bank.push({ symbol: '★', isTarget: true });
    }

    // 30 جولة "تجاهل"
    const wrongs = ['●', '▲', '■', '◆', '✦', '♥'];
    for (let i = 0; i < 30; i++) {
        const sym = wrongs[Math.floor(Math.random() * wrongs.length)];
        bank.push({ symbol: sym, isTarget: false });
    }

    MF_BANKS.decision = MF_BANKS.decision || {};
    MF_BANKS.decision.under = bank;
})();

/* ═══ بنك فوق 16 — صعب (60 جولة) ═══
   ★ = اضغط (نعم)
   رموز أكثر تشابهاً + سرعة أعلى
   ═══ */
(function buildDecisionOver() {
    const bank = [];

    // 30 جولة "اضغط"
    for (let i = 0; i < 30; i++) {
        bank.push({ symbol: '★', isTarget: true });
    }

    // 30 جولة "تجاهل" — رموز متشابهة جداً مع النجمة
    const wrongs = ['☆', '✦', '✧', '✩', '✪', '✫', '✬', '✭', '✮', '✯'];
    for (let i = 0; i < 30; i++) {
        const sym = wrongs[Math.floor(Math.random() * wrongs.length)];
        bank.push({ symbol: sym, isTarget: false });
    }

    MF_BANKS.decision.over = bank;
})();

/* ═══ تشغيل اللعبة ═══ */
LAUNCHERS.decision = function(container, game) {
    timeLimit = 5;
    const bank = MF_getBank('decision');
    const rounds = MF_pickUnique(bank, 10);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">الجولة ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">اضغط <span style="color:#10B981;">"نعم"</span> فقط عند ظهور النجمة ★</p>
                <div class="shape-display" style="font-size:120px;padding:30px 60px;">${r.symbol}</div>
                <div class="options-grid" style="max-width:500px;">
                    <button class="option-btn" data-action="yes" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;">✅ نعم اضغط</button>
                    <button class="option-btn" data-action="no" style="background:linear-gradient(135deg,#EC4899,#DB2777);color:#fff;">❌ تجاهل</button>
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.action === 'yes');
        });

        startTimer(() => {
            // انتهى الوقت ولم يضغط — إذا كان رمز خطأ، هو صح
            if (!r.isTarget) { correct++; score += 10; playCorrect(); }
            else { wrong++; playWrong(); }
            idx++; render();
        });
    }

    function submit(pressed) {
        stopTimer();
        const r = rounds[idx];
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);

        if (pressed === r.isTarget) {
            correct++; score += 10; playCorrect();
            buttons.forEach(b => { if (b.dataset.action === (pressed ? 'yes' : 'no')) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => { if (b.dataset.action === (pressed ? 'yes' : 'no')) b.classList.add('wrong'); });
        }
        setTimeout(() => { idx++; render(); }, 500);
    }

    render();
};

console.log('%c✅ سرعة اتخاذ القرار محمّلة', 'color:#10B981;font-weight:bold;');


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🔧 تعديل التسلسل الزمني — استبدال السهم بكلمة "ثم"
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

LAUNCHERS.timeline = function(container, game) {
    timeLimit = 15;
    const bank = MF_BANKS.timeline.under;
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        const correctStr = r.answer.join(' ثم ');
        const w1 = MF_shuffle(r.answer).join(' ثم ');
        const w2 = [...r.answer].reverse().join(' ثم ');
        const w3 = [r.answer[1], r.answer[0], r.answer[3], r.answer[2]].join(' ثم ');

        let opts = [...new Set([correctStr, w1, w2, w3])];
        while (opts.length < 4) opts.push('ترتيب آخر');

        const shuffledItems = MF_shuffle(r.items).join(' • ');

        // ⭐ نبني الأزرار: data-answer = نص عادي، العرض = HTML ملون
        const buttonsHTML = shuffle(opts).map(opt => {
            const displayHTML = opt
                .split(' ثم ')
                .map(part => `<span style="color:#111827;">${part}</span>`)
                .join(` <span style="color:#7C3AED;font-weight:900;">ثم</span> `);

            // escape للعلامات في data-answer
            const cleanAnswer = opt.replace(/"/g, '&quot;');
            return `<button class="option-btn" data-answer="${cleanAnswer}" style="font-size:16px;line-height:1.8;">${displayHTML}</button>`;
        }).join('');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">${r.q}</p>
                <div class="shape-display" style="font-size:20px;letter-spacing:2px;padding:20px 30px;">${shuffledItems}</div>
                <div class="options-grid single-column">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                // نقارن بالنص العادي
                const cleanCorrect = correctStr.replace(/"/g, '&quot;');
                submit(btn.dataset.answer, cleanCorrect);
            };
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 900);
    }

    render();
};

console.log('%c✅ التسلسل الزمني معدّل (كلمة "ثم" مميزة)', 'color:#10B981;font-weight:bold;');


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🔧 تعديل الذاكرة العكسية — استبدال الشرطة بكلمة "ثم"
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

LAUNCHERS.reverse = function(container, game) {
    timeLimit = 10;
    const bank = MF_getBank('reverse');
    const rounds = MF_pickUnique(bank, currentAgeGroup === 'under16' ? 5 : 10);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <p class="question-text">👀 احفظ الأرقام — ستختفي بعد 4 ثوانٍ</p>
                <div class="shape-display" style="font-size:44px;letter-spacing:12px;direction:ltr;">${r.nums.join(' ')}</div>
            </div>
        `;
        setTimeout(() => showQ(r), 4000);
    }

    function showQ(r) {
        const correctStr = r.reverse.join(' ثم ');
        const w1 = r.nums.join(' ثم ');
        const w2 = MF_shuffle([...r.nums]).join(' ثم ');
        const w3 = MF_shuffle([...r.reverse]).join(' ثم ');

        let opts = [...new Set([correctStr, w1, w2, w3])];
        while (opts.length < 4) opts.push('1 ثم 2 ثم 3');

        const buttonsHTML = shuffle(opts).map(opt => {
            const displayHTML = opt
                .split(' ثم ')
                .map(part => `<span style="color:#111827;direction:ltr;display:inline-block;">${part}</span>`)
                .join(` <span style="color:#7C3AED;font-weight:900;">ثم</span> `);

            const cleanAnswer = opt.replace(/"/g, '&quot;');
            return `<button class="option-btn" data-answer="${cleanAnswer}" style="font-size:17px;line-height:1.8;">${displayHTML}</button>`;
        }).join('');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">اختر الترتيب <span style="color:#EC4899;">العكسي</span> الصحيح:</p>
                <div class="options-grid single-column">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                const cleanCorrect = correctStr.replace(/"/g, '&quot;');
                submit(btn.dataset.answer, cleanCorrect);
            };
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += Math.floor(100 / rounds.length); playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

console.log('%c✅ الذاكرة العكسية معدّلة (كلمة "ثم" مميزة)', 'color:#10B981;font-weight:bold;');


/* ============================================================
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   🔧 تعديل ذاكرة الألوان — استبدال السهم بكلمة "ثم"
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ============================================================ */

LAUNCHERS.colors = function(container, game) {
    timeLimit = 10;
    const bank = MF_getBank('colors');
    const rounds = MF_pickUnique(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <p class="question-text">👀 احفظ ترتيب الألوان...</p>
                <div id="c-stage" style="height:220px;display:flex;align-items:center;justify-content:center;"></div>
            </div>
        `;

        const stage = document.getElementById('c-stage');
        let step = 0;
        function next() {
            if (step >= r.colors.length) { setTimeout(() => showQ(r), 600); return; }
            const c = r.colors[step];
            stage.innerHTML = `<div style="width:180px;height:180px;border-radius:28px;background:${c.hex};box-shadow:0 0 50px ${c.hex};"></div>`;
            step++;
            setTimeout(next, 700);
        }
        next();
    }

    function showQ(r) {
        const correctStr = r.sequence.join(' ثم ');
        const w1 = MF_shuffle([...r.sequence]).join(' ثم ');
        const w2 = [...r.sequence].reverse().join(' ثم ');
        const w3 = MF_shuffle([...r.sequence]).join(' ثم ');

        let opts = [...new Set([correctStr, w1, w2, w3])];
        while (opts.length < 4) opts.push('ترتيب آخر');

        const colorMap = {};
        r.colors.forEach(c => { colorMap[c.name] = c.hex; });

        const buttonsHTML = shuffle(opts).map(opt => {
            const displayHTML = opt
                .split(' ثم ')
                .map(part => {
                    const hex = colorMap[part] || '#111827';
                    return `<span style="color:${hex};font-weight:900;">${part}</span>`;
                })
                .join(` <span style="color:#7C3AED;font-weight:900;">ثم</span> `);

            const cleanAnswer = opt.replace(/"/g, '&quot;');
            return `<button class="option-btn" data-answer="${cleanAnswer}" style="font-size:15px;line-height:1.8;">${displayHTML}</button>`;
        }).join('');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">ما هو الترتيب الصحيح للألوان؟</p>
                <div class="options-grid single-column">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                const cleanCorrect = correctStr.replace(/"/g, '&quot;');
                submit(btn.dataset.answer, cleanCorrect);
            };
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) {
            correct++; score += 20; playCorrect();
            buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); });
        } else {
            wrong++; playWrong();
            buttons.forEach(b => {
                if (b.dataset.answer === sel) b.classList.add('wrong');
                if (b.dataset.answer === answer) b.classList.add('correct');
            });
        }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};
console.log('%c✅ ذاكرة الألوان معدّلة (كلمة "ثم" مميزة)', 'color:#10B981;font-weight:bold;');


/* ============================================================
   🎉 نهاية التعديلات
   ============================================================ */
console.log('%c═══════════════════════════════════════════════════════', 'color:#7C3AED;font-weight:bold;');
console.log('%c🎉 كل التعديلات النهائية محمّلة!', 'color:#EC4899;font-size:16px;font-weight:bold;');
console.log('%c═══════════════════════════════════════════════════════', 'color:#7C3AED;font-weight:bold;');
console.log('%c✅ سرعة اتخاذ القرار (تمت الإضافة)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ التسلسل الزمني (كلمة "ثم" مميزة)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الذاكرة العكسية (كلمة "ثم" مميزة)', 'color:#10B981;font-weight:bold;');
console.log('%c✅ ذاكرة الألوان (كلمة "ثم" مميزة)', 'color:#10B981;font-weight:bold;');
console.log('%c═══════════════════════════════════════════════════════', 'color:#7C3AED;font-weight:bold;');
/* ============================================================
   ✨ الإضافات النهائية — v5.3
   ============================================================ */

/* ═══ 1. الترحيب الديناميكي (حسب الوقت) ═══ */
function updateWelcomeMessage() {
    const el = document.getElementById('welcome-message');
    if (!el) return;

    const hour = new Date().getHours();
    let message = '';

    if (hour >= 5 && hour < 12) {
        message = '☀️ صباح الخير! جاهز لتدريب عقلك؟';
    } else if (hour >= 12 && hour < 17) {
        message = '🌤️ أهلاً! وقت التحدي الذهني';
    } else if (hour >= 17 && hour < 22) {
        message = '🌆 مساء الخير! درّب عقلك معنا';
    } else {
        message = '🌙 سهرة ممتعة! عقلك يستحق التدريب';
    }

    el.innerText = message;
}

/* ═══ 2. العدّاد المتحرك ═══ */
function animateCounter(elementId, targetValue, duration = 1500) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(start + (targetValue - start) * eased);

        el.innerText = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.innerText = targetValue;
        }
    }

    requestAnimationFrame(update);
}

/* تحديث العدّاد في الإحصائيات */
function updateStatsWithCounter() {
    const stats = getStats();
    const active = currentAgeGroup
        ? GAMES.filter(g => currentAgeGroup === 'under16' ? g.under16 : g.over16)
        : GAMES;

    let total = 0;
    active.forEach(g => {
        if (stats[g.key] !== undefined) total += stats[g.key];
    });

    const percent = active.length > 0
        ? Math.round((total / (active.length * 100)) * 100)
        : 0;

    // عدّاد الرقم
    animateCounter('stats-current', total, 1200);

    // عدّاد النسبة
    const percentEl = document.getElementById('stats-percent');
    if (percentEl) {
        const pStart = performance.now();
        const pDuration = 1200;

        function updatePercent(t) {
            const elapsed = t - pStart;
            const progress = Math.min(elapsed / pDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const p = Math.round(eased * percent);
            percentEl.innerText = p + '%';
            if (progress < 1) requestAnimationFrame(updatePercent);
        }
        requestAnimationFrame(updatePercent);
    }

    // شريط التقدم
    const fill = document.getElementById('stats-bar-fill');
    if (fill) {
        fill.style.width = '0%';
        setTimeout(() => {
            fill.style.width = percent + '%';
        }, 100);
    }

    // باقي الإحصائيات (بدون عدّاد)
    const maxTotal = active.length * 100;
    const $ = id => document.getElementById(id);
    if ($('stats-total')) $('stats-total').innerText = maxTotal;

    let playedCount = 0, best = -1, bestName = '—', worst = 101, worstName = '—';
    active.forEach(g => {
        const s = stats[g.key];
        if (s !== undefined) {
            playedCount++;
            if (s > best) { best = s; bestName = g.title; }
            if (s < worst) { worst = s; worstName = g.title; }
        }
    });

    if ($('stats-best')) $('stats-best').innerText = playedCount > 0 ? `${bestName} — ${best}` : '—';
    if ($('stats-worst')) $('stats-worst').innerText = playedCount > 0 ? `${worstName} — ${worst}` : '—';
}

/* ═══ 3. شريط القسم (فوق 16 / تحت 16) ═══ */
function renderSectionBanner() {
    const gamesScreen = document.getElementById('games-screen');
    if (!gamesScreen) return;

    const old = gamesScreen.querySelector('.section-banner');
    if (old) old.remove();

    const isOver16 = currentAgeGroup === 'over16';

    const banner = document.createElement('div');
    banner.className = 'section-banner';

    if (isOver16) {
        banner.innerHTML = `
            <span class="banner-icon">🎯</span>
            <span class="banner-title">أنت في قسم فوق 16 سنة</span>
            <span class="banner-subtitle">أعلى مستوى تحدي — هل أنت جاهز؟ 🔥</span>
        `;
    } else {
        banner.innerHTML = `
            <span class="banner-icon">🌱</span>
            <span class="banner-title">أنت في قسم تحت 16 سنة</span>
            <span class="banner-subtitle">مستوى تنموي ذكي — لنبدأ رحلة التعلم! ✨</span>
        `;
    }

    const gamesIntro = gamesScreen.querySelector('.games-intro');
    if (gamesIntro) {
        gamesIntro.parentNode.insertBefore(banner, gamesIntro);
    } else {
        gamesScreen.appendChild(banner);
    }
}

/* ═══ 4. تحديث selectAge لإضافة الشريط ═══ */
const _originalSelectAge = window.selectAge;
window.selectAge = function(group) {
    if (typeof _originalSelectAge === 'function') {
        _originalSelectAge(group);
    }

    setTimeout(() => {
        renderSectionBanner();
        updateStatsWithCounter();
    }, 100);
};

/* ═══ 5. تحديث goHome لإعادة تشغيل الترحيب ═══ */
const _originalGoHome = window.goHome;
window.goHome = function() {
    if (typeof _originalGoHome === 'function') {
        _originalGoHome();
    }
    updateWelcomeMessage();
    setTimeout(() => updateStatsWithCounter(), 100);
};

/* ═══ 6. عند تحميل الصفحة ═══ */
document.addEventListener('DOMContentLoaded', () => {
    updateWelcomeMessage();
    setTimeout(() => updateStatsWithCounter(), 300);
});

/* ═══ 7. إعادة تشغيل الأصوات ═══ */
if (typeof attachClickSound === 'function') {
    attachClickSound();
}

console.log('%c✨ الإضافات النهائية محمّلة!', 'color:#EC4899;font-size:16px;font-weight:bold;');
console.log('%c✅ الترحيب الديناميكي', 'color:#10B981;font-weight:bold;');
console.log('%c✅ العدّاد المتحرك', 'color:#10B981;font-weight:bold;');
console.log('%c✅ شريط القسم', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الشريط السفلي', 'color:#10B981;font-weight:bold;');
console.log('%c✅ الأصوات معاد تشغيلها', 'color:#10B981;font-weight:bold;');
/* ============================================================
   ✨ الإضافات القوية — v5.5
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   1. 🔥 CINEMATIC LOADER
   ═══════════════════════════════════════════════════════════ */
function runCinematicLoader() {
    const loader = document.getElementById('loader');
    const fill = document.getElementById('loader-fill');
    const percent = document.getElementById('loader-percent');

    if (!loader || !fill || !percent) return;

    let progress = 0;
    const duration = 2200; // 2.2 ثانية
    const interval = 30;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
        progress += step + Math.random() * 1.5; // عشوائي بسيط
        if (progress >= 100) {
            progress = 100;
            clearInterval(timer);

            // انتهى — انتظر لحظة ثم اخفِ
            setTimeout(() => {
                loader.classList.add('hidden-loader');
                // شغل الصوت إذا موجود
                if (typeof getAudioCtx === 'function') {
                    try {
                        const ctx = getAudioCtx();
                        if (ctx) {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                            osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.3);
                            gain.gain.setValueAtTime(0.08, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.start(ctx.currentTime);
                            osc.stop(ctx.currentTime + 0.4);
                        }
                    } catch (e) {}
                }
            }, 300);
        }

        fill.style.width = progress + '%';
        percent.innerText = Math.round(progress) + '%';
    }, interval);
}

/* ═══════════════════════════════════════════════════════════
   2. 🎯 3D CARD TILT
   ═══════════════════════════════════════════════════════════ */
function attach3DTilt() {
    // نراقب البطاقات الجديدة اللي تُضاف ديناميكياً
    const observer = new MutationObserver(() => {
        const cards = document.querySelectorAll('.game-card, .age-card');
        cards.forEach(card => {
            if (card.dataset.tilt3d) return;
            card.dataset.tilt3d = '1';
            attachTiltToCard(card);
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // نطبق على الموجود حالياً
    document.querySelectorAll('.game-card, .age-card').forEach(card => {
        if (card.dataset.tilt3d) return;
        card.dataset.tilt3d = '1';
        attachTiltToCard(card);
    });
}

function attachTiltToCard(card) {
    const MAX_TILT = 8; // درجات

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -MAX_TILT;
        const rotateY = ((x - centerX) / centerX) * MAX_TILT;

        // النسبة المئوية للماوس (للمعة)
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;

        card.style.setProperty('--mouse-x', percentX + '%');
        card.style.setProperty('--mouse-y', percentY + '%');

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
    });
}

/* ═══════════════════════════════════════════════════════════
   3. 🌈 COLOR SHIFTING TITLE
   ═══════════════════════════════════════════════════════════ */
function enhanceColorShiftingTitle() {
    const title = document.querySelector('.brand-title');
    if (!title) return;

    // نتأكد إن الخلفية موجودة
    title.style.backgroundImage = 'linear-gradient(270deg, #7C3AED, #EC4899, #A78BFA, #F472B6, #7C3AED)';
    title.style.backgroundSize = '300% 300%';
    title.style.webkitBackgroundClip = 'text';
    title.style.backgroundClip = 'text';
    title.style.webkitTextFillColor = 'transparent';
}

/* ═══════════════════════════════════════════════════════════
   🚀 التشغيل عند تحميل الصفحة
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    // 1. العنوان المتغير
    enhanceColorShiftingTitle();

    // 2. الـ Loader
    runCinematicLoader();

    // 3. 3D Tilt
    setTimeout(() => attach3DTilt(), 100);
});

console.log('%c✨ الإضافات القوية محمّلة!', 'color:#EC4899;font-size:16px;font-weight:bold;');
console.log('%c✅ Cinematic Loader', 'color:#10B981;font-weight:bold;');
console.log('%c✅ 3D Card Tilt', 'color:#10B981;font-weight:bold;');
console.log('%c✅ Color Shifting Title', 'color:#10B981;font-weight:bold;');
/* ============================================================
   🌙 تبديل الوضع (فاتح / داكن)
   ============================================================ */
function toggleTheme() {
    const root = document.documentElement;

    if (root.classList.contains('dark-mode')) {
        root.classList.remove('dark-mode');
        try { localStorage.setItem('mindforge-theme', 'light'); } catch (e) {}
    } else {
        root.classList.add('dark-mode');
        try { localStorage.setItem('mindforge-theme', 'dark'); } catch (e) {}
    }
}

/* ═══ استرجاع الوضع عند تحميل الصفحة ═══ */
(function initTheme() {
    try {
        const saved = localStorage.getItem('mindforge-theme');
        if (saved === 'dark') {
            document.documentElement.classList.add('dark-mode');
        }
    } catch (e) {}
})();

console.log('%c🌙 نظام تبديل الوضع محمّل', 'color:#0047AB;font-weight:bold;');

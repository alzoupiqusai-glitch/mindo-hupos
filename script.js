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
   12. قالب السؤال
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
   13. Stroop
   ============================================================ */
const STROOP_COLORS = [
    { name: 'أحمر', hex: '#DC2626' },
    { name: 'أزرق', hex: '#2563EB' },
    { name: 'أخضر', hex: '#16A34A' },
    { name: 'أصفر', hex: '#CA8A04' },
    { name: 'بنفسجي', hex: '#7C3AED' },
    { name: 'برتقالي', hex: '#EA580C' }
];

LAUNCHERS.stroop = function(container, game) {
    const bank = [];
    for (let i = 0; i < 60; i++) {
        const w = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        const c = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        bank.push({ word: w.name, color: c.name, colorHex: c.hex });
    }
    const rounds = pick(bank, 10);
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

        let opts = [answer];
        while (opts.length < 4) {
            const r = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)].name;
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
   14. سرعة اتخاذ القرار
   ============================================================ */
LAUNCHERS.decision = function(container, game) {
    timeLimit = 5;
    const bank = [];
    for (let i = 0; i < 60; i++) {
        const isTarget = Math.random() < 0.5;
        bank.push({ symbol: isTarget ? '★' : ['●','▲','■','◆','✦','♥'][Math.floor(Math.random()*6)], isTarget });
    }
    const rounds = pick(bank, 10);

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
            shape: r.symbol,
            question: 'اضغط نعم فقط عند ظهور النجمة ★',
            options: ['نعم', 'تجاهل'],
            onAnswer: (sel) => submit(sel === 'نعم')
        });

        startTimer(() => {
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

        if (pressed === r.isTarget) { correct++; score += 10; playCorrect(); }
        else { wrong++; playWrong(); }

        setTimeout(() => { idx++; render(); }, 500);
    }

    render();
};

/* ============================================================
   15. كشف الاختلافات
   ============================================================ */
const DIFFS = [
    { display: '🍎 🍎 🍎 🍊 🍎 🍎', options: ['برتقالة','تفاحة','موزة','عنب'], answer: 'برتقالة' },
    { display: '🐶 🐶 🐱 🐶 🐶', options: ['قطة','كلب','أرنب','عصفور'], answer: 'قطة' },
    { display: '⚽ ⚽ ⚽ 🏀 ⚽', options: ['كرة سلة','كرة قدم','كرة تنس','كرة يد'], answer: 'كرة سلة' },
    { display: '🔴 🔴 🔵 🔴 🔴', options: ['أزرق','أحمر','أخضر','أصفر'], answer: 'أزرق' },
    { display: '🍕 🍕 🍔 🍕 🍕', options: ['برغر','بيتزا','شطيرة','ساندويتش'], answer: 'برغر' },
    { display: '🌳 🌳 🌲 🌳 🌳', options: ['شجرة صنوبر','شجرة عادية','نخلة','وردة'], answer: 'شجرة صنوبر' },
    { display: '📕 📕 📗 📕 📕', options: ['كتاب أخضر','كتاب أحمر','قلم','دفتر'], answer: 'كتاب أخضر' },
    { display: '🐟 🐟 🐠 🐟 🐟', options: ['سمكة ملونة','سمكة عادية','قرش','دلفين'], answer: 'سمكة ملونة' },
    { display: '🌟 🌟 ✨ 🌟 🌟', options: ['بريق','نجمة','قمر','شمس'], answer: 'بريق' },
    { display: '🚗 🚗 🚙 🚗 🚗', options: ['سيارة دفع رباعي','سيارة صغيرة','شاحنة','حافلة'], answer: 'سيارة دفع رباعي' }
];

LAUNCHERS.differences = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 5 : 10;
    const bank = [];
    while (bank.length < 40) bank.push(...DIFFS);
    const rounds = pick(bank, 10);

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
        if (sel === answer) { correct++; score += 10; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};

/* ============================================================
   16. العد السريع
   ============================================================ */
LAUNCHERS.counting = function(container, game) {
    timeLimit = 5;
    const bank = [];
    for (let i = 0; i < 30; i++) {
        bank.push({ count: 5 + Math.floor(Math.random() * 16), shape: ['●','★','◆','▲','■'][Math.floor(Math.random()*5)] });
    }
    const rounds = pick(bank, 5);

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
            const v = r.count + [-2,-1,1,2][Math.floor(Math.random()*4)];
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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('wrong'); if (parseInt(b.dataset.answer) === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};

/* ============================================================
   17. الذاكرة المكانية
   ============================================================ */
LAUNCHERS.spatial = function(container, game) {
    timeLimit = 10;
    const rounds = Array(5).fill({});

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const size = currentAgeGroup === 'under16'
            ? (Math.random() < 0.5 ? 3 : 4)
            : (Math.random() < 0.5 ? 6 : 8);

        const total = size * size;
        const cellSize = size <= 4 ? 60 : (size === 6 ? 50 : 40);
        const lightCount = Math.min(3 + Math.floor(size / 2), 8);

        const targets = [];
        while (targets.length < lightCount) {
            const r = Math.floor(Math.random() * total);
            if (!targets.includes(r)) targets.push(r);
        }

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

console.log('%c✅ Part 1 Loaded', 'color:#7C3AED;font-weight:bold;');
/* ============================================================
   الجزء 2 — الألعاب (8-14)
   ============================================================ */

/* ============================================================
   18. ذاكرة الألوان
   ============================================================ */
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

LAUNCHERS.colors = function(container, game) {
    timeLimit = 10;
    const rounds = Array(5).fill({});

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const count = currentAgeGroup === 'under16' ? 3 + Math.floor(Math.random()*4) : 5 + Math.floor(Math.random()*4);
        const picked = pick(PALETTE, count);

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
            if (step >= picked.length) { setTimeout(() => showQ(picked), 600); return; }
            const c = picked[step];
            stage.innerHTML = `<div style="width:180px;height:180px;border-radius:28px;background:${c.hex};box-shadow:0 0 50px ${c.hex};"></div>`;
            step++;
            setTimeout(next, 700);
        }
        next();
    }

    function showQ(picked) {
        const correctStr = picked.map(c => c.name).join(' → ');
        const w1 = shuffle(picked).map(c => c.name).join(' → ');
        const w2 = [...picked].reverse().map(c => c.name).join(' → ');
        const w3 = shuffle(picked).map(c => c.name).join(' → ');
        let opts = [...new Set([correctStr, w1, w2, w3])];
        while (opts.length < 4) opts.push('ترتيب آخر');

        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: null,
            question: 'ما هو الترتيب الصحيح للألوان؟',
            options: shuffle(opts),
            onAnswer: (sel) => submit(sel, correctStr)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   19. الألغاز القصصية
   ============================================================ */
const STORIES = [
    { q: 'رجل يمشي تحت المطر بدون مظلة، ولم يبتل شعره! كيف؟', options: ['كان أصلع','كان في سيارة','المطر توقف','كان يرتدي قبعة'], answer: 'كان أصلع' },
    { q: 'ما هو الشيء الذي كلما أخذت منه كبر، وكلما وضعت فيه صغر؟', options: ['الحفرة','الصندوق','الكيس','الجبل'], answer: 'الحفرة' },
    { q: 'شيء له أسنان كثيرة لكنه لا يعض، ما هو؟', options: ['المشط','الأسد','السكين','المقص'], answer: 'المشط' },
    { q: 'يمشي بلا أرجل، ويبكي بلا عيون، ما هو؟', options: ['السحاب','الريح','النهر','الظل'], answer: 'السحاب' },
    { q: 'بيت بلا أبواب ولا نوافذ، ما هو؟', options: ['البيضة','الخيمة','الكهف','الصندوق'], answer: 'البيضة' },
    { q: 'كلما زاد نقص، ما هو؟', options: ['العمر','المال','الماء','الوقت'], answer: 'العمر' },
    { q: 'شيء يسمع بلا أذن، ويتكلم بلا لسان، ما هو؟', options: ['الهاتف','الراديو','التلفاز','الحاسوب'], answer: 'الهاتف' },
    { q: 'له وجه وعقارب لكن ليس له عيون، ما هو؟', options: ['الساعة','المرآة','الباب','الكتاب'], answer: 'الساعة' },
    { q: 'شيء إذا وضعته في الماء لا يبتل، ما هو؟', options: ['الظل','الزجاج','الحديد','الخشب'], answer: 'الظل' },
    { q: 'ما هو الشيء الذي يكتب ولا يقرأ؟', options: ['القلم','الكتاب','الدفتر','الورقة'], answer: 'القلم' }
];

LAUNCHERS.stories = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 15 : 20;
    const bank = [];
    while (bank.length < 40) bank.push(...STORIES);
    const rounds = pick(bank, currentAgeGroup === 'under16' ? 5 : 10);
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
        if (sel === answer) { correct++; score += points; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 900);
    }

    render();
};

/* ============================================================
   20. الذاكرة العكسية
   ============================================================ */
LAUNCHERS.reverse = function(container, game) {
    timeLimit = 10;
    const rounds = [];
    const count = currentAgeGroup === 'under16' ? 5 : 10;

    for (let i = 0; i < count; i++) {
        const len = currentAgeGroup === 'under16' ? 4 + Math.floor(Math.random()*3) : 7 + Math.floor(Math.random()*4);
        const nums = [];
        while (nums.length < len) nums.push(String(1 + Math.floor(Math.random()*9)));
        rounds.push({ nums, reverse: [...nums].reverse() });
    }

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
        const correctStr = r.reverse.join(' - ');
        const w1 = r.nums.join(' - ');
        const w2 = shuffle([...r.nums]).join(' - ');
        const w3 = shuffle([...r.reverse]).join(' - ');
        let opts = [...new Set([correctStr, w1, w2, w3])];
        while (opts.length < 4) opts.push('1 - 2 - 3 - 4');

        renderQuestion(container, {
            num: idx + 1,
            total: rounds.length,
            shape: null,
            question: 'اختر الترتيب العكسي الصحيح:',
            options: shuffle(opts),
            onAnswer: (sel) => submit(sel, correctStr)
        });
        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) { correct++; score += Math.floor(100 / rounds.length); playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   21. الرياضيات السريعة
   ============================================================ */
LAUNCHERS.math = function(container, game) {
    timeLimit = 10;
    const bank = [];
    for (let i = 0; i < 35; i++) {
        if (Math.random() < 0.6) {
            const a = 2 + Math.floor(Math.random()*11);
            const b = 2 + Math.floor(Math.random()*10);
            bank.push({ q: `${a} × ${b} = ؟`, answer: a * b });
        } else {
            const b = 2 + Math.floor(Math.random()*10);
            const answer = 2 + Math.floor(Math.random()*12);
            bank.push({ q: `${b*answer} ÷ ${b} = ؟`, answer });
        }
    }
    const rounds = pick(bank, 5);

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
            const v = r.answer + [-3,-2,-1,1,2,3][Math.floor(Math.random()*6)];
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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('wrong'); if (parseInt(b.dataset.answer) === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};

/* ============================================================
   22. المنطق المجرد
   ============================================================ */
const LOGIC_UNDER = [
    { q: "كل القطط حيوانات. ميمي قطة. إذن ميمي…", options: ["حيوان","طائر","سمكة","نبات"], answer: "حيوان" },
    { q: "كل الأزهار تحتاج ماء. الوردة زهرة. إذن الوردة…", options: ["تحتاج ماء","لا تحتاج ماء","ذابلة","بلا لون"], answer: "تحتاج ماء" },
    { q: "أحمد أطول من سامي، وسامي أطول من كريم. إذن أحمد…", options: ["أطول من كريم","أقصر من كريم","نفس طول كريم","لا نعرف"], answer: "أطول من كريم" },
    { q: "كل الأسماك تسبح. الحوت يسبح. هل الحوت سمكة؟", options: ["لا","نعم","ربما","لا نعرف"], answer: "لا" },
    { q: "كل الطيور لها أجنحة. البطريق طائر. إذن البطريق…", options: ["له أجنحة","يطير","لا يطير","ثديي"], answer: "له أجنحة" },
    { q: "الأخوان دائماً متشابهان؟", options: ["لا، ليس دائماً","نعم دائماً","فقط التوأم","لا أعرف"], answer: "لا، ليس دائماً" },
    { q: "كل المعلمين قرأوا كتباً. سعيد لم يقرأ كتباً. إذن سعيد…", options: ["ليس معلماً","معلم","طالب","لا نعرف"], answer: "ليس معلماً" },
    { q: "الأرقام الزوجية تقبل القسمة على 2. 7 فردي. إذن 7…", options: ["لا يقبل القسمة على 2","يقبل","زوجي","صفر"], answer: "لا يقبل القسمة على 2" },
    { q: "كل السيارات لها عجلات. الدراجة لها عجلات. هل الدراجة سيارة؟", options: ["لا","نعم","ربما","لا نعرف"], answer: "لا" },
    { q: "كل الأشجار لها جذور. النخلة شجرة. إذن النخلة…", options: ["لها جذور","لا جذور","زهرة","عشبة"], answer: "لها جذور" }
];

const LOGIC_OVER = [
    { q: "كل الفلاسفة عقلاء. بعض العقلاء أغنياء. إذن…", options: ["لا يمكن الجزم","كل الفلاسفة أغنياء","لا فلاسفة أغنياء","كل الأغنياء فلاسفة"], answer: "لا يمكن الجزم" },
    { q: "أليس تقول 'أنا أكذب دائماً'. هذا…", options: ["مفارقة منطقية","صحيحة","كاذبة","لا معنى لها"], answer: "مفارقة منطقية" },
    { q: "إذا كانت A > B، و B > C، فإن…", options: ["A > C","C > A","A = C","لا نعرف"], answer: "A > C" },
    { q: "كل المربعات مستطيلات. ليس كل مستطيل مربع. إذن…", options: ["صحيح","خطأ","لا نعرف","العكس صحيح"], answer: "صحيح" },
    { q: "5 أشخاص تصافحوا جميعاً. كم مصافحة؟", options: ["10","5","15","20"], answer: "10" },
    { q: "أب عمره ضعف ابنه. بعد 10 سنوات سيصبح 1.5 مرة. كم عمره الآن؟", options: ["40","30","50","20"], answer: "40" },
    { q: "قطار بسرعة 60 كم/س. كم يقطع في 30 دقيقة؟", options: ["30 كم","60 كم","20 كم","40 كم"], answer: "30 كم" },
    { q: "5 عمال ينجزون العمل في 10 أيام. 10 عمال كم يحتاجون؟", options: ["5 أيام","10 أيام","20 يوماً","15 يوماً"], answer: "5 أيام" },
    { q: "إذا كان 'صحيح' تعني 'خطأ'، فإن 'كل شي صحيح' تعني…", options: ["كل شي خطأ","كل شي صحيح","لا معنى","لا نعرف"], answer: "كل شي خطأ" },
    { q: "ساعة تتأخر 5 دقائق كل ساعة. بعد 12 ساعة، كم تأخرت؟", options: ["60 دقيقة","30 دقيقة","45 دقيقة","50 دقيقة"], answer: "60 دقيقة" }
];

LAUNCHERS.logic = function(container, game) {
    timeLimit = 15;
    const src = currentAgeGroup === 'under16' ? LOGIC_UNDER : LOGIC_OVER;
    const bank = [];
    while (bank.length < (currentAgeGroup === 'under16' ? 25 : 40)) bank.push(...src);
    const rounds = pick(bank, currentAgeGroup === 'under16' ? 5 : 10);
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
        if (sel === answer) { correct++; score += points; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 900);
    }

    render();
};

/* ============================================================
   23. التسلسل الزمني
   ============================================================ */
const TIMELINE = [
    { q: "رتب الأحداث:", items: ["استيقظت","تناولت الفطور","ذهبت للعمل","نمت"], answer: ["استيقظت","تناولت الفطور","ذهبت للعمل","نمت"] },
    { q: "رتب مراحل نمو النبات:", items: ["بذرة","برعم","نبتة","زهرة"], answer: ["بذرة","برعم","نبتة","زهرة"] },
    { q: "رتب مراحل حياة الفراشة:", items: ["بيضة","يرقة","شرنقة","فراشة"], answer: ["بيضة","يرقة","شرنقة","فراشة"] },
    { q: "رتب أوقات اليوم:", items: ["الفجر","الظهر","العصر","الليل"], answer: ["الفجر","الظهر","العصر","الليل"] },
    { q: "رتب الفصول:", items: ["الربيع","الصيف","الخريف","الشتاء"], answer: ["الربيع","الصيف","الخريف","الشتاء"] },
    { q: "رتب أيام الأسبوع:", items: ["الأحد","الاثنين","الثلاثاء","الأربعاء"], answer: ["الأحد","الاثنين","الثلاثاء","الأربعاء"] },
    { q: "رتب عملية الطبخ:", items: ["تحضير المكونات","الطبخ","التقديم","الأكل"], answer: ["تحضير المكونات","الطبخ","التقديم","الأكل"] },
    { q: "رتب مراحل بناء البيت:", items: ["الأساس","الجدران","السقف","التشطيب"], answer: ["الأساس","الجدران","السقف","التشطيب"] },
    { q: "رتب رحلة الطائرة:", items: ["الحجز","الوصول للمطار","الصعود","الإقلاع"], answer: ["الحجز","الوصول للمطار","الصعود","الإقلاع"] },
    { q: "رتب ترتيب الأرقام:", items: ["واحد","اثنان","ثلاثة","أربعة"], answer: ["واحد","اثنان","ثلاثة","أربعة"] }
];

LAUNCHERS.timeline = function(container, game) {
    timeLimit = 15;
    const bank = [];
    while (bank.length < 25) bank.push(...TIMELINE);
    const rounds = pick(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const correctStr = r.answer.join(' → ');
        const w1 = shuffle(r.answer).join(' → ');
        const w2 = [...r.answer].reverse().join(' → ');
        const w3 = [r.answer[1], r.answer[0], r.answer[3], r.answer[2]].join(' → ');
        let opts = [...new Set([correctStr, w1, w2, w3])];
        while (opts.length < 4) opts.push('ترتيب آخر');

        container.innerHTML = `
            <div style="width:100%;">
                <p class="question-number">السؤال ${idx + 1} من ${rounds.length}</p>
                <div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div>
                <p class="question-text">${r.q}</p>
                <div class="shape-display" style="font-size:20px;letter-spacing:2px;padding:20px 30px;">${shuffle(r.items).join(' • ')}</div>
                <div class="options-grid single-column">
                    ${shuffle(opts).map(o => `<button class="option-btn" data-answer="${o}" style="font-size:16px;">${o}</button>`).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => submit(btn.dataset.answer, correctStr);
        });

        startTimer(() => { wrong++; playWrong(); idx++; render(); });
    }

    function submit(sel, answer) {
        stopTimer();
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 900);
    }

    render();
};

/* ============================================================
   24. تعرف الأنماط البصرية
   ============================================================ */
const PAT_UNDER = [
    { q: "🔺 🔵 🔺 🔵 🔺 [ ؟ ]", options: ["🔵","🔺","⬛","⭐"], answer: "🔵" },
    { q: "⭐ ⭐ 🌙 ⭐ ⭐ 🌙 ⭐ [ ؟ ]", options: ["⭐","🌙","☀️","●"], answer: "⭐" },
    { q: "🔴 🟡 🔴 🟡 🔴 [ ؟ ]", options: ["🟡","🔴","🟢","⚫"], answer: "🟡" },
    { q: "▲ ■ ● ▲ ■ ● ▲ ■ [ ؟ ]", options: ["●","▲","■","◆"], answer: "●" },
    { q: "1 2 3 1 2 3 1 [ ؟ ]", options: ["2","1","3","4"], answer: "2" },
    { q: "🌟 🌟 🌟 🌙 🌟 🌟 🌟 [ ؟ ]", options: ["🌙","🌟","☀️","⭐"], answer: "🌙" },
    { q: "أ ب ت أ ب ت أ [ ؟ ]", options: ["ب","أ","ت","ث"], answer: "ب" },
    { q: "🔺 🔻 🔺 🔻 🔺 [ ؟ ]", options: ["🔻","🔺","◀","▶"], answer: "🔻" },
    { q: "🔵 🔵 🟢 🔵 🔵 🟢 🔵 🔵 [ ؟ ]", options: ["🟢","🔵","🟡","🔴"], answer: "🟢" },
    { q: "◼ ◼ ◻ ◼ ◼ ◻ ◼ ◼ [ ؟ ]", options: ["◻","◼","⚫","⚪"], answer: "◻" }
];

const PAT_OVER = [
    { q: "2 4 8 16 32 [ ؟ ]", options: ["64","48","60","72"], answer: "64" },
    { q: "1 1 2 3 5 8 13 [ ؟ ]", options: ["21","20","24","18"], answer: "21" },
    { q: "1 4 9 16 25 [ ؟ ]", options: ["36","30","32","40"], answer: "36" },
    { q: "3 6 12 24 48 [ ؟ ]", options: ["96","72","84","60"], answer: "96" },
    { q: "2 3 5 7 11 13 [ ؟ ]", options: ["17","15","19","16"], answer: "17" },
    { q: "1 8 27 64 [ ؟ ]", options: ["125","100","144","121"], answer: "125" },
    { q: "1 2 6 24 120 [ ؟ ]", options: ["720","600","480","360"], answer: "720" },
    { q: "0 1 1 2 3 5 8 [ ؟ ]", options: ["13","11","12","14"], answer: "13" },
    { q: "5 10 20 40 80 [ ؟ ]", options: ["160","120","140","100"], answer: "160" },
    { q: "2 5 10 17 26 [ ؟ ]", options: ["37","35","39","40"], answer: "37" }
];

LAUNCHERS.patterns = function(container, game) {
    timeLimit = 15;
    const src = currentAgeGroup === 'under16' ? PAT_UNDER : PAT_OVER;
    const bank = [];
    while (bank.length < (currentAgeGroup === 'under16' ? 25 : 55)) bank.push(...src);
    const rounds = pick(bank, currentAgeGroup === 'under16' ? 5 : 10);
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
        if (sel === answer) { correct++; score += points; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

console.log('%c✅ Part 2 Loaded', 'color:#7C3AED;font-weight:bold;');
/* ============================================================
   الجزء 3 — الألعاب (15-20)
   ============================================================ */

/* ============================================================
   25. الرمزان المتشابهان
   ============================================================ */
LAUNCHERS.twins = function(container, game) {
    timeLimit = 5;
    const SHAPES = ['A','B','C','D','E','F','G','H','K','M'];
    const bank = [];
    for (let i = 0; i < 30; i++) {
        const isSame = Math.random() < 0.5;
        const s1 = SHAPES[Math.floor(Math.random()*SHAPES.length)];
        let s2 = s1;
        if (!isSame) { do { s2 = SHAPES[Math.floor(Math.random()*SHAPES.length)]; } while (s2 === s1); }
        bank.push({ s1, s2, isSame });
    }
    const rounds = pick(bank, 5);

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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 600);
    }

    render();
};

/* ============================================================
   26. الرمز الغريب
   ============================================================ */
LAUNCHERS.odd = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 8 : 5;
    const bank = [];
    for (let i = 0; i < 30; i++) {
        const isUnder = currentAgeGroup === 'under16';
        const size = isUnder ? (3 + Math.floor(Math.random()*3)) : (5 + Math.floor(Math.random()*3));
        const total = size * size;
        bank.push({
            size, total,
            oddIndex: Math.floor(Math.random()*total),
            base: '●',
            odd: isUnder ? '◆' : '◇'
        });
    }
    const rounds = pick(bank, 5);

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
            cells += `<div class="memory-cell" data-i="${i}" style="height:${cellSize}px;width:${cellSize}px;display:flex;align-items:center;justify-content:center;font-size:${cellSize*0.55}px;font-weight:900;">${c}</div>`;
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
   27. الرمز المختفي
   ============================================================ */
LAUNCHERS.missing = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 10 : 5;
    const ALL = ['★','●','◆','▲','■','♥','✦','✱','⬟','⬢','◈','☾'];
    const bank = [];
    for (let i = 0; i < 30; i++) {
        const count = currentAgeGroup === 'under16' ? 5 : 7;
        const shown = pick(ALL, count);
        const absentPool = ALL.filter(s => !shown.includes(s));
        const absent = absentPool[Math.floor(Math.random()*absentPool.length)];
        const wrongs = pick(shown, 3);
        bank.push({ shown: shuffle(shown), absent, options: shuffle([absent, ...wrongs]) });
    }
    const rounds = pick(bank, 5);

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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   28. التطابق ضد الوقت
   ============================================================ */
LAUNCHERS.match = function(container, game) {
    timeLimit = 5;
    const ALL = ['★','●','◆','▲','■','♥','✦','✱','⬟','⬢'];
    const bank = [];
    for (let i = 0; i < 20; i++) {
        const target = ALL[Math.floor(Math.random()*ALL.length)];
        const wrongs = pick(ALL.filter(s => s !== target), 2);
        bank.push({ target, options: shuffle([target, ...wrongs]) });
    }
    const rounds = pick(bank, 5);

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
                    ${r.options.map(o => `<button class="option-btn" data-answer="${o}" style="font-size:52px;padding:24px;">${o}</button>`).join('')}
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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 700);
    }

    render();
};

/* ============================================================
   29. الأشكال المتداخلة
   ============================================================ */
LAUNCHERS.overlap = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 10 : 5;
    const SHAPES = ['circle', 'triangle', 'square', 'diamond'];
    const bank = [];
    for (let i = 0; i < 30; i++) {
        const count = 2 + Math.floor(Math.random()*3);
        const shapes = [];
        for (let j = 0; j < count; j++) shapes.push(SHAPES[Math.floor(Math.random()*SHAPES.length)]);
        const opts = new Set([count]);
        while (opts.size < 4) opts.add(1 + Math.floor(Math.random()*5));
        bank.push({ shapes, count, options: shuffle([...opts]) });
    }
    const rounds = pick(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const SZ = 260;
        const colors = ['#7C3AED', '#EC4899', '#A78BFA', '#F472B6'];
        const svg = r.shapes.map((sh, i) => {
            const cx = SZ/2 + (i - (r.shapes.length-1)/2) * 30;
            const cy = SZ/2 + (i % 2 === 0 ? -10 : 10);
            const size = 70 - i*8;
            const color = colors[i % colors.length];

            if (sh === 'circle') return `<circle cx="${cx}" cy="${cy}" r="${size}" stroke="${color}" stroke-width="4" fill="none"/>`;
            if (sh === 'triangle') { const h = size*1.7; return `<polygon points="${cx},${cy-h/2} ${cx-size},${cy+h/2} ${cx+size},${cy+h/2}" stroke="${color}" stroke-width="4" fill="none"/>`; }
            if (sh === 'square') return `<rect x="${cx-size}" y="${cy-size}" width="${size*2}" height="${size*2}" stroke="${color}" stroke-width="4" fill="none"/>`;
            if (sh === 'diamond') return `<polygon points="${cx},${cy-size} ${cx+size},${cy} ${cx},${cy+size} ${cx-size},${cy}" stroke="${color}" stroke-width="4" fill="none"/>`;
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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (parseInt(b.dataset.answer) === sel) b.classList.add('wrong'); if (parseInt(b.dataset.answer) === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   30. أعلى / أسفل
   ============================================================ */
LAUNCHERS.topdown = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 10 : 5;
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
        const picked = pick(ITEMS, 3);
        const askIdx = Math.floor(Math.random()*3);
        bank.push({
            stack: picked,
            askIdx,
            posName: ['الأعلى','الأوسط','الأسفل'][askIdx],
            answer: picked[askIdx].name,
            options: shuffle(picked.map(p => p.name))
        });
    }
    const rounds = pick(bank, 5);

    let idx = 0, score = 0, correct = 0, wrong = 0;
    const start = Date.now();

    function render() {
        stopTimer();
        if (idx >= rounds.length) {
            showResult(container, game, score, correct, wrong, Math.round((Date.now() - start) / 1000));
            return;
        }
        const r = rounds[idx];
        const stackHTML = r.stack.map((s, i) =>
            `<div style="font-size:64px;padding:6px 0;color:${['#7C3AED','#EC4899','#A78BFA'][i]};">${s.icon}</div>`
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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   31. أكمل النصف
   ============================================================ */
LAUNCHERS.half = function(container, game) {
    timeLimit = 5;
    const SHAPES = [
        { l: '◐', r: '◑' },
        { l: '◧', r: '◨' },
        { l: '⬒', r: '⬓' },
        { l: '◭', r: '◮' },
        { l: '⬖', r: '⬗' }
    ];
    const bank = [];
    for (let i = 0; i < 20; i++) {
        const s = SHAPES[Math.floor(Math.random()*SHAPES.length)];
        const wrongs = pick(SHAPES.filter(x => x.r !== s.r), 3).map(x => x.r);
        bank.push({ l: s.l, r: s.r, options: shuffle([s.r, ...wrongs]) });
    }
    const rounds = pick(bank, 5);

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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   32. القطع المفقودة
   ============================================================ */
LAUNCHERS.pieces = function(container, game) {
    timeLimit = currentAgeGroup === 'under16' ? 5 : 10;
    const UNDER = [
        { scene: '🚗', answer: 'عجلة', options: ['عجلة','باب','مرآة','مصباح'] },
        { scene: '🏠', answer: 'باب', options: ['باب','نافذة','سقف','مدخنة'] },
        { scene: '🌸', answer: 'بتلة', options: ['بتلة','ساق','ورقة','جذر'] },
        { scene: '🐦', answer: 'جناح', options: ['جناح','منقار','ذيل','عين'] },
        { scene: '🕐', answer: 'عقرب', options: ['عقرب','أرقام','إطار','زجاج'] },
        { scene: '🪑', answer: 'ساق', options: ['ساق','مسند','ظهر','ذراع'] },
        { scene: '🌳', answer: 'فرع', options: ['فرع','ورقة','جذر','لحاء'] },
        { scene: '🚲', answer: 'سلسلة', options: ['سلسلة','مقعد','عجلة','مقود'] },
        { scene: '📱', answer: 'شاشة', options: ['شاشة','بطارية','كاميرا','زر'] },
        { scene: '☂️', answer: 'مقبض', options: ['مقبض','قماش','قضيب','طرف'] }
    ];
    const OVER = [
        { scene: '🏛️', answer: 'عمود', options: ['عمود','سقف','أساس','قوس'] },
        { scene: '⌚', answer: 'سوار', options: ['سوار','عقارب','شاشة','تاج'] },
        { scene: '🎸', answer: 'وتر', options: ['وتر','رقبة','جسم','مفاتيح'] },
        { scene: '🖥️', answer: 'لوحة مفاتيح', options: ['لوحة مفاتيح','شاشة','فأرة','سماعة'] },
        { scene: '🚁', answer: 'مروحة', options: ['مروحة','مقصورة','ذيل','هيكل'] }
    ];
    const src = currentAgeGroup === 'under16' ? UNDER : OVER;
    const bank = [];
    while (bank.length < (currentAgeGroup === 'under16' ? 20 : 30)) bank.push(...src);
    const rounds = pick(bank, 5);

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
        if (sel === answer) { correct++; score += 20; playCorrect(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('correct'); }); }
        else { wrong++; playWrong(); buttons.forEach(b => { if (b.dataset.answer === sel) b.classList.add('wrong'); if (b.dataset.answer === answer) b.classList.add('correct'); }); }
        setTimeout(() => { idx++; render(); }, 800);
    }

    render();
};

/* ============================================================
   تشغيل صوت النقر عند الضغط على أي زر
   ============================================================ */
attachClickSound();

/* ============================================================
   تحديث الإحصائيات عند تحميل الصفحة
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});

/* ============================================================
   ✅ نهاية المشروع — كل الألعاب جاهزة
   ============================================================ */
console.log('%c🎉 MIND FORGE — كل الألعاب جاهزة (20 لعبة)', 'color:#EC4899;font-size:16px;font-weight:bold;');
console.log('%c🔊 الأصوات مفعّلة (نقرة + احتفال)', 'color:#7C3AED;font-weight:bold;');
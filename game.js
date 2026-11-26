/**
 * Snake Classic v2.0 - 经典贪吃蛇 2.0 增强版实现
 * 纯原生 JavaScript，无第三方依赖
 * 遵循 PRD-Snake.md 及 UI-DESIGN.md 设计规范
 */

// ========================
// 1. Web Audio 音效系统 (增强连击音阶)
// ========================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initContext();
    this.setupAutoResume();
  }

  initContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  setupAutoResume() {
    const resumeHandler = () => {
      this.resume();
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('keydown', resumeHandler, true);
        window.removeEventListener('touchstart', resumeHandler, true);
        window.removeEventListener('click', resumeHandler, true);
      }
    };
    window.addEventListener('keydown', resumeHandler, true);
    window.addEventListener('touchstart', resumeHandler, true);
    window.addEventListener('click', resumeHandler, true);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 移动转向音效
  playMove() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.03);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // 穿墙传送门音效（柔和瞬移波纹音）
  playPortal() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.07);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 吃普通果音效（随 comboMultiplier 逐级抬升音阶）
  playEat(comboLevel = 1) {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 音阶随 combo 抬升：半音阶阶梯系数
    // combo 1: 基础 587.33 (D5) -> 880 (A5)
    // combo 2: E5 -> B5
    // combo 3: F#5 -> C#6
    // combo 4: G5 -> D6
    // combo 5+: A5 -> E6
    const pitchScale = Math.pow(2, (Math.min(comboLevel, 5) - 1) * (2 / 12));
    const baseNotes = [587.33 * pitchScale, 880 * pitchScale];

    baseNotes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const gainVal = Math.min(0.24, 0.16 + (comboLevel - 1) * 0.02);
      gain.gain.setValueAtTime(gainVal, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.065);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.065);
    });

    if ('vibrate' in navigator) {
      try { navigator.vibrate(25 + comboLevel * 5); } catch (_) {}
    }
  }

  // 吃金色神果音效（华丽短琶音）
  playBonusEat() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const notes = [1046.50, 1318.51, 1567.98, 2093.00];
    notes.forEach((freq, index) => {
      const noteTime = now + index * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.12);
    });

    if ('vibrate' in navigator) {
      try { navigator.vibrate([40, 30, 60]); } catch (_) {}
    }
  }

  playBonusSpawn() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const notes = [440, 554, 659];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.1, 0.12);
      }, idx * 60);
    });
  }

  // 连击重置提醒（若有需要轻微低音）
  playComboDrop() {
    // 保持静默或轻柔音效
  }

  // 游戏结束音效（低沉爆裂/下行音）
  playGameOver() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.38);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);

    if ('vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 150]); } catch (_) {}
    }
  }
}

// ========================
// 2. 粒子与动效系统 (含 Shockwave 冲击波与像素碎裂)
// ========================
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
  }

  // 普通粒子喷溅
  spawn(x, y, color, count = 12, speed = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 2.5 + 1.5,
        color: color,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.03,
        shape: 'circle'
      });
    }
  }

  // 蛇身碎片炸裂粒子 (死亡时各节化作 4 个像素方块并散落)
  spawnShatter(snake, cellSize, getSegmentColor) {
    snake.forEach((seg, index) => {
      const segColor = getSegmentColor(index);
      const baseX = seg.x * cellSize;
      const baseY = seg.y * cellSize;
      const half = cellSize / 2;

      // 每节拆分成 4 块微粒
      const offsets = [
        { ox: 2, oy: 2 },
        { ox: half + 1, oy: 2 },
        { ox: 2, oy: half + 1 },
        { ox: half + 1, oy: half + 1 }
      ];

      offsets.forEach(off => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 3.5 + 1.2;
        this.particles.push({
          x: baseX + off.ox,
          y: baseY + off.oy,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 1.0, // 轻微向上跳跃初速度
          size: half - 2,
          color: segColor,
          life: 1.0,
          decay: Math.random() * 0.025 + 0.02,
          shape: 'square',
          gravity: 0.15
        });
      });
    });
  }

  // 局部 Shockwave 冲击波光环 (从半径 4px 扩散至 26px，透明度 0.8 -> 0)
  spawnShockwave(x, y, color = '#38bdf8', maxRadius = 26, duration = 220) {
    this.shockwaves.push({
      x: x,
      y: y,
      color: color,
      radius: 4,
      maxRadius: maxRadius,
      duration: duration,
      startTime: performance.now(),
      progress: 0
    });
  }

  update(now = performance.now()) {
    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) {
        p.vy += p.gravity;
      }
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 更新冲击波
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      const elapsed = now - sw.startTime;
      sw.progress = Math.min(1.0, elapsed / sw.duration);
      sw.radius = 4 + (sw.maxRadius - 4) * Math.sin((sw.progress * Math.PI) / 2); // ease-out
      if (sw.progress >= 1.0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // 绘制冲击波
    for (const sw of this.shockwaves) {
      const alpha = (1.0 - sw.progress) * 0.85;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5 * (1.0 - sw.progress * 0.5);
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 绘制粒子
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      if (p.shape === 'square') {
        const s = p.size * Math.max(0.2, p.life);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.shockwaves = [];
  }
}

// ========================
// 3. 游戏主核心逻辑 (SnakeGame 2.0)
// ========================
class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasWrapper = document.getElementById('canvasWrapper');

    // 20x20 标准网格系统
    this.GRID_SIZE = 20;
    this.CELL_SIZE = this.canvas.width / this.GRID_SIZE; // 400 / 20 = 20px

    // 音效与粒子
    this.sound = new SoundFX();
    this.particles = new ParticleSystem();

    // 难度配置
    this.DIFFICULTY_CONFIG = {
      easy: { baseSpeed: 200, dynamicSpeed: false, label: '简单' },
      normal: { baseSpeed: 150, dynamicSpeed: true, minSpeed: 80, label: '普通' },
      hard: { baseSpeed: 100, dynamicSpeed: false, label: '困难' }
    };

    // 2.0 状态配置
    this.theme = 'cyberpunk';       // cyberpunk, gameboy, paper, rainbow
    this.mapMode = 'empty';          // empty, pillar, cross, maze
    this.boundaryMode = 'hard';      // hard (碰壁死亡), portal (穿墙传送)
    this.difficulty = 'normal';

    this.state = 'INIT';            // INIT, RUNNING, PAUSED, GAMEOVER
    this.score = 0;
    this.bestScore = 0;
    this.speed = 150;
    this.lastStepTime = 0;

    // Combo 连击系统 (3.5s 倒计时, x2 ~ x5)
    this.COMBO_WINDOW = 3.5;         // 秒
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.maxComboReached = 1;

    // 实体
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.inputQueue = [];
    this.food = null;
    this.bonusFood = null;
    this.obstacles = [];
    this.floatingTexts = [];

    // 初始化
    this.loadStorage();
    this.initDOMElements();
    this.initEventListeners();
    this.applyTheme(this.theme);
    this.applyBoundaryMode(this.boundaryMode);
    this.loadMapObstacles();
    this.render();

    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  // 4 种地图结构障碍物生成器 (避开开局起始蛇身区 x:4~7, y:9~11)
  loadMapObstacles() {
    this.obstacles = [];
    if (this.mapMode === 'empty') {
      // 经典空旷：无任何内部障碍
      return;
    }

    if (this.mapMode === 'pillar') {
      // 中央立柱：中心 2x2 实心立方 (9,9) 到 (10,10)
      this.obstacles.push({ x: 9, y: 9 });
      this.obstacles.push({ x: 10, y: 9 });
      this.obstacles.push({ x: 9, y: 10 });
      this.obstacles.push({ x: 10, y: 10 });
    } else if (this.mapMode === 'cross') {
      // 十字隔墙：从中心向四向延展的断开立柱（留出内部回环通道）
      // 水平隔墙（左右两侧断开立柱）
      for (let x = 4; x <= 7; x++) {
        this.obstacles.push({ x: x, y: 6 });
      }
      for (let x = 12; x <= 15; x++) {
        this.obstacles.push({ x: x, y: 14 });
      }
      // 垂直隔墙（上下两侧断开立柱）
      for (let y = 3; y <= 6; y++) {
        this.obstacles.push({ x: 14, y: y });
      }
      for (let y = 13; y <= 16; y++) {
        this.obstacles.push({ x: 5, y: y });
      }
    } else if (this.mapMode === 'maze') {
      // 迷宫通道：四角与内环形成拐角阻隔，考验精细操作
      // 左上角 L 型
      this.obstacles.push({ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 });
      // 右上角 L 型
      this.obstacles.push({ x: 16, y: 3 }, { x: 15, y: 3 }, { x: 14, y: 3 }, { x: 16, y: 4 }, { x: 16, y: 5 });
      // 左下角 L 型
      this.obstacles.push({ x: 3, y: 16 }, { x: 4, y: 16 }, { x: 5, y: 16 }, { x: 3, y: 15 }, { x: 3, y: 14 });
      // 右下角 L 型
      this.obstacles.push({ x: 16, y: 16 }, { x: 15, y: 16 }, { x: 14, y: 16 }, { x: 16, y: 15 }, { x: 16, y: 14 });
      // 中心阻隔段 (避开起始行 y=10)
      this.obstacles.push({ x: 8, y: 6 }, { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 });
      this.obstacles.push({ x: 8, y: 13 }, { x: 9, y: 13 }, { x: 10, y: 13 }, { x: 11, y: 13 });
    }
  }

  initDOMElements() {
    this.elCurrentScore = document.getElementById('currentScore');
    this.elBestScore = document.getElementById('bestScore');
    this.elDifficulty = document.getElementById('difficultySelect');
    this.elThemeSelect = document.getElementById('themeSelect');
    this.elMapSelect = document.getElementById('mapSelect');
    this.elBoundaryHardBtn = document.getElementById('boundaryHardBtn');
    this.elBoundaryPortalBtn = document.getElementById('boundaryPortalBtn');

    this.elSoundToggle = document.getElementById('soundToggleBtn');
    this.elSoundIcon = document.getElementById('soundIcon');
    this.elLeaderboardBtn = document.getElementById('leaderboardBtn');

    this.elComboContainer = document.getElementById('comboContainer');
    this.elComboBadge = document.getElementById('comboBadge');
    this.elComboTimerText = document.getElementById('comboTimerText');
    this.elComboProgressBar = document.getElementById('comboProgressBar');

    this.elOverlay = document.getElementById('overlay');
    this.elStartScreen = document.getElementById('startScreen');
    this.elPauseScreen = document.getElementById('pauseScreen');
    this.elGameOverScreen = document.getElementById('gameOverScreen');

    this.elStartBtn = document.getElementById('startBtn');
    this.elResumeBtn = document.getElementById('resumeBtn');
    this.elRestartFromPauseBtn = document.getElementById('restartFromPauseBtn');
    this.elRestartBtn = document.getElementById('restartBtn');
    this.elGameOverLeaderboardBtn = document.getElementById('gameOverLeaderboardBtn');

    this.elFinalScore = document.getElementById('finalScore');
    this.elFinalMaxCombo = document.getElementById('finalMaxCombo');
    this.elFinalMapMode = document.getElementById('finalMapMode');
    this.elFinalDifficulty = document.getElementById('finalDifficulty');
    this.elNewRecordBadge = document.getElementById('newRecordBadge');

    this.elBonusContainer = document.getElementById('bonusBarContainer');
    this.elBonusTimerText = document.getElementById('bonusTimerText');
    this.elBonusProgressBar = document.getElementById('bonusProgressBar');

    // 排行榜模态框
    this.elModal = document.getElementById('leaderboardModal');
    this.elModalBackdrop = document.getElementById('modalBackdrop');
    this.elCloseModalBtn = document.getElementById('closeModalBtn');
    this.elLeaderboardBody = document.getElementById('leaderboardBody');
    this.elEmptyLeaderboard = document.getElementById('emptyLeaderboard');
    this.elClearLeaderboard = document.getElementById('clearLeaderboardBtn');

    this.elBestScore.textContent = this.bestScore;
  }

  loadStorage() {
    try {
      this.bestScore = parseInt(localStorage.getItem('snake_best_score') || '0', 10);
      const rawRecords = localStorage.getItem('snake_leaderboard_top5');
      this.leaderboard = rawRecords ? JSON.parse(rawRecords) : [];
      const savedTheme = localStorage.getItem('snake_theme');
      if (savedTheme) this.theme = savedTheme;
      const savedBoundary = localStorage.getItem('snake_boundary');
      if (savedBoundary) this.boundaryMode = savedBoundary;
      const savedMap = localStorage.getItem('snake_map');
      if (savedMap) this.mapMode = savedMap;
    } catch (e) {
      this.bestScore = 0;
      this.leaderboard = [];
    }
  }

  saveRecord(score, difficulty) {
    if (score <= 0) return false;

    let isNewBest = false;
    if (score > this.bestScore) {
      this.bestScore = score;
      localStorage.setItem('snake_best_score', this.bestScore.toString());
      this.elBestScore.textContent = this.bestScore;
      isNewBest = true;
    }

    const mapNames = {
      empty: '经典空旷',
      pillar: '中央立柱',
      cross: '十字隔墙',
      maze: '迷宫通道'
    };
    const boundaryNames = {
      hard: '硬墙',
      portal: '穿墙'
    };

    const newEntry = {
      score: score,
      difficulty: `${this.DIFFICULTY_CONFIG[difficulty]?.label || difficulty} · ${mapNames[this.mapMode] || this.mapMode} (${boundaryNames[this.boundaryMode]})`,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    this.leaderboard.push(newEntry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 5);

    try {
      localStorage.setItem('snake_leaderboard_top5', JSON.stringify(this.leaderboard));
    } catch (_) {}

    return isNewBest;
  }

  applyTheme(themeName) {
    this.theme = themeName;
    document.body.setAttribute('data-theme', themeName);
    if (this.elThemeSelect) {
      this.elThemeSelect.value = themeName;
    }
    try {
      localStorage.setItem('snake_theme', themeName);
    } catch (_) {}
  }

  applyBoundaryMode(mode) {
    this.boundaryMode = mode;
    if (this.boundaryMode === 'portal') {
      this.canvasWrapper.classList.remove('hard-boundary');
      this.canvasWrapper.classList.add('portal-boundary');
      this.elBoundaryHardBtn.classList.remove('active');
      this.elBoundaryPortalBtn.classList.add('active');
    } else {
      this.canvasWrapper.classList.remove('portal-boundary');
      this.canvasWrapper.classList.add('hard-boundary');
      this.elBoundaryPortalBtn.classList.remove('active');
      this.elBoundaryHardBtn.classList.add('active');
    }
    try {
      localStorage.setItem('snake_boundary', mode);
    } catch (_) {}
  }

  applyMapMode(mapName) {
    this.mapMode = mapName;
    if (this.elMapSelect) {
      this.elMapSelect.value = mapName;
    }
    this.loadMapObstacles();
    try {
      localStorage.setItem('snake_map', mapName);
    } catch (_) {}
    if (this.state === 'INIT' || this.state === 'GAMEOVER') {
      this.resetGame();
    }
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 主题切换
    this.elThemeSelect.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });

    // 地图切换
    this.elMapSelect.addEventListener('change', (e) => {
      this.applyMapMode(e.target.value);
    });

    // 边界模式切换
    this.elBoundaryHardBtn.addEventListener('click', () => {
      this.applyBoundaryMode('hard');
    });
    this.elBoundaryPortalBtn.addEventListener('click', () => {
      this.applyBoundaryMode('portal');
    });

    // 难度切换
    this.elDifficulty.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      if (this.state === 'INIT' || this.state === 'GAMEOVER') {
        this.resetGame();
      }
    });

    // 音效切换
    this.elSoundToggle.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.elSoundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.elSoundToggle.classList.toggle('muted', isMuted);
    });

    // 按钮交互
    this.elStartBtn.addEventListener('click', () => this.startGame());
    this.elResumeBtn.addEventListener('click', () => this.resumeGame());
    this.elRestartFromPauseBtn.addEventListener('click', () => {
      this.resetGame();
      this.startGame();
    });
    this.elRestartBtn.addEventListener('click', () => {
      this.resetGame();
      this.startGame();
    });

    if (this.elGameOverLeaderboardBtn) {
      this.elGameOverLeaderboardBtn.addEventListener('click', () => this.openLeaderboard());
    }

    this.elLeaderboardBtn.addEventListener('click', () => this.openLeaderboard());
    this.elCloseModalBtn.addEventListener('click', () => this.closeLeaderboard());
    this.elModalBackdrop.addEventListener('click', () => this.closeLeaderboard());
    this.elClearLeaderboard.addEventListener('click', () => {
      if (confirm('确定要清空 TOP 5 本地排行榜数据吗？')) {
        this.leaderboard = [];
        localStorage.removeItem('snake_leaderboard_top5');
        this.renderLeaderboard();
      }
    });

    // 虚拟按键绑定
    const bindDpad = (id, fn) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const trigger = (e) => {
        e.preventDefault();
        fn();
      };
      btn.addEventListener('touchstart', trigger, { passive: false });
      btn.addEventListener('mousedown', trigger);
    };

    bindDpad('dpadUp', () => this.changeDirection(0, -1));
    bindDpad('dpadDown', () => this.changeDirection(0, 1));
    bindDpad('dpadLeft', () => this.changeDirection(-1, 0));
    bindDpad('dpadRight', () => this.changeDirection(1, 0));
    bindDpad('dpadPause', () => this.togglePause());

    // 触屏滑动监听
    let touchStartX = 0;
    let touchStartY = 0;
    const canvasWrap = this.canvasWrapper;

    canvasWrap.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvasWrap.addEventListener('touchend', (e) => {
      if (this.state !== 'RUNNING') return;
      if (!touchStartX || !touchStartY || e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 25) {
        if (absDx > absDy) {
          if (dx > 0) this.changeDirection(1, 0);
          else this.changeDirection(-1, 0);
        } else {
          if (dy > 0) this.changeDirection(0, 1);
          else this.changeDirection(0, -1);
        }
      }
    }, { passive: true });
  }

  handleKeyDown(e) {
    if (e.key === 'm' || e.key === 'M') {
      this.elSoundToggle.click();
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (this.state === 'INIT' || this.state === 'GAMEOVER') {
        this.resetGame();
        this.startGame();
      } else {
        this.togglePause();
      }
      return;
    }

    const key = e.key;
    const code = e.code;

    if (code === 'KeyW' || key === 'w' || key === 'W' || key === 'ArrowUp') {
      e.preventDefault();
      this.changeDirection(0, -1);
    } else if (code === 'KeyS' || key === 's' || key === 'S' || key === 'ArrowDown') {
      e.preventDefault();
      this.changeDirection(0, 1);
    } else if (code === 'KeyA' || key === 'a' || key === 'A' || key === 'ArrowLeft') {
      e.preventDefault();
      this.changeDirection(-1, 0);
    } else if (code === 'KeyD' || key === 'd' || key === 'D' || key === 'ArrowRight') {
      e.preventDefault();
      this.changeDirection(1, 0);
    }
  }

  changeDirection(x, y) {
    if (this.state !== 'RUNNING') return;

    const lastTarget = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.dir;

    if (x !== 0 && lastTarget.x !== 0 && x === -lastTarget.x) return;
    if (y !== 0 && lastTarget.y !== 0 && y === -lastTarget.y) return;
    if (x === lastTarget.x && y === lastTarget.y) return;

    if (this.inputQueue.length < 2) {
      this.inputQueue.push({ x, y });
    }
  }

  resetGame() {
    const config = this.DIFFICULTY_CONFIG[this.difficulty];
    this.speed = config.baseSpeed;
    this.score = 0;
    this.elCurrentScore.textContent = '0';

    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.maxComboReached = 1;
    this.hideComboBar();

    const startX = 6;
    const startY = 10;
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
    this.dir = { x: 1, y: 0 };
    this.inputQueue = [];

    this.bonusFood = null;
    this.hideBonusBar();
    this.particles.clear();
    this.floatingTexts = [];

    this.loadMapObstacles();
    this.spawnFood();
  }

  startGame() {
    this.sound.resume();
    this.resetGame();
    this.state = 'RUNNING';
    this.hideOverlay();
    this.lastStepTime = performance.now();
  }

  togglePause() {
    if (this.state === 'RUNNING') {
      this.state = 'PAUSED';
      this.showPauseScreen();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'RUNNING';
      this.hideOverlay();
      this.lastStepTime = performance.now();
    }
  }

  // 触发撞击/死亡屏幕微震颤 (Screen Shake 160ms)
  triggerScreenShake() {
    this.canvasWrapper.classList.remove('screen-shake');
    // 强制 reflow 以便重新触发动画
    void this.canvasWrapper.offsetWidth;
    this.canvasWrapper.classList.add('screen-shake');
    setTimeout(() => {
      this.canvasWrapper.classList.remove('screen-shake');
    }, 180);
  }

  // 死亡处理：屏幕微震 + 蛇身碎片解体爆炸飞散 + 结算
  gameOver() {
    this.state = 'GAMEOVER';
    this.sound.playGameOver();
    this.triggerScreenShake();

    // 蛇身各节化作 4 个像素碎片炸裂散落
    this.particles.spawnShatter(this.snake, this.CELL_SIZE, (idx) => this.getSegmentColor(idx));

    const isNewBest = this.saveRecord(this.score, this.difficulty);
    setTimeout(() => {
      this.showGameOverScreen(isNewBest);
    }, 280);
  }

  getRandomEmptyPosition() {
    const occupied = new Set();
    this.snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
    this.obstacles.forEach(obs => occupied.add(`${obs.x},${obs.y}`));
    if (this.food) occupied.add(`${this.food.x},${this.food.y}`);
    if (this.bonusFood) occupied.add(`${this.bonusFood.x},${this.bonusFood.y}`);

    const emptyPositions = [];
    for (let x = 0; x < this.GRID_SIZE; x++) {
      for (let y = 0; y < this.GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          emptyPositions.push({ x, y });
        }
      }
    }

    if (emptyPositions.length === 0) return null;
    const idx = Math.floor(Math.random() * emptyPositions.length);
    return emptyPositions[idx];
  }

  spawnFood() {
    const pos = this.getRandomEmptyPosition();
    if (pos) {
      this.food = pos;
    }
  }

  trySpawnBonusFood() {
    if (this.bonusFood) return;

    if (Math.random() < 0.28) {
      const pos = this.getRandomEmptyPosition();
      if (pos) {
        this.bonusFood = {
          x: pos.x,
          y: pos.y,
          timeLeft: 5.0,
          maxTime: 5.0
        };
        this.sound.playBonusSpawn();
        this.showBonusBar();
      }
    }
  }

  // 浮动跳字系统 (+10 / CRITICAL! / +20 COMBO! 上浮淡出)
  addFloatingText(x, y, text, color, isCritical = false) {
    this.floatingTexts.push({
      x: x * this.CELL_SIZE + this.CELL_SIZE / 2,
      y: y * this.CELL_SIZE,
      text: text,
      color: color,
      life: 1.0,
      vy: -1.3,
      isCritical: isCritical
    });
  }

  // Combo 连击更新与计时
  onFoodEaten() {
    this.comboCount++;
    this.comboTimer = this.COMBO_WINDOW;

    // 连击倍率计算：1次->x1, 2次->x2, 3次->x3, 4次->x4, 5次及以上->x5 (最高 x5)
    this.comboMultiplier = Math.min(5, this.comboCount);
    if (this.comboMultiplier > this.maxComboReached) {
      this.maxComboReached = this.comboMultiplier;
    }

    this.showComboBar();
    return this.comboMultiplier;
  }

  step() {
    if (this.inputQueue.length > 0) {
      const targetDir = this.inputQueue.shift();
      if (!(targetDir.x !== 0 && this.dir.x !== 0 && targetDir.x === -this.dir.x) &&
          !(targetDir.y !== 0 && this.dir.y !== 0 && targetDir.y === -this.dir.y)) {
        if (targetDir.x !== this.dir.x || targetDir.y !== this.dir.y) {
          this.sound.playMove();
        }
        this.dir = targetDir;
      }
    }

    const head = this.snake[0];
    let nextX = head.x + this.dir.x;
    let nextY = head.y + this.dir.y;

    // 双边界模式判定：硬边界 vs 穿墙模式
    if (this.boundaryMode === 'portal') {
      let teleported = false;
      if (nextX < 0) {
        nextX = this.GRID_SIZE - 1;
        teleported = true;
      } else if (nextX >= this.GRID_SIZE) {
        nextX = 0;
        teleported = true;
      }

      if (nextY < 0) {
        nextY = this.GRID_SIZE - 1;
        teleported = true;
      } else if (nextY >= this.GRID_SIZE) {
        nextY = 0;
        teleported = true;
      }

      if (teleported) {
        this.sound.playPortal();
        // 传送出入口光效粒子
        this.particles.spawn(
          nextX * this.CELL_SIZE + this.CELL_SIZE / 2,
          nextY * this.CELL_SIZE + this.CELL_SIZE / 2,
          this.getThemeTokens().portal,
          10,
          2.5
        );
      }
    } else {
      // 硬边界模式：撞墙死亡
      if (
        nextX < 0 ||
        nextX >= this.GRID_SIZE ||
        nextY < 0 ||
        nextY >= this.GRID_SIZE
      ) {
        this.gameOver();
        return;
      }
    }

    const newHead = { x: nextX, y: nextY };

    // 碰撞自身检测
    for (let i = 0; i < this.snake.length; i++) {
      if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
        this.gameOver();
        return;
      }
    }

    // 碰撞障碍物检测
    for (const obs of this.obstacles) {
      if (newHead.x === obs.x && newHead.y === obs.y) {
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(newHead);
    let ateFood = false;

    // 吃普通红苹果
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      ateFood = true;

      // Combo 累加与倍率
      const multiplier = this.onFoodEaten();
      const basePoints = 10;
      const earnedScore = basePoints * multiplier;
      this.score += earnedScore;
      this.elCurrentScore.textContent = this.score;

      this.elCurrentScore.classList.add('score-bump');
      setTimeout(() => this.elCurrentScore.classList.remove('score-bump'), 150);

      // Web Audio 音频音阶随 Combo 层数逐级升高
      this.sound.playEat(multiplier);

      const centerFoodX = newHead.x * this.CELL_SIZE + this.CELL_SIZE / 2;
      const centerFoodY = newHead.y * this.CELL_SIZE + this.CELL_SIZE / 2;

      // 局部 Shockwave 冲击波光环
      this.particles.spawnShockwave(
        centerFoodX,
        centerFoodY,
        multiplier >= 4 ? '#fbbf24' : this.getThemeTokens().snakeHead,
        28,
        220
      );

      // 食物吃掉时的爆裂粒子
      this.particles.spawn(
        centerFoodX,
        centerFoodY,
        this.getThemeTokens().foodApple,
        14,
        3.5
      );

      // 浮动跳字
      if (multiplier > 1) {
        const text = multiplier >= 4 ? `CRITICAL! +${earnedScore}` : `+${earnedScore} (x${multiplier})`;
        this.addFloatingText(newHead.x, newHead.y, text, multiplier >= 4 ? '#fbbf24' : '#38bdf8', multiplier >= 4);
      } else {
        this.addFloatingText(newHead.x, newHead.y, `+${earnedScore}`, '#38bdf8', false);
      }

      this.spawnFood();
      this.trySpawnBonusFood();

      const config = this.DIFFICULTY_CONFIG[this.difficulty];
      if (config.dynamicSpeed) {
        const speedDeduction = Math.floor(this.score / 50) * 12;
        this.speed = Math.max(config.minSpeed, config.baseSpeed - speedDeduction);
      }
    }

    // 吃金色限时果
    if (this.bonusFood && newHead.x === this.bonusFood.x && newHead.y === this.bonusFood.y) {
      ateFood = true;
      const multiplier = this.onFoodEaten();
      const basePoints = 30;
      const earnedScore = basePoints * multiplier;
      this.score += earnedScore;
      this.elCurrentScore.textContent = this.score;

      this.elCurrentScore.classList.add('score-bump');
      setTimeout(() => this.elCurrentScore.classList.remove('score-bump'), 150);

      this.sound.playBonusEat();

      const centerFoodX = newHead.x * this.CELL_SIZE + this.CELL_SIZE / 2;
      const centerFoodY = newHead.y * this.CELL_SIZE + this.CELL_SIZE / 2;

      this.particles.spawnShockwave(centerFoodX, centerFoodY, '#fbbf24', 36, 250);

      this.particles.spawn(
        centerFoodX,
        centerFoodY,
        '#fbbf24',
        22,
        4.5
      );

      this.addFloatingText(newHead.x, newHead.y, `★ GOLDEN +${earnedScore} (x${multiplier})`, '#fbbf24', true);

      this.bonusFood = null;
      this.hideBonusBar();
    }

    if (!ateFood) {
      this.snake.pop();
    }
  }

  gameLoop(currentTime) {
    const deltaTime = (currentTime - (this.lastFrameTime || currentTime)) / 1000;
    this.lastFrameTime = currentTime;

    if (this.state === 'RUNNING') {
      // Combo 计时衰减
      if (this.comboTimer > 0) {
        this.comboTimer -= deltaTime;
        if (this.comboTimer <= 0) {
          this.comboTimer = 0;
          this.comboCount = 0;
          this.comboMultiplier = 1;
          this.hideComboBar();
        } else {
          this.updateComboBar();
        }
      }

      // 金果限时衰减
      if (this.bonusFood) {
        this.bonusFood.timeLeft -= deltaTime;
        if (this.bonusFood.timeLeft <= 0) {
          this.bonusFood = null;
          this.hideBonusBar();
        } else {
          this.updateBonusBar(this.bonusFood.timeLeft, this.bonusFood.maxTime);
        }
      }

      if (currentTime - this.lastStepTime >= this.speed) {
        this.step();
        this.lastStepTime = currentTime;
      }
    }

    this.particles.update(currentTime);

    // 浮动跳字更新
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.025;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.render();
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  // 获得当前主题的色彩 Token
  getThemeTokens() {
    switch (this.theme) {
      case 'gameboy':
        return {
          bgBoard: '#8bac0f',
          gridLine: 'rgba(15, 56, 15, 0.1)',
          snakeHead: '#0f380f',
          snakeHeadGlow: 'transparent',
          snakeBody: '#306230',
          snakeEye: '#8bac0f',
          snakePupil: '#0f380f',
          snakeTongue: '#0f380f',
          foodApple: '#0f380f',
          foodAppleGlow: 'transparent',
          foodGolden: '#306230',
          foodGoldenGlow: 'transparent',
          obstacle: '#0f380f',
          obstacleBorder: '#306230',
          portal: 'rgba(15, 56, 15, 0.5)'
        };
      case 'paper':
        return {
          bgBoard: '#f1f5f9',
          gridLine: 'rgba(15, 23, 42, 0.04)',
          snakeHead: '#1e293b',
          snakeHeadGlow: 'rgba(0, 0, 0, 0.15)',
          snakeBody: '#475569',
          snakeEye: '#ffffff',
          snakePupil: '#0f172a',
          snakeTongue: '#dc2626',
          foodApple: '#dc2626',
          foodAppleGlow: 'rgba(220, 38, 38, 0.25)',
          foodGolden: '#d97706',
          foodGoldenGlow: 'rgba(217, 119, 6, 0.3)',
          obstacle: '#94a3b8',
          obstacleBorder: '#64748b',
          portal: 'rgba(37, 99, 235, 0.4)'
        };
      case 'rainbow':
        return {
          bgBoard: '#0c0a1f',
          gridLine: 'rgba(236, 72, 153, 0.06)',
          snakeHead: '#ec4899',
          snakeHeadGlow: 'rgba(236, 72, 153, 0.75)',
          snakeBody: 'rainbow',
          snakeEye: '#ffffff',
          snakePupil: '#0c0a1f',
          snakeTongue: '#38bdf8',
          foodApple: '#f43f5e',
          foodAppleGlow: 'rgba(244, 63, 94, 0.8)',
          foodGolden: '#facc15',
          foodGoldenGlow: 'rgba(250, 204, 21, 0.9)',
          obstacle: '#312e81',
          obstacleBorder: '#6366f1',
          portal: 'rgba(236, 72, 153, 0.6)'
        };
      case 'cyberpunk':
      default:
        return {
          bgBoard: '#070a10',
          gridLine: 'rgba(255, 255, 255, 0.035)',
          snakeHead: '#22c55e',
          snakeHeadGlow: 'rgba(34, 197, 94, 0.6)',
          snakeBody: '#4ade80',
          snakeEye: '#ffffff',
          snakePupil: '#070a10',
          snakeTongue: '#f43f5e',
          foodApple: '#ef4444',
          foodAppleGlow: 'rgba(239, 68, 68, 0.7)',
          foodGolden: '#fbbf24',
          foodGoldenGlow: 'rgba(251, 191, 36, 0.85)',
          obstacle: '#475569',
          obstacleBorder: '#64748b',
          portal: 'rgba(56, 189, 248, 0.5)'
        };
    }
  }

  getSegmentColor(index) {
    if (this.theme === 'rainbow') {
      // 动态彩虹色相偏移：hsl((index * 15) % 360, 90%, 60%)
      return `hsl(${(index * 16) % 360}, 92%, 60%)`;
    }
    const tokens = this.getThemeTokens();
    return index === 0 ? tokens.snakeHead : tokens.snakeBody;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cs = this.CELL_SIZE;
    const tokens = this.getThemeTokens();

    // 清屏与主题棋盘底色
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = tokens.bgBoard;
    ctx.fillRect(0, 0, w, h);

    // 点阵网格线
    ctx.strokeStyle = tokens.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0);
      ctx.lineTo(i * cs, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cs);
      ctx.lineTo(w, i * cs);
      ctx.stroke();
    }

    // 绘制障碍物
    for (const obs of this.obstacles) {
      this.drawObstacle(obs.x * cs, obs.y * cs, cs, tokens);
    }

    // 绘制普通苹果
    if (this.food) {
      this.drawFood(this.food.x * cs, this.food.y * cs, cs, tokens);
    }

    // 绘制限时金色神果
    if (this.bonusFood) {
      this.drawBonusFood(this.bonusFood.x * cs, this.bonusFood.y * cs, cs, tokens);
    }

    // 绘制蛇身与生动蛇头 (朝向眼睛 + 周期吐信)
    this.drawSnake(tokens);

    // 粒子与 Shockwave 冲击波
    this.particles.draw(ctx);

    // 浮动跳字
    this.drawFloatingTexts();
  }

  drawObstacle(x, y, s, tokens) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = tokens.obstacle;
    ctx.strokeStyle = tokens.obstacleBorder;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, 4);
    ctx.fill();
    ctx.stroke();

    // 内部对角机械纹理
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + s - 3, y + s - 3);
    ctx.moveTo(x + s - 3, y + 3);
    ctx.lineTo(x + 3, y + s - 3);
    ctx.stroke();
    ctx.restore();
  }

  drawFood(x, y, s, tokens) {
    const ctx = this.ctx;
    const time = performance.now() * 0.005;
    const pulse = Math.sin(time) * 1.2;

    ctx.save();
    if (tokens.foodAppleGlow !== 'transparent') {
      ctx.shadowColor = tokens.foodAppleGlow;
      ctx.shadowBlur = 10 + pulse * 2;
    }
    ctx.fillStyle = tokens.foodApple;

    const cx = x + s / 2;
    const cy = y + s / 2;
    const r = (s / 2 - 3) + pulse;

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, r), 0, Math.PI * 2);
    ctx.fill();

    // 食物高光
    if (this.theme !== 'gameboy') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBonusFood(x, y, s, tokens) {
    const ctx = this.ctx;
    const time = performance.now() * 0.008;
    const cx = x + s / 2;
    const cy = y + s / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time);

    if (tokens.foodGoldenGlow !== 'transparent') {
      ctx.shadowColor = tokens.foodGoldenGlow;
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = tokens.foodGolden;

    const r = s / 2 - 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * r, Math.sin((i * Math.PI) / 2) * r);
      ctx.lineTo(
        Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (r * 0.45),
        Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (r * 0.45)
      );
    }
    ctx.closePath();
    ctx.fill();

    if (this.theme !== 'gameboy') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSnake(tokens) {
    const ctx = this.ctx;
    const cs = this.CELL_SIZE;

    // 绘制蛇身（从尾到头）
    for (let i = this.snake.length - 1; i >= 1; i--) {
      const seg = this.snake[i];
      const x = seg.x * cs;
      const y = seg.y * cs;
      const segColor = this.getSegmentColor(i);

      ctx.save();
      ctx.fillStyle = segColor;
      if (tokens.snakeHeadGlow !== 'transparent' && this.theme !== 'paper') {
        ctx.shadowColor = segColor;
        ctx.shadowBlur = 4;
      }
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, cs - 3, cs - 3, 4);
      ctx.fill();
      ctx.restore();
    }

    // 绘制蛇头（Head Dynamics: 灵动眼睛 + 朝向瞳孔 + 周期吐信）
    if (this.snake.length > 0) {
      const head = this.snake[0];
      const hx = head.x * cs;
      const hy = head.y * cs;
      const headColor = tokens.snakeHead;

      ctx.save();
      if (tokens.snakeHeadGlow !== 'transparent') {
        ctx.shadowColor = tokens.snakeHeadGlow;
        ctx.shadowBlur = 9;
      }
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.roundRect(hx + 1, hy + 1, cs - 2, cs - 2, 5);
      ctx.fill();
      ctx.restore();

      // 周期吐信微动效（舌尖探出与收回：每 1.2s 一次，持续 160ms）
      const now = performance.now();
      const tongueCycle = now % 1200;
      if (tongueCycle < 180 && this.state === 'RUNNING') {
        const tongueProgress = Math.sin((tongueCycle / 180) * Math.PI);
        const tongueLen = 4.5 * tongueProgress;

        ctx.save();
        ctx.strokeStyle = tokens.snakeTongue;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        let tx = hx + cs / 2;
        let ty = hy + cs / 2;
        let fork1X, fork1Y, fork2X, fork2Y;

        if (this.dir.x === 1) { // 向右
          tx = hx + cs - 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + tongueLen, ty);
          ctx.lineTo(tx + tongueLen + 2, ty - 1.8);
          ctx.moveTo(tx + tongueLen, ty);
          ctx.lineTo(tx + tongueLen + 2, ty + 1.8);
          ctx.stroke();
        } else if (this.dir.x === -1) { // 向左
          tx = hx + 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - tongueLen, ty);
          ctx.lineTo(tx - tongueLen - 2, ty - 1.8);
          ctx.moveTo(tx - tongueLen, ty);
          ctx.lineTo(tx - tongueLen - 2, ty + 1.8);
          ctx.stroke();
        } else if (this.dir.y === -1) { // 向上
          ty = hy + 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx, ty - tongueLen);
          ctx.lineTo(tx - 1.8, ty - tongueLen - 2);
          ctx.moveTo(tx, ty - tongueLen);
          ctx.lineTo(tx + 1.8, ty - tongueLen - 2);
          ctx.stroke();
        } else if (this.dir.y === 1) { // 向下
          ty = hy + cs - 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx, ty + tongueLen);
          ctx.lineTo(tx - 1.8, ty + tongueLen + 2);
          ctx.moveTo(tx, ty + tongueLen);
          ctx.lineTo(tx + 1.8, ty + tongueLen + 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 蛇头眼睛（眼白 + 瞳孔偏移朝向）
      let e1x = hx + 4, e1y = hy + 4;
      let e2x = hx + cs - 7, e2y = hy + 4;
      let pOffset = { x: 0, y: 0 };

      if (this.dir.x === 1) { // 右
        e1x = hx + cs - 6; e1y = hy + 4.5;
        e2x = hx + cs - 6; e2y = hy + cs - 7.5;
        pOffset = { x: 0.8, y: 0 };
      } else if (this.dir.x === -1) { // 左
        e1x = hx + 3.5; e1y = hy + 4.5;
        e2x = hx + 3.5; e2y = hy + cs - 7.5;
        pOffset = { x: -0.8, y: 0 };
      } else if (this.dir.y === -1) { // 上
        e1x = hx + 4.5; e1y = hy + 3.5;
        e2x = hx + cs - 7.5; e2y = hy + 3.5;
        pOffset = { x: 0, y: -0.8 };
      } else if (this.dir.y === 1) { // 下
        e1x = hx + 4.5; e1y = hy + cs - 6;
        e2x = hx + cs - 7.5; e2y = hy + cs - 6;
        pOffset = { x: 0, y: 0.8 };
      }

      // 绘制眼白
      ctx.save();
      ctx.fillStyle = tokens.snakeEye;
      ctx.beginPath();
      ctx.arc(e1x + 1.5, e1y + 1.5, 2.3, 0, Math.PI * 2);
      ctx.arc(e2x + 1.5, e2y + 1.5, 2.3, 0, Math.PI * 2);
      ctx.fill();

      // 绘制黑眼珠（瞳孔跟随方向偏移）
      ctx.fillStyle = tokens.snakePupil;
      ctx.beginPath();
      ctx.arc(e1x + 1.5 + pOffset.x, e1y + 1.5 + pOffset.y, 1.2, 0, Math.PI * 2);
      ctx.arc(e2x + 1.5 + pOffset.x, e2y + 1.5 + pOffset.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloatingTexts() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = ft.isCritical ? 'bold 14px "Chakra Petch", monospace' : 'bold 12px "Chakra Petch", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = ft.isCritical ? 10 : 5;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  // Combo 连击看板与倒计时进度条
  showComboBar() {
    this.elComboContainer.classList.remove('hidden');
    this.elComboBadge.textContent = this.comboMultiplier >= 5 ? '⚡ MAX COMBO x5' : `⚡ COMBO x${this.comboMultiplier}`;

    this.elComboBadge.classList.add('pop');
    setTimeout(() => this.elComboBadge.classList.remove('pop'), 160);

    if (this.comboMultiplier >= 4) {
      this.elComboBadge.classList.add('burn');
    } else {
      this.elComboBadge.classList.remove('burn');
    }

    this.updateComboBar();
  }

  updateComboBar() {
    const remain = Math.max(0, this.comboTimer);
    this.elComboTimerText.textContent = remain.toFixed(1);
    const pct = Math.max(0, (remain / this.COMBO_WINDOW) * 100);
    this.elComboProgressBar.style.width = `${pct}%`;
  }

  hideComboBar() {
    this.elComboContainer.classList.add('hidden');
    this.elComboBadge.classList.remove('burn');
  }

  showBonusBar() {
    this.elBonusContainer.classList.remove('hidden');
    this.updateBonusBar(5.0, 5.0);
  }

  updateBonusBar(timeLeft, maxTime) {
    this.elBonusTimerText.textContent = Math.max(0, timeLeft).toFixed(1);
    const pct = Math.max(0, (timeLeft / maxTime) * 100);
    this.elBonusProgressBar.style.width = `${pct}%`;
  }

  hideBonusBar() {
    this.elBonusContainer.classList.add('hidden');
  }

  hideOverlay() {
    this.elOverlay.classList.remove('active');
    this.elStartScreen.classList.add('hidden');
    this.elPauseScreen.classList.add('hidden');
    this.elGameOverScreen.classList.add('hidden');
  }

  showPauseScreen() {
    this.elOverlay.classList.add('active');
    this.elStartScreen.classList.add('hidden');
    this.elPauseScreen.classList.remove('hidden');
    this.elGameOverScreen.classList.add('hidden');
  }

  showGameOverScreen(isNewBest) {
    this.elOverlay.classList.add('active');
    this.elStartScreen.classList.add('hidden');
    this.elPauseScreen.classList.add('hidden');
    this.elGameOverScreen.classList.remove('hidden');

    const mapNames = {
      empty: '经典空旷',
      pillar: '中央立柱',
      cross: '十字隔墙',
      maze: '迷宫通道'
    };
    const boundaryNames = {
      hard: '碰壁死亡',
      portal: '穿墙传送'
    };

    this.elFinalScore.textContent = this.score;
    this.elFinalMaxCombo.textContent = `x${this.maxComboReached}`;
    this.elFinalMapMode.textContent = `${mapNames[this.mapMode]} / ${boundaryNames[this.boundaryMode]}`;
    this.elFinalDifficulty.textContent = this.DIFFICULTY_CONFIG[this.difficulty].label;

    if (isNewBest) {
      this.elNewRecordBadge.classList.remove('hidden');
    } else {
      this.elNewRecordBadge.classList.add('hidden');
    }
  }

  openLeaderboard() {
    this.renderLeaderboard();
    this.elModal.classList.remove('hidden');
  }

  closeLeaderboard() {
    this.elModal.classList.add('hidden');
  }

  renderLeaderboard() {
    this.elLeaderboardBody.innerHTML = '';
    if (this.leaderboard.length === 0) {
      this.elEmptyLeaderboard.classList.remove('hidden');
      return;
    }

    this.elEmptyLeaderboard.classList.add('hidden');
    this.leaderboard.forEach((item, index) => {
      const tr = document.createElement('tr');
      const rankBadge = index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `${index + 1}`;
      tr.innerHTML = `
        <td>${rankBadge}</td>
        <td style="font-family: 'Chakra Petch', monospace; font-weight: bold; color: var(--accent-score);">${item.score}</td>
        <td style="font-size: 0.72rem;">${item.difficulty}</td>
        <td style="color: var(--text-muted); font-size: 0.7rem;">${item.date}</td>
      `;
      this.elLeaderboardBody.appendChild(tr);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.snakeGame = new SnakeGame();
});

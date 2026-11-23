/**
 * Snake 2077 - 经典贪吃蛇 Web 实现
 * 纯原生 JavaScript，无第三方依赖
 */

// ========================
// 1. Web Audio 音效系统
// ========================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initContext();
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

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // 基础合成音辅助函数
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

  // 吃普通食物：清脆的拾取双音
  playEat() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);

    // 触发震动（若移动端支持）
    if ('vibrate' in navigator) {
      try { navigator.vibrate(25); } catch (_) {}
    }
  }

  // 吃金色特殊食物：华丽三和弦上升琶音
  playBonusEat() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.15, 0.22);
      }, index * 40);
    });

    if ('vibrate' in navigator) {
      try { navigator.vibrate([40, 30, 60]); } catch (_) {}
    }
  }

  // 特殊食物刷新出现：魔法闪烁音
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

  // 撞毁/死亡：低沉衰减噪声
  playGameOver() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
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
// 2. 粒子与动效系统
// ========================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, color, count = 12, speed = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 3 + 2,
        color: color,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.03
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// ========================
// 3. 游戏主核心逻辑
// ========================
class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // 虚拟网格常量 (PRD: 20x20 标准网格)
    this.GRID_SIZE = 20;
    this.CELL_SIZE = this.canvas.width / this.GRID_SIZE; // 600 / 20 = 30px

    // 音效与动效
    this.sound = new SoundFX();
    this.particles = new ParticleSystem();

    // 难度速度配置 (毫秒/步)
    this.DIFFICULTY_CONFIG = {
      easy: { baseSpeed: 200, dynamicSpeed: false, obstacles: 0, label: '简单' },
      normal: { baseSpeed: 150, dynamicSpeed: true, minSpeed: 80, obstacles: 0, label: '普通' },
      hard: { baseSpeed: 100, dynamicSpeed: false, obstacles: 3, label: '困难' }
    };

    // 游戏状态
    this.state = 'INIT'; // 'INIT', 'RUNNING', 'PAUSED', 'GAMEOVER'
    this.difficulty = 'normal';
    this.score = 0;
    this.bestScore = 0;
    this.speed = 150;
    this.lastStepTime = 0;

    // 游戏实体
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = null; // 普通红苹果
    this.bonusFood = null; // 特殊金果 {x, y, timeLeft, maxTime}
    this.obstacles = []; // 困难模式下的障碍物 [{x, y}]

    // 浮动吃分文字动效
    this.floatingTexts = [];

    // 缓存与持久化数据初始化
    this.loadStorage();

    // 绑定 DOM 元素
    this.initDOMElements();

    // 注册输入事件
    this.initEventListeners();

    // 渲染初始画面
    this.render();

    // 启动动画循环（用于平滑绘制粒子、倒计时与动效）
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  initDOMElements() {
    this.elCurrentScore = document.getElementById('currentScore');
    this.elBestScore = document.getElementById('bestScore');
    this.elDifficulty = document.getElementById('difficultySelect');
    this.elSoundToggle = document.getElementById('soundToggleBtn');
    this.elSoundIcon = document.getElementById('soundIcon');
    this.elLeaderboardBtn = document.getElementById('leaderboardBtn');

    this.elOverlay = document.getElementById('overlay');
    this.elStartScreen = document.getElementById('startScreen');
    this.elPauseScreen = document.getElementById('pauseScreen');
    this.elGameOverScreen = document.getElementById('gameOverScreen');

    this.elStartBtn = document.getElementById('startBtn');
    this.elResumeBtn = document.getElementById('resumeBtn');
    this.elRestartFromPauseBtn = document.getElementById('restartFromPauseBtn');
    this.elRestartBtn = document.getElementById('restartBtn');

    this.elFinalScore = document.getElementById('finalScore');
    this.elFinalDifficulty = document.getElementById('finalDifficulty');
    this.elNewRecordBadge = document.getElementById('newRecordBadge');

    this.elBonusContainer = document.getElementById('bonusBarContainer');
    this.elBonusTimerText = document.getElementById('bonusTimerText');
    this.elBonusProgressBar = document.getElementById('bonusProgressBar');

    // 模态框
    this.elModal = document.getElementById('leaderboardModal');
    this.elModalBackdrop = document.getElementById('modalBackdrop');
    this.elCloseModalBtn = document.getElementById('closeModalBtn');
    this.elLeaderboardBody = document.getElementById('leaderboardBody');
    this.elEmptyLeaderboard = document.getElementById('emptyLeaderboard');
    this.elClearLeaderboard = document.getElementById('clearLeaderboardBtn');

    // 更新界面最高分展示
    this.elBestScore.textContent = this.bestScore;
  }

  loadStorage() {
    try {
      this.bestScore = parseInt(localStorage.getItem('snake_best_score') || '0', 10);
      const rawRecords = localStorage.getItem('snake_leaderboard_top5');
      this.leaderboard = rawRecords ? JSON.parse(rawRecords) : [];
    } catch (e) {
      this.bestScore = 0;
      this.leaderboard = [];
    }
  }

  saveRecord(score, difficulty) {
    if (score <= 0) return;

    let isNewBest = false;
    if (score > this.bestScore) {
      this.bestScore = score;
      localStorage.setItem('snake_best_score', this.bestScore.toString());
      this.elBestScore.textContent = this.bestScore;
      isNewBest = true;
    }

    const newEntry = {
      score: score,
      difficulty: this.DIFFICULTY_CONFIG[difficulty]?.label || difficulty,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    this.leaderboard.push(newEntry);
    // 按分数降序，相同分数按时间最新
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 5); // 保留 TOP 5

    try {
      localStorage.setItem('snake_leaderboard_top5', JSON.stringify(this.leaderboard));
    } catch (_) {}

    return isNewBest;
  }

  initEventListeners() {
    // 键盘控制
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 难度切换
    this.elDifficulty.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      if (this.state === 'INIT' || this.state === 'GAMEOVER') {
        this.resetGame();
      }
    });

    // 声音切换
    this.elSoundToggle.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.elSoundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.elSoundToggle.classList.toggle('muted', isMuted);
    });

    // 按钮动作
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

    // 排行榜展示
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

    // 移动端虚拟按键 (D-Pad)
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

    // 触屏滑动手势 (Swipe) 监听
    let touchStartX = 0;
    let touchStartY = 0;
    const canvasWrap = document.querySelector('.canvas-wrapper');

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

      // 最小触发滑动阀值 25px
      if (Math.max(absDx, absDy) > 25) {
        if (absDx > absDy) {
          // 水平滑动
          if (dx > 0) this.changeDirection(1, 0);
          else this.changeDirection(-1, 0);
        } else {
          // 垂直滑动
          if (dy > 0) this.changeDirection(0, 1);
          else this.changeDirection(0, -1);
        }
      }
    }, { passive: true });
  }

  handleKeyDown(e) {
    // 快捷键: 音效切换 M
    if (e.key === 'm' || e.key === 'M') {
      this.elSoundToggle.click();
      return;
    }

    // 空格键暂停/继续或开始
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

    // 方向键控制
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        this.changeDirection(0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        this.changeDirection(0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        this.changeDirection(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        this.changeDirection(1, 0);
        break;
    }
  }

  changeDirection(x, y) {
    if (this.state !== 'RUNNING') return;

    // 防止反向掉头自杀（例如正在向右移动时，按左键无效）
    if (x !== 0 && this.dir.x !== 0 && x === -this.dir.x) return;
    if (y !== 0 && this.dir.y !== 0 && y === -this.dir.y) return;

    // 将预定方向存入 nextDir，在下一次物理步进时生效，避免同一步进内连续按键自杀
    this.nextDir = { x, y };
  }

  resetGame() {
    const config = this.DIFFICULTY_CONFIG[this.difficulty];
    this.speed = config.baseSpeed;
    this.score = 0;
    this.elCurrentScore.textContent = '0';

    // 初始蛇身居中，向右运动，长度 3
    const startX = 6;
    const startY = 10;
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };

    this.bonusFood = null;
    this.hideBonusBar();
    this.particles.clear();
    this.floatingTexts = [];

    // 生成障碍物 (困难模式 3 个障碍)
    this.obstacles = [];
    if (config.obstacles > 0) {
      for (let i = 0; i < config.obstacles; i++) {
        const obs = this.getRandomEmptyPosition();
        if (obs) this.obstacles.push(obs);
      }
    }

    // 生成首个普通食物
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

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound.playGameOver();

    // 蛇头爆炸效果
    const head = this.snake[0];
    if (head) {
      this.particles.spawn(
        head.x * this.CELL_SIZE + this.CELL_SIZE / 2,
        head.y * this.CELL_SIZE + this.CELL_SIZE / 2,
        '#ff3366',
        30,
        5
      );
    }

    const isNewBest = this.saveRecord(this.score, this.difficulty);
    this.showGameOverScreen(isNewBest);
  }

  // 随机生成空坐标（避开蛇身、障碍物、食物）
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

  // 尝试触发金色特殊食物（约 25% 几率在吃普通食物后刷出）
  trySpawnBonusFood() {
    if (this.bonusFood) return; // 场上已有则不刷

    if (Math.random() < 0.28) {
      const pos = this.getRandomEmptyPosition();
      if (pos) {
        this.bonusFood = {
          x: pos.x,
          y: pos.y,
          timeLeft: 5.0, // 5秒倒计时
          maxTime: 5.0
        };
        this.sound.playBonusSpawn();
        this.showBonusBar();
      }
    }
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({
      x: x * this.CELL_SIZE + this.CELL_SIZE / 2,
      y: y * this.CELL_SIZE,
      text: text,
      color: color,
      life: 1.0,
      vy: -1.2
    });
  }

  // ========================
  // 核心运动步进
  // ========================
  step() {
    this.dir = this.nextDir;
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y
    };

    // 1. 撞墙判定 (硬碰撞)
    if (
      newHead.x < 0 ||
      newHead.x >= this.GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= this.GRID_SIZE
    ) {
      this.gameOver();
      return;
    }

    // 2. 撞自身身体判定
    for (let i = 0; i < this.snake.length; i++) {
      if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
        this.gameOver();
        return;
      }
    }

    // 3. 撞静态障碍物判定 (Hard 模式)
    for (const obs of this.obstacles) {
      if (newHead.x === obs.x && newHead.y === obs.y) {
        this.gameOver();
        return;
      }
    }

    // 前进：插入新蛇头
    this.snake.unshift(newHead);

    let ateFood = false;

    // 4. 判定是否吃到普通红苹果 (+10分)
    if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
      ateFood = true;
      this.score += 10;
      this.elCurrentScore.textContent = this.score;
      this.sound.playEat();

      // 吃食物粒子
      this.particles.spawn(
        newHead.x * this.CELL_SIZE + this.CELL_SIZE / 2,
        newHead.y * this.CELL_SIZE + this.CELL_SIZE / 2,
        '#00ffcc',
        14,
        3.5
      );
      this.addFloatingText(newHead.x, newHead.y, '+10', '#00ffcc');

      // 刷新普通食物
      this.spawnFood();

      // 尝试刷新金色特殊食物
      this.trySpawnBonusFood();

      // 动态提速 (普通模式每 50 分提速)
      const config = this.DIFFICULTY_CONFIG[this.difficulty];
      if (config.dynamicSpeed) {
        const speedDeduction = Math.floor(this.score / 50) * 12;
        this.speed = Math.max(config.minSpeed, config.baseSpeed - speedDeduction);
      }
    }

    // 5. 判定是否吃到金色特殊果 (+30分)
    if (this.bonusFood && newHead.x === this.bonusFood.x && newHead.y === this.bonusFood.y) {
      ateFood = true;
      this.score += 30;
      this.elCurrentScore.textContent = this.score;
      this.sound.playBonusEat();

      // 金色爆炸粒子
      this.particles.spawn(
        newHead.x * this.CELL_SIZE + this.CELL_SIZE / 2,
        newHead.y * this.CELL_SIZE + this.CELL_SIZE / 2,
        '#ffd700',
        24,
        4.5
      );
      this.addFloatingText(newHead.x, newHead.y, '+30 🌟', '#ffd700');

      this.bonusFood = null;
      this.hideBonusBar();
    }

    // 若没吃到任何食物，则移除蛇尾保持长度；吃到了则不 pop，从而蛇身增长 1 节
    if (!ateFood) {
      this.snake.pop();
    }
  }

  // ========================
  // 渲染层与动画主循环
  // ========================
  gameLoop(currentTime) {
    const deltaTime = (currentTime - (this.lastFrameTime || currentTime)) / 1000;
    this.lastFrameTime = currentTime;

    // 运行态时的时钟与逻辑步进
    if (this.state === 'RUNNING') {
      // 特殊食物 5 秒倒计时更新
      if (this.bonusFood) {
        this.bonusFood.timeLeft -= deltaTime;
        if (this.bonusFood.timeLeft <= 0) {
          this.bonusFood = null;
          this.hideBonusBar();
        } else {
          this.updateBonusBar(this.bonusFood.timeLeft, this.bonusFood.maxTime);
        }
      }

      // 定频匀速物理移动
      if (currentTime - this.lastStepTime >= this.speed) {
        this.step();
        this.lastStepTime = currentTime;
      }
    }

    // 动画组件更新 (粒子、飘字)
    this.particles.update();
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.025;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 绘制画面
    this.render();

    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cs = this.CELL_SIZE;

    // 清屏与深邃背景底色
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // 绘制微弱科技网格线
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.035)';
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

    // 绘制障碍物 (Hard 模式)
    for (const obs of this.obstacles) {
      this.drawObstacle(obs.x * cs, obs.y * cs, cs);
    }

    // 绘制普通食物 (发光脉冲红苹果)
    if (this.food) {
      this.drawFood(this.food.x * cs, this.food.y * cs, cs);
    }

    // 绘制特殊金色食物 (旋转与光晕特效)
    if (this.bonusFood) {
      this.drawBonusFood(this.bonusFood.x * cs, this.bonusFood.y * cs, cs);
    }

    // 绘制蛇身与蛇头
    this.drawSnake();

    // 绘制爆发粒子
    this.particles.draw(ctx);

    // 绘制上浮分数字样
    this.drawFloatingTexts();
  }

  drawObstacle(x, y, s) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#2d3748';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    const radius = 6;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, s - 4, s - 4, radius);
    ctx.fill();
    ctx.stroke();

    // 工业交叉警示斜纹
    ctx.strokeStyle = 'rgba(255, 51, 102, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + s - 4, y + s - 4);
    ctx.moveTo(x + s - 4, y + 4);
    ctx.lineTo(x + 4, y + s - 4);
    ctx.stroke();
    ctx.restore();
  }

  drawFood(x, y, s) {
    const ctx = this.ctx;
    const time = performance.now() * 0.005;
    const pulse = Math.sin(time) * 1.5;

    ctx.save();
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 12 + pulse * 2;
    ctx.fillStyle = '#ff007f';

    const cx = x + s / 2;
    const cy = y + s / 2;
    const r = (s / 2 - 4) + pulse;

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, r), 0, Math.PI * 2);
    ctx.fill();

    // 食物中心高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBonusFood(x, y, s) {
    const ctx = this.ctx;
    const time = performance.now() * 0.008;
    const cx = x + s / 2;
    const cy = y + s / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time);

    // 金光四射外发光
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd700';

    // 八角星或菱形
    const r = s / 2 - 3;
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

    // 核心光核
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSnake() {
    const ctx = this.ctx;
    const cs = this.CELL_SIZE;

    for (let i = this.snake.length - 1; i >= 0; i--) {
      const seg = this.snake[i];
      const x = seg.x * cs;
      const y = seg.y * cs;
      const isHead = i === 0;

      ctx.save();
      if (isHead) {
        // 蛇头：青蓝发光科技感圆角方块
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, cs - 3, cs - 3, 7);
        ctx.fill();

        // 蛇眼睛
        ctx.fillStyle = '#05131e';
        let eye1X = x + 7, eye1Y = y + 7, eye2X = x + cs - 11, eye2Y = y + 7;
        if (this.dir.x === 1) { // 向右
          eye1X = x + cs - 9; eye1Y = y + 7;
          eye2X = x + cs - 9; eye2Y = y + cs - 11;
        } else if (this.dir.x === -1) { // 向左
          eye1X = x + 5; eye1Y = y + 7;
          eye2X = x + 5; eye2Y = y + cs - 11;
        } else if (this.dir.y === 1) { // 向下
          eye1X = x + 7; eye1Y = y + cs - 9;
          eye2X = x + cs - 11; eye2Y = y + cs - 9;
        } else if (this.dir.y === -1) { // 向上
          eye1X = x + 7; eye1Y = y + 5;
          eye2X = x + cs - 11; eye2Y = y + 5;
        }

        ctx.beginPath();
        ctx.arc(eye1X + 2, eye1Y + 2, 2.5, 0, Math.PI * 2);
        ctx.arc(eye2X + 2, eye2Y + 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // 蛇身渐变色：从青绿到深海蓝，越靠近尾巴透明度稍降
        const ratio = 1 - (i / this.snake.length) * 0.45;
        ctx.fillStyle = `rgba(0, 220, 180, ${ratio})`;
        ctx.shadowColor = 'rgba(0, 255, 204, 0.2)';
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cs - 4, cs - 4, 5);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawFloatingTexts() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 15px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  // ========================
  // UI 辅助与模态框
  // ========================
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

    this.elFinalScore.textContent = this.score;
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
        <td style="font-family: Orbitron; font-weight: bold; color: #00ffcc;">${item.score}</td>
        <td>${item.difficulty}</td>
        <td style="color: #94a3b8; font-size: 0.75rem;">${item.date}</td>
      `;
      this.elLeaderboardBody.appendChild(tr);
    });
  }
}

// 页面加载完成后实例化游戏
window.addEventListener('DOMContentLoaded', () => {
  window.snakeGame = new SnakeGame();
});

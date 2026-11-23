/**
 * Snake Classic - 经典贪吃蛇 Web 实现
 * 纯原生 JavaScript，无第三方依赖
 * 遵循 UI-DESIGN.md 设计规范
 */

// ========================
// 1. Web Audio 音效系统
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

  // 移动转向音效（非常轻柔的 blip/tick，低音量 ~0.04，约 30ms）
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

  // 吃普通果音效（清脆上行音阶）
  playEat() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 清脆上行双音/滑音
    const notes = [587.33, 880]; // D5 -> A5
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.06);
    });

    if ('vibrate' in navigator) {
      try { navigator.vibrate(25); } catch (_) {}
    }
  }

  // 吃金色神果音效（华丽短琶音）
  playBonusEat() {
    if (this.muted || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 华丽上行琶音: C6, E6, G6, C7
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
        size: Math.random() * 2.5 + 1.5,
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
      ctx.shadowBlur = 6;
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

    // 虚拟网格常量 (UI-DESIGN: 20x20 标准网格, 400px x 400px -> 每格 20px)
    this.GRID_SIZE = 20;
    this.CELL_SIZE = this.canvas.width / this.GRID_SIZE; // 400 / 20 = 20px

    // 音效与动效
    this.sound = new SoundFX();
    this.particles = new ParticleSystem();

    // 难度配置
    this.DIFFICULTY_CONFIG = {
      easy: { baseSpeed: 200, dynamicSpeed: false, obstacles: 0, label: '简单' },
      normal: { baseSpeed: 150, dynamicSpeed: true, minSpeed: 80, obstacles: 0, label: '普通' },
      hard: { baseSpeed: 100, dynamicSpeed: false, obstacles: 3, label: '困难' }
    };

    // 游戏状态
    this.state = 'INIT';
    this.difficulty = 'normal';
    this.score = 0;
    this.bestScore = 0;
    this.speed = 150;
    this.lastStepTime = 0;

    // 实体
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.inputQueue = [];
    this.food = null;
    this.bonusFood = null;
    this.obstacles = [];
    this.floatingTexts = [];

    // 初始化
    this.loadStorage();
    this.initDOMElements();
    this.initEventListeners();
    this.render();

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
    this.elGameOverLeaderboardBtn = document.getElementById('gameOverLeaderboardBtn');

    this.elFinalScore = document.getElementById('finalScore');
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
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 5);

    try {
      localStorage.setItem('snake_leaderboard_top5', JSON.stringify(this.leaderboard));
    } catch (_) {}

    return isNewBest;
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.elDifficulty.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      if (this.state === 'INIT' || this.state === 'GAMEOVER') {
        this.resetGame();
      }
    });

    this.elSoundToggle.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.elSoundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.elSoundToggle.classList.toggle('muted', isMuted);
    });

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

    // 获取队列中最后一个意图方向，若队列为空则使用当前生效方向 this.dir
    const lastTarget = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.dir;

    // 防反向：不能与最后意图方向相反
    if (x !== 0 && lastTarget.x !== 0 && x === -lastTarget.x) return;
    if (y !== 0 && lastTarget.y !== 0 && y === -lastTarget.y) return;

    // 相同方向不重复入队
    if (x === lastTarget.x && y === lastTarget.y) return;

    // 限制队列最大长度（例如最多缓冲 2 个转弯操作）
    if (this.inputQueue.length < 2) {
      this.inputQueue.push({ x, y });
    }
  }

  resetGame() {
    const config = this.DIFFICULTY_CONFIG[this.difficulty];
    this.speed = config.baseSpeed;
    this.score = 0;
    this.elCurrentScore.textContent = '0';

    const startX = 6;
    const startY = 10;
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.inputQueue = [];

    this.bonusFood = null;
    this.hideBonusBar();
    this.particles.clear();
    this.floatingTexts = [];

    this.obstacles = [];
    if (config.obstacles > 0) {
      for (let i = 0; i < config.obstacles; i++) {
        const obs = this.getRandomEmptyPosition();
        if (obs) this.obstacles.push(obs);
      }
    }

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

    const head = this.snake[0];
    if (head) {
      this.particles.spawn(
        head.x * this.CELL_SIZE + this.CELL_SIZE / 2,
        head.y * this.CELL_SIZE + this.CELL_SIZE / 2,
        '#f43f5e',
        25,
        4.5
      );
    }

    const isNewBest = this.saveRecord(this.score, this.difficulty);
    this.showGameOverScreen(isNewBest);
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

  step() {
    if (this.inputQueue.length > 0) {
      const targetDir = this.inputQueue.shift();
      // 保证出队时依然不与当前生效的 this.dir 冲突（双重保险）
      if (!(targetDir.x !== 0 && this.dir.x !== 0 && targetDir.x === -this.dir.x) &&
          !(targetDir.y !== 0 && this.dir.y !== 0 && targetDir.y === -this.dir.y)) {
        if (targetDir.x !== this.dir.x || targetDir.y !== this.dir.y) {
          this.sound.playMove();
        }
        this.dir = targetDir;
      }
    }
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y
    };

    if (
      newHead.x < 0 ||
      newHead.x >= this.GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= this.GRID_SIZE
    ) {
      this.gameOver();
      return;
    }

    for (let i = 0; i < this.snake.length; i++) {
      if (newHead.x === this.snake[i].x && newHead.y === this.snake[i].y) {
        this.gameOver();
        return;
      }
    }

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
      this.score += 10;
      this.elCurrentScore.textContent = this.score;

      // 4.1 得分微弹动效
      this.elCurrentScore.classList.add('score-bump');
      setTimeout(() => this.elCurrentScore.classList.remove('score-bump'), 150);

      this.sound.playEat();

      this.particles.spawn(
        newHead.x * this.CELL_SIZE + this.CELL_SIZE / 2,
        newHead.y * this.CELL_SIZE + this.CELL_SIZE / 2,
        '#22c55e',
        14,
        3.5
      );
      this.addFloatingText(newHead.x, newHead.y, '+10', '#38bdf8');

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
      this.score += 30;
      this.elCurrentScore.textContent = this.score;

      this.elCurrentScore.classList.add('score-bump');
      setTimeout(() => this.elCurrentScore.classList.remove('score-bump'), 150);

      this.sound.playBonusEat();

      this.particles.spawn(
        newHead.x * this.CELL_SIZE + this.CELL_SIZE / 2,
        newHead.y * this.CELL_SIZE + this.CELL_SIZE / 2,
        '#fbbf24',
        22,
        4.5
      );
      this.addFloatingText(newHead.x, newHead.y, '+30 ★', '#fbbf24');

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

    this.particles.update();
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

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cs = this.CELL_SIZE;

    // 清屏与深邃棋盘底色
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // 绘制极弱点阵网格线 (rgba(255,255,255,0.03))
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
      this.drawObstacle(obs.x * cs, obs.y * cs, cs);
    }

    // 绘制普通食物 (暖红带呼吸发光)
    if (this.food) {
      this.drawFood(this.food.x * cs, this.food.y * cs, cs);
    }

    // 绘制限时金色果 (香槟金旋转与光晕环)
    if (this.bonusFood) {
      this.drawBonusFood(this.bonusFood.x * cs, this.bonusFood.y * cs, cs);
    }

    // 绘制蛇身与蛇头
    this.drawSnake();

    // 粒子
    this.particles.draw(ctx);

    // 飘字
    this.drawFloatingTexts();
  }

  drawObstacle(x, y, s) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, s - 4, s - 4, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + s - 3, y + s - 3);
    ctx.moveTo(x + s - 3, y + 3);
    ctx.lineTo(x + 3, y + s - 3);
    ctx.stroke();
    ctx.restore();
  }

  drawFood(x, y, s) {
    const ctx = this.ctx;
    const time = performance.now() * 0.005;
    const pulse = Math.sin(time) * 1.2;

    ctx.save();
    // --food-apple: #ef4444, --food-apple-glow: rgba(239, 68, 68, 0.6)
    ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    ctx.shadowBlur = 10 + pulse * 2;
    ctx.fillStyle = '#ef4444';

    const cx = x + s / 2;
    const cy = y + s / 2;
    const r = (s / 2 - 3) + pulse;

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, r), 0, Math.PI * 2);
    ctx.fill();

    // 食物高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
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

    // --food-golden: #fbbf24, --food-golden-glow: rgba(251, 191, 36, 0.8)
    ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fbbf24';

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

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
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
        // 蛇头: --snake-head: #22c55e, --snake-head-glow: rgba(34, 197, 94, 0.5)
        ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cs - 2, cs - 2, 5);
        ctx.fill();

        // 眼睛小白点
        ctx.fillStyle = '#ffffff';
        let eye1X = x + 4, eye1Y = y + 4, eye2X = x + cs - 7, eye2Y = y + 4;
        if (this.dir.x === 1) { // 右
          eye1X = x + cs - 6; eye1Y = y + 4;
          eye2X = x + cs - 6; eye2Y = y + cs - 7;
        } else if (this.dir.x === -1) { // 左
          eye1X = x + 3; eye1Y = y + 4;
          eye2X = x + 3; eye2Y = y + cs - 7;
        } else if (this.dir.y === 1) { // 下
          eye1X = x + 4; eye1Y = y + cs - 6;
          eye2X = x + cs - 7; eye2Y = y + cs - 6;
        } else if (this.dir.y === -1) { // 上
          eye1X = x + 4; eye1Y = y + 3;
          eye2X = x + cs - 7; eye2Y = y + 3;
        }

        ctx.beginPath();
        ctx.arc(eye1X + 1.5, eye1Y + 1.5, 1.8, 0, Math.PI * 2);
        ctx.arc(eye2X + 1.5, eye2Y + 1.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // 蛇身: --snake-body: #4ade80, 缩进 1px 圆角节段
        ctx.fillStyle = '#4ade80';
        ctx.shadowColor = 'rgba(74, 222, 128, 0.2)';
        ctx.shadowBlur = 3;

        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, cs - 3, cs - 3, 4);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawFloatingTexts() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 12px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
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
        <td style="font-family: 'Chakra Petch', monospace; font-weight: bold; color: #38bdf8;">${item.score}</td>
        <td>${item.difficulty}</td>
        <td style="color: #94a3b8; font-size: 0.72rem;">${item.date}</td>
      `;
      this.elLeaderboardBody.appendChild(tr);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.snakeGame = new SnakeGame();
});

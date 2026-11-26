# 贪吃蛇游戏（Snake Classic v2.0）UI 设计规范文档（UI-DESIGN.md）

本文档定义了「经典贪吃蛇 Web 游戏 v2.0」的完整视觉规范体系、4 套主题切换系统（Design Tokens）、地图障碍物与边界模式样式、打击感与粒子动效规范，以及 Combo 连击看板交互设计。

---

## 1. 整体视觉风格与设计原则

- **风格定位**：**现代复古霓虹街机风（Modern Cyber-Arcade）+ 多元主题扩展**。在 1.0 的极简深暗与荧光光晕基础上，引入四套反差鲜明的主题质感（霓虹赛博、复古点阵、极简水墨白昼、动态彩虹流光）。
- **沉浸感与打击感（Juiciness）**：告别单调平铺，增加局部冲击波、浮动跳字、蛇身解体碎片与屏幕微震动效，让吃果与死亡具有饱满的街机打击反馈。
- **触控优先响应式**：保持桌面端高精度键位响应，同时在移动端原生适配人体工学虚拟十字触控板与手势滑动。

---

## 2. 视觉规范系统（Design Tokens）与 4 套预设主题

为了支持多主题动态切换，采用 CSS 自定义属性（Variables）进行全局设计变量抽象，支持在 `<body>` 或根节点通过 `data-theme="cyberpunk|gameboy|paper|rainbow"` 进行无缝切换。

### 2.1 四套主题色彩系统规范

```css
/* 默认：Theme 1 - Cyberpunk（霓虹暗黑） */
[data-theme="cyberpunk"], :root {
  --bg-primary: #0b0f19;          /* 暗夜深空底色 */
  --bg-surface: #151d2f;          /* 面板与毛玻璃卡片 */
  --bg-board: #070a10;            /* 棋盘 Canvas 背景 */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-highlight: rgba(99, 102, 241, 0.4);

  --snake-head: #22c55e;          /* 荧光翠绿 */
  --snake-head-glow: rgba(34, 197, 94, 0.6);
  --snake-body: #4ade80;
  --snake-eye: #ffffff;
  --snake-tongue: #f43f5e;        /* 荧光玫红蛇信 */

  --food-apple: #ef4444;          /* 暖红发光苹果 */
  --food-apple-glow: rgba(239, 68, 68, 0.7);
  --food-golden: #fbbf24;         /* 金色限时果 */
  --food-golden-glow: rgba(251, 191, 36, 0.85);

  --obstacle-color: #475569;      /* 冷岩灰静态砖块 */
  --obstacle-border: #64748b;

  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #475569;

  --accent-primary: #6366f1;      /* 靛蓝主按键 */
  --accent-score: #38bdf8;        /* 荧光天蓝得分 */
  --combo-bar: linear-gradient(90deg, #6366f1, #38bdf8);
}

/* Theme 2 - GameBoy（复古绿黑经典液晶） */
[data-theme="gameboy"] {
  --bg-primary: #8b956d;          /* 经典墨绿外壳底色 */
  --bg-surface: #9bbc0f;          /* 浅绿液晶卡片 */
  --bg-board: #8bac0f;            /* 液晶屏核心绿色 */
  --border-subtle: #306230;
  --border-highlight: #0f380f;

  --snake-head: #0f380f;          /* 4阶最深像素绿 */
  --snake-head-glow: transparent; /* 无现代发光，纯像素质感 */
  --snake-body: #306230;          /* 次深绿 */
  --snake-eye: #8bac0f;
  --snake-tongue: #0f380f;

  --food-apple: #0f380f;          /* 像素深暗果实 */
  --food-apple-glow: transparent;
  --food-golden: #306230;
  --food-golden-glow: transparent;

  --obstacle-color: #0f380f;      /* 纯色实体砖块 */
  --obstacle-border: #306230;

  --text-primary: #0f380f;
  --text-secondary: #306230;
  --text-muted: #8bac0f;

  --accent-primary: #306230;
  --accent-score: #0f380f;
  --combo-bar: #0f380f;
}

/* Theme 3 - Paper（极简白昼水墨） */
[data-theme="paper"] {
  --bg-primary: #f8fafc;          /* 柔和米白纸质感 */
  --bg-surface: #ffffff;          /* 纯白卡片面板 */
  --bg-board: #f1f5f9;            /* 浅灰白 Canvas */
  --border-subtle: #e2e8f0;
  --border-highlight: #cbd5e1;

  --snake-head: #1e293b;          /* 极简深灰黑 */
  --snake-head-glow: rgba(0, 0, 0, 0.08);
  --snake-body: #475569;          /* 水墨铅灰 */
  --snake-eye: #ffffff;
  --snake-tongue: #e11d48;

  --food-apple: #dc2626;          /* 纯净正红印章色 */
  --food-apple-glow: rgba(220, 38, 38, 0.2);
  --food-golden: #d97706;         /* 琥珀金印 */
  --food-golden-glow: rgba(217, 119, 6, 0.25);

  --obstacle-color: #94a3b8;      /* 浅灰砖石 */
  --obstacle-border: #64748b;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  --accent-primary: #0f172a;      /* 极简深黑按钮 */
  --accent-score: #2563eb;        /* 典雅群青 */
  --combo-bar: linear-gradient(90deg, #0f172a, #2563eb);
}

/* Theme 4 - Rainbow Streamer（彩虹流光） */
[data-theme="rainbow"] {
  --bg-primary: #08071a;          /* 深邃幻彩暗紫底色 */
  --bg-surface: #13112b;
  --bg-board: #0c0a1f;
  --border-subtle: rgba(255, 255, 255, 0.1);
  --border-highlight: #ec4899;

  --snake-head: #ec4899;          /* 霓虹粉紫蛇头 */
  --snake-head-glow: rgba(236, 72, 153, 0.7);
  --snake-body: dynamic;          /* 动态色相旋转：hsl((index * 15) % 360, 90%, 60%) */
  --snake-eye: #ffffff;
  --snake-tongue: #38bdf8;

  --food-apple: #f43f5e;
  --food-apple-glow: rgba(244, 63, 94, 0.75);
  --food-golden: #facc15;
  --food-golden-glow: rgba(250, 204, 21, 0.9);

  --obstacle-color: #312e81;      /* 幻夜靛蓝结晶障碍 */
  --obstacle-border: #6366f1;

  --text-primary: #ffffff;
  --text-secondary: #c084fc;
  --text-muted: #6b21a8;

  --accent-primary: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
  --accent-score: #f472b6;
  --combo-bar: linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4, #10b981);
}
```

---

## 3. 2.0 页面结构与控制布局（Wireframes & Controls）

```text
+--------------------------------------------------------------------------+
|                            HEADER 顶部状态栏                              |
|  [ 🐍 SNAKE 2.0 ]   主题:[ Cyberpunk v ]  地图:[ 中央立柱 v ]  音效:[ 🔊 ] |
|  Score: 320    Best: 850    [ 模式切换: 碰壁死亡 (Hard) | 穿墙 (Wrap) ]   |
+--------------------------------------------------------------------------+
|  [ ⚡ COMBO x3 ] 剩余 2.4s  [==================       ] (动态倒计时能量槽)|
+--------------------------------------------------------------------------+
|                                                                          |
|                           GAME CANVAS 棋盘核心                            |
|                          ( 400px * 400px 标准视口 )                       |
|  +--------------------------------------------------------------------+  |
|  | [传送门光晕]                                         [传送门光晕]    |  |
|  | .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  |  |
|  | .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  |  |
|  | .  .  .  .  .  .  .  .  [ █ █ 障碍块 ] .  .  .  .  .  .  .  .  .  |  |
|  | .  .  [🟣][🔵][🟢蛇头(吐信)]  [ █ █ 障碍块 ] .  .  [🍎 +20 x2]    .  |  |
|  | .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  (波纹扩散圈)  .  .  |  |
|  | .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
+--------------------------------------------------------------------------+
|                          FOOTER / 操作控制区                              |
|   [ Space 暂停/继续 ]   [ WASD / 方向键 转向 ]   [ 移动端: 虚拟十字触控 ] |
+--------------------------------------------------------------------------+
```

---

## 4. 地图障碍物与边界模式样式规范

### 4.1 地图预设障碍物视觉表现（Obstacles）
1. **尺寸基准**：严格契合 20x20 网格（单个障碍单格 `20px × 20px`）。
2. **样式定义**：
   - **本体**：实体圆角方块（`border-radius: 4px`），内嵌斜向 45° 警示条纹或机械十字纹理（`linear-gradient`）。
   - **边框与阴影**：`1px solid var(--obstacle-border)`，内凹描边，强化静态实心质感，与发光的动态蛇身/食物形成明确物理反差。
   - **4套预设布局**：
     - **经典空旷**：画布纯净无内部阻碍。
     - **中央立柱**：中心坐标 `(9,9)` 至 `(10,10)` 2x2 实心立方。
     - **十字隔墙**：中心向四向延展的断开立柱（留出通道供蛇回环穿行）。
     - **迷宫通道**：边界与内环形成拐角阻隔，强调精确转角时机。

### 4.2 边界物理模式切换控件与视觉提示（Boundary Modes）
1. **切换控件（Segment Switch）**：
   - 样式：胶囊式双选 Segment Control。
   - 选项：`[ 碰壁死亡 (Hard Wall) ]` | `[ 穿墙无界 (Portal Wrap) ]`。
2. **画布边界视觉反馈**：
   - **碰壁死亡模式（Hard Wall）**：Canvas 四周外框渲染为实心硬质边框（`2px solid var(--border-highlight)`），带有警示性微弱红晕。
   - **穿墙无界模式（Wrap-around）**：Canvas 四周外框采用半透明虚线或渐隐发光通道，四个边缘呈淡蓝色离子传送门光效，暗示进入后将自对向重现。

---

## 5. 蛇头微动效与打击感粒子规范（Juice & Micro-Interactions）

### 5.1 蛇头生动微动效（Head Dynamics）
1. **行进朝向与眼睛定位（Directional Eyes）**：
   - 蛇头绘制为圆角矩形，在朝向一侧绘制两颗高光白眼（`r: 2.5px`）。
   - **朝右**：两眼位于右侧上/下 1/4 处，瞳孔向右凝视。
   - **朝左**：两眼位于左侧上/下 1/4 处，瞳孔向左凝视。
   - **朝上/下**：双眼并列居于头部前方，根据前进方向偏移。
2. **吐信动画（Flickering Tongue）**：
   - 频率：每 1.2 秒自动触发一次探出（持续 160ms）。
   - 表现：蛇头前方伸出一条极细分叉小舌（`--snake-tongue`），前伸 3~4px 后迅速收回，赋予角色生动机灵感。

### 5.2 吃果反馈：局部波纹与浮动跳字
1. **局部冲击波（Shockwave Ripple）**：
   - 触发时刻：蛇头与食物重合判定有效瞬间。
   - 表现：从食物所在网格中心向外扩散一个半透明正圆（从半径 `4px` 放大至 `24px`，透明度从 `0.8` 衰减至 `0`，耗时 `220ms`，采用 `ease-out` 曲线）。
2. **浮动加分文字（Floating Score Text）**：
   - 初始位置：食物被吃坐标上方 5px。
   - 动效流转：向上垂直位移 18px，透明度随高度衰减，用时 400ms。
   - 阶梯表现：
     - 普通吃果：`+10`（白色/浅绿，12px 字体）。
     - 连击加成：`+20 x2`、`CRITICAL! +30`（金色或电光粉紫，14px 粗体并带文字发光 `text-shadow: 0 0 6px var(--accent-score)`）。

### 5.3 死亡反馈：屏幕微震与蛇身碎片炸裂
1. **屏幕震颤（Screen Shake）**：
   - 碰撞触发时，Canvas 画布容器添加 `.screen-shake` 类，持续 160ms。
   - 抖动幅度：X/Y 轴在 `±4px` 内高频衰减抖动（4 帧交替）。
2. **蛇身解体碎片化（Voxel Shatter）**：
   - 蛇身停止运动，各节段分裂为 4 个小型像素微粒（`4px × 4px`）。
   - 微粒向周围带有随机初速度（速度分量 `v_x, v_y`）散开并受重力微弱下坠，300ms 内渐隐消失，完成结算前转场。

---

## 6. Combo 连击看板与高亮动画规范

### 6.1 连击看板布局（Combo Board）
- **挂载位置**：Canvas 正上方悬浮栏或紧随 ScoreBoard 呈现。
- **组成要素**：
  - **倍率标签**：`⚡ COMBO x2` ~ `⚡ MAX COMBO x5`。
  - **能量倒计时进度条**：宽度跟随 3.5s 倒计时线性递减（CSS `transition: width 50ms linear`）。

### 6.2 连击动效与视觉阶梯
- **x1（起步）**：无连击槽或微弱底色。
- **x2 ~ x3（热度）**：触发数字 `scale(1.2)` 弹跳动效，能量槽颜色为电光天蓝。
- **x4 ~ x5（MAX 超能爆发）**：
  - 标签变为金红霓虹流光，伴随外层光晕闪烁（`animation: combo-burn 0.8s infinite`）。
  - 得分卡片伴随持续轻微心跳放大（`scale(1.05)`），强烈激励玩家维持节奏。

---

## 7. 动效实现参考代码（CSS Keyframes）

```css
/* 1. 屏幕撞击震颤 */
@keyframes screen-shake {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-3px, 2px); }
  40% { transform: translate(3px, -2px); }
  60% { transform: translate(-2px, -1px); }
  80% { transform: translate(2px, 1px); }
  100% { transform: translate(0, 0); }
}
.screen-shake {
  animation: screen-shake 0.16s ease-in-out;
}

/* 2. 浮动数字升腾渐隐 */
@keyframes float-score {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  60% {
    transform: translateY(-12px) scale(1.15);
    opacity: 0.9;
  }
  100% {
    transform: translateY(-22px) scale(0.9);
    opacity: 0;
  }
}

/* 3. Combo Max 高能光晕燃烧 */
@keyframes combo-burn {
  0%, 100% {
    filter: drop-shadow(0 0 6px #f43f5e) drop-shadow(0 0 12px #fbbf24);
  }
  50% {
    filter: drop-shadow(0 0 14px #ec4899) drop-shadow(0 0 20px #f59e0b);
  }
}
```

---

## 8. 交付与后续协作
1. **交付文档**：`/Users/zwl/orca/projects/demo-1123/UI-DESIGN.md`。
2. **验收流程**：提交 VibeCoding小秘书 初审验收。
3. **开发衔接**：前端开发工程师根据本规范中的 4 套主题 Tokens、Canvas 绘制规范与动效曲线实现 2.0 版本的完整落地。

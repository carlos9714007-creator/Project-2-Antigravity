/**
 * TETTRIS - Core Game Engine
 * Features: High-DPI Scaling, Glow Rendering, Ghost Piece, Dynamic Themes
 */

const canvas = document.getElementById('tetris-canvas');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');

// Game Constants
const COLS = 10;
const ROWS = 20;

let block_size_calc = 0;

function resize() {
    const parent = canvas.parentElement;
    const padding = 20;
    const availableHeight = parent.clientHeight - padding;

    // Calculate block size based on available height
    block_size_calc = Math.floor(availableHeight / ROWS);
    const width = block_size_calc * COLS;
    const height = block_size_calc * ROWS;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.scale(dpr, dpr);

    // Next Piece Canvas
    nextCanvas.width = 100 * dpr;
    nextCanvas.height = 100 * dpr;
    nextCanvas.style.width = '100px';
    nextCanvas.style.height = '100px';
    nextContext.scale(dpr, dpr);
}

window.addEventListener('resize', resize);
resize();

// Tetra Shapes
const SHAPES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 2], [2, 2]], // O
    [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
    [[4, 0, 0], [4, 4, 4], [0, 0, 0]], // L
    [[0, 0, 5], [5, 5, 5], [0, 0, 0]], // J
    [[0, 6, 6], [6, 6, 0], [0, 0, 0]], // S
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

let arena = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null,
    score: 0,
    level: 1,
    lines: 0
};

// Drawing
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    drawArena();
    drawGhost();
    drawMatrix(player.matrix, player.pos, context, block_size_calc);
}

function drawArena() {
    arena.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(x, y, context, block_size_calc, false);
            }
        });
    });
}

function drawGhost() {
    const ghostPos = { ...player.pos };
    while (!collide(arena, { ...player, pos: { x: ghostPos.x, y: ghostPos.y + 1 } })) {
        ghostPos.y++;
    }
    drawMatrix(player.matrix, ghostPos, context, block_size_calc, true);
}

function drawMatrix(matrix, offset, ctx, size, isGhost = false) {
    if (!matrix) return;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(x + offset.x, y + offset.y, ctx, size, isGhost);
            }
        });
    });
}

function drawBlock(x, y, ctx, size, isGhost) {
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    const glow = getComputedStyle(document.body).getPropertyValue('--piece-glow').trim();

    ctx.save();
    ctx.translate(x * size, y * size);

    if (isGhost) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(2, 2, size - 4, size - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(2, 2, size - 4, size - 4);
    } else {
        // Shadow for Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = glow;

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(2, 2, size - 4, size - 4, 4);
        ctx.fill();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(4, 4, size - 12, 4);
    }

    ctx.restore();
}

function drawNext() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const size = 20;
    const offset = { x: 1, y: 1 };
    drawMatrix(player.next, offset, nextContext, size);
}

// Logic
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        drawNext();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerReset() {
    if (!player.next) {
        player.next = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    }
    player.matrix = player.next;
    player.next = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);

    if (collide(arena, player)) {
        gameOver();
    }
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 100;
        player.lines++;
        rowCount *= 2;

        if (player.lines % 10 === 0) {
            player.level++;
        }
    }
    updateStats();
}

function updateStats() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;
    document.getElementById('lines').innerText = player.lines;
}

// Loop
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameRunning = true;

function update(time = 0) {
    if (!gameRunning) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    const currentInterval = Math.max(100, dropInterval - (player.level - 1) * 100);

    if (dropCounter > currentInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('overlay-msg').innerText = "FIM DO JOGO";
    document.getElementById('game-overlay').classList.remove('hidden');
}

// Controls & UI
document.addEventListener('keydown', e => {
    if (!gameRunning) return;
    if (e.key === 'ArrowLeft') playerMove(-1);
    if (e.key === 'ArrowRight') playerMove(1);
    if (e.key === 'ArrowDown') playerDrop();
    if (e.key === 'ArrowUp' || e.key === 'w') playerRotate(1);
});

document.getElementById('restart-btn').addEventListener('click', () => {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    updateStats();
    playerReset();
    drawNext();
    document.getElementById('game-overlay').classList.add('hidden');
    gameRunning = true;
    lastTime = performance.now();
    update();
});

document.getElementById('quit-btn').addEventListener('click', () => {
    gameOver();
    document.getElementById('overlay-msg').innerText = "DESISTIU!";
});

// Theme Switcher
const themes = ['theme-midnight', 'theme-cyber', 'theme-rose', 'theme-emerald'];
let themeIdx = 0;
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.remove(themes[themeIdx]);
    themeIdx = (themeIdx + 1) % themes.length;
    document.body.classList.add(themes[themeIdx]);
    draw();
    drawNext();
});

// Mobile Controls
function setupMobile(id, action) {
    const btn = document.getElementById(id);
    let timer;
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        action();
        timer = setInterval(action, 150);
    });
    btn.addEventListener('touchend', () => clearInterval(timer));
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        action();
    });
}
setupMobile('move-left', () => playerMove(-1));
setupMobile('move-right', () => playerMove(1));
setupMobile('move-down', () => playerDrop());
document.getElementById('rotate').addEventListener('click', () => playerRotate(1));

// Initial Setup
const preloader = document.getElementById('preloader');
window.addEventListener('load', () => {
    setTimeout(() => {
        preloader.style.opacity = '0';
        document.body.classList.remove('loading');
        setTimeout(() => preloader.style.display = 'none', 800);
    }, 1500);
});

document.body.classList.add('loading');
playerReset();
drawNext();
update();

// PWA Install Logic
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
});

// SW Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Registration failed', err));
    });
}

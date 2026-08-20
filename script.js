// ===========================
// DNA SPACE PAIR GAME
// ===========================

// Game Configuration
const CONFIG = {
    INITIAL_LIVES: 3,
    BASE_SCORE: 100,
   
    
    GAME_WIDTH: window.innerWidth,
    GAME_HEIGHT: window.innerHeight,
    SHIP_WIDTH: 60,
    SHIP_HEIGHT: 60,
    BASE_SIZE: 50,
    SPAWN_RATE: 0.8  // Much lower spawn rate
};

// DNA Pairing Rules
const DNA_PAIRS = {
    'A': 'T',
    'T': 'A',
    'C': 'G',
    'G': 'C'
};

const ALL_BASES = ['A', 'T', 'C', 'G'];

// Game State
let gameState = {
    currentScreen: 'startScreen',
    playerName: '',
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctPairs: 0,
    lives: 3,
    gameRunning: false,
    gamePaused: false,
    currentBase: 'A',
    targetBase: 'T',
    isNewHighScore: false,
    gameStartTime: 0
};

// Input State
let inputState = {
    keys: {},
    touchX: 0,
    touchStartX: 0,
    mouseX: 0,
    mouseY: 0
};

// Audio System
let audioContext = null;
let audioInitialized = false;

// Game Objects
let ship = {
    x: CONFIG.GAME_WIDTH / 2 - CONFIG.SHIP_WIDTH / 2,
    y: CONFIG.GAME_HEIGHT - 100,
    width: CONFIG.SHIP_WIDTH,
    height: CONFIG.SHIP_HEIGHT,
    vx: 0,
    speed: 5
};

let fallingBases = [];
let particles = [];

let lastSpawnTime = 0;

// ===========================
// STORAGE MANAGEMENT
// ===========================

function getHighScores() {
    const scores = localStorage.getItem('dnaScores');
    return scores ? JSON.parse(scores) : {};
}

function saveHighScore(name, score) {
    const scores = getHighScores();
    if (!scores[name] || score > scores[name]) {
        scores[name] = score;
        localStorage.setItem('dnaScores', JSON.stringify(scores));
        return !scores[name] || score > scores[name];
    }
    return false;
}

function deleteHighScores() {
    localStorage.removeItem('dnaScores');
}

function getSettings() {
    const settings = localStorage.getItem('dnaSettings');
    return settings ? JSON.parse(settings) : {
        soundEnabled: true,
        musicEnabled: true,
        theme: 'space-blue',
        effects: 'high'
    };
}

function saveSettings(settings) {
    localStorage.setItem('dnaSettings', JSON.stringify(settings));
}

// ===========================
// AUDIO SYSTEM
// ===========================

function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInitialized = true;
}

function playSound(type) {
    const settings = getSettings();
    if (!settings.soundEnabled || !audioContext) return;

    const ctx = audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const frequencies = {
        correct: 523.25,
        wrong: 220,
        combo: 783.99,
        countdown: 1046.50,
        start: 659.25,
        gameOver: 293.66,
        newHighScore: 880
    };

    const durations = {
        correct: 0.15,
        wrong: 0.2,
        combo: 0.1,
        countdown: 0.2,
        start: 0.3,
        gameOver: 0.5,
        newHighScore: 0.3
    };

    osc.frequency.value = frequencies[type] || 440;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (durations[type] || 0.1));
    osc.start(now);
    osc.stop(now + (durations[type] || 0.1));
}

// ===========================
// SCREEN MANAGEMENT
// ===========================

function switchScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const screen = document.getElementById(screenName);
    if (screen) {
        screen.classList.add('active');
    }
    
    gameState.currentScreen = screenName;
}

// ===========================
// UI UPDATES
// ===========================

function updateLeaderboard() {
    const scores = getHighScores();
    const leaderboardEl = document.getElementById('leaderboard');
    
    if (Object.keys(scores).length === 0) {
        leaderboardEl.innerHTML = '<p class="empty-message">ยังไม่มีคะแนน</p>';
        return;
    }

    const sorted = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    leaderboardEl.innerHTML = sorted
        .map((entry, idx) => `
            <div class="leaderboard-entry">
                <span class="leaderboard-rank">#${idx + 1}</span>
                <span class="leaderboard-name">${escapeHtml(entry[0])}</span>
                <span class="leaderboard-score">${entry[1]}</span>
            </div>
        `)
        .join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateGameDisplay() {
    document.getElementById('scoreDisplay').textContent = gameState.score;
    document.getElementById('livesDisplay').textContent = gameState.lives;
    document.getElementById('comboDisplay').textContent = gameState.combo;
    document.getElementById('currentBase').textContent = gameState.currentBase;
    document.getElementById('targetBase').textContent = gameState.targetBase;
}

function updateGameOverDisplay() {
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('maxCombo').textContent = gameState.maxCombo;
    document.getElementById('correctPairs').textContent = gameState.correctPairs;
    
    const newHighScoreMsg = document.getElementById('newHighScoreMsg');
    if (gameState.isNewHighScore) {
        newHighScoreMsg.style.display = 'block';
        playSound('newHighScore');
    } else {
        newHighScoreMsg.style.display = 'none';
    }
}

// ===========================
// GAME INITIALIZATION
// ===========================

function setupEventListeners() {
    // Start Screen
    document.getElementById('startBtn').addEventListener('click', startGameFlow);
    document.getElementById('leaderboardBtn').addEventListener('click', () => {
        updateLeaderboard();
        switchScreen('leaderboardScreen');
    });
    document.getElementById('settingsBtn').addEventListener('click', openSettings);

    // Name input
    document.getElementById('playerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startGameFlow();
    });

    // Instructions Screen
    document.getElementById('readyBtn').addEventListener('click', startCountdown);

    // Game Over Screen
    document.getElementById('playAgainBtn').addEventListener('click', startGameFlow);
    document.getElementById('menuBtn').addEventListener('click', () => {
        gameState.currentScreen = 'startScreen';
        switchScreen('startScreen');
    });

    // Leaderboard
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        switchScreen('startScreen');
    });

    // Settings
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('resetScoresBtn').addEventListener('click', () => {
        if (confirm('คุณแน่ใจหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            deleteHighScores();
            updateLeaderboard();
        }
    });

    // Settings toggles
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        const settings = getSettings();
        settings.soundEnabled = e.target.checked;
        saveSettings(settings);
    });

    document.getElementById('musicToggle').addEventListener('change', (e) => {
        const settings = getSettings();
        settings.musicEnabled = e.target.checked;
        saveSettings(settings);
    });

    document.getElementById('themeSelect').addEventListener('change', (e) => {
        const settings = getSettings();
        settings.theme = e.target.value;
        saveSettings(settings);
        applyTheme(e.target.value);
    });

    document.getElementById('effectsSelect').addEventListener('change', (e) => {
        const settings = getSettings();
        settings.effects = e.target.value;
        saveSettings(settings);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        inputState.keys[e.key] = true;
        initAudio();
    });

    document.addEventListener('keyup', (e) => {
        inputState.keys[e.key] = false;
    });

    // Mouse
    document.addEventListener('mousemove', (e) => {
        inputState.mouseX = e.clientX;
        inputState.mouseY = e.clientY;
        initAudio();
    });

    // Touch
    document.addEventListener('touchstart', (e) => {
        inputState.touchStartX = e.touches[0].clientX;
        inputState.touchX = e.touches[0].clientX;
        inputState.mouseX = e.touches[0].clientX;
        initAudio();
    });

    document.addEventListener('touchmove', (e) => {
        if (gameState.gameRunning) {
            inputState.touchX = e.touches[0].clientX;
            inputState.mouseX = e.touches[0].clientX;
        }
    });

    // Window resize
    window.addEventListener('resize', handleResize);
}

function applyTheme(theme) {
    document.body.className = theme;
}

function openSettings() {
    const settings = getSettings();
    document.getElementById('soundToggle').checked = settings.soundEnabled;
    document.getElementById('musicToggle').checked = settings.musicEnabled;
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('effectsSelect').value = settings.effects;
    switchScreen('settingsScreen');
}

function closeSettings() {
    switchScreen('startScreen');
}

function handleResize() {
    CONFIG.GAME_WIDTH = window.innerWidth;
    CONFIG.GAME_HEIGHT = window.innerHeight;
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.width = CONFIG.GAME_WIDTH;
        canvas.height = CONFIG.GAME_HEIGHT;
    }
}

// ===========================
// GAME FLOW
// ===========================

function startGameFlow() {
    gameState.playerName = document.getElementById('playerName').value.trim() || 'ผู้เล่น';
    if (gameState.playerName.length > 15) {
        gameState.playerName = gameState.playerName.substring(0, 15);
    }
    
    resetGameState();
    switchScreen('instructionScreen');
}

function startCountdown() {
    switchScreen('countdownScreen');
    
    let countdown = 3;
    const countdownEl = document.getElementById('countdownDisplay');
    
    const countdownInterval = setInterval(() => {
        if (countdown > 0) {
            countdownEl.textContent = countdown;
            playSound('countdown');
            countdown--;
        } else {
            clearInterval(countdownInterval);
            countdownEl.textContent = 'GO!';
            playSound('start');
            setTimeout(() => {
                startGameplay();
            }, 500);
        }
    }, 1000);
}

function resetGameState() {
    gameState.score = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.correctPairs = 0;
    gameState.lives = CONFIG.INITIAL_LIVES;
    gameState.gameRunning = false;
    gameState.isNewHighScore = false;
    gameState.currentBase = getRandomBase();
    gameState.targetBase = DNA_PAIRS[gameState.currentBase];
    gameState.gameStartTime = 0;
    
    fallingBases = [];
    particles = [];
    
    ship.x = CONFIG.GAME_WIDTH / 2 - CONFIG.SHIP_WIDTH / 2;
    ship.vx = 0;
}

function startGameplay() {
    switchScreen('gameScreen');
    gameState.gameRunning = true;
    gameState.gameStartTime = Date.now();
    lastSpawnTime = gameState.gameStartTime;
    
    updateGameDisplay();
    setupCanvas();
    gameLoop();
}

function endGame() {
    gameState.gameRunning = false;
    playSound('gameOver');
    
    gameState.isNewHighScore = saveHighScore(gameState.playerName, gameState.score);
    
    updateGameOverDisplay();
    switchScreen('gameOverScreen');
}

// ===========================
// GAME LOGIC
// ===========================

function getRandomBase() {
    return ALL_BASES[Math.floor(Math.random() * ALL_BASES.length)];
}

function handleInput() {
    // Keyboard
    const moveLeft = inputState.keys['ArrowLeft'] || inputState.keys['a'] || inputState.keys['A'];
    const moveRight = inputState.keys['ArrowRight'] || inputState.keys['d'] || inputState.keys['D'];

    if (moveLeft) {
        ship.vx = -ship.speed;
    } else if (moveRight) {
        ship.vx = ship.speed;
    } else {
        ship.vx = 0;
    }

    // Mouse movement - follow horizontal position
    if (gameState.gameRunning && inputState.mouseX > 0) {
        ship.x = inputState.mouseX - ship.width / 2;
        ship.vx = 0;
    }

    // Touch/drag
    const touchDelta = inputState.touchX - inputState.touchStartX;
    if (Math.abs(touchDelta) > 5) {
        if (touchDelta < -10) {
            ship.vx = -ship.speed;
        } else if (touchDelta > 10) {
            ship.vx = ship.speed;
        }
    }
}

function updateGameState(deltaTime) {
    // Handle input
    handleInput();

    // Update ship position
    ship.x += ship.vx;
    
    // Clamp ship position
    if (ship.x < 0) ship.x = 0;
    if (ship.x + ship.width > CONFIG.GAME_WIDTH) {
        ship.x = CONFIG.GAME_WIDTH - ship.width;
    }

    // Spawn falling bases
    const now = Date.now();
    if (now - lastSpawnTime > 1000 * CONFIG.SPAWN_RATE) {
        spawnBase();
        lastSpawnTime = now;
    }

    // Increase fall speed based on combo, capped to avoid runaway difficulty
    const comboMultiplier = 1 + Math.min(gameState.combo * 0.02, (CONFIG.MAX_FALL_SPEED / CONFIG.INITIAL_FALL_SPEED) - 1);

    // Update falling bases
    for (let i = fallingBases.length - 1; i >= 0; i--) {
        const base = fallingBases[i];
        const effectiveSpeed = Math.min(base.speed * comboMultiplier, CONFIG.MAX_FALL_SPEED);
        base.y += effectiveSpeed;

        // Check collision with ship
        if (checkCollision(ship, base)) {
            fallingBases.splice(i, 1);
            
            if (base.type === gameState.targetBase) {
                // Correct pair
                gameState.correctPairs++;
                gameState.combo++;
                gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
                
                const bonusScore = gameState.combo * 10;
                const totalScore = CONFIG.BASE_SCORE + bonusScore;
                gameState.score += totalScore;
                
                playSound('correct');
                if (gameState.combo % 5 === 0) {
                    playSound('combo');
                }
                
                // Change base
                gameState.currentBase = getRandomBase();
                gameState.targetBase = DNA_PAIRS[gameState.currentBase];
                
                // Add particles
                createParticles(base.x, base.y, '#00f5a0', 4);
                createFloatingText(base.x, base.y, `+${totalScore}`, '#00f5a0');
            } else {
                // Wrong pair - lose a life
                gameState.lives--;
                gameState.combo = 0;
                base.speed = CONFIG.INITIAL_FALL_SPEED;
                playSound('wrong');
                createParticles(base.x, base.y, '#ff006e', 3);
                createFloatingText(base.x, base.y, 'ผิด!', '#ff006e');
                
                // Game over if no lives left
                if (gameState.lives <= 0) {
                    endGame();
                    return;
                }
            }
        }

        // Remove if off screen
        if (base.y > CONFIG.GAME_HEIGHT) {
            fallingBases.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.02;

        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    updateGameDisplay();
}

function spawnBase() {
    const x = Math.random() * (CONFIG.GAME_WIDTH - CONFIG.BASE_SIZE);
    const base = {
        type: getRandomBase(),
        x: x,
        y: -CONFIG.BASE_SIZE,
        width: CONFIG.BASE_SIZE,
        height: CONFIG.BASE_SIZE,
        speed: CONFIG.INITIAL_FALL_SPEED
    };
    fallingBases.push(base);
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function createParticles(x, y, color, count) {
    return;
}

function createFloatingText(x, y, text, color) {
    particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: -2,
        alpha: 1,
        size: 16,
        color: color,
        text: text,
        isText: true
    });
}

// ===========================
// RENDERING
// ===========================

let canvas = null;
let ctx = null;

function setupCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = CONFIG.GAME_WIDTH;
    canvas.height = CONFIG.GAME_HEIGHT;
}

function drawBackground() {
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawShip() {
    const x = ship.x;
    const y = ship.y;
    const w = ship.width;
    const h = ship.height;

    // Ship body (triangle)
    ctx.fillStyle = '#00d4ff';
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    // Display current base
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff006e';
    ctx.shadowBlur = 0;
    ctx.fillText(gameState.currentBase, x + w / 2, y + h / 2);

    ctx.shadowColor = 'transparent';
}

function drawFallingBases() {
    for (const base of fallingBases) {
        const x = base.x;
        const y = base.y;
        const size = base.width;

        // Determine color based on base type
        let color = '#00f5a0';
        // Draw orb
        ctx.fillStyle = color;
        ctx.shadowBlur = 0;
        
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw base letter
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0a0e27';
        ctx.shadowColor = 'transparent';
        ctx.fillText(base.type, x + size / 2, y + size / 2);
    }

    ctx.shadowColor = 'transparent';
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = p.alpha;

        if (p.isText) {
            ctx.font = `bold ${p.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.globalAlpha = 1;
}

function gameLoop() {
    const deltaTime = 16.67; // ~60fps

    updateGameState(deltaTime);

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawFallingBases();
    drawShip();
    drawParticles();

    if (gameState.gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// ===========================
// INITIALIZATION
// ===========================

function init() {
    const settings = getSettings();
    applyTheme(settings.theme);
    
    setupEventListeners();
    
    document.getElementById('soundToggle').checked = settings.soundEnabled;
    document.getElementById('musicToggle').checked = settings.musicEnabled;
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('effectsSelect').value = settings.effects;
    document.getElementById('playerName').focus();
}

// Start the game
window.addEventListener('load', init);

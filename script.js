const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 800;

// UI Elements
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const powerupDisplay = document.getElementById('powerup-display');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const finalLevelEl = document.getElementById('final-level');

// Game State
let state = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let level = 1;
let lives = 3;
let keys = {};
let frameCount = 0;

// Entities
let player;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let powerups = [];
let stars = [];
let specialEnemy = null;

// Background Grid
let bgGridOffset = 0;

// Configs
const COLORS = {
    cyan: '#00f0ff',
    magenta: '#ff003c',
    green: '#39ff14',
    yellow: '#fdf500',
    white: '#ffffff',
    enemy1: '#ff003c', // magenta
    enemy2: '#fdf500', // yellow
    enemy3: '#39ff14', // green
};

const POWERUP_TYPES = ['DOUBLE', 'SHIELD', 'SPEED', 'HEAL'];

// Input Handling
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Enter') {
        if (state === 'START' || state === 'GAMEOVER') {
            startGame();
        }
    }
    if (e.code === 'Space' && state === 'PLAYING') {
        player.shoot();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Classes
class Player {
    constructor() {
        this.width = 44;
        this.height = 36;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 80;
        this.baseSpeed = 6;
        this.speed = this.baseSpeed;
        
        this.cooldown = 0;
        this.fireRate = 12;
        
        // Powerups (measured in frames, 60fps = 1s)
        this.powerupTimers = {
            DOUBLE: 0,
            SHIELD: 0,
            SPEED: 0
        };
        
        this.invulnerable = 120; // 2 seconds of invulnerability on start
    }
    
    update() {
        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;
        
        // Boundaries
        if (this.x < 10) this.x = 10;
        if (this.x + this.width > canvas.width - 10) this.x = canvas.width - this.width - 10;
        
        if (this.cooldown > 0) this.cooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
        
        // Update powerups
        let activePowerup = null;
        for (let type in this.powerupTimers) {
            if (this.powerupTimers[type] > 0) {
                this.powerupTimers[type]--;
                activePowerup = type;
            }
        }
        
        this.speed = this.powerupTimers.SPEED > 0 ? this.baseSpeed * 1.6 : this.baseSpeed;
        
        if (activePowerup) {
            powerupDisplay.classList.remove('hidden');
            let text = '';
            if (activePowerup === 'DOUBLE') text = 'TIRO DUPLO';
            if (activePowerup === 'SHIELD') text = 'ESCUDO ATIVO';
            if (activePowerup === 'SPEED') text = 'VELOCIDADE EXTRA';
            powerupDisplay.textContent = text;
            
            // Blink when running out
            if (this.powerupTimers[activePowerup] < 120 && Math.floor(frameCount / 10) % 2 === 0) {
                powerupDisplay.style.opacity = 0;
            } else {
                powerupDisplay.style.opacity = 1;
            }
        } else {
            powerupDisplay.classList.add('hidden');
        }
    }
    
    shoot() {
        if (this.cooldown > 0) return;
        
        const bulletSpeed = -14;
        if (this.powerupTimers.DOUBLE > 0) {
            bullets.push(new Bullet(this.x + 8, this.y, bulletSpeed, COLORS.cyan));
            bullets.push(new Bullet(this.x + this.width - 12, this.y, bulletSpeed, COLORS.cyan));
        } else {
            bullets.push(new Bullet(this.x + this.width/2 - 2, this.y, bulletSpeed, COLORS.cyan));
        }
        this.cooldown = this.powerupTimers.SPEED > 0 ? this.fireRate - 4 : this.fireRate;
        
        // Little visual recoil
        this.y += 2;
        setTimeout(() => this.y -= 2, 50);
    }
    
    draw() {
        ctx.save();
        if (this.invulnerable > 0 && Math.floor(frameCount / 8) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        ctx.fillStyle = COLORS.cyan;
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 15;
        
        // Draw sophisticated ship
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y); // tip
        ctx.lineTo(this.x + this.width, this.y + this.height); // right wing
        ctx.lineTo(this.x + this.width/2 + 5, this.y + this.height - 8); // inner right
        ctx.lineTo(this.x + this.width/2 - 5, this.y + this.height - 8); // inner left
        ctx.lineTo(this.x, this.y + this.height); // left wing
        ctx.closePath();
        ctx.fill();
        
        // Engine Glow
        ctx.fillStyle = COLORS.white;
        ctx.shadowColor = COLORS.magenta;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        let engineFlicker = Math.random() * 8;
        ctx.moveTo(this.x + this.width/2 - 5, this.y + this.height - 5);
        ctx.lineTo(this.x + this.width/2 + 5, this.y + this.height - 5);
        ctx.lineTo(this.x + this.width/2, this.y + this.height + 5 + engineFlicker + (this.powerupTimers.SPEED > 0 ? 10 : 0));
        ctx.closePath();
        ctx.fill();
        
        // Shield
        if (this.powerupTimers.SHIELD > 0) {
            ctx.strokeStyle = COLORS.cyan;
            ctx.shadowColor = COLORS.cyan;
            ctx.shadowBlur = 15;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width - 5, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = COLORS.cyan;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    hit() {
        if (this.invulnerable > 0) return;
        
        if (this.powerupTimers.SHIELD > 0) {
            this.powerupTimers.SHIELD = 0;
            this.invulnerable = 90;
            createExplosion(this.x + this.width/2, this.y + this.height/2, COLORS.cyan); // Shield break expl
            return;
        }
        
        lives--;
        updateHUD();
        createExplosion(this.x + this.width/2, this.y + this.height/2, COLORS.magenta, 50);
        
        if (lives <= 0) {
            gameOver();
        } else {
            this.invulnerable = 150;
            this.powerupTimers.DOUBLE = 0;
            this.powerupTimers.SPEED = 0;
        }
    }
}

class Bullet {
    constructor(x, y, vy, color, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.width = isEnemy ? 6 : 4;
        this.height = isEnemy ? 18 : 20;
        this.vy = vy;
        this.color = color;
        this.active = true;
        this.isEnemy = isEnemy;
    }
    
    update() {
        this.y += this.vy;
        if (this.y < -50 || this.y > canvas.height + 50) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.fillStyle = COLORS.white;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        
        // Better bullet shape
        if (this.isEnemy) {
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 4);
            ctx.fill();
        }
    }
}

class Enemy {
    constructor(x, y, type) {
        this.width = 30;
        this.height = 30;
        // Start offscreen for entrance anim
        this.x = x;
        this.y = y - 400; 
        this.targetY = y;
        
        this.type = type; // 1 (bottom), 2 (mid), 3 (top)
        this.active = true;
        this.hp = type; // Top enemies have 3 HP!
        
        this.baseX = x;
        
        this.color = type === 1 ? COLORS.enemy1 : (type === 2 ? COLORS.enemy2 : COLORS.enemy3);
    }
    
    update(groupDx, groupDy) {
        // Entrance animation
        if (this.y < this.targetY) {
            this.y += 5;
            this.baseX = this.x; // Set relative base
            return;
        }
        
        this.x = this.baseX + groupDx;
        this.y = this.targetY + groupDy;
        
        if (Math.random() < 0.0005 + (level * 0.0002)) {
            this.shoot();
        }
    }
    
    shoot() {
        enemyBullets.push(new Bullet(this.x + this.width/2 - 3, this.y + this.height, 6 + level*0.5, this.color, true));
    }
    
    draw() {
        if (this.y < -50) return; // Don't draw if high offscreen
        
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Flicker effect when damaged
        if (this.hp < this.type) {
             if (frameCount % 4 < 2) ctx.fillStyle = COLORS.white;
        }
        
        // Draw different shapes per type
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        // Add a slight hover effect
        let hover = Math.sin(frameCount * 0.05 + this.x) * 2;
        ctx.translate(0, hover);
        
        if (this.type === 1) {
            // Triangle like shape
            ctx.beginPath();
            ctx.moveTo(0, 15);
            ctx.lineTo(15, -10);
            ctx.lineTo(-15, -10);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 2) {
            // Diamond
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-15, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            // Hexagonish / Boss
            ctx.beginPath();
            ctx.moveTo(-10, -15);
            ctx.lineTo(10, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(10, 15);
            ctx.lineTo(-10, 15);
            ctx.lineTo(-15, 0);
            ctx.closePath();
            ctx.fill();
            
            // Core
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class SpecialEnemy {
    constructor() {
        this.width = 60;
        this.height = 25;
        // 50% chance to spawn left or right
        let startLeft = Math.random() > 0.5;
        this.x = startLeft ? -this.width : canvas.width + this.width;
        this.y = 40 + Math.random() * 20;
        this.vx = (startLeft ? 1 : -1) * (3 + level * 0.2);
        this.active = true;
        this.color = COLORS.magenta;
        this.hp = 10;
    }
    
    update() {
        this.x += this.vx;
        if ((this.vx > 0 && this.x > canvas.width + 100) || 
            (this.vx < 0 && this.x < -100)) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 25;
        
        // UFO Shape
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height/2, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = COLORS.cyan;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + 5, this.width/3, this.height/1.5, 0, Math.PI, 0);
        ctx.fill();
        
        // Blinking lights
        const colors = [COLORS.cyan, COLORS.yellow, COLORS.green];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = frameCount % (10 + i*5) < 5 ? colors[i] : '#000';
            ctx.beginPath();
            ctx.arc(this.x + 15 + i*15, this.y + this.height/2 + 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.vy = 2.5;
        this.type = type;
        this.active = true;
        
        if (type === 'HEAL') this.color = COLORS.green;
        else if (type === 'SHIELD') this.color = COLORS.cyan;
        else if (type === 'DOUBLE') this.color = COLORS.magenta;
        else this.color = COLORS.yellow; // SPEED
    }
    
    update() {
        this.y += this.vy;
        if (this.y > canvas.height) this.active = false;
    }
    
    draw() {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(frameCount * 0.05);
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Fill subtly
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.globalAlpha = 1;
        
        // Draw icon text
        ctx.rotate(-frameCount * 0.05); // un-rotate for stable text
        ctx.font = "12px 'Press Start 2P'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0; // Better readability
        let char = 'P';
        if (this.type === 'HEAL') char = '+';
        if (this.type === 'SHIELD') char = 'S';
        if (this.type === 'DOUBLE') char = 'D';
        if (this.type === 'SPEED') char = 'V';
        ctx.fillText(char, 1, 1);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, speed = 8) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let velocity = Math.random() * speed;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.01;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95; // friction
        this.vy *= 0.95;
        this.life -= this.decay;
    }
    
    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// Group variables for enemy movement
let groupDx = 0;
let groupDy = 0;
let groupVx = 2; // base speed
let groupMoveAmp = 150; // pixels to move left/right

// Helper Functions
function createExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function spawnEnemies() {
    enemies = [];
    enemyBullets = [];
    
    // Group variables reset
    groupDx = 0;
    groupDy = 0;
    groupVx = 2 + (level * 0.3); // Speed increases with level
    groupMoveAmp = 100 + Math.random() * 80;
    
    let rows = Math.min(3 + Math.floor(level / 2), 6);
    let cols = 8;
    
    // Calculate centering
    let startX = (canvas.width - (cols * 50)) / 2;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Type based on row. Top rows are harder.
            let type = (rows - r <= 1) ? 3 : (rows - r <= 3 ? 2 : 1);
            enemies.push(new Enemy(startX + c * 50, 80 + r * 50, type));
        }
    }
}

function initStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vy: Math.random() * 3 + 0.5,
            size: Math.random() > 0.9 ? 2 : 1,
            color: Math.random() > 0.8 ? COLORS.cyan : COLORS.white
        });
    }
}

function updateDrawBackground() {
    // Cyberpunk grid perspective (simple)
    bgGridOffset = (bgGridOffset + 1) % 40;
    
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Vertical lines
    for (let x = 0; x <= canvas.width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    
    // Horizontal lines moving down
    for (let y = bgGridOffset; y <= canvas.height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    for (let star of stars) {
        star.y += star.vy + (player && player.powerupTimers && player.powerupTimers.SPEED > 0 ? 2 : 0);
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        
        ctx.fillStyle = star.color;
        ctx.shadowBlur = star.size > 1 ? 5 : 0;
        ctx.shadowColor = star.color;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.shadowBlur = 0; // reset
}

function AABB(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function spawnPowerup(x, y) {
    if (Math.random() < 0.15) { // 15% chance
        // Weight: Heal is rare, others equal
        let r = Math.random();
        let type;
        if (r < 0.1) type = 'HEAL';
        else if (r < 0.4) type = 'SHIELD';
        else if (r < 0.7) type = 'DOUBLE';
        else type = 'SPEED';
        
        powerups.push(new PowerUp(x, y, type));
    }
}

// General Update
function update() {
    if (state !== 'PLAYING') return;
    frameCount++;
    
    player.update();
    
    // Spawn special enemy
    if (!specialEnemy && Math.random() < 0.001 * level) {
        specialEnemy = new SpecialEnemy();
    }
    
    if (specialEnemy) {
        specialEnemy.update();
        if (!specialEnemy.active) specialEnemy = null;
    }
    
    bullets.forEach(b => b.update());
    enemyBullets.forEach(b => b.update());
    particles.forEach(p => p.update());
    powerups.forEach(p => p.update());
    
    // Update group movement
    groupDx += groupVx;
    if (Math.abs(groupDx) > groupMoveAmp) {
        groupVx *= -1; // Reverse direction
        groupDy += 25; // Move down
    }
    
    enemies.forEach(e => {
        e.update(groupDx, groupDy);
        
        // Game over if they reach player height
        if (e.y + e.height > player.y) {
            gameOver();
        }
    });
    
    // Collisions
    bullets.forEach(b => {
        if (!b.active || b.isEnemy) return; // Player bullets only here
        
        // Bullet vs enemies
        for (let e of enemies) {
            if (e.active && e.y > 0 && AABB(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) {
                b.active = false;
                e.hp--;
                
                if (e.hp <= 0) {
                    e.active = false;
                    let expScore = e.type * 100 * level;
                    score += expScore;
                    createExplosion(e.x + e.width/2, e.y + e.height/2, e.color, 30);
                    spawnPowerup(e.x + e.width/2, e.y + e.height/2);
                } else {
                    createExplosion(b.x, b.y, COLORS.white, 5); // small hit effect
                }
                updateHUD();
                break;
            }
        }
        
        // Bullet vs special enemy
        if (b.active && specialEnemy && AABB(b.x, b.y, b.width, b.height, specialEnemy.x, specialEnemy.y, specialEnemy.width, specialEnemy.height)) {
            b.active = false;
            specialEnemy.hp--;
            if (specialEnemy.hp <= 0) {
                specialEnemy.active = false;
                score += 1500 * level;
                createExplosion(specialEnemy.x + specialEnemy.width/2, specialEnemy.y + specialEnemy.height/2, specialEnemy.color, 80);
                // Special enemy always drops extra life or shield
                powerups.push(new PowerUp(specialEnemy.x + specialEnemy.width/2, specialEnemy.y, Math.random() > 0.5 ? 'HEAL' : 'SHIELD')); 
                specialEnemy = null;
                updateHUD();
            } else {
                createExplosion(b.x, b.y, COLORS.white, 5);
            }
        }
    });
    
    // Enemy Bullets vs Player
    enemyBullets.forEach(b => {
        if (!b.active) return;
        if (AABB(b.x, b.y, b.width, b.height, player.x, player.y, player.width, player.height)) {
            b.active = false;
            player.hit();
        }
    });
    
    // Powerups vs Player
    powerups.forEach(p => {
        if (!p.active) return;
        if (AABB(p.x, p.y, p.width, p.height, player.x, player.y, player.width, player.height)) {
            p.active = false;
            if (p.type === 'HEAL') {
                lives++;
                createExplosion(player.x + player.width/2, player.y + player.height/2, COLORS.green, 40);
                updateHUD();
            } else {
                player.powerupTimers[p.type] = 60 * 12; // 12 seconds
            }
            score += 250;
            updateHUD();
        }
    });
    
    // Filter inactive entities
    bullets = bullets.filter(b => b.active);
    enemyBullets = enemyBullets.filter(b => b.active);
    enemies = enemies.filter(e => e.active);
    particles = particles.filter(p => p.life > 0);
    powerups = powerups.filter(p => p.active);
    
    // Level Complete
    if (enemies.length === 0) {
        level++;
        player.invulnerable = 180; // 3 seconds invuln
        spawnEnemies();
        updateHUD();
    }
}

// Drawing
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    updateDrawBackground();
    
    if (state === 'PLAYING') {
        if (specialEnemy) specialEnemy.draw();
        
        enemies.forEach(e => e.draw());
        bullets.forEach(b => b.draw());
        enemyBullets.forEach(b => b.draw());
        powerups.forEach(p => p.draw());
        
        // Draw player last so it's on top
        player.draw();
        
        // Particles on very top
        particles.forEach(p => p.draw());
    } else {
        // Draw particles even when not playing (e.g. game over explosion)
        particles.forEach(p => p.draw());
    }
}

// Core Game Loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Flow Control
function startGame() {
    state = 'PLAYING';
    score = 0;
    level = 1;
    lives = 3;
    frameCount = 0;
    
    player = new Player();
    bullets = [];
    enemyBullets = [];
    particles = [];
    powerups = [];
    specialEnemy = null;
    
    spawnEnemies();
    updateHUD();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
}

function gameOver() {
    state = 'GAMEOVER';
    finalScoreEl.textContent = score;
    finalLevelEl.textContent = level;
    
    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
    }, 1000); // Wait 1 second before showing game over screen for explosion drama
    
    hud.classList.add('hidden');
    powerupDisplay.classList.add('hidden');
}

function updateHUD() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    // Format lives padding
    livesEl.textContent = '♥'.repeat(lives);
    livesEl.style.color = COLORS.magenta;
    livesEl.style.textShadow = `0 0 10px ${COLORS.magenta}`;
}

// Startup
initStars();
// Draw one frame to show background on start screen
draw();
requestAnimationFrame(loop);


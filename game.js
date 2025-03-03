const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CELL_SIZE = 20;
const PACMAN_SIZE = 16;
const DOT_SIZE = 4;
const CHASE_TIME = 10000; // 10 seconds in milliseconds
const SPEED = 3;
const FLICKER_RATE = 100; // Controls how fast the prey flickers (in milliseconds)

// Game state
let pacman = {
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 1.5,
    direction: 0,
    mouthOpen: 0.2,
    color: 'yellow',
    dotsEaten: 0
};

let aiPacman = {
    x: CELL_SIZE * 18.5,
    y: CELL_SIZE * 7.5,
    direction: Math.PI,
    mouthOpen: 0.2,
    color: 'red',
    dotsEaten: 0
};

let gamePhase = 'collecting'; // 'collecting', 'chase'
let chaseStartTime = null;
let currentHunter = null;
let currentPrey = null;
let isTwoPlayerMode = false;
let gameStarted = false;

// Add after other game state variables
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    a: false,
    s: false,
    d: false,
    W: false,
    A: false,
    S: false,
    D: false
};

// Simple maze layout (0: path, 1: wall)
const maze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Modified dots array creation
let dots = [];
for(let y = 0; y < maze.length; y++) {
    for(let x = 0; x < maze[0].length; x++) {
        if(maze[y][x] === 0) {
            dots.push({x: x * CELL_SIZE + CELL_SIZE/2, y: y * CELL_SIZE + CELL_SIZE/2});
        }
    }
}

function drawMaze() {
    ctx.fillStyle = 'blue';
    for(let y = 0; y < maze.length; y++) {
        for(let x = 0; x < maze[0].length; x++) {
            if(maze[y][x] === 1) {
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function drawDots() {
    ctx.fillStyle = 'white';
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_SIZE, 0, Math.PI * 2);
        ctx.fill();
    });
}

function findNextMove(pacmanObj, target) {
    const directions = [
        {dx: 3, dy: 0, angle: 0},
        {dx: -3, dy: 0, angle: Math.PI},
        {dx: 0, dy: -3, angle: -Math.PI/2},
        {dx: 0, dy: 3, angle: Math.PI/2}
    ];

    let bestMove = null;
    let shortestDistance = Infinity;

    directions.forEach(dir => {
        const newX = pacmanObj.x + dir.dx;
        const newY = pacmanObj.y + dir.dy;
        
        if (!checkCollision(newX, newY)) {
            const distance = Math.hypot(target.x - newX, target.y - newY);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                bestMove = dir;
            }
        }
    });

    return bestMove;
}

function moveAIPacman() {
    let target;
    if (gamePhase === 'collecting') {
        // Find nearest dot
        target = dots.reduce((nearest, dot) => {
            const distToDot = Math.hypot(dot.x - aiPacman.x, dot.y - aiPacman.y);
            const distToNearest = nearest ? Math.hypot(nearest.x - aiPacman.x, nearest.y - aiPacman.y) : Infinity;
            return distToDot < distToNearest ? dot : nearest;
        }, null);
    } else {
        // Chase or run from the other pacman
        target = currentHunter === aiPacman ? currentPrey : {
            x: aiPacman.x * 2 - currentHunter.x,
            y: aiPacman.y * 2 - currentHunter.y
        };
    }

    if (target) {
        const move = findNextMove(aiPacman, target);
        if (move) {
            aiPacman.x += move.dx;
            aiPacman.y += move.dy;
            aiPacman.direction = move.angle;
        }
    }
}

function checkPacmanCollision() {
    const distance = Math.hypot(pacman.x - aiPacman.x, pacman.y - aiPacman.y);
    if (distance < PACMAN_SIZE) {
        if (currentHunter === pacman) {
            alert('Yellow Pacman wins!');
        } else if (currentHunter === aiPacman) {
            alert('Red Pacman wins!');
        }
        location.reload();
    }
}

function startChasePhase() {
    gamePhase = 'chase';
    // Determine who ate more dots
    if (pacman.dotsEaten >= aiPacman.dotsEaten) {
        currentHunter = pacman;
        currentPrey = aiPacman;
    } else {
        currentHunter = aiPacman;
        currentPrey = pacman;
    }
    chaseStartTime = Date.now();
}

function switchRoles() {
    const temp = currentHunter;
    currentHunter = currentPrey;
    currentPrey = temp;
    chaseStartTime = Date.now();
}

function checkDotCollision() {
    // Check for player pacman
    const wasEatingPlayer = dots.length;
    dots = dots.filter(dot => {
        const distance = Math.hypot(dot.x - pacman.x, dot.y - pacman.y);
        return distance > PACMAN_SIZE/2;
    });
    if (dots.length < wasEatingPlayer) {
        pacman.dotsEaten++;
        pacman.mouthOpen = 0.6;
    }

    // Check for AI pacman
    const wasEatingAI = dots.length;
    dots = dots.filter(dot => {
        const distance = Math.hypot(dot.x - aiPacman.x, dot.y - aiPacman.y);
        return distance > PACMAN_SIZE/2;
    });
    if (dots.length < wasEatingAI) {
        aiPacman.dotsEaten++;
        aiPacman.mouthOpen = 0.6;
    }
    
    if(dots.length === 0 && gamePhase === 'collecting') {
        startChasePhase();
    }
}

function shouldShowPrey() {
    if (gamePhase !== 'chase') return true;
    return Math.floor(Date.now() / FLICKER_RATE) % 2 === 0;
}

function drawPacmanObject(pacmanObj) {
    // Don't draw the prey when it should be hidden for flicker effect
    if (gamePhase === 'chase' && pacmanObj === currentPrey && !shouldShowPrey()) {
        return;
    }

    ctx.fillStyle = pacmanObj.color;
    ctx.beginPath();
    ctx.arc(pacmanObj.x, pacmanObj.y, PACMAN_SIZE/2, 
        pacmanObj.direction + pacmanObj.mouthOpen, 
        pacmanObj.direction + 2 * Math.PI - pacmanObj.mouthOpen);
    ctx.lineTo(pacmanObj.x, pacmanObj.y);
    ctx.fill();

    if (pacmanObj.mouthOpen > 0.2) {
        pacmanObj.mouthOpen -= 0.05;
    }
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Yellow: ${pacman.dotsEaten}`, 10, 30);
    ctx.fillText(`Red: ${aiPacman.dotsEaten}`, canvas.width - 100, 30);
    
    if (gamePhase === 'chase') {
        ctx.textAlign = 'center';
        const timeLeft = Math.ceil((CHASE_TIME - (Date.now() - chaseStartTime)) / 1000);
        ctx.fillText(`Time: ${timeLeft}s`, canvas.width/2 - 40, 30);
    }

    // Show controls
    ctx.font = '14px Arial';
    ctx.fillText('Yellow: Arrow Keys', 10, canvas.height - 10);
    if (isTwoPlayerMode) {
        ctx.fillText('Red: WASD Keys', canvas.width - 120, canvas.height - 10);
    }
}

function showModeSelection() {
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to toggle game mode', canvas.width/2, canvas.height/2 - 30);
    ctx.fillText(`Current mode: ${isTwoPlayerMode ? 'Two Players' : 'Single Player'}`, canvas.width/2, canvas.height/2 + 10);
    ctx.font = '18px Arial';
    ctx.fillText('Press ENTER to start', canvas.width/2, canvas.height/2 + 50);
}

// Add this new function to handle movement
function handleMovement() {
    if (!gameStarted) return;

    // Yellow Pacman movement
    let newX = pacman.x;
    let newY = pacman.y;
    let moved = false;
    
    if (keys.ArrowLeft) {
        newX -= SPEED;
        pacman.direction = Math.PI;
        moved = true;
    }
    if (keys.ArrowRight) {
        newX += SPEED;
        pacman.direction = 0;
        moved = true;
    }
    if (keys.ArrowUp) {
        newY -= SPEED;
        pacman.direction = -Math.PI/2;
        moved = true;
    }
    if (keys.ArrowDown) {
        newY += SPEED;
        pacman.direction = Math.PI/2;
        moved = true;
    }

    if (moved && !checkCollision(newX, newY)) {
        pacman.x = newX;
        pacman.y = newY;
    }

    // Red Pacman movement (only in two-player mode)
    if (isTwoPlayerMode) {
        newX = aiPacman.x;
        newY = aiPacman.y;
        moved = false;

        if (keys.a || keys.A) {
            newX -= SPEED;
            aiPacman.direction = Math.PI;
            moved = true;
        }
        if (keys.d || keys.D) {
            newX += SPEED;
            aiPacman.direction = 0;
            moved = true;
        }
        if (keys.w || keys.W) {
            newY -= SPEED;
            aiPacman.direction = -Math.PI/2;
            moved = true;
        }
        if (keys.s || keys.S) {
            newY += SPEED;
            aiPacman.direction = Math.PI/2;
            moved = true;
        }

        if (moved && !checkCollision(newX, newY)) {
            aiPacman.x = newX;
            aiPacman.y = newY;
        }
    }
}

// Modify the update function to include movement handling
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameStarted) {
        showModeSelection();
        requestAnimationFrame(update);
        return;
    }

    handleMovement();

    drawMaze();
    drawDots();
    drawPacmanObject(pacman);
    drawPacmanObject(aiPacman);
    drawScore();
    
    if (!isTwoPlayerMode) {
        moveAIPacman();
    }
    checkDotCollision();
    
    if (gamePhase === 'chase') {
        checkPacmanCollision();
        if (Date.now() - chaseStartTime >= CHASE_TIME) {
            switchRoles();
        }
    }

    // Gradually close mouths
    if (pacman.mouthOpen > 0.2) pacman.mouthOpen -= 0.05;
    if (aiPacman.mouthOpen > 0.2) aiPacman.mouthOpen -= 0.05;

    requestAnimationFrame(update);
}

function checkCollision(x, y) {
    // Convert position to grid coordinates
    const cellX = Math.floor(x / CELL_SIZE);
    const cellY = Math.floor(y / CELL_SIZE);
    
    // Check the immediate surrounding cells
    for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
            const checkY = cellY + offsetY;
            const checkX = cellX + offsetX;
            
            // Check bounds
            if (checkY < 0 || checkY >= maze.length || checkX < 0 || checkX >= maze[0].length) {
                continue;
            }
            
            // Check if there's a wall nearby
            if (maze[checkY][checkX] === 1) {
                // Calculate distance to the wall
                const wallCenterX = (checkX * CELL_SIZE) + (CELL_SIZE / 2);
                const wallCenterY = (checkY * CELL_SIZE) + (CELL_SIZE / 2);
                const distance = Math.hypot(x - wallCenterX, y - wallCenterY);
                
                // If we're too close to a wall, return true
                if (distance < PACMAN_SIZE) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Modify the keydown event listener
document.addEventListener('keydown', (e) => {
    if (!gameStarted) {
        if (e.code === 'Space') {
            isTwoPlayerMode = !isTwoPlayerMode;
            return;
        }
        if (e.code === 'Enter') {
            gameStarted = true;
            return;
        }
        return;
    }

    const key = e.key;
    if (key in keys) {
        e.preventDefault();
        keys[key] = true;
        console.log('Key pressed:', key); // Debug log
    }
});

// Modify the keyup event listener
document.addEventListener('keyup', (e) => {
    const key = e.key;
    if (key in keys) {
        keys[key] = false;
        console.log('Key released:', key); // Debug log
    }
});

// Start the game
update(); 
// Константы игры
const GRAVITY = 1200; // Значительно увеличено для еще более быстрого падения
const FLAP_FORCE = -500; // Скорректировано для более резкого, но контролируемого взлета
const PIPE_SPEED = 90; // 1.5 * 60 для независимости от FPS
const PIPE_SPAWN_INTERVAL = 2000; // Увеличено с 1500 мс для большего расстояния между парами труб
const PIPE_GAP = 200; // Увеличено со 150 для более широкого прохода между трубами
const PIPE_WIDTH = 80;

// Загрузка изображений
let imagesLoaded = 0;
let totalImages = 6; // 1 птица + 2 трубы + 3 фона

const birdImg = new Image();
birdImg.onload = imageLoaded;
birdImg.onerror = imageError;
birdImg.src = 'img/bird.svg';

const pipeTopImg = new Image();
pipeTopImg.onload = imageLoaded;
pipeTopImg.onerror = imageError;
pipeTopImg.src = 'img/pipe-top.svg';

const pipeBottomImg = new Image();
pipeBottomImg.onload = imageLoaded;
pipeBottomImg.onerror = imageError;
pipeBottomImg.src = 'img/pipe-bottom.svg';

const bgLayers = [];
for (let i = 1; i <= 3; i++) {
    const img = new Image();
    img.onload = imageLoaded;
    img.onerror = imageError;
    img.src = `img/bg-layer-${i}.svg`;
    bgLayers.push(img);
}

// Функция для отслеживания загрузки изображений
function imageLoaded() {
    imagesLoaded++;
    console.log(`Изображение загружено (${imagesLoaded}/${totalImages})`); 
    checkAllImagesLoaded();
}

// Функция для обработки ошибок загрузки изображений
function imageError() {
    console.error('Ошибка загрузки изображения:', this.src);
}

// Проверка загрузки всех изображений
function checkAllImagesLoaded() {
    if (imagesLoaded >= totalImages) {
        console.log('Все изображения загружены');
        // Все изображения загружены, можно начинать игру
        const startButton = document.getElementById('start-button');
        startButton.disabled = false;
        startButton.textContent = 'Начать игру';
    }
}

// Глобальные переменные
let canvas, ctx;
let bird;
let pipes = [];
let score = 0;
let gameStarted = false;
let gameOver = false;
let lastFrameTime = 0;
let pipeSpawnTimer = 0;

let bgPositions = [0, 0, 0]; // Позиции для параллакс-эффекта

// Класс для птицы
class Bird {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocity = 0;
        this.rotation = 0;
    }

    update(deltaTime) {
        // Применяем гравитацию с учетом времени
        this.velocity += GRAVITY * deltaTime;
        this.y += this.velocity * deltaTime;

        // Обновляем угол поворота птицы в зависимости от скорости
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));

        // Проверяем столкновение с землей
        if (this.y + this.height > canvas.height - 50) {
            this.y = canvas.height - 50 - this.height;
            this.velocity = 0;
            endGame();
        }

        // Проверяем столкновение с верхней границей
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    flap() {
        this.velocity = FLAP_FORCE;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        if (birdImg.complete && birdImg.naturalWidth !== 0) {
            ctx.drawImage(birdImg, -this.width / 2, -this.height / 2, this.width, this.height);
        }

        ctx.restore();
    }

    getBounds() {
        // Уменьшаем хитбокс птицы, добавляя отступы со всех сторон
        const padding = 8; // Увеличено с 5
        return {
            x: this.x + padding,
            y: this.y + padding,
            width: this.width - padding * 2,
            height: this.height - padding * 2
        };
    }
}

// Класс для препятствий (пенисов)
class Pipe {
    constructor(x, height, isTop) {
        this.x = x;
        this.height = height;
        this.width = PIPE_WIDTH;
        this.isTop = isTop;
        this.counted = false;
    }

    update(deltaTime) {
        this.x -= PIPE_SPEED * deltaTime;
    }

    draw() {
        const img = this.isTop ? pipeTopImg : pipeBottomImg;
        
        // Проверяем, что изображение полностью загружено перед отрисовкой
        if (!img.complete || img.naturalWidth === 0) {
            return; // Пропускаем отрисовку, если изображение не загружено
        }
        
        if (this.isTop) {
            ctx.drawImage(img, this.x, 0, this.width, this.height);
        } else {
            const y = canvas.height - this.height;
            ctx.drawImage(img, this.x, y, this.width, this.height);
        }
    }

    getBounds() {
        // Уменьшаем хитбокс трубы, добавляя отступы
        const paddingX = 15; // Увеличено с 10
        const paddingY = 10;  // Увеличено с 5
        
        if (this.isTop) {
            return {
                x: this.x + paddingX,
                y: 0 + paddingY,
                width: this.width - paddingX * 2,
                height: this.height - paddingY
            };
        } else {
            return {
                x: this.x + paddingX,
                y: (canvas.height - this.height) + paddingY,
                width: this.width - paddingX * 2,
                height: this.height - paddingY
            };
        }
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// Функция для создания пары препятствий
function spawnPipes() {
    const centerY = canvas.height / 2 + (Math.random() * 150 - 75);
    const topHeight = centerY - PIPE_GAP / 2;
    const bottomHeight = canvas.height - (centerY + PIPE_GAP / 2);

    pipes.push(new Pipe(canvas.width, topHeight, true));
    pipes.push(new Pipe(canvas.width, bottomHeight, false));
}

// Функция для проверки столкновений
function checkCollisions() {
    const birdBounds = bird.getBounds();

    for (const pipe of pipes) {
        const pipeBounds = pipe.getBounds();

        // Проверяем столкновение
        if (birdBounds.x + birdBounds.width > pipeBounds.x &&
            birdBounds.x < pipeBounds.x + pipeBounds.width &&
            birdBounds.y + birdBounds.height > pipeBounds.y &&
            birdBounds.y < pipeBounds.y + pipeBounds.height) {
            endGame();
            return;
        }

        // Увеличиваем счет, когда птица пролетает через препятствие
        if (!pipe.counted && pipe.x + pipe.width < birdBounds.x && pipe.isTop) {
            pipe.counted = true;
            score++;
        }
    }
}

// Функция для отрисовки фона с параллакс-эффектом
function drawBackground(deltaTime) {
    // Рисуем слои фона с разной скоростью для эффекта параллакса
    for (let i = 0; i < bgLayers.length; i++) {
        // Проверяем загрузку изображения
        if (!bgLayers[i].complete || bgLayers[i].naturalWidth === 0) continue;
        
        // Рассчитываем скорость с учетом времени кадра
        const speed = (i + 1) * 30; // 0.5 * 60 для перевода в пиксели/сек
        
        // Обновляем позицию слоя
        bgPositions[i] -= speed * deltaTime;
        
        // Сброс позиции при выходе за границы
        if (bgPositions[i] <= -canvas.width) bgPositions[i] = 0;
        
        // Отрисовка двух экземпляров слоя
        ctx.drawImage(bgLayers[i], bgPositions[i], 0, canvas.width, canvas.height);
        ctx.drawImage(bgLayers[i], bgPositions[i] + canvas.width, 0, canvas.width, canvas.height);
    }
}

// Функция для отрисовки счета
function drawScore() {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    
    const scoreText = `Счет: ${score}`;
    ctx.fillText(scoreText, canvas.width / 2, 50);
    ctx.strokeText(scoreText, canvas.width / 2, 50);
}

// Функция для завершения игры
function endGame() {
    gameOver = true;
    gameStarted = false;
    document.getElementById('final-score').textContent = `Счет: ${score}`;
    document.getElementById('game-over').style.display = 'flex';
}

// Функция для сброса игры
function resetGame() {
    bird = new Bird(50, canvas.height / 2 - 25, 50, 35);
    pipes = [];
    score = 0;
    gameOver = false;
    lastPipeSpawn = 0;
    document.getElementById('game-over').style.display = 'none';
}

// Основной игровой цикл
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(deltaTime);

    if (gameStarted && !gameOver) {
        bird.update(deltaTime);

        pipeSpawnTimer += deltaTime;
        if (pipeSpawnTimer >= PIPE_SPAWN_INTERVAL / 1000) {
            spawnPipes();
            pipeSpawnTimer = 0;
        }

        pipes = pipes.filter(pipe => !pipe.isOffScreen());
        pipes.forEach(pipe => pipe.update(deltaTime));
        checkCollisions();
    }

    // Рисуем птицу и препятствия
    bird.draw();
    pipes.forEach(pipe => pipe.draw());

    // Рисуем счет
    if (gameStarted || gameOver) {
        drawScore();
    }

    // Продолжаем игровой цикл
    requestAnimationFrame(gameLoop);
}

// Инициализация игры
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Создаем птицу
    resetGame();

    // Обработчики событий
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (!gameStarted && !gameOver && imagesLoaded >= totalImages) {
                gameStarted = true;
                document.getElementById('start-screen').style.display = 'none';
            } else if (gameStarted && !gameOver) {
                bird.flap();
            }
        }
    });

    canvas.addEventListener('click', () => {
        if (gameStarted && !gameOver) {
            bird.flap();
        }
    });

    // Деактивируем кнопку старта до загрузки всех изображений
    const startButton = document.getElementById('start-button');
    startButton.disabled = true;
    startButton.textContent = 'Загрузка ресурсов...';
    
    // Проверяем, загружены ли уже все изображения
    if (imagesLoaded >= totalImages) {
        startButton.disabled = false;
        startButton.textContent = 'Начать игру';
    }
    
    startButton.addEventListener('click', () => {
        if (imagesLoaded >= totalImages) {
            gameStarted = true;
            document.getElementById('start-screen').style.display = 'none';
            // Запускаем аудио после пользовательского взаимодействия
            gameAudio.play();
        } else {
            alert('Пожалуйста, дождитесь загрузки всех ресурсов');
        }
    });

    document.getElementById('restart-button').addEventListener('click', () => {
        resetGame();
        gameStarted = true;
    });



    // Инициализация аудио
    const gameAudio = new Audio('audio/hero.mp3');
    gameAudio.loop = true;
    let isMuted = false;
    
    // Добавляем обработчик кнопки звука
    document.getElementById('mute-button').addEventListener('click', () => {
        isMuted = !isMuted;
        gameAudio.muted = isMuted;
        document.getElementById('mute-button').textContent = isMuted ? '🔇' : '🔊';
    });
    
    // Управление аудио при событиях игры
    // Перенесено в обработчик кнопки старта
    
    // При Game Over
    gameAudio.pause();
    gameAudio.currentTime = 0;
    
    // В функции resetGame
    gameAudio.pause();
    gameAudio.currentTime = 0;

    // Запускаем игровой цикл только после проверки загрузки изображений
    if (imagesLoaded >= totalImages) {
        requestAnimationFrame(gameLoop);
    } else {
        // Если изображения еще не загружены, ждем их загрузки
        const checkInterval = setInterval(() => {
            if (imagesLoaded >= totalImages) {
                clearInterval(checkInterval);
                requestAnimationFrame(gameLoop);
                console.log('Игра запущена после загрузки всех изображений');
            }
        }, 100);
    }
}

// Запускаем игру после загрузки страницы
window.addEventListener('load', init);
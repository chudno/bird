# Flappy Bird - Документация

## Содержание
1. [Обзор игры](#обзор-игры)
2. [Константы игры](#константы-игры)
3. [Структура классов](#структура-классов)
4. [Механики игры](#механики-игры)
5. [Игровой цикл](#игровой-цикл)
6. [Система столкновений](#система-столкновений)
7. [Визуальные эффекты](#визуальные-эффекты)
8. [Управление игрой](#управление-игрой)
9. [Аудио](#аудио)

## Обзор игры
Flappy Bird - это аркадная игра, в которой игрок управляет птицей, пытаясь пролететь между препятствиями (трубами). Игра имеет простое управление - нажатие на пробел или клик мышью заставляет птицу подпрыгивать, а гравитация постоянно тянет её вниз. Цель игры - набрать как можно больше очков, пролетая через препятствия.

## Константы игры

```javascript
const GRAVITY = 300;             // Сила гравитации (пикселей/сек²)
const FLAP_FORCE = -250;         // Сила прыжка птицы (отрицательная для движения вверх)
const PIPE_SPEED = 90;           // Скорость движения труб (пикселей/сек)
const PIPE_SPAWN_INTERVAL = 2000; // Интервал создания новых труб (мс)
const PIPE_GAP = 200;            // Расстояние между верхней и нижней трубой
const PIPE_WIDTH = 80;           // Ширина труб в пикселях
```

Эти константы определяют основные параметры игры и могут быть настроены для изменения сложности и ощущений от игры:
- Увеличение `GRAVITY` делает падение птицы более быстрым
- Уменьшение `FLAP_FORCE` (по модулю) делает прыжки менее высокими
- Увеличение `PIPE_SPEED` ускоряет движение труб, усложняя игру
- Уменьшение `PIPE_GAP` сужает проход между трубами
- Изменение `PIPE_SPAWN_INTERVAL` влияет на частоту появления препятствий

## Структура классов

### Класс Bird
Класс `Bird` представляет игрового персонажа - птицу, которой управляет игрок.

```javascript
class Bird {
    constructor(x, y, width, height) {
        this.x = x;              // Позиция по X
        this.y = y;              // Позиция по Y
        this.width = width;      // Ширина спрайта
        this.height = height;    // Высота спрайта
        this.velocity = 0;       // Вертикальная скорость
        this.rotation = 0;       // Угол поворота спрайта
    }
    
    // Методы: update(), flap(), draw(), getBounds()
}
```

**Основные методы:**
- `update(deltaTime)` - обновляет положение и скорость птицы с учетом гравитации и времени
- `flap()` - устанавливает отрицательную скорость для прыжка вверх
- `draw()` - отрисовывает спрайт птицы с учетом поворота
- `getBounds()` - возвращает хитбокс птицы для проверки столкновений

### Класс Pipe
Класс `Pipe` представляет препятствия в виде труб, через которые должна пролетать птица.

```javascript
class Pipe {
    constructor(x, height, isTop) {
        this.x = x;              // Позиция по X
        this.height = height;    // Высота трубы
        this.width = PIPE_WIDTH; // Ширина трубы
        this.isTop = isTop;      // Флаг верхней/нижней трубы
        this.counted = false;    // Флаг для подсчета очков
    }
    
    // Методы: update(), draw(), getBounds(), isOffScreen()
}
```

**Основные методы:**
- `update(deltaTime)` - обновляет положение трубы (движение влево)
- `draw()` - отрисовывает спрайт трубы в зависимости от типа (верхняя/нижняя)
- `getBounds()` - возвращает хитбокс трубы для проверки столкновений
- `isOffScreen()` - проверяет, вышла ли труба за пределы экрана

## Механики игры

### Физика полета птицы
Физика полета птицы реализована с использованием простой модели гравитации и импульса:

```javascript
// В методе update класса Bird
this.velocity += GRAVITY * deltaTime;  // Применение гравитации
this.y += this.velocity * deltaTime;   // Изменение позиции
```

При нажатии на пробел или клике мышью вызывается метод `flap()`, который устанавливает отрицательную скорость:

```javascript
flap() {
    this.velocity = FLAP_FORCE;  // Установка отрицательной скорости для движения вверх
}
```

### Генерация препятствий
Препятствия (трубы) генерируются с определенным интервалом (`PIPE_SPAWN_INTERVAL`). Каждое препятствие состоит из пары труб - верхней и нижней, с проходом между ними:

```javascript
function spawnPipes() {
    const centerY = canvas.height / 2 + (Math.random() * 150 - 75);
    const topHeight = centerY - PIPE_GAP / 2;
    const bottomHeight = canvas.height - (centerY + PIPE_GAP / 2);

    pipes.push(new Pipe(canvas.width, topHeight, true));      // Верхняя труба
    pipes.push(new Pipe(canvas.width, bottomHeight, false));  // Нижняя труба
}
```

Позиция прохода (`centerY`) выбирается случайно в пределах центральной части экрана с некоторым смещением, что создает разнообразие в расположении препятствий.

### Подсчет очков
Очки начисляются, когда птица успешно пролетает через пару труб:

```javascript
// В функции checkCollisions
if (!pipe.counted && pipe.x + pipe.width < birdBounds.x && pipe.isTop) {
    pipe.counted = true;
    score++;
}
```

Флаг `counted` используется, чтобы каждая труба учитывалась только один раз.

## Игровой цикл

Игровой цикл реализован с использованием `requestAnimationFrame` для синхронизации с частотой обновления экрана:

```javascript
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    
    // Очистка и отрисовка фона
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(deltaTime);
    
    if (gameStarted && !gameOver) {
        // Обновление состояния игры
        bird.update(deltaTime);
        
        // Генерация новых труб
        pipeSpawnTimer += deltaTime;
        if (pipeSpawnTimer >= PIPE_SPAWN_INTERVAL / 1000) {
            spawnPipes();
            pipeSpawnTimer = 0;
        }
        
        // Обновление и фильтрация труб
        pipes = pipes.filter(pipe => !pipe.isOffScreen());
        pipes.forEach(pipe => pipe.update(deltaTime));
        
        // Проверка столкновений
        checkCollisions();
    }
    
    // Отрисовка объектов
    bird.draw();
    pipes.forEach(pipe => pipe.draw());
    
    // Отрисовка счета
    if (gameStarted || gameOver) {
        drawScore();
    }
    
    // Продолжение цикла
    requestAnimationFrame(gameLoop);
}
```

### Расчет deltaTime
Для обеспечения стабильной скорости игры независимо от частоты кадров используется параметр `deltaTime`, который рассчитывается как разница между текущим и предыдущим кадром в секундах:

```javascript
const deltaTime = (timestamp - lastFrameTime) / 1000;
```

Это позволяет корректно масштабировать все скорости и перемещения в зависимости от реального времени, а не от количества кадров.

## Система столкновений

Система столкновений использует упрощенные прямоугольные хитбоксы (bounding boxes) для проверки пересечений между птицей и трубами:

```javascript
function checkCollisions() {
    const birdBounds = bird.getBounds();

    for (const pipe of pipes) {
        const pipeBounds = pipe.getBounds();

        // Проверка пересечения прямоугольников
        if (birdBounds.x + birdBounds.width > pipeBounds.x &&
            birdBounds.x < pipeBounds.x + pipeBounds.width &&
            birdBounds.y + birdBounds.height > pipeBounds.y &&
            birdBounds.y < pipeBounds.y + pipeBounds.height) {
            endGame();
            return;
        }
        
        // Подсчет очков
        // ...
    }
}
```

Для улучшения игрового опыта хитбоксы немного уменьшены по сравнению с визуальными размерами объектов:

```javascript
// В методе getBounds класса Bird
const padding = 8;
return {
    x: this.x + padding,
    y: this.y + padding,
    width: this.width - padding * 2,
    height: this.height - padding * 2
};
```

## Визуальные эффекты

### Параллакс-эффект фона
Для создания ощущения глубины используется параллакс-эффект, при котором разные слои фона двигаются с разной скоростью:

```javascript
function drawBackground(deltaTime) {
    for (let i = 0; i < bgLayers.length; i++) {
        // Скорость зависит от номера слоя
        const speed = (i + 1) * 30;
        
        // Обновление позиции
        bgPositions[i] -= speed * deltaTime;
        
        // Сброс позиции при выходе за границы
        if (bgPositions[i] <= -canvas.width) bgPositions[i] = 0;
        
        // Отрисовка двух экземпляров слоя для бесшовного скроллинга
        ctx.drawImage(bgLayers[i], bgPositions[i], 0, canvas.width, canvas.height);
        ctx.drawImage(bgLayers[i], bgPositions[i] + canvas.width, 0, canvas.width, canvas.height);
    }
}
```

### Анимация поворота птицы
Птица поворачивается в зависимости от вертикальной скорости, что создает более реалистичную анимацию полета:

```javascript
// В методе update класса Bird
this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.velocity * 0.1));
```

При отрисовке применяется трансформация контекста Canvas для поворота спрайта:

```javascript
// В методе draw класса Bird
ctx.save();
ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
ctx.rotate(this.rotation);
ctx.drawImage(birdImg, -this.width / 2, -this.height / 2, this.width, this.height);
ctx.restore();
```

## Управление игрой

Игра поддерживает два способа управления:

1. **Клавиатура** - нажатие клавиши пробел:
```javascript
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
```

2. **Мышь** - клик по игровому полю:
```javascript
canvas.addEventListener('click', () => {
    if (gameStarted && !gameOver) {
        bird.flap();
    }
});
```

## Аудио

В игре используется фоновая музыка, которая запускается при начале игры и останавливается при завершении:

```javascript
// Инициализация аудио
const gameAudio = new Audio('audio/hero.mp3');
gameAudio.loop = true;
```

Также реализована возможность отключения звука:

```javascript
document.getElementById('mute-button').addEventListener('click', () => {
    isMuted = !isMuted;
    gameAudio.muted = isMuted;
    document.getElementById('mute-button').textContent = isMuted ? '🔇' : '🔊';
});
```

---

Эта документация описывает основные аспекты реализации игры Flappy Bird. Код организован в модульную структуру с четким разделением ответственности между классами и функциями, что облегчает понимание и модификацию игры.
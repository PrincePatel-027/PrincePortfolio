document.addEventListener('DOMContentLoaded', () => {

  // Current time
  const timeEl = document.getElementById('currentTime');
  if (timeEl) {
    setInterval(() => {
      const d = new Date();
      timeEl.textContent = d.toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
  }

  // Preloader
  const preloader = document.getElementById('preloader');
  const loadingBar = document.getElementById('loadingBar');
  const loadingProgress = document.getElementById('loadingProgress');

  let loadProgress = 0;
  const loadInterval = setInterval(() => {
    loadProgress += Math.floor(Math.random() * 15) + 5;
    if (loadProgress >= 100) {
      loadProgress = 100;
      clearInterval(loadInterval);
      setTimeout(() => {
        preloader.style.display = 'none';
        document.body.classList.remove('loading');
        runReveals();
      }, 500);
    }
    loadingBar.style.width = loadProgress + '%';
    loadingProgress.textContent = `${loadProgress}%`;
  }, 100);

  // Simple sequential tile reveal
  function runReveals() {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach((tile, index) => {
      tile.style.opacity = '0';
      tile.style.transform = 'translateY(20px)';
      tile.style.transition = 'all 0.1s step-end'; // Retro choppy feel
      setTimeout(() => {
        tile.style.opacity = '1';
        tile.style.transform = 'translateY(0)';
      }, index * 100 + 100);
    });

    // Animate stats
    const stats = document.querySelectorAll('.stat-num');
    stats.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-val'), 10);
      let curr = 0;
      const statInterval = setInterval(() => {
        curr += 1;
        stat.textContent = curr;
        if (curr >= target) {
          clearInterval(statInterval);
        }
      }, 50);
    });
  }

  // Contact form
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      btn.textContent = 'TRANSMITTING...';
      btn.style.background = '#00ff00';
      btn.style.borderColor = '#00ff00';
      btn.style.color = '#000';

      const formData = new FormData(form);
      const object = Object.fromEntries(formData);
      const json = JSON.stringify(object);

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: json
        });

        const result = await response.json();
        if (response.status == 200) {
          btn.textContent = 'TRANSMISSION SENT';
          form.reset();
        } else {
          console.log(result);
          btn.textContent = 'TRANSMISSION FAILED';
          btn.style.background = '#ff0000';
          btn.style.borderColor = '#ff0000';
        }
      } catch (error) {
        console.log(error);
        btn.textContent = 'SYSTEM ERROR';
        btn.style.background = '#ff0000';
        btn.style.borderColor = '#ff0000';
      } finally {
        setTimeout(() => {
          btn.textContent = 'SEND TRANSMISSION';
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 3000);
      }
    });
  }


  // ==========================================
  // COMMS_LINK_DEFENDER MINIGAME
  // ==========================================
  const canvas = document.getElementById('contactGame');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const gameOverlay = document.getElementById('gameOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const contactMessage = document.getElementById('contactMessage');
  const gameSuccessMsg = document.getElementById('gameSuccessMsg');

  // UI Buttons/Elements
  const startBtn = document.getElementById('startGameBtn');
  const restartBtn = document.getElementById('restartGameBtn');
  const saveScoreBtn = document.getElementById('saveScoreBtn');
  const leaderboardDisplay = document.getElementById('leaderboardDisplay');
  const leaderboardList = document.getElementById('leaderboardList');
  const finalScoreText = document.getElementById('finalScoreText');
  const highScoreInput = document.getElementById('highScoreInput');
  const playerNameInput = document.getElementById('playerNameInput');

  if (canvas && ctx && startBtn) {
    let gameRunning = false;
    let score = 0;
    let keys = {};
    let isHovering = false;
    let secretUnlocked = false;
    let spawnTimeout;

    const LEADERBOARD_KEY = 'prince_portfolio_leaderboard';

    function getLeaderboard() {
      const stored = localStorage.getItem(LEADERBOARD_KEY);
      if (stored) return JSON.parse(stored);
      return [
        { name: "PXL", score: 50 },
        { name: "DEV", score: 40 },
        { name: "CPU", score: 30 },
        { name: "RAM", score: 20 },
        { name: "WWW", score: 10 }
      ];
    }

    function saveLeaderboard(leaderboard) {
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard.splice(5); // Keep top 5
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    }

    function updateLeaderboardUI() {
      const lb = getLeaderboard();
      leaderboardList.innerHTML = '';
      lb.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${entry.name}</span><span>${entry.score}</span>`;
        leaderboardList.appendChild(li);
      });
      leaderboardDisplay.classList.remove('hidden');
    }

    // Init UI
    updateLeaderboardUI();

    // Track hover to prevent scrolling only when intended
    canvas.addEventListener('mouseenter', () => isHovering = true);
    canvas.addEventListener('mouseleave', () => isHovering = false);
    gameOverlay.addEventListener('mouseenter', () => isHovering = true);
    gameOverlay.addEventListener('mouseleave', () => isHovering = false);
    if (gameOverOverlay) {
      gameOverOverlay.addEventListener('mouseenter', () => isHovering = true);
      gameOverOverlay.addEventListener('mouseleave', () => isHovering = false);
    }

    // Entities
    const player = {
      x: canvas.width / 2 - 15,
      y: canvas.height - 30,
      w: 30,
      h: 20,
      color: '#00f0ff',
      speed: 4,
      cooldown: 0
    };

    let bullets = [];
    let enemies = [];
    let particles = [];

    // Controls
    window.addEventListener('keydown', (e) => {
      if (isHovering && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    startBtn.addEventListener('click', () => {
      gameOverlay.style.display = 'none';
      if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
      startGame();
    });
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        gameOverOverlay.classList.add('hidden');
        startGame();
      });
    }

    if (saveScoreBtn) {
      saveScoreBtn.addEventListener('click', () => {
        const initials = playerNameInput.value.trim().toUpperCase() || 'NON';
        const lb = getLeaderboard();
        lb.push({ name: initials.substring(0, 3), score: score });
        saveLeaderboard(lb);

        highScoreInput.classList.add('hidden');
        updateLeaderboardUI();
        gameOverlay.style.display = 'flex';
        gameOverOverlay.classList.add('hidden');
        startBtn.textContent = "PLAY AGAIN";
      });
    }

    function spawnEnemy() {
      if (!gameRunning) return;

      // Infinite scaling difficulty
      let speedScale = 1 + (score * 0.05); // increases speed
      let spawnScale = Math.max(200, 1000 - (score * 20)); // decreases delay

      enemies.push({
        x: Math.random() * (canvas.width - 20),
        y: -20,
        w: 20,
        h: 20,
        color: '#ff0055',
        speed: (Math.random() * 1.0 + 0.5) * speedScale
      });

      spawnTimeout = setTimeout(spawnEnemy, spawnScale);
    }

    function createExplosion(x, y, color) {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 1,
          color: color
        });
      }
    }

    function startGame() {
      clearTimeout(spawnTimeout);

      score = 0;
      scoreDisplay.textContent = `SCORE: ${score}`;
      bullets = [];
      enemies = [];
      particles = [];
      player.x = canvas.width / 2 - 15;
      secretUnlocked = false;
      gameSuccessMsg.classList.add('hidden');
      gameRunning = true;
      spawnEnemy();
      requestAnimationFrame(gameLoop);
    }

    function checkSecretUnlock() {
      if (!secretUnlocked && score >= 20) {
        secretUnlocked = true;
        gameSuccessMsg.classList.remove('hidden');
        const secretText = "\n\n[SECRET UNLOCKED: I survived the Comms_Defender!]";
        if (!contactMessage.value.includes("SECRET UNLOCKED")) {
          contactMessage.value += secretText;
        }
      }
    }

    function gameOver() {
      gameRunning = false;
      clearTimeout(spawnTimeout);

      if (gameOverOverlay) {
        gameOverOverlay.classList.remove('hidden');
        finalScoreText.textContent = `FINAL SCORE: ${score}`;

        const lb = getLeaderboard();
        // Check if it's a high score (top 5 are saved, so if it beats the 5th)
        if (lb.length < 5 || score > lb[lb.length - 1].score) {
          highScoreInput.classList.remove('hidden');
          restartBtn.classList.add('hidden');
          playerNameInput.value = '';
          playerNameInput.focus();
        } else {
          highScoreInput.classList.add('hidden');
          restartBtn.classList.remove('hidden');
        }
      } else {
        gameOverlay.style.display = 'flex';
        startBtn.textContent = 'RETRY';
      }
    }

    function update() {
      if (!gameRunning) return;

      // Player Movement
      if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) player.x -= player.speed;
      if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.w) player.x += player.speed;

      // Auto-Shooting
      if (player.cooldown > 0) player.cooldown--;
      if (player.cooldown <= 0) {
        bullets.push({
          x: player.x + player.w / 2 - 2,
          y: player.y,
          w: 4,
          h: 10,
          color: '#ffea00',
          speed: 6
        });
        player.cooldown = 20;
      }

      // Update Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) bullets.splice(i, 1);
      }

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life -= 0.05;
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      // Update Enemies & Collisions
      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.y += e.speed;

        // Enemy hits bottom (Game Over)
        if (e.y + e.h > canvas.height) {
          gameOver();
          return;
        }

        // Check bullet hit
        for (let j = bullets.length - 1; j >= 0; j--) {
          let b = bullets[j];
          if (
            b.x < e.x + e.w &&
            b.x + b.w > e.x &&
            b.y < e.y + e.h &&
            b.y + b.h > e.y
          ) {
            // Hit!
            createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color);
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            score++;
            scoreDisplay.textContent = `SCORE: ${score}`;
            checkSecretUnlock();
            break;
          }
        }
      }
    }

    function drawPixelRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    }

    function draw() {
      // Clear
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!gameRunning && score === 0 && !gameOverlay.style.display && (!gameOverOverlay || gameOverOverlay.classList.contains('hidden'))) return;

      if (gameRunning) {
        // Draw Player (Ship shape)
        drawPixelRect(player.x + 10, player.y, 10, 10, player.color);
        drawPixelRect(player.x, player.y + 10, 30, 10, player.color);

        // Draw Bullets
        bullets.forEach(b => drawPixelRect(b.x, b.y, b.w, b.h, b.color));

        // Draw Enemies (Virus shape)
        enemies.forEach(e => {
          drawPixelRect(e.x + 4, e.y, 12, 4, e.color);
          drawPixelRect(e.x, e.y + 4, 20, 12, e.color);
          drawPixelRect(e.x + 4, e.y + 16, 4, 4, e.color);
          drawPixelRect(e.x + 12, e.y + 16, 4, 4, e.color);
        });
      }

      // Draw Particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 3, 3);
        ctx.globalAlpha = 1.0;
      });
    }

    function gameLoop() {
      update();
      draw();
      if (gameRunning) {
        requestAnimationFrame(gameLoop);
      }
    }
  }

});

(function () {
  var games = [];
  var current = null;
  var els = {};

  var Arcade = { handle: "Navi Chhokran" };

  Arcade.storage = {
    get: function (k, d) {
      try { var v = localStorage.getItem("neon_" + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem("neon_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  Arcade.swipe = function (el, cb) {
    var sx = 0, sy = 0, tracking = false;
    function start(e) { var t = e.touches ? e.touches[0] : e; sx = t.clientX; sy = t.clientY; tracking = true; }
    function end(e) {
      if (!tracking) return; tracking = false;
      var t = e.changedTouches ? e.changedTouches[0] : e;
      var dx = t.clientX - sx, dy = t.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 24) return;
      cb(ax > ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchend", end, { passive: true });
    return function () { el.removeEventListener("touchstart", start); el.removeEventListener("touchend", end); };
  };

  function register(g) { games.push(g); }

  function boot() {
    els.hub = document.getElementById("hub");
    els.stage = document.getElementById("stage");
    els.root = document.getElementById("gameRoot");
    els.back = document.getElementById("backBtn");
    els.cards = document.getElementById("cards");
    els.sign = document.getElementById("sign");
    els.sign.textContent = "created by " + Arcade.handle;
    games.forEach(function (g) {
      var card = document.createElement("button");
      card.className = "card card--" + g.id;
      card.innerHTML = '<div class="card__icon">' + g.icon + '</div>' +
        '<div class="card__title">' + g.title + '</div>' +
        '<div class="card__desc">' + g.desc + '</div>' +
        '<div class="card__play">PLAY &#9656;</div>';
      card.addEventListener("click", function () { enter(g); });
      els.cards.appendChild(card);
    });
    els.back.addEventListener("click", exit);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && current) exit(); });
  }

  function enter(g) {
    current = g;
    els.hub.hidden = true; els.stage.hidden = false; els.back.hidden = false;
    els.root.innerHTML = "";
    g.mount(els.root);
    window.scrollTo(0, 0);
  }
  function exit() {
    if (current && current.unmount) current.unmount();
    current = null; els.root.innerHTML = "";
    els.stage.hidden = true; els.back.hidden = true; els.hub.hidden = false;
  }

  /* ================= SNAKE ================= */
  (function () {
    var GRID = 20, CELL = 20, st = null;
    function mount(root) {
      var best = Arcade.storage.get("snake_best", 0);
      root.insertAdjacentHTML("beforeend",
        '<div class="game"><div class="game__head"><h2 class="neon-lime">SNAKE</h2>' +
        '<div class="hud"><span>SCORE <b id="skScore">0</b></span><span>BEST <b id="skBest">' + best + '</b></span></div></div>' +
        '<div class="canvas-wrap"><canvas id="skCanvas" width="' + (GRID * CELL) + '" height="' + (GRID * CELL) + '"></canvas>' +
        '<div id="skOver" class="overlay" hidden><div class="overlay__box"><h3>GAME OVER</h3><p id="skFinal"></p><button id="skAgain" class="btn btn--primary">play again</button></div></div></div>' +
        '<div class="hint">arrows / WASD / swipe &middot; <button id="skRestart" class="btn">restart</button></div></div>');
      var cv = document.getElementById("skCanvas"), ctx = cv.getContext("2d");
      var scoreEl = document.getElementById("skScore"), bestEl = document.getElementById("skBest");
      var overEl = document.getElementById("skOver"), finalEl = document.getElementById("skFinal");
      var snake, dir, nd, food, score, alive, acc, last, raf, speed;
      function place() { do { food = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 }; } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; })); }
      function reset() { snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; dir = { x: 1, y: 0 }; nd = { x: 1, y: 0 }; score = 0; alive = true; acc = 0; last = 0; speed = 7; place(); scoreEl.textContent = "0"; overEl.hidden = true; }
      function setDir(x, y) { if (x === -dir.x && y === -dir.y) return; nd = { x: x, y: y }; }
      function step() {
        dir = nd; var h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (h.x < 0 || h.y < 0 || h.x >= GRID || h.y >= GRID || snake.some(function (s) { return s.x === h.x && s.y === h.y; })) { alive = false; return over(); }
        snake.unshift(h);
        if (h.x === food.x && h.y === food.y) { score += 10; scoreEl.textContent = score; if (score % 50 === 0) speed = Math.min(20, speed + 1); place(); }
        else snake.pop();
      }
      function draw() {
        ctx.fillStyle = "#0a0d18"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = "#ff3bd4"; ctx.shadowColor = "#ff3bd4"; ctx.shadowBlur = 12; ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4); ctx.shadowBlur = 0;
        snake.forEach(function (s, i) { ctx.fillStyle = i === 0 ? "#b8ff3a" : "#22e3ff"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2); }); ctx.shadowBlur = 0;
      }
      function loop(ts) { if (!last) last = ts; var dt = ts - last; last = ts; if (!alive) return; acc += dt; var iv = 1000 / speed; while (acc >= iv) { step(); acc -= iv; if (!alive) break; } draw(); raf = requestAnimationFrame(loop); }
      function over() { draw(); var b = Arcade.storage.get("snake_best", 0); if (score > b) { b = score; Arcade.storage.set("snake_best", b); bestEl.textContent = b; } finalEl.textContent = "score " + score + " \u00b7 best " + b; overEl.hidden = false; }
      function start() { reset(); cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(loop); }
      function key(e) { var k = e.key; if (k === "ArrowUp" || k === "w" || k === "W") setDir(0, -1); else if (k === "ArrowDown" || k === "s" || k === "S") setDir(0, 1); else if (k === "ArrowLeft" || k === "a" || k === "A") setDir(-1, 0); else if (k === "ArrowRight" || k === "d" || k === "D") setDir(1, 0); else return; e.preventDefault(); }
      document.addEventListener("keydown", key);
      var off = Arcade.swipe(cv, function (d) { if (d === "up") setDir(0, -1); else if (d === "down") setDir(0, 1); else if (d === "left") setDir(-1, 0); else setDir(1, 0); });
      document.getElementById("skRestart").addEventListener("click", start);
      document.getElementById("skAgain").addEventListener("click", start);
      st = { cleanup: function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", key); off(); } };
      start();
    }
    register({ id: "snake", title: "SNAKE", icon: "\uD83D\uDC0D", desc: "eat, grow, don't bite yourself", mount: mount, unmount: function () { if (st) { st.cleanup(); st = null; } } });
  })();

  /* ================= 2048 ================= */
  (function () {
    var st = null;
    function mount(root) {
      var best = Arcade.storage.get("g2048_best", 0);
      root.insertAdjacentHTML("beforeend",
        '<div class="game"><div class="game__head"><h2 class="neon-yellow">2048</h2>' +
        '<div class="hud"><span>SCORE <b id="twScore">0</b></span><span>BEST <b id="twBest">' + best + '</b></span></div></div>' +
        '<div class="play-wrap"><div id="twBoard" class="tw-board"></div>' +
        '<div id="twOver" class="overlay" hidden><div class="overlay__box"><h3>GAME OVER</h3><p id="twFinal"></p><button id="twAgain" class="btn btn--primary">play again</button></div></div></div>' +
        '<div class="hint">arrows / WASD / swipe &middot; <button id="twRestart" class="btn">restart</button></div></div>');
      var boardEl = document.getElementById("twBoard"), scoreEl = document.getElementById("twScore"), bestEl = document.getElementById("twBest");
      var overEl = document.getElementById("twOver"), finalEl = document.getElementById("twFinal");
      var grid, score;
      function rows() { var m = []; for (var r = 0; r < 4; r++) { var a = []; for (var c = 0; c < 4; c++) a.push(grid[r * 4 + c]); m.push(a); } return m; }
      function setRows(m) { for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) grid[r * 4 + c] = m[r][c]; }
      function tpose(m) { var n = []; for (var c = 0; c < 4; c++) { n.push([]); for (var r = 0; r < 4; r++) n[c].push(m[r][c]); } return n; }
      function slide(row) { var a = row.filter(function (v) { return v; }); for (var i = 0; i < a.length - 1; i++) { if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; a.splice(i + 1, 1); } } while (a.length < 4) a.push(0); return a; }
      function add() { var e = []; for (var i = 0; i < 16; i++) if (!grid[i]) e.push(i); if (!e.length) return; grid[e[(Math.random() * e.length) | 0]] = Math.random() < 0.9 ? 2 : 4; }
      function render() { boardEl.innerHTML = ""; for (var i = 0; i < 16; i++) { var v = grid[i], t = document.createElement("div"); t.className = "tw-tile" + (v ? " v" + v : ""); t.textContent = v || ""; boardEl.appendChild(t); } }
      function canMove() { for (var i = 0; i < 16; i++) if (!grid[i]) return true; for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) { var v = grid[r * 4 + c]; if (c < 3 && grid[r * 4 + c + 1] === v) return true; if (r < 3 && grid[(r + 1) * 4 + c] === v) return true; } return false; }
      function move(dir) {
        var m = rows(), res;
        if (dir === "left") res = m.map(slide);
        else if (dir === "right") res = m.map(function (r) { return slide(r.slice().reverse()).reverse(); });
        else if (dir === "up") res = tpose(tpose(m).map(slide));
        else res = tpose(tpose(m).map(function (r) { return slide(r.slice().reverse()).reverse(); }));
        if (JSON.stringify(res) === JSON.stringify(m)) return;
        setRows(res); add(); render(); scoreEl.textContent = score;
        var b = Arcade.storage.get("g2048_best", 0); if (score > b) { Arcade.storage.set("g2048_best", score); bestEl.textContent = score; }
        if (!canMove()) { finalEl.textContent = "score " + score; overEl.hidden = false; }
      }
      function reset() { grid = new Array(16).fill(0); score = 0; scoreEl.textContent = "0"; overEl.hidden = true; add(); add(); render(); }
      function key(e) { var k = e.key, d = null; if (k === "ArrowUp" || k === "w") d = "up"; else if (k === "ArrowDown" || k === "s") d = "down"; else if (k === "ArrowLeft" || k === "a") d = "left"; else if (k === "ArrowRight" || k === "d") d = "right"; else return; e.preventDefault(); move(d); }
      document.addEventListener("keydown", key);
      var off = Arcade.swipe(boardEl, move);
      document.getElementById("twRestart").addEventListener("click", reset);
      document.getElementById("twAgain").addEventListener("click", reset);
      st = { cleanup: function () { document.removeEventListener("keydown", key); off(); } };
      reset();
    }
    register({ id: "game2048", title: "2048", icon: "\uD83D\uDD22", desc: "merge tiles, chase 2048", mount: mount, unmount: function () { if (st) { st.cleanup(); st = null; } } });
  })();

  /* ================= TETRIS ================= */
  (function () {
    var COLS = 10, ROWS = 20, CELL = 24, NEXT = 4, st = null;
    var S = { I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]], S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]] };
    var C = { I: "#22e3ff", O: "#ffe14d", T: "#c26bff", S: "#b8ff3a", Z: "#ff3b6b", J: "#4d7dff", L: "#ff9a3b" };
    var K = Object.keys(S);
    function mount(root) {
      var best = Arcade.storage.get("tetris_best", 0);
      root.insertAdjacentHTML("beforeend",
        '<div class="game"><div class="game__head"><h2 class="neon-cyan">TETRIS</h2>' +
        '<div class="hud"><span>SCORE <b id="tScore">0</b></span><span>LINES <b id="tLines">0</b></span><span>LV <b id="tLevel">1</b></span><span>BEST <b id="tBest">' + best + '</b></span></div></div>' +
        '<div class="play-wrap"><div class="tetris-body"><canvas id="tCanvas" width="' + (COLS * CELL) + '" height="' + (ROWS * CELL) + '"></canvas>' +
        '<div class="tetris-side"><div class="next-label">NEXT</div><canvas id="tNext" width="' + (NEXT * CELL) + '" height="' + (NEXT * CELL) + '"></canvas></div></div>' +
        '<div id="tOver" class="overlay" hidden><div class="overlay__box"><h3>GAME OVER</h3><p id="tFinal"></p><button id="tAgain" class="btn btn--primary">play again</button></div></div></div>' +
        '<div class="pad"><button class="btn" data-a="left">&#9664;</button><button class="btn" data-a="rot">&#8635;</button><button class="btn" data-a="right">&#9654;</button><button class="btn" data-a="soft">&#9660;</button><button class="btn" data-a="hard">&#10515;</button></div>' +
        '<div class="hint">&larr; &rarr; move &middot; &uarr; rotate &middot; &darr; soft &middot; space hard &middot; <button id="tRestart" class="btn">restart</button></div></div>');
      var cv = document.getElementById("tCanvas"), ctx = cv.getContext("2d"), nctx = document.getElementById("tNext").getContext("2d");
      var scoreEl = document.getElementById("tScore"), linesEl = document.getElementById("tLines"), levelEl = document.getElementById("tLevel"), bestEl = document.getElementById("tBest");
      var overEl = document.getElementById("tOver"), finalEl = document.getElementById("tFinal");
      var board, cur, next, score, lines, level, over, acc, last, raf, dropMs;
      function empty() { var b = []; for (var r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(null)); return b; }
      function rnd() { var k = K[(Math.random() * K.length) | 0]; return { m: S[k].map(function (r) { return r.slice(); }), c: C[k] }; }
      function collide(m, ox, oy) { for (var r = 0; r < m.length; r++) for (var c = 0; c < m[r].length; c++) { if (!m[r][c]) continue; var x = ox + c, y = oy + r; if (x < 0 || x >= COLS || y >= ROWS) return true; if (y >= 0 && board[y][x]) return true; } return false; }
      function rot(m) { var R = m.length, Cc = m[0].length, n = []; for (var c = 0; c < Cc; c++) { n.push([]); for (var r = R - 1; r >= 0; r--) n[c].push(m[r][c]); } return n; }
      function spawn() { cur = next || rnd(); next = rnd(); cur.x = ((COLS - cur.m[0].length) / 2) | 0; cur.y = 0; if (collide(cur.m, cur.x, cur.y)) { over = true; gameOver(); } drawNext(); }
      function tryRot() { var m = rot(cur.m), kk = [0, -1, 1, -2, 2]; for (var i = 0; i < kk.length; i++) if (!collide(m, cur.x + kk[i], cur.y)) { cur.m = m; cur.x += kk[i]; return; } }
      function moveX(dx) { if (!collide(cur.m, cur.x + dx, cur.y)) cur.x += dx; }
      function soft() { if (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; return true; } lock(); return false; }
      function hard() { while (!collide(cur.m, cur.x, cur.y + 1)) cur.y++; lock(); }
      function lock() { for (var r = 0; r < cur.m.length; r++) for (var c = 0; c < cur.m[r].length; c++) if (cur.m[r][c]) { var y = cur.y + r, x = cur.x + c; if (y >= 0) board[y][x] = cur.c; } clr(); if (!over) spawn(); }
      function clr() { var n = 0; for (var r = ROWS - 1; r >= 0; r--) { if (board[r].every(function (v) { return v; })) { board.splice(r, 1); board.unshift(new Array(COLS).fill(null)); n++; r++; } } if (n) { lines += n; score += [0, 100, 300, 500, 800][n] * level; level = 1 + Math.floor(lines / 10); dropMs = Math.max(90, 800 - (level - 1) * 70); scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level; } }
      function cellDraw(g, x, y, col) { g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 8; g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); g.shadowBlur = 0; }
      function draw() {
        ctx.fillStyle = "#0a0d18"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.strokeStyle = "rgba(255,255,255,.04)";
        for (var x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke(); }
        for (var y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke(); }
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (board[r][c]) cellDraw(ctx, c, r, board[r][c]);
        if (cur) {
          var gy = cur.y; while (!collide(cur.m, cur.x, gy + 1)) gy++;
          for (var r2 = 0; r2 < cur.m.length; r2++) for (var c2 = 0; c2 < cur.m[r2].length; c2++) if (cur.m[r2][c2]) { ctx.fillStyle = "rgba(255,255,255,.09)"; ctx.fillRect((cur.x + c2) * CELL + 1, (gy + r2) * CELL + 1, CELL - 2, CELL - 2); }
          for (var r3 = 0; r3 < cur.m.length; r3++) for (var c3 = 0; c3 < cur.m[r3].length; c3++) if (cur.m[r3][c3]) cellDraw(ctx, cur.x + c3, cur.y + r3, cur.c);
        }
      }
      function drawNext() { nctx.fillStyle = "#0a0d18"; nctx.fillRect(0, 0, NEXT * CELL, NEXT * CELL); if (!next) return; var m = next.m, ox = (NEXT - m[0].length) / 2, oy = (NEXT - m.length) / 2; for (var r = 0; r < m.length; r++) for (var c = 0; c < m[r].length; c++) if (m[r][c]) cellDraw(nctx, ox + c, oy + r, next.c); }
      function loop(ts) { if (over) return; if (!last) last = ts; var dt = ts - last; last = ts; acc += dt; while (acc >= dropMs) { soft(); acc -= dropMs; if (over) break; } draw(); raf = requestAnimationFrame(loop); }
      function gameOver() { draw(); var b = Arcade.storage.get("tetris_best", 0); if (score > b) { b = score; Arcade.storage.set("tetris_best", b); bestEl.textContent = b; } finalEl.textContent = "score " + score + " \u00b7 " + lines + " lines \u00b7 best " + b; overEl.hidden = false; }
      function reset() { board = empty(); score = 0; lines = 0; level = 1; over = false; acc = 0; last = 0; dropMs = 800; next = rnd(); scoreEl.textContent = "0"; linesEl.textContent = "0"; levelEl.textContent = "1"; overEl.hidden = true; spawn(); draw(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
      function key(e) { if (over) return; var k = e.key; if (k === "ArrowLeft" || k === "a") moveX(-1); else if (k === "ArrowRight" || k === "d") moveX(1); else if (k === "ArrowDown" || k === "s") { soft(); acc = 0; } else if (k === "ArrowUp" || k === "w") tryRot(); else if (k === " ") hard(); else return; e.preventDefault(); draw(); }
      document.addEventListener("keydown", key);
      root.querySelectorAll(".pad .btn").forEach(function (b) { b.addEventListener("click", function () { if (over) return; var a = b.getAttribute("data-a"); if (a === "left") moveX(-1); else if (a === "right") moveX(1); else if (a === "rot") tryRot(); else if (a === "soft") { soft(); acc = 0; } else if (a === "hard") hard(); draw(); }); });
      document.getElementById("tRestart").addEventListener("click", reset);
      document.getElementById("tAgain").addEventListener("click", reset);
      st = { cleanup: function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", key); } };
      reset();
    }
    register({ id: "tetris", title: "TETRIS", icon: "\uD83E\uDDF1", desc: "stack blocks, clear lines", mount: mount, unmount: function () { if (st) { st.cleanup(); st = null; } } });
  })();

  /* ================= BUG SQUASH ================= */
  (function () {
    var HOLES = 9, st = null;
    function mount(root) {
      var best = Arcade.storage.get("bug_best", 0);
      root.insertAdjacentHTML("beforeend",
        '<div class="game"><div class="game__head"><h2 class="neon-magenta">BUG SQUASH</h2>' +
        '<div class="hud"><span>SCORE <b id="bgScore">0</b></span><span>TIME <b id="bgTime">30</b></span><span>PROD <b id="bgEsc">0</b></span><span>BEST <b id="bgBest">' + best + '</b></span></div></div>' +
        '<div class="play-wrap"><div id="bgGrid" class="bug-grid"></div>' +
        '<div id="bgOver" class="overlay" hidden><div class="overlay__box"><h3>SHIP IT</h3><p id="bgFinal"></p><button id="bgAgain" class="btn btn--primary">play again</button></div></div></div>' +
        '<div class="hint">squish bugs before they reach prod &middot; <button id="bgRestart" class="btn">restart</button></div></div>');
      var gridEl = document.getElementById("bgGrid"), scoreEl = document.getElementById("bgScore"), timeEl = document.getElementById("bgTime"), escEl = document.getElementById("bgEsc"), bestEl = document.getElementById("bgBest");
      var overEl = document.getElementById("bgOver"), finalEl = document.getElementById("bgFinal");
      var holes = [], score, escaped, timeLeft, running, spawnTO = null, tickIV = null;
      for (var i = 0; i < HOLES; i++) {
        var h = document.createElement("button"); h.className = "hole"; h.innerHTML = '<span class="bug">\uD83D\uDC1B</span>';
        (function (el) { el.addEventListener("click", function () { squash(el); }); })(h);
        gridEl.appendChild(h); holes.push({ el: h, active: false, esc: null });
      }
      function diff() { var e = 30 - timeLeft; return { spawn: Math.max(340, 900 - e * 20), up: Math.max(620, 1300 - e * 22) }; }
      function schedule() { if (!running) return; var d = diff(); spawnTO = setTimeout(function () { pop(d.up); schedule(); }, d.spawn); }
      function pop(up) {
        var free = holes.filter(function (h) { return !h.active; }); if (!free.length) return;
        var h = free[(Math.random() * free.length) | 0]; h.active = true; h.el.classList.add("up");
        h.esc = setTimeout(function () { if (h.active) { h.active = false; h.el.classList.remove("up"); escaped++; escEl.textContent = escaped; h.el.classList.add("escaped"); setTimeout(function () { h.el.classList.remove("escaped"); }, 220); } }, up);
      }
      function squash(el) {
        var h = null; for (var i = 0; i < holes.length; i++) if (holes[i].el === el) h = holes[i];
        if (!running || !h || !h.active) return;
        h.active = false; h.el.classList.remove("up"); if (h.esc) { clearTimeout(h.esc); h.esc = null; }
        score += 10; scoreEl.textContent = score; el.classList.add("hit"); setTimeout(function () { el.classList.remove("hit"); }, 150);
      }
      function tick() { timeLeft--; timeEl.textContent = timeLeft; if (timeLeft <= 0) end(); }
      function end() {
        running = false; clearInterval(tickIV); clearTimeout(spawnTO);
        holes.forEach(function (h) { if (h.esc) clearTimeout(h.esc); h.active = false; h.el.classList.remove("up"); });
        var b = Arcade.storage.get("bug_best", 0); if (score > b) { b = score; Arcade.storage.set("bug_best", b); bestEl.textContent = b; }
        finalEl.textContent = (score / 10) + " bugs squashed \u00b7 " + escaped + " reached prod \u00b7 best " + b; overEl.hidden = false;
      }
      function reset() {
        score = 0; escaped = 0; timeLeft = 30; running = true;
        scoreEl.textContent = "0"; escEl.textContent = "0"; timeEl.textContent = "30"; overEl.hidden = true;
        holes.forEach(function (h) { h.active = false; h.el.classList.remove("up"); if (h.esc) { clearTimeout(h.esc); h.esc = null; } });
        clearTimeout(spawnTO); clearInterval(tickIV); tickIV = setInterval(tick, 1000); schedule();
      }
      document.getElementById("bgRestart").addEventListener("click", reset);
      document.getElementById("bgAgain").addEventListener("click", reset);
      st = { cleanup: function () { running = false; clearInterval(tickIV); clearTimeout(spawnTO); holes.forEach(function (h) { if (h.esc) clearTimeout(h.esc); }); } };
      reset();
    }
    register({ id: "bugsquash", title: "BUG SQUASH", icon: "\uD83D\uDC1B", desc: "whack the bugs before prod", mount: mount, unmount: function () { if (st) { st.cleanup(); st = null; } } });
  })();

  /* ================= FROGGER ================= */
  (function () {
    var TILE = 40, ROWS = 11, W = 360, H = TILE * ROWS, st = null;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function mount(root) {
      var best = Arcade.storage.get("frog_best", 0);
      root.insertAdjacentHTML("beforeend",
        '<div class="game"><div class="game__head"><h2 class="neon-lime">FROGGER</h2>' +
        '<div class="hud"><span>SCORE <b id="fgScore">0</b></span><span>LIVES <b id="fgLives">3</b></span><span>HOME <b id="fgHome">0</b></span><span>BEST <b id="fgBest">' + best + '</b></span></div></div>' +
        '<div class="play-wrap"><canvas id="fgCanvas" width="' + W + '" height="' + H + '"></canvas>' +
        '<div id="fgOver" class="overlay" hidden><div class="overlay__box"><h3>GAME OVER</h3><p id="fgFinal"></p><button id="fgAgain" class="btn btn--primary">play again</button></div></div></div>' +
        '<div class="pad"><button class="btn" data-d="up">&#9650;</button><button class="btn" data-d="left">&#9664;</button><button class="btn" data-d="down">&#9660;</button><button class="btn" data-d="right">&#9654;</button></div>' +
        '<div class="hint">reach the top &middot; arrows / WASD / swipe / buttons &middot; <button id="fgRestart" class="btn">restart</button></div></div>');
      var cv = document.getElementById("fgCanvas"), ctx = cv.getContext("2d");
      var scoreEl = document.getElementById("fgScore"), livesEl = document.getElementById("fgLives"), homeEl = document.getElementById("fgHome"), bestEl = document.getElementById("fgBest");
      var overEl = document.getElementById("fgOver"), finalEl = document.getElementById("fgFinal");
      var lanes, frog, score, lives, homes, alive, raf, last;
      function rrFill(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }
      function makeLanes() {
        lanes = [];
        for (var r = 0; r < ROWS; r++) {
          if (r === 0) lanes.push({ type: "goal" });
          else if (r >= 1 && r <= 4) { var d = r % 2 ? 1 : -1, sp = 0.045 + r * 0.006, it = []; for (var i = 0; i < 3; i++) it.push({ x: i * 140 + r * 30, w: rnd(72, 104) }); lanes.push({ type: "river", dir: d, sp: sp, items: it }); }
          else if (r === 5) lanes.push({ type: "safe" });
          else if (r >= 6 && r <= 9) { var d2 = r % 2 ? 1 : -1, s2 = 0.06 + (r - 6) * 0.012, it2 = []; for (var j = 0; j < 3; j++) it2.push({ x: j * 130 + r * 20, w: rnd(42, 60) }); lanes.push({ type: "road", dir: d2, sp: s2, items: it2 }); }
          else lanes.push({ type: "safe" });
        }
      }
      function startFrog() { frog = { x: W / 2, row: ROWS - 1 }; }
      function reset() { makeLanes(); startFrog(); score = 0; lives = 3; homes = 0; alive = true; scoreEl.textContent = "0"; livesEl.textContent = "3"; homeEl.textContent = "0"; overEl.hidden = true; }
      function move(dir) {
        if (!alive) return;
        if (dir === "up" && frog.row > 0) frog.row--;
        else if (dir === "down" && frog.row < ROWS - 1) frog.row++;
        else if (dir === "left") frog.x -= TILE;
        else if (dir === "right") frog.x += TILE;
        frog.x = Math.max(TILE / 2, Math.min(W - TILE / 2, frog.x));
        if (frog.row === 0) { homes++; score += 100; homeEl.textContent = homes; scoreEl.textContent = score; startFrog(); }
      }
      function die() { lives--; livesEl.textContent = Math.max(0, lives); if (lives <= 0) over(); else startFrog(); }
      function over() { alive = false; var b = Arcade.storage.get("frog_best", 0); if (score > b) { b = score; Arcade.storage.set("frog_best", b); bestEl.textContent = b; } finalEl.textContent = "score " + score + " \u00b7 best " + b; overEl.hidden = false; }
      function update(dt) {
        if (!alive) return;
        for (var r = 0; r < ROWS; r++) { var ln = lanes[r]; if (ln.type === "road" || ln.type === "river") { for (var i = 0; i < ln.items.length; i++) { var it = ln.items[i]; it.x += ln.dir * ln.sp * dt; if (ln.dir > 0 && it.x > W + it.w) it.x = -it.w; else if (ln.dir < 0 && it.x < -it.w) it.x = W + it.w; } } }
        var lane = lanes[frog.row];
        if (lane.type === "road") { for (var c = 0; c < lane.items.length; c++) { var car = lane.items[c]; if (frog.x > car.x && frog.x < car.x + car.w) { die(); return; } } }
        else if (lane.type === "river") { var on = null; for (var g = 0; g < lane.items.length; g++) { var lg = lane.items[g]; if (frog.x > lg.x && frog.x < lg.x + lg.w) { on = lg; break; } } if (on) { frog.x += lane.dir * lane.sp * dt; if (frog.x < TILE / 2 || frog.x > W - TILE / 2) { die(); return; } } else { die(); return; } }
      }
      function draw() {
        for (var r = 0; r < ROWS; r++) { var y = r * TILE, ln = lanes[r]; ctx.fillStyle = ln.type === "goal" ? "#16220f" : ln.type === "river" ? "#0b2036" : ln.type === "road" ? "#131319" : "#123018"; ctx.fillRect(0, y, W, TILE); }
        ctx.fillStyle = "rgba(184,255,58,.5)"; ctx.fillRect(0, 0, W, 5);
        for (r = 0; r < ROWS; r++) {
          var ln2 = lanes[r], y2 = r * TILE;
          if (ln2.type === "river") { ctx.fillStyle = "#8a5a24"; for (var i = 0; i < ln2.items.length; i++) { var it = ln2.items[i]; rrFill(it.x, y2 + 8, it.w, TILE - 16, 8); } }
          else if (ln2.type === "road") { var cols = ["#ff3b6b", "#ffe14d", "#22e3ff"]; for (var j = 0; j < ln2.items.length; j++) { var car = ln2.items[j]; ctx.fillStyle = cols[j % 3]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; rrFill(car.x, y2 + 9, car.w, TILE - 18, 6); ctx.shadowBlur = 0; } }
        }
        var fy = frog.row * TILE + TILE / 2;
        ctx.fillStyle = "#b8ff3a"; ctx.shadowColor = "#b8ff3a"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(frog.x, fy, 13, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#05202b"; ctx.fillRect(frog.x - 6, fy - 6, 4, 4); ctx.fillRect(frog.x + 2, fy - 6, 4, 4);
      }
      function key(e) { var k = e.key, d = null; if (k === "ArrowUp" || k === "w" || k === "W") d = "up"; else if (k === "ArrowDown" || k === "s" || k === "S") d = "down"; else if (k === "ArrowLeft" || k === "a" || k === "A") d = "left"; else if (k === "ArrowRight" || k === "d" || k === "D") d = "right"; else return; e.preventDefault(); move(d); }
      document.addEventListener("keydown", key);
      var off = Arcade.swipe(cv, function (d) { move(d); });
      root.querySelectorAll(".pad .btn").forEach(function (b) { b.addEventListener("click", function () { move(b.getAttribute("data-d")); }); });
      document.getElementById("fgRestart").addEventListener("click", reset);
      document.getElementById("fgAgain").addEventListener("click", reset);
      function loop(ts) { var dt = last ? ts - last : 16; last = ts; if (dt > 60) dt = 60; update(dt); draw(); raf = requestAnimationFrame(loop); }
      st = { cleanup: function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", key); off(); } };
      reset(); last = 0; raf = requestAnimationFrame(loop);
    }
    register({ id: "frogger", title: "FROGGER", icon: "\uD83D\uDC38", desc: "dodge traffic, cross the river", mount: mount, unmount: function () { if (st) { st.cleanup(); st = null; } } });
  })();

  /* ================= SPACE SHOOTER ================= */
  (function () {
    var W = 360, H = 460, st = null;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function aabb(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
    function mount(root) {
      var best = Arcade.storage.get("shooter_best", 0);
      root.insertAdjacentHTML("beforeend",
        '<div class="game"><div class="game__head"><h2 class="neon-purple">SPACE SHOOTER</h2>' +
        '<div class="hud"><span>SCORE <b id="ssScore">0</b></span><span>LIVES <b id="ssLives">3</b></span><span>BEST <b id="ssBest">' + best + '</b></span></div></div>' +
        '<div class="canvas-wrap"><canvas id="ssCanvas" width="' + W + '" height="' + H + '"></canvas>' +
        '<div id="ssOver" class="overlay" hidden><div class="overlay__box"><h3>GAME OVER</h3><p id="ssFinal"></p><button id="ssAgain" class="btn btn--primary">play again</button></div></div></div>' +
        '<div class="hint">move: &larr; &rarr; / A D / drag &middot; auto-fire &middot; <button id="ssRestart" class="btn">restart</button></div></div>');
      var cv = document.getElementById("ssCanvas"), ctx = cv.getContext("2d");
      var scoreEl = document.getElementById("ssScore"), livesEl = document.getElementById("ssLives"), bestEl = document.getElementById("ssBest");
      var overEl = document.getElementById("ssOver"), finalEl = document.getElementById("ssFinal");
      var player, bullets, ebullets, foes, stars, score, lives, alive, keys, fireCD, tSpawn, raf, last;
      function reset() {
        player = { x: W / 2, y: H - 38, w: 26, h: 18, speed: 0.34, targetX: null };
        bullets = []; ebullets = []; foes = []; score = 0; lives = 3; alive = true;
        keys = {}; fireCD = 0; tSpawn = 0;
        stars = []; for (var i = 0; i < 44; i++) stars.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.03, 0.14) });
        scoreEl.textContent = "0"; livesEl.textContent = "3"; overEl.hidden = true;
      }
      function spawn() { foes.push({ x: rnd(24, W - 24), y: -18, w: 24, h: 18, vx: rnd(-0.04, 0.04), vy: rnd(0.05, 0.09) + score * 0.00003, t: (Math.random() * 3) | 0, shoot: rnd(1200, 3400) }); }
      function loseLife() { lives--; livesEl.textContent = Math.max(0, lives); if (lives <= 0) over(); }
      function over() { alive = false; var b = Arcade.storage.get("shooter_best", 0); if (score > b) { b = score; Arcade.storage.set("shooter_best", b); bestEl.textContent = b; } finalEl.textContent = "score " + score + " \u00b7 best " + b; overEl.hidden = false; }
      function update(dt) {
        for (var i = 0; i < stars.length; i++) { var s = stars[i]; s.y += s.s * dt; if (s.y > H) { s.y = 0; s.x = rnd(0, W); } }
        if (!alive) return;
        var dir = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
        player.x += dir * player.speed * dt;
        if (player.targetX != null) player.x += (player.targetX - player.x) * Math.min(1, dt * 0.02);
        player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));
        fireCD -= dt; if (fireCD <= 0) { bullets.push({ x: player.x, y: player.y - 12 }); fireCD = 240; }
        for (i = bullets.length - 1; i >= 0; i--) { bullets[i].y -= 0.5 * dt; if (bullets[i].y < -12) bullets.splice(i, 1); }
        tSpawn += dt; var interval = Math.max(430, 900 - score * 0.5); if (tSpawn >= interval) { tSpawn = 0; spawn(); }
        for (i = foes.length - 1; i >= 0; i--) {
          var f = foes[i]; f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.x < 14 || f.x > W - 14) f.vx *= -1;
          f.shoot -= dt; if (f.shoot <= 0 && f.y < H * 0.72) { f.shoot = rnd(1500, 3400); ebullets.push({ x: f.x, y: f.y + 10 }); }
          if (f.y > H + 20) { foes.splice(i, 1); loseLife(); continue; }
          if (aabb(player.x - 8, player.y - 2, 16, 12, f.x - f.w / 2, f.y - f.h / 2, f.w, f.h)) { foes.splice(i, 1); loseLife(); continue; }
        }
        for (i = ebullets.length - 1; i >= 0; i--) { var eb = ebullets[i]; eb.y += 0.32 * dt; if (eb.y > H + 12) { ebullets.splice(i, 1); continue; } if (aabb(player.x - 8, player.y - 2, 16, 12, eb.x - 2, eb.y - 6, 4, 10)) { ebullets.splice(i, 1); loseLife(); } }
        for (i = bullets.length - 1; i >= 0; i--) { var bl = bullets[i]; for (var j = foes.length - 1; j >= 0; j--) { var fo = foes[j]; if (aabb(bl.x - 2, bl.y - 6, 4, 10, fo.x - fo.w / 2, fo.y - fo.h / 2, fo.w, fo.h)) { bullets.splice(i, 1); foes.splice(j, 1); score += 10; scoreEl.textContent = score; break; } } }
      }
      function draw() {
        ctx.fillStyle = "#05060f"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(223,230,255,.5)"; for (var i = 0; i < stars.length; i++) ctx.fillRect(stars[i].x, stars[i].y, 2, 2);
        ctx.fillStyle = "#22e3ff"; ctx.shadowColor = "#22e3ff"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(player.x, player.y - player.h / 2); ctx.lineTo(player.x - player.w / 2, player.y + player.h / 2); ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#b8ff3a"; for (i = 0; i < bullets.length; i++) ctx.fillRect(bullets[i].x - 2, bullets[i].y - 6, 4, 10);
        ctx.fillStyle = "#ff3b6b"; for (i = 0; i < ebullets.length; i++) ctx.fillRect(ebullets[i].x - 2, ebullets[i].y - 6, 4, 10);
        var cols = ["#ff3bd4", "#ffe14d", "#c26bff"];
        for (i = 0; i < foes.length; i++) { var f = foes[i]; ctx.fillStyle = cols[f.t % 3]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fillRect(f.x - f.w / 2, f.y - f.h / 2, f.w, f.h); ctx.shadowBlur = 0; ctx.fillStyle = "#05060f"; ctx.fillRect(f.x - 6, f.y - 2, 4, 4); ctx.fillRect(f.x + 2, f.y - 2, 4, 4); }
      }
      function key(e) { var k = e.key, d = (k === "ArrowLeft" || k === "a" || k === "A") ? "left" : (k === "ArrowRight" || k === "d" || k === "D") ? "right" : null; if (d) { keys[d] = e.type === "keydown"; e.preventDefault(); } }
      function ptr(e) { var r = cv.getBoundingClientRect(), src = e.touches && e.touches[0] ? e.touches[0] : e; player.targetX = Math.max(player.w / 2, Math.min(W - player.w / 2, (src.clientX - r.left) * (W / r.width))); }
      document.addEventListener("keydown", key); document.addEventListener("keyup", key);
      cv.addEventListener("pointerdown", ptr);
      cv.addEventListener("pointermove", function (e) { if (e.buttons || e.pointerType === "touch") ptr(e); });
      cv.addEventListener("touchmove", function (e) { ptr(e); e.preventDefault(); }, { passive: false });
      document.getElementById("ssRestart").addEventListener("click", reset);
      document.getElementById("ssAgain").addEventListener("click", reset);
      function loop(ts) { var dt = last ? ts - last : 16; last = ts; if (dt > 60) dt = 60; update(dt); draw(); raf = requestAnimationFrame(loop); }
      st = { cleanup: function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", key); document.removeEventListener("keyup", key); } };
      reset(); last = 0; raf = requestAnimationFrame(loop);
    }
    register({ id: "shooter", title: "SPACE SHOOTER", icon: "\uD83D\uDE80", desc: "blast the invaders, dodge fire", mount: mount, unmount: function () { if (st) { st.cleanup(); st = null; } } });
  })();

  window.Arcade = Arcade;
  if (document.readyState !== "loading") boot(); else document.addEventListener("DOMContentLoaded", boot);
})();

/**
 * 画面中央の要素を移動させ、経過時間を表示する
 * @param {number} startSeconds 開始秒数
 */
function startAnimation(startSeconds = 0) {
  const scene = document.querySelector('.scene');
  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'timer-display';
  document.body.appendChild(timerDisplay);

  if (!scene || !timerDisplay) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let dx = 4; // 横方向の速度
  let dy = 4; // 縦方向の速度
  const startTime = 0;

  function update() {
    // 秒数の更新(ヘッドレスChromium環境下では時間の進みが違うのでwindow.__AUDIO2MOVIE_TIME__を用いる)
    const elapsed = (window.__AUDIO2MOVIE_TIME__ - startTime) / 1000;
    timerDisplay.textContent = (startSeconds + elapsed).toFixed(2) + 's';

    // 移動ロジック
    const rect = scene.getBoundingClientRect();
    if (x + rect.width >= window.innerWidth || x <= 0) dx *= -1;
    if (y + rect.height >= window.innerHeight || y <= 0) dy *= -1;

    x += dx;
    y += dy;
    scene.style.left = x + 'px';
    scene.style.top = y + 'px';

    requestAnimationFrame(update);
  }
  update();
}

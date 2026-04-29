let visualizerCanvas = null;
let visualizerCtx = null;

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
    // 秒数の更新
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

/**
 * ビジュアライザーを初期化する
 * @param {string} canvasId キャンバス要素のID
 */
function initVisualizer(canvasId) {
  visualizerCanvas = document.getElementById(canvasId);
  if (visualizerCanvas) {
    visualizerCtx = visualizerCanvas.getContext('2d');
  }
}

/**
 * レンダラーから各フレームで呼び出される描画メインループ
 * @param {number} ms 現在のフレームの再生位置(ミリ秒)
 */
window.draw = function (ms) {
  if (!visualizerCanvas || !visualizerCtx) return;

  const currentTimeMs = ms || window.__AUDIO2MOVIE_TIME__ || 0;
  const startTimeSec = window.__AUDIO2MOVIE_AUDIO_START_TIME__ || 0;
  const sampleRate = window.__AUDIO2MOVIE_AUDIO_SAMPLE_RATE__ || 1000;
  const audioData = window.__AUDIO2MOVIE_AUDIO_DATA__;

  const ctx = visualizerCtx;
  const canvas = visualizerCanvas;

  // キャンバスのクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!audioData) return;

  // 描画設定
  const barCount = 60; // 表示する棒の数
  const barSpacing = 4;
  const barWidth = (canvas.width / barCount) - barSpacing;
  const globalTimeSec = (currentTimeMs / 1000) + startTimeSec;
  const centerIndex = Math.floor(globalTimeSec * sampleRate);

  ctx.fillStyle = '#00ffcc'; // バーの色

  for (let i = 0; i < barCount; i++) {
    // 現在時刻を中心に前後のサンプルを取得
    const sampleIndex = centerIndex - Math.floor(barCount / 2) + i;
    const amplitude = audioData[sampleIndex] || 0;

    // 振幅に応じた高さを計算 (絶対値を使用)
    const barHeight = Math.abs(amplitude) * canvas.height * 0.8;

    const x = i * (barWidth + barSpacing);
    const y = (canvas.height - barHeight) / 2;

    ctx.fillRect(x, y, barWidth, barHeight);
  }
};

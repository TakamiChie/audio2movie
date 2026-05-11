let visualizerCanvas = null;
let visualizerCtx = null;

/**
 * オーディオビジュアライザーを初期化する
 * @param {string} canvasId キャンバス要素のID
 */
function initVisualizer(canvasId) {
  visualizerCanvas = document.getElementById(canvasId);
  if (!visualizerCanvas) {
    console.warn(`ビジュアライザー対象のキャンバスが見つかりません: ${canvasId}`);
    return;
  }
  visualizerCtx = visualizerCanvas.getContext('2d');
}

/**
 * レンダラーから各フレームで呼び出される描画メインループ
 * @param {number} ms 現在のフレームの再生位置(ミリ秒)
 */
window.drawVisualizer = function (ms) {
  if (!visualizerCanvas || !visualizerCtx) return;

  const currentTimeMs = ms || window.__AUDIO2MOVIE_TIME__ || 0;
  const startTimeSec = window.__AUDIO2MOVIE_AUDIO_START_TIME__ || 0;
  const sampleRate = window.__AUDIO2MOVIE_AUDIO_SAMPLE_RATE__ || 1000;
  const audioData = window.__AUDIO2MOVIE_AUDIO_DATA__;

  const ctx = visualizerCtx;
  const canvas = visualizerCanvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!audioData) return;

  const barCount = 60;
  const barSpacing = 4;
  const barWidth = (canvas.width / barCount) - barSpacing;

  const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
  const r = 'hsl(0, 100%, 50%)';
  const g = 'hsl(120, 100%, 50%)';
  const y = 'hsl(60, 100%, 50%)';
  gradient.addColorStop(0, r);
  gradient.addColorStop(0.25, y);
  gradient.addColorStop(0.5, g);
  gradient.addColorStop(0.75, y);
  gradient.addColorStop(1, r);
  ctx.fillStyle = gradient;

  const globalTimeSec = (currentTimeMs / 1000) + startTimeSec;
  const centerIndex = Math.floor(globalTimeSec * sampleRate);

  for (let i = 0; i < barCount; i++) {
    const sampleIndex = centerIndex - Math.floor(barCount / 2) + i;
    const amplitude = audioData[sampleIndex] || 0;
    const absAmplitude = Math.abs(amplitude);
    const barHeight = absAmplitude * canvas.height * 0.8;

    const x = i * (barWidth + barSpacing);
    const y = (canvas.height - barHeight) / 2;

    ctx.fillRect(x, y, barWidth, barHeight);
  }
};


/**
 * 共通の描画エントリーポイントを設定する
 * 既存のwindow.drawがある場合は先に実行してからビジュアライザーを描画する
 */
(function setupDrawEntryPoint() {
  const previousDraw = window.draw;
  window.draw = function (ms) {
    if (typeof previousDraw === 'function') {
      previousDraw(ms);
    }
    window.drawVisualizer(ms);
  };
})();

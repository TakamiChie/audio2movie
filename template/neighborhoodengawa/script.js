let visualizerCanvas = null;
let visualizerCtx = null;

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

  // 縦軸（Y座標）に基づいて色が変化するようにグラデーションを作成
  // 下端を緑色(HSL: 120)、上端を赤色(HSL: 0)に設定します
  const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
  const r = 'hsl(0, 100%, 50%)';
  const g = 'hsl(120, 100%, 50%)';
  const y = 'hsl(60, 100%, 50%)';
  gradient.addColorStop(0, r);   // 下部は赤色
  gradient.addColorStop(0.25, y); // 中間は黄色
  gradient.addColorStop(0.5, g);  // 中央は緑色
  gradient.addColorStop(0.75, y); // 中間は黄色
  gradient.addColorStop(1, r);    // 上部は赤色
  ctx.fillStyle = gradient;

  const globalTimeSec = (currentTimeMs / 1000) + startTimeSec;
  const centerIndex = Math.floor(globalTimeSec * sampleRate);

  for (let i = 0; i < barCount; i++) {
    // 現在時刻を中心に前後のサンプルを取得
    const sampleIndex = centerIndex - Math.floor(barCount / 2) + i;
    const amplitude = audioData[sampleIndex] || 0;
    const absAmplitude = Math.abs(amplitude);

    // 振幅に応じた高さを計算 (絶対値を使用)
    const barHeight = absAmplitude * canvas.height * 0.8;

    const x = i * (barWidth + barSpacing);
    const y = (canvas.height - barHeight) / 2;

    ctx.fillRect(x, y, barWidth, barHeight);
  }
};

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
 * 文字を分割してワイプインアニメーションを適用する
 * @param {HTMLElement} element 対象の要素
 * @param {number} baseDelay 開始遅延（ミリ秒）
 */
function applyWipeInEffect(element, baseDelay) {
  if (!element) return;

  const text = element.textContent;
  element.innerHTML = ''; // 一旦クリア

  const chars = [...text].map((char) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.classList.add('char-wipe-in');
    element.appendChild(span);
    return span;
  });

  chars.forEach((span, index) => {
    setTimeout(() => {
      span.classList.add('is-visible');
    }, baseDelay + index * 50); // 一文字ごとに50msずらす
  });
}

/**
 * レンダラーの準備完了後に呼び出される
 * @param {dict[]} params パラメータ。まちのえんがわキャストの場合、以下のような内容が渡される
 * {
 *   "GuestOrganization": ゲスト団体名,
 *   "GuestName": ゲスト名,
 *   "keyword": キーワード,
 *   "photo": 写真のバイナリデータ
 *   "chapters": チャプター情報を示すapplication/json+chapters形式のデータ(後日実装予定)
 * }
 */
window.init = function (params) {
  console.log(document.body.id);
  if (document.body.id === 'scene2') {
    const orgEl = document.getElementById('GuestOrganization');
    const nameEl = document.getElementById('GuestName');
    const keyEl = document.getElementById('keyword');

    orgEl.textContent = params.organization || '';
    nameEl.textContent = params.name || '';
    keyEl.textContent = params.keyword || '';

    // アニメーションの適用
    applyWipeInEffect(orgEl, 1000);       // 即時
    applyWipeInEffect(nameEl, 1500);   // 1秒遅延
    applyWipeInEffect(keyEl, 2000);    // 1.5秒遅延
  }
  if (params.photo) {
    let imageUrl;
    let imageMimeType = 'image/png'; // デフォルト

    // まちのえんがわキャストで引き渡すデータは必ずバイナリデータ(--param-binaryを使用)
    const uint8 = (params.photo instanceof Uint8Array) ? params.photo : new Uint8Array(params.photo);
    const header = Array.from(uint8.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (header === '89504e47') imageMimeType = 'image/png';
    else if (header.startsWith('ffd8ff')) imageMimeType = 'image/jpeg';
    else if (header.startsWith('47494638')) imageMimeType = 'image/gif';
    else if (header === '52494646') imageMimeType = 'image/webp';
    imageUrl = URL.createObjectURL(new Blob([uint8], { type: imageMimeType }));
    console.log(`DEBUG: Photo is binary/array. Created blob URL. MIME type: ${imageMimeType}`);

    if (!imageUrl) {
      console.error("DEBUG: Failed to generate image URL.");
      return;
    }

    // Imageオブジェクトを使用して、画像データのロード成功を判定
    const img = new Image();
    img.onload = () => {
      console.log(`Image loaded successfully: ${imageUrl}`);
      document.body.style.setProperty("--bg-image", `url(${imageUrl})`);
      if (document.querySelector('.photo')) {
        document.querySelector('.photo img').src = imageUrl;
      }
    };

    img.onerror = () => {
      console.error(`Failed to load image from URL: ${imageUrl} (Type: ${imageMimeType})`);
    };

    img.src = imageUrl; // ImageオブジェクトにURLを設定し、ロードを開始

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

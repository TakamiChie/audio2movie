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
    initChapterDisplay("chapter-display", params.chapters);
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

let visualizerCanvas = null;
let visualizerCtx = null;

function init(params) {
  console.log(`Starting scene: ${document.body.id}`);

  switch (document.body.id) {
    case "scene1":
      console.log(`Page Title: ${params.title}`);
      document.getElementById('pagetitle').textContent = params.title || 'Default Title';
      break;
    case "scene2":
      const items = JSON.parse(params.items);
      console.log(`Add Items`);
      if (items) {
        const container = document.getElementById('itemlist');
        Object.entries(items).forEach(([key, value]) => {
          const li = document.createElement('li');
          console.log(`Adding item: ${key}`);
          li.textContent = `${key}: ${value}`;
          container.appendChild(li);
        });
      }

      break;
    case "scene3":
      const photo = params.photo;
      if (photo) {
        let imageUrl;
        let imageMimeType = 'image/png'; // デフォルト

        // photoが文字列の場合、Base64エンコードされたデータと仮定して処理
        if (typeof photo === 'string') {
          // データURL形式 (data:image/png;base64,...) であればそのまま使用
          if (photo.startsWith('data:')) {
            imageUrl = photo;
            const mimeMatch = photo.match(/^data:(image\/[a-zA-Z0-9\-\+\.]+);base64,/);
            if (mimeMatch && mimeMatch[1]) {
              imageMimeType = mimeMatch[1];
            }
            console.log(`DEBUG: Photo is a data URL. MIME type: ${imageMimeType}`);
          } else {
            // 純粋なBase64文字列の場合、デコードしてBlobを作成
            try {
              const binaryString = atob(photo); // Base64デコード
              const len = binaryString.length;
              const uint8 = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                uint8[i] = binaryString.charCodeAt(i);
              }
              // MIMEタイプ判定はデコード後に行う
              const header = Array.from(uint8.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
              if (header === '89504e47') imageMimeType = 'image/png';
              else if (header.startsWith('ffd8ff')) imageMimeType = 'image/jpeg';
              else if (header.startsWith('47494638')) imageMimeType = 'image/gif';
              else if (header === '52494646') imageMimeType = 'image/webp';

              imageUrl = URL.createObjectURL(new Blob([uint8], { type: imageMimeType }));
              console.log(`DEBUG: Photo is raw base64. Decoded and created blob URL. MIME type: ${imageMimeType}`);
            } catch (e) {
              console.error("DEBUG: Failed to decode base64 string or create blob:", e);
              return; // 処理を中断
            }
          }
        } else {
          // photoがArrayBufferやUint8Array、または数値の配列の場合 (既存のロジック)
          const uint8 = (photo instanceof Uint8Array) ? photo : new Uint8Array(photo);
          const header = Array.from(uint8.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
          if (header === '89504e47') imageMimeType = 'image/png';
          else if (header.startsWith('ffd8ff')) imageMimeType = 'image/jpeg';
          else if (header.startsWith('47494638')) imageMimeType = 'image/gif';
          else if (header === '52494646') imageMimeType = 'image/webp';
          imageUrl = URL.createObjectURL(new Blob([uint8], { type: imageMimeType }));
          console.log(`DEBUG: Photo is binary/array. Created blob URL. MIME type: ${imageMimeType}`);
        }

        if (!imageUrl) {
          console.error("DEBUG: Failed to generate image URL.");
          return;
        }

        // Imageオブジェクトを使用して、画像データのロード成功を判定
        const img = new Image();
        img.onload = () => {
          console.log(`Image loaded successfully: ${imageUrl}`);
          document.body.style.setProperty("--bg-image", `url(${imageUrl})`);
        };

        img.onerror = () => {
          console.error(`Failed to load image from URL: ${imageUrl} (Type: ${imageMimeType})`);
        };

        img.src = imageUrl; // ImageオブジェクトにURLを設定し、ロードを開始
      }
      break;
    default:
      break;

  }
}

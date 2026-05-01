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
        // バイナリの先頭バイト（マジックナンバー）から MIME タイプを判定
        const uint8 = new Uint8Array(photo);
        const header = Array.from(uint8.subarray(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');

        let type = 'image/png'; // デフォルト
        if (header === '89504e47') type = 'image/png';
        else if (header.startsWith('ffd8ff')) type = 'image/jpeg';
        else if (header === '47494638') type = 'image/gif';
        else if (header === '52494646') type = 'image/webp';

        const imageUrl = URL.createObjectURL(new Blob([photo], { type }));
        console.log(`Setting background image: ${imageUrl}`);
        document.body.style.setProperty("--bg-image", `url(${imageUrl})`);
      }
      break;
    default:
      break;

  }
}

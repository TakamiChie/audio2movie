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
      const itemsPath = params.items;
      if (itemsPath) {
        console.log(`Fetching items from: ${itemsPath}`);
        fetch(itemsPath)
          .then(response => response.json())
          .then(data => {
            const container = document.getElementById('itemlist');
            Object.entries(data).forEach(([key, value]) => {
              const li = document.createElement('li');
              console.log(`Adding item: ${key}`);
              li.textContent = `${key}: ${value}`;
              container.appendChild(li);
            });
          })
          .catch(error => console.error('Error loading items JSON:', error));
      }
      break;
    case "scene3":
      // 背景画像の設定
      const photo = params.photo;
      if (photo) {
        console.log(`Setting background image: ${photo}`);
        document.body.style.setProperty("--bg-image", `url(${photo})`);
      }
      break;
    default:
      break;

  }
}

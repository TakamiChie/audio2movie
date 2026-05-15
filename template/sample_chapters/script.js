/**
 * チャプター表示の動作確認に使うサンプルデータ
 * application/json+chapters 形式を想定
 */
const sampleChapters = {
  version: '1.2.0',
  chapters: [
    {
      startTime: '0.0',
      endTime: '2.5',
      title: '導入'
    },
    {
      startTime: '2.5',
      endTime: '5.5',
      title: '前半'
    },
    {
      startTime: '5.5',
      endTime: '9.0',
      title: '中盤'
    },
    {
      startTime: '9.0',
      title: '締め'
    }
  ]
};

/**
 * サンプルシーンの初期化を行う
 * @param {string} elementId 表示先要素のID
 * @param {number} startSeconds シーン開始オフセット秒
 */
function initSampleChapterScene(elementId, startSeconds) {
  const titleElement = document.querySelector('.scene-title');
  if (titleElement) {
    titleElement.textContent += `（開始 ${startSeconds.toFixed(1)}秒）`;
  }

  initChapterDisplay(elementId, sampleChapters);
}

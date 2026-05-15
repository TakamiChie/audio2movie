/**
 * チャプター表示の動作確認に使うサンプルデータ
 * application/json+chapters 形式を想定
 */
const sampleChapters = {
  chapters: [
    {
      startMs: 0,
      endMs: 2500,
      title: '導入',
      description: '番組のテーマを紹介します'
    },
    {
      startMs: 2500,
      endMs: 5500,
      title: '前半',
      description: '前半のトークパートです'
    },
    {
      startMs: 5500,
      endMs: 9000,
      title: '中盤',
      description: '核心となる内容を説明します'
    },
    {
      startMs: 9000,
      endMs: 13000,
      title: '後半',
      description: 'まとめに向けて話を展開します'
    },
    {
      startMs: 13000,
      endMs: 999999,
      title: '締め',
      description: 'エンディングです'
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

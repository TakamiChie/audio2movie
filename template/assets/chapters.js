let chapterDisplayElement = null;
let chapterList = [];
let currentChapterIndex = -1;

/**
 * 秒数（小数可）をミリ秒へ変換する
 * @param {number|string|null|undefined} secondsValue 秒数
 * @returns {number} ミリ秒
 */
function convertSecondsToMs(secondsValue) {
  const seconds = Number(secondsValue);
  if (!Number.isFinite(seconds)) return Number.NaN;
  return seconds * 1000;
}

/**
 * シーン内時刻と音声開始オフセットから音源全体の再生時刻（ミリ秒）を求める
 * @param {number|undefined} sceneMs シーン内の再生時刻（ミリ秒）
 * @returns {number} 音源全体の再生時刻（ミリ秒）
 */
function getGlobalAudioTimeMs(sceneMs) {
  const localMs = Number.isFinite(sceneMs)
    ? sceneMs
    : Number.isFinite(window.__AUDIO2MOVIE_TIME__)
      ? window.__AUDIO2MOVIE_TIME__
      : 0;
  const startTimeSec = Number.isFinite(window.__AUDIO2MOVIE_AUDIO_START_TIME__)
    ? window.__AUDIO2MOVIE_AUDIO_START_TIME__
    : 0;
  return localMs + (startTimeSec * 1000);
}

/**
 * application/json+chapters 形式のデータからチャプター配列を抽出する
 * @param {object|string} chaptersData チャプターデータ（オブジェクトまたはJSON文字列）
 * @returns {object[]} 正規化したチャプター配列
 */
function normalizeChapters(chaptersData) {
  if (!chaptersData) return [];

  let parsed = chaptersData;
  if (typeof chaptersData === 'string') {
    try {
      parsed = JSON.parse(chaptersData);
    } catch (error) {
      console.warn('チャプターデータのJSON解析に失敗しました', error);
      return [];
    }
  }

  const chapters = Array.isArray(parsed?.chapters)
    ? parsed.chapters
    : Array.isArray(parsed)
      ? parsed
      : [];

  const normalized = chapters
    .map((chapter, index) => {
      const startMs = chapter.startTime !== undefined
        ? convertSecondsToMs(chapter.startTime)
        : Number(chapter.startMs ?? chapter.start_ms ?? chapter.start ?? chapter.from ?? Number.NaN);

      const hasEndTime = chapter.endTime !== undefined;
      const hasLegacyEnd = chapter.endMs !== undefined
        || chapter.end_ms !== undefined
        || chapter.end !== undefined
        || chapter.to !== undefined;

      const endMs = hasEndTime
        ? convertSecondsToMs(chapter.endTime)
        : hasLegacyEnd
          ? Number(chapter.endMs ?? chapter.end_ms ?? chapter.end ?? chapter.to)
          : Number.NaN;

      return {
        index,
        startMs,
        endMs,
        title: chapter.title ?? chapter.name ?? `チャプター ${index + 1}`,
        description: chapter.description ?? chapter.text ?? ''
      };
    })
    .filter((chapter) => Number.isFinite(chapter.startMs))
    .sort((a, b) => a.startMs - b.startMs);

  normalized.forEach((chapter, index) => {
    if (!Number.isFinite(chapter.endMs)) {
      const nextChapter = normalized[index + 1];
      chapter.endMs = nextChapter ? nextChapter.startMs : Number.POSITIVE_INFINITY;
    }
  });

  return normalized;
}

/**
 * 画面表示を更新する
 * @param {object|null} chapter 表示するチャプター
 */
function renderChapter(chapter) {
  if (!chapterDisplayElement) return;

  if (!chapter) {
    chapterDisplayElement.textContent = '';
    return;
  }

  chapterDisplayElement.textContent = chapter.description
    ? `${chapter.title}：${chapter.description}`
    : chapter.title;
}

/**
 * 指定した再生時刻に一致するチャプターを検索して表示する
 * @param {number} ms 現在のシーン再生位置（ミリ秒）
 */
function updateChapterDisplay(ms) {
  if (!chapterDisplayElement || chapterList.length === 0) return;

  const currentMs = getGlobalAudioTimeMs(ms);

  const nextIndex = chapterList.findIndex((chapter) => {
    return currentMs >= chapter.startMs && currentMs < chapter.endMs;
  });

  if (nextIndex === currentChapterIndex) return;

  currentChapterIndex = nextIndex;
  renderChapter(nextIndex >= 0 ? chapterList[nextIndex] : null);
}

/**
 * チャプター表示を初期化する
 * @param {string} elementId チャプター表示先要素のID
 * @param {object|string} chaptersData application/json+chapters 形式のデータ
 */
function initChapterDisplay(elementId, chaptersData) {
  chapterDisplayElement = document.getElementById(elementId);
  if (!chapterDisplayElement) {
    console.warn(`チャプター表示先の要素が見つかりません: ${elementId}`);
    return;
  }

  chapterList = normalizeChapters(chaptersData);
  currentChapterIndex = -1;
  updateChapterDisplay(window.__AUDIO2MOVIE_TIME__ || 0);
}

window.initChapterDisplay = initChapterDisplay;
window.updateChapterDisplay = updateChapterDisplay;

/**
 * 共通の描画エントリーポイントを設定する
 * 既存のwindow.drawがある場合は先に実行してからチャプター表示を更新する
 */
(function setupDrawEntryPoint() {
  const previousDraw = window.draw;
  window.draw = function (ms) {
    if (typeof previousDraw === 'function') {
      previousDraw(ms);
    }
    updateChapterDisplay(ms);
  };
})();

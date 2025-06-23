import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { waitFor } from './util.mjs';

const fileInput = document.getElementById('fileInput');
const speedSelect = document.getElementById('speedSelect');
const generateBtn = document.getElementById('generateBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');

let audioPreview, audioRecord;
let previewCtx, previewAnalyser, previewData;
let recordCtx, recordAnalyser, recordData;
let mediaRecorder,
  recordedChunks = [];

// --- Added for interruptible generation ---
let isGeneratingVideo = false;
let recordAnimationId = null;
const GENERATE_BUTTON_TEXT_DEFAULT = '動画生成';
const GENERATE_BUTTON_TEXT_INTERRUPT = '中断';
// --- End Added ---

const logoImg = new Image();
logoImg.onload = () => {
  testRendering();
};
const bgImg = new Image();
bgImg.onload = () => {
  testRendering();
};

let previewStart = null;
let recordStart = null;
const fadeDuration = 3000;

document.addEventListener('DOMContentLoaded', async () => {
  await waitFor(() => window.api);
  await waitFor(() => window.api.loadImageBase64);
  await waitFor(() => window.api.on);
  const reloadImages = async () => {
    logoImg.src = await loadImgBase64('logo');
    bgImg.src = await loadImgBase64('bg');
  };
  window.api.on('requestRefreshCanvas', async () => {
    await reloadImages();
    testRendering();
  });
  const colorSchemeSelector = document.getElementById('colorSchemeSelector');
  const colorSchemes = await window.api.getColorSchemes();
  colorSchemes.forEach((scheme) => {
    const option = document.createElement('option');
    option.value = JSON.stringify(scheme.colors);
    option.text = scheme.name;
    colorSchemeSelector.add(option);
  });
  await reloadImages();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  jsmediatags.read(file, {
    onSuccess: ({ tags }) => {
      const titleInput = document.getElementById('titleInput');
      const albumInput = document.getElementById('albumInput');

      titleInput.value = tags.title || '';
      albumInput.value = tags.album || '';
      setupAudios(URL.createObjectURL(file));
      playBtn.disabled = false;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      generateBtn.disabled = false;
      testRendering();
    },
    onError: () => alert('メタデータ読み込み失敗')
  });
});

Array.from(document.getElementsByClassName('updateRendering')).forEach((e) => {
  switch (e.nodeName) {
    case 'SELECT':
      e.addEventListener('change', testRendering);
      break;
    case 'INPUT':
      e.addEventListener('input', testRendering);
      break;
  }
});

async function loadImgBase64(tag) {
  const { base64, mime } = await window.api.loadImageBase64(tag);
  if (base64 && mime) {
    return `data:${mime};base64,${base64}`;
  }
}

function testRendering() {
  // resolutionSelect の値で出力解像度（offCanvas のサイズ）を設定（UI のキャンバスはそのまま）
  const resolutionSelect = document.getElementById('resolutionSelect');
  const [outputWidth, outputHeight] = resolutionSelect.value.split('x').map(Number);

  // オフスクリーンキャンバスの生成
  const offCanvas = document.createElement('canvas');
  offCanvas.width = outputWidth;
  offCanvas.height = outputHeight;
  const offCtx = offCanvas.getContext('2d');

  // testRendering時にはダミーのオーディオデータを生成してビジュアライザを描画する
  let dummyDataArrayForTest;
  // previewAnalyserが初期化されていればその設定を使い、そうでなければデフォルト値を使用
  const dataLength = previewAnalyser ? previewAnalyser.frequencyBinCount : 128; // fftSize 256 の場合のデフォルト
  dummyDataArrayForTest = new Uint8Array(dataLength);
  const peakHeight = 240; // ビジュアライザの山の高さの最大値 (0-255の範囲で)
  const minHeight = 80; // ビジュアライザの山の高さの最小値 (0-255の範囲で)
  const midPoint = dataLength / 2;
  // peakHeight は minHeight 以上であることを保証 (またはエラー処理)
  const actualPeakHeight = Math.max(minHeight, peakHeight);
  const visualRange = actualPeakHeight - minHeight;

  for (let i = 0; i < dataLength; i++) {
    // minHeight から actualPeakHeight の範囲で山なりの形状を生成
    let baseVal =
      i <= midPoint ? (i / midPoint) * visualRange : ((dataLength - i) / midPoint) * visualRange;
    baseVal += minHeight; // 最小値を加算して底上げ
    // 少しランダムな揺らぎを追加して単調さを減らす
    const finalVal = baseVal + (Math.random() - 0.5) * 40; // -20 から +20 の範囲で揺らぎ
    dummyDataArrayForTest[i] = Math.max(0, Math.min(255, Math.floor(finalVal))); // 0-255の範囲に収める
  }

  drawFrame(offCtx, null, dummyDataArrayForTest, 1);

  // オフスクリーンキャンバスの内容をメインキャンバスに描画
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    offCanvas,
    0,
    0,
    offCanvas.width,
    offCanvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function setupAudios(src) {
  audioPreview = new Audio(src);
  previewCtx = new (window.AudioContext || window.webkitAudioContext)();
  const pvSrc = previewCtx.createMediaElementSource(audioPreview);
  previewAnalyser = previewCtx.createAnalyser();
  previewAnalyser.fftSize = 256;
  previewData = new Uint8Array(previewAnalyser.frequencyBinCount);
  pvSrc.connect(previewAnalyser);
  previewAnalyser.connect(previewCtx.destination);

  audioRecord = new Audio(src);
  recordCtx = new (window.AudioContext || window.webkitAudioContext)();
  const rcSrc = recordCtx.createMediaElementSource(audioRecord);
  recordAnalyser = recordCtx.createAnalyser();
  recordAnalyser.fftSize = 256;
  recordData = new Uint8Array(recordAnalyser.frequencyBinCount);
  rcSrc.connect(recordAnalyser);
  const recDest = recordCtx.createMediaStreamDestination();
  recordAnalyser.connect(recDest);
  audioRecord.recordStream = recDest.stream;
}

function drawFrame(targetCtx, analyser, dataArray, alpha) {
  const titleInput = document.getElementById('titleInput');
  const albumInput = document.getElementById('albumInput');
  // UI キャンバス(canvas)と描画対象キャンバス(targetCtx.canvas)の比率をスケールファクターとする
  const colorSchemeSelector = document.getElementById('colorSchemeSelector');
  let visualizerColors = ['lime']; // デフォルトの色
  if (colorSchemeSelector && colorSchemeSelector.value) {
    try {
      const parsedColors = JSON.parse(colorSchemeSelector.value);
      if (Array.isArray(parsedColors) && parsedColors.length > 0) {
        visualizerColors = parsedColors;
      }
    } catch (e) {
      console.error('Failed to parse color scheme:', e);
      // パースに失敗した場合はデフォルトの色を使用
    }
  }
  const scale = targetCtx.canvas.width / canvas.width;

  targetCtx.fillStyle = '#000';
  targetCtx.fillRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

  const titleLines = titleInput.value.split('/');
  const albumText = albumInput.value;
  const lineLength = Math.max(titleLines.length, 1) + (albumText ? 1 : 0);
  const drawY = 40 * scale;
  const lineSpacing = 25 * scale;
  const bgY = drawY + lineLength * lineSpacing;
  const LSize = bgY - 30 * scale;
  let textX = 20 * scale;

  if (bgImg.src) {
    targetCtx.drawImage(
      bgImg,
      0,
      0,
      bgImg.width,
      bgImg.height,
      0,
      bgY,
      targetCtx.canvas.width,
      targetCtx.canvas.height - bgY
    );
  }
  if (logoImg.src) {
    const LX = 20 * scale,
      LY = 20 * scale;
    targetCtx.drawImage(logoImg, LX, LY, LSize, LSize);
    textX = LX + LSize + 10 * scale;
  }

  targetCtx.globalAlpha = alpha;
  targetCtx.fillStyle = '#fff';
  // タイトルの各行を順次描画する (1行目は大きめのフォント、それ以降は小さめ)
  for (let i = 0; i < titleLines.length; i++) {
    let indent = 0;
    if (i === 0) {
      targetCtx.font = `${24 * scale}px sans-serif`;
    } else {
      targetCtx.font = `${18 * scale}px sans-serif`;
      indent = 20 * scale; // 2行目以降はインデントを追加
    }
    targetCtx.fillText(titleLines[i], textX + indent, drawY + i * lineSpacing);
  }
  // アルバムテキストをタイトルの下に描画
  targetCtx.font = `${24 * scale}px sans-serif`;
  targetCtx.fillText(albumText, textX, drawY + titleLines.length * lineSpacing + 10 * scale);
  targetCtx.globalAlpha = 1;

  // dataArray が提供されていればオーディオビジュアライザを描画
  if (dataArray) {
    // analyser が提供されていれば、dataArray を更新
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
    }
    // dataArray を使用してビジュアライザを描画
    const barWidth = targetCtx.canvas.width / 2 / dataArray.length;

    // ビジュアライザのバーの色を設定
    if (visualizerColors.length > 1) {
      // 複数の色が指定されている場合、グラデーションを作成
      const gradientStartX = targetCtx.canvas.width / 2; // ビジュアライザ描画領域の左端
      const gradientEndX = targetCtx.canvas.width; // ビジュアライザ描画領域の右端
      const gradient = targetCtx.createLinearGradient(gradientStartX, 0, gradientEndX, 0);

      visualizerColors.forEach((color, index) => {
        // N色の場合は、0, 1/(N-1), 2/(N-1), ..., 1 の位置に色を配置
        const offset = index / (visualizerColors.length - 1);
        gradient.addColorStop(offset, color);
      });
      targetCtx.fillStyle = gradient;
    } else {
      // 色が1つの場合 (visualizerColors[0] は 'lime' またはパースされた単一色)
      targetCtx.fillStyle = visualizerColors[0];
    }

    for (let i = 0; i < dataArray.length; i++) {
      // バーの高さは、利用可能な描画領域 (canvasの高さ - bgY) を基準に計算する
      const h = (dataArray[i] / 255) * (targetCtx.canvas.height - bgY);
      // fillStyle はループの前に設定済み (単色またはグラデーション)
      targetCtx.fillRect(
        targetCtx.canvas.width / 2 + i * barWidth, // 画面右半分に描画
        targetCtx.canvas.height - h, // 下から上にバーが伸びる
        barWidth - 1, // バーの幅 (隙間を考慮)
        h
      );
    }
  }
}

function drawPreview(timestamp) {
  if (audioPreview.paused) return;
  if (!previewStart) previewStart = timestamp;
  const elapsed = timestamp - previewStart;
  const alpha = Math.min(elapsed / fadeDuration, 1);
  drawFrame(ctx, previewAnalyser, previewData, alpha);
  requestAnimationFrame(drawPreview);
}

playBtn.addEventListener('click', () => {
  previewStart = null;
  audioPreview.pause();
  audioPreview.currentTime = 0;
  audioPreview.playbackRate = parseFloat(speedSelect.value);
  previewCtx.resume();
  audioPreview.play();
  requestAnimationFrame(drawPreview);
});

pauseBtn.addEventListener('click', () => {
  if (audioPreview.paused) {
    audioPreview.play();
    requestAnimationFrame(drawPreview);
  } else {
    audioPreview.pause();
  }
});

stopBtn.addEventListener('click', () => {
  audioPreview.pause();
  audioPreview.currentTime = 0;
});

// 実際の停止と後処理を行う関数
async function finalizeVideoGeneration(isInterrupted) {
  if (recordAnimationId) {
    cancelAnimationFrame(recordAnimationId);
    recordAnimationId = null;
  }

  if (audioRecord && !audioRecord.paused) {
    audioRecord.pause();
    // audioRecord.currentTime = 0; // Optional: reset audio position if desired on interrupt
  }

  if (isInterrupted) {
    statusTextUpdate('動画生成が中断されました');
    progressUpdate(0, '');
  } else {
    // This case is for successful completion
    if (recordedChunks && recordedChunks.length > 0) {
      let blob = new Blob(recordedChunks, { type: 'video/webm' });
      if (speedSelect.value !== '1') {
        statusTextUpdate('速度調整中...');
        const buffer = await blob.arrayBuffer();
        const base64 = await window.api.adjustVideoSpeed(buffer, parseFloat(speedSelect.value));
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        blob = new Blob([array], { type: 'video/webm' });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusTextUpdate('動画作成完了');
    } else if (!mediaRecorder?.wasInterrupted) {
      // Check wasInterrupted to avoid "no data" message on interrupt
      statusTextUpdate('動画作成完了 (データなし)');
    }
  }

  recordedChunks = [];
  isGeneratingVideo = false;
  if (generateBtn) {
    generateBtn.textContent = GENERATE_BUTTON_TEXT_DEFAULT;
    generateBtn.disabled = !fileInput.files[0] && !(audioRecord && audioRecord.src); // Disable if no file
  }
  if (mediaRecorder) {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = null;
  }
  mediaRecorder = null;
}

generateBtn.addEventListener('click', async () => {
  if (isGeneratingVideo) {
    // ---- Interrupt Action ----
    statusTextUpdate('動画生成を中断しています...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.wasInterrupted = true; // Set flag for onstop
      mediaRecorder.stop(); // This will trigger onstop, which calls finalizeVideoGeneration
    } else {
      // If mediaRecorder isn't active or audio failed to play, directly finalize.
      finalizeVideoGeneration(true);
    }
  } else {
    // ---- Start Generation Action ----
    if (!fileInput.files[0] && !(audioRecord && audioRecord.src)) {
      alert('オーディオファイルを選択してください。');
      return;
    }

    // Ensure audio contexts are ready.
    // If contexts were closed by a previous successful generation, re-initialize them.
    if (
      !recordCtx ||
      recordCtx.state === 'closed' ||
      !previewCtx ||
      previewCtx.state === 'closed'
    ) {
      console.log('Audio context(s) are closed or not initialized. Re-initializing audio setup.');
      let srcForSetup;
      if (audioRecord && audioRecord.src) {
        // Use existing ObjectURL if available (e.g., from a previous load)
        srcForSetup = audioRecord.src;
      } else if (fileInput.files[0]) {
        // Or create a new one from the file input
        srcForSetup = URL.createObjectURL(fileInput.files[0]);
      } else {
        alert('音声ソースが見つかりません。ファイルを再選択してください。');
        finalizeVideoGeneration(true); // Abort
        return;
      }
      // It's important that setupAudios can handle being called multiple times
      // and correctly re-initializes or reuses existing audio elements if appropriate.
      // Assuming setupAudios re-creates AudioContexts and related nodes.
      setupAudios(srcForSetup);
      if (!recordCtx || recordCtx.state === 'closed') {
        // Check again after setup
        alert('録音用音声コンテキストの初期化に失敗しました。');
        finalizeVideoGeneration(true); // Abort
        return;
      }
      if (!previewCtx || previewCtx.state === 'closed') {
        // Check again after setup
        alert('プレビュー用音声コンテキストの初期化に失敗しました。');
        // Don't necessarily abort here, as preview might not be critical for generation
        // but log it. Or decide if this is a fatal error for generation.
        console.warn('プレビュー用音声コンテキストの初期化に失敗しました。');
      }
    }

    isGeneratingVideo = true;
    generateBtn.textContent = GENERATE_BUTTON_TEXT_INTERRUPT;
    generateBtn.disabled = false; // Ensure button is clickable for interruption

    recordedChunks = [];
    recordStart = null;

    statusTextUpdate('動画作成準備中');

    const resolutionSelect = document.getElementById('resolutionSelect');
    const [outputWidth, outputHeight] = resolutionSelect.value.split('x').map(Number);

    // オフスクリーンキャンバスの生成
    const offCanvas = document.createElement('canvas');
    offCanvas.width = outputWidth;
    offCanvas.height = outputHeight;
    const offCtx = offCanvas.getContext('2d');

    if (!audioRecord || !audioRecord.recordStream) {
      console.error('audioRecord or audioRecord.recordStream is not initialized.');
      statusTextUpdate('エラー: 録音ストリームの準備ができていません。');
      finalizeVideoGeneration(true); // Abort
      return;
    }
    const audioStreamTracks = audioRecord.recordStream.getAudioTracks();
    if (audioStreamTracks.length === 0) {
      console.error('No audio tracks in recordStream.');
      statusTextUpdate('エラー: 録音用音声トラックがありません。');
      finalizeVideoGeneration(true); // Abort
      return;
    }

    const canvasStream = offCanvas.captureStream(30);
    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioStreamTracks]);

    try {
      mediaRecorder = new MediaRecorder(combined, { mimeType: 'video/webm; codecs=vp8,opus' });
    } catch (e) {
      console.error('Failed to create MediaRecorder:', e);
      statusTextUpdate(`エラー: MediaRecorder作成失敗 (${e.message})`);
      finalizeVideoGeneration(true);
      return;
    }
    mediaRecorder.wasInterrupted = false; // Custom flag

    mediaRecorder.ondataavailable = (e) => {
      console.log('MediaRecorder ondataavailable event:', e);
      if (e.data.size) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder onstop event triggered');
      finalizeVideoGeneration(mediaRecorder.wasInterrupted);
    };

    audioRecord.onended = () => {
      if (isGeneratingVideo) {
        // Only if generation was ongoing and not already interrupted
        statusTextUpdate('音声再生完了、動画ファイナライズ中...');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop(); // Triggers onstop, then finalizeVideoGeneration(false)
        } else if (
          mediaRecorder &&
          mediaRecorder.state === 'inactive' &&
          !mediaRecorder.wasInterrupted
        ) {
          // If recorder already stopped (e.g. very short audio), but not due to interrupt
          finalizeVideoGeneration(false);
        }

        progressUpdate(1, ''); // Final progress for successful completion

        // Close contexts on successful completion
        if (previewCtx && previewCtx.state !== 'closed') {
          previewCtx.close().catch((e) => console.warn('Error closing previewCtx on success:', e));
        }
        if (recordCtx && recordCtx.state !== 'closed') {
          recordCtx.close().catch((e) => console.warn('Error closing recordCtx on success:', e));
        }
      }
      // Ensure animation stops if audio ends naturally and wasn't caught by interrupt logic
      if (recordAnimationId) {
        cancelAnimationFrame(recordAnimationId);
        recordAnimationId = null;
      }
    };

    // Resume AudioContext if it's suspended (e.g., by browser policy)
    if (recordCtx.state === 'suspended') {
      try {
        await recordCtx.resume();
      } catch (e) {
        console.error('Failed to resume recordCtx:', e);
        statusTextUpdate('エラー: 音声コンテキストの再開に失敗');
        finalizeVideoGeneration(true);
        return;
      }
    }

    audioRecord.pause();
    audioRecord.currentTime = 0;
    // 生成時間短縮のため再生速度をユーザー指定に合わせる
    audioRecord.playbackRate = parseFloat(speedSelect.value);
    statusTextUpdate(`動画作成開始(${speedSelect.value}×速)`);
    mediaRecorder.start();
    audioRecord.play().catch((e) => {
      console.error('Error playing audio for recording:', e);
      statusTextUpdate(`エラー: 音声再生に失敗 (${e.message})`);
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.wasInterrupted = true;
        mediaRecorder.stop(); // This will trigger onstop
      } else {
        finalizeVideoGeneration(true); // Directly finalize if recorder not started
      }
    });

    function drawRecord(timestamp) {
      const diff = timestamp - audioRecord.currentTime;
      console.log(
        'Frame update - timestamp:',
        timestamp,
        'audioRecord.currentTime:',
        audioRecord.currentTime,
        '(diff:',
        diff,
        ')'
      );
      if (!isGeneratingVideo) {
        if (recordAnimationId) {
          cancelAnimationFrame(recordAnimationId);
          recordAnimationId = null;
        }
        return;
      }
      if (!recordStart) recordStart = timestamp;
      const elapsed = timestamp - recordStart;
      const alpha = Math.min(elapsed / fadeDuration, 1);

      let progress = 0;
      let formattedCurrentTime = '00:00';
      let formattedTotalTime = '00:00';

      if (audioRecord.duration > 0 && Number.isFinite(audioRecord.duration)) {
        progress = audioRecord.currentTime / audioRecord.duration;
        const currentMinutes = Math.floor(audioRecord.currentTime / 60);
        const currentSeconds = Math.floor(audioRecord.currentTime % 60);
        const totalMinutes = Math.floor(audioRecord.duration / 60);
        const totalSeconds = Math.floor(audioRecord.duration % 60);
        formattedCurrentTime = `${currentMinutes.toString().padStart(2, '0')}:${currentSeconds.toString().padStart(2, '0')}`;
        formattedTotalTime = `${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
      }
      progressUpdate(progress, `${formattedCurrentTime}/${formattedTotalTime}`);

      drawFrame(offCtx, recordAnalyser, recordData, alpha);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        offCanvas,
        0,
        0,
        offCanvas.width,
        offCanvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      recordAnimationId = requestAnimationFrame(drawRecord);
    }
    recordAnimationId = requestAnimationFrame(drawRecord);
  }
});

function statusTextUpdate(text) {
  document.getElementById('statusText').innerText = text;
}

function progressUpdate(percentage, text) {
  const progressBar = document.getElementById('progressBarInner');
  progressBar.style.width = `${percentage * 100}%`;
  progressBar.innerText = text;
}

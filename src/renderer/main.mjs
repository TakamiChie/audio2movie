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
  console.log(e.nodeName);
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
  if (!audioPreview) return;

  const testAudio = new Audio(audioPreview.src);
  const testCtx = new (window.AudioContext || window.webkitAudioContext)();
  const testSrc = testCtx.createMediaElementSource(testAudio);
  const testAnalyser = testCtx.createAnalyser();
  testAnalyser.fftSize = 256;
  const testData = new Uint8Array(testAnalyser.frequencyBinCount);
  testSrc.connect(testAnalyser);
  testAnalyser.connect(testCtx.destination);
  testAudio.currentTime = 10;
  testAudio.play();
  testAudio.addEventListener(
    'timeupdate',
    () => {
      drawFrame(ctx, testAnalyser, testData, 1);
      testAudio.pause();
      testCtx.close();
    },
    { once: true }
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

// drawFrame 関数を修正して描画先コンテキストを指定可能にする
function drawFrame(targetCtx, analyser, dataArray, alpha) {
  const titleInput = document.getElementById('titleInput');
  const albumInput = document.getElementById('albumInput');
  // UI キャンバス(canvas)と描画対象キャンバス(targetCtx.canvas)の比率をスケールファクターとする
  const scale = targetCtx.canvas.width / canvas.width;

  targetCtx.fillStyle = '#000';
  targetCtx.fillRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

  const titleLines = titleInput.value.split('/');
  const albumText = albumInput.value;
  const drawY = 40 * scale;
  const bgY = titleLines.length > 1 ? drawY + 70 * scale : drawY + 50 * scale;
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
  // テキストサイズをスケールに合わせて変更
  if (titleLines.length > 1) {
    targetCtx.font = `${24 * scale}px sans-serif`;
    targetCtx.fillText(titleLines[0], textX, drawY);
    targetCtx.font = `${18 * scale}px sans-serif`;
    targetCtx.fillText(titleLines[1], textX + 20 * scale, drawY + 25 * scale);
    targetCtx.font = `${24 * scale}px sans-serif`;
    targetCtx.fillText(albumText, textX, drawY + 60 * scale);
  } else {
    targetCtx.font = `${24 * scale}px sans-serif`;
    targetCtx.fillText(titleLines[0], textX, drawY);
    targetCtx.fillText(albumText, textX, drawY + 40 * scale);
  }
  targetCtx.globalAlpha = 1;

  analyser.getByteFrequencyData(dataArray);
  const barWidth = targetCtx.canvas.width / 2 / dataArray.length;
  for (let i = 0; i < dataArray.length; i++) {
    const h = (dataArray[i] / 255) * targetCtx.canvas.height - bgY;
    targetCtx.fillStyle = 'lime';
    targetCtx.fillRect(
      targetCtx.canvas.width / 2 + i * barWidth,
      targetCtx.canvas.height - h,
      barWidth - 1,
      h
    );
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

// generateBtn のクリック時の処理で、offCanvas に高解像度で描画し、その内容をUIキャンバスに縮小コピーする
generateBtn.addEventListener('click', () => {
  generateBtn.disabled = true;
  recordedChunks = [];
  recordStart = null;

  // resolutionSelect の値で出力解像度（offCanvas のサイズ）を設定（UI のキャンバスはそのまま）
  const resolutionSelect = document.getElementById('resolutionSelect');
  const [outputWidth, outputHeight] = resolutionSelect.value.split('x').map(Number);

  // オフスクリーンキャンバスの生成
  const offCanvas = document.createElement('canvas');
  offCanvas.width = outputWidth;
  offCanvas.height = outputHeight;
  const offCtx = offCanvas.getContext('2d');

  // offCanvas のストリームをキャプチャし、audioRecord の音声トラックと結合
  const canvasStream = offCanvas.captureStream(30);
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioRecord.recordStream.getAudioTracks()
  ]);
  mediaRecorder = new MediaRecorder(combined, { mimeType: 'video/webm; codecs=vp8,opus' });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    generateBtn.disabled = false;
  };
  audioRecord.pause();
  audioRecord.currentTime = 0;
  audioRecord.playbackRate = 1;
  recordCtx.resume();
  mediaRecorder.start();
  audioRecord.play();

  // オフスクリーンキャンバスに高解像度の描画を行い、
  // その結果をメインキャンバスへ縮小コピーしてUIに反映する
  function drawRecord(timestamp) {
    if (audioRecord.paused) return;
    if (!recordStart) recordStart = timestamp;
    const elapsed = timestamp - recordStart;
    const alpha = Math.min(elapsed / fadeDuration, 1);
    // offCanvas を描画対象とすることで高解像度で描画
    drawFrame(offCtx, recordAnalyser, recordData, alpha);
    // offCanvas の内容をメインキャンバスに縮小描画
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
    requestAnimationFrame(drawRecord);
  }

  requestAnimationFrame(drawRecord);
  audioRecord.onended = () => {
    mediaRecorder.stop();
    previewCtx.close();
    recordCtx.close();
  };
});

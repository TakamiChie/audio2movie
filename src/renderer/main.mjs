import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { waitFor } from './util.mjs';

const fileInput = document.getElementById('fileInput');
const titleInput = document.getElementById('titleInput');
const albumInput = document.getElementById('albumInput');
const speedSelect = document.getElementById('speedSelect');
const generateBtn = document.getElementById('generateBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const downloadLink = document.getElementById('downloadLink');
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

titleInput.addEventListener('input', testRendering);
albumInput.addEventListener('input', testRendering);

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
      drawFrame(testAnalyser, testData, 1);
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

function drawFrame(analyser, dataArray, alpha) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const titleLines = titleInput.value.split('/');
  const albumText = albumInput.value;
  const drawY = 40;
  const bgY = titleLines.length > 1 ? drawY + 70 : drawY + 50;
  const LSize = bgY - 30;
  let textX = 20;
  if (bgImg.src) {
    ctx.drawImage(
      bgImg,
      0,
      0,
      bgImg.width,
      bgImg.height,
      0,
      bgY,
      canvas.width,
      canvas.height - bgY
    );
  }
  if (logoImg.src) {
    const LX = 20,
      LY = 20;
    ctx.drawImage(logoImg, LX, LY, LSize, LSize);
    textX = LX + LSize + 10;
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  if (titleLines.length > 1) {
    ctx.font = '24px sans-serif';
    ctx.fillText(titleLines[0], textX, drawY);
    ctx.font = '18px sans-serif';
    ctx.fillText(titleLines[1], textX + 20, drawY + 25);
    ctx.font = '24px sans-serif';
    ctx.fillText(`${albumText}`, textX, drawY + 60);
  } else {
    ctx.fillText(`${titleLines[0]}`, textX, drawY);
    ctx.fillText(`${albumText}`, textX, drawY + 40);
  }
  ctx.globalAlpha = 1;
  analyser.getByteFrequencyData(dataArray);
  const barWidth = canvas.width / 2 / dataArray.length;
  for (let i = 0; i < dataArray.length; i++) {
    const h = (dataArray[i] / 255) * canvas.height - bgY;
    ctx.fillStyle = 'lime';
    ctx.fillRect(canvas.width / 2 + i * barWidth, canvas.height - h, barWidth - 1, h);
  }
}

function drawPreview(timestamp) {
  if (audioPreview.paused) return;
  if (!previewStart) previewStart = timestamp;
  const elapsed = timestamp - previewStart;
  const alpha = Math.min(elapsed / fadeDuration, 1);
  drawFrame(previewAnalyser, previewData, alpha);
  requestAnimationFrame(drawPreview);
}

function drawRecord(timestamp) {
  if (audioRecord.paused) return;
  if (!recordStart) recordStart = timestamp;
  const elapsed = timestamp - recordStart;
  const alpha = Math.min(elapsed / fadeDuration, 1);
  drawFrame(recordAnalyser, recordData, alpha);
  requestAnimationFrame(drawRecord);
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

generateBtn.addEventListener('click', () => {
  generateBtn.disabled = true;
  recordedChunks = [];
  recordStart = null;
  const canvasStream = canvas.captureStream(30);
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
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'output.webm';
    downloadLink.style.display = 'inline';
    downloadLink.textContent = '動画をダウンロード';
    generateBtn.disabled = false;
  };
  audioRecord.pause();
  audioRecord.currentTime = 0;
  audioRecord.playbackRate = 1;
  recordCtx.resume();
  mediaRecorder.start();
  audioRecord.play();
  requestAnimationFrame(drawRecord);
  audioRecord.onended = () => {
    mediaRecorder.stop();
    previewCtx.close();
    recordCtx.close();
  };
});

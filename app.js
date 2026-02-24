const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const emptyState = document.getElementById('emptyState');
const generateBtn = document.getElementById('generateBtn');
const saveBtn = document.getElementById('saveBtn');
const statusBar = document.getElementById('statusBar');
const subtitleText = document.getElementById('subtitleText');
const subtitleHeight = document.getElementById('subtitleHeight');
const subtitleHeightNum = document.getElementById('subtitleHeightNum');
const fontSize = document.getElementById('fontSize');
const fontSizeNum = document.getElementById('fontSizeNum');
const opacity = document.getElementById('opacity');
const opacityNum = document.getElementById('opacityNum');
const fontColor = document.getElementById('fontColor');
const fontColorHex = document.getElementById('fontColorHex');
const strokeColor = document.getElementById('strokeColor');
const strokeColorHex = document.getElementById('strokeColorHex');
const fontFamily = document.getElementById('fontFamily');
const fontWeight = document.getElementById('fontWeight');
const stripeMode = document.getElementById('stripeMode');
const stripeGap = document.getElementById('stripeGap');
const stripeGapNum = document.getElementById('stripeGapNum');
const subtitlePosition = document.getElementById('subtitlePosition');
const watermarkText = document.getElementById('watermarkText');
const watermarkSize = document.getElementById('watermarkSize');
const watermarkOpacity = document.getElementById('watermarkOpacity');
const stripeLineWidth = document.getElementById('stripeLineWidth');
const stripeLineWidthNum = document.getElementById('stripeLineWidthNum');
const stripeLineColor = document.getElementById('stripeLineColor');
const stripeLineColorHex = document.getElementById('stripeLineColorHex');

let image = null;
let imageURL = null;

function clampSize(w, h, limit = 4096) {
  const maxSide = Math.max(w, h);
  if (maxSide <= limit) return { w, h };
  const ratio = limit / maxSide;
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

function num(v, def, min, max) {
  let n = parseFloat(v);
  if (Number.isNaN(n)) n = def;
  if (typeof min === 'number') n = Math.max(min, n);
  if (typeof max === 'number') n = Math.min(max, n);
  return n;
}

function hexNormalize(v) {
  const s = v.trim();
  return s.startsWith('#') ? s.toUpperCase() : ('#' + s).toUpperCase();
}

function setStatus(text, type) {
  statusBar.textContent = text || '';
  statusBar.className = 'status' + (type ? ' ' + type : '');
}

function syncPair(a, b) {
  a.addEventListener('input', () => { b.value = a.value; renderPreview(); });
  b.addEventListener('input', () => { a.value = b.value; renderPreview(); });
}

function enableButtons(enabled) {
  generateBtn.disabled = !enabled;
  saveBtn.disabled = !enabled;
}

function measureWrappedLines(ctx, text, maxWidth) {
  const lines = [];
  const rawLines = text.split(/\r?\n/);
  for (const raw of rawLines) {
    if (!raw) { lines.push(''); continue; }
    const tokens = /[^\x00-\xff]+|[\w\-’'.,!?;:]+|./g;
    const parts = raw.match(tokens) || [];
    let current = '';
    for (const part of parts) {
      const next = current + part;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        if (current.length === 0) {
          lines.push(part);
        } else {
          lines.push(current);
          current = part;
        }
      }
    }
    if (current.length) lines.push(current);
  }
  return lines;
}

function renderPreview() {
  if (!image) {
    canvas.style.display = 'none';
    emptyState.style.display = 'grid';
    enableButtons(false);
    return;
  }
  const target = clampSize(image.naturalWidth, image.naturalHeight);
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 先绘制缩放后的原图到离屏画布，再拷贝到底部用于条带
  const base = document.createElement('canvas');
  base.width = target.w;
  base.height = target.h;
  const bctx = base.getContext('2d');
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, target.w, target.h);
  ctx.drawImage(base, 0, 0);

  const h = num(subtitleHeight.value, 80, 40, 400);
  const pad = 24;
  const areaYBottom = target.h - h;
  const alpha = num(opacity.value, 0.5, 0, 0.8);

  const size = num(fontSize.value, 40, 18, 96);
  const weight = fontWeight.value || 'normal';
  const family = fontFamily.value || 'Microsoft YaHei, PingFang SC, Noto Sans SC, Arial';
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const color = hexNormalize(fontColorHex.value || '#FFFFFF');
  const stroke = hexNormalize(strokeColorHex.value || '#000000');
  ctx.fillStyle = color;
  ctx.strokeStyle = stroke;

  const strokeWidth = Math.max(1, Math.round(Math.max(target.w, target.h) / 1080));
  ctx.lineWidth = strokeWidth;

  const text = subtitleText.value || '';
  const maxWidth = target.w - pad * 2;
  const splitLines = text.split(/\r?\n/).filter(l => l.length > 0);
  const isStripes = splitLines.length > 1;
  const lines = isStripes ? splitLines : measureWrappedLines(ctx, text, maxWidth);
  const lineHeight = Math.round(size * 1.4);
  const x = Math.floor(target.w / 2);
  const gap = stripeGap ? num(stripeGap.value, 2, 0, 12) : 2;
  const pos = subtitlePosition ? (subtitlePosition.value || 'bottom') : 'bottom';
  const sepWidth = stripeLineWidth ? num(stripeLineWidth.value, 1, 0, 3) : 1;
  const sepColor = stripeLineColorHex ? hexNormalize(stripeLineColorHex.value || '#FFFFFF') : '#FFFFFF';

  if (!isStripes) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    const areaY = pos === 'bottom' ? areaYBottom : Math.max(0, Math.floor((target.h - h) / 2));
    ctx.fillRect(0, areaY, target.w, h);
    const totalHeight = lines.length * lineHeight;
    let startY = areaY + Math.max(0, Math.floor((h - totalHeight) / 2));
    for (const line of lines) {
      ctx.strokeText(line, x, startY);
      ctx.fillText(line, x, startY);
      startY += lineHeight;
    }
  } else {
    const totalAppend = lines.length * h + (lines.length - 1) * gap;
    const prevImage = ctx.getImageData(0, 0, target.w, target.h);
    canvas.height = target.h + totalAppend;
    ctx.putImageData(prevImage, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    let y = target.h;
    for (const line of lines) {
      // 复制底部区域到新增画布区域
      ctx.drawImage(base, 0, target.h - h, target.w, h, 0, y, target.w, h);
      // 遮罩与分隔线
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, y, target.w, h);
      ctx.strokeStyle = sepColor;
      ctx.lineWidth = sepWidth;
      ctx.beginPath();
      ctx.moveTo(0, y + sepWidth / 2);
      ctx.lineTo(target.w, y + sepWidth / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y + h - sepWidth / 2);
      ctx.lineTo(target.w, y + h - sepWidth / 2);
      ctx.stroke();
      // 文字居中
      ctx.fillStyle = color;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.save();
      ctx.textBaseline = 'middle';
      const ty = y + Math.round(h / 2);
      ctx.strokeText(line, x, ty);
      ctx.fillText(line, x, ty);
      ctx.restore();
      y += h + gap;
    }
  }

  emptyState.style.display = 'none';
  canvas.style.display = 'block';
  enableButtons(true);
  setStatus('', '');
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    setStatus('不支持的格式', 'error');
    return;
  }
  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = URL.createObjectURL(file);
  image = new Image();
  image.onload = () => renderPreview();
  image.onerror = () => setStatus('图片加载失败', 'error');
  image.src = imageURL;
});

syncPair(subtitleHeight, subtitleHeightNum);
if (stripeGap && stripeGapNum) syncPair(stripeGap, stripeGapNum);
if (stripeLineWidth && stripeLineWidthNum) syncPair(stripeLineWidth, stripeLineWidthNum);
syncPair(fontSize, fontSizeNum);
syncPair(opacity, opacityNum);

fontColor.addEventListener('input', () => { fontColorHex.value = hexNormalize(fontColor.value); renderPreview(); });
fontColorHex.addEventListener('input', () => { fontColor.value = hexNormalize(fontColorHex.value); renderPreview(); });
strokeColor.addEventListener('input', () => { strokeColorHex.value = hexNormalize(strokeColor.value); renderPreview(); });
strokeColorHex.addEventListener('input', () => { strokeColor.value = hexNormalize(strokeColorHex.value); renderPreview(); });
fontFamily.addEventListener('change', renderPreview);
fontWeight.addEventListener('change', renderPreview);
subtitleText.addEventListener('input', renderPreview);
if (stripeMode) stripeMode.addEventListener('change', renderPreview);
if (subtitlePosition) subtitlePosition.addEventListener('change', renderPreview);
if (watermarkText) watermarkText.addEventListener('input', renderPreview);
if (watermarkSize) watermarkSize.addEventListener('input', renderPreview);
if (watermarkOpacity) watermarkOpacity.addEventListener('input', renderPreview);
if (stripeLineColor) stripeLineColor.addEventListener('input', () => { stripeLineColorHex.value = hexNormalize(stripeLineColor.value); renderPreview(); });
if (stripeLineColorHex) stripeLineColorHex.addEventListener('input', () => { stripeLineColor.value = hexNormalize(stripeLineColorHex.value); renderPreview(); });

generateBtn.addEventListener('click', () => {
  if (!image) { setStatus('请先上传图片', 'error'); return; }
  renderPreview();
  setStatus('字幕图片生成成功！', 'success');
});

saveBtn.addEventListener('click', async () => {
  if (!image) { setStatus('请先上传图片', 'error'); return; }
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const name = (fileInput.files[0]?.name || 'image').replace(/\.[^.]+$/, '');
    a.href = url;
    a.download = `${name}_subtitled.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('已保存到本地', 'success');
  } catch (e) {
    setStatus('保存失败', 'error');
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveBtn.click();
  }
});

function drawWatermark(ctx, w, h) {
  const text = watermarkText && watermarkText.value ? watermarkText.value.trim() : '';
  if (!text) return;
  const size = Math.max(10, Math.min(32, parseInt((watermarkSize && watermarkSize.value) || 14, 10)));
  const alpha = Math.min(0.6, Math.max(0.1, parseFloat((watermarkOpacity && watermarkOpacity.value) || 0.25)));
  ctx.save();
  ctx.font = `normal ${size}px ${fontFamily.value || 'Microsoft YaHei, PingFang SC, Noto Sans SC, Arial'}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  const margin = 12;
  ctx.fillText(text, w - margin, margin);
  ctx.restore();
}

// 在每次渲染结束后添加水印
(function wrapRender() {
  const original = renderPreview;
  renderPreview = function() {
    original();
    if (image) {
      const ctx = canvas.getContext('2d');
      drawWatermark(ctx, canvas.width, canvas.height);
    }
  };
})();

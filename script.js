const imageInput = document.getElementById('imageInput');
const folderInput = document.getElementById('folderInput');
const watermarkText = document.getElementById('watermarkText');
const textColor = document.getElementById('textColor');
const opacity = document.getElementById('opacity');
const fontSize = document.getElementById('fontSize');
const rotation = document.getElementById('rotation');
const gridRows = document.getElementById('gridRows');
const gridCols = document.getElementById('gridCols');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const dropZone = document.getElementById('dropZone');
const dropContent = document.querySelector('.drop-content');
const downloadBtn = document.getElementById('downloadBtn');
const batchProcessBtn = document.getElementById('batchProcessBtn');
const copyCommandBtn = document.getElementById('copyCommandBtn');
const exportPathInput = document.getElementById('exportPath');

// Status and Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const singleUpload = document.getElementById('singleUpload');
const batchUpload = document.getElementById('batchUpload');
const batchStatus = document.getElementById('batchStatus');
const statusText = document.querySelector('.status-text');
const progressFill = document.getElementById('progressFill');

// Value display elements
const opacityValue = document.getElementById('opacityValue');
const fontSizeValue = document.getElementById('fontSizeValue');
const rotationValue = document.getElementById('rotationValue');
const rowsValue = document.getElementById('rowsValue');
const colsValue = document.getElementById('colsValue');
const colorHex = document.getElementById('colorHex');

let originalImage = null;
let batchFiles = [];

// Initialization
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            if (tab === 'single') {
                singleUpload.classList.remove('hidden');
                batchUpload.classList.add('hidden');
                downloadBtn.classList.remove('hidden');
                batchProcessBtn.classList.add('hidden');
            } else {
                singleUpload.classList.add('hidden');
                batchUpload.classList.remove('hidden');
                downloadBtn.classList.add('hidden');
                batchProcessBtn.classList.remove('hidden');
            }
        });
    });

    imageInput.addEventListener('change', handleImageUpload);
    folderInput.addEventListener('change', handleFolderUpload);

    [watermarkText, textColor, opacity, fontSize, rotation, gridRows, gridCols].forEach(el => {
        el.addEventListener('input', () => {
            updateValueDisplays();
            drawPreview();
        });
    });

    copyCommandBtn.addEventListener('click', () => {
        const cmd = `python3 /Users/mochipeanut/antigravity/gen_watermark/batch_process.py`;
        navigator.clipboard.writeText(cmd).then(() => {
            const originalText = copyCommandBtn.textContent;
            copyCommandBtn.textContent = 'コピー完了！ターミナルで実行してください';
            setTimeout(() => copyCommandBtn.textContent = originalText, 3000);
        });
    });

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) loadImage(file);
    });

    downloadBtn.addEventListener('click', () => {
        downloadImage(canvas.toDataURL('image/png'), `watermarked_${Date.now()}.png`);
    });

    batchProcessBtn.addEventListener('click', processBatch);
}

function updateValueDisplays() {
    opacityValue.textContent = opacity.value;
    fontSizeValue.textContent = fontSize.value;
    rotationValue.textContent = rotation.value;
    rowsValue.textContent = gridRows.value;
    colsValue.textContent = gridCols.value;
    colorHex.textContent = textColor.value.toUpperCase();
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) loadImage(file);
}

function handleFolderUpload(e) {
    batchFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (batchFiles.length > 0) {
        batchProcessBtn.disabled = false;
        loadImage(batchFiles[0]); // Preview first
    }
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            canvas.style.display = 'block';
            dropContent.style.display = 'none';
            downloadBtn.disabled = false;
            drawPreview();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function drawPreview() {
    if (!originalImage) return;
    renderOnCanvas(canvas, originalImage);
}

function renderOnCanvas(targetCanvas, img) {
    const targetCtx = targetCanvas.getContext('2d');
    targetCanvas.width = img.width;
    targetCanvas.height = img.height;

    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.drawImage(img, 0, 0);

    const text = watermarkText.value || '';
    const color = textColor.value;
    const alpha = opacity.value;
    const size = parseInt(fontSize.value);
    const rot = parseInt(rotation.value) * (Math.PI / 180);
    const rows = parseInt(gridRows.value);
    const cols = parseInt(gridCols.value);

    targetCtx.save();
    targetCtx.font = `800 ${size}px 'Inter', sans-serif`;
    targetCtx.fillStyle = color;
    targetCtx.globalAlpha = alpha;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.shadowColor = 'rgba(0,0,0,0.3)';
    targetCtx.shadowBlur = 10;

    const cellWidth = targetCanvas.width / cols;
    const cellHeight = targetCanvas.height / rows;

    for (let i = -1; i <= rows + 1; i++) {
        for (let j = -1; j <= cols + 1; j++) {
            const xOffset = (i % 2 === 0) ? 0 : cellWidth / 2;
            const x = (j * cellWidth) + xOffset;
            const y = i * cellHeight;
            targetCtx.save();
            targetCtx.translate(x, y);
            targetCtx.rotate(rot);
            targetCtx.fillText(text, 0, 0);
            targetCtx.restore();
        }
    }
    targetCtx.restore();
}

async function processBatch() {
    if (batchFiles.length === 0) {
        alert('先に「画像フォルダーを選択」から画像を選んでください。');
        return;
    }

    batchProcessBtn.disabled = true;
    batchStatus.classList.remove('hidden');
    progressFill.style.width = '0%';

    const offscreenCanvas = document.createElement('canvas');

    for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i];
        statusText.textContent = `処理中 (${i + 1}/${batchFiles.length}): ${file.name}`;

        const img = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        renderOnCanvas(offscreenCanvas, img);
        const dataUrl = offscreenCanvas.toDataURL('image/png');

        // Use a small timeout to allow UI updates and prevent browser blockage
        await new Promise(r => setTimeout(r, 100));
        downloadImage(dataUrl, `watermarked_${file.name}`);

        const progress = ((i + 1) / batchFiles.length) * 100;
        progressFill.style.width = `${progress}%`;

        await new Promise(r => setTimeout(r, 400)); // Increased delay for security/stability
    }

    statusText.innerHTML = '完了！<br><b>ブラウザでの一括処理:</b> 「ダウンロード」フォルダを確認してください。<br><b>特定のフォルダに保存したい場合:</b> 下のPythonコマンドを使用してください。';
    batchProcessBtn.disabled = false;
    setTimeout(() => {
        batchStatus.classList.add('hidden');
    }, 5000);
}

function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link); // Ensure link is in DOM
    link.click();
    document.body.removeChild(link);
}

init();

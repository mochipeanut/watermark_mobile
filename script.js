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
const previewImage = document.getElementById('previewImage');
const ctx = canvas.getContext('2d');
const dropZone = document.getElementById('dropZone');
const dropContent = document.querySelector('.drop-content');
const downloadBtn = document.getElementById('downloadBtn');
const batchProcessBtn = document.getElementById('batchProcessBtn');
const copyCommandBtn = document.getElementById('copyCommandBtn');
const exportPathInput = document.getElementById('exportPath');
const fontFamily = document.getElementById('fontFamily');
const fontWeight = document.getElementById('fontWeight');
const letterSpacing = document.getElementById('letterSpacing');
const staggered = document.getElementById('staggered');

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
const spacingValue = document.getElementById('spacingValue');
const weightValue = document.getElementById('weightValue');
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

    [watermarkText, textColor, opacity, fontSize, rotation, gridRows, gridCols, fontFamily, letterSpacing, fontWeight].forEach(el => {
        el.addEventListener('input', () => {
            updateValueDisplays();
            drawPreview();
        });
    });

    staggered.addEventListener('change', () => {
        drawPreview();
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
    spacingValue.textContent = letterSpacing.value;
    weightValue.textContent = fontWeight.value;
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
            previewImage.style.display = 'block';
            dropZone.classList.add('has-image');

            // Show mobile hint if relevant
            const mobileHint = document.querySelector('.mobile-only-hint');
            if (mobileHint && window.innerWidth <= 600) {
                mobileHint.style.display = 'block';
            }

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

    // Sync canvas to image for mobile saving
    previewImage.src = canvas.toDataURL('image/png');
}

function renderOnCanvas(targetCanvas, img) {
    const targetCtx = targetCanvas.getContext('2d');
    targetCanvas.width = img.width;
    targetCanvas.height = img.height;

    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.drawImage(img, 0, 0);

    const text = watermarkText.value || '';
    const color = textColor.value;
    const alpha = parseFloat(opacity.value);
    const size = parseInt(fontSize.value);
    const rot = parseInt(rotation.value) * (Math.PI / 180);
    const rows = parseInt(gridRows.value);
    const cols = parseInt(gridCols.value);
    const family = fontFamily.value;
    const weight = fontWeight.value;
    const spacing = letterSpacing.value + 'px';
    const isStaggered = staggered.checked;

    targetCtx.save();
    targetCtx.font = `${weight} ${size}px ${family}`;
    if ('letterSpacing' in targetCtx) {
        targetCtx.letterSpacing = spacing;
    }
    targetCtx.fillStyle = color;
    targetCtx.globalAlpha = alpha;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.shadowColor = 'transparent'; // Disabled shadow for better thinness perception
    targetCtx.shadowBlur = 0;

    const cellWidth = targetCanvas.width / cols;
    const cellHeight = targetCanvas.height / rows;

    for (let i = -1; i <= rows + 1; i++) {
        for (let j = -1; j <= cols + 1; j++) {
            let xOffset = 0;
            if (isStaggered) {
                // Shift every other row horizontally by half cell width
                xOffset = (Math.abs(i) % 2 === 0) ? 0 : cellWidth * 0.5;
            }
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

    const galleryContainer = document.getElementById('resultGalleryContainer');
    const gallery = document.getElementById('resultGallery');
    gallery.innerHTML = ''; // Clear previous results
    galleryContainer.classList.remove('hidden');

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

        // Ensure the latest preview values are applied (fixes color/opacity update issue)
        renderOnCanvas(offscreenCanvas, img);
        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.95);

        // Add to Gallery for mobile users (Long-press to save)
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        const resultImg = document.createElement('img');
        resultImg.src = dataUrl;
        resultItem.appendChild(resultImg);
        gallery.appendChild(resultItem);

        // Auto-download (for desktop experience)
        const originalName = file.name;
        const lastDotIndex = originalName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        const newFilename = `watermarked_${baseName}.jpg`;

        await new Promise(r => setTimeout(r, 100));
        downloadImage(dataUrl, newFilename);

        const progress = ((i + 1) / batchFiles.length) * 100;
        progressFill.style.width = `${progress}%`;

        await new Promise(r => setTimeout(r, 400));
    }

    statusText.innerHTML = '完了！<br><b>スマホの方：</b> 下のギャラリー画像を長押しして「写真を保存」してください。<br><b>PCの方：</b> 「ダウンロード」フォルダを確認してください。';
    batchProcessBtn.disabled = false;
}

function downloadImage(dataUrl, filename) {
    // Detect mobile (iOS/Android)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        // First try: Open in new window
        try {
            const newTab = window.open();
            if (!newTab || newTab.closed || typeof newTab.closed == 'undefined') {
                // If pop-up is blocked, use location.href as fallback
                window.location.href = dataUrl;
            } else {
                newTab.document.write(`
                    <html>
                        <head><title>Save Image</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                        <body style="margin:0; background: #111; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family: -apple-system, sans-serif; color: white; text-align: center;">
                            <div style="padding: 20px;">
                                <p style="margin-bottom: 20px; font-weight: bold;">画像を長押しして「"写真"に保存」を選択してください</p>
                                <img src="${dataUrl}" style="max-width: 100%; max-height: 70vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
                                <div style="margin-top: 40px;">
                                    <button onclick="window.close()" style="padding: 14px 30px; background: #222; border: 1px solid #444; color: white; border-radius: 100px; font-size: 1rem; cursor: pointer;">戻る</button>
                                </div>
                            </div>
                        </body>
                    </html>
                `);
            }
        } catch (e) {
            window.location.href = dataUrl;
        }
    } else {
        // Desktop standard download
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

init();

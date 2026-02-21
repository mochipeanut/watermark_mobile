# AI Watermark Studio

Premium Image Branding Tool with Batch Processing capabilities.

## Features
- **Premium UI**: Dark mode with glassmorphism and smooth animations.
- **Tiled Watermarking**: Full coverage patterns with alternating offsets (pro-style).
- **Real-time Preview**: Adjust opacity, font size, rotation, and density instantly.
- **Batch Processing**:
  - **Browser Mode**: Process multiple images via folder selection (saves to Downloads).
  - **Python Mode**: High-speed processing using Pillow (saves directly to the export folder).

## Setup (Python Mode)
To use the high-speed batch processor:

1. Clone this repository.
2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install Pillow
   ```
3. Place your images in the `img/` folder.
4. Open `index.html` in your browser, configure your watermark, then click **"Copy Python Command"**.
5. Paste and run the command in your terminal.

## License
MIT

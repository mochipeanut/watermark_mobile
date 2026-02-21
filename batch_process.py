import os
import re
from PIL import Image, ImageDraw, ImageFont

def get_config_from_html(file_path):
    """
    Extracts default values and export path from index.html to keep things in sync.
    """
    config = {
        "text": "CONFIDENTIAL",
        "opacity": 0.1,
        "font_size": 14,
        "rotation": -22,
        "rows": 10,
        "cols": 6,
        "export_path": "./export"
    }
    
    if not os.path.exists(file_path):
        return config

    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
        
        # Regex to find values in the HTML inputs
        def find_val(id_name):
            match = re.search(f'id="{id_name}"[^>]+value="([^"]+)"', html)
            return match.group(1) if match else None

        config["text"] = find_val("watermarkText") or config["text"]
        config["opacity"] = float(find_val("opacity") or config["opacity"])
        config["font_size"] = int(find_val("fontSize") or config["font_size"])
        config["rotation"] = int(find_val("rotation") or config["rotation"])
        config["rows"] = int(find_val("gridRows") or config["rows"])
        config["cols"] = int(find_val("gridCols") or config["cols"])
        config["export_path"] = find_val("exportPath") or config["export_path"]
        
    return config

def add_watermark(input_path, output_path, text, opacity, font_size, rotation, rows, cols):
    try:
        base = Image.open(input_path).convert("RGBA")
        txt_layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
        
        w, h = base.size
        # Dynamic font size: The UI's '14' is too small for high-res images.
        # We'll treat UI 'font_size' as a percentage of the image width (roughly).
        scaled_font_size = int((w / 1000) * font_size * 2) 
        if scaled_font_size < 10: scaled_font_size = 10
        
        try:
            # Common paths for macOS
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", scaled_font_size)
        except:
            font = ImageFont.load_default()

        d = ImageDraw.Draw(txt_layer)
        cell_w = w / cols
        cell_h = h / rows
        fill_color = (255, 255, 255, int(opacity * 255))

        for r in range(-1, rows + 2):
            for c in range(-1, cols + 2):
                x_offset = 0 if r % 2 == 0 else cell_w / 2
                x = int(c * cell_w + x_offset)
                y = int(r * cell_h)
                
                # Create a temporary image for rotated text
                # Increase buffer to avoid clipping
                tw, th = int(scaled_font_size * len(text) * 1.5), scaled_font_size * 3
                temp_txt = Image.new("RGBA", (tw, th), (255, 255, 255, 0))
                temp_d = ImageDraw.Draw(temp_txt)
                
                # Draw high-contrast outline for visibility on any background
                outline_color = (0, 0, 0, int(opacity * 150))
                # Draw shadow/outline in 4 directions
                for ox, oy in [(-1,-1), (1,-1), (-1,1), (1,1)]:
                    temp_d.text((tw//2 + ox, th//2 + oy), text, font=font, fill=outline_color, anchor="mm")
                
                # Draw main text
                temp_d.text((tw//2, th//2), text, font=font, fill=fill_color, anchor="mm")
                
                # Rotate
                rotated_txt = temp_txt.rotate(rotation, expand=1, resample=Image.BICUBIC)
                
                # Paste onto txt_layer
                txt_layer.paste(rotated_txt, (x - rotated_txt.width//2, y - rotated_txt.height//2), rotated_txt)

        out = Image.alpha_composite(base, txt_layer)
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        out.convert("RGB").save(output_path, "JPEG", quality=95)
        return True
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(current_dir, "index.html")
    
    print("--- AI Watermark Batch Processor ---")
    config = get_config_from_html(html_path)
    
    IMG_DIR = os.path.join(current_dir, "img")
    EXPORT_DIR = config["export_path"]

    print(f"Config loaded from UI:")
    print(f" - Text: {config['text']}")
    print(f" - Grid: {config['rows']}x{config['cols']}")
    print(f" - Export Path: {EXPORT_DIR}")
    print("-------------------------------------")

    if not os.path.exists(IMG_DIR):
        print(f"Error: Directory '{IMG_DIR}' not found.")
    else:
        images = [f for f in os.listdir(IMG_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not images:
            print(f"No images found in {IMG_DIR}.")
        else:
            print(f"Found {len(images)} images. Processing...")
            success_count = 0
            for img_name in images:
                input_p = str(os.path.join(IMG_DIR, img_name))
                output_p = str(os.path.join(str(EXPORT_DIR), f"watermarked_{img_name}"))
                if add_watermark(input_p, output_p, 
                                 str(config["text"]), float(config["opacity"]), int(config["font_size"]), 
                                 int(config["rotation"]), int(config["rows"]), int(config["cols"])):
                    success_count += 1
            
            print(f"\nFinished! {success_count}/{len(images)} images processed.")
            print(f"Results are in: {EXPORT_DIR}")

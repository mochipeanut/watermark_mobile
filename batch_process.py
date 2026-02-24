import os
import re
from PIL import Image, ImageDraw, ImageFont

def get_config_from_html(file_path):
    """
    Extracts default values and export path from index.html to keep things in sync.
    """
    config = {
        "text": "mochipeanut",
        "opacity": 0.05,
        "font_size": 59,
        "rotation": -22,
        "rows": 8,
        "cols": 3,
        "font_family": "monospace",
        "font_weight": 900,
        "letter_spacing": 0,
        "is_staggered": True,
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
        config["font_family"] = find_val("fontFamily") or config["font_family"]
        config["font_weight"] = int(find_val("fontWeight") or config["font_weight"])
        config["letter_spacing"] = int(find_val("letterSpacing") or config["letter_spacing"])
        
        # Robust checkbox parsing: find the input tag and check for "checked"
        tag_match = re.search(r'<input[^>]*id="staggered"[^>]*>', html, re.IGNORECASE)
        if tag_match:
            config["is_staggered"] = "checked" in tag_match.group(0).lower()
        else:
            config["is_staggered"] = False

        config["export_path"] = find_val("exportPath") or config["export_path"]
        
    return config

def add_watermark(input_path, output_path, text, opacity, font_size, rotation, rows, cols, font_family, letter_spacing, font_weight, is_staggered):
    try:
        base = Image.open(input_path).convert("RGBA")
        txt_layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
        
        w, h = base.size
        # Dynamic font size: The UI's '14' is too small for high-res images.
        # We'll treat UI 'font_size' as a percentage of the image width (roughly).
        scaled_font_size = int((w / 1000) * font_size * 2) 
        if scaled_font_size < 10: scaled_font_size = 10
        
        # Map UI fonts to system fonts on macOS
        font_map = {
            "'Inter', sans-serif": "/System/Library/Fonts/Helvetica.ttc",
            "'Oswald', sans-serif": "/System/Library/Fonts/Supplemental/Impact.ttf",
            "'Roboto', sans-serif": "/System/Library/Fonts/Helvetica.ttc",
            "'Montserrat', sans-serif": "/System/Library/Fonts/Helvetica.ttc",
            "'Playfair Display', serif": "/System/Library/Fonts/Times.ttc",
            "serif": "/System/Library/Fonts/Times.ttc",
            "monospace": "/System/Library/Fonts/Courier.ttc"
        }
        
        font_path = font_map.get(font_family, "/System/Library/Fonts/Helvetica.ttc")
        
        # Attempt to handle weight by looking for Bold variants if weight is high
        if font_weight >= 700:
            bold_path = font_path.replace(".ttc", "Bold.ttc").replace(".ttf", "Bold.ttf")
            if os.path.exists(bold_path):
                font_path = bold_path

        try:
            font = ImageFont.truetype(font_path, scaled_font_size)
        except:
            font = ImageFont.load_default()

        d = ImageDraw.Draw(txt_layer)
        cell_w = w / cols
        cell_h = h / rows
        fill_color = (255, 255, 255, int(opacity * 255))

        for r in range(-1, rows + 2):
            for c in range(-1, cols + 2):
                x_offset = 0
                if is_staggered:
                    # Alternating horizontal shift
                    x_offset = 0 if abs(r) % 2 == 0 else cell_w * 0.5
                x = int(c * cell_w + x_offset)
                y = int(r * cell_h)
                
                # Create a temporary image for rotated text
                # Increase buffer to avoid clipping
                tw, th = int(scaled_font_size * len(text) * 1.5), scaled_font_size * 3
                temp_txt = Image.new("RGBA", (tw, th), (255, 255, 255, 0))
                temp_d = ImageDraw.Draw(temp_txt)
                
                # Draw high-contrast outline for visibility
                outline_color = (0, 0, 0, int(opacity * 150))
                
                def draw_text_with_spacing(draw_obj, pos, txt, spacing, color):
                    curr_x, curr_y = pos
                    for char in txt:
                        draw_obj.text((curr_x, curr_y), char, font=font, fill=color, anchor="mm")
                        # Move next character by its width + spacing
                        char_w = font.getlength(char)
                        curr_x += char_w + spacing
                    # Adjust to re-center since we draw from left
                    return
                
                # Pillow doesn't have built-in letter spacing, so we'll simulate it
                # for simple tiling. For precise centering with spacing:
                total_w = sum(font.getlength(c) for c in text) + (len(text) - 1) * letter_spacing
                start_x = tw // 2 - total_w // 2 + (font.getlength(text[0]) // 2 if text else 0)
                
                # Draw outline
                for ox, oy in [(-1,-1), (1,-1), (-1,1), (1,1)]:
                    curr_x = start_x + ox
                    for char in text:
                        temp_d.text((curr_x, th // 2 + oy), char, font=font, fill=outline_color, anchor="mm")
                        curr_x += font.getlength(char) + letter_spacing
                
                # Draw main text
                curr_x = start_x
                for char in text:
                    temp_d.text((curr_x, th // 2), char, font=font, fill=fill_color, anchor="mm")
                    curr_x += font.getlength(char) + letter_spacing
                
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
    
    IMG_DIR = current_dir
    EXPORT_DIR = config["export_path"]
    
    # If the path is relative (e.g., 'export'), resolve it relative to the script directory
    if not os.path.isabs(EXPORT_DIR):
        EXPORT_DIR = os.path.join(current_dir, EXPORT_DIR)
    
    # Ensure export directory exists
    os.makedirs(EXPORT_DIR, exist_ok=True)

    print(f"Config loaded from UI:")
    print(f" - Text: {config['text']}")
    print(f" - Grid: {config['rows']}x{config['cols']}")
    print(f" - Stagger Layout: {'ON' if config['is_staggered'] else 'OFF'}")
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
                # Ensure output ends with .jpg since we save as JPEG
                base_name = os.path.splitext(img_name)[0]
                output_p = str(os.path.join(str(EXPORT_DIR), f"watermarked_{base_name}.jpg"))
                if add_watermark(input_p, output_p, 
                                 str(config["text"]), float(config["opacity"]), int(config["font_size"]), 
                                 int(config["rotation"]), int(config["rows"]), int(config["cols"]),
                                 str(config["font_family"]), int(config["letter_spacing"]),
                                 int(config["font_weight"]), bool(config["is_staggered"])):
                    success_count += 1
            
            print(f"\nFinished! {success_count}/{len(images)} images processed.")
            print(f"Results are in: {EXPORT_DIR}")

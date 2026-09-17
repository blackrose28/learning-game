import os
import math
from PIL import Image, ImageDraw, ImageFont

def draw_math_archer_icon(size: int, is_maskable: bool = False) -> Image.Image:
    # 512x512 canvas with high-res anti-aliasing via 2x supersampling
    scale = 2
    actual_size = size * scale
    img = Image.new("RGBA", (actual_size, actual_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = actual_size / 2.0
    
    # Maskable icons need 15-20% margin to prevent cut-off in circle/squircle masks
    if is_maskable:
        # Full background filling the entire canvas
        bg_radius = actual_size / 2.0
        draw.rectangle([0, 0, actual_size, actual_size], fill=(37, 99, 235, 255)) # #2563eb
        # Content radius is scaled down to ~72% of canvas
        content_radius = actual_size * 0.36
    else:
        # Standard icon with rounded background or circular shield
        # Rounded background
        radius_corner = int(actual_size * 0.22)
        draw.rounded_rectangle([actual_size * 0.04, actual_size * 0.04, actual_size * 0.96, actual_size * 0.96],
                               radius=radius_corner,
                               fill=(37, 99, 235, 255)) # #2563eb
        content_radius = actual_size * 0.38

    # Draw archery target in the center-right/center
    # Outer white circle
    r = content_radius
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=int(scale * 3))
    
    # Ring 1: Sky Blue (#38bdf8)
    r = content_radius * 0.78
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(56, 189, 248, 255))
    
    # Ring 2: Red (#ef4444)
    r = content_radius * 0.54
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(239, 68, 68, 255))
    
    # Ring 3: Gold Bullseye (#f59e0b)
    r = content_radius * 0.28
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(245, 158, 11, 255))

    # Inner bullseye dot (#b45309)
    r = content_radius * 0.12
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(180, 83, 9, 255))

    # Draw Archery Bow (Curved arc from bottom-left to top-left)
    bow_box = [center - content_radius * 1.1, center - content_radius * 0.9, center - content_radius * 0.1, center + content_radius * 0.9]
    draw.arc(bow_box, start=120, end=240, fill=(254, 240, 138, 255), width=int(scale * 7))

    # Bow string
    start_point = (center - content_radius * 0.6, center - content_radius * 0.8)
    end_point = (center - content_radius * 0.6, center + content_radius * 0.8)
    draw.line([start_point, end_point], fill=(255, 255, 255, 220), width=int(scale * 2))

    # Arrow crossing through center towards bullseye (diagonal or horizontal)
    arrow_y = center
    arrow_start = center - content_radius * 0.7
    arrow_end = center + content_radius * 0.15
    # Shaft
    draw.line([(arrow_start, arrow_y), (arrow_end, arrow_y)], fill=(255, 255, 255, 255), width=int(scale * 4))

    # Arrowhead (triangle at arrow_end)
    head_size = int(scale * 12)
    head_points = [
        (arrow_end + head_size, arrow_y),
        (arrow_end - head_size * 0.5, arrow_y - head_size * 0.7),
        (arrow_end - head_size * 0.2, arrow_y),
        (arrow_end - head_size * 0.5, arrow_y + head_size * 0.7),
    ]
    draw.polygon(head_points, fill=(245, 158, 11, 255))

    # Arrow fletching (feathers at arrow_start)
    fletch_len = int(scale * 8)
    draw.polygon([
        (arrow_start, arrow_y),
        (arrow_start - fletch_len, arrow_y - fletch_len * 0.8),
        (arrow_start - fletch_len * 1.4, arrow_y - fletch_len * 0.8),
        (arrow_start - fletch_len * 0.5, arrow_y),
    ], fill=(239, 68, 68, 255))
    draw.polygon([
        (arrow_start, arrow_y),
        (arrow_start - fletch_len, arrow_y + fletch_len * 0.8),
        (arrow_start - fletch_len * 1.4, arrow_y + fletch_len * 0.8),
        (arrow_start - fletch_len * 0.5, arrow_y),
    ], fill=(56, 189, 248, 255))

    # 4 Elemental Spark Orbs in corners
    elements = [
        ((center - content_radius * 0.65, center - content_radius * 0.65), (234, 88, 12)),  # Fire
        ((center + content_radius * 0.65, center - content_radius * 0.65), (2, 132, 199)),  # Ice
        ((center - content_radius * 0.65, center + content_radius * 0.65), (5, 150, 105)),  # Wind
        ((center + content_radius * 0.65, center + content_radius * 0.65), (217, 119, 6)),  # Earth
    ]
    orb_r = scale * 8
    for (ox, oy), (r_c, g_c, b_c) in elements:
        draw.ellipse([ox - orb_r, oy - orb_r, ox + orb_r, oy + orb_r], fill=(r_c, g_c, b_c, 240), outline=(255, 255, 255, 220), width=int(scale * 1.5))

    # Downsample with Lanczos for smooth anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    base_dir = "/home/chuonglv/Work/Math Archer/apps/web/public"
    icons_dir = os.path.join(base_dir, "icons")
    os.makedirs(icons_dir, exist_ok=True)

    # 1. Generate PNGs
    print("Generating 512x512 standard icon...")
    icon_512 = draw_math_archer_icon(512, is_maskable=False)
    icon_512.save(os.path.join(icons_dir, "icon-512.png"))

    print("Generating 512x512 maskable icon...")
    icon_maskable = draw_math_archer_icon(512, is_maskable=True)
    icon_maskable.save(os.path.join(icons_dir, "icon-maskable-512.png"))

    print("Generating 192x192 icon...")
    icon_192 = draw_math_archer_icon(192, is_maskable=False)
    icon_192.save(os.path.join(icons_dir, "icon-192.png"))

    print("Generating Apple touch icon (180x180)...")
    apple_icon = draw_math_archer_icon(180, is_maskable=False)
    apple_icon.save(os.path.join(base_dir, "apple-touch-icon.png"))

    print("Generating favicon (48x48 PNG)...")
    favicon = draw_math_archer_icon(48, is_maskable=False)
    favicon.save(os.path.join(base_dir, "favicon.png"))
    favicon.save(os.path.join(base_dir, "favicon.ico"))

    print("Icons generated successfully!")

if __name__ == "__main__":
    main()


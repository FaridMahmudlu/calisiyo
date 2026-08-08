import os
from PIL import Image, ImageDraw, ImageFont

# Font path
font_path = "PlusJakartaSans.ttf"

# Brand Colors
EMERALD = "#07875f"
EMERALD_BRIGHT = "#00a870"
DARK_BG = "#10251f"
LIGHT_BG = "#fffdfa"
WHITE = "#ffffff"
BLACK = "#000000"

def create_svg_wordmark(filename, text_color, bg_color=None):
    width, height = 280, 70
    bg_rect = f'<rect width="{width}" height="{height}" fill="{bg_color}"/>' if bg_color else ''
    
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&amp;display=swap');
    .wordmark {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 800;
      font-size: 44px;
      fill: {text_color};
      letter-spacing: -0.04em;
    }}
  </style>
  {bg_rect}
  <text x="10" y="50" class="wordmark">calisiyo</text>
</svg>
'''
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created {filename}")

def create_svg_monogram(filename, text_color, bg_color=None):
    width, height = 64, 64
    bg_rect = f'<rect width="{width}" height="{height}" rx="16" fill="{bg_color}"/>' if bg_color else ''
    
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&amp;display=swap');
    .monogram {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 800;
      font-size: 48px;
      fill: {text_color};
    }}
  </style>
  {bg_rect}
  <text x="14" y="48" class="monogram">c</text>
</svg>
'''
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created {filename}")

# Generate SVGs
os.makedirs("public/brand", exist_ok=True)
create_svg_wordmark("public/brand/calisiyo-logo.svg", EMERALD)
create_svg_wordmark("public/brand/calisiyo-logo-white.svg", WHITE)
create_svg_wordmark("public/brand/calisiyo-logo-black.svg", BLACK)
create_svg_monogram("public/brand/calisiyo-monogram.svg", EMERALD)

# Generate PNG Favicons using PIL
font_monogram = ImageFont.truetype(font_path, 42)
font_wordmark_large = ImageFont.truetype(font_path, 72)
font_subtitle = ImageFont.truetype(font_path, 28)

def make_favicon_png(size, filename):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale font size
    fsize = int(size * 0.75)
    font = ImageFont.truetype(font_path, fsize)
    
    bbox = draw.textbbox((0, 0), "c", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - (size * 0.05)
    
    draw.text((x, y), "c", font=font, fill=EMERALD)
    img.save(filename)
    print(f"Created {filename}")

make_favicon_png(16, "public/brand/favicon-16x16.png")
make_favicon_png(32, "public/brand/favicon-32x32.png")
make_favicon_png(48, "public/brand/favicon-48x48.png")

# Apple Touch Icon (180x180 PNG with solid Emerald background)
apple_img = Image.new('RGBA', (180, 180), EMERALD)
draw_apple = ImageDraw.Draw(apple_img)
font_apple = ImageFont.truetype(font_path, 130)
bbox = draw_apple.textbbox((0, 0), "c", font=font_apple)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
x = (180 - tw) / 2 - bbox[0]
y = (180 - th) / 2 - bbox[1] - 10
draw_apple.text((x, y), "c", font=font_apple, fill=WHITE)
apple_img.save("public/brand/apple-touch-icon.png")
print("Created public/brand/apple-touch-icon.png")

# Save ICO file
apple_img.resize((32, 32)).save("public/favicon.ico", format="ICO")
print("Created public/favicon.ico")

# Generate Open Graph Social Share Image (1200x630)
og_img = Image.new('RGBA', (1200, 630), DARK_BG)
draw_og = ImageDraw.Draw(og_img)

# Accent Bar
draw_og.rectangle([0, 0, 1200, 12], fill=EMERALD_BRIGHT)

# Wordmark Text
draw_og.text((120, 220), "calisiyo", font=font_wordmark_large, fill=WHITE)

# Tagline Text
draw_og.text((120, 320), "YKS Çalışma Koçu — Planla, Odaklan, İlerle", font=font_subtitle, fill="#a7f3d0")
draw_og.text((120, 380), "TYT, AYT ve YDT hazırlık sürecini verilerinle yönet.", font=font_subtitle, fill="#94a3b8")

# Brand Dot Badge
draw_og.ellipse([1040, 220, 1080, 260], fill=EMERALD_BRIGHT)

og_img.save("public/brand/og-image.png")
print("Created public/brand/og-image.png")

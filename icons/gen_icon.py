from PIL import Image, ImageDraw

SCALE = 4
SIZE = 512 * SCALE

def make_icon():
    img = Image.new("RGBA", (SIZE, SIZE), (13, 21, 38, 255))  # navy #0d1526
    d = ImageDraw.Draw(img)
    cx = cy = SIZE / 2

    def ring(radius, width, color, opacity=255):
        r = radius * SCALE
        w = width * SCALE
        col = color + (opacity,)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=int(w))

    # outer ring (gold)
    ring(150, 26, (201, 162, 75))
    # inner ring (gold, semi-transparent)
    ring(96, 20, (201, 162, 75), opacity=140)

    # checkmark (gold-bright), built from two thick round-capped line segments
    gold_bright = (232, 200, 116, 255)
    stroke_w = int(30 * SCALE)

    def thick_line(p1, p2):
        x1, y1 = cx + p1[0] * SCALE, cy + p1[1] * SCALE
        x2, y2 = cx + p2[0] * SCALE, cy + p2[1] * SCALE
        d.line([x1, y1, x2, y2], fill=gold_bright, width=stroke_w)
        r = stroke_w / 2
        d.ellipse([x1 - r, y1 - r, x1 + r, y1 + r], fill=gold_bright)
        d.ellipse([x2 - r, y2 - r, x2 + r, y2 + r], fill=gold_bright)

    thick_line((-68, 6), (-14, 64))
    thick_line((-14, 64), (96, -66))

    img = img.resize((512, 512), Image.LANCZOS)
    return img

icon = make_icon()
icon.save("icon-512.png")
icon.resize((192, 192), Image.LANCZOS).save("icon-192.png")
icon.resize((180, 180), Image.LANCZOS).save("apple-touch-icon.png")
icon.resize((32, 32), Image.LANCZOS).save("favicon-32.png")
print("done")

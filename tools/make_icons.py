"""Care Me: draws the launcher icons and splash screens.
Diet + fitness mark: a white plate with a leaf (healthy food) and a dumbbell (fitness),
ringed by a progress arc, on turmeric."""
import glob, math
from PIL import Image, ImageDraw
TUR = (244, 178, 35); CHILI = (200, 52, 31); INK = (29, 26, 22); LEAF = (30, 142, 62); LEAF_D = (18, 98, 42)

def mark(size, scale=1.0, bg=None):
    S = size * 4; im = Image.new('RGBA', (S, S), bg or (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = S / 2; R = S * 0.36 * scale
    # progress ring (fitness / goal) — chilli arc around the plate
    rr = R * 1.18; w = max(2, int(R * 0.10))
    d.arc([c - rr, c - rr, c + rr, c + rr], start=-90, end=200, fill=CHILI, width=w)
    d.arc([c - rr, c - rr, c + rr, c + rr], start=200, end=270, fill=(255, 255, 255, 150), width=w)
    # plate
    d.ellipse([c - R + S * .015, c - R + S * .03, c + R + S * .015, c + R + S * .03], fill=(0, 0, 0, 40))
    d.ellipse([c - R, c - R, c + R, c + R], fill=(255, 255, 255), outline=(225, 214, 190), width=max(1, int(S * .01)))
    # leaf (upper half)
    lw, lh = R * 0.95, R * 0.55; lx, ly = c, c - R * 0.30
    leaf = Image.new('RGBA', (int(lw * 2), int(lh * 2)), (0, 0, 0, 0)); ld = ImageDraw.Draw(leaf)
    ld.ellipse([lw * 0.25, lh * 0.55, lw * 1.75, lh * 1.45], fill=LEAF)
    ld.line([(lw * 0.3, lh), (lw * 1.6, lh)], fill=LEAF_D, width=max(1, int(R * 0.05)))
    leaf = leaf.rotate(28, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(leaf, (int(lx - leaf.width / 2), int(ly - leaf.height / 2)))
    # dumbbell (lower half)
    by = c + R * 0.38; bar = R * 0.62; t = R * 0.09
    d.rounded_rectangle([c - bar, by - t, c + bar, by + t], radius=t, fill=INK)
    for sx in (-1, 1):
        x0 = c + sx * bar
        pw, ph = R * 0.15, R * 0.46
        d.rounded_rectangle([x0 - pw / 2 - sx * R * 0.02, by - ph / 2, x0 + pw / 2 - sx * R * 0.02, by + ph / 2], radius=pw * 0.35, fill=CHILI)
        pw2, ph2 = R * 0.12, R * 0.32
        x1 = x0 + sx * R * 0.14
        d.rounded_rectangle([x1 - pw2 / 2, by - ph2 / 2, x1 + pw2 / 2, by + ph2 / 2], radius=pw2 * 0.35, fill=CHILI)
    return im.resize((size, size), Image.LANCZOS)

res = 'android/app/src/main/res/'
for dpi, f in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
    s = int(48 * f); bg = Image.new('RGBA', (s, s), TUR)
    mask = Image.new('L', (s * 4, s * 4), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, s * 4, s * 4], radius=s * .9, fill=255); mask = mask.resize((s, s), Image.LANCZOS)
    legacy = Image.new('RGBA', (s, s), (0, 0, 0, 0)); legacy.paste(bg, (0, 0), mask); legacy.alpha_composite(mark(s, .74)); legacy.save(res + f'mipmap-{dpi}/ic_launcher.png')
    rm = Image.new('L', (s * 4, s * 4), 0); ImageDraw.Draw(rm).ellipse([0, 0, s * 4, s * 4], fill=255); rm = rm.resize((s, s), Image.LANCZOS)
    rnd = Image.new('RGBA', (s, s), (0, 0, 0, 0)); rnd.paste(bg, (0, 0), rm); rnd.alpha_composite(mark(s, .68)); rnd.save(res + f'mipmap-{dpi}/ic_launcher_round.png')
    fs = int(108 * f); mark(fs, .52).save(res + f'mipmap-{dpi}/ic_launcher_foreground.png')
open(res + 'values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F4B223</color>\n</resources>\n')
for p in glob.glob(res + 'drawable*/splash.png'):
    w, h = Image.open(p).size; sp = Image.new('RGBA', (w, h), TUR + (255,)); s = int(min(w, h) * .45)
    sp.alpha_composite(mark(s, .9), ((w - s) // 2, (h - s) // 2)); sp.convert('RGB').save(p)
print('icons done')

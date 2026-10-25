import colorsys, subprocess, sys
OUT = sys.argv[1]
F = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FB = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
PAPER = (0xF3, 0xEB, 0xD9)  # papier crème de l'affiche

# (nom FR, nom EN numérique, nom EN imprimerie, hex numérique, rôle, poids, (×sat, Δlum, Δteinte))
COLORS = [
 ("Encre", "navy ink", "soft ink black", "#1B2232", "base — contours, ombres", 22, (0.6, 0.05, 0)),
 ("Polonais pâle", "cream parchment", "warm cream paper", "#F1EDE4", "base — fond, papier", 28, None),
 ("Vert chandelle", "emerald green", "muted bottle green", "#1F9346", "base — couleur principale", 17, (0.75, 0.0, 3)),
 ("Or phynance", "marigold yellow", "mustard yellow", "#F3C025", "base — gidouilles, lumière", 14, (0.85, 0.0, -2)),
 ("Pourpre royal", "deep crimson", "faded crimson", "#8F2447", "accent — solennel", 7, (0.8, 0.03, 3)),
 ("Brun merdre", "dark chocolate brown", "sepia brown", "#593B26", "accent — gags, échecs", 6, (0.85, 0.04, 2)),
 ("Glace du Czar", "ice blue", "dusty ice blue", "#66AACC", "accent — le Czar, examens", 6, (0.7, 0.0, 0)),
]

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def hexa(c): return "#%02X%02X%02X" % c

def imprimerie(h, t):
    if t is None: return hexa(PAPER)
    r, g, b = (x / 255 for x in rgb(h))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    ks, dl, dh = t
    hh = (hh + dh / 360) % 1; s *= ks; l = min(1, max(0, l + dl))
    c = colorsys.hls_to_rgb(hh, l, s)
    # encre posée sur papier crème : mélange multiplicatif
    k = 0.5  # transparence de l'encre : moitié couleur pure, moitié posée sur le papier
    return hexa(tuple(round(255 * c[i] * (1 - k) + c[i] * PAPER[i] * k) for i in range(3)))

PRINT = [imprimerie(c[3], c[6]) for c in COLORS]

def magick(args, name):
    subprocess.run(["magick", *args, f"{OUT}/{name}"], check=True)

def reference(hexes, name):
    a, x = ["-size", "1024x1024", "xc:none"], 0
    for i, c in enumerate(COLORS):
        w = round(1024 * c[5] / 100) if i < len(COLORS) - 1 else 1024 - x
        a += ["-fill", hexes[i], "-draw", f"rectangle {x},0 {x + w - 1},1023"]; x += w
    magick(a, name)

def legende(hexes, en_idx, titre, sous_titre, fond, name):
    a = ["-size", "1400x960", f"xc:{fond}", "-fill", "#1B2232", "-font", FB, "-pointsize", "38",
         "-annotate", "+60+80", titre, "-font", F, "-pointsize", "22", "-fill", "#555",
         "-annotate", "+60+118", sous_titre]
    for i, c in enumerate(COLORS):
        y = 160 + 110 * i
        a += ["-fill", hexes[i], "-stroke", "#00000022", "-draw", f"rectangle 60,{y} 260,{y + 90}", "-stroke", "none",
              "-fill", "#1B2232", "-font", FB, "-pointsize", "26", "-annotate", f"+290+{y + 38}", c[0],
              "-font", F, "-pointsize", "22", "-fill", "#333", "-annotate", f"+290+{y + 74}", f"{c[en_idx]}  ·  {hexes[i]}",
              "-fill", "#666", "-annotate", f"+820+{y + 56}", c[4]]
    magick(a, name)

def comparaison(name):
    a = ["-size", "1400x1060", "xc:#FAF8F3", "-fill", "#1B2232", "-font", FB, "-pointsize", "38",
         "-annotate", "+60+80", "Numérique ou encre d’imprimerie ?", "-font", F, "-pointsize", "22", "-fill", "#555",
         "-annotate", "+60+118", "À gauche : le site (Compendium § XI). À droite : la même couleur imprimée sur papier crème.",
         "-fill", "#1B2232", "-font", FB, "-pointsize", "22",
         "-annotate", "+420+185", "Numérique", "-annotate", "+780+185", "Encre d’imprimerie"]
    for i, c in enumerate(COLORS):
        y = 210 + 115 * i
        a += ["-fill", "#1B2232", "-font", FB, "-pointsize", "26", "-annotate", f"+60+{y + 52}", c[0],
              "-fill", c[3], "-stroke", "#00000022", "-draw", f"rectangle 420,{y} 720,{y + 95}",
              "-fill", PRINT[i], "-draw", f"rectangle 780,{y} 1080,{y + 95}", "-stroke", "none",
              "-font", F, "-pointsize", "20", "-fill", "#444",
              "-annotate", f"+1110+{y + 40}", f"{c[2]}", "-fill", "#777", "-annotate", f"+1110+{y + 70}", PRINT[i]]
    magick(a, name)

comparaison("planche-comparaison.png")
legende([c[3] for c in COLORS], 1, "Nuancier du Royaume — numérique", "Les couleurs du site (Compendium § XI)", "#FAF8F3", "nuancier-numerique-legende.png")
legende(PRINT, 2, "Nuancier du Royaume — encre d’imprimerie", "Les mêmes couleurs, imprimées sur papier crème", "#F6F0E2", "nuancier-imprimerie-legende.png")
reference([c[3] for c in COLORS], "nuancier-numerique-reference.png")
reference(PRINT, "nuancier-imprimerie-reference.png")
for c, p in zip(COLORS, PRINT): print(f"{c[0]:15} {c[3]} -> {p}")

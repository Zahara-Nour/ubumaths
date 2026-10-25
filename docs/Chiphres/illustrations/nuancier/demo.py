import math, sys
OUT = sys.argv[1]
PAL = {
 "Numérique": dict(ink="#1B2232", paper="#F1EDE4", green="#1F9346", gold="#F3C025", crimson="#8F2447", brown="#593B26", ice="#66AACC"),
 "Encre d’imprimerie": dict(ink="#292E38", paper="#F3EBD9", green="#2C7F49", gold="#DEAB31", crimson="#8C3147", brown="#61442D", ice="#739EAF"),
}

def mix(a, b, t):  # teinte : t de la couleur a, le reste de b (trame d'imprimeur)
    ca = [int(a[i:i+2], 16) for i in (1, 3, 5)]; cb = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return "#%02X%02X%02X" % tuple(round(ca[i] * t + cb[i] * (1 - t)) for i in range(3))

def spiral(cx, cy, turns, r):
    pts = []
    for i in range(0, int(turns * 60) + 1):
        a = i / 60 * 2 * math.pi; rr = r * i / (turns * 60)
        pts.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    return "M" + " L".join(pts)

def sine_roof(x, y, w, amp, n):
    pts = [f"{x + w * i / 40:.1f},{y - amp * math.sin(n * math.pi * i / 40):.1f}" for i in range(41)]
    return "L".join(pts)

def poster(p, ox, oy):
    k, s = p["ink"], 'stroke="%s" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"' % p["ink"]
    g = [f'<g transform="translate({ox},{oy})">',
         f'<rect x="0" y="0" width="520" height="720" fill="{p["paper"]}" {s}/>',
         # soleil
         f'<circle cx="400" cy="120" r="70" fill="{p["gold"]}" {s}/>',
         # rayon du phare, oscillant
         f'<path d="M150,170 L520,60 L520,200 Z" fill="{mix(p["gold"], p["paper"], 0.45)}"/>',
         # mer
         f'<path d="M0,430 {"".join(f"L{x},{430 + 10 * math.sin(x / 26):.1f}" for x in range(0, 521, 10))} L520,720 L0,720 Z" fill="{p["ice"]}" {s}/>',
         f'<path d="M0,470 {"".join(f"L{x},{470 + 8 * math.sin(x / 20 + 1):.1f}" for x in range(0, 521, 10))}" fill="none" stroke="{p["paper"]}" stroke-width="3"/>']
    # maisons de Sinusborg, toits en sinusoïde
    for i, (x, w, h, col) in enumerate([(200, 70, 120, "green"), (275, 60, 150, "crimson"), (340, 80, 110, "green"), (425, 70, 140, "brown")]):
        top = 430 - h
        g.append(f'<path d="M{x},430 L{x},{top} L{sine_roof(x, top, w, 18, 2 if i % 2 else 1)} L{x + w},430 Z" fill="{p["paper"]}" {s}/>')
        g.append(f'<path d="M{x},{top} L{sine_roof(x, top, w, 18, 2 if i % 2 else 1)} L{x + w},{top + 22} L{x},{top + 22} Z" fill="{p[col]}" {s}/>')
        for wy in range(top + 45, 410, 38):
            g.append(f'<rect x="{x + w / 2 - 9}" y="{wy}" width="18" height="22" fill="{p["gold"]}" {s}/>')
    # phare
    g.append(f'<path d="M130,430 L145,180 L175,180 L190,430 Z" fill="{p["paper"]}" {s}/>')
    for yb in (220, 300, 380):
        g.append(f'<path d="M{145 - (yb - 180) * 0.06:.1f},{yb} L{175 + (yb - 180) * 0.06:.1f},{yb} L{176 + (yb - 140) * 0.06:.1f},{yb + 30} L{144 - (yb - 140) * 0.06:.1f},{yb + 30} Z" fill="{p["crimson"]}" {s}/>')
    g.append(f'<rect x="140" y="150" width="40" height="30" fill="{p["gold"]}" {s}/><path d="M135,150 L160,120 L185,150 Z" fill="{p["ink"]}" {s}/>')
    # bateau
    g.append(f'<path d="M330,520 L450,520 L430,555 L350,555 Z" fill="{p["brown"]}" {s}/><path d="M390,520 L390,450 L430,515 Z" fill="{p["paper"]}" {s}/>')
    # Père Ubu au premier plan
    g += [f'<path d="M60,700 C-10,620 20,470 110,450 C200,470 230,620 160,700 Z" fill="{p["green"]}" {s}/>',
          f'<path d="{spiral(110, 590, 3, 55)}" fill="none" stroke="{p["gold"]}" stroke-width="7"/>',
          f'<path d="M80,455 C55,410 70,350 110,345 C150,350 165,410 140,455 Z" fill="{p["paper"]}" {s}/>',
          f'<path d="M78,360 L110,250 L142,360 Z" fill="{p["crimson"]}" {s}/>',
          f'<circle cx="96" cy="395" r="5" fill="{k}"/><circle cx="124" cy="395" r="5" fill="{k}"/>',
          f'<path d="M92,418 C102,430 118,430 128,418" fill="none" {s}/>',
          f'<path d="M185,560 L250,380" stroke="{k}" stroke-width="7" stroke-linecap="round"/><circle cx="252" cy="374" r="14" fill="{p["gold"]}" {s}/>']
    # bandeau titre
    g += [f'<rect x="0" y="650" width="520" height="70" fill="{k}"/>',
          f'<text x="290" y="697" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="34" letter-spacing="6" fill="{p["paper"]}">SINUSBORG</text>', '</g>']
    return "\n".join(g)

def mini_map(p, ox, oy):
    s = 'stroke="%s" stroke-width="3" stroke-linejoin="round"' % p["ink"]
    tint = lambda c: mix(p[c], p["paper"], 0.45)
    zones = [("M60,70 L250,40 L260,190 L150,230 L50,190 Z", tint("ice")),
             ("M250,40 L460,60 L470,170 L260,190 Z", p["gold"]),
             ("M50,190 L150,230 L180,370 L40,360 Z", p["green"]),
             ("M150,230 L260,190 L300,330 L180,370 Z", tint("crimson")),
             ("M260,190 L470,170 L480,340 L300,330 Z", tint("brown")),
             ("M180,370 L300,330 L480,340 L470,390 L60,395 L40,360 Z", tint("green"))]
    g = [f'<g transform="translate({ox},{oy})">', f'<rect x="0" y="0" width="520" height="420" fill="{p["ice"]}" {s}/>']
    g += [f'<path d="{d}" fill="{c}" {s}/>' for d, c in zones]
    g.append(f'<path d="M470,300 C400,280 340,320 290,270 C240,220 200,250 160,180 C130,120 110,90 90,60" fill="none" stroke="{p["ice"]}" stroke-width="9"/>')
    g.append(f'<path d="M470,300 C400,280 340,320 290,270 C240,220 200,250 160,180 C130,120 110,90 90,60" fill="none" stroke="{p["ink"]}" stroke-width="2" stroke-dasharray="0"/>')
    for cx, cy in [(130, 140), (360, 110), (110, 300), (230, 280), (390, 260), (300, 365)]:
        g.append(f'<circle cx="{cx}" cy="{cy}" r="9" fill="{p["crimson"]}" {s}/>')
    g.append(f'<path d="{spiral(262, 205, 2.5, 22)}" fill="none" stroke="{p["ink"]}" stroke-width="4"/>')
    g.append(f'<rect x="330" y="12" width="178" height="40" fill="{p["paper"]}" {s}/><text x="419" y="40" text-anchor="middle" font-family="Georgia" font-style="italic" font-size="20" fill="{p["ink"]}">Extrait fictif</text></g>')
    return "\n".join(g)

W, H = 1220, 1380
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="#FAF8F3"/>']
for i, (name, p) in enumerate(PAL.items()):
    x = 60 + i * 580
    svg.append(f'<text x="{x}" y="60" font-family="Georgia" font-weight="bold" font-size="32" fill="#1B2232">{name}</text>')
    svg.append(poster(p, x, 90)); svg.append(mini_map(p, x, 900))
svg.append("</svg>")
open(f"{OUT}/demo-palettes.svg", "w").write("\n".join(svg))

"""Génère les 4 modèles du lot B de questions-1spe-analyse (B1-B4)."""

import json
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

COL = "\\textcolor{{{color:primary.0}}}"


def col(x: str) -> str:
    return COL + "{" + x + "}"


def spec(desc, vi, variables, answers, ok=True):
    return {
        "description": desc,
        "variationIndex": vi,
        "variables": variables,
        "answers": answers,
        "expected": {"status": "correct" if ok else "incorrect"},
    }


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")


def base(title, description, grades, domain, subdomain, level, delay):
    return {
        "title": title,
        "description": description,
        "grades": grades,
        "theme": "Fonctions",
        "domain": domain,
        "subdomain": subdomain,
        "level": level,
        "delay": delay,
        "status": "draft",
        "shared": {"blankDefaults": {"acceptDecimal": True}},
    }


INTERVALLE_PRINCIPAL = "$\\left]-\\pi\\,;\\pi\\right]$"

# ---------------------------------------------------------------------------
# B1 — 303 : le cercle trigonométrique
# ---------------------------------------------------------------------------

QUARTS = "0|\\frac{\\pi}{2}|\\pi|-\\frac{\\pi}{2}|2\\pi|-\\pi|\\frac{3\\pi}{2}|\\frac{5\\pi}{2}|-\\frac{3\\pi}{2}|3\\pi"
LETTRE = "{{if:k==0|A|{{if:k==1|B|{{if:k==2|C|D}}}}}}"
POINTS_ABCD = "points: A = {{o}}*pi/2, B = {{eval:o+1}}*pi/2, C = {{eval:o+2}}*pi/2, D = {{eval:o+3}}*pi/2"

b1 = base(
    "Le cercle trigonométrique",
    "Rayon et longueur du cercle trigonométrique, sens direct (ou indirect), point du cercle associé à un multiple de π/2",
    ["1_SPE"],
    "Fonctions trigonométriques",
    "Cercle et radians",
    4,
    45,
)
b1["variations"] = [
    {
        "statement": "Le cercle trigonométrique a pour rayon $?$ et pour longueur $?$.",
        "variables": [],
        "blanks": [{"expectedAnswer": "1"}, {"expectedAnswer": "2\\pi"}],
        "correction": {
            "steps": [
                "Le cercle trigonométrique est le cercle de **centre $O$ et de rayon $1$**, orienté.",
                "Sa longueur est $2\\pi\\times 1$ : le rayon vaut $" + col("1") + "$ et la longueur $" + col("2\\pi") + "$.",
            ]
        },
    },
    {
        "statement": "Sur le cercle trigonométrique, le sens {{if:w==0|direct|indirect}} (ou sens {{if:w==0|positif|négatif}}) est :\n\n```choix\n- le sens inverse des aiguilles d'une montre\n- le sens des aiguilles d'une montre\n- l'un ou l'autre, au choix\n```",
        "variables": [{"name": "w", "expression": "0|1"}],
        "blanks": [{"expectedAnswer": "{{w}}"}],
        "correction": {
            "steps": [
                "Le cercle trigonométrique est **orienté** : le sens direct (positif) est fixé une fois pour toutes, c'est le sens inverse des aiguilles d'une montre ; le sens indirect est le sens des aiguilles d'une montre.",
                "Le sens {{if:w==0|direct|indirect}} est le $" + col("\\text{sens {{if:w==0|inverse des|des}} aiguilles d'une montre}") + "$.",
            ]
        },
    },
    {
        "statement": "Quel point du cercle trigonométrique est associé au réel ${{r}}$ ?\n\n```trig\npreset: custom\nlabels: false\n" + POINTS_ABCD + "\n```\n\n```choix\nmelanger: non\n- $A$\n- $B$\n- $C$\n- $D$\n```",
        "variables": [
            {"name": "r", "expression": QUARTS},
            {"name": "p", "expression": "eval:2*r/\\pi"},
            {"name": "o", "expression": "0..3"},
            {"name": "k", "expression": "eval:mod(p-o+8,4)"},
        ],
        "blanks": [{"expectedAnswer": "{{k}}"}],
        "correction": {
            "steps": [
                "Le réel $0$ est associé au point $I(1\\,;0)$. On enroule la droite des réels sur le cercle : un quart de tour mesure $\\dfrac{\\pi}{2}$, dans le sens direct pour un réel positif, dans le sens indirect pour un réel négatif ; un tour complet ($2\\pi$) ramène au même point.",
                "{{if:p==0|Le réel $0$ est associé au point de départ $I$.|${{r}}={{p}}\\times\\dfrac{\\pi}{2}$ : on fait ${{eval:abs(p)}}$ quart{{if:p*p>1|s|}} de tour dans le sens {{if:p<0|indirect|direct}} en partant de $I$.}}",
                "```trig\npreset: custom\nlabels: false\n" + POINTS_ABCD + "\n```",
                "Le réel ${{r}}$ est associé au point $" + col(LETTRE) + "$.",
            ]
        },
    },
]
b1["testSpecs"] = [
    spec("Rayon 1, longueur 2π", 0, {}, ["1", "2\\pi"]),
    spec("Erreur : longueur π (demi-cercle)", 0, {}, ["1", "\\pi"], ok=False),
    spec("Sens direct : inverse des aiguilles", 1, {"w": "0"}, ["0"]),
    spec("Erreur : sens direct = des aiguilles", 1, {"w": "0"}, ["1"], ok=False),
    spec("Sens indirect : des aiguilles", 1, {"w": "1"}, ["1"]),
    spec("π/2 avec A en 0 : B", 2, {"r": "\\frac{\\pi}{2}", "o": "0"}, ["1"]),
    spec("−π/2 avec A en 0 : D", 2, {"r": "-\\frac{\\pi}{2}", "o": "0"}, ["3"]),
    spec("Erreur : −π/2 lu dans le sens direct (B)", 2, {"r": "-\\frac{\\pi}{2}", "o": "0"}, ["1"], ok=False),
    spec("5π/2 avec A en π/2 : A", 2, {"r": "\\frac{5\\pi}{2}", "o": "1"}, ["0"]),
    spec("3π avec A en 0 : C", 2, {"r": "3\\pi", "o": "0"}, ["2"]),
]
write("01-le-cercle-trigonometrique.json", b1)

# ---------------------------------------------------------------------------
# B2 — 408 : longueur d'arc
# ---------------------------------------------------------------------------

DANS_0_2PI = (
    "\\frac{\\pi}{6}|\\frac{\\pi}{4}|\\frac{\\pi}{3}|\\frac{2\\pi}{3}|\\frac{3\\pi}{4}|\\frac{5\\pi}{6}"
    "|\\frac{7\\pi}{6}|\\frac{5\\pi}{4}|\\frac{4\\pi}{3}|\\frac{5\\pi}{3}|\\frac{7\\pi}{4}|\\frac{11\\pi}{6}"
)
DANS_0_PI = "\\frac{\\pi}{6}|\\frac{\\pi}{4}|\\frac{\\pi}{3}|\\frac{\\pi}{2}|\\frac{2\\pi}{3}|\\frac{3\\pi}{4}|\\frac{5\\pi}{6}"

b2 = base(
    "Longueur d'un arc du cercle trigonométrique",
    "Sur le cercle de rayon 1, la longueur d'un arc est la différence des réels associés : arc IM, arc AB, réel associé à un arc parcouru dans un sens, fractions de tour",
    ["1_SPE"],
    "Fonctions trigonométriques",
    "Cercle et radians",
    5,
    60,
)
b2["variations"] = [
    {
        "statement": "Le point $M$ du cercle trigonométrique est associé au réel ${{r}}$.\n\n```trig\npreset: quarters\npoints: M = {{p}}*pi/12\n```\n\nQuelle est la longueur de l'arc parcouru de $I$ à $M$ dans le sens direct ?\n\n$?$",
        "variables": [
            {"name": "r", "expression": DANS_0_2PI},
            {"name": "p", "expression": "eval:12*r/\\pi"},
        ],
        "blanks": [{"expectedAnswer": "{{r}}"}],
        "correction": {
            "steps": [
                "Le cercle trigonométrique a pour rayon $1$ : un arc intercepté par un angle de $\\theta$ radians mesure $\\theta\\times1=\\theta$. Le réel associé à un point est **la longueur de l'arc parcouru depuis $I$** (dans le sens direct pour un réel positif).",
                "```trig\npreset: custom\nmode: arc\nangles: {{p}}*pi/12\n```",
                "${{r}}\\in\\left]0\\,;2\\pi\\right[$ : l'arc de $I$ à $M$ dans le sens direct mesure $" + col("{{r}}") + "$.",
            ]
        },
    },
    {
        "statement": "Les points $A$ et $B$ du cercle trigonométrique sont associés aux réels ${{a}}$ et ${{b}}$.\n\nQuelle est la longueur de l'arc parcouru de $A$ à $B$ dans le sens direct ?\n\n$?$",
        "variables": [
            {"name": "a", "expression": "0|" + DANS_0_PI},
            {"name": "b", "expression": DANS_0_2PI},
            {"name": "d", "expression": "eval:b-a"},
        ],
        "conditions": ["b > a"],
        "blanks": [{"expectedAnswer": "{{d}}"}],
        "correction": {
            "steps": [
                "Sur le cercle de rayon $1$, la longueur d'un arc est égale à la différence des réels associés à ses extrémités (pris dans le bon ordre).",
                "${{b}}-{{if:a==0|0|\\left({{a}}\\right)}}=" + col("{{d}}") + "$",
            ]
        },
    },
    {
        "statement": "Un point $M$ part de $I$ et parcourt le cercle trigonométrique dans le sens {{if:w==0|direct|indirect}}, sur un arc de longueur ${{l}}$.\n\nQuel est le réel de " + INTERVALLE_PRINCIPAL + " associé au point d'arrivée ?\n\n$?$",
        "variables": [
            {"name": "w", "expression": "0|1"},
            {"name": "l", "expression": DANS_0_PI},
        ],
        "blanks": [{"expectedAnswer": "{{if:w==0|{{l}}|-{{l}}}}"}],
        "correction": {
            "steps": [
                "Sur le cercle de rayon $1$, parcourir depuis $I$ un arc de longueur $\\ell$ mène au point associé à $\\ell$ dans le sens direct, et à $-\\ell$ dans le sens indirect.",
                "Ici, le sens est {{if:w==0|direct|indirect}} : le réel associé est $" + col("{{if:w==0|{{l}}|-{{l}}}}") + "$, qui appartient bien à " + INTERVALLE_PRINCIPAL + ".",
            ]
        },
    },
    {
        "statement": "Quelle est la longueur {{if:q==1|d'un quart de tour|{{if:q==2|d'un demi-tour|{{if:q==3|de trois quarts de tour|d'un tour complet}}}}}} du cercle trigonométrique ?\n\n$?$",
        "variables": [{"name": "q", "expression": "1|2|3|4"}],
        "blanks": [{"expectedAnswer": "{{eval:q*\\pi/2}}"}],
        "correction": {
            "steps": [
                "Le cercle trigonométrique a pour rayon $1$ : un tour complet mesure $2\\pi$, un quart de tour $\\dfrac{2\\pi}{4}=\\dfrac{\\pi}{2}$.",
                "${{q}}\\times\\dfrac{\\pi}{2}=" + col("{{eval:q*\\pi/2}}") + "$",
            ]
        },
    },
]
b2["testSpecs"] = [
    spec("M en 2π/3 : 2π/3", 0, {"r": "\\frac{2\\pi}{3}"}, ["\\frac{2\\pi}{3}"]),
    spec("M en 5π/3 : 5π/3", 0, {"r": "\\frac{5\\pi}{3}"}, ["\\frac{5\\pi}{3}"]),
    spec("Erreur : mesure principale −π/3", 0, {"r": "\\frac{5\\pi}{3}"}, ["-\\frac{\\pi}{3}"], ok=False),
    spec("Arc de π/6 à 3π/4 : 7π/12", 1, {"a": "\\frac{\\pi}{6}", "b": "\\frac{3\\pi}{4}"}, ["\\frac{7\\pi}{12}"]),
    spec("Erreur : somme", 1, {"a": "\\frac{\\pi}{6}", "b": "\\frac{3\\pi}{4}"}, ["\\frac{11\\pi}{12}"], ok=False),
    spec("Arc de 0 à 4π/3", 1, {"a": "0", "b": "\\frac{4\\pi}{3}"}, ["\\frac{4\\pi}{3}"]),
    spec("Sens indirect, π/3 : −π/3", 2, {"w": "1", "l": "\\frac{\\pi}{3}"}, ["-\\frac{\\pi}{3}"]),
    spec("Erreur : sens oublié", 2, {"w": "1", "l": "\\frac{\\pi}{3}"}, ["\\frac{\\pi}{3}"], ok=False),
    spec("Sens direct, 3π/4", 2, {"w": "0", "l": "\\frac{3\\pi}{4}"}, ["\\frac{3\\pi}{4}"]),
    spec("Demi-tour : π", 3, {"q": "2"}, ["\\pi"]),
    spec("Erreur : demi-tour 180", 3, {"q": "2"}, ["180"], ok=False),
    spec("Trois quarts : 3π/2", 3, {"q": "3"}, ["\\frac{3\\pi}{2}"]),
]
write("02-longueur-d-un-arc.json", b2)

# ---------------------------------------------------------------------------
# B3 — 306 : placer un point sur le cercle
# ---------------------------------------------------------------------------

PRINCIPAUX = (
    "\\frac{\\pi}{6}|\\frac{\\pi}{3}|\\frac{2\\pi}{3}|\\frac{5\\pi}{6}|-\\frac{\\pi}{6}|-\\frac{\\pi}{3}"
    "|-\\frac{2\\pi}{3}|-\\frac{5\\pi}{6}|\\frac{\\pi}{4}|\\frac{3\\pi}{4}|-\\frac{\\pi}{4}|-\\frac{3\\pi}{4}"
)
HORS = (
    "\\frac{13\\pi}{6}|\\frac{7\\pi}{3}|\\frac{9\\pi}{4}|\\frac{11\\pi}{4}|\\frac{17\\pi}{6}|\\frac{7\\pi}{6}"
    "|\\frac{5\\pi}{3}|\\frac{7\\pi}{4}|-\\frac{7\\pi}{4}|-\\frac{11\\pi}{6}|-\\frac{5\\pi}{4}|-\\frac{4\\pi}{3}"
)
REPERES = "Les repères $0$, $\\dfrac{\\pi}{2}$, $\\pi$ et $-\\dfrac{\\pi}{2}$ partagent le cercle en quarts ; $\\dfrac{\\pi}{6}$ est le tiers d'un quart de tour, $\\dfrac{\\pi}{4}$ sa moitié. Un réel positif se place dans le sens direct depuis $I$, un réel négatif dans le sens indirect."

b3 = base(
    "Placer un point sur le cercle trigonométrique",
    "Placer le point image d'un réel multiple de π/6 ou π/4, dans ]−π ; π] puis hors de cet intervalle (mesure principale), ou deux points symétriques",
    ["1_SPE"],
    "Fonctions trigonométriques",
    "Cercle et radians",
    6,
    60,
)
b3["variations"] = [
    {
        "statement": "Place sur le cercle trigonométrique le point $M$ associé au réel ${{r}}$.\n\n```trig\npreset: quarters\nplacer: M = {{p}}*pi/12\n```",
        "variables": [
            {"name": "r", "expression": PRINCIPAUX},
            {"name": "p", "expression": "eval:12*r/\\pi"},
        ],
        "blanks": [],
        "correction": {
            "steps": [
                REPERES,
                "${{r}}={{if:p<0|-|}}{{if:mod(p,2)==0|{{eval:abs(p)/2}}\\times\\dfrac{\\pi}{6}|{{eval:abs(p)/3}}\\times\\dfrac{\\pi}{4}}}$ : on part de $I$ et on tourne dans le sens {{if:p<0|indirect|direct}}.",
                "```trig\npreset: quarters\npoints: M = {{p}}*pi/12\n```",
            ]
        },
    },
    {
        "statement": "Place sur le cercle trigonométrique le point $M$ associé au réel ${{r}}$.\n\n```trig\npreset: quarters\nplacer: M = {{p}}*pi/12\n```",
        "variables": [
            {"name": "r", "expression": HORS},
            {"name": "p", "expression": "eval:12*r/\\pi"},
            {"name": "q", "expression": "eval:12-mod(12-p,24)"},
            {"name": "m", "expression": "eval:q*\\pi/12"},
            {"name": "n", "expression": "eval:(p-q)/24"},
        ],
        "blanks": [],
        "correction": {
            "steps": [
                "${{r}}$ n'est pas dans " + INTERVALLE_PRINCIPAL + " : on cherche sa **mesure principale** en ajoutant ou en retirant des tours complets ($2\\pi$), qui ramènent au même point.",
                "${{r}}={{m}}{{if:n>0|+|-}}{{if:n*n>1|{{eval:2*abs(n)}}|2}}\\pi$, et ${{m}}\\in\\left]-\\pi\\,;\\pi\\right]$ : $M$ est le point associé à $" + col("{{m}}") + "$.",
                "```trig\npreset: quarters\npoints: M = {{q}}*pi/12\n```",
            ]
        },
    },
    {
        "statement": "Soit $x={{r}}$. Place sur le cercle trigonométrique le point $M$ associé à $x$ et le point $N$ associé à ${{if:w==0|-x|\\pi-x}}$.\n\n```trig\npreset: quarters\nplacer: M = {{p}}*pi/12 ; N = {{v}}*pi/12\n```",
        "variables": [
            {"name": "w", "expression": "0|1"},
            {"name": "r", "expression": PRINCIPAUX},
            {"name": "p", "expression": "eval:12*r/\\pi"},
            {"name": "v", "expression": "eval:12*w-p"},
            {"name": "m", "expression": "eval:(12-mod(12-v,24))*\\pi/12"},
        ],
        "blanks": [],
        "correction": {
            "steps": [
                "{{if:w==0|Les points associés à $x$ et à $-x$ sont **symétriques par rapport à l'axe des abscisses**.|Les points associés à $x$ et à $\\pi-x$ sont **symétriques par rapport à l'axe des ordonnées**.}}",
                "${{if:w==0|-x|\\pi-x}}=" + col("{{m}}") + "$",
                "```trig\npreset: quarters\npoints: M = {{p}}*pi/12, N = {{v}}*pi/12\n```",
            ]
        },
    },
]
b3["testSpecs"] = [
    spec("2π/3 : cran 8", 0, {"r": "\\frac{2\\pi}{3}"}, ["8"]),
    spec("Erreur : 2π/3 placé en π/3", 0, {"r": "\\frac{2\\pi}{3}"}, ["4"], ok=False),
    spec("−π/4 : cran 21", 0, {"r": "-\\frac{\\pi}{4}"}, ["21"]),
    spec("Erreur : −π/4 placé en π/4", 0, {"r": "-\\frac{\\pi}{4}"}, ["3"], ok=False),
    spec("13π/6 : cran 2", 1, {"r": "\\frac{13\\pi}{6}"}, ["2"]),
    spec("−7π/4 : cran 3", 1, {"r": "-\\frac{7\\pi}{4}"}, ["3"]),
    spec("Erreur : −7π/4 placé en −π/4", 1, {"r": "-\\frac{7\\pi}{4}"}, ["21"], ok=False),
    spec("5π/3 : cran 20", 1, {"r": "\\frac{5\\pi}{3}"}, ["20"]),
    spec("x = π/3, −x : crans 4 et 20", 2, {"w": "0", "r": "\\frac{\\pi}{3}"}, ["4", "20"]),
    spec("Erreur : N = π − x au lieu de −x", 2, {"w": "0", "r": "\\frac{\\pi}{3}"}, ["4", "8"], ok=False),
    spec("x = −π/4, π − x : crans 21 et 15", 2, {"w": "1", "r": "-\\frac{\\pi}{4}"}, ["21", "15"]),
]
write("03-placer-un-point-sur-le-cercle.json", b3)

# ---------------------------------------------------------------------------
# B4 — 432 (+ 1GEN-062, 1TECHNO-139) : signe lu sur la courbe
# ---------------------------------------------------------------------------

COURBE = (
    "```courbe\nx: -6 ; 6\ny: -7 ; 7\ngrille: 1 ; 1\n"
    "f(x) = {{a}}*(x{{eval:-r;+}})*(x{{eval:-s;+}})*(x{{eval:-t;+}})/5 sur [{{eval:r-1}} ; {{eval:t+1}}]   bleu   nom=C_f\n"
    "taille: moyenne\n"
    "description: Courbe d'une fonction qui coupe l'axe des abscisses en {{r}}, {{s}} et {{t}}.\n```"
)
VARS = [
    {"name": "a", "expression": "1|-1"},
    {"name": "r", "expression": "-4..2"},
    {"name": "s", "expression": "-3..3"},
    {"name": "t", "expression": "-2..4"},
]
CONDS = ["r < s", "s < t", "t - r <= 5"]
DEF = "La fonction $f$ est définie sur $\\left[{{eval:r-1}}\\,;{{eval:t+1}}\\right]$ ; sa courbe $\\mathcal{C}_f$ est tracée ci-dessous."
LECTURE = "$f(x)$ est **positif** là où $\\mathcal{C}_f$ est au-dessus de l'axe des abscisses, **négatif** là où elle est au-dessous, et **nul** là où elle le coupe : en ${{r}}$, ${{s}}$ et ${{t}}$."


def tableau(signs, zeros=("r", "s", "t")):
    """Tableau de signes de f sur [r−1 ; t+1] ; signs = 4 signes (chaînes ubumark)."""
    z = zeros
    return (
        "variable: x\n"
        "domain: {{eval:r-1}}, {{" + z[0] + "}}, {{" + z[1] + "}}, {{" + z[2] + "}}, {{eval:t+1}}\n\n"
        "sign: f(x)\n"
        "  {{eval:r-1}},{{" + z[0] + "}}: " + signs[0] + "\n"
        "  {{" + z[0] + "}}: z\n"
        "  {{" + z[0] + "}},{{" + z[1] + "}}: " + signs[1] + "\n"
        "  {{" + z[1] + "}}: z\n"
        "  {{" + z[1] + "}},{{" + z[2] + "}}: " + signs[2] + "\n"
        "  {{" + z[2] + "}}: z\n"
        "  {{" + z[2] + "}},{{eval:t+1}}: " + signs[3]
    )


NEG = "{{if:a>0|-|+}}"
POS = "{{if:a>0|+|-}}"
JUSTE = [NEG, POS, NEG, POS]
INVERSE = [POS, NEG, POS, NEG]
REBOND = [NEG, POS, POS, POS]  # erreur : courbe qui toucherait l'axe en s sans le traverser


def option(signs):
    lines = ("```variation\n" + tableau(signs) + "\n```").split("\n")
    return "- " + "\n  ".join(lines)


b4 = base(
    "Signe d'une fonction lu sur sa courbe",
    "Lire sur la courbe le signe de f(x) sur un intervalle, l'ensemble où f(x) ≥ 0 et le tableau de signes",
    ["1_SPE", "1_GEN", "1_TECHNO"],
    "Généralités",
    "Signe",
    2,
    60,
)
b4["variations"] = [
    {
        "statement": DEF + "\n\n" + COURBE + "\n\nQuel est le signe de $f(x)$ pour $x\\in\\left]{{u}}\\,;{{v}}\\right[$ ?\n\n```choix\nmelanger: non\n- strictement positif\n- strictement négatif\n- il change de signe\n```",
        "variables": VARS
        + [
            {"name": "z", "expression": "0|1|2"},
            {"name": "u", "expression": "eval:r+(s-r)*z*(2-z)"},
            {"name": "v", "expression": "eval:s+(t-s)*z*(3-z)/2"},
        ],
        "conditions": CONDS,
        "blanks": [{"expectedAnswer": "{{if:z==2|2|{{eval:(1-a*(1-2*z))/2}}}}"}],
        "correction": {
            "steps": [
                LECTURE,
                "```variation\n" + tableau(JUSTE) + "\n```",
                "{{if:z==2|Sur $\\left]{{u}}\\,;{{v}}\\right[$, la courbe traverse l'axe en ${{s}}$ : $f(x)$ $" + col("\\text{change de signe}") + "$.|Sur $\\left]{{u}}\\,;{{v}}\\right[$, la courbe est {{if:a*(1-2*z)>0|au-dessus|au-dessous}} de l'axe : $f(x)$ est $" + col("\\text{strictement {{if:a*(1-2*z)>0|positif|négatif}}}") + "$.}}",
            ]
        },
    },
    {
        "statement": DEF + "\n\n" + COURBE + "\n\nRésous l'inéquation $f(x)\\geqslant0$.\n\n$S=?$",
        "variables": VARS,
        "conditions": CONDS,
        "blanks": [
            {
                "expectedAnswer": "{{if:a>0|[{{r}};{{s}}]\\cup[{{t}};{{eval:t+1}}]|[{{eval:r-1}};{{r}}]\\cup[{{s}};{{t}}]}}",
                "answerKind": "intervalles",
            }
        ],
        "correction": {
            "steps": [
                LECTURE,
                "```variation\n" + tableau(JUSTE) + "\n```",
                "On garde les intervalles où $\\mathcal{C}_f$ est au-dessus de l'axe, **et** les points où elle le coupe (l'inégalité est large), sans sortir de l'ensemble de définition.",
                "$S=" + col("{{if:a>0|\\left[{{r}}\\,;{{s}}\\right]\\cup\\left[{{t}}\\,;{{eval:t+1}}\\right]|\\left[{{eval:r-1}}\\,;{{r}}\\right]\\cup\\left[{{s}}\\,;{{t}}\\right]}}") + "$",
            ]
        },
    },
    {
        "statement": DEF + "\n\n" + COURBE + "\n\nQuel est le tableau de signes de $f(x)$ ?\n\n````choix\n" + option(JUSTE) + "\n" + option(INVERSE) + "\n" + option(REBOND) + "\n````",
        "variables": VARS,
        "conditions": CONDS,
        "blanks": [{"expectedAnswer": "0"}],
        "correction": {
            "steps": [
                LECTURE,
                "Entre deux zéros consécutifs, le signe se lit à la position de la courbe : elle est {{if:a>0|au-dessous|au-dessus}} de l'axe avant ${{r}}$, puis elle **traverse** l'axe en chacun des trois zéros, donc le signe change à chaque fois.",
                "```variation\n" + tableau(JUSTE) + "\n```",
            ]
        },
    },
]
b4["testSpecs"] = [
    spec("a > 0, ]r ; s[ : positif", 0, {"a": "1", "r": "-2", "s": "0", "t": "3", "z": "0", "u": "-2", "v": "0"}, ["0"]),
    spec("a > 0, ]s ; t[ : négatif", 0, {"a": "1", "r": "-2", "s": "0", "t": "3", "z": "1", "u": "0", "v": "3"}, ["1"]),
    spec("Erreur : a > 0, ]s ; t[ lu positif", 0, {"a": "1", "r": "-2", "s": "0", "t": "3", "z": "1", "u": "0", "v": "3"}, ["0"], ok=False),
    spec("a < 0, ]r ; s[ : négatif", 0, {"a": "-1", "r": "-2", "s": "0", "t": "3", "z": "0", "u": "-2", "v": "0"}, ["1"]),
    spec("]r ; t[ : change de signe", 0, {"a": "-1", "r": "-2", "s": "0", "t": "3", "z": "2", "u": "-2", "v": "3"}, ["2"]),
    spec("a > 0 : [−2 ; 0] ∪ [3 ; 4]", 1, {"a": "1", "r": "-2", "s": "0", "t": "3"}, ["[-2;0]\\cup[3;4]"]),
    spec("Erreur : crochets ouverts", 1, {"a": "1", "r": "-2", "s": "0", "t": "3"}, ["]-2;0[\\cup]3;4["], ok=False),
    spec("a < 0 : [−3 ; −2] ∪ [0 ; 3]", 1, {"a": "-1", "r": "-2", "s": "0", "t": "3"}, ["[-3;-2]\\cup[0;3]"]),
    spec("Erreur : a < 0, ensemble de f(x) ≤ 0", 1, {"a": "-1", "r": "-2", "s": "0", "t": "3"}, ["[-2;0]\\cup[3;4]"], ok=False),
    spec("Tableau juste", 2, {"a": "1", "r": "-2", "s": "0", "t": "3"}, ["0"]),
    spec("Erreur : signes inversés", 2, {"a": "1", "r": "-2", "s": "0", "t": "3"}, ["1"], ok=False),
]
write("04-signe-d-une-fonction-lu-sur-sa-courbe.json", b4)
print("ok")

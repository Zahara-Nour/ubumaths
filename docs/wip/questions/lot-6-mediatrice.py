"""Lot « 6-mediatrice » (chantier exercices-noelie) : deux modèles de 6e sur la médiatrice.

Décisions (phase 0 validée par David le 2026-11-18, journal docs/wip/exercices-noelie-progress.md) :
- 01 « Tracer la médiatrice d'un segment sur quadrillage » : milieu en comptant les carreaux,
  perpendiculaire à l'équerre ; grille: 1, outils: droite, equerre ; 3 variations (horizontal,
  vertical, en biais, milieu toujours sur un nœud) × 3 positions. Niveau 3, 120 s.
- 02 « Calculer avec la médiatrice » : figure codée (pas à l'échelle, longueurs écrites),
  réponse en cm ; 3 variations : périmètre de MAB, MA depuis le périmètre, périmètre de AMBN.
  Erreur visée : oublier MB = MA. Niveau 3, 90 s.

Usage : python3 docs/wip/questions/lot-6-mediatrice.py scripts/questions/6-mediatrice
"""

import json
import sys
from pathlib import Path

PRIMARY = "{{{color:primary.0}}}"


def modele(title, description, level, delay, variations, specs):
    return {
        "title": title,
        "description": description,
        "grades": ["6"],
        "level": level,
        "delay": delay,
        "status": "draft",
        "variations": variations,
        "testSpecs": specs,
    }


def spec(description, variation, variables, answers, status):
    return {
        "description": description,
        "variationIndex": variation,
        "variables": {k: str(v) for k, v in variables.items()},
        "answers": answers,
        "expected": {"status": status},
    }


def choix_k(options):
    """{{if:k==1|…|{{if:k==2|…|…}}}} pour trois options."""
    a, b, c = options
    return "{{if:k==1|" + a + "|{{if:k==2|" + b + "|" + c + "}}}}"


# ---------------------------------------------------------------------------
# 01 — Tracer la médiatrice sur quadrillage
# ---------------------------------------------------------------------------

# Par variation : trois segments (A, B, étiquettes) ; la médiatrice passe par le milieu I
# et par un second nœud P.
TRACER = [
    {
        "nom": "horizontal",
        "segments": [
            ((2, 4), (8, 4), "gauche", "droite"),
            ((1, 3), (7, 3), "gauche", "droite"),
            ((3, 5), (9, 5), "gauche", "droite"),
        ],
        "methode": "$[AB]$ est horizontal : on compte les carreaux de $A$ à $B$ et on place le milieu $I$ à la moitié.",
        "perp": "La médiatrice est la droite **verticale** qui passe par $I$ : on la trace à l'équerre, posée le long de $[AB]$ et glissée jusqu'à $I$.",
    },
    {
        "nom": "vertical",
        "segments": [
            ((5, 1), (5, 7), "bas", "haut"),
            ((3, 2), (3, 6), "bas", "haut"),
            ((4, 1), (4, 5), "bas", "haut"),
        ],
        "methode": "$[AB]$ est vertical : on compte les carreaux de $A$ à $B$ et on place le milieu $I$ à la moitié.",
        "perp": "La médiatrice est la droite **horizontale** qui passe par $I$ : on la trace à l'équerre, posée le long de $[AB]$ et glissée jusqu'à $I$.",
    },
    {
        "nom": "en biais",
        "segments": [
            ((2, 2), (6, 4), "bas-gauche", "droite"),
            ((2, 5), (6, 3), "haut-gauche", "droite"),
            ((3, 1), (7, 3), "bas-gauche", "droite"),
        ],
        "methode": "De $A$ à $B$, on avance de 4 carreaux et on se déplace de 2 carreaux en hauteur : le milieu $I$ est à 2 carreaux de $A$ vers la droite et à 1 carreau en hauteur.",
        "perp": "La médiatrice est perpendiculaire à $[AB]$ en $I$ : on la trace à l'équerre, posée le long de $[AB]$ et glissée jusqu'à $I$ (en comptant les carreaux : $[AB]$ fait 2 carreaux en largeur pour 1 en hauteur ; la perpendiculaire fait 1 carreau en largeur pour 2 en hauteur, en tournant d'un quart de tour).",
    },
]


def milieu(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def fmt(x):
    return str(int(x)) if float(x).is_integer() else str(x)


def droite(p, q):
    return f"droite({fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})"


def perp_node(a, b, i):
    """Un second nœud de la médiatrice : I + (−dy, dx) réduit."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    from math import gcd

    g = gcd(int(dx), int(dy)) or 1
    ux, uy = -dy // g, dx // g
    return (i[0] + ux, i[1] + uy)


def corps_figure(seg):
    (a, b, ea, eb) = seg
    return (
        f'A = point({fmt(a[0])}, {fmt(a[1])}, etiquette="{ea}")\n'
        f'B = point({fmt(b[0])}, {fmt(b[1])}, etiquette="{eb}")\n'
        "segment(A, B)"
    )


def tracer():
    variations, specs = [], []
    for vi, v in enumerate(TRACER):
        statement = (
            "Trace la **médiatrice** du segment $[AB]$ avec la règle et l'équerre.\n\n"
            "```figure-a-completer\n"
            "fenetre: 0 ; 10 ; 0 ; 8\n"
            "grille: 1\n"
            "outils: droite, equerre\n"
            "verifier: droite m = mediatrice(A, B)\n"
            "---\n" + choix_k([corps_figure(s) for s in v["segments"]]) + "\n```"
        )
        variations.append(
            {
                "statement": statement,
                "variables": [{"name": "k", "expression": "1..3"}],
                "correction": {
                    "steps": [
                        "**La médiatrice** de $[AB]$ est la droite **perpendiculaire** à $[AB]$ qui passe par son **milieu**.",
                        v["methode"],
                        v["perp"]
                        + f" C'est la $\\textcolor{PRIMARY}{{\\text{{médiatrice de }}[AB]}}$.",
                    ]
                },
            }
        )
        for k, (a, b, _, _) in enumerate(v["segments"], start=1):
            i = milieu(a, b)
            p = perp_node(a, b, i)
            specs.append(spec(f"{v['nom']} {k} : par I et un nœud de la médiatrice", vi, {"k": k}, [droite(i, p)], "correct"))
        # Erreurs typiques sur le premier segment de la variation
        a, b, _, _ = v["segments"][0]
        i = milieu(a, b)
        p = perp_node(a, b, i)
        decale = (p[0] - i[0], p[1] - i[1])
        # perpendiculaire par A (pas par le milieu)
        specs.append(spec(f"Erreur {v['nom']} : perpendiculaire par A", vi, {"k": 1}, [droite(a, (a[0] + decale[0], a[1] + decale[1]))], "incorrect"))
        # par le milieu, mais pas perpendiculaire
        specs.append(spec(f"Erreur {v['nom']} : par le milieu, pas perpendiculaire", vi, {"k": 1}, [droite(i, (i[0] + 1, i[1] + 3))], "incorrect"))
    specs.append(spec("Rien de tracé", 0, {"k": 2}, [""], "empty"))
    return modele(
        "Tracer la médiatrice d'un segment sur quadrillage",
        "Sur quadrillage, à la règle et à l'équerre : placer le milieu en comptant les carreaux, puis tracer la perpendiculaire au segment qui passe par ce milieu",
        3,
        120,
        variations,
        specs,
    )


# ---------------------------------------------------------------------------
# 02 — Calculer avec la médiatrice
# ---------------------------------------------------------------------------

FIG_MAB = (
    "```figure\n"
    "fenetre: -4 ; 4 ; -1.2 ; 4.6\n"
    "description: Un segment [AB], sa médiatrice d codée (milieu I, angle droit) et un point M de d ; le triangle MAB en tirets.\n"
    "---\n"
    'A = point(-3, 0, etiquette="bas-gauche")\n'
    'B = point(3, 0, etiquette="bas-droite")\n'
    "I = point(0, 0, visible=faux)\n"
    'M = point(0, 3.5, etiquette="haut-droite")\n'
    "segment(A, B)\n"
    'd = mediatrice(A, B, couleur="bleu")\n'
    'texte(0.35, -0.8, "d")\n'
    "marque_segment(A, I)\n"
    "marque_segment(I, B)\n"
    'angle(B, I, M, marque="carre")\n'
    'segment(M, A, trait="tirets")\n'
    'segment(M, B, trait="tirets")\n'
    "```"
)

FIG_AMBN = (
    "```figure\n"
    "fenetre: -4 ; 4 ; -3.6 ; 4.6\n"
    "description: Un segment [AB], sa médiatrice d codée et deux points M et N de d, de part et d'autre de [AB] ; le quadrilatère AMBN en tirets.\n"
    "---\n"
    'A = point(-3, 0, etiquette="gauche")\n'
    'B = point(3, 0, etiquette="droite")\n'
    "I = point(0, 0, visible=faux)\n"
    'M = point(0, 3.5, etiquette="haut-droite")\n'
    'N = point(0, -2.5, etiquette="bas-droite")\n'
    'segment(A, B, trait="pointilles")\n'
    'd = mediatrice(A, B, couleur="bleu")\n'
    'texte(0.35, 4.2, "d")\n'
    "marque_segment(A, I)\n"
    "marque_segment(I, B)\n"
    'angle(B, I, M, marque="carre")\n'
    'polygone(A, M, B, N, trait="tirets")\n'
    "```"
)

PROP = "**La propriété de la médiatrice.** Tout point de la médiatrice de $[AB]$ est à la même distance de $A$ et de $B$."


def calculer():
    ma = "{{eval:a/10;d}}"
    ab = "{{eval:c/10;d}}"
    variations = [
        {
            "statement": (
                "La droite $d$ est la médiatrice du segment $[AB]$, et le point $M$ est sur $d$.\n\n"
                + FIG_MAB
                + f"\n\nOn sait que $MA = {ma}~\\unit{{cm}}$ et $AB = {ab}~\\unit{{cm}}$.\n\n"
                "Quel est le périmètre du triangle $MAB$ ?\n\n"
                "$\\mathcal{P} = ?~\\unit{cm}$"
            ),
            "variables": [
                {"name": "a", "expression": "35..70"},
                {"name": "c", "expression": "40..60"},
            ],
            "blanks": [{"expectedAnswer": "{{eval:(2*a+c)/10;d}}"}],
            "correction": {
                "steps": [
                    PROP,
                    f"$M$ est sur $d$ : $MB = MA = {ma}~\\unit{{cm}}$.",
                    f"$\\mathcal{{P}} = MA + MB + AB = {ma} + {ma} + {ab} = \\textcolor{PRIMARY}{{{{{{eval:(2*a+c)/10;d}}}}~\\unit{{cm}}}}$.",
                ]
            },
        },
        {
            "statement": (
                "La droite $d$ est la médiatrice du segment $[AB]$, et le point $M$ est sur $d$.\n\n"
                + FIG_MAB
                + "\n\nLe triangle $MAB$ a pour périmètre ${{eval:(2*a+c)/10;d}}~\\unit{cm}$, et "
                + f"$AB = {ab}~\\unit{{cm}}$.\n\n"
                "Quelle est la longueur $MA$ ?\n\n"
                "$MA = ?~\\unit{cm}$"
            ),
            "variables": [
                {"name": "a", "expression": "35..70"},
                {"name": "c", "expression": "40..60"},
            ],
            "blanks": [{"expectedAnswer": ma}],
            "correction": {
                "steps": [
                    PROP,
                    "$M$ est sur $d$ : $MA = MB$. Les deux côtés $[MA]$ et $[MB]$ ont la même longueur.",
                    "$MA + MB = {{eval:(2*a+c)/10;d}} - " + ab + " = {{eval:2*a/10;d}}~\\unit{cm}$, que l'on partage en deux.",
                    f"$MA = {{{{eval:2*a/10;d}}}} \\div 2 = \\textcolor{PRIMARY}{{{ma}~\\unit{{cm}}}}$.",
                ]
            },
        },
        {
            "statement": (
                "La droite $d$ est la médiatrice du segment $[AB]$. Les points $M$ et $N$ sont sur $d$.\n\n"
                + FIG_AMBN
                + f"\n\nOn sait que $MA = {ma}~\\unit{{cm}}$ et $NB = {{{{eval:n/10;d}}}}~\\unit{{cm}}$.\n\n"
                "Quel est le périmètre du quadrilatère $AMBN$ ?\n\n"
                "$\\mathcal{P} = ?~\\unit{cm}$"
            ),
            "variables": [
                {"name": "a", "expression": "35..70"},
                {"name": "n", "expression": "25..45"},
            ],
            "blanks": [{"expectedAnswer": "{{eval:2*(a+n)/10;d}}"}],
            "correction": {
                "steps": [
                    PROP,
                    f"$M$ est sur $d$ : $MB = MA = {ma}~\\unit{{cm}}$. $N$ est sur $d$ : $NA = NB = {{{{eval:n/10;d}}}}~\\unit{{cm}}$.",
                    f"$\\mathcal{{P}} = AM + MB + BN + NA = {ma} + {ma} + {{{{eval:n/10;d}}}} + {{{{eval:n/10;d}}}} = \\textcolor{PRIMARY}{{{{{{eval:2*(a+n)/10;d}}}}~\\unit{{cm}}}}$.",
                ]
            },
        },
    ]
    specs = [
        spec("MA = 4,5 ; AB = 5 : 14", 0, {"a": 45, "c": 50}, ["14"], "correct"),
        spec("MA = 3,7 ; AB = 4,2 : 11,6", 0, {"a": 37, "c": 42}, ["11,6"], "correct"),
        spec("Erreur : MA + AB, sans MB", 0, {"a": 45, "c": 50}, ["9,5"], "incorrect"),
        spec("P = 14 ; AB = 5 : MA = 4,5", 1, {"a": 45, "c": 50}, ["4,5"], "correct"),
        spec("Erreur : P − AB sans partager", 1, {"a": 45, "c": 50}, ["9"], "incorrect"),
        spec("Erreur : P − AB − AB", 1, {"a": 45, "c": 50}, ["4"], "incorrect"),
        spec("MA = 4 ; NB = 3 : 14", 2, {"a": 40, "n": 30}, ["14"], "correct"),
        spec("MA = 5,5 ; NB = 2,6 : 16,2", 2, {"a": 55, "n": 26}, ["16,2"], "correct"),
        spec("Erreur : MA + NB seulement", 2, {"a": 40, "n": 30}, ["7"], "incorrect"),
    ]
    return modele(
        "Calculer avec la médiatrice",
        "S'appuyer sur la propriété de la médiatrice (MA = MB) pour calculer un périmètre ou une longueur : triangle MAB, quadrilatère AMBN",
        3,
        90,
        variations,
        specs,
    )


def main():
    dossier = Path(sys.argv[1])
    dossier.mkdir(parents=True, exist_ok=True)
    fichiers = {
        "01-tracer-la-mediatrice-sur-quadrillage.json": tracer(),
        "02-calculer-avec-la-mediatrice.json": calculer(),
    }
    for nom, m in fichiers.items():
        chemin = dossier / nom
        if chemin.exists():
            ancien = json.loads(chemin.read_text(encoding="utf8"))
            if "id" in ancien:
                m = {"id": ancien["id"], **m}
        chemin.write_text(json.dumps(m, ensure_ascii=False, indent="\t") + "\n", encoding="utf8")
        print(f"écrit {chemin}")


if __name__ == "__main__":
    main()

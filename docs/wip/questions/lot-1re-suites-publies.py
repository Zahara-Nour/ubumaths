#!/usr/bin/env python3
"""Variations ajoutées à la fin de 14 modèles publiés de 1re spé (suites), chantier idees-1re-suites.

Usage : python3 lot-1re-suites-publies.py <dossier scripts/questions/1re-suites-publies>
Idempotent : part de la version commitée (git show 2a85b7b809:…, export de prod), ajoute les variations et les specs.
"""
import json
import subprocess
import sys
from pathlib import Path

DOSSIER = Path(sys.argv[1])
P0 = "{{color:primary.0}}"


def tc(x, k=0):
    """Couleur dans les maths : \\textcolor{…}{x}"""
    return "\\textcolor{{{color:primary.%d}}}{%s}" % (k, x)


def var(name, expr):
    return {"name": name, "expression": expr}


def err(answer, message, label):
    return {"answer": answer, "message": message, "label": label}


def spec(vi, variables, answers, status="correct", desc="", message=None, violations=None):
    exp = {"status": status}
    if violations:
        exp["constraintViolations"] = violations
    if message:
        exp["expectedErrorMessage"] = message
    return {
        "answers": answers,
        "expected": exp,
        "variables": {k: str(v) for k, v in variables.items()},
        "description": desc,
        "variationIndex": vi,
    }


CHOIX_GEO = "```choix\nmelanger: non\n- Oui, elle est géométrique.\n- Non, elle n'est pas géométrique.\n```"
CHOIX_ARI = "```choix\nmelanger: non\n- Oui, elle est arithmétique.\n- Non, elle n'est pas arithmétique.\n```"
CHOIX_SENS = "```choix\nmelanger: non\n- croissante\n- décroissante\n- constante\n```"

AJOUTS = {}

# ---------------------------------------------------------------------------
# 45da9678 — De l'énoncé à l'expression de la suite
# ---------------------------------------------------------------------------
v_capital = {
    "blanks": [
        {
            "expectedAnswer": "{{eval:1+p/100;d}}",
            "expectedErrors": [
                err("{{eval:p/100;d}}", "Tu as donné le taux : augmenter de ${{p}}\\,\\%$, c'est multiplier par $1+\\dfrac{ {{p}} }{100}$.", "Taux au lieu du coefficient"),
                err("{{eval:1-p/100;d}}", "Le capital augmente : on multiplie par $1+\\dfrac{ {{p}} }{100}$, pas par $1-\\dfrac{ {{p}} }{100}$.", "Baisse au lieu de hausse"),
                err("{{eval:1+p/10;d}}", "${{p}}\\,\\%$, c'est $\\dfrac{ {{p}} }{100}$ et non $\\dfrac{ {{p}} }{10}$.", "Pourcentage divisé par 10"),
            ],
        },
        {
            "expectedAnswer": "{{eval:-f}}",
            "expectedErrors": [
                err("{{f}}", "Les frais sont retirés du capital : on ajoute $-{{f}}$.", "Frais ajoutés"),
                err("{{eval:-f*(1+p/100);d}}", "Les frais sont prélevés après les intérêts : ils ne sont pas multipliés par le coefficient.", "Frais multipliés par le coefficient"),
            ],
        },
    ],
    "statement": "Un capital de ${{c}}~\\unit{€}$ est placé à ${{p}}\\,\\%$ par an. À la fin de chaque année, après le versement des intérêts, la banque prélève ${{f}}~\\unit{€}$ de frais. On note $u_n$ le capital, en euros, au bout de $n$ années.\n\nComplète la relation de récurrence.\n\n$u_{n+1}=?\\times u_n+?$",
    "variables": [var("c", "1000..5000"), var("p", "2..5"), var("f", "10..40")],
    "correction": {
        "steps": [
            "Augmenter de ${{p}}\\,\\%$, c'est multiplier par $1+\\dfrac{ {{p}} }{100}={{eval:1+p/100;d}}$.",
            "On retire ensuite les ${{f}}~\\unit{€}$ de frais : $u_{n+1}=" + tc("{{eval:1+p/100;d}}") + "\\times u_n" + tc("-{{f}}", 1) + "$.",
        ]
    },
    "hint": "Commence par traduire la hausse de ${{p}}\\,\\%$ par une multiplication, puis tiens compte des frais.",
}
v_abonnes = {
    "blanks": [
        {
            "expectedAnswer": "{{eval:p/100;d}}",
            "expectedErrors": [
                err("{{eval:1-p/100;d}}", "Tu as pris la part des abonnés qui partent : on garde ${{p}}\\,\\%$ des abonnés.", "Part des départs"),
                err("{{eval:1+p/100;d}}", "Garder ${{p}}\\,\\%$ des abonnés, c'est multiplier par $\\dfrac{ {{p}} }{100}$, pas par $1+\\dfrac{ {{p}} }{100}$.", "Hausse au lieu de proportion"),
                err("{{p}}", "Un pourcentage s'écrit sous forme décimale : ${{p}}\\,\\%=\\dfrac{ {{p}} }{100}$.", "Pourcentage non converti"),
            ],
        },
        {
            "expectedAnswer": "{{a}}",
            "expectedErrors": [
                err("{{eval:-a}}", "Les nouveaux abonnés s'ajoutent : le nombre à ajouter est positif.", "Signe des nouveaux abonnés"),
                err("{{eval:a*p/100;d}}", "Les nouveaux abonnés s'ajoutent après les réabonnements : on ne leur applique pas le pourcentage.", "Pourcentage appliqué aux nouveaux"),
            ],
        },
    ],
    "statement": "Un magazine compte ${{m}}$ abonnés. Chaque année, ${{p}}\\,\\%$ des abonnés se réabonnent et ${{a}}$ nouveaux lecteurs s'abonnent. On note $u_n$ le nombre d'abonnés au bout de $n$ années.\n\nComplète la relation de récurrence.\n\n$u_{n+1}=?\\times u_n+?$",
    "variables": [var("m", "2000..8000"), var("p", "70..80"), var("a", "200..900")],
    "correction": {
        "steps": [
            "Garder ${{p}}\\,\\%$ des abonnés, c'est multiplier leur nombre par $\\dfrac{ {{p}} }{100}={{eval:p/100;d}}$.",
            "On ajoute ensuite les ${{a}}$ nouveaux abonnés : $u_{n+1}=" + tc("{{eval:p/100;d}}") + "\\times u_n+" + tc("{{a}}", 1) + "$.",
        ]
    },
    "hint": "Quelle part des abonnés de l'année reste abonnée ? Traduis-la par une multiplication, puis ajoute les nouveaux.",
}
v_location = {
    "blanks": [
        {
            "expectedAnswer": "{{f}}+{{eval:k/100;d}}n",
            "expectedErrors": [
                err("{{eval:k/100;d}}+{{f}}n", "Le forfait est payé une seule fois : c'est le prix au kilomètre qui est multiplié par $n$.", "Forfait et prix au km échangés"),
                err("{{f}}+{{k}}n", "Le prix au kilomètre est donné en euros, pas en centimes.", "Centimes non convertis"),
                err("{{eval:k/100;d}}n", "Tu as oublié le forfait de ${{f}}~\\unit{€}$.", "Forfait oublié"),
            ],
        }
    ],
    "statement": "Une agence loue une voiture ${{f}}~\\unit{€}$ la journée, plus ${{eval:k/100;d}}~\\unit{€}$ par kilomètre parcouru. On note $u_n$ le prix, en euros, d'une journée de location avec $n$ kilomètres parcourus.\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$",
    "variables": [var("f", "30..80"), var("k", "15|20|25|30|35|40")],
    "correction": {
        "steps": [
            "Pour $n$ kilomètres, on paie $n$ fois ${{eval:k/100;d}}~\\unit{€}$, plus le forfait de ${{f}}~\\unit{€}$.",
            "$$u_n=" + tc("{{f}}+{{eval:k/100;d}}n") + "$$",
        ]
    },
    "hint": "Écris le prix pour $1$, puis $2$, puis $3$ kilomètres : qu'est-ce qui change à chaque kilomètre ?",
}
v_plongee = {
    "blanks": [
        {
            "expectedAnswer": "{{t}}-{{eval:k/100;d}}n",
            "expectedErrors": [
                err("{{t}}+{{eval:k/100;d}}n", "La température baisse : le coefficient de $n$ est négatif.", "Hausse au lieu de baisse"),
                err("{{t}}-{{eval:k/10;d}}n", "Attention à la virgule : la baisse est de $0{,}0{{k}}~\\unit{°C}$ par mètre.", "Erreur de virgule"),
                err("{{eval:-k/100;d}}+{{t}}n", "La température de surface ne se multiplie pas par $n$ : c'est la baisse par mètre qui est multipliée par $n$.", "Termes échangés"),
            ],
        }
    ],
    "statement": "En mer, un jour d'été, l'eau est à ${{t}}~\\unit{°C}$ en surface. Entre la surface et $100~\\unit{m}$ de profondeur, on admet que sa température baisse de ${{eval:k/100;d}}~\\unit{°C}$ par mètre. On note $u_n$ la température, en degrés Celsius, à $n$ mètres de profondeur.\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$",
    "variables": [var("t", "18..26"), var("k", "3..8")],
    "correction": {
        "steps": [
            "À chaque mètre de plus, la température perd ${{eval:k/100;d}}~\\unit{°C}$ : à $n$ mètres, elle a perdu $n$ fois ${{eval:k/100;d}}~\\unit{°C}$.",
            "$$u_n=" + tc("{{t}}-{{eval:k/100;d}}n") + "$$",
        ]
    },
    "hint": "Calcule la température à $1$, puis $2$ mètres de profondeur : que retranche-t-on à chaque mètre ?",
}
AJOUTS["45da9678"] = {
    "variations": [v_capital, v_abonnes, v_location, v_plongee],
    "description": "Traduire un énoncé en langage naturel : forme explicite (u₀ ou u₁ premier terme, prix affine à pente décimale), relation de récurrence uₙ₊₁ = a × uₙ + b (deux cases : poissons, inscrits, capital avec frais, abonnés)",
}


def specs_45da(base):
    s = []
    vc = {"c": 2000, "p": 3, "f": 25}
    s += [
        spec(base, vc, ["1{,}03", "-25"], desc="Capital 3 %, frais 25 : 1,03 et −25"),
        spec(base, vc, ["1.03", "-25"], desc="Écriture 1.03"),
        spec(base, vc, ["0{,}03", "-25"], "incorrect", "Erreur : 0,03 (le taux)", "Tu as donné le taux : augmenter de $3\\,\\%$, c'est multiplier par $1 + \\dfrac{3}{100}$."),
        spec(base, vc, ["0{,}97", "-25"], "incorrect", "Erreur : 0,97", "Le capital augmente : on multiplie par $1 + \\dfrac{3}{100}$, pas par $1 - \\dfrac{3}{100}$."),
        spec(base, vc, ["1{,}3", "-25"], "incorrect", "Erreur : 1,3", "$3\\,\\%$, c'est $\\dfrac{3}{100}$ et non $\\dfrac{3}{10}$."),
        spec(base, vc, ["1{,}03", "25"], "incorrect", "Erreur : +25", "Les frais sont retirés du capital : on ajoute $-25$."),
        spec(base, vc, ["1{,}03", "-25{,}75"], "incorrect", "Erreur : frais multipliés", "Les frais sont prélevés après les intérêts : ils ne sont pas multipliés par le coefficient."),
    ]
    va = {"m": 5000, "p": 75, "a": 400}
    s += [
        spec(base + 1, va, ["0{,}75", "400"], desc="Abonnés 75 %, +400"),
        spec(base + 1, va, ["0{,}25", "400"], "incorrect", "Erreur : 0,25", "Tu as pris la part des abonnés qui partent : on garde $75\\,\\%$ des abonnés."),
        spec(base + 1, va, ["1{,}75", "400"], "incorrect", "Erreur : 1,75", "Garder $75\\,\\%$ des abonnés, c'est multiplier par $\\dfrac{75}{100}$, pas par $1 + \\dfrac{75}{100}$."),
        spec(base + 1, va, ["75", "400"], "incorrect", "Erreur : 75", "Un pourcentage s'écrit sous forme décimale : $75\\,\\%=\\dfrac{ 75 }{100}$."),
        spec(base + 1, va, ["0{,}75", "-400"], "incorrect", "Erreur : −400", "Les nouveaux abonnés s'ajoutent : le nombre à ajouter est positif."),
        spec(base + 1, va, ["0{,}75", "300"], "incorrect", "Erreur : 0,75 × 400", "Les nouveaux abonnés s'ajoutent après les réabonnements : on ne leur applique pas le pourcentage."),
    ]
    vl = {"f": 45, "k": 25}
    s += [
        spec(base + 2, vl, ["45+0{,}25n"], desc="Location 45 € + 0,25 €/km"),
        spec(base + 2, vl, ["0{,}25n+45"], desc="Écriture 0,25n + 45"),
        spec(base + 2, vl, ["0{,}25+45n"], "incorrect", "Erreur : 0,25 + 45n", "Le forfait est payé une seule fois : c'est le prix au kilomètre qui est multiplié par $n$."),
        spec(base + 2, vl, ["45+25n"], "incorrect", "Erreur : 45 + 25n", "Le prix au kilomètre est donné en euros, pas en centimes."),
        spec(base + 2, vl, ["0{,}25n"], "incorrect", "Erreur : forfait oublié", "Tu as oublié le forfait de $45~\\unit{€}$."),
    ]
    vp = {"t": 22, "k": 5}
    s += [
        spec(base + 3, vp, ["22-0{,}05n"], desc="Plongée 22 °C, −0,05 °C/m"),
        spec(base + 3, vp, ["-0{,}05n+22"], desc="Écriture −0,05n + 22"),
        spec(base + 3, vp, ["22+0{,}05n"], "incorrect", "Erreur : hausse", "La température baisse : le coefficient de $n$ est négatif."),
        spec(base + 3, vp, ["22-0{,}5n"], "incorrect", "Erreur : virgule", "Attention à la virgule : la baisse est de $0{,}05~\\unit{°C}$ par mètre."),
        spec(base + 3, vp, ["-0{,}05+22n"], "incorrect", "Erreur : termes échangés", "La température de surface ne se multiplie pas par $n$ : c'est la baisse par mètre qui est multipliée par $n$."),
    ]
    return s


AJOUTS["45da9678"]["specs"] = specs_45da

# ---------------------------------------------------------------------------
# 7703e625 — Calculer un terme
# ---------------------------------------------------------------------------
v_poly = {
    "blanks": [
        {
            "expectedAnswer": "{{eval:a*k^2+b*k+c}}",
            "expectedErrors": [
                err("{{eval:(a*k)^2+b*k+c}}", "Le carré ne porte que sur $n$ : ${{a}}n^2$, c'est ${{a}}\\times n^2$ et non $({{a}}n)^2$.", "Carré du produit"),
                err("{{eval:2*a*k+b*k+c}}", "$n^2$, c'est $n\\times n$ et non $2\\times n$.", "Carré pris pour un double"),
                err("{{eval:a*k^2+b+c}}", "Le terme ${{b}}n$ dépend aussi de $n$ : remplace $n$ par ${{k}}$ partout.", "n oublié dans le terme du premier degré"),
            ],
        }
    ],
    "statement": "Calcule le terme demandé.\n\n$$u_n={{a}}n^2{{eval:b;+}}n{{eval:c;+}}$$\n\n$u_{ {{k}} }=?$",
    "variables": [var("a", "1..5;±"), var("b", "1..9;±"), var("c", "1..9;±"), var("k", "2..6")],
    "correction": {
        "steps": [
            "On remplace $n$ par $" + tc("{{k}}") + "$ partout, en calculant d'abord le carré.",
            "$u_{ {{k}} }={{eval:a;()}}\\times" + tc("{{k}}") + "^2+{{eval:b;()}}\\times" + tc("{{k}}") + "+{{eval:c;()}}={{eval:a*k^2}}{{eval:b*k;+}}{{eval:c;+}}={{solution}}$",
        ]
    },
    "hint": "Remplace $n$ par ${{k}}$ partout, et calcule le carré avant de multiplier.",
}
v_homo = {
    "blankDefaults": {"acceptDecimal": True},
    "blanks": [
        {
            "expectedAnswer": "{{eval:(a*k+b)/(c*k+d)}}",
            "expectedErrors": [
                err("{{eval:(a+b)/(c+d)}}", "On ne simplifie pas par $n$ dans une somme : remplace $n$ par ${{k}}$ en haut et en bas.", "Simplification par n"),
                err("{{eval:(c*k+d)/(a*k+b)}}", "Tu as inversé le numérateur et le dénominateur.", "Fraction inversée"),
                err("{{eval:a/c}}", "Tu n'as gardé que les coefficients de $n$ : remplace $n$ par ${{k}}$ partout.", "Coefficients de n seuls"),
            ],
        }
    ],
    "statement": "Calcule le terme demandé et donne sa valeur exacte.\n\n$$u_n=\\dfrac{ {{a}}n{{eval:b;+}} }{ {{c}}n+{{d}} }$$\n\n$u_{ {{k}} }=?$",
    "variables": [var("a", "1..5;±"), var("b", "1..9;±"), var("c", "1..4"), var("d", "1..9"), var("k", "2..6")],
    "conditions": ["a*d-b*c != 0", "a*k+b != 0", "mod(a*k+b, c*k+d) != 0"],
    "correction": {
        "steps": [
            "On remplace $n$ par $" + tc("{{k}}") + "$ au numérateur et au dénominateur.",
            "$u_{ {{k}} }=\\dfrac{ {{a}}\\times" + tc("{{k}}") + "{{eval:b;+}} }{ {{c}}\\times" + tc("{{k}}") + "+{{d}} }=\\dfrac{ {{eval:a*k+b}} }{ {{eval:c*k+d}} }={{solution}}$",
        ]
    },
    "hint": "Remplace $n$ par ${{k}}$ au numérateur et au dénominateur, puis simplifie la fraction obtenue.",
}
AJOUTS["7703e625"] = {
    "variations": [v_poly, v_homo],
    "description": "A l'aide d'une formule explicite (affine, an², (−1)ⁿ, n² − bn, (−1)ⁿ × n, an² + bn + c, quotient (an + b)/(cn + d))",
}


def specs_7703(base):
    vp = {"a": -2, "b": 3, "c": -4, "k": 3}  # -18+9-4 = -13
    s = [
        spec(base, vp, ["-13"], desc="u_n = −2n² + 3n − 4 : u_3 = −13"),
        spec(base, {"a": 1, "b": -5, "c": 6, "k": 4}, ["2"], desc="u_n = n² − 5n + 6 : u_4 = 2"),
        spec(base, vp, ["-18+9-4"], "bad_form", "calcul non effectué", violations=["form"]),
        spec(base, vp, ["41"], "incorrect", "(−2×3)² = 36", "Le carré ne porte que sur $n$ : $-2 n^2$, c'est $-2\\times n^2$ et non $\\left( -2 n \\right)^2$."),
        spec(base, vp, ["-7"], "incorrect", "n² pris pour 2n", "$n^2$, c'est $n\\times n$ et non $2\\times n$."),
        spec(base, vp, ["-19"], "incorrect", "bn sans n", "Le terme $3 n$ dépend aussi de $n$ : remplace $n$ par $3$ partout."),
    ]
    vh = {"a": 2, "b": 1, "c": 1, "d": 3, "k": 3}  # 7/6
    s += [
        spec(base + 1, vh, ["\\frac{7}{6}"], desc="(2n+1)/(n+3), u_3 = 7/6"),
        spec(base + 1, vh, ["\\frac{14}{12}"], "unoptimal_form", "14/12 : juste, fraction à simplifier", violations=["reducedFractions"]),
        spec(base + 1, {"a": 3, "b": -1, "c": 2, "d": 2, "k": 2}, ["\\frac{5}{6}"], desc="(3n−1)/(2n+2), u_2 = 5/6"),
        spec(base + 1, {"a": 1, "b": -1, "c": 1, "d": 1, "k": 3}, ["0{,}5"], desc="(n−1)/(n+1), u_3 = 2/4 : écriture décimale 0,5"),
        spec(base + 1, vh, ["\\frac{3}{4}"], "incorrect", "simplification par n", "On ne simplifie pas par $n$ dans une somme : remplace $n$ par $3$ en haut et en bas."),
        spec(base + 1, vh, ["\\frac{6}{7}"], "incorrect", "fraction inversée", "Tu as inversé le numérateur et le dénominateur."),
        spec(base + 1, vh, ["2"], "incorrect", "a/c", "Tu n'as gardé que les coefficients de $n$ : remplace $n$ par $3$ partout."),
    ]
    return s


AJOUTS["7703e625"]["specs"] = specs_7703

# ---------------------------------------------------------------------------
# cea65372 — géométrique, récurrence : u(n+1) = u(n) ± p % de u(n)
# ---------------------------------------------------------------------------
v_pct = {
    "blanks": [{"expectedAnswer": "0"}],
    "statement": "La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$ :\n\n$$u_{n+1}=u_n{{if:sg>0|+|-}}{{eval:p/100;d}}\\,u_n$$\n\nCette suite est-elle géométrique ?\n\n" + CHOIX_GEO,
    "variables": [var("a", "1..9;±"), var("p", "5|10|20|30|40|50|60"), var("sg", "1|-1")],
    "correction": {
        "steps": [
            "On factorise par $u_n$ : $u_{n+1}=\\left(1{{if:sg>0|+|-}}{{eval:p/100;d}}\\right)u_n=" + tc("{{eval:1+sg*p/100;d}}") + "\\times u_n$.",
            "On passe d'un terme au suivant en multipliant toujours par le même nombre : la suite est **géométrique**, de raison $q={{eval:1+sg*p/100;d}}$ et de premier terme $u_0={{a}}$.",
        ]
    },
    "hint": "Factorise le membre de droite par $u_n$.",
}
AJOUTS["cea65372"] = {
    "variations": [v_pct],
    "description": "u(n+1) = q u(n), u(n)/k ou u(n) ± p % de u(n), ou non : u(n) + r, p u(n) + b, u(n) + kn",
}


def specs_cea(base):
    v = {"a": 3, "p": 40, "sg": 1}
    return [
        spec(base, v, ["0"], desc="u(n+1) = u(n) + 0,4 u(n) : « oui » accepté"),
        spec(base, v, ["1"], "incorrect", "« non » refusé"),
        spec(base, {"a": -2, "p": 20, "sg": -1}, ["0"], desc="u(n+1) = u(n) − 0,2 u(n) : « oui » accepté"),
    ]


AJOUTS["cea65372"]["specs"] = specs_cea

# ---------------------------------------------------------------------------
# 84114cb2 — géométrique, explicite : a/qⁿ et a × (−0,k)ⁿ
# ---------------------------------------------------------------------------
v_quot = {
    "blanks": [{"expectedAnswer": "0"}],
    "statement": "La suite $(u_n)$ est définie, pour tout entier naturel $n$, par :\n\n$$u_n=\\dfrac{ {{a}} }{ {{q}}^n}$$\n\nCette suite est-elle géométrique ?\n\n" + CHOIX_GEO,
    "variables": [var("a", "1..9;±"), var("q", "2..5")],
    "correction": {
        "steps": [
            "Pour tout entier naturel $n$, $u_n={{a}}\\times\\dfrac{1}{ {{q}}^n}={{a}}\\times" + tc("\\left(\\dfrac{1}{ {{q}} }\\right)") + "^n$.",
            "C'est la forme $u_0\\times q^n$ : la suite est **géométrique**, de raison $q=\\dfrac{1}{ {{q}} }$ et de premier terme $u_0={{a}}$.",
        ]
    },
    "hint": "Essaie d'écrire $u_n$ sous la forme $u_0\\times q^n$.",
}
v_dec = {
    "blanks": [{"expectedAnswer": "0"}],
    "statement": "La suite $(u_n)$ est définie, pour tout entier naturel $n$, par :\n\n$$u_n={{a}}\\times\\left({{eval:-k/10;d}}\\right)^n$$\n\nCette suite est-elle géométrique ?\n\n" + CHOIX_GEO,
    "variables": [var("a", "1..9;±"), var("k", "1..9")],
    "correction": {
        "steps": [
            "$\\dfrac{u_{n+1}}{u_n}=\\dfrac{ {{a}}\\times\\left({{eval:-k/10;d}}\\right)^{n+1} }{ {{a}}\\times\\left({{eval:-k/10;d}}\\right)^n}=" + tc("{{eval:-k/10;d}}") + "$.",
            "On passe d'un terme au suivant en multipliant toujours par ${{eval:-k/10;d}}$ : la suite est **géométrique**, de raison $q={{eval:-k/10;d}}$ et de premier terme $u_0={{a}}$.",
        ]
    },
    "hint": "Compare $u_n$ à la forme $u_0\\times q^n$ : une raison peut être négative.",
}
AJOUTS["84114cb2"] = {
    "variations": [v_quot, v_dec],
    "description": "u(n) = u(0) × qⁿ (q entier, décimal ou négatif), a/qⁿ, ou non : u(n) = an + b, n² + c, kⁿ + c",
}


def specs_841(base):
    return [
        spec(base, {"a": 6, "q": 4}, ["0"], desc="6/4ⁿ : « oui » accepté"),
        spec(base, {"a": 6, "q": 4}, ["1"], "incorrect", "6/4ⁿ : « non » refusé"),
        spec(base + 1, {"a": 5, "k": 3}, ["0"], desc="5 × (−0,3)ⁿ : « oui » accepté"),
        spec(base + 1, {"a": 5, "k": 3}, ["1"], "incorrect", "5 × (−0,3)ⁿ : « non » refusé"),
    ]


AJOUTS["84114cb2"]["specs"] = specs_841

# ---------------------------------------------------------------------------
# d2943133 — arithmétique, explicite : (an² + bn)/n
# ---------------------------------------------------------------------------
v_frac = {
    "blanks": [{"expectedAnswer": "0"}],
    "statement": "La suite $(u_n)$ est définie, pour tout entier naturel $n\\geqslant1$, par :\n\n$$u_n=\\dfrac{ {{a}}n^2{{eval:b;+}}n}{n}$$\n\nCette suite est-elle arithmétique ?\n\n" + CHOIX_ARI,
    "variables": [var("a", "2..9"), var("b", "1..9;±")],
    "correction": {
        "steps": [
            "Pour $n\\geqslant1$, $n\\neq0$ : on simplifie par $n$. $$u_n=\\dfrac{n\\left({{a}}n{{eval:b;+}}\\right)}{n}={{a}}n{{eval:b;+}}$$",
            "$u_{n+1}-u_n={{a}}(n+1){{eval:b;+}}-\\left({{a}}n{{eval:b;+}}\\right)=" + tc("{{a}}") + "$ : la différence ne dépend pas de $n$, la suite est **arithmétique**, de raison $r={{a}}$ et de premier terme $u_1={{eval:a+b}}$.",
        ]
    },
    "hint": "Simplifie d'abord la fraction : c'est possible car $n\\neq0$.",
}
AJOUTS["d2943133"] = {
    "variations": [v_frac],
    "description": "u(n) = an + b ou (an² + bn)/n, ou non : u(n) = u(0) × qⁿ, n² + c, kⁿ + c",
}


def specs_d29(base):
    return [
        spec(base, {"a": 3, "b": 5}, ["0"], desc="(3n² + 5n)/n : « oui » accepté"),
        spec(base, {"a": 3, "b": 5}, ["1"], "incorrect", "(3n² + 5n)/n : « non » refusé"),
    ]


AJOUTS["d2943133"]["specs"] = specs_d29

# ---------------------------------------------------------------------------
# 727fb88a et cf51cb93 — terme d'une suite géométrique, raison décimale, arrondi au dixième
# ---------------------------------------------------------------------------
COND_ARRONDI = [
    "abs(10*(v)-floor(10*(v))-0.5) > 0.05",
    "mod(round(10*abs(v)),10) != 0",
    "abs(v) < 10000",
    "abs(v) > 1",
]


def v_terme_dec(depuis_up):
    vars_ = [var("kq", "8..29!10,20"), var("sg", "1|-1"), var("q", "eval:sg*kq/10;d")]
    if depuis_up:
        vars_ += [var("p", "1..9"), var("dd", "8..11"), var("r", "eval:p+dd"), var("a", "1..5;±")]
        expo = "dd"
        intro = "$(u_n)$ est une suite géométrique de raison ${{q}}$, et $u_{ {{p}} }={{a}}$."
        d0 = "u_{ {{p}} }"
    else:
        vars_ += [var("r", "8..11"), var("a", "1..5;±")]
        expo = "r"
        intro = "$(u_n)$ est la suite géométrique de premier terme $u_0={{a}}$ et de raison ${{q}}$."
        d0 = "u_0"
    vars_.append(var("v", "eval:a*(q)^%s;d" % expo))
    rnd = "{{eval:round(10*(v))/10;d}}"
    errs = [
        err("{{eval:round(10*(a)*(q)^(%s-1))/10;d}}" % expo, "Tu as multiplié une fois de trop ou de moins : de $%s$ à $u_{ {{r}} }$, la puissance de $q$ est ${{%s}}$." % (d0, expo), "Exposant décalé d'un rang"),
        err("{{eval:round(10*((a)*(q))^(%s))/10;d}}" % expo, "Seule la raison est élevée à la puissance : ${{a}}\\times q^{ {{%s}} }$, pas $({{a}}\\times q)^{ {{%s}} }$." % (expo, expo), "Puissance du produit"),
        err("{{eval:round(10*(a)*(q)*(%s))/10;d}}" % expo, "On multiplie ${{%s}}$ fois par $q$ : c'est une puissance, pas un produit par ${{%s}}$." % (expo, expo), "Produit au lieu de puissance"),
    ]
    steps = []
    if depuis_up:
        steps.append("De $u_{ {{p}} }$ à $u_{ {{r}} }$, on avance de ${{r}}-{{p}}={{dd}}$ rangs : on multiplie ${{dd}}$ fois par la raison $" + tc("{{q}}") + "$.")
        steps.append("$u_{ {{r}} }=u_{ {{p}} }\\times q^{ {{dd}} }={{a}}\\times" + tc("\\left({{q}}\\right)") + "^{ {{dd}} }\\approx{{eval:round(1000*(v))/1000;d}}$, soit $u_{ {{r}} }\\approx" + rnd + "$ au dixième.")
    else:
        steps.append("Pour une suite géométrique, $u_n=u_0\\times q^n$ : on multiplie $u_0$ par la raison $" + tc("{{q}}") + "$, ${{r}}$ fois de suite.")
        steps.append("$u_{ {{r}} }={{a}}\\times" + tc("\\left({{q}}\\right)") + "^{ {{r}} }\\approx{{eval:round(1000*(v))/1000;d}}$, soit $u_{ {{r}} }\\approx" + rnd + "$ au dixième.")
    return {
        "blankDefaults": {"acceptDecimal": True},
        "blanks": [{"expectedAnswer": rnd, "precision": {"type": "decimal", "digits": 1}, "expectedErrors": errs}],
        "statement": intro + "\n\nCalcule $u_{ {{r}} }$, arrondi au dixième.\n\n$u_{ {{r}} }\\approx ?$",
        "variables": vars_,
        "conditions": COND_ARRONDI,
        "correction": {"steps": steps},
        "hint": ("Combien de fois multiplie-t-on par la raison pour passer de $u_{ {{p}} }$ à $u_{ {{r}} }$ ? Utilise la touche puissance de la calculatrice."
                 if depuis_up else "Utilise $u_n=u_0\\times q^n$ et la touche puissance de la calculatrice, puis arrondis au dixième."),
    }


AJOUTS["727fb88a"] = {
    "variations": [v_terme_dec(False)],
    "description": "Calculer u_n à partir de u_0 et de la raison (raison entière, ou décimale avec un arrondi au dixième)",
}
AJOUTS["cf51cb93"] = {
    "variations": [v_terme_dec(True)],
    "description": "Calculer un terme à partir d'un autre (raison entière, ou décimale avec un arrondi au dixième)",
}


def specs_727(base):
    # u0 = 3, q = 1,3, u_9 = 3 × 1,3⁹ = 31,8135… → 31,8
    v = {"kq": 13, "sg": 1, "r": 9, "a": 3}
    vn = {"kq": 8, "sg": -1, "r": 9, "a": 2}  # 2 × (−0,8)⁹ = −0,268… : refusé par |v| > 1 → autre
    vn = {"kq": 15, "sg": -1, "r": 9, "a": 2}  # 2 × (−1,5)⁹ = −76,88… → −76,9
    return [
        spec(base, v, ["31{,}8"], desc="u0 = 3, q = 1,3 : u_9 ≈ 31,8"),
        spec(base, v, ["31.8"], desc="écriture 31.8"),
        spec(base, vn, ["-76{,}9"], desc="u0 = 2, q = −1,5 : u_9 ≈ −76,9"),
        spec(base, v, ["31{,}81"], "bad_form", "trop de décimales", violations=["rounding"]),
        spec(base, v, ["24{,}5"], "incorrect", "exposant 8", "Tu as multiplié une fois de trop ou de moins : de $u_0$ à $u_9$, la puissance de $q$ est $9$."),
        spec(base, v, ["208\\,728{,}4"], "incorrect", "(3 × 1,3)⁹", "Seule la raison est élevée à la puissance : $3\\times q^{ 9 }$, pas $(3\\times q)^{ 9 }$."),
        spec(base, v, ["35{,}1"], "incorrect", "3 × 1,3 × 9", "On multiplie $9$ fois par $q$ : c'est une puissance, pas un produit par $9$."),
    ]


def specs_cf5(base):
    # u_2 = 3, q = 1,3, u_11 : 9 rangs → même valeur 31,8
    v = {"kq": 13, "sg": 1, "p": 2, "dd": 9, "a": 3}
    vn = {"kq": 15, "sg": -1, "p": 4, "dd": 9, "a": 2}
    return [
        spec(base, v, ["31{,}8"], desc="u_2 = 3, q = 1,3 : u_11 ≈ 31,8"),
        spec(base, v, ["31.8"], desc="écriture 31.8"),
        spec(base, vn, ["-76{,}9"], desc="u_4 = 2, q = −1,5 : u_13 ≈ −76,9"),
        spec(base, v, ["31{,}81"], "bad_form", "trop de décimales", violations=["rounding"]),
        spec(base, v, ["24{,}5"], "incorrect", "exposant 8", "Tu as multiplié une fois de trop ou de moins : de $u_2$ à $u_{11}$, la puissance de $q$ est $9$."),
        spec(base, v, ["208\\,728{,}4"], "incorrect", "(3 × 1,3)⁹", "Seule la raison est élevée à la puissance : $3\\times q^{ 9 }$, pas $(3\\times q)^{ 9 }$."),
        spec(base, v, ["35{,}1"], "incorrect", "3 × 1,3 × 9", "On multiplie $9$ fois par $q$ : c'est une puissance, pas un produit par $9$."),
    ]


AJOUTS["727fb88a"]["specs"] = specs_727
AJOUTS["cf51cb93"]["specs"] = specs_cf5

# ---------------------------------------------------------------------------
# 85afd455 — raison géométrique, deux rangs d'écart, signe de q donné
# ---------------------------------------------------------------------------
v_deux = {
    "blanks": [
        {
            "expectedAnswer": "{{q}}",
            "expectedErrors": [
                err("{{eval:-q}}", "$q^2={{eval:q^2}}$ a deux solutions : l'énoncé dit que la raison est {{if:q<0|négative|positive}}.", "Mauvais signe"),
                err("{{eval:q^2}}", "Le quotient $\\dfrac{u_{ {{eval:p+2}} }}{u_{ {{p}} }}$ vaut $q^2$ : il reste à trouver $q$.", "q² au lieu de q"),
                err("{{eval:(c*q^2-c)/2}}", "La suite est géométrique : on passe d'un terme au suivant en multipliant, pas en ajoutant.", "Raison arithmétique"),
            ],
        }
    ],
    "statement": "$(u_n)$ est une suite géométrique de raison {{if:q<0|négative|positive}}, avec $u_{ {{p}} }={{c}}$ et $u_{ {{eval:p+2}} }={{eval:c*q^2}}$.\n\nDétermine la raison.\n\nLa raison est $?$.",
    "variables": [var("p", "1..12"), var("c", "1..5;±"), var("q", "2..5;±")],
    "correction": {
        "steps": [
            "On passe de $u_{ {{p}} }$ à $u_{ {{eval:p+2}} }$ en multipliant deux fois par $q$ : $u_{ {{eval:p+2}} }=u_{ {{p}} }\\times q^2$, donc $q^2=\\dfrac{ {{eval:c*q^2}} }{ {{c}} }={{eval:q^2}}$.",
            "$q^2={{eval:q^2}}$ donne $q={{eval:abs(q)}}$ ou $q=-{{eval:abs(q)}}$. La raison est {{if:q<0|négative|positive}} : $q=" + tc("{{q}}") + "$.",
        ]
    },
    "hint": "Pour passer de $u_{ {{p}} }$ à $u_{ {{eval:p+2}} }$, on multiplie deux fois par la raison $q$.",
}
AJOUTS["85afd455"] = {
    "variations": [v_deux],
    "description": "À partir de deux termes consécutifs, ou de deux termes à deux rangs d'écart (signe de la raison donné)",
}


def specs_85a(base):
    v = {"p": 3, "c": 2, "q": -3}
    vp = {"p": 5, "c": -4, "q": 2}
    return [
        spec(base, v, ["-3"], desc="u_3 = 2, u_5 = 18, q < 0 : −3"),
        spec(base, vp, ["2"], desc="u_5 = −4, u_7 = −16, q > 0 : 2"),
        spec(base, v, ["3"], "incorrect", "mauvais signe", "$q^2 = 9$ a deux solutions : l'énoncé dit que la raison est négative."),
        spec(base, v, ["9"], "incorrect", "q² au lieu de q", "Le quotient $\\dfrac{u_{ 5 }}{u_{ 3 }}$ vaut $q^2$ : il reste à trouver $q$."),
        spec(base, v, ["8"], "incorrect", "(18 − 2)/2", "La suite est géométrique : on passe d'un terme au suivant en multipliant, pas en ajoutant."),
    ]


AJOUTS["85afd455"]["specs"] = specs_85a

# ---------------------------------------------------------------------------
# 65e96f31 — terme général arithmétique, par récurrence (r entier, r décimal)
# ---------------------------------------------------------------------------
def v_ari_rec(decimal):
    if decimal:
        vars_ = [var("a", "1..9;±"), var("kr", "1..49!10,20,30,40"), var("sg", "1|-1"), var("r", "eval:sg*kr/10;d")]
        rd = "{{eval:r;d}}"
        rp = "{{eval:r;+;d}}"
        rpar = "{{eval:r;();d}}"
    else:
        vars_ = [var("a", "1..9;±"), var("r", "1..9;±")]
        rd = "{{r}}"
        rp = "{{eval:r;+}}"
        rpar = "{{eval:r;()}}"
    v = {
        "blanks": [
            {
                "expectedAnswer": "{{a}}" + rp + "n",
                "expectedErrors": [
                    err(rd + "{{eval:a;+}}n", "Tu as échangé le premier terme et la raison : $u_n=u_0+n\\times r$.", "u₀ et r échangés"),
                    err("{{a}}" + rp + "(n-1)", "Le premier terme est $u_0$ : $u_n=u_0+n\\times r$, sans $n-1$.", "Formule de u₁"),
                    err("{{a}}\\times" + rpar + "^n", "On ajoute la même raison à chaque rang : la suite est arithmétique, pas géométrique.", "Confusion avec le géométrique"),
                ],
            }
        ],
        "blankDefaults": {"acceptDecimal": True} if decimal else None,
        "statement": "La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$ :\n\n$$u_{n+1}=u_n" + rp + "$$\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$",
        "variables": vars_,
        "correction": {
            "steps": [
                "À chaque rang, on ajoute le même nombre $" + tc(rd) + "$ : $(u_n)$ est arithmétique, de raison $r=" + rd + "$ et de premier terme $u_0={{a}}$.",
                "$u_n=u_0+n\\times r={{a}}+n\\times" + tc(rpar) + "={{solution}}$",
            ]
        },
        "hint": "Quelle est la nature de la suite ? Repère son premier terme et sa raison.",
    }
    if not decimal:
        del v["blankDefaults"]
    return v


AJOUTS["65e96f31"] = {
    "variations": [v_ari_rec(False), v_ari_rec(True)],
    "description": "À partir de u_0 et de la raison, ou de la relation de récurrence (raison entière ou décimale)",
}


def specs_65e(base):
    v = {"a": 5, "r": 3}
    vd = {"a": 4, "kr": 25, "sg": -1}
    return [
        spec(base, v, ["5+3n"], desc="u0 = 5, u(n+1) = u(n) + 3 : 5 + 3n"),
        spec(base, v, ["3n+5"], desc="ordre inversé 3n + 5"),
        spec(base, {"a": -2, "r": -7}, ["-2-7n"], desc="u0 = −2, r = −7 : −2 − 7n"),
        spec(base, v, ["3+5n"], "incorrect", "u0 et r échangés", "Tu as échangé le premier terme et la raison : $u_n=u_0+n\\times r$."),
        spec(base, v, ["5+3(n-1)"], "incorrect", "formule de u1", "Le premier terme est $u_0$ : $u_n=u_0+n\\times r$, sans $n - 1$."),
        spec(base, v, ["5\\times3^n"], "incorrect", "géométrique", "On ajoute la même raison à chaque rang : la suite est arithmétique, pas géométrique."),
        spec(base + 1, vd, ["4-2{,}5n"], desc="u0 = 4, r = −2,5 : 4 − 2,5n"),
        spec(base + 1, vd, ["-2{,}5n+4"], desc="ordre inversé −2,5n + 4"),
        spec(base + 1, vd, ["-2{,}5+4n"], "incorrect", "u0 et r échangés", "Tu as échangé le premier terme et la raison : $u_n=u_0+n\\times r$."),
        spec(base + 1, vd, ["4-2{,}5(n-1)"], "incorrect", "formule de u1", "Le premier terme est $u_0$ : $u_n=u_0+n\\times r$, sans $n - 1$."),
        spec(base + 1, vd, ["4\\times(-2{,}5)^n"], "incorrect", "géométrique", "On ajoute la même raison à chaque rang : la suite est arithmétique, pas géométrique."),
    ]


AJOUTS["65e96f31"]["specs"] = specs_65e

# ---------------------------------------------------------------------------
# e67b1cbd — terme général géométrique, par récurrence
# ---------------------------------------------------------------------------
v_geo_rec = {
    "blanks": [
        {
            "expectedAnswer": "{{a}}*{{eval:q;()}}^n",
            "expectedErrors": [
                err("{{a}}*{{eval:q;()}}^{n-1}", "Le premier terme est $u_0$ : $u_n=u_0\\times q^n$, sans $n-1$.", "Formule de u₁"),
                err("{{eval:a*q}}^n", "Seule la raison est élevée à la puissance $n$ : $u_0\\times q^n$, pas $(u_0\\times q)^n$.", "Coefficient dans la puissance"),
                err("{{a}}{{eval:q;+}}n", "On multiplie par la même raison à chaque rang : la suite est géométrique, pas arithmétique.", "Confusion avec l'arithmétique"),
            ],
        }
    ],
    "statement": "La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$ :\n\n$$u_{n+1}={{q}}u_n$$\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$",
    "variables": [var("a", "2..9;±"), var("q", "2..5;±")],
    "correction": {
        "steps": [
            "À chaque rang, on multiplie par le même nombre $" + tc("{{q}}") + "$ : $(u_n)$ est géométrique, de raison $q={{q}}$ et de premier terme $u_0={{a}}$.",
            "$u_n=u_0\\times q^n={{a}}\\times" + tc("{{eval:q;()}}") + "^n$",
        ]
    },
    "hint": "Quelle est la nature de la suite ? Repère son premier terme et sa raison.",
}
AJOUTS["e67b1cbd"] = {
    "variations": [v_geo_rec],
    "description": "À partir de u_0 et de la raison, ou de la relation de récurrence u(n+1) = q u(n)",
}


def specs_e67(base):
    v = {"a": 3, "q": 2}
    vn = {"a": -5, "q": -3}
    return [
        spec(base, v, ["3\\times2^n"], desc="u0 = 3, u(n+1) = 2u(n) : 3 × 2ⁿ"),
        spec(base, v, ["2^n\\times3"], desc="ordre inversé"),
        spec(base, vn, ["-5\\times(-3)^n"], desc="u0 = −5, q = −3"),
        spec(base, vn, ["-5\\times3^n"], "incorrect", "parenthèses oubliées"),
        spec(base, v, ["3\\times2^{n-1}"], "incorrect", "formule de u1", "Le premier terme est $u_0$ : $u_n=u_0\\times q^n$, sans $n - 1$."),
        spec(base, v, ["6^n"], "incorrect", "6ⁿ", "Seule la raison est élevée à la puissance $n$ : $u_0\\times q^n$, pas $(u_0\\times q)^n$."),
        spec(base, v, ["3+2n"], "incorrect", "arithmétique", "On multiplie par la même raison à chaque rang : la suite est géométrique, pas arithmétique."),
    ]


AJOUTS["e67b1cbd"]["specs"] = specs_e67

# ---------------------------------------------------------------------------
# 44b32cad — somme arithmétique : à partir d'un rang p ; somme écrite en entier
# ---------------------------------------------------------------------------
v_somme_p = {
    "blanks": [
        {
            "expectedAnswer": "{{s}}",
            "expectedErrors": [
                err("{{eval:(nn-1)*(f+l)/2}}", "De $u_{ {{p}} }$ à $u_{ {{m}} }$, il y a ${{nn}}$ termes, et non ${{eval:nn-1}}$.", "Un terme de moins"),
                err("{{eval:nn*(f+l)}}", "Tu as oublié de diviser par $2$.", "Division par 2 oubliée"),
                err("{{eval:nn*(a+l)/2}}", "La somme commence à $u_{ {{p}} }$ : le premier terme est $u_{ {{p}} }$, pas $u_0$.", "u₀ pris pour premier terme"),
            ],
        }
    ],
    "statement": "$(u_n)$ est la suite arithmétique de premier terme $u_0={{a}}$ et de raison $r={{r}}$.\n\nCalcule $S=u_{ {{p}} }+u_{ {{eval:p+1}} }+\\cdots+u_{ {{m}} }$.\n\n$S=?$",
    "variables": [
        var("a", "1..20;±"), var("r", "2..9;±"), var("p", "5..50"), var("nn", "8..20"),
        var("m", "eval:p+nn-1"), var("f", "eval:a+p*r"), var("l", "eval:a+m*r"), var("s", "eval:nn*(f+l)/2"),
    ],
    "conditions": ["s != 0", "f+l != 0", "abs(s) < 10000", "f != 0", "l != 0"],
    "correction": {
        "steps": [
            "De $u_{ {{p}} }$ à $u_{ {{m}} }$, il y a ${{m}}-{{p}}+1=\\mathbf{ {{nn}} }$ termes.",
            "Premier terme : $u_{ {{p}} }=u_0+{{p}}r={{a}}+{{p}}\\times{{eval:r;()}}={{f}}$. Dernier terme : $u_{ {{m}} }=u_0+{{m}}r={{a}}+{{m}}\\times{{eval:r;()}}={{l}}$.",
            "$$S=\\text{nombre de termes}\\times\\dfrac{\\text{premier}+\\text{dernier}}{2}$$",
            "$$S={{nn}}\\times\\dfrac{ {{f}}{{eval:l;+}} }{2}={{nn}}\\times\\dfrac{ {{eval:f+l}} }{2}=" + tc("{{s}}") + "$$",
        ]
    },
    "hint": "Compte les termes de la somme, puis calcule son premier et son dernier terme.",
}
v_somme_ext = {
    "blanks": [
        {
            "expectedAnswer": "{{s}}",
            "expectedErrors": [
                err("{{eval:(nn-1)*(f+l)/2}}", "Il y a ${{nn}}$ termes : $\\dfrac{ {{l}}-{{f}} }{ {{r}} }$ compte les écarts, il faut ajouter $1$.", "Un terme de moins"),
                err("{{eval:nn*(f+l)}}", "Tu as oublié de diviser par $2$.", "Division par 2 oubliée"),
                err("{{eval:nn*(l-f)/2}}", "On ajoute le premier et le dernier terme, on ne les soustrait pas.", "Dernier moins premier"),
            ],
        }
    ],
    "statement": "Les termes de la somme ci-dessous sont des termes consécutifs d'une suite arithmétique.\n\n$$S={{f}}+{{eval:f+r}}+{{eval:f+2*r}}+\\cdots+{{l}}$$\n\nCalcule $S$.\n\n$S=?$",
    "variables": [var("f", "1..20"), var("r", "2..9"), var("nn", "10..25"), var("l", "eval:f+(nn-1)*r"), var("s", "eval:nn*(f+l)/2")],
    "correction": {
        "steps": [
            "La raison est $r={{eval:f+r}}-{{f}}={{r}}$.",
            "Nombre de termes : de ${{f}}$ à ${{l}}$, on ajoute $\\dfrac{ {{l}}-{{f}} }{ {{r}} }={{eval:nn-1}}$ fois la raison, donc il y a ${{eval:nn-1}}+1=\\mathbf{ {{nn}} }$ termes.",
            "$$S=\\text{nombre de termes}\\times\\dfrac{\\text{premier}+\\text{dernier}}{2}={{nn}}\\times\\dfrac{ {{f}}+{{l}} }{2}=" + tc("{{s}}") + "$$",
        ]
    },
    "hint": "Trouve la raison, puis le nombre de termes : combien de fois ajoute-t-on la raison pour aller de ${{f}}$ à ${{l}}$ ?",
}
AJOUTS["44b32cad"] = {
    "variations": [v_somme_p, v_somme_ext],
    "description": "Nombre de termes × (premier + dernier) / 2 : depuis u₀, u₁ ou un rang p, ou somme écrite en entier",
}


def specs_44b(base):
    # a = 2, r = 3, p = 10, nn = 10 : f = 32, m = 19, l = 59, s = 10 × 91 / 2 = 455
    v = {"a": 2, "r": 3, "p": 10, "nn": 10}
    # f = 5, r = 3, nn = 23 : l = 71, s = 23 × 76 / 2 = 874
    ve = {"f": 5, "r": 3, "nn": 23}
    return [
        spec(base, v, ["455"], desc="u0 = 2, r = 3, de u10 à u19 : 455"),
        spec(base, {"a": 5, "r": -2, "p": 6, "nn": 8}, ["-112"], desc="u0 = 5, r = −2, de u6 à u13 : 8 × (−7 − 21)/2 = −112"),
        spec(base, v, ["5\\times91"], "bad_form", "calcul non effectué", violations=["form"]),
        spec(base, v, ["409{,}5"], "incorrect", "9 termes", "De $u_{10}$ à $u_{19}$, il y a $10$ termes, et non $9$."),
        spec(base, v, ["910"], "incorrect", "sans /2", "Tu as oublié de diviser par $2$."),
        spec(base, v, ["305"], "incorrect", "u0 premier", "La somme commence à $u_{10}$ : le premier terme est $u_{10}$, pas $u_0$."),
        spec(base + 1, ve, ["874"], desc="5 + 8 + … + 71 = 874"),
        spec(base + 1, ve, ["836"], "incorrect", "22 termes", "Il y a $23$ termes : $\\dfrac{71 - 5}{3}$ compte les écarts, il faut ajouter $1$."),
        spec(base + 1, ve, ["1\\,748"], "incorrect", "sans /2", "Tu as oublié de diviser par $2$."),
        spec(base + 1, ve, ["759"], "incorrect", "71 − 5", "On ajoute le premier et le dernier terme, on ne les soustrait pas."),
    ]


AJOUTS["44b32cad"]["specs"] = specs_44b

# ---------------------------------------------------------------------------
# b72fae4a — somme géométrique : raison décimale arrondie ; somme écrite en entier
# ---------------------------------------------------------------------------
v_geo_dec = {
    "blankDefaults": {"acceptDecimal": True},
    "blanks": [
        {
            "expectedAnswer": "{{eval:round(1000*(s))/1000;d}}",
            "precision": {"type": "decimal", "digits": 3},
            "expectedErrors": [
                err("{{eval:round(1000*(a)*(1-(q)^n)/(1-(q)))/1000;d}}", "De $u_0$ à $u_{ {{n}} }$, il y a ${{eval:n+1}}$ termes : l'exposant est ${{eval:n+1}}$.", "Un terme de moins"),
                err("{{eval:round(-1000*(s))/1000;d}}", "Attention au signe : $\\dfrac{1-q^{ {{eval:n+1}} }}{1-q}$, avec $1-q$ au dénominateur.", "Signe inversé"),
                err("{{eval:round(1000*(1-(q)^(n+1))/(1-(q)))/1000;d}}", "Tu as oublié de multiplier par le premier terme $u_0={{a}}$.", "Premier terme oublié"),
            ],
        }
    ],
    "statement": "$(u_n)$ est la suite géométrique de premier terme $u_0={{a}}$ et de raison $q={{q}}$.\n\nCalcule $S=u_0+u_1+\\cdots+u_{ {{n}} }$, arrondie au millième.\n\n$S\\approx ?$",
    "variables": [
        var("a", "2..9;±"), var("kq", "2..19!10"), var("q", "eval:kq/10;d"), var("n", "9..14"),
        var("s", "eval:(a)*(1-(q)^(n+1))/(1-(q));d"),
    ],
    "conditions": [
        "abs(1000*(s)-floor(1000*(s))-0.5) > 0.05",
        "mod(round(1000*abs(s)),10) != 0",
        "abs(s) < 10000",
    ],
    "correction": {
        "steps": [
            "De $u_0$ à $u_{ {{n}} }$, il y a $\\mathbf{ {{eval:n+1}} }$ termes.",
            "$$S=\\text{premier terme}\\times\\dfrac{1-q^{\\text{nombre de termes}}}{1-q}={{a}}\\times\\dfrac{1-{{q}}^{ {{eval:n+1}} }}{1-{{q}}}$$",
            "$S\\approx{{eval:round(100000*(s))/100000;d}}$, soit $S\\approx" + tc("{{eval:round(1000*(s))/1000;d}}") + "$ au millième.",
        ]
    },
    "hint": "Compte les termes de la somme, puis utilise $S=u_0\\times\\dfrac{1-q^{\\text{nombre de termes}}}{1-q}$.",
}


def v_geo_ext(demi):
    if demi:
        vars_ = [var("cc", "1..5"), var("nn", "5..8"), var("a", "eval:cc*2^(nn-1)"), var("s", "eval:2*a-cc")]
        termes = "{{a}}+{{eval:a/2}}+{{eval:a/4}}+{{eval:a/8}}+\\cdots+{{cc}}"
        qtxt = "\\dfrac{1}{2}"
        steps = [
            "Chaque terme est la moitié du précédent : la raison est $q=\\dfrac{ {{eval:a/2}} }{ {{a}} }=\\dfrac{1}{2}$.",
            "Nombre de termes : ${{a}}\\times\\left(\\dfrac{1}{2}\\right)^{k}={{cc}}$ pour $2^k={{eval:2^(nn-1)}}$, soit $k={{eval:nn-1}}$ : il y a ${{eval:nn-1}}+1=\\mathbf{ {{nn}} }$ termes.",
            "$$S={{a}}\\times\\dfrac{1-\\left(\\frac{1}{2}\\right)^{ {{nn}} }}{1-\\frac{1}{2}}={{a}}\\times2\\times\\left(1-\\dfrac{1}{ {{eval:2^nn}} }\\right)=" + tc("{{s}}") + "$$",
        ]
        errs = [
            err("{{eval:2*a*(1-1/2^(nn-1))}}", "Il y a ${{nn}}$ termes : compte aussi le premier.", "Un terme de moins"),
            err("{{eval:2*a*(1-1/2^(nn+1))}}", "Il y a ${{nn}}$ termes, pas ${{eval:nn+1}}$.", "Un terme de plus"),
            err("{{eval:2*a}}", "La somme est finie : $1-\\left(\\dfrac{1}{2}\\right)^{ {{nn}} }$ n'est pas égal à $1$.", "Puissance de q oubliée"),
        ]
    else:
        vars_ = [var("a", "1..5;±"), var("q", "-3|-2|2|3"), var("nn", "5..8"),
                 var("t3", "eval:a*q^3"), var("z", "eval:a*q^(nn-1)"), var("s", "eval:a*(1-q^nn)/(1-q)")]
        termes = "{{a}}{{eval:a*q;+}}{{eval:a*q^2;+}}{{if:t3>0|+|-}}\\cdots{{eval:z;+}}"
        qtxt = "{{q}}"
        steps = [
            "La raison est $q=\\dfrac{ {{eval:a*q}} }{ {{a}} }={{q}}$.",
            "Nombre de termes : ${{a}}\\times{{eval:q;()}}^{k}={{z}}$ pour $k={{eval:nn-1}}$ : il y a ${{eval:nn-1}}+1=\\mathbf{ {{nn}} }$ termes.",
            "$$S={{a}}\\times\\dfrac{1-{{eval:q;()}}^{ {{nn}} }}{1-{{eval:q;()}}}={{a}}\\times\\dfrac{ {{eval:1-q^nn}} }{ {{eval:1-q}} }=" + tc("{{s}}") + "$$",
        ]
        errs = [
            err("{{eval:a*(1-q^(nn-1))/(1-q)}}", "Il y a ${{nn}}$ termes : compte aussi le premier.", "Un terme de moins"),
            err("{{eval:a*(1-q^(nn+1))/(1-q)}}", "Il y a ${{nn}}$ termes, pas ${{eval:nn+1}}$.", "Un terme de plus"),
            err("{{eval:-s}}", "Attention au signe : $\\dfrac{1-q^{ {{nn}} }}{1-q}$, avec $1-q$ au dénominateur.", "Signe inversé"),
        ]
    return {
        "blanks": [{"expectedAnswer": "{{s}}", "expectedErrors": errs}],
        "statement": "Les termes de la somme ci-dessous sont des termes consécutifs d'une suite géométrique.\n\n$$S=" + termes + "$$\n\nCalcule $S$.\n\n$S=?$",
        "variables": vars_,
        "conditions": ["abs(s) < 10000"],
        "correction": {"steps": steps},
        "hint": "Trouve la raison, puis le nombre de termes en écrivant le dernier terme comme une puissance de la raison.",
    }


AJOUTS["b72fae4a"] = {
    "variations": [v_geo_dec, v_geo_ext(False), v_geo_ext(True)],
    "description": "u₀ + u₁ + … + uₙ (premier terme et raison entiers, ou raison décimale avec un arrondi au millième), ou somme écrite en entier",
}


def specs_b72(base):
    # a = 3, q = 0,8, n = 9 : S = 3 (1 − 0,8¹⁰)/0,2 = 15 (1 − 0,1073741824) = 13,389387…
    vd = {"a": 3, "kq": 8, "n": 9}
    # 2 − 4 + 8 − … − 256 : a = 2, q = −2, nn = 8 → S = 2 (1 − 256)/3 = −170
    ve = {"a": 2, "q": -2, "nn": 8}
    # 256 + 128 + … + 2 : cc = 2, nn = 8 → a = 256, S = 510
    vh = {"cc": 2, "nn": 8}
    return [
        spec(base, vd, ["13{,}389"], desc="u0 = 3, q = 0,8, jusqu'à u9 : 13,389"),
        spec(base, vd, ["13.389"], desc="écriture 13.389"),
        spec(base, vd, ["13{,}3894"], "bad_form", "trop de décimales", violations=["rounding"]),
        spec(base, vd, ["12{,}987"], "incorrect", "9 termes", "De $u_0$ à $u_9$, il y a $10$ termes : l'exposant est $10$."),
        spec(base, vd, ["-13{,}389"], "incorrect", "signe", "Attention au signe : $\\dfrac{1-q^{ 10 }}{1-q}$, avec $1 - q$ au dénominateur."),
        spec(base, vd, ["4{,}463"], "incorrect", "u0 oublié", "Tu as oublié de multiplier par le premier terme $u_0 = 3$."),
        spec(base + 1, ve, ["-170"], desc="2 − 4 + 8 − … − 256 = −170"),
        spec(base + 1, {"a": 1, "q": 3, "nn": 6}, ["364"], desc="1 + 3 + 9 + … + 243 = 364"),
        spec(base + 1, ve, ["86"], "incorrect", "7 termes", "Il y a $8$ termes : compte aussi le premier."),
        spec(base + 1, ve, ["342"], "incorrect", "9 termes", "Il y a $8$ termes, pas $9$."),
        spec(base + 1, ve, ["170"], "incorrect", "signe", "Attention au signe : $\\dfrac{1-q^{ 8 }}{1-q}$, avec $1 - q$ au dénominateur."),
        spec(base + 2, vh, ["510"], desc="256 + 128 + … + 2 = 510"),
        spec(base + 2, vh, ["508"], "incorrect", "7 termes", "Il y a $8$ termes : compte aussi le premier."),
        spec(base + 2, vh, ["511"], "incorrect", "9 termes", "Il y a $8$ termes, pas $9$."),
        spec(base + 2, vh, ["512"], "incorrect", "puissance oubliée", "La somme est finie : $1-\\left(\\dfrac{1}{2}\\right)^{ 8 }$ n'est pas égal à $1$."),
    ]


AJOUTS["b72fae4a"]["specs"] = specs_b72

# ---------------------------------------------------------------------------
# 5042401b — sens de variation, raison positive : u(n) = a × qⁿ ; u(n+1) = q u(n)
# ---------------------------------------------------------------------------
Q_POS = "2|3|4|5|6|8|9|12|15|20|25|30|40"


def v_sens(explicite):
    vars_ = [var("a", "1..9;±"), var("kq", Q_POS), var("q", "eval:kq/10;d"),
             var("ans", "eval:min(max(-(a)*((kq)-10),0),1)")]
    if explicite:
        enonce = "La suite $(u_n)$ est définie, pour tout entier naturel $n$, par $u_n={{a}}\\times{{q}}^n$."
        etape0 = "$u_n={{a}}\\times{{q}}^n$ est de la forme $u_0\\times q^n$ : $(u_n)$ est géométrique, de premier terme $u_0={{a}}$ et de raison $q={{q}}>0$."
        hint = "Reconnais la forme $u_0\\times q^n$ : le sens de variation dépend du signe de $u_0$ et de la position de $q$ par rapport à $1$."
    else:
        enonce = "La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$, $u_{n+1}={{q}}\\,u_n$."
        etape0 = "On multiplie toujours par ${{q}}$ : $(u_n)$ est géométrique, de premier terme $u_0={{a}}$ et de raison $q={{q}}>0$."
        hint = "Quelle est la nature de la suite ? Son sens de variation dépend alors du signe de $u_0$ et de la position de $q$ par rapport à $1$."
    return {
        "blanks": [{"expectedAnswer": "{{ans}}"}],
        "statement": enonce + "\n\nQuel est le sens de variation de la suite $(u_n)$ ?\n\n" + CHOIX_SENS,
        "variables": vars_,
        "correction": {
            "steps": [
                etape0,
                "$u_{n+1}-u_n=u_0\\times q^n\\times(q-1)$ et $q^n>0$ : le signe de $u_{n+1}-u_n$ est celui de $u_0\\times(q-1)$.",
                "Ici $u_0={{a}}$ et $q-1={{eval:q-1;d}}$ : $u_{n+1}-u_n$ est {{if:ans==0|positif|négatif}}, la suite est **{{if:ans==0|croissante|décroissante}}**.",
            ]
        },
        "hint": hint,
    }


AJOUTS["5042401b"] = {
    "variations": [v_sens(True), v_sens(False)],
    "description": "Le signe de u₀ et la position de q par rapport à 1 donnent le sens de variation (suite donnée par u₀ et q, par u(n) = a × qⁿ ou par u(n+1) = q u(n))",
}


def specs_504(base):
    return [
        spec(base, {"a": -3, "kq": 4}, ["0"], desc="−3 × 0,4ⁿ : croissante"),
        spec(base, {"a": -3, "kq": 4}, ["1"], "incorrect", "−3 × 0,4ⁿ : « décroissante » refusé"),
        spec(base, {"a": 2, "kq": 15}, ["0"], desc="2 × 1,5ⁿ : croissante"),
        spec(base, {"a": 2, "kq": 5}, ["1"], desc="2 × 0,5ⁿ : décroissante"),
        spec(base, {"a": 2, "kq": 5}, ["2"], "incorrect", "« constante » refusé"),
        spec(base + 1, {"a": -4, "kq": 30}, ["1"], desc="u0 = −4, q = 3 : décroissante"),
        spec(base + 1, {"a": -4, "kq": 30}, ["0"], "incorrect", "« croissante » refusé"),
        spec(base + 1, {"a": 5, "kq": 8}, ["1"], desc="u0 = 5, q = 0,8 : décroissante"),
        spec(base + 1, {"a": -5, "kq": 8}, ["0"], desc="u0 = −5, q = 0,8 : croissante"),
    ]


AJOUTS["5042401b"]["specs"] = specs_504

# ---------------------------------------------------------------------------
# 19961e67 — fonction Python de seuil : compléter la condition du while
# ---------------------------------------------------------------------------
CHOIX_WHILE = "```choix\n- `u < A`\n- `u > A`\n- `u >= A`\n- `u <= A`\n```"


def v_while(decroissante):
    if decroissante:
        vars_ = [var("a", "200..900"), var("kq", "5..9")]
        code = "u = {{a}}\n    while ........ :\n        n = n + 1\n        u = 0.{{kq}} * u"
        intro = "La suite $(u_n)$ définie par $u_0={{a}}$ et $u_{n+1}=0{,}{{kq}}\\,u_n$ est décroissante."
        but = "le plus petit entier $n$ tel que $u_n<A$"
        rep = "2"
        steps = [
            "La boucle `while` tourne **tant que** sa condition est vraie, et s'arrête dès qu'elle devient fausse.",
            "On veut s'arrêter au premier $n$ tel que $u_n<A$ : la boucle doit continuer tant que $u_n\\geqslant A$.",
            "La condition est donc `u >= A`.",
        ]
    else:
        vars_ = [var("a", "1..9"), var("kq", "1..9")]
        code = "u = {{a}}\n    while ........ :\n        n = n + 1\n        u = 1.{{kq}} * u"
        intro = "La suite $(u_n)$ définie par $u_0={{a}}$ et $u_{n+1}=1{,}{{kq}}\\,u_n$ est croissante."
        but = "le plus petit entier $n$ tel que $u_n>A$"
        rep = "3"
        steps = [
            "La boucle `while` tourne **tant que** sa condition est vraie, et s'arrête dès qu'elle devient fausse.",
            "On veut s'arrêter au premier $n$ tel que $u_n>A$ : la boucle doit continuer tant que $u_n\\leqslant A$.",
            "La condition est donc `u <= A`.",
        ]
    statement = (intro + "\n\n```python\ndef seuil(A):\n    n = 0\n    " + code + "\n    return n\n```\n\n"
                 "Quelle condition faut-il écrire à la place des pointillés pour que `seuil(A)` renvoie " + but + " ?\n\n" + CHOIX_WHILE)
    return {
        "blanks": [{"expectedAnswer": rep}],
        "statement": statement,
        "variables": vars_,
        "correction": {"steps": steps},
        "hint": "La boucle `while` continue tant que sa condition est vraie : quelle condition doit rester vraie tant que le seuil n'est pas atteint ?",
    }


AJOUTS["19961e67"] = {
    "variations": [v_while(True), v_while(False)],
    "description": "Boucle while : premier rang où la condition devient fausse ; compléter la condition du while",
}


def specs_199(base):
    return [
        spec(base, {"a": 500, "kq": 9}, ["2"], desc="décroissante, u < A visé : `u >= A`"),
        spec(base, {"a": 500, "kq": 9}, ["0"], "incorrect", "`u < A` refusé"),
        spec(base, {"a": 500, "kq": 9}, ["1"], "incorrect", "`u > A` refusé"),
        spec(base + 1, {"a": 3, "kq": 2}, ["3"], desc="croissante, u > A visé : `u <= A`"),
        spec(base + 1, {"a": 3, "kq": 2}, ["1"], "incorrect", "`u > A` refusé"),
        spec(base + 1, {"a": 3, "kq": 2}, ["0"], "incorrect", "`u < A` refusé"),
    ]


AJOUTS["19961e67"]["specs"] = specs_199


# ---------------------------------------------------------------------------
def main():
    for id8, ajout in AJOUTS.items():
        chemin = DOSSIER / f"{id8}.json"
        rel = str(chemin)
        racine = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, cwd=DOSSIER).stdout.strip()
        relatif = str(chemin.resolve().relative_to(racine))
        brut = subprocess.run(["git", "show", f"2a85b7b809:{relatif}"], capture_output=True, text=True, cwd=racine, check=True).stdout
        d = json.loads(brut)
        base = len(d["variations"])
        d["variations"].extend(ajout["variations"])
        d["testSpecs"].extend(ajout["specs"](base))
        if "description" in ajout:
            d["description"] = ajout["description"]
        chemin.write_text(json.dumps(d, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
        print(f"{id8} : +{len(ajout['variations'])} variation(s) (à partir de l'indice {base})")


main()

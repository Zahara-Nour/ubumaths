"""Écrit le modèle neuf « matériel décimal » du chantier idees-6e-decimaux (6N2autoB-2).

Idée reportée le 2026-11-22 (« outil manquant ») ; David a fait remarquer le 2026-11-23 que le bloc
```collection dessine déjà gros cubes, plaques, barres et petits cubes : le dessin ne montre aucune
valeur, l'énoncé fixe gros cube = 1 unité, plaque = 1 dixième, barre = 1 centième, petit cube =
1 millième. Point 6-102 (liens entre les unités de numération), nœud de 2c5bae8f.

Usage : python3 docs/wip/questions/idees-6e-decimaux-materiel.py scripts/questions/idees-6e-decimaux-materiel
"""

import json
import sys
from pathlib import Path

CONSIGNE = (
    "Dans ce matériel, le gros cube vaut $1$ unité, la plaque $1$ dixième, la barre $1$ centième "
    "et le petit cube $1$ millième.\n\n"
    "```collection\nmilliers: {{u}}\ncentaines: {{d}}\ndizaines: {{c}}\nunités: {{m}}\n```\n\n"
    "Quel nombre est représenté ? $?$"
)

LIRE = (
    "{{if:u>0|${{u}}$ {{if:u<=1|gros cube|gros cubes}} : ${{u}}$ {{if:u<=1|unité|unités}}. |}}"
    "{{if:d>0|${{d}}$ {{if:d<=1|plaque|plaques}} : ${{d}}$ {{if:d<=1|dixième|dixièmes}}. |}}"
    "{{if:c>0|${{c}}$ {{if:c<=1|barre|barres}} : ${{c}}$ {{if:c<=1|centième|centièmes}}. |}}"
    "${{m}}$ {{if:m<=1|petit cube|petits cubes}} : ${{m}}$ {{if:m<=1|millième|millièmes}}."
)

SOMME = (
    "$${{u}}+\\dfrac{ {{d}} }{10}+\\dfrac{ {{c}} }{100}+\\dfrac{ {{m}} }{1\\,000}"
    "=\\textcolor{{{color:primary.0}}}{ {{solution}} }$$"
)

REPONSE = "{{eval:u+d/10+c/100+m/1000;d}}"

ERREUR_ENTIER = {
    "answer": "{{eval:1000*u+100*d+10*c+m}}",
    "message": "Ici le gros cube vaut $1$ unité, pas $1\\,000$ : la plaque, la barre et le petit cube sont des parties de l'unité, il faut une virgule.",
    "label": "Lu comme un nombre entier",
}

HINT = (
    "Chaque sorte d'objet donne un chiffre : les gros cubes les unités, les plaques les dixièmes, "
    "les barres les centièmes, les petits cubes les millièmes."
)

MODELE = {
    "title": "Lire un nombre décimal sur le matériel",
    "description": "Écrire le nombre décimal représenté par des gros cubes (unités), plaques (dixièmes), barres (centièmes) et petits cubes (millièmes) du bloc collection ; avec ou sans rang vide (pièges : lu comme un entier, plaques et barres échangées, lu à l'envers, rang vide sauté)",
    "grades": ["6"],
    "level": 10,
    "delay": 45,
    "status": "draft",
    "options": {"constraints": {"spacesFromFourDigits": True}},
    "rangement": {
        "noeud": "Nombres et calculs > Décimaux : numération > décomposition",
        "point": "6-102",
    },
    "variations": [
        {
            "statement": CONSIGNE,
            "variables": [
                {"name": "u", "expression": "0..2"},
                {"name": "d", "expression": "1..7"},
                {"name": "c", "expression": "1..9"},
                {"name": "m", "expression": "1..9"},
            ],
            "conditions": ["d != c", "d != m"],
            "blanks": [
                {
                    "expectedAnswer": REPONSE,
                    "expectedErrors": [
                        ERREUR_ENTIER,
                        {
                            "answer": "{{eval:u+c/10+d/100+m/1000;d}}",
                            "message": "La plaque est plus grande que la barre : elle vaut un dixième, la barre un centième.",
                            "label": "Plaques et barres échangées",
                        },
                        {
                            "answer": "{{eval:u+m/10+c/100+d/1000;d}}",
                            "message": "Les petits cubes sont les plus petits objets : ce sont les millièmes, le dernier chiffre après la virgule.",
                            "label": "Lu à l'envers",
                        },
                    ],
                }
            ],
            "correction": {"steps": [LIRE, SOMME]},
            "hint": HINT,
        },
        {
            "statement": CONSIGNE,
            "variables": [
                {"name": "z", "expression": "0|1"},
                {"name": "u", "expression": "1..3"},
                {"name": "a", "expression": "1..7"},
                {"name": "b", "expression": "1..9"},
                {"name": "d", "expression": "eval:z*a"},
                {"name": "c", "expression": "eval:(1-z)*b"},
                {"name": "m", "expression": "1..9"},
            ],
            # Sans barre (z = 1), « lu à l'envers » vaudrait la réponse si plaques = petits cubes ;
            # sans plaque (z = 0), « rang sauté » et « lu à l'envers » se confondraient si barres = petits cubes
            "conditions": ["a != m", "b != m"],
            "blanks": [
                {
                    "expectedAnswer": REPONSE,
                    "expectedErrors": [
                        ERREUR_ENTIER,
                        {
                            "answer": "{{eval:u+(d+c)/10+m/100;d}}",
                            "message": "Il n'y a aucune {{if:z==0|plaque : le chiffre des dixièmes est $0$|barre : le chiffre des centièmes est $0$}}, il faut l'écrire.",
                            "label": "Rang vide sauté",
                        },
                        {
                            "answer": "{{eval:u+m/10+c/100+d/1000;d}}",
                            "message": "Les petits cubes sont les plus petits objets : ce sont les millièmes, le dernier chiffre après la virgule.",
                            "label": "Lu à l'envers",
                        },
                    ],
                }
            ],
            "correction": {
                "steps": [
                    LIRE,
                    "Aucune {{if:z==0|plaque : $0$ au rang des dixièmes|barre : $0$ au rang des centièmes}}.",
                    SOMME,
                ]
            },
            "hint": HINT,
        },
    ],
}


def spec(description, index, variables, answers, message=None):
    expected = {"status": "correct"} if message is None else {
        "status": "incorrect", "expectedErrorMessage": message}
    if message == "":
        expected = {"status": "incorrect"}
    return {"description": description, "variationIndex": index, "variables": variables,
            "expected": expected, "answers": answers}


V0 = {"u": "1", "d": "3", "c": "7", "m": "4"}
V0b = {"u": "0", "d": "5", "c": "2", "m": "8"}
V1d = {"z": "0", "u": "2", "a": "4", "b": "6", "d": "0", "c": "6", "m": "3"}
V1c = {"z": "1", "u": "1", "a": "4", "b": "6", "d": "4", "c": "0", "m": "7"}
ENTIER = ERREUR_ENTIER["message"]
INVERSE = MODELE["variations"][0]["blanks"][0]["expectedErrors"][1]["message"]
ENVERS = MODELE["variations"][0]["blanks"][0]["expectedErrors"][2]["message"]

MODELE["testSpecs"] = [
    spec("a : 1,374", 0, V0, ["1,374"]),
    spec("a : 1,374 écrit avec un point", 0, V0, ["1.374"]),
    spec("a : lu comme un entier (1374)", 0, V0, ["1374"], ENTIER),
    spec("a : plaques et barres échangées (1,734)", 0, V0, ["1,734"], INVERSE),
    spec("a : lu à l'envers (1,473)", 0, V0, ["1,473"], ENVERS),
    spec("a : sans gros cube, 0,528", 0, V0b, ["0,528"]),
    spec("a : sans gros cube, lu comme un entier (528)", 0, V0b, ["528"], ENTIER),
    spec("b : pas de plaque, 2,063", 1, V1d, ["2,063"]),
    spec("b : pas de plaque, rang sauté (2,63)", 1, V1d, ["2,63"],
         "Il n'y a aucune plaque : le chiffre des dixièmes est $0$, il faut l'écrire."),
    spec("b : pas de plaque, lu comme un entier (2063)", 1, V1d, ["2063"], ENTIER),
    spec("b : pas de barre, 1,407", 1, V1c, ["1,407"]),
    spec("b : pas de barre, rang sauté (1,47)", 1, V1c, ["1,47"],
         "Il n'y a aucune barre : le chiffre des centièmes est $0$, il faut l'écrire."),
    spec("b : pas de barre, lu à l'envers (1,704)", 1, V1c, ["1,704"], ENVERS),
    spec("b : pas de plaque, lu à l'envers (2,36)", 1, V1d, ["2,36"], ENVERS),
]


def main():
    dossier = Path(sys.argv[1])
    dossier.mkdir(parents=True, exist_ok=True)
    chemin = dossier / "b2-lire-un-decimal-sur-le-materiel.json"
    # L'id écrit par create-questions --publier est gardé
    modele = MODELE
    if chemin.exists():
        ancien = json.loads(chemin.read_text())
        if "id" in ancien:
            modele = {"id": ancien["id"], **MODELE}
    chemin.write_text(json.dumps(modele, ensure_ascii=False, indent="\t") + "\n")
    print(chemin)


main()

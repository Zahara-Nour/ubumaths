"""Écrit le modèle « Tracer une tangente connaissant le nombre dérivé » (1SPE-271) dans
scripts/questions/1spe-tangente/.

Phase 0 validée par David le 2026-11-03 (journal « docs/wip/questions-1spe-tangente-progress.md »,
§ 3 à 5) : Fonctions › Dérivation › Tangente, niveau 4 ; tags 1SPE-271 et 1TECHNO-078 (posés par la
migration de rangement) ; geste `tracer:` du bloc ```courbe (#2265).

f(x) = k/2·(x − a)² + s(x − a) + b : f(a) = b et f′(a) = s, donc A(a ; b) est un nœud et la tangente
y = s(x − a) + b passe par un deuxième nœud (a + 1 ; b + s), ou (a + 2 ; b + t) quand s = t/2.

Pièges :
- jamais la clé `tangente:` dans l'énoncé (elle dessinerait la réponse) ;
- `tracer:` et `placer:` ne vont pas ensemble ; `points:` (A) est permis ;
- la réponse de l'élève est « x1;y1/x2;y2 » (une case posée par le générateur) ;
- `tracer:` en forme réduite `(s)*x+(p)` : le message « Ta droite n'est pas celle d'équation … »
  la met au propre (`y = 2x - 1`) ; la forme `s*(x-a)+b` donnait « y = 2 + (1 − x)/2 ».

    python3 docs/wip/questions/lot-1spe-tangente.py scripts/questions/1spe-tangente
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answer, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': [answer], 'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def courbe(pente, lignes):
    """Repère −5 ; 5 de grille 1 avec la courbe de f ; `pente` = f′(a) en syntaxe mathAST."""
    return ('```courbe\nx: -5 ; 5\ny: -5 ; 5\ngrille: 1 ; 1\n'
            'f(x) = {{k}}/2*(x-({{a}}))^2+' + pente + '*(x-({{a}}))+({{b}})   bleu   nom=C_f\n'
            + lignes + 'taille: moyenne\n')


def variation(pente, pente_latex, pas, montee, variables, conditions, equation, trace):
    """pas : avance en abscisse de A vers le deuxième nœud B ; montee : variable ajoutée à l'ordonnée."""
    enonce = (
        'On a tracé ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ et le point $A$ de'
        ' $\\mathcal{C}_f$ d\'abscisse ${{a}}$. On sait que $f\'({{a}})=' + pente_latex + '$.\n\n'
        'Trace la tangente à $\\mathcal{C}_f$ au point $A$.\n\n'
        + courbe(pente, 'points: A({{a}} ; f({{a}}))\n'
                 'tracer: y = ' + trace + '\n')
        + 'description: Courbe d\'une fonction et un point A de la courbe, dans un repère gradué'
        ' de 1 en 1.\n```')
    xb = ev('a+' + pas)
    yb = ev('b+' + montee)
    montee_latex = '{{' + montee + '}}'
    etapes = [
        'La tangente à $\\mathcal{C}_f$ en $A$ passe par $A({{a}}\\,;{{b}})$ et a pour coefficient'
        ' directeur le nombre dérivé $f\'({{a}})=' + pente_latex + '$.',
        'Depuis $A$, on avance de $' + pas + '$ en abscisse et on ajoute $' + montee_latex + '$ à'
        ' l\'ordonnée : on arrive en $B(' + xb + '\\,;' + yb + ')$. La tangente est la droite $(AB)$.',
        courbe(pente, 'g(x) = ' + pente + '*(x-({{a}}))+({{b}})   rouge   pointillé\n'
               'points: A({{a}} ; {{b}}), B(' + xb + ' ; ' + yb + ')\n')
        + 'description: Courbe d\'une fonction et sa tangente au point A, en pointillés, qui passe'
        ' aussi par le point B.\n```',
        'Son équation réduite est $' + col('y=' + equation) + '$.']
    return {'statement': enonce, 'variables': variables, 'conditions': conditions,
            'correction': {'steps': etapes}}


X = var('x', 'x|x')
A = var('a', '1..3;±')
B = var('b', '-3..3')
K = var('k', '1..2;±')

V_ENTIER = variation('({{s}})', '{{s}}', '1', 's',
                     [X, A, B, K, var('s', '-3..3')], ['abs(b+s) <= 4'], ev('s*x+b-s*a'),
                     '({{s}})*x+(' + ev('b-s*a') + ')')
V_DEMI = variation('({{t}})/2', ev('t/2'), '2', 't',
                   [X, A, B, K, var('t', '1|3|-1|-3')], ['abs(b+t) <= 4'], ev('t/2*x+b-t*a/2'),
                   '({{t}})/2*x+(' + ev('2*b-t*a') + ')/2')

V0 = {'a': 1, 'b': 2, 'k': 1, 's': 2}
V0_NUL = {'a': -2, 'b': 1, 'k': 1, 's': 0}
V1 = {'a': 2, 'b': 1, 'k': -1, 't': 1}

MODELE = {
    'title': 'Tracer une tangente connaissant le nombre dérivé',
    'description': 'Tracer la tangente à une courbe en un point A connaissant f′(a) : entier'
                   ' (nul compris) ou demi-entier ; geste « tracer » (deux nœuds de la grille)',
    'grades': ['1_SPE', '1_TECHNO'],
    'theme': 'Fonctions', 'domain': 'Dérivation', 'subdomain': 'Tangente',
    'level': 4, 'delay': 60, 'status': 'draft',
    'shared': {'cleanCoefficients': True},
    'variations': [V_ENTIER, V_DEMI],
    'testSpecs': [
        spec('f′(1) = 2, A(1 ; 2) : A et B(2 ; 4)', 0, V0, '1;2/2;4', 'correct'),
        spec('Deux autres nœuds de la tangente : (0 ; 0) et (−1 ; −2)', 0, V0, '0;0/-1;-2',
             'correct'),
        spec('Erreur de signe : pente −2', 0, V0, '1;2/2;0', 'incorrect'),
        spec('Erreur : pente inverse 1/2', 0, V0, '1;2/3;3', 'incorrect'),
        spec('Erreur : bonne pente, mais par (0 ; f(a)) au lieu de A', 0, V0, '0;2/1;4',
             'incorrect'),
        spec('Un seul point posé', 0, V0, '1;2/', 'incorrect'),
        spec('Deux points confondus', 0, V0, '1;2/1;2', 'incorrect'),
        spec('f′(−2) = 0 : tangente horizontale y = 1', 0, V0_NUL, '-2;1/0;1', 'correct'),
        spec('Erreur : droite verticale x = −2 pour f′(−2) = 0', 0, V0_NUL, '-2;1/-2;3',
             'incorrect'),
        spec('f′(2) = 1/2, A(2 ; 1) : A et B(4 ; 2)', 1, V1, '2;1/4;2', 'correct'),
        spec('Erreur : avance de 1, monte de 1 (pente 1)', 1, V1, '2;1/3;2', 'incorrect'),
        spec('Erreur : pente inverse 2', 1, V1, '2;1/3;3', 'incorrect'),
    ],
}

os.makedirs(DOSSIER, exist_ok=True)
with open(os.path.join(DOSSIER, '01-tracer-une-tangente.json'), 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'1 modèle écrit dans {DOSSIER}')

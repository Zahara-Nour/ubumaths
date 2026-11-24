"""Écrit les modèles neufs du chantier idees-3e-fonctions dans
scripts/questions/idees-3e-fonctions-neufs/.

Phase 0 validée par David le 2026-11-24 (« je valide les modèles » ; journal
docs/wip/idees-3e-fonctions-progress.md, § Phase 0 › Modèles neufs (3e)) : N1 à N3.
Q1 (quotients) sans réponse : N2 s'écrit sans quotient, le choix qui n'ajoute rien.
Q2 (tracer une ligne brisée) sans réponse : N3 se contente de placer les points.

Idées reprises d'ailleurs (relevé : docs/wip/idees-3e-fonctions-releve.md).

Rangement (relevé en prod le 2026-11-24, lu par migration-rangement.ts) :
- N1, N2 : « Fonctions > Généralités sur les fonctions > images et antécédents », point 3-040
  (le nœud de d820232a) ;
- N3 : « Fonctions > Généralités sur les fonctions » (notion), point 3-039 (le nœud de 6ad254b4).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse. Case
choix (N1) et points à placer (N3) : pas d'erreurs prévues (la nature les exclut) ; le repère à
placer dit lui-même « tu as échangé l'abscisse et l'ordonnée » (courbe-placer.ts).

Choix d'écriture :
- Formules écrites par `{{eval:…}}` avec la variable x = 'x|x' : signes et coefficients 1 propres.
- N1 : quatre phrases, deux vraies, mélangées à l'affichage (`plusieurs: oui`) ; le corrigé nomme
  les phrases vraies, jamais leur rang. Nom de la fonction tiré (f, g, h).
- N2 v0 : l'erreur « (−3)² = −9 » n'a de sens que pour un nombre négatif ; sa réponse est écrite
  avec une indicatrice : pour un nombre positif elle vaut la bonne réponse, et une erreur prévue
  qui tombe sur la bonne réponse est ignorée.
- N3 : quatre cases dans le tableau (les images), puis un ` ```courbe ` à `placer:` des quatre
  points (huit cases au total, dans l'ordre de l'énoncé). Abscisses fixées par variation, pour
  écrire les erreurs prévues case par case (le signe d'un carré n'a de sens que pour x < 0).

Écarts à la fiche (dits dans le rapport) :
- N2 v2 : x de −5 à −1, sauf −2 : pour x = −2, « carré pris pour le double » et « −x² pris pour
  (−x)² » donnent la même valeur (4 + c), deux messages pour une réponse.
- N2 v0 : b de ±2 à ±5 (pas de « 1 × (−2) » dans le corrigé) ; v1 : a, c de ±2 à ±3, b, d de ±1
  à ±5, x de ±1 à ±3 (facteurs écrits à la main, images jusqu'à ~200). Conditions ajoutées pour
  que deux erreurs prévues n'aient jamais la même valeur.
- N3 v2 : a, b de ±1 à ±2 (a ≠ b), pour un repère de hauteur raisonnable (images ≤ 12).
- N3 : « signe d'une image » prévu seulement en x < 0 (v0) ; en v1, une ou deux erreurs par case
  (carré d'un négatif, double, coefficient au carré) choisies pour ne jamais coïncider.
- N1 : le nom de la fonction est tiré par t = 0..2 et trois {{if:}} à plat (une variable à valeur
  « f|g|h » est lue comme une variable inconnue).

Usage : python3 docs/wip/questions/idees-3e-fonctions-neufs.py scripts/questions/idees-3e-fonctions-neufs
"""
import json
import os
import re
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}

RANGEMENT = {
    'n1-traduire-image-antecedent': (
        'Fonctions > Généralités sur les fonctions > images et antécédents', '3-040'),
    'n2-calculer-image-ou-antecedent': (
        'Fonctions > Généralités sur les fonctions > images et antécédents', '3-040'),
    'n3-images-puis-points-de-la-courbe': ('Fonctions > Généralités sur les fonctions', '3-039'),
}


# =============================================================================================
# Outils (repris du gabarit idees-3e-calcul-litteral-neufs.py)
# =============================================================================================

def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = rw(message)
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, grades=None, options=None):
    m = {'title': title, 'description': description, 'grades': grades or ['3'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **reglages):
    c = {'expectedAnswer': attendue, **reglages}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    noeud, point = RANGEMENT[nom]
    tete = {k: m[k] for k in ('id',) if k in m}
    m = {**tete, 'rangement': {'noeud': noeud, 'point': point},
         **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def resoudre(texte, v):
    """Remplace les {{nom}} simples d'un message par leur valeur (pour les specs)."""
    return rw(re.sub(r'\{\{(\w+)\}\}', lambda mo: str(v[mo.group(1)]), texte))


# Le message est réécrit à la résolution (couvrir-un-niveau.md § 5) : la spec le nomme sous sa
# forme réécrite. Le modèle garde l'écriture lisible.
REECRITURES = [
    ('$-(x^2)$', '$-\\left( x^2 \\right)$'),
    ('$(-x)^2$', '$\\left( -x \\right)^2$'),
    ('$(ax)^2$', '$\\left( a x \\right)^2$'),
    ('$ax^2$', '$a x^2$'),
]
REECRITURES_RE = [
    (r'\$\((-?\d+)\)\^2=(\d+)\$', r'$\\left( \1 \\right)^2 = \2$'),
    (r'\$f\(x\)=(-?\d+)\$', r'$f\\left( x \\right) = \1$'),
    (r'\$(-?\d+)x\$', r'$\1 x$'),
]


def rw(texte):
    for avant, apres in REECRITURES:
        texte = texte.replace(avant, apres)
    for motif, remplacement in REECRITURES_RE:
        texte = re.sub(motif, remplacement, texte)
    return texte


def specs_erreurs(vi, v, erreurs_py, desc):
    """Une spec `incorrect` par erreur prévue : (réponse LaTeX, message gabarit, nom)."""
    return [spec(desc + ' : ' + nom, vi, v, 'incorrect', [rep], resoudre(msg, v))
            for rep, msg, nom in erreurs_py]


def choix_plusieurs(lignes):
    return '```choix\nplusieurs: oui\n' + '\n'.join('- ' + l for l in lignes) + '\n```'


# =============================================================================================
# N1 — 3-040 : traduire f(a) = b avec les mots image et antécédent. Case choix, quatre phrases
# dont deux vraies (indices 0 et 1, mélangés à l'affichage). Distracteurs : x et y inversés.
# =============================================================================================

# Nom de la fonction tiré : t = 0, 1, 2 → f, g, h (une variable à valeur lettre est lue comme une
# variable inconnue : le nom est écrit par trois {{if:}} à plat)
NOM_F = var('t', '0..2')
NF = '{{if:t==0|f|}}{{if:t==1|g|}}{{if:t==2|h|}}'
QUELLES = '\n\nCoche les phrases vraies.\n\n'
HINT_N1 = ('L\'image s\'écrit à droite du signe $=$ : $' + NF + '(\\text{antécédent})=\\text{image}$. '
           'L\'antécédent est le nombre de départ.')
RAPPEL_N1 = ('Si $' + NF + '(a)=b$, on dit que $b$ est **l\'image** de $a$ par $' + NF + '$, et que $a$ '
             'est **un antécédent** de $b$ par $' + NF + '$.')

N1_V0 = variation(
    'On sait que $' + NF + '({{a}})={{b}}$.' + QUELLES + choix_plusieurs([
        '${{b}}$ est l\'image de ${{a}}$ par $' + NF + '$',
        '${{a}}$ est un antécédent de ${{b}}$ par $' + NF + '$',
        '${{a}}$ est l\'image de ${{b}}$ par $' + NF + '$',
        '${{b}}$ est un antécédent de ${{a}}$ par $' + NF + '$',
    ]),
    [NOM_F, var('a', '1..9;±'), var('b', '1..9;±')],
    [case('0;1')],
    [
        RAPPEL_N1,
        'Ici, le nombre de départ est ${{a}}$ et le résultat est ${{b}}$ : '
        '$' + couleur('{{b}}\\text{ est l\'image de }{{a}}') + '$, et '
        '$' + couleur('{{a}}\\text{ est un antécédent de }{{b}}') + '$. Les deux autres phrases '
        'échangent l\'image et l\'antécédent.',
    ],
    HINT_N1,
    ['a!=b'],
)

N1_V1 = variation(
    'Par la fonction $' + NF + '$, le nombre ${{a}}$ a pour image ${{b}}$.' + QUELLES
    + choix_plusieurs([
        '$' + NF + '({{a}})={{b}}$',
        '${{a}}$ est un antécédent de ${{b}}$ par $' + NF + '$',
        '$' + NF + '({{b}})={{a}}$',
        '${{b}}$ est un antécédent de ${{a}}$ par $' + NF + '$',
    ]),
    [NOM_F, var('a', '1..9;±'), var('b', '1..9;±')],
    [case('0;1')],
    [
        RAPPEL_N1,
        'Le nombre de départ est ${{a}}$, son image est ${{b}}$ : on écrit '
        '$' + couleur('' + NF + '({{a}})={{b}}') + '$, et '
        '$' + couleur('{{a}}\\text{ est un antécédent de }{{b}}') + '$. Les deux autres phrases '
        'échangent le nombre de départ et son image.',
    ],
    HINT_N1,
    ['a!=b'],
)

N1_V2 = variation(
    'On sait que $' + NF + '({{a}})={{k}}$ et que $' + NF + '({{c}})={{k}}$.' + QUELLES
    + choix_plusieurs([
        '${{k}}$ a au moins deux antécédents par $' + NF + '$ : ${{a}}$ et ${{c}}$',
        'L\'image de ${{c}}$ par $' + NF + '$ est ${{k}}$',
        '${{k}}$ a deux images par $' + NF + '$ : ${{a}}$ et ${{c}}$',
        '$' + NF + '({{k}})={{c}}$',
    ]),
    [NOM_F, var('a', '1..9;±'), var('c', '1..9;±'), var('k', '1..9;±')],
    [case('0;1')],
    [
        RAPPEL_N1,
        '${{k}}$ est l\'image de ${{a}}$ et aussi l\'image de ${{c}}$ : '
        '$' + couleur('{{k}}\\text{ a au moins deux antécédents, }{{a}}\\text{ et }{{c}}') + '$, '
        'et $' + couleur('\\text{l\'image de }{{c}}\\text{ est }{{k}}') + '$.',
        'Un nombre n\'a jamais qu\'**une seule** image ; c\'est un nombre de l\'arrivée qui peut '
        'avoir plusieurs antécédents. Et $' + NF + '({{k}})$ n\'est pas donné : ${{k}}$ est ici une '
        'image, pas un nombre de départ.',
    ],
    HINT_N1,
    ['a!=c', 'a!=k', 'c!=k', 'a!=-c'],
)

N1_V3 = variation(
    'On considère la fonction $f$ définie par $f(x)={{eval:a*x^2+b}}$.' + QUELLES
    + choix_plusieurs([
        '$f(0)={{b}}$',
        'L\'image de ${{eval:-b}}$ par $f$ est ${{eval:a*b^2+b}}$',
        '$f({{b}})=0$',
        'L\'image de ${{eval:-b}}$ par $f$ est ${{eval:-a*b^2+b}}$',
    ]),
    [X, var('a', '2..5;±'), var('b', '2..5;±')],
    [case('0;1')],
    [
        'Pour calculer une image, on remplace $x$ par le nombre de départ.',
        '$f(0)={{a}}\\times0^2{{b;+}}=' + couleur('{{b}}') + '$ : la première phrase est vraie.',
        '$f({{eval:-b}})={{a}}\\times({{eval:-b}})^2{{b;+}}={{a}}\\times{{eval:b^2}}{{b;+}}='
        + couleur('{{eval:a*b^2+b}}') + '$ : le carré passe avant la multiplication, et un carré '
        'n\'est jamais négatif.',
        '$f({{b}})={{a}}\\times({{b}})^2{{b;+}}={{eval:a*b^2+b}}$, qui n\'est pas égal à $0$ : '
        '$f({{b}})=0$ est fausse (elle échange ${{b}}$ et $0$).',
    ],
    'Pour calculer une image, remplace $x$ par le nombre dans la formule, avec des parenthèses ; '
    'le carré passe avant la multiplication.',
)


def specs_n1():
    s = []
    v = {'t': 0, 'a': 3, 'b': -5}
    s += [
        spec('v0 : f(3) = −5, les deux phrases vraies', 0, v, 'correct', ['0;1']),
        spec('v0 : une seule phrase vraie cochée (½)', 0, v, 'unoptimal_form', ['0']),
        spec('v0 : image et antécédent échangés', 0, v, 'incorrect', ['2;3']),
        spec('v0 : une vraie et une fausse', 0, v, 'incorrect', ['0;2']),
    ]
    v = {'t': 1, 'a': 4, 'b': 7}
    s += [
        spec('v1 : 4 a pour image 7 par g', 1, v, 'correct', ['0;1']),
        spec('v1 : g(7) = 4 coché', 1, v, 'incorrect', ['1;2']),
        spec('v1 : x et y inversés', 1, v, 'incorrect', ['2;3']),
    ]
    v = {'t': 2, 'a': 2, 'c': -6, 'k': 1}
    s += [
        spec('v2 : h(2) = h(−6) = 1', 2, v, 'correct', ['0;1']),
        spec('v2 : « deux images » coché', 2, v, 'incorrect', ['1;2']),
        spec('v2 : h(1) = −6 coché', 2, v, 'incorrect', ['0;3']),
    ]
    v = {'a': 2, 'b': 3}
    s += [
        spec('v3 : f(x) = 2x² + 3', 3, v, 'correct', ['0;1']),
        spec('v3 : f(3) = 0 coché', 3, v, 'incorrect', ['0;2']),
        spec('v3 : (−3)² négatif', 3, v, 'incorrect', ['0;3']),
    ]
    v = {'a': -3, 'b': -2}
    s.append(spec('v3 : f(x) = −3x² − 2', 3, v, 'correct', ['0;1']))
    return s


N1 = modele(
    'Traduire f(a) = b avec image et antécédent',
    'Phrases vraies à cocher : f(3) = −5 traduit avec image et antécédent, « 4 a pour image 7 » '
    'traduit en égalité, deux antécédents d\'un même nombre, vrai ou faux sur f(x) = ax² + b '
    '(pièges : image et antécédent échangés, « deux images », carré d\'un négatif)',
    1, 60, [N1_V0, N1_V1, N1_V2, N1_V3], specs_n1())


# =============================================================================================
# N2 — 3-040 : calculer une image ou un antécédent avec une formule. Case numérique, sans
# quotient (Q1). v0 ax² + bx + c, v1 (ax + b)(cx + d), v2 −x² + c (x < 0), v3 antécédent par
# ax, v4 antécédent par ax + b (solution entière).
# =============================================================================================

ENONCE_IMAGE = ('On considère la fonction $f$ définie par $f(x)={F}$.\n\nCalcule l\'image de '
                '${{{{n}}}}$ par $f$.\n\n$f({{{{n}}}})=?$')
HINT_IMAGE = ('Remplace $x$ par ${{n}}$ dans la formule, en l\'écrivant entre parenthèses, puis '
              'respecte les priorités : le carré d\'abord, puis les produits, puis les sommes.')
HINT_ANTECEDENT = ('L\'antécédent est le nombre $x$ tel que $f(x)={{k}}$ : écris l\'équation, '
                   'puis résous-la.')

M_CARRE_NEG = 'Le carré d\'un nombre négatif est positif : $({{n}})^2={{eval:n^2}}$.'
M_SIGNE_PROD = ('Regarde le signe de chaque produit : deux nombres de même signe ont un produit '
                'positif, de signes contraires un produit négatif.')
M_SEUL_X = 'Seul $x$ est au carré : $ax^2$, c\'est $a\\times x^2$, pas $(ax)^2$.'
M_SOMME_PAR = ('Les deux parenthèses se multiplient : calcule la valeur de chacune, puis fais '
               'leur produit.')
M_CROISES = ('Tu as oublié des produits en développant : chaque terme de la première parenthèse '
             'multiplie chaque terme de la seconde. Plus simple : calcule chaque parenthèse, puis '
             'multiplie.')
M_MOINS_CARRE = ('Dans $-x^2$, seul $x$ est au carré : on calcule le carré, puis on prend son '
                 'opposé. $-x^2$, c\'est $-(x^2)$, pas $(-x)^2$.')
M_DOUBLE = 'Le carré d\'un nombre, c\'est ce nombre multiplié par lui-même, pas par $2$.'
M_IMAGE = ('Tu as calculé l\'image de ${{k}}$ : on cherche l\'antécédent, le nombre $x$ tel que '
           '$f(x)={{k}}$.')
M_SOUSTRAIT_A = ('${{a}}x$, c\'est ${{a}}\\times x$ : pour retrouver $x$, on divise par ${{a}}$, '
                 'on ne soustrait pas.')
M_SIGNE_QUOT = ('Vérifie le signe : le quotient de deux nombres de même signe est positif, de '
                'signes contraires négatif.')
M_CONSTANTE = ('Attention au terme constant : pour isoler le terme en $x$, on fait l\'opération '
               'inverse sur les deux membres de l\'équation.')
M_DIVISE = 'Tu as trouvé la valeur de ${{a}}x$ : il reste à diviser par ${{a}}$.'

N2_V0 = variation(
    ENONCE_IMAGE.format(F='{{eval:a*x^2+b*x+c}}'),
    # b ≠ ±1 : la substitution du corrigé n'écrit jamais « 1 × (−2) »
    [X, var('a', '2..3;±'), var('b', '2..5;±'), var('c', '1..9;±'), var('n', '1..4;±')],
    [case('{{eval:a*n^2+b*n+c}}', [
        # Indicatrice : pour n > 0, la réponse vaut la bonne, l'erreur est ignorée
        erreur('{{eval:a*n^2+b*n+c-2*a*n^2*min(max(-n,0),1)}}', M_CARRE_NEG,
               'Carré d\'un négatif pris négatif'),
        erreur('{{eval:a*n^2-b*n+c}}', M_SIGNE_PROD, 'Signe du produit bx'),
        erreur('{{eval:(a*n)^2+b*n+c}}', M_SEUL_X, 'Coefficient mis au carré'),
    ])],
    [
        'On remplace $x$ par ${{n}}$, entre parenthèses :',
        '$$f({{n}})={{a}}\\times({{n}})^2{{b;+}}\\times({{n}}){{c;+}}='
        '{{a}}\\times{{eval:n^2}}{{eval:b*n;+}}{{c;+}}={{eval:a*n^2}}{{eval:b*n;+}}{{c;+}}='
        + couleur('{{eval:a*n^2+b*n+c}}') + '$$',
    ],
    HINT_IMAGE,
    # Les trois erreurs prévues ont des valeurs distinctes
    ['b!=a*n', '2*b!=a*n*(1-a)'],
)

N2_V1 = variation(
    # Facteurs écrits à la main (eval réordonne « −2x + 3 » en « 3 − 2x ») ; a, c ≠ ±1 pour que
    # l'énoncé et le corrigé n'écrivent ni « 1x » ni « 1 × (2) »
    ENONCE_IMAGE.format(F='({{a}}x{{b;+}})({{c}}x{{d;+}})'),
    [X, var('a', '2..3;±'), var('b', '1..5;±'), var('c', '2..3;±'), var('d', '1..5;±'),
     var('n', '1..3;±')],
    [case('{{eval:(a*n+b)*(c*n+d)}}', [
        erreur('{{eval:(a*n+b)+(c*n+d)}}', M_SOMME_PAR, 'Somme au lieu du produit'),
        erreur('{{eval:a*c*n^2+b*d}}', M_CROISES, 'Produits croisés oubliés'),
    ])],
    [
        'On remplace $x$ par ${{n}}$ dans chaque parenthèse, puis on multiplie :',
        '$$f({{n}})=({{a}}\\times({{n}}){{b;+}})({{c}}\\times({{n}}){{d;+}})='
        '({{eval:a*n+b}})\\times({{eval:c*n+d}})=' + couleur('{{eval:(a*n+b)*(c*n+d)}}') + '$$',
    ],
    HINT_IMAGE,
    ['a*n+b!=0', 'c*n+d!=0', 'a*d+b*c!=0', '(a*n+b)*(c*n+d)!=(a*n+b)+(c*n+d)',
     '(a*n+b)+(c*n+d)!=a*c*n^2+b*d'],
)

N2_V2 = variation(
    ENONCE_IMAGE.format(F='-x^2{{c;+}}'),
    [X, var('c', '1..9;±'), var('n', '-5..-1')],
    [case('{{eval:-n^2+c}}', [
        erreur('{{eval:n^2+c}}', M_MOINS_CARRE, '−x² pris pour (−x)²'),
        erreur('{{eval:-2*n+c}}', M_DOUBLE, 'Carré pris pour le double'),
    ])],
    [
        'Dans $-x^2$, on calcule d\'abord le carré, puis on prend l\'opposé : $-x^2=-(x^2)$.',
        '$$f({{n}})=-({{n}})^2{{c;+}}=-{{eval:n^2}}{{c;+}}=' + couleur('{{eval:-n^2+c}}') + '$$',
    ],
    'Remplace $x$ par $({{n}})$. Attention : dans $-x^2$, seul $x$ est au carré.',
    ['n!=-2'],
)

N2_V3 = variation(
    'On considère la fonction $f$ définie par $f(x)={{eval:a*x}}$.\n\nCalcule l\'antécédent de '
    '${{k}}$ par $f$.\n\nL\'antécédent de ${{k}}$ est $?$.',
    [X, var('a', '2..9;±'), var('s', '1..9;±'), var('k', 'eval:a*s')],
    [case('{{s}}', [
        erreur('{{eval:a*k}}', M_IMAGE, 'Image au lieu de l\'antécédent'),
        erreur('{{eval:k-a}}', M_SOUSTRAIT_A, 'Soustraction au lieu de la division'),
        erreur('{{eval:-s}}', M_SIGNE_QUOT, 'Signe du quotient'),
    ])],
    [
        'On cherche le nombre $x$ tel que $f(x)={{k}}$ :',
        '$$\\begin{align}{{eval:a*x}}&={{k}}\\\\x&=\\frac{ {{k}} }{ {{a}} }\\\\x&='
        + couleur('{{s}}') + '\\end{align}$$',
        'Vérification : $f({{s}})={{a}}\\times({{s}})={{k}}$.',
    ],
    HINT_ANTECEDENT,
    ['a*k!=k-a', 'k-a!=-s'],
)

N2_V4 = variation(
    'On considère la fonction $f$ définie par $f(x)={{eval:a*x+b}}$.\n\nCalcule l\'antécédent '
    'de ${{k}}$ par $f$.\n\nL\'antécédent de ${{k}}$ est $?$.',
    [X, var('a', '2..9;±'), var('b', '1..9;±'), var('s', '1..9;±'), var('k', 'eval:a*s+b')],
    [case('{{s}}', [
        erreur('{{eval:a*k+b}}', M_IMAGE, 'Image au lieu de l\'antécédent'),
        erreur('{{eval:(k+b)/a}}', M_CONSTANTE, 'Terme constant du mauvais côté'),
        erreur('{{eval:k-b}}', M_DIVISE, 'Division oubliée'),
    ])],
    [
        'On cherche le nombre $x$ tel que $f(x)={{k}}$ :',
        '$$\\begin{align}{{eval:a*x+b}}&={{k}}\\\\{{eval:a*x}}&={{k}}{{eval:-b;+}}\\\\'
        '{{eval:a*x}}&={{eval:k-b}}\\\\x&=\\frac{ {{eval:k-b}} }{ {{a}} }\\\\x&='
        + couleur('{{s}}') + '\\end{align}$$',
        'Vérification : $f({{s}})={{a}}\\times({{s}}){{b;+}}={{k}}$.',
    ],
    HINT_ANTECEDENT,
    ['k!=0', 'k!=s', 'a*k+b!=k-b', 'k+b!=a*(k-b)', 'a*(a*k+b)!=k+b'],
)


def specs_n2():
    s = []
    # v0 : f(x) = 2x² − 3x + 1, f(−3) = 28
    v = {'a': 2, 'b': -3, 'c': 1, 'n': -3}
    s += [
        spec('v0 : f(−3) = 28', 0, v, 'correct', ['28']),
        spec('v0 : calcul laissé', 0, v, 'bad_form', ['18+9+1'], violations=['form']),
    ]
    s += specs_erreurs(0, v, [
        ('-8', M_CARRE_NEG.replace('{{eval:n^2}}', '9'), 'carré négatif'),
        ('10', M_SIGNE_PROD, 'signe du produit'),
        ('46', M_SEUL_X, 'coefficient au carré'),
    ], 'v0')
    v = {'a': -3, 'b': 2, 'c': -5, 'n': 2}
    s.append(spec('v0 : f(x) = −3x² + 2x − 5, f(2) = −13', 0, v, 'correct', ['-13']))
    # v1 : f(x) = (2x + 1)(3x − 4), f(−2) = (−3)(−10) = 30
    v = {'a': 2, 'b': 1, 'c': 3, 'd': -4, 'n': -2}
    s += [
        spec('v1 : f(−2) = 30', 1, v, 'correct', ['30']),
        spec('v1 : produit laissé', 1, v, 'bad_form', ['3\\times10'], violations=['form']),
    ]
    s += specs_erreurs(1, v, [
        ('-13', M_SOMME_PAR, 'somme'),
        ('20', M_CROISES, 'produits croisés'),
    ], 'v1')
    v = {'a': -2, 'b': 3, 'c': 2, 'd': 5, 'n': 3}
    s.append(spec('v1 : f(x) = (−2x + 3)(2x + 5), f(3) = −33', 1, v, 'correct', ['-33']))
    # v2 : f(x) = −x² + 4, f(−3) = −5
    v = {'c': 4, 'n': -3}
    s += [spec('v2 : f(−3) = −5', 2, v, 'correct', ['-5'])]
    s += specs_erreurs(2, v, [
        ('13', M_MOINS_CARRE, '(−x)²'),
        ('10', M_DOUBLE, 'double'),
    ], 'v2')
    v = {'c': -7, 'n': -1}
    s.append(spec('v2 : f(x) = −x² − 7, f(−1) = −8', 2, v, 'correct', ['-8']))
    # v3 : f(x) = −4x, antécédent de −12 = 3
    v = {'a': -4, 's': 3, 'k': -12}
    s += [spec('v3 : antécédent de −12 par −4x', 3, v, 'correct', ['3'])]
    s += specs_erreurs(3, v, [
        ('48', M_IMAGE, 'image'),
        ('-8', M_SOUSTRAIT_A, 'soustraction'),
        ('-3', M_SIGNE_QUOT, 'signe'),
    ], 'v3')
    # v4 : f(x) = 3x − 5, antécédent de 7 = 4
    v = {'a': 3, 'b': -5, 's': 4, 'k': 7}
    s += [
        spec('v4 : antécédent de 7 par 3x − 5', 4, v, 'correct', ['4']),
        spec('v4 : quotient non simplifié (½)', 4, v, 'unoptimal_form', ['\\frac{12}{3}'],
             violations=['reducedFractions']),
    ]
    s += specs_erreurs(4, v, [
        ('16', M_IMAGE, 'image'),
        ('\\frac{2}{3}', M_CONSTANTE, 'constante'),
        ('12', M_DIVISE, 'division oubliée'),
    ], 'v4')
    v = {'a': -2, 'b': 3, 's': -5, 'k': 13}
    s.append(spec('v4 : antécédent de 13 par −2x + 3', 4, v, 'correct', ['-5']))
    return s


N2 = modele(
    'Calculer une image ou un antécédent avec une formule',
    'Image par une formule (2x² − 3x + 1, (2x + 1)(3x − 4), −x² + 4 en un nombre négatif) et '
    'antécédent par le calcul (−4x, 3x − 5) (pièges : (−3)² = −9, −x² pris pour (−x)², image '
    'calculée au lieu de l\'antécédent, division oubliée)',
    2, 90, [N2_V0, N2_V1, N2_V2, N2_V3, N2_V4], specs_n2())


# =============================================================================================
# N3 — 3-039 : calculer des images dans un tableau, puis placer les points de la courbe.
# Quatre cases dans le tableau, puis un ```courbe à placer: (quatre cases). Abscisses fixées par
# variation : v0 ax + b (−2, −1, 1, 2), v1 ax² (−2, −1, 1, 2), v2 (x + a)(x + b) (−2, −1, 0, 1).
# =============================================================================================

LETTRES = 'ABCD'
M3_SIGNE = ('Regarde le signe du produit ${{a}}\\times({X})$ : deux nombres de même signe ont un '
            'produit positif, de signes contraires un produit négatif.')
M3_CONSTANTE = 'Tu as oublié le terme constant de la formule.'
M3_CARRE_NEG = 'Le carré d\'un nombre négatif est positif : $({X})^2={X2}$.'
M3_DOUBLE = 'Le carré d\'un nombre, c\'est ce nombre multiplié par lui-même, pas par $2$.'
M3_SEUL_X = 'Seul $x$ est au carré : $ax^2$, c\'est $a\\times x^2$, pas $(ax)^2$.'
M3_SOMME_PAR = ('Les deux parenthèses se multiplient : calcule la valeur de chacune, puis fais '
                'leur produit.')


def courbe(xs, image, extra):
    """Bloc ```courbe : fenêtre calculée sur les quatre images, puis `extra` (placer: / points:)."""
    ys = [image.replace('X', '(' + str(x) + ')') for x in xs]
    bas = 'min(-1,' + ','.join(ys) + ')-1'
    haut = 'max(1,' + ','.join(ys) + ')+1'
    return ('```courbe\nx: -3 ; 3\ny: {{eval:' + bas + '}} ; {{eval:' + haut + '}}\n'
            'grille: 1 ; 1\n' + extra + '\ntaille: moyenne\n')


def n3(formule, image, xs, erreurs_de, etapes_calcul, hint, variables, conditions=None):
    """formule : f(x) en gabarit ; image : expression eval en X ; erreurs_de(x) → erreurs."""
    ys = ['{{eval:' + image.replace('X', '(' + str(x) + ')') + '}}' for x in xs]
    tableau = ('| $x$ | ' + ' | '.join('$' + str(x) + '$' for x in xs) + ' |\n'
               '|---|---|---|---|---|\n'
               '| $f(x)$ | $?$ | $?$ | $?$ | $?$ |')
    tableau_juste = ('| $x$ | ' + ' | '.join('$' + str(x) + '$' for x in xs) + ' |\n'
                     '|---|---|---|---|---|\n'
                     '| $f(x)$ | ' + ' | '.join('$' + couleur(y) + '$' for y in ys) + ' |')
    pts = ' ; '.join(LETTRES[i] + '=(' + str(x) + ' ; ' + ys[i] + ')' for i, x in enumerate(xs))
    pts_corr = ', '.join(LETTRES[i] + '(' + str(x) + ' ; ' + ys[i] + ')'
                         for i, x in enumerate(xs))
    enonce = ('On considère la fonction $f$ définie par $f(x)=' + formule + '$.\n\n'
              'Complète le tableau de valeurs de $f$.\n\n' + tableau + '\n\n'
              'Place ensuite les points $A$, $B$, $C$ et $D$ de la courbe de $f$ qui ont pour '
              'abscisses ces quatre nombres, dans l\'ordre du tableau.\n\n'
              + courbe(xs, image, 'placer: ' + pts)
              + 'description: Repère gradué de 1 en 1 sur les deux axes.\n```')
    corr_courbe = (courbe(xs, image, 'points: ' + pts_corr)
                   + 'description: Les quatre points A, B, C et D de la courbe de f.\n```')
    blanks = [case(ys[i], erreurs_de(x)) for i, x in enumerate(xs)]
    return variation(
        enonce, variables, blanks,
        etapes_calcul + [
            tableau_juste,
            'Chaque colonne donne un point de la courbe : l\'abscisse est $x$, l\'ordonnée son '
            'image $f(x)$.',
            corr_courbe,
        ],
        hint, conditions)


HINT_N3 = ('Pour chaque colonne, remplace $x$ par le nombre du haut dans la formule, entre '
           'parenthèses. Chaque colonne donne ensuite un point $(x\\,;f(x))$ : l\'abscisse '
           'd\'abord, l\'ordonnée ensuite.')

XS_V0 = [-2, -1, 1, 2]


def erreurs_v0(x):
    # Le signe du produit : seulement pour x < 0 (a × (−2)) ; « a + x + b » écarté, il tombe trop
    # souvent sur la valeur du terme constant oublié
    e = []
    if x < 0:
        e.append(erreur('{{eval:' + str(-x) + '*a+b}}', M3_SIGNE.replace('{X}', str(x)),
                        'Signe du produit'))
    e.append(erreur('{{eval:' + str(x) + '*a}}', M3_CONSTANTE, 'Terme constant oublié'))
    return e


N3_V0 = n3(
    '{{eval:a*x+b}}', 'a*X+b', XS_V0, erreurs_v0,
    ['On remplace $x$ par chaque nombre, par exemple '
     '$f(-2)={{if:a==1|-2|{{a}}\\times(-2)}}{{b;+}}={{eval:-2*a+b}}$.'],
    HINT_N3,
    [X, var('a', '1..3;±'), var('b', '1..4;±')],
    # Signe du produit et terme constant oublié distincts (x = −1, x = −2)
    ['b!=-2*a', 'b!=-4*a'],
)

XS_V1 = [-2, -1, 1, 2]


def erreurs_v1(x):
    # Peu d'erreurs par case, pour qu'aucune ne tombe sur la valeur d'une autre (a de ±1 à ±2) :
    # x = ±2, le double vaut le carré (2 × 2 = 2²) ; (ax)² n'a de sens qu'en x = 2
    e = []
    if x < 0:
        e.append(erreur('{{eval:-a*' + str(x * x) + '}}',
                        M3_CARRE_NEG.replace('{X}', str(x)).replace('{X2}', str(x * x)),
                        'Carré d\'un négatif pris négatif'))
    if abs(x) == 1:
        e.append(erreur('{{eval:2*a*(' + str(x) + ')}}', M3_DOUBLE, 'Carré pris pour le double'))
    if x == 2:
        e.append(erreur('{{eval:a^2*4}}', M3_SEUL_X, 'Coefficient mis au carré'))
    return e


N3_V1 = n3(
    '{{eval:a*x^2}}', 'a*X^2', XS_V1, erreurs_v1,
    ['On remplace $x$ par chaque nombre, entre parenthèses, et on calcule le carré d\'abord : '
     '$f(-2)={{if:a==1|(-2)^2=4|{{a}}\\times(-2)^2={{a}}\\times4={{eval:4*a}}}}$.'],
    HINT_N3,
    [X, var('a', '1..2;±')],
)

XS_V2 = [-2, -1, 0, 1]


def erreurs_v2(x):
    return [
        erreur('{{eval:(' + str(x) + '+a)+(' + str(x) + '+b)}}', M3_SOMME_PAR,
               'Somme au lieu du produit'),
    ]


N3_V2 = n3(
    '({{eval:x+a}})({{eval:x+b}})', '(X+a)*(X+b)', XS_V2, erreurs_v2,
    ['On remplace $x$ par chaque nombre dans les deux parenthèses, puis on multiplie : '
     '$f(-2)=(-2{{a;+}})(-2{{b;+}})=({{eval:a-2}})\\times({{eval:b-2}})={{eval:(a-2)*(b-2)}}$.'],
    HINT_N3,
    [X, var('a', '1..2;±'), var('b', '1..2;±')],
    ['a!=b'],
)


def placer(xs, ys):
    return [str(x) + ';' + str(y) for x, y in zip(xs, ys)]


def specs_n3():
    s = []
    # v0 : f(x) = 2x − 1 : −5, −3, 1, 3
    v = {'a': 2, 'b': -1}
    ys = [2 * x - 1 for x in XS_V0]
    juste = [str(y) for y in ys] + placer(XS_V0, ys)

    def avec(i, rep):
        r = list(juste)
        r[i] = rep
        return r

    s += [
        spec('v0 : f(x) = 2x − 1', 0, v, 'correct', juste),
        spec('v0 : signe de 2 × (−2)', 0, v, 'incorrect', avec(0, '3'),
             resoudre(M3_SIGNE.replace('{X}', '-2'), v)),
        spec('v0 : terme constant oublié', 0, v, 'incorrect', avec(1, '-2'), M3_CONSTANTE),
        spec('v0 : point B en (y ; x)', 0, v, 'incorrect', avec(5, '-3;-1')),
        spec('v0 : point D faux', 0, v, 'incorrect', avec(7, '2;2')),
    ]
    # v1 : f(x) = −2x² : −8, −2, −2, −8
    v = {'a': -2}
    ys = [-2 * x * x for x in XS_V1]
    juste = [str(y) for y in ys] + placer(XS_V1, ys)
    s += [
        spec('v1 : f(x) = −2x²', 1, v, 'correct', juste),
        spec('v1 : (−2)² pris négatif', 1, v, 'incorrect', avec(0, '8'),
             M3_CARRE_NEG.replace('{X}', '-2').replace('{X2}', '4')),
        spec('v1 : carré pris pour le double', 1, v, 'incorrect', avec(1, '4'), M3_DOUBLE),
        spec('v1 : coefficient au carré', 1, v, 'incorrect', avec(3, '16'), M3_SEUL_X),
        spec('v1 : point A en (y ; x)', 1, v, 'incorrect', avec(4, '-8;-2')),
    ]
    v = {'a': 1}
    ys = [x * x for x in XS_V1]
    s.append(spec('v1 : f(x) = x²', 1, v, 'correct', [str(y) for y in ys] + placer(XS_V1, ys)))
    # v2 : f(x) = (x + 2)(x − 1) : 0, −2, −2, 0
    v = {'a': 2, 'b': -1}
    ys = [(x + 2) * (x - 1) for x in XS_V2]
    juste = [str(y) for y in ys] + placer(XS_V2, ys)
    s += [
        spec('v2 : f(x) = (x + 2)(x − 1)', 2, v, 'correct', juste),
        spec('v2 : somme au lieu du produit', 2, v, 'incorrect', avec(1, '-1'), M3_SOMME_PAR),
        spec('v2 : point C en (y ; x)', 2, v, 'incorrect', avec(6, '-2;0')),
    ]
    return s


N3 = modele(
    'Calculer des images puis placer les points de la courbe',
    'Compléter un tableau de valeurs par le calcul (2x − 1, −2x², (x + 2)(x − 1)), puis placer '
    'les quatre points de la courbe dans un repère (pièges : signe d\'une image, carré d\'un '
    'négatif, point placé en (y ; x))',
    2, 120, [N3_V0, N3_V1, N3_V2], specs_n3())


ecrire('n1-traduire-image-antecedent', N1)
ecrire('n2-calculer-image-ou-antecedent', N2)
ecrire('n3-images-puis-points-de-la-courbe', N3)
print('3 modèles écrits dans', DOSSIER)

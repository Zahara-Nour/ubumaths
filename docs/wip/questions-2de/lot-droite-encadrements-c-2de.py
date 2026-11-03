"""Écrit les 5 modèles du lot 9 C « Droite graduée, encadrements, arrondis » de la 2de dans
scripts/questions/2de-encadrements-c/.

Phase 0 validée par David le 2026-11-03 (§ 66 du journal `docs/wip/questions-2de-progress.md`).
Points : 2-249 (lire une abscisse), 2-250 (placer), 2-421 (encadrement à 10⁻ⁿ près), 2-253 (amplitude
donnée), 2-254 (chiffres significatifs). Un point par modèle ; nœud et tag posés par la migration de
rangement.

Décisions et pièges :
- L9-b : l'encadrement d'amplitude donnée se fait entre deux **multiples consécutifs** de l'amplitude
  (réponse unique, aucun juge neuf) ;
- les encadrements et les arrondis sont **calculés ici, en Python** (`TABLE`, `selon`) : `eval` écrirait
  un décimal avec un point dans le texte ; le gabarit ne fait que choisir une ligne ;
- `placer:` ne vise que les graduations : le nombre à placer tombe toujours sur l'une d'elles ;
- niveaux relevés en prod le 2026-11-03 : Décimaux › Apprivoiser › Repérage 1 à 4 pris → 5, 6 ;
  › Encadrer 1 à 7 → 8, 9 ; › Arrondir 1 à 7 → 8.

    python3 docs/wip/questions-2de/lot-droite-encadrements-c-2de.py scripts/questions/2de-encadrements-c
"""
import json
import math
import os
import subprocess
import sys
from decimal import Decimal, ROUND_FLOOR, ROUND_HALF_UP

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft',
         'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def virgule(d):
    """Un Decimal écrit à la française pour LaTeX : 1{,}41 (sans zéro final : 1{,}0 → 1)."""
    if d == d.to_integral_value():
        d = d.to_integral_value()
    return format(d.normalize() if d != d.to_integral_value() else d, 'f').replace('.', '{,}')


def point(d):
    """Le même, pour une réponse attendue (le juge lit le point)."""
    return format(d, 'f')


MODELES = []

# --- 1. 2-249 : lire une abscisse ---------------------------------------------------------------

LIRE_DIXIEMES = variation(
    'Lis l\'abscisse du point $A$.\n\n```line\nstart: {{a}}\nend: {{eval:(a)+2}}\nstep: 1/10\nmajor: 10\n'
    'points: A={{eval:(a)*10+(k)}}/10\n```\n\n$$A=?$$',
    [var('a', '-3..3'), var('k', '1..19')],
    [case('{{eval:((a)*10+(k))/10}}')],
    ['Entre deux nombres entiers, la droite est partagée en $10$ : une graduation vaut $0{,}1$.',
     '$A$ est à ${{k}}$ graduations de ${{a}}$ : $' + col('A={{a}}+{{k}}\\times0{,}1') + '$.'],
    ['k != 10'])

LIRE_TIERS = variation(
    'Lis l\'abscisse du point $A$. Donne-la sous la forme d\'une fraction.\n\n```line\nstart: {{a}}\n'
    'end: {{eval:(a)+2}}\nstep: 1/3\nmajor: 3\npoints: A={{eval:3*(a)+(k)}}/3\n```\n\n$$A=?$$',
    [var('a', '-2..2'), var('k', '1|2|4|5'), var('N', 'eval:3*a+k')],
    [case('{{if:N<0|-}}\\frac{ {{eval:abs(N)}} }{3}')],
    ['Entre deux nombres entiers, la droite est partagée en $3$ : une graduation vaut $\\dfrac{1}{3}$.',
     '$A$ est à ${{k}}$ graduations de ${{a}}$ : $A={{a}}+\\dfrac{ {{k}} }{3}=' + col(
         '{{if:N<0|-}}\\dfrac{ {{eval:abs(N)}} }{3}') + '$.'])

LIRE_QUARTS = variation(
    'Lis l\'abscisse du point $A$.\n\n```line\nstart: {{a}}\nend: {{eval:(a)+3}}\nstep: 1/4\nmajor: 4\n'
    'points: A={{eval:4*(a)+(k)}}/4\n```\n\n$$A=?$$',
    [var('a', '-3..-1'), var('k', '1|3|5|7|9|11'), var('N', 'eval:4*a+k')],
    [case('{{eval:(4*(a)+(k))/4}}')],
    ['Entre deux nombres entiers, la droite est partagée en $4$ : une graduation vaut $\\dfrac{1}{4}=0{,}25$.',
     '$A$ est à ${{k}}$ graduation{{if:k>1|s}} de ${{a}}$ : $A={{a}}+\\dfrac{ {{k}} }{4}=' + col(
         '{{if:N<0|-}}\\dfrac{ {{eval:abs(N)}} }{4}') + '$.'])

MODELES.append(modele(
    '01-lire-une-abscisse', 'Lire l\'abscisse d\'un point',
    'Lire une abscisse sur une droite graduée en dixièmes, en tiers, en quarts, abscisses négatives comprises',
    ('Décimaux', 'Apprivoiser', 'Repérage'), 5,
    [LIRE_DIXIEMES, LIRE_TIERS, LIRE_QUARTS],
    [spec('−2 + 7 × 0,1 = −1,3', 0, {'a': -2, 'k': 7}, '-1.3', 'correct'),
     spec('Erreur : lu depuis 0 vers la gauche (−2,7)', 0, {'a': -2, 'k': 7}, '-2.7', 'incorrect'),
     spec('1 + 2/3 = 5/3', 1, {'a': 1, 'k': 2, 'N': 5}, '\\frac{5}{3}', 'correct'),
     spec('Erreur : graduation lue 0,2 (1,2)', 1, {'a': 1, 'k': 2, 'N': 5}, '1.2', 'incorrect'),
     spec('−2 + 4/3 = −2/3', 1, {'a': -2, 'k': 4, 'N': -2}, '-\\frac{2}{3}', 'correct'),
     spec('−3 + 9/4 = −3/4', 2, {'a': -3, 'k': 9, 'N': -3}, '-\\frac{3}{4}', 'correct'),
     spec('Même nombre en décimal', 2, {'a': -3, 'k': 9, 'N': -3}, '-0.75', 'correct'),
     spec('Erreur : −0,25 (signe et quarts)', 2, {'a': -3, 'k': 9, 'N': -3}, '-0.25', 'incorrect')]))

# --- 2. 2-250 : placer un réel -----------------------------------------------------------------

PLACER_DECIMAL = variation(
    'Place le nombre ${{if:a<0|-}}{{eval:abs(10*(a)+(k))/10;d}}$ sur la droite graduée.'.replace(
        '{{eval:abs(10*(a)+(k))/10;d}}', '{{b}}{,}{{c}}')
    + '\n\n```line\nstart: {{a}}\nend: {{eval:(a)+2}}\nstep: 1/10\nmajor: 10\nplacer: {{eval:10*(a)+(k)}}/10\n```',
    [var('a', '0..3'), var('k', '1..9'), var('b', 'eval:a'), var('c', 'eval:k')],
    None,
    ['Une graduation vaut $0{,}1$ : ${{b}}{,}{{c}}$ est à $' + col('{{k}}') + '$ graduations après ${{a}}$.'])

PLACER_TIERS = variation(
    'Place le nombre $' + selon('s', ['', '-']) + '\\dfrac{ {{n}} }{3}$ sur la droite graduée.\n\n```line\n'
    'start: -3\nend: 3\nstep: 1/3\nmajor: 3\nplacer: ' + selon('s', ['', '-']) + '{{n}}/3\n```',
    [var('s', '0|1'), var('n', '1|2|4|5|7|8')],
    None,
    ['Une graduation vaut $\\dfrac{1}{3}$ : $' + selon('s', ['', '-']) + '\\dfrac{ {{n}} }{3}$ est à $' + col('{{n}}')
     + '$ graduation{{if:n>1|s}} ' + selon('s', ['à droite', 'à gauche']) + ' de $0$.'])

PLACER_QUARTS = variation(
    'Place le nombre $-\\dfrac{ {{n}} }{4}$ sur la droite graduée.\n\n```line\nstart: -3\nend: 1\nstep: 1/4\n'
    'major: 4\nplacer: -{{n}}/4\n```',
    [var('n', '1|3|5|7|9|11')],
    None,
    ['Une graduation vaut $\\dfrac{1}{4}$ : $-\\dfrac{ {{n}} }{4}$ est à $' + col('{{n}}') + '$ graduation{{if:n>1|s}} à'
     ' gauche de $0$.'])

MODELES.append(modele(
    '02-placer-un-reel', 'Placer un réel sur une droite graduée',
    'Placer 2,7 (graduée en dixièmes), −5/3 (en tiers), −7/4 (en quarts)',
    ('Décimaux', 'Apprivoiser', 'Repérage'), 6,
    [PLACER_DECIMAL, PLACER_TIERS, PLACER_QUARTS],
    [spec('2,7 placé', 0, {'a': 2, 'k': 7, 'b': 2, 'c': 7}, '2.7', 'correct'),
     spec('Erreur : 2,8', 0, {'a': 2, 'k': 7, 'b': 2, 'c': 7}, '2.8', 'incorrect'),
     spec('−5/3 placé', 1, {'s': 1, 'n': 5}, '-5/3', 'correct'),
     spec('Erreur : 5/3 (signe)', 1, {'s': 1, 'n': 5}, '5/3', 'incorrect'),
     spec('−7/4 placé', 2, {'n': 7}, '-7/4', 'correct'),
     spec('Erreur : −3/4', 2, {'n': 7}, '-3/4', 'incorrect')],
    # Le geste écrit « -5/3 » (`placerText`), que la contrainte de forme refuse (bad_form) : la forme
    # n'a pas de sens pour une graduation posée, on la coupe.
    options={'constraints': {'form': 'off'}}))

# --- 3 et 4. 2-421, 2-253 : encadrements --------------------------------------------------------------

# Nombre, son écriture dans l'énoncé (développement donné), sa valeur (assez de chiffres)
NOMBRES = [
    ('\\sqrt{2}', '1{,}414213\\ldots', Decimal('1.41421356')),
    ('\\sqrt{3}', '1{,}732050\\ldots', Decimal('1.73205080')),
    ('\\sqrt{5}', '2{,}236067\\ldots', Decimal('2.23606797')),
    ('\\sqrt{7}', '2{,}645751\\ldots', Decimal('2.64575131')),
    ('\\pi', '3{,}141592\\ldots', Decimal('3.14159265')),
    ('\\dfrac{2}{7}', '0{,}285714\\ldots', Decimal('0.28571428')),
    ('\\dfrac{5}{3}', '1{,}666666\\ldots', Decimal('1.66666666')),
]


def troncature(x, pas):
    return (x / pas).to_integral_value(rounding=ROUND_FLOOR) * pas


# 2-421 : m = 3 × (rang du nombre) + (n − 1), n = 1, 2, 3
PRECISION = []
for nom, dev, x in NOMBRES:
    for n in (1, 2, 3):
        pas = Decimal(1).scaleb(-n)
        bas = troncature(x, pas)
        PRECISION.append((nom, dev, n, bas, bas + pas))

ENC_NOM = selon('m', [p[0] for p in PRECISION])
ENC_DEV = selon('m', [p[1] for p in PRECISION])
ENC_N = selon('m', [str(p[2]) for p in PRECISION])
ENC_BAS = selon('m', [virgule(p[3]) for p in PRECISION])
ENC_HAUT = selon('m', [virgule(p[4]) for p in PRECISION])

A_10N = variation(
    'On donne $' + ENC_NOM + '=' + ENC_DEV + '$. Donne son encadrement décimal à $10^{-' + ENC_N + '}$ près.\n\n'
    '$$?<' + ENC_NOM + '<?$$',
    [var('m', '0..' + str(len(PRECISION) - 1))],
    [case(selon('m', [point(p[3]) for p in PRECISION])), case(selon('m', [point(p[4]) for p in PRECISION]))],
    ['À $10^{-' + ENC_N + '}$ près : deux décimaux à ' + selon('m', [['un chiffre', 'deux chiffres', 'trois chiffres'][p[2] - 1] for p in PRECISION]) + ' après la virgule, qui se suivent'
     ' (écart $10^{-' + ENC_N + '}$). On **tronque** le développement pour la borne du bas, on ajoute $10^{-'
     + ENC_N + '}$ pour celle du haut.',
     '$$' + col(ENC_BAS) + '<' + ENC_NOM + '<' + col(ENC_HAUT, 1) + '$$'])

SP_P = {'m': 4}  # √3 à 10⁻² près : 1,73 < √3 < 1,74
MODELES.append(modele(
    '03-encadrement-10-n', 'Encadrement décimal à 10⁻ⁿ près',
    'Encadrer √2, √3, √5, √7, π, 2/7 ou 5/3, développement donné, à 10⁻¹, 10⁻² ou 10⁻³ près',
    ('Décimaux', 'Apprivoiser', 'Encadrer'), 8,
    [A_10N],
    [spec('√3 à 10⁻² près : 1,73 et 1,74', 0, SP_P, ['1.73', '1.74'], 'correct'),
     spec('Erreur : arrondi au lieu de tronqué (1,73 et 1,73)', 0, SP_P, ['1.73', '1.73'], 'incorrect'),
     spec('Erreur : à 10⁻¹ près (1,7 et 1,8)', 0, SP_P, ['1.7', '1.8'], 'incorrect'),
     spec('5/3 à 10⁻³ près : 1,666 et 1,667', 0, {'m': 20}, ['1.666', '1.667'], 'correct'),
     spec('Erreur : bornes échangées', 0, {'m': 20}, ['1.667', '1.666'], 'incorrect')]))

# 2-253 : amplitudes 0,5 ; 0,2 ; 0,05 ; m = 3 × (rang du nombre) + rang de l'amplitude
AMPLITUDES = [Decimal('0.5'), Decimal('0.2'), Decimal('0.05')]
AMPL = []
for nom, dev, x in NOMBRES:
    for a in AMPLITUDES:
        bas = troncature(x, a)
        AMPL.append((nom, dev, a, bas, bas + a))

AM_NOM = selon('m', [p[0] for p in AMPL])
AM_DEV = selon('m', [p[1] for p in AMPL])
AM_A = selon('m', [virgule(p[2]) for p in AMPL])
AM_BAS = selon('m', [virgule(p[3]) for p in AMPL])
AM_HAUT = selon('m', [virgule(p[4]) for p in AMPL])
AM_K = selon('m', [str(int(p[3] / p[2])) for p in AMPL])

AMPLITUDE = variation(
    'On donne $' + AM_NOM + '=' + AM_DEV + '$. Encadre ce nombre entre **deux multiples consécutifs** de $'
    + AM_A + '$ (encadrement d\'amplitude $' + AM_A + '$).\n\n$$?<' + AM_NOM + '<?$$',
    [var('m', '0..' + str(len(AMPL) - 1))],
    [case(selon('m', [point(p[3]) for p in AMPL])), case(selon('m', [point(p[4]) for p in AMPL]))],
    ['Les multiples de $' + AM_A + '$ : $0$, $' + AM_A + '$, $2\\times' + AM_A + '$… On cherche les deux qui'
     ' entourent le nombre :',
     '$$' + AM_K + '\\times' + AM_A + '=' + col(AM_BAS) + '<' + AM_NOM + '<' + col(AM_HAUT, 1) + '$$',
     'L\'écart entre les deux bornes est bien $' + AM_A + '$.'])

MODELES.append(modele(
    '04-encadrement-amplitude', 'Encadrement d\'amplitude donnée',
    'Encadrer √2, π, 2/7… entre deux multiples consécutifs de 0,5, 0,2 ou 0,05',
    ('Décimaux', 'Apprivoiser', 'Encadrer'), 9,
    [AMPLITUDE],
    [spec('π et 0,2 : 3 et 3,2', 0, {'m': 13}, ['3', '3.2'], 'correct'),
     spec('Erreur : 3,1 et 3,3 (pas des multiples de 0,2)', 0, {'m': 13}, ['3.1', '3.3'], 'incorrect'),
     spec('√2 et 0,05 : 1,4 et 1,45', 0, {'m': 2}, ['1.4', '1.45'], 'correct'),
     spec('Erreur : 1,41 et 1,46', 0, {'m': 2}, ['1.41', '1.46'], 'incorrect'),
     spec('√7 et 0,5 : 2,5 et 3', 0, {'m': 9}, ['2.5', '3'], 'correct')]))

# --- 5. 2-254 : chiffres significatifs ----------------------------------------------------------------


def arrondi_cs(x, cs):
    """x arrondi à cs chiffres significatifs (Decimal)."""
    exposant = Decimal(x).adjusted()
    pas = Decimal(1).scaleb(exposant - cs + 1)
    return (Decimal(x) / pas).to_integral_value(rounding=ROUND_HALF_UP) * pas


# Disques : rayon à 2 chiffres significatifs (en cm)
RAYONS = [Decimal(r) for r in ('1.5', '2.4', '3.2', '4.5', '5.8', '6.3', '7.1', '8.6', '9.4')]
DISQUES = []
for r in RAYONS:
    aire = Decimal(math.pi) * r * r
    DISQUES.append((r, aire, arrondi_cs(aire, 2)))

AIRE = variation(
    'Le rayon d\'un disque, mesuré à la règle, vaut $' + selon('m', [virgule(d[0]) for d in DISQUES])
    + '$ cm (deux chiffres significatifs). Donne son aire en cm², arrondie au nombre de chiffres significatifs'
    ' adapté.\n\n$$\\mathcal{A}\\approx?\\text{ cm}^2$$',
    [var('m', '0..' + str(len(DISQUES) - 1))],
    [case(selon('m', [point(d[2].normalize()) if d[2] == d[2].to_integral_value() else point(d[2]) for d in DISQUES]))],
    ['$$\\mathcal{A}=\\pi r^2=\\pi\\times' + selon('m', [virgule(d[0]) + '^2' for d in DISQUES]) + '\\approx'
     + selon('m', [virgule(d[1].quantize(Decimal('0.001'))) for d in DISQUES]) + '$$',
     'Le rayon n\'a que **deux** chiffres significatifs : le résultat n\'en garde pas plus.',
     '$$\\mathcal{A}\\approx' + col(selon('m', [virgule(d[2]) for d in DISQUES])) + '\\text{ cm}^2$$'])

# Vitesses : distance (3 c. s.) en km, durée (3 c. s.) en h
TRAJETS = [(Decimal('125'), Decimal('1.75')), (Decimal('248'), Decimal('2.25')), (Decimal('312'), Decimal('3.50')),
           (Decimal('87.5'), Decimal('1.25')), (Decimal('163'), Decimal('2.75')), (Decimal('405'), Decimal('4.50'))]
VITESSES = []
for d, t in TRAJETS:
    v = d / t
    VITESSES.append((d, t, v, arrondi_cs(v, 3)))

VITESSE = variation(
    'Une voiture parcourt $' + selon('m', [virgule(v[0]) for v in VITESSES]) + '$ km en $'
    + selon('m', [virgule(v[1]) for v in VITESSES]) + '$ h (mesures à trois chiffres significatifs). Donne sa'
    ' vitesse moyenne en km/h, arrondie au nombre de chiffres significatifs adapté.\n\n$$v\\approx?\\text{ km/h}$$',
    [var('m', '0..' + str(len(VITESSES) - 1))],
    [case(selon('m', [point(v[3]) for v in VITESSES]))],
    ['$$v=\\dfrac{d}{t}=\\dfrac{' + selon('m', [virgule(v[0]) for v in VITESSES]) + '}{'
     + selon('m', [virgule(v[1]) for v in VITESSES]) + '}\\approx'
     + selon('m', [virgule(v[2].quantize(Decimal('0.001'))) for v in VITESSES]) + '$$',
     'Les données ont **trois** chiffres significatifs : on en garde trois.',
     '$$v\\approx' + col(selon('m', [virgule(v[3]) for v in VITESSES])) + '\\text{ km/h}$$'])

COMPTER = [('0{,}00340', 3, 'les zéros de tête ne comptent pas, le zéro final si'),
           ('2{,}050', 4, 'le zéro entre deux chiffres compte, le zéro final aussi'),
           ('0{,}07', 1, 'les zéros de tête ne comptent pas'),
           ('12{,}0', 3, 'le zéro final d\'une mesure compte'),
           ('305', 3, 'le zéro entre deux chiffres compte'),
           ('0{,}1020', 4, 'le zéro de tête ne compte pas, les autres si')]
COMBIEN = variation(
    'Combien de chiffres significatifs la mesure $' + selon('m', [c[0] for c in COMPTER]) + '$ a-t-elle ?\n\n$$?$$',
    [var('m', '0..' + str(len(COMPTER) - 1))],
    [case(selon('m', [str(c[1]) for c in COMPTER]))],
    ['On compte les chiffres à partir du **premier chiffre non nul** : '
     + selon('m', [c[2] for c in COMPTER]) + '.',
     '$' + selon('m', [c[0] for c in COMPTER]) + '$ a $' + col(selon('m', [str(c[1]) for c in COMPTER]))
     + '$ chiffres significatifs.'])

MODELES.append(modele(
    '05-chiffres-significatifs', 'Arrondir avec le bon nombre de chiffres significatifs',
    'Compter les chiffres significatifs d\'une mesure ; aire d\'un disque (rayon à 2 c. s.) et vitesse moyenne'
    ' (données à 3 c. s.) arrondies en conséquence',
    ('Décimaux', 'Apprivoiser', 'Arrondir'), 8,
    [COMBIEN, AIRE, VITESSE],
    [spec('0,00340 : 3', 0, {'m': 0}, '3', 'correct'),
     spec('Erreur : zéros de tête comptés (6)', 0, {'m': 0}, '6', 'incorrect'),
     spec('2,050 : 4', 0, {'m': 1}, '4', 'correct'),
     spec('r = 3,2 : 32 cm²', 1, {'m': 2}, '32', 'correct'),
     spec('Erreur : trop de chiffres (32,17)', 1, {'m': 2}, '32.17', 'incorrect'),
     spec('Erreur : π × 3,2 (10)', 1, {'m': 2}, '10', 'incorrect'),
     spec('125 km en 1,75 h : 71,4 km/h', 2, {'m': 0}, '71.4', 'correct'),
     spec('Erreur : 71 (deux chiffres seulement)', 2, {'m': 0}, '71', 'incorrect')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

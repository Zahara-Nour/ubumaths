"""Écrit les 4 modèles du lot 7 « Droite graduée et ordre » de la 6e dans
scripts/questions/6-droite-ordre/.

Phase 0 validée par David le 2026-10-31 (§ 15 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (6-107, 6-108 : graduation adaptée ; 6-128 : graduation adaptée,
régulièrement espacée, fractions « cas simples » ; 6-110 : hérite de « general »). Un point par
modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- droites pensées pour un téléphone : 16 intervalles au plus (alerte sous 20 px à 320 px) ;
- décimaux calculés en entiers (`(10*n+k)/10;d`) : `;d` rend l'écriture décimale ;
- droite à placer : la réponse est `placerAnswer` (décimal à point `0.75`, sinon fraction LaTeX) ;
- ```ranger : étiquettes écrites dans le bon ordre, mélangées au tirage ; la réponse d'une place
  est la position AFFICHÉE de l'étiquette (specs : positions relevées avec le générateur) ; jamais
  deux écritures d'un même nombre ;
- niveaux à la suite des niveaux publiés : Décimaux / Repérage (catégorie neuve) → 1, 2 ;
  Fractions / Repérage (1 à 6, CM1) → 7 ; Décimaux / Comparer (1 à 3) → 4.

    python3 docs/wip/questions/lot-7-droite-ordre.py scripts/questions
"""
import json
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-droite-ordre')
SANS_SIMPLIFIER = {'constraints': {'reducedFractions': 'off'}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=45, options=None):
    m = {'title': title, 'description': description, 'grades': ['6'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : la case
    # vient d'un bloc (droite à placer, ```ranger), sans `blanks[]`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def dec(expr):
    """Écriture décimale d'une expression de gabarit (`(10*n+k)/10`)."""
    return '{{eval:' + expr + ';d}}'


def droite(start, end, step, major, ligne):
    return ('\n\n```line\nstart: ' + start + '\nend: ' + end + '\nstep: ' + step + '\nmajor: '
            + major + '\n' + ligne + '\n```')


MODELES = []

# --- Les trois droites des décimaux (repérer, placer) ---------------------------------------
# Dixièmes : de n à n + 1,5 (15 intervalles) ; centièmes : loupe de a,b à a,b + 0,15 ;
# graduation de 0,5 ou 0,25 : de 0 à 4 (8 ou 16 intervalles).

DIXIEMES = [var('n', '0..8'), var('k', '1..14')]
DIXIEMES_COND = ['k!=10']
X_DIXIEMES = dec('(10*n+k)/10')


def ligne_dixiemes(l):
    return droite('{{n}}', dec('(10*n+15)/10'), '0.1', '10', l)


CENTIEMES = [var('a', '1..9'), var('b', '0..8'), var('k', '1..14')]
CENTIEMES_COND = ['k!=10']
X_CENTIEMES = dec('(100*a+10*b+k)/100')


def ligne_centiemes(l):
    # Graduations écrites données en décimal : calculées, elles s'écriraient en fractions (7/5)
    return droite(dec('(10*a+b)/10'), dec('(100*a+10*b+15)/100'), '0.01', '10',
                  'labels: ' + dec('(10*a+b)/10') + ', ' + dec('(10*a+b+1)/10') + '\n' + l)


QUARTS = [var('q', '2|4'), var('k', '1..{{eval:4*q-1}}')]
QUARTS_COND = ['mod(k,q)!=0']
X_QUARTS = dec('k/q')


def ligne_quarts(l):
    return droite('0', '4', dec('1/q'), '{{q}}', l)


PAS_DIXIEMES = ('**Ce que vaut un petit intervalle.** Entre deux entiers qui se suivent, l\'unité'
                ' est partagée en $10$ : chaque petit intervalle vaut $0.1$.')
PAS_CENTIEMES = ('**Ce que vaut un petit intervalle.** Entre $' + dec('(10*a+b)/10') + '$ et $'
                 + dec('(10*a+b+1)/10') + '$, le dixième est partagé en $10$ : chaque petit'
                 ' intervalle vaut $0.01$.')
PAS_QUARTS = ('**Ce que vaut un petit intervalle.** L\'unité est partagée en ${{q}}$ : chaque'
              ' petit intervalle vaut $' + dec('1/q') + '$.')

COMPTE_DIXIEMES = ('$' + X_DIXIEMES + '$, c\'est ${{k}}$ petits intervalles à partir de ${{n}}$ :'
                   ' ${{n}} + {{k}} \\times 0.1 = ' + col(X_DIXIEMES) + '$.')
COMPTE_CENTIEMES = ('$' + X_CENTIEMES + '$, c\'est ${{k}}$ petits intervalles à partir de $'
                    + dec('(10*a+b)/10') + '$ : $' + dec('(10*a+b)/10') + ' + {{k}} \\times 0.01 = '
                    + col(X_CENTIEMES) + '$.')
COMPTE_QUARTS = ('$' + X_QUARTS + '$, c\'est ${{k}}$ petits intervalles à partir de $0$ : ${{k}}'
                 ' \\times ' + dec('1/q') + ' = ' + col(X_QUARTS) + '$.')

# --- 1. 6-108 : repérer un nombre décimal ---------------------------------------------------

REPERER = 'Quel nombre repère le point $A$ ?'
CASE_A = '\n\n$$A : ?$$'

MODELES.append(modele(
    '01-reperer-un-nombre-decimal', 'Repérer un nombre décimal',
    'Lire l\'abscisse d\'un point sur une demi-droite graduée : en dixièmes, en centièmes (droite'
    ' agrandie), en demis ou en quarts',
    'Décimaux', 'Apprivoiser', 'Repérage', 1,
    [variation(REPERER + ligne_dixiemes('points: A=' + X_DIXIEMES) + CASE_A, DIXIEMES,
               [X_DIXIEMES], [PAS_DIXIEMES, COMPTE_DIXIEMES], DIXIEMES_COND),
     variation(REPERER + ligne_centiemes('points: A=' + X_CENTIEMES) + CASE_A, CENTIEMES,
               [X_CENTIEMES], [PAS_CENTIEMES, COMPTE_CENTIEMES], CENTIEMES_COND),
     variation(REPERER + ligne_quarts('points: A=' + X_QUARTS) + CASE_A, QUARTS, [X_QUARTS],
               [PAS_QUARTS, COMPTE_QUARTS], QUARTS_COND)],
    [spec('2,3', 0, {'n': 2, 'k': 3}, '2,3', 'correct'),
     spec('Erreur : 2,03 (centièmes)', 0, {'n': 2, 'k': 3}, '2,03', 'incorrect'),
     spec('Erreur : 3 (graduations comptées)', 0, {'n': 2, 'k': 3}, '3', 'incorrect'),
     spec('Après l\'entier suivant : 3,3', 0, {'n': 2, 'k': 13}, '3,3', 'correct'),
     spec('Erreur : 2,13', 0, {'n': 2, 'k': 13}, '2,13', 'incorrect'),
     spec('Loupe : 2,37', 1, {'a': 2, 'b': 3, 'k': 7}, '2,37', 'correct'),
     spec('Erreur : 3 (intervalle lu 0,1)', 1, {'a': 2, 'b': 3, 'k': 7}, '3', 'incorrect'),
     spec('Erreur : 2,307', 1, {'a': 2, 'b': 3, 'k': 7}, '2,307', 'incorrect'),
     spec('Loupe, après le dixième suivant : 5,02', 1, {'a': 4, 'b': 9, 'k': 12}, '5,02', 'correct'),
     spec('Quarts : 0,75', 2, {'q': 4, 'k': 3}, '0,75', 'correct'),
     spec('Erreur : 0,3 (intervalle lu 0,1)', 2, {'q': 4, 'k': 3}, '0,3', 'incorrect'),
     spec('Demis : 2,5', 2, {'q': 2, 'k': 5}, '2,5', 'correct')]))

# --- 2. 6-107 : placer un nombre décimal ----------------------------------------------------

PLACER = 'Place le nombre $NOMBRE$ sur la demi-droite graduée.'
DEUX_POINTS = [var('n', '0..8'), var('k', '1..14'), var('m', '1..14')]
X_M = dec('(10*n+m)/10')

MODELES.append(modele(
    '02-placer-un-nombre-decimal', 'Placer un nombre décimal',
    'Placer un nombre décimal sur une demi-droite graduée : en dixièmes, en centièmes (droite'
    ' agrandie), en demis ou en quarts, puis deux points sur la même droite',
    'Décimaux', 'Apprivoiser', 'Repérage', 2,
    [variation(PLACER.replace('NOMBRE', X_DIXIEMES)
               + ligne_dixiemes('placer: ' + X_DIXIEMES), DIXIEMES, None,
               [PAS_DIXIEMES, COMPTE_DIXIEMES], DIXIEMES_COND),
     variation(PLACER.replace('NOMBRE', X_CENTIEMES)
               + ligne_centiemes('placer: ' + X_CENTIEMES), CENTIEMES, None,
               [PAS_CENTIEMES, COMPTE_CENTIEMES], CENTIEMES_COND),
     variation(PLACER.replace('NOMBRE', X_QUARTS) + ligne_quarts('placer: ' + X_QUARTS), QUARTS,
               None, [PAS_QUARTS, COMPTE_QUARTS], QUARTS_COND),
     variation('Place les points $A(' + X_DIXIEMES + ')$ et $B(' + X_M + ')$ sur la demi-droite'
               ' graduée.' + ligne_dixiemes('placer: A=' + X_DIXIEMES + ' ; B=' + X_M),
               DEUX_POINTS, None,
               [PAS_DIXIEMES,
                '$A$ est à ${{k}}$ petits intervalles de ${{n}}$, $B$ à ${{m}}$ petits'
                ' intervalles : $A(' + col(X_DIXIEMES) + ')$, $B(' + col(X_M) + ')$.'],
               ['k!=10', 'm!=10', 'abs(k-m)>=3'])],
    [spec('2,3 placé', 0, {'n': 2, 'k': 3}, '2.3', 'correct'),
     spec('Erreur : 3', 0, {'n': 2, 'k': 3}, '3', 'incorrect'),
     spec('3,3 placé (après 3)', 0, {'n': 2, 'k': 13}, '3.3', 'correct'),
     spec('Erreur : 2,4 (un intervalle de trop)', 0, {'n': 2, 'k': 3}, '2.4', 'incorrect'),
     spec('Loupe : 2,37 placé', 1, {'a': 2, 'b': 3, 'k': 7}, '2.37', 'correct'),
     spec('Erreur : 2,44 (0,07 compté depuis 2,37)', 1, {'a': 2, 'b': 3, 'k': 7}, '2.44',
          'incorrect'),
     spec('Quarts : 0,75 placé', 2, {'q': 4, 'k': 3}, '0.75', 'correct'),
     spec('Erreur : 3 quarts lus 3 unités', 2, {'q': 4, 'k': 3}, '3', 'incorrect'),
     spec('Deux points : A 2,3 ; B 2,8', 3, {'n': 2, 'k': 3, 'm': 8}, ['2.3', '2.8'], 'correct'),
     spec('Erreur : A et B échangés', 3, {'n': 2, 'k': 3, 'm': 8}, ['2.8', '2.3'], 'incorrect')]))

# --- 3. 6-128 : placer une fraction (graduation qui n'est pas en d) -------------------------
# La droite est graduée en D = k × d : la fraction n/d (irréductible) se place en écrivant la
# fraction égale de dénominateur D. Une à trois unités, 16 intervalles au plus.

FRACTION_VARS = [var('d', '2..6'), var('k', '2..{{eval:floor(12/d)}}'), var('D', 'eval:k*d'),
                 var('u', 'eval:min(3,floor(16/D))'), var('n', '1..{{eval:u*d-1}}')]
LIGNE_FRACTION = '\n\n```line\nstart: 0\nend: {{u}}\nstep: 1/{{D}}\nmajor: {{D}}\nLIGNE\n```'
PAS_FRACTION = ('**Ce que vaut un petit intervalle.** De $0$ à $1$, l\'unité est partagée en'
                ' ${{D}}$ parts égales : chaque petit intervalle vaut $' + fr('1', '{{D}}') + '$.')
EGALE = ('**Une fraction égale.** $' + fr('{{n}}', '{{d}}') + ' = ' + fr('{{n}} \\times {{k}}',
         '{{d}} \\times {{k}}') + ' = ' + col(fr('{{eval:n*k}}', '{{D}}')) + '$ : on compte'
         ' ${{eval:n*k}}$ petits intervalles à partir de $0$.')

MODELES.append(modele(
    '03-placer-une-fraction-par-une-fraction-egale', 'Placer une fraction en passant par une fraction égale',
    'Placer une fraction sur une demi-droite graduée dans un autre dénominateur (2/3 sur une droite'
    ' en sixièmes) : passer par la fraction égale ; puis deux points sur la même droite',
    'Fractions', 'Apprivoiser', 'Repérage', 7,
    [variation('Place le nombre $' + fr('{{n}}', '{{d}}') + '$ sur la demi-droite graduée.'
               + LIGNE_FRACTION.replace('LIGNE', 'placer: {{n}}/{{d}}'), FRACTION_VARS, None,
               [PAS_FRACTION, EGALE], ['gcd(n,d)==1']),
     variation('Place les points $A\\left(' + fr('{{a}}', '{{D}}') + '\\right)$ et $B\\left('
               + fr('{{n}}', '{{d}}') + '\\right)$ sur la demi-droite graduée.'
               + LIGNE_FRACTION.replace('LIGNE', 'placer: A={{a}}/{{D}} ; B={{n}}/{{d}}'),
               FRACTION_VARS + [var('a', '1..{{eval:u*D-1}}')], None,
               [PAS_FRACTION,
                '$A$ : ${{a}}$ petits intervalles à partir de $0$.',
                EGALE.replace('**Une fraction égale.**', '$B$ :')],
               ['gcd(n,d)==1', 'mod(a,D)!=0', 'abs(a-n*k)>=2'])],
    [spec('2/3 sur une droite en sixièmes', 0, {'d': 3, 'k': 2, 'D': 6, 'u': 2, 'n': 2},
          '\\frac{2}{3}', 'correct'),
     spec('Erreur : 2/6 (numérateur gardé)', 0, {'d': 3, 'k': 2, 'D': 6, 'u': 2, 'n': 2},
          '\\frac{1}{3}', 'incorrect'),
     spec('1/2 sur une droite en dixièmes', 0, {'d': 2, 'k': 5, 'D': 10, 'u': 1, 'n': 1}, '0.5',
          'correct'),
     spec('Erreur : 1/10 (numérateur gardé)', 0, {'d': 2, 'k': 5, 'D': 10, 'u': 1, 'n': 1}, '0.1',
          'incorrect'),
     spec('5/4 sur une droite en huitièmes', 0, {'d': 4, 'k': 2, 'D': 8, 'u': 2, 'n': 5}, '1.25',
          'correct'),
     spec('Deux points : A 5/12, B 3/4 (9/12)', 1,
          {'d': 4, 'k': 3, 'D': 12, 'u': 1, 'n': 3, 'a': 5}, ['\\frac{5}{12}', '0.75'], 'correct'),
     spec('Erreur : B à 3/12', 1, {'d': 4, 'k': 3, 'D': 12, 'u': 1, 'n': 3, 'a': 5},
          ['\\frac{5}{12}', '0.25'], 'incorrect')],
    options=SANS_SIMPLIFIER))

# --- 4. 6-110 : ranger des nombres décimaux -------------------------------------------------
# Cinq étiquettes, écrites dans le bon ordre (du plus petit au plus grand pour `<`).


def etiquettes(signe, valeurs):
    return ('\n\n```ranger\nsigne: ' + signe + '\n'
            + ''.join('- $' + v + '$\n' for v in valeurs) + '```')


def chaine(valeurs, signe):
    return '$$' + col((' ' + signe + ' ').join(valeurs)) + '$$'


# v1 : même partie entière ; a,bm (trois décimales) est plus petit que a,(b+2) (une seule)
LONGUEUR = [dec('(100*a+c)/100'), dec('(10*a+b)/10'), dec('(1000*a+100*b+m)/1000'),
            dec('(10*a+b+2)/10'), dec('(100*a+10*b+20+h)/100')]
LONGUEUR_VARS = [var('a', '1..9'), var('c', '1..9'), var('b', '1..5'), var('m', '11..99'),
                 var('h', '1..9')]
# v2 : parties entières proches, un entier parmi eux ; écrites du plus grand au plus petit
PROCHES = [dec('(100*a-100+90+r)/100'), '{{a}}', dec('(100*a+c)/100'), dec('(10*a+b)/10'),
           dec('(1000*a+1000+f)/1000')]
PROCHES_VARS = [var('a', '2..9'), var('r', '1..9'), var('c', '1..9'), var('b', '2..9'),
                var('f', '1..9')]
# v3 : zéros intercalés, chiffres z, 0 et 5 : a,0z < a,0z5 < a,z < a,z05 < a,z5
ZEROS = [dec('(100*a+z)/100'), dec('(1000*a+10*z+5)/1000'), dec('(10*a+z)/10'),
         dec('(1000*a+100*z+5)/1000'), dec('(100*a+10*z+5)/100')]
ZEROS_VARS = [var('a', '0..9'), var('z', '1..9')]

POS = ['4', '0', '1', '2', '3']


def rang(ordre):
    """Réponse de l'élève qui pose, place par place, les étiquettes écrites aux rangs `ordre`."""
    return [POS[i] for i in ordre]


EX_LONGUEUR = {'a': 3, 'c': 7, 'b': 2, 'm': 45, 'h': 6}
EX_PROCHES = {'a': 5, 'r': 8, 'c': 3, 'b': 6, 'f': 2}
EX_ZEROS = {'a': 4, 'z': 3}

METHODE = ('**Comparer des décimaux.** On compare d\'abord les parties entières, puis les'
           ' dixièmes, puis les centièmes, puis les millièmes : le nombre de chiffres après la'
           ' virgule ne compte pas.')

MODELES.append(modele(
    '04-ranger-des-nombres-decimaux', 'Ranger des nombres décimaux',
    'Ranger cinq nombres décimaux : même partie entière et nombres de décimales différents'
    ' (3,247 < 3,4), parties entières proches avec un entier, zéros intercalés (3,05 < 3,055 < 3,5)',
    'Décimaux', 'Apprivoiser', 'Comparer', 4,
    [variation('Range ces nombres du plus petit au plus grand.' + etiquettes('<', LONGUEUR),
               LONGUEUR_VARS, None,
               [METHODE,
                'Même partie entière ${{a}}$ : on compare les dixièmes. $' + LONGUEUR[2]
                + '$ a ${{b}}$ dixièmes, $' + LONGUEUR[3] + '$ en a ${{eval:b+2}}$ : $'
                + LONGUEUR[2] + ' < ' + LONGUEUR[3] + '$, même avec plus de chiffres.',
                chaine(LONGUEUR, '<')]),
     variation('Range ces nombres du plus grand au plus petit.'
               + etiquettes('>', PROCHES[::-1]), PROCHES_VARS, None,
               [METHODE,
                'Parties entières d\'abord : $' + PROCHES[4] + '$ a ${{eval:a+1}}$ unités, $'
                + PROCHES[0] + '$ n\'en a que ${{eval:a-1}}$. Les trois autres ont ${{a}}$ unités'
                '.',
                chaine(PROCHES[::-1], '>')]),
     variation('Range ces nombres du plus petit au plus grand.' + etiquettes('<', ZEROS),
               ZEROS_VARS, None,
               [METHODE,
                'Dixièmes : $0$ pour $' + ZEROS[0] + '$ et $' + ZEROS[1] + '$, ${{z}}$ pour les'
                ' trois autres. Puis les centièmes, puis les millièmes.',
                chaine(ZEROS, '<')])],
    # Réponses = positions AFFICHÉES des étiquettes, relevées avec le générateur (variables des
    # specs) : l'étiquette écrite au rang i est affichée en POS[i]
    [spec('3,07 < 3,2 < 3,245 < 3,4 < 3,46', 0, EX_LONGUEUR, rang([0, 1, 2, 3, 4]), 'correct'),
     spec('Erreur : 3,245 après 3,4 (plus de chiffres)', 0, EX_LONGUEUR, rang([0, 1, 3, 2, 4]),
          'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_LONGUEUR, rang([4, 3, 2, 1, 0]), 'incorrect'),
     spec('6,002 > 5,6 > 5,03 > 5 > 4,98', 1, EX_PROCHES, rang([0, 1, 2, 3, 4]), 'correct'),
     spec('Erreur : 6,002 après 5,6 (zéros)', 1, EX_PROCHES, rang([1, 0, 2, 3, 4]), 'incorrect'),
     spec('Erreur : 5 avant 5,03', 1, EX_PROCHES, rang([0, 1, 3, 2, 4]), 'incorrect'),
     spec('4,03 < 4,035 < 4,3 < 4,305 < 4,35', 2, EX_ZEROS, rang([0, 1, 2, 3, 4]), 'correct'),
     spec('Erreur : 4,3 avant 4,035', 2, EX_ZEROS, rang([0, 2, 1, 3, 4]), 'incorrect'),
     spec('Erreur : 4,35 avant 4,305', 2, EX_ZEROS, rang([0, 1, 2, 4, 3]), 'incorrect')],
    delay=60))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

"""Écrit les 6 modèles du lot 7a du CM2 (droites graduées : entiers et fractions) dans
scripts/questions/cm2-7a/.

Phase 0 du 2026-11-02 (§ 12 du journal `docs/wip/questions-cm2-progress.md`), recommandations
suivies par David (§ 12.1) : 7a = 129, 007 (entiers), 018, 134, 017, 133 (fractions) ; #4 garde la
variation « entier moins une fraction » (exemple du BO, 4 − 2/3).
Bornes : `cycle3.json`, CM2 (graduations de 1 en 1, 10 en 10, 100 en 100, etc. ; fractions
supérieures à 1, 5/3, 7/3 ; dénominateur au plus 60 ; écritures 3 + 2/10, 4 − 2/3). Un point par
modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier`.

Jumeaux du CM1 (`lot-cm1-3a.py`, unité partagée en 2 à 10 parts, droite qui part de 0) : au CM2,
des grands nombres, des fractions au-delà de 1, des morceaux de droite qui ne partent pas de 0.

Décisions et pièges :
- au plus 12 intervalles par droite, pour que la droite à placer se vise au doigt sur un
  téléphone (`phoneGapWarning`) ; d'où les morceaux de droite pour les dénominateurs 7 à 12 ;
- entiers : deux graduations étiquetées (`labels:`), la première et la cinquième après elle ;
  l'élève en déduit le pas (grande graduation toutes les 5, `major: 5`) ;
- `labels:` remplace les étiquettes calculées : seules les valeurs écrites sont affichées ;
- espaces de l'école exigés quand l'élève tape un entier (#1) ; contrôle des espaces coupé
  (`spaces: off`) sur la droite à placer (#2), dont la réponse est écrite par `placerAnswer`, sans
  espaces : sinon un point juste à 3 470 000 serait « forme à améliorer » ;
- `reducedFractions: off` pour les fractions : toute fraction égale est juste, comme au CM1 ;
- niveaux : suite des niveaux de chaque catégorie (Apprivoiser / Repérage), relevés en prod le
  2026-11-02 : Entiers 1, Fractions 1 à 7.

    python3 docs/wip/questions/lot-cm2-7a.py scripts/questions/cm2-7a
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
ECOLE = {'constraints': {'spacesFromFourDigits': True}}
# La réponse d'une droite à placer passe par le juge de forme : sans espaces (`placerAnswer`),
# elle serait « à améliorer » dès 5 chiffres (contrôle `spaces` en `warn` par défaut)
SANS_ESPACES = {'constraints': {'spaces': 'off'}}
SANS_SIMPLIFIER = {'constraints': {'reducedFractions': 'off'}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, level, variations, specs, options, delay=45):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': theme, 'domain': 'Apprivoiser', 'subdomain': 'Repérage',
                 'level': level, 'delay': delay, 'status': 'draft', 'options': options,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : la case
    # vient de la droite à placer, sans `blanks[]`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{green}{' + x + '}'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def esp(n):
    """Réponse tapée avec les espaces de l'école : 3450000 → 3\\,450\\,000."""
    return f'{n:,}'.replace(',', '\\,')


def droite(start, end, step, major, *lignes):
    return ('\n\n```line\nstart: ' + start + '\nend: ' + end + '\nstep: ' + step + '\nmajor: '
            + major + '\n' + ''.join(l + '\n' for l in lignes) + '```')


MODELES = []


# --- 1-2. Entiers : CM2-129 (lire), CM2-007 (placer) ---------------------------------------
# Droite de 10 intervalles de pas s ; étiquettes sur la graduation de départ a et sur a + 5s.
# V1 : s = 1, 10, 100 (nombres jusqu'à 100 000) ; V2 : s = 1 000, 10 000, 100 000 (jusqu'à
# 99 900 000). Le point est sur une graduation non étiquetée.

ENTIERS_V1 = [var('s', '1|10|100'), var('b', '1..99'), var('a', 'eval:10*s*b'),
              var('l', 'eval:a+5*s'), var('fin', 'eval:a+10*s')]
ENTIERS_V2 = [var('s', '1000|10000|100000'), var('b', '1..99'), var('a', 'eval:10*s*b'),
              var('l', 'eval:a+5*s'), var('fin', 'eval:a+10*s')]
POINT_K = [var('k', '1..9'), var('x', 'eval:a+k*s')]


def droite_entiers(*lignes):
    return droite('{{a}}', '{{fin}}', '{{s}}', '5', 'labels: {{a}}, {{l}}', *lignes)


PAS_ENTIERS = ('**Le pas.** De ${{a}}$ à ${{l}}$, il y a $5$ intervalles : un intervalle vaut'
               ' $({{l}} - {{a}}) \\div 5 = {{s}}$.')


def lire_entier(variables):
    return variation(
        'Quel nombre repère le point $A$ ?'
        + droite_entiers('points: A={{x}}') + '\n\n$$A : ?$$',
        variables + POINT_K, ['{{x}}'],
        [PAS_ENTIERS,
         'Le point $A$ est à ${{k}}$ intervalle{{if:k>1|s|}} de ${{a}}$ : il repère ${{a}} + {{k}}'
         ' \\times {{s}} = ' + col('{{x}}') + '$.'],
        ['k!=5'])


def placer_entier(variables):
    return variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.' + droite_entiers('placer: {{x}}'),
        variables + POINT_K, None,
        [PAS_ENTIERS,
         '${{x}} = {{a}} + {{k}} \\times {{s}}$ : on part de ${{a}}$ et on avance de ${{k}}$'
         ' intervalle{{if:k>1|s|}}.'],
        ['k!=5'])


PLACER_DEUX_ENTIERS = variation(
    'Place les points $A({{x}})$ et $B({{y}})$ sur la demi-droite graduée.'
    + droite_entiers('placer: A={{x}} ; B={{y}}'),
    [var('s', '10|100|1000|10000'), var('b', '1..99'), var('a', 'eval:10*s*b'),
     var('l', 'eval:a+5*s'), var('fin', 'eval:a+10*s'), var('k', '1..9'), var('m', '1..9'),
     var('x', 'eval:a+k*s'), var('y', 'eval:a+m*s')],
    None,
    [PAS_ENTIERS,
     '$A$ : ${{x}} = {{a}} + {{k}} \\times {{s}}$ ; $B$ : ${{y}} = {{a}} + {{m}} \\times {{s}}$.'],
    ['k!=5', 'm!=5', 'k!=m'])

EX_V1 = {'s': 100, 'b': 34, 'a': 3400, 'l': 3900, 'fin': 4400, 'k': 3, 'x': 3700}
EX_V2 = {'s': 10000, 'b': 34, 'a': 3400000, 'l': 3450000, 'fin': 3500000, 'k': 7,
         'x': 3470000}
EX_DEUX = {'s': 10, 'b': 12, 'a': 1200, 'l': 1250, 'fin': 1300, 'k': 2, 'm': 8, 'x': 1220,
           'y': 1280}

MODELES.append(modele(
    '01-reperer-un-entier', 'Repérer un point par un nombre entier',
    'Lire le nombre entier qui repère un point d\'une demi-droite graduée de 1 en 1, 10 en 10 ou'
    ' 100 en 100, ou de 1 000 en 1 000 jusqu\'à 100 000 en 100 000 (3 470 000) ; deux graduations'
    ' étiquetées, le pas est à trouver',
    'Entiers', 2, [lire_entier(ENTIERS_V1), lire_entier(ENTIERS_V2)],
    [spec('A repère 3 700', 0, EX_V1, esp(3700), 'correct'),
     spec('Erreur : 3 403 (intervalle compté pour 1)', 0, EX_V1, esp(3403), 'incorrect'),
     spec('Erreur : 3 600 (graduation voisine)', 0, EX_V1, esp(3600), 'incorrect'),
     spec('Sans espaces : forme à améliorer', 0, EX_V1, '3700', 'unoptimal_form', ['spaces']),
     spec('A repère 3 470 000', 1, EX_V2, esp(3470000), 'correct'),
     spec('Erreur : 3 407 000 (pas de 1 000)', 1, EX_V2, esp(3407000), 'incorrect'),
     spec('Erreur : 3 400 007 (intervalle compté pour 1)', 1, EX_V2, esp(3400007), 'incorrect')],
    ECOLE))

MODELES.append(modele(
    '02-placer-un-entier', 'Placer un nombre entier sur une demi-droite graduée',
    'Placer un nombre entier sur une demi-droite graduée de 1 en 1 jusqu\'à 100 000 en 100 000'
    ' (deux graduations étiquetées, le pas est à trouver), puis deux points sur la même droite',
    'Entiers', 3,
    [placer_entier(ENTIERS_V1), placer_entier(ENTIERS_V2), PLACER_DEUX_ENTIERS],
    [spec('3 700 placé', 0, EX_V1, '3700', 'correct'),
     spec('Erreur : 3 600 (graduation voisine)', 0, EX_V1, '3600', 'incorrect'),
     spec('3 470 000 placé', 1, EX_V2, '3470000', 'correct'),
     spec('Erreur : 3 420 000 (2 intervalles au lieu de 7)', 1, EX_V2, '3420000', 'incorrect'),
     spec('A 1 220, B 1 280 placés', 2, EX_DEUX, ['1220', '1280'], 'correct'),
     spec('Erreur : A et B échangés', 2, EX_DEUX, ['1280', '1220'], 'incorrect')],
    SANS_ESPACES))


# --- 3-6. Fractions : CM2-018, CM2-134 (lire), CM2-017, CM2-133 (placer) --------------------

UNITE_PARTAGEE = ('**L\'unité.** D\'une graduation entière à la suivante, l\'unité est partagée en'
                  ' ${{d}}$ parts égales : chaque petit intervalle vaut $' + frac('1', '{{d}}')
                  + '$.')

# Droite qui part de 0, au moins deux unités : d de 2 à 6, u unités (au plus 12 intervalles)
DEPUIS_ZERO = [var('d', '2|3|4|5|6'), var('u', 'eval:min(4,floor(12/d))'),
               var('nm', 'eval:u*d-1'), var('n0', 'eval:d+1')]
# Morceau d'une unité, de k à k + 1 : d de 3 à 12
MORCEAU = [var('d', '3|4|5|6|7|8|9|10|12'), var('k', '1..5'), var('dm', 'eval:d-1'),
           var('r', '1..{{dm}}'), var('n', 'eval:k*d+r')]
# Morceau de m à m + w (w = 2 unités pour d ≤ 6, 1 pour d ≥ 7) : entier plus ou moins fraction
MIXTE = [var('d', '2|3|4|5|6|7|8|9|10|12'), var('w', 'eval:min(2,floor(12/d))'),
         var('m', '1..5'), var('dm', 'eval:d-1'), var('r', '1..{{dm}}')]


def droite_zero(*lignes):
    return droite('0', '{{u}}', '1/{{d}}', '{{d}}', *lignes)


def droite_morceau(*lignes):
    return droite('{{k}}', '{{eval:k+1}}', '1/{{d}}', '{{d}}', *lignes)


def droite_mixte(*lignes):
    return droite('{{m}}', '{{eval:m+w}}', '1/{{d}}', '{{d}}', *lignes)


FRAC = frac('{{n}}', '{{d}}')

LIRE_FRACTION_ZERO = variation(
    'Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction.'
    + droite_zero('points: A={{n}}/{{d}}') + '\n\n$$A : ?$$',
    DEPUIS_ZERO + [var('n', '{{n0}}..{{nm}}')],
    ['\\frac{{{n}}}{{{d}}}'],
    [UNITE_PARTAGEE,
     'Le point $A$ est à ${{n}}$ petits intervalles de $0$ : il repère $' + col(FRAC) + '$.'],
    ['mod(n,d)!=0', 'n>d'])

LIRE_FRACTION_MORCEAU = variation(
    'Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction.'
    + droite_morceau('points: A={{n}}/{{d}}') + '\n\n$$A : ?$$',
    MORCEAU, ['\\frac{{{n}}}{{{d}}}'],
    [UNITE_PARTAGEE,
     '${{k}} = ' + frac('{{eval:k*d}}', '{{d}}') + '$, et le point $A$ est ${{r}}$ petit'
     '{{if:r>1|s|}} intervalle{{if:r>1|s|}} plus loin : il repère $' + frac('{{eval:k*d}} + {{r}}',
                                                                      '{{d}}')
     + ' = ' + col(FRAC) + '$.'])

EX_ZERO = {'d': 3, 'u': 4, 'nm': 11, 'n0': 4, 'n': 7}
EX_MORCEAU = {'d': 7, 'k': 2, 'dm': 6, 'r': 3, 'n': 17}
MODELES.append(modele(
    '03-reperer-par-une-fraction', 'Repérer un point par une fraction',
    'Lire la fraction qui repère un point d\'une demi-droite graduée, au-delà de 1 (A repère 7/3) ;'
    ' ou sur un morceau de droite qui commence à un entier, unité partagée jusqu\'à 12 parts'
    ' (A repère 17/7)',
    'Fractions', 8, [LIRE_FRACTION_ZERO, LIRE_FRACTION_MORCEAU],
    [spec('A repère 7/3', 0, EX_ZERO, '\\frac{7}{3}', 'correct'),
     spec('14/6 (fraction égale)', 0, EX_ZERO, '\\frac{14}{6}', 'correct'),
     spec('Erreur : 7/12 (toute la droite comptée)', 0, EX_ZERO, '\\frac{7}{12}', 'incorrect'),
     spec('Erreur : 1/3 (compté depuis la graduation 2)', 0, EX_ZERO, '\\frac{1}{3}',
          'incorrect'),
     spec('A repère 17/7', 1, EX_MORCEAU, '\\frac{17}{7}', 'correct'),
     spec('Erreur : 3/7 (le début du morceau pris pour 0)', 1, EX_MORCEAU, '\\frac{3}{7}',
          'incorrect'),
     spec('Erreur : 23/7 (compté depuis 3)', 1, EX_MORCEAU, '\\frac{23}{7}', 'incorrect')],
    SANS_SIMPLIFIER))

REPERER_PLUS = variation(
    'Le point $A$ repère la somme d\'un nombre entier et d\'une fraction inférieure à $1$.'
    ' Complète.' + droite_mixte('points: A={{n}}/{{d}}')
    + '\n\n$$A : ? + \\frac{?}{{{d}}}$$',
    MIXTE + [var('qm', 'eval:m+w-1'), var('q', '{{m}}..{{qm}}'), var('n', 'eval:q*d+r')],
    ['{{q}}', '{{r}}'],
    [UNITE_PARTAGEE,
     'Le point $A$ est après la graduation ${{q}}$, à ${{r}}$ petit{{if:r>1|s|}} intervalle'
     '{{if:r>1|s|}} plus loin : il repère $' + col('{{q}}') + ' + ' + frac(col('{{r}}'), '{{d}}')
     + '$.'])

REPERER_MOINS = variation(
    'Le point $A$ repère un nombre entier moins une fraction inférieure à $1$. Complète.'
    + droite_mixte('points: A={{n}}/{{d}}') + '\n\n$$A : ? - \\frac{?}{{{d}}}$$',
    MIXTE + [var('qa', 'eval:m+1'), var('qb', 'eval:m+w'), var('q', '{{qa}}..{{qb}}'),
             var('n', 'eval:q*d-r')],
    ['{{q}}', '{{r}}'],
    [UNITE_PARTAGEE,
     'Le point $A$ est avant la graduation ${{q}}$, à ${{r}}$ petit{{if:r>1|s|}} intervalle'
     '{{if:r>1|s|}} en arrière : il repère $' + col('{{q}}') + ' - ' + frac(col('{{r}}'), '{{d}}')
     + '$.'])

EX_PLUS = {'d': 4, 'w': 2, 'm': 2, 'dm': 3, 'r': 1, 'qm': 3, 'q': 3, 'n': 13}
EX_MOINS = {'d': 3, 'w': 2, 'm': 2, 'dm': 2, 'r': 1, 'qa': 3, 'qb': 4, 'q': 4, 'n': 11}
MODELES.append(modele(
    '04-reperer-par-entier-et-fraction', 'Repérer un point par un entier et une fraction',
    'Lire le nombre qui repère un point d\'un morceau de demi-droite graduée, sous la forme d\'un'
    ' entier plus une fraction inférieure à 1 (3 + 1/4), ou d\'un entier moins une fraction'
    ' inférieure à 1 (4 − 1/3) ; unité partagée jusqu\'à 12 parts',
    'Fractions', 9, [REPERER_PLUS, REPERER_MOINS],
    [spec('A repère 3 + 1/4', 0, EX_PLUS, ['3', '1'], 'correct'),
     spec('Erreur : 4 + 1/4 (graduation suivante)', 0, EX_PLUS, ['4', '1'], 'incorrect'),
     spec('Erreur : 2 + 5/4 (fraction pas inférieure à 1)', 0, EX_PLUS, ['2', '5'], 'incorrect'),
     spec('Erreur : 3 + 3/4 (compté depuis 4)', 0, EX_PLUS, ['3', '3'], 'incorrect'),
     spec('A repère 4 − 1/3', 1, EX_MOINS, ['4', '1'], 'correct'),
     spec('Erreur : 3 − 1/3 (entier d\'avant)', 1, EX_MOINS, ['3', '1'], 'incorrect'),
     spec('Erreur : 4 − 2/3 (compté depuis 3)', 1, EX_MOINS, ['4', '2'], 'incorrect')],
    SANS_SIMPLIFIER))

PLACER_FRACTION = variation(
    'Place le nombre $' + FRAC + '$ sur la demi-droite graduée.'
    + droite_zero('placer: {{n}}/{{d}}'),
    DEPUIS_ZERO + [var('n', '{{n0}}..{{nm}}')], None,
    [UNITE_PARTAGEE, '$' + FRAC + '$, c\'est ${{n}}$ petits intervalles à partir de $0$.'],
    ['mod(n,d)!=0', 'n>d'])

PLACER_DEUX_FRACTIONS = variation(
    'Place les points $A\\left(' + FRAC + '\\right)$ et $B\\left(' + frac('{{p}}', '{{d}}')
    + '\\right)$ sur la demi-droite graduée.'
    + droite_zero('placer: A={{n}}/{{d}} ; B={{p}}/{{d}}'),
    DEPUIS_ZERO + [var('n', '{{n0}}..{{nm}}'), var('p', '{{n0}}..{{nm}}')], None,
    [UNITE_PARTAGEE,
     '$A$ : ${{n}}$ petits intervalles à partir de $0$ ; $B$ : ${{p}}$ petits intervalles.'],
    ['mod(n,d)!=0', 'mod(p,d)!=0', 'n>d', 'p>d', 'n!=p'])

MODELES.append(modele(
    '05-placer-une-fraction', 'Placer une fraction sur une demi-droite graduée',
    'Placer une fraction supérieure à 1 sur une demi-droite graduée (place 7/3), unité partagée'
    ' en 2 à 6 parts ; puis deux points sur la même droite (5/3 et 7/3)',
    'Fractions', 10, [PLACER_FRACTION, PLACER_DEUX_FRACTIONS],
    # La réponse de la droite est écrite par `placerAnswer` : décimal à point quand le
    # dénominateur le permet (5/4 → 1.25), sinon fraction LaTeX
    [spec('7/3 placé', 0, EX_ZERO, '\\frac{7}{3}', 'correct'),
     spec('Erreur : 7/3 compté depuis 1 (10/3)', 0, EX_ZERO, '\\frac{10}{3}', 'incorrect'),
     spec('Erreur : 7 sur la graduation 3 (3)', 0, EX_ZERO, '3', 'incorrect'),
     spec('5/4 placé', 0, {'d': 4, 'u': 3, 'nm': 11, 'n0': 5, 'n': 5}, '1.25', 'correct'),
     spec('A 5/3, B 7/3 placés', 1, {'d': 3, 'u': 4, 'nm': 11, 'n0': 4, 'n': 5, 'p': 7},
          ['\\frac{5}{3}', '\\frac{7}{3}'], 'correct'),
     spec('Erreur : A et B échangés', 1, {'d': 3, 'u': 4, 'nm': 11, 'n0': 4, 'n': 5, 'p': 7},
          ['\\frac{7}{3}', '\\frac{5}{3}'], 'incorrect')],
    SANS_SIMPLIFIER))

PLACER_MIXTE = variation(
    'Place le nombre ${{q}} + ' + frac('{{r}}', '{{d}}') + '$ sur la demi-droite graduée.'
    + droite_mixte('placer: {{n}}/{{d}}'),
    MIXTE + [var('qm', 'eval:m+w-1'), var('q', '{{m}}..{{qm}}'), var('n', 'eval:q*d+r')], None,
    [UNITE_PARTAGEE,
     '${{q}} + ' + frac('{{r}}', '{{d}}') + '$ : on va jusqu\'à la graduation ${{q}}$, puis'
     ' ${{r}}$ petit{{if:r>1|s|}} intervalle{{if:r>1|s|}} plus loin.'])

PLACER_DEUX_MIXTES = variation(
    'Place les points $A\\left({{q}} + ' + frac('{{r}}', '{{d}}') + '\\right)$ et $B\\left({{t}} + '
    + frac('{{v}}', '{{d}}') + '\\right)$ sur la demi-droite graduée.'
    + droite_mixte('placer: A={{n}}/{{d}} ; B={{p}}/{{d}}'),
    [var('d', '2|3|4|5|6'), var('w', '2'), var('m', '1..5'), var('dm', 'eval:d-1'),
     var('r', '1..{{dm}}'), var('v', '1..{{dm}}'), var('q', '{{m}}'), var('t', 'eval:m+1'),
     var('n', 'eval:q*d+r'), var('p', 'eval:t*d+v')],
    None,
    [UNITE_PARTAGEE,
     '$A$ : graduation ${{q}}$, puis ${{r}}$ petit{{if:r>1|s|}} intervalle{{if:r>1|s|}} ; $B$ :'
     ' graduation ${{t}}$, puis ${{v}}$ petit{{if:v>1|s|}} intervalle{{if:v>1|s|}}.'])

EX_PM = {'d': 4, 'w': 2, 'm': 2, 'dm': 3, 'r': 1, 'qm': 3, 'q': 2, 'n': 9}
EX_PM7 = {'d': 7, 'w': 1, 'm': 3, 'dm': 6, 'r': 5, 'qm': 3, 'q': 3, 'n': 26}
EX_DEUX_PM = {'d': 3, 'w': 2, 'm': 2, 'dm': 2, 'r': 2, 'v': 1, 'q': 2, 't': 3, 'n': 8, 'p': 10}
MODELES.append(modele(
    '06-placer-entier-plus-fraction', 'Placer un entier plus une fraction sur une demi-droite',
    'Placer la somme d\'un entier et d\'une fraction inférieure à 1 sur un morceau de demi-droite'
    ' graduée (place 2 + 1/4 ; 3 + 5/7), unité partagée jusqu\'à 12 parts ; puis deux points sur'
    ' la même droite',
    'Fractions', 11, [PLACER_MIXTE, PLACER_DEUX_MIXTES],
    [spec('2 + 1/4 placé', 0, EX_PM, '2.25', 'correct'),
     spec('Erreur : 1/4 de trop (2,5)', 0, EX_PM, '2.5', 'incorrect'),
     spec('Erreur : 3 + 1/4 (graduation suivante)', 0, EX_PM, '3.25', 'incorrect'),
     spec('3 + 5/7 placé', 0, EX_PM7, '\\frac{26}{7}', 'correct'),
     spec('Erreur : 3 + 4/7', 0, EX_PM7, '\\frac{25}{7}', 'incorrect'),
     spec('A 2 + 2/3, B 3 + 1/3 placés', 1, EX_DEUX_PM, ['\\frac{8}{3}', '\\frac{10}{3}'],
          'correct'),
     spec('Erreur : A et B échangés', 1, EX_DEUX_PM, ['\\frac{10}{3}', '\\frac{8}{3}'],
          'incorrect')],
    SANS_SIMPLIFIER))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

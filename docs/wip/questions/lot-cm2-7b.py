"""Écrit les 4 modèles du lot 7b du CM2 (droites graduées : fractions décimales et décimaux) dans
scripts/questions/cm2-7b/.

Phase 0 du 2026-11-02 (§ 12 du journal `docs/wip/questions-cm2-progress.md`), recommandations
suivies par David (§ 12.1) : 7b = 138, 025 (fractions décimales), 144, 032 (décimaux).
Bornes : `cycle3.json`, CM2 (dénominateurs 10, 100, 1 000 ; décimaux en millièmes ou par
agrandissement, 2,812 ; 33,916). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier`.

Jumeaux du CM1 (`lot-cm1-3b.py` #7-8, `lot-cm1-4.py` #3-4 : dixièmes, morceau agrandi en
centièmes) : au CM2, une troisième droite, un morceau agrandi en **millièmes** (de 2,81 à 2,82).

Décisions et pièges :
- 10 intervalles par droite, jamais plus (vise au doigt sur un téléphone) ;
- fractions : écriture à virgule refusée (`requiredForm: 'fraction'`), toute fraction égale juste
  (`reducedFractions: off`), espaces de l'école dès 4 chiffres (`\\frac{2\\,812}{1\\,000}`,
  comme le lot 6a) ;
- morceaux agrandis : les deux bouts étiquetés par `labels:` (en fractions pour les fractions
  décimales, jamais 2,81 ; en décimaux pour les décimaux) ;
- la réponse d'une droite à placer est écrite par `placerAnswer` : décimal à point (2.812) ;
  partie entière au plus 99, donc jamais d'espaces à exiger ;
- niveaux : suite des niveaux de chaque catégorie (Apprivoiser / Repérage), revérifiés en prod
  le 2026-11-02 : Fractions 1 à 11, Décimaux 1 à 4.

    python3 docs/wip/questions/lot-cm2-7b.py scripts/questions/cm2-7b
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
FRACTIONS = {'constraints': {'reducedFractions': 'off', 'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True}}


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


def fraction_exigee(attendue):
    # L'écriture à virgule est refusée : le point travaillé est l'écriture en fraction
    return {'expectedAnswer': attendue, 'requiredForm': 'fraction'}


def droite(start, end, step, *lignes):
    return ('\n\n```line\nstart: ' + start + '\nend: ' + end + '\nstep: ' + step + '\nmajor: 10\n'
            + ''.join(l + '\n' for l in lignes) + '```')


def intervalles(nom):
    return ' petit{{if:' + nom + '>1|s|}} intervalle{{if:' + nom + '>1|s|}}'


MODELES = []


# --- 7-8. Fractions décimales : CM2-138 (lire), CM2-025 (placer) ----------------------------
# V1 dixièmes : de q à q + 1. V2 centièmes : morceau de t/10 à (t + 1)/10. V3 millièmes :
# morceau de c/100 à (c + 1)/100. Dix intervalles ; le point est à r intervalles du début.

FD_DIXIEMES = [var('q', '0..9'), var('r', '1..9'), var('n', 'eval:10*q+r')]
FD_CENTIEMES = [var('t', '1..99'), var('r', '1..9'), var('n', 'eval:10*t+r')]
FD_MILLIEMES = [var('c', '100..999'), var('r', '1..9'), var('n', 'eval:10*c+r')]


def fd_dixiemes(ligne):
    return droite('{{q}}', '{{eval:q+1}}', '1/10', ligne)


def fd_centiemes(ligne):
    return droite('{{t}}/10', '{{eval:t+1}}/10', '1/100', 'labels: {{t}}/10, {{eval:t+1}}/10',
                  ligne)


def fd_milliemes(ligne):
    return droite('{{c}}/100', '{{eval:c+1}}/100', '1/1000',
                  'labels: {{c}}/100, {{eval:c+1}}/100', ligne)


FD_UNITE_10 = ('**Ce que vaut un petit intervalle.** De ${{q}}$ à ${{eval:q+1}}$, l\'unité est'
               ' partagée en $10$ parts égales : chaque petit intervalle vaut $' + frac('1', '10')
               + '$.')
FD_UNITE_100 = ('**Ce que vaut un petit intervalle.** De $' + frac('{{t}}', '10') + '$ à $'
                + frac('{{eval:t+1}}', '10') + '$, il y a un dixième, partagé en $10$ parts'
                ' égales : chaque petit intervalle vaut $' + frac('1', '100') + '$.')
FD_UNITE_1000 = ('**Ce que vaut un petit intervalle.** De $' + frac('{{c}}', '100') + '$ à $'
                 + frac('{{eval:c+1}}', '100') + '$, il y a un centième, partagé en $10$ parts'
                 ' égales : chaque petit intervalle vaut $' + frac('1', '1000') + '$.')
FD_CONDITIONS = {1: ['mod(t,10)!=0'], 2: ['mod(c,10)!=0']}

LIRE_FD = 'Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction décimale.'
REPERER_FD = [
    variation(
        LIRE_FD + fd_dixiemes('points: A={{n}}/10') + '\n\n$$A : ?$$',
        FD_DIXIEMES, [fraction_exigee('\\frac{{{n}}}{10}')],
        [FD_UNITE_10,
         '${{q}} = ' + frac('{{eval:10*q}}', '10') + '$ ; le point $A$ est ${{r}}$'
         + intervalles('r') + ' plus loin : il repère $' + col(frac('{{n}}', '10')) + '$.']),
    variation(
        LIRE_FD + fd_centiemes('points: A={{n}}/100') + '\n\n$$A : ?$$',
        FD_CENTIEMES, [fraction_exigee('\\frac{{{n}}}{100}')],
        [FD_UNITE_100,
         '$' + frac('{{t}}', '10') + ' = ' + frac('{{eval:10*t}}', '100') + '$ ; le point $A$'
         ' est ${{r}}$' + intervalles('r') + ' plus loin : il repère $'
         + col(frac('{{n}}', '100')) + '$.'],
        FD_CONDITIONS[1]),
    variation(
        LIRE_FD + fd_milliemes('points: A={{n}}/1000') + '\n\n$$A : ?$$',
        FD_MILLIEMES, [fraction_exigee('\\frac{{{n}}}{1000}')],
        [FD_UNITE_1000,
         '$' + frac('{{c}}', '100') + ' = ' + frac('{{eval:10*c}}', '1000') + '$ ; le point $A$'
         ' est ${{r}}$' + intervalles('r') + ' plus loin : il repère $'
         + col(frac('{{n}}', '1000')) + '$.'],
        FD_CONDITIONS[2]),
]

EX_FD10 = {'q': 2, 'r': 3, 'n': 23}
EX_FD100 = {'t': 23, 'r': 7, 'n': 237}
EX_FD1000 = {'c': 281, 'r': 2, 'n': 2812}
MODELES.append(modele(
    '01-reperer-par-une-fraction-decimale', 'Repérer un point par une fraction décimale',
    'Lire la fraction décimale qui repère un point d\'une demi-droite graduée en dixièmes'
    ' (23/10), d\'un morceau gradué en centièmes (237/100) ou d\'un morceau agrandi gradué en'
    ' millièmes (2 812/1 000)',
    'Fractions', 12, REPERER_FD,
    [spec('A repère 23/10', 0, EX_FD10, '\\frac{23}{10}', 'correct'),
     spec('230/100, même valeur', 0, EX_FD10, '\\frac{230}{100}', 'correct'),
     spec('Erreur : 3/10 (unités oubliées)', 0, EX_FD10, '\\frac{3}{10}', 'incorrect'),
     spec('Forme : 2,3 (écriture à virgule)', 0, EX_FD10, '2.3', 'bad_form', ['form']),
     spec('A repère 237/100', 1, EX_FD100, '\\frac{237}{100}', 'correct'),
     spec('Erreur : 27/10 (centièmes lus comme des dixièmes)', 1, EX_FD100, '\\frac{27}{10}',
          'incorrect'),
     spec('Erreur : 30/10 (dixième suivant)', 1, EX_FD100, '\\frac{30}{10}', 'incorrect'),
     spec('A repère 2 812/1 000', 2, EX_FD1000, '\\frac{2\\,812}{1\\,000}', 'correct'),
     spec('Erreur : 283/100 (millièmes comptés comme des centièmes)', 2, EX_FD1000,
          '\\frac{283}{100}', 'incorrect'),
     spec('Erreur : 282/100 (graduation étiquetée suivante)', 2, EX_FD1000, '\\frac{282}{100}',
          'incorrect'),
     spec('Erreur : 2 818/1 000 (compté depuis la fin)', 2, EX_FD1000,
          '\\frac{2\\,818}{1\\,000}', 'incorrect'),
     spec('Forme : 2,812 (écriture à virgule)', 2, EX_FD1000, '2.812', 'bad_form', ['form'])],
    FRACTIONS))

PLACER_FD = [
    variation(
        'Place le nombre $' + frac('{{n}}', '10') + '$ sur la demi-droite graduée.'
        + fd_dixiemes('placer: {{n}}/10'),
        FD_DIXIEMES, None,
        [FD_UNITE_10,
         '$' + frac('{{n}}', '10') + ' = {{q}} + ' + frac('{{r}}', '10') + '$ : on part de la'
         ' graduation ${{q}}$ et on avance de ${{r}}$' + intervalles('r') + '.']),
    variation(
        'Place le nombre $' + frac('{{n}}', '100') + '$ sur la demi-droite graduée.'
        + fd_centiemes('placer: {{n}}/100'),
        FD_CENTIEMES, None,
        [FD_UNITE_100,
         '$' + frac('{{n}}', '100') + ' = ' + frac('{{eval:10*t}}', '100') + ' + '
         + frac('{{r}}', '100') + '$ : on part de $' + frac('{{t}}', '10') + '$ et on avance de'
         ' ${{r}}$' + intervalles('r') + '.'],
        FD_CONDITIONS[1]),
    variation(
        'Place le nombre $' + frac('{{n}}', '1000') + '$ sur la demi-droite graduée.'
        + fd_milliemes('placer: {{n}}/1000'),
        FD_MILLIEMES, None,
        [FD_UNITE_1000,
         '$' + frac('{{n}}', '1000') + ' = ' + frac('{{eval:10*c}}', '1000') + ' + '
         + frac('{{r}}', '1000') + '$ : on part de $' + frac('{{c}}', '100') + '$ et on avance'
         ' de ${{r}}$' + intervalles('r') + '.'],
        FD_CONDITIONS[2]),
]

MODELES.append(modele(
    '02-placer-une-fraction-decimale', 'Placer une fraction décimale sur une demi-droite graduée',
    'Placer une fraction décimale sur une demi-droite graduée en dixièmes (23/10), sur un morceau'
    ' gradué en centièmes (237/100) ou sur un morceau agrandi gradué en millièmes'
    ' (2 812/1 000)',
    'Fractions', 13, PLACER_FD,
    # La réponse de la droite est écrite par `placerAnswer` : décimal à point (23/10 → 2.3)
    [spec('23/10 placé', 0, EX_FD10, '2.3', 'correct'),
     spec('Erreur : 3/10 (unités oubliées)', 0, EX_FD10, '0.3', 'incorrect'),
     spec('Erreur : 2,4', 0, EX_FD10, '2.4', 'incorrect'),
     spec('237/100 placé', 1, EX_FD100, '2.37', 'correct'),
     spec('Erreur : 2,33 (compté depuis la fin)', 1, EX_FD100, '2.33', 'incorrect'),
     spec('2 812/1 000 placé', 2, EX_FD1000, '2.812', 'correct'),
     spec('Erreur : 2,818 (compté depuis la fin)', 2, EX_FD1000, '2.818', 'incorrect'),
     spec('Erreur : 2,82 (graduation étiquetée suivante)', 2, EX_FD1000, '2.82', 'incorrect')],
    FRACTIONS))


# --- 9-10. Décimaux : CM2-144 (lire), CM2-032 (placer) --------------------------------------
# V1 dixièmes : de q à q + 1. V2 centièmes : morceau agrandi de a,b à a,(b + 1). V3 millièmes :
# morceau agrandi de lo = a + c/100 à hi = lo + 0,01 (2,81 à 2,82 ; 33,91 à 33,92).

DEC_DIXIEMES = [var('q', '0..30'), var('k', '1..9'), var('x', 'eval:q+k/10;d')]
DEC_CENTIEMES = [var('a', '1..99'), var('b', '0..9'), var('k', '1..9'),
                 var('lo', 'eval:a+b/10;d'), var('hi', 'eval:a+(b+1)/10;d'),
                 var('x', 'eval:a+b/10+k/100;d')]
DEC_MILLIEMES_BASE = [var('a', '1..99'), var('c', '0..99'), var('lo', 'eval:a+c/100;d'),
                      var('hi', 'eval:a+(c+1)/100;d')]
DEC_MILLIEMES = DEC_MILLIEMES_BASE + [var('k', '1..9'), var('x', 'eval:a+c/100+k/1000;d')]


def dec_dixiemes(ligne):
    return droite('{{q}}', '{{eval:q+1}}', '0.1', ligne)


def dec_centiemes(ligne):
    return droite('{{lo}}', '{{hi}}', '0.01', 'labels: {{lo}}, {{hi}}', ligne)


def dec_milliemes(ligne):
    return droite('{{lo}}', '{{hi}}', '0.001', 'labels: {{lo}}, {{hi}}', ligne)


DEC_UNITE_10 = ('**Ce que vaut un petit intervalle.** De ${{q}}$ à ${{eval:q+1}}$, l\'unité'
                ' est partagée en $10$ : chaque petit intervalle vaut $0.1$.')
DEC_UNITE_100 = ('**Ce que vaut un petit intervalle.** De ${{lo}}$ à ${{hi}}$, il y a un'
                 ' dixième, partagé en $10$ : chaque petit intervalle vaut $0.01$.')
DEC_UNITE_1000 = ('**Ce que vaut un petit intervalle.** De ${{lo}}$ à ${{hi}}$, il y a un'
                  ' centième, partagé en $10$ : chaque petit intervalle vaut $0.001$.')

REPERER_DEC = [
    variation(
        'Quel nombre repère le point $A$ ?' + dec_dixiemes('points: A={{x}}') + '\n\n$$A : ?$$',
        DEC_DIXIEMES, ['{{x}}'],
        [DEC_UNITE_10,
         '$A$ est ${{k}}$' + intervalles('k') + ' après ${{q}}$ : ${{q}} + {{k}} \\times 0.1 = '
         + col('{{x}}') + '$.']),
    variation(
        'Quel nombre repère le point $A$ ?' + dec_centiemes('points: A={{x}}') + '\n\n$$A : ?$$',
        DEC_CENTIEMES, ['{{x}}'],
        [DEC_UNITE_100,
         '$A$ est ${{k}}$' + intervalles('k') + ' après ${{lo}}$ : ${{lo}} + {{k}} \\times 0.01 = '
         + col('{{x}}') + '$.']),
    variation(
        'Quel nombre repère le point $A$ ?' + dec_milliemes('points: A={{x}}') + '\n\n$$A : ?$$',
        DEC_MILLIEMES, ['{{x}}'],
        [DEC_UNITE_1000,
         '$A$ est ${{k}}$' + intervalles('k') + ' après ${{lo}}$ : ${{lo}} + {{k}} \\times 0.001'
         ' = ' + col('{{x}}') + '$.']),
]

EX_D10 = {'q': 2, 'k': 8, 'x': '2.8'}
EX_D100 = {'a': 2, 'b': 3, 'k': 7, 'lo': '2.3', 'hi': '2.4', 'x': '2.37'}
EX_D1000 = {'a': 2, 'c': 81, 'lo': '2.81', 'hi': '2.82', 'k': 2, 'x': '2.812'}
EX_D1000_B = {'a': 33, 'c': 91, 'lo': '33.91', 'hi': '33.92', 'k': 6, 'x': '33.916'}
MODELES.append(modele(
    '03-reperer-un-nombre-decimal', 'Repérer un point par un nombre décimal',
    'Lire le nombre décimal qui repère un point d\'une demi-droite graduée en dixièmes (2,8),'
    ' d\'un morceau agrandi gradué en centièmes (2,37) ou en millièmes (2,812 ; 33,916)',
    'Décimaux', 5, REPERER_DEC,
    [spec('A repère 2,8', 0, EX_D10, '2,8', 'correct'),
     spec('Erreur : 0,8 (unités oubliées)', 0, EX_D10, '0,8', 'incorrect'),
     spec('Erreur : 2,08', 0, EX_D10, '2,08', 'incorrect'),
     spec('A repère 2,37', 1, EX_D100, '2,37', 'correct'),
     spec('Erreur : 2,7 (départ oublié)', 1, EX_D100, '2,7', 'incorrect'),
     spec('Erreur : 2,4 (dixième suivant)', 1, EX_D100, '2,4', 'incorrect'),
     spec('A repère 2,812', 2, EX_D1000, '2,812', 'correct'),
     spec('Erreur : 2,83 (millièmes comptés comme des centièmes)', 2, EX_D1000, '2,83',
          'incorrect'),
     spec('Erreur : 2,82 (graduation étiquetée suivante)', 2, EX_D1000, '2,82', 'incorrect'),
     spec('Erreur : 2,818 (compté depuis la fin)', 2, EX_D1000, '2,818', 'incorrect'),
     spec('A repère 33,916', 2, EX_D1000_B, '33,916', 'correct'),
     spec('Erreur : 33,96 (millièmes comptés comme des centièmes)', 2, EX_D1000_B, '33,96',
          'incorrect')],
    DECIMAUX))

PLACER_DEUX_DEC = variation(
    'Place les points $A({{x}})$ et $B({{y}})$ sur la demi-droite graduée.'
    + dec_milliemes('placer: A={{x}} ; B={{y}}'),
    DEC_MILLIEMES_BASE + [var('k', '1..9'), var('m', '1..9'),
                          var('x', 'eval:a+c/100+k/1000;d'), var('y', 'eval:a+c/100+m/1000;d')],
    None,
    [DEC_UNITE_1000,
     '$A$ : ${{x}} = {{lo}} + {{k}} \\times 0.001$ ; $B$ : ${{y}} = {{lo}} + {{m}} \\times'
     ' 0.001$.'],
    ['k!=m'])

PLACER_DEC = [
    variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.' + dec_dixiemes('placer: {{x}}'),
        DEC_DIXIEMES, None,
        [DEC_UNITE_10,
         '${{x}} = {{q}} + {{k}} \\times 0.1$ : on part de ${{q}}$ et on avance de ${{k}}$'
         + intervalles('k') + '.']),
    variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.' + dec_centiemes('placer: {{x}}'),
        DEC_CENTIEMES, None,
        [DEC_UNITE_100,
         '${{x}} = {{lo}} + {{k}} \\times 0.01$ : on part de ${{lo}}$ et on avance de ${{k}}$'
         + intervalles('k') + '.']),
    variation(
        'Place le nombre ${{x}}$ sur la demi-droite graduée.' + dec_milliemes('placer: {{x}}'),
        DEC_MILLIEMES, None,
        [DEC_UNITE_1000,
         '${{x}} = {{lo}} + {{k}} \\times 0.001$ : on part de ${{lo}}$ et on avance de ${{k}}$'
         + intervalles('k') + '.']),
    PLACER_DEUX_DEC,
]

EX_DEUX = {'a': 33, 'c': 91, 'lo': '33.91', 'hi': '33.92', 'k': 6, 'm': 3, 'x': '33.916',
           'y': '33.913'}
MODELES.append(modele(
    '04-placer-un-nombre-decimal', 'Placer un nombre décimal sur une demi-droite graduée',
    'Placer un nombre décimal sur une demi-droite graduée en dixièmes (2,8), sur un morceau'
    ' agrandi gradué en centièmes (2,37) ou en millièmes (33,916) ; puis deux points sur un'
    ' morceau gradué en millièmes',
    'Décimaux', 6, PLACER_DEC,
    # La réponse de la droite est écrite par `placerAnswer` : décimal à point
    [spec('2,8 placé', 0, EX_D10, '2.8', 'correct'),
     spec('Erreur : 2,2 (compté depuis la fin)', 0, EX_D10, '2.2', 'incorrect'),
     spec('2,37 placé', 1, EX_D100, '2.37', 'correct'),
     spec('Erreur : 2,4 (dixième suivant)', 1, EX_D100, '2.4', 'incorrect'),
     spec('2,812 placé', 2, EX_D1000, '2.812', 'correct'),
     spec('Erreur : 2,818 (compté depuis la fin)', 2, EX_D1000, '2.818', 'incorrect'),
     spec('33,916 placé', 2, EX_D1000_B, '33.916', 'correct'),
     spec('A 33,916, B 33,913 placés', 3, EX_DEUX, ['33.916', '33.913'], 'correct'),
     spec('Erreur : A et B échangés', 3, EX_DEUX, ['33.913', '33.916'], 'incorrect')],
    DECIMAUX))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

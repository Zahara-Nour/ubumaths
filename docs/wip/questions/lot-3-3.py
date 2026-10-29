"""Écrit les 6 modèles du lot 3 « Thalès et trigonométrie » de la 3e dans scripts/questions/3-lot-3/.

Phase 0 validée par David le 2026-10-29 (journal `questions-3-progress.md` § 10, un point par modèle) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-022 | Reconnaître une configuration de Thalès | Géométrie › Théorème de Thalès › Configurations, 1 |
| 2 | 3-059 | Écrire l'égalité de Thalès | Géométrie › Théorème de Thalès › Égalité des rapports, 1 |
| 3 | 3-060 | Calculer une longueur avec Thalès | Géométrie › Théorème de Thalès › Calculer une longueur, 1 |
| 4 | 3-055 | Réciproque et contraposée de Thalès | Géométrie › Théorème de Thalès › Réciproque, 1 |
| 5 | 3-023 | Écrire cos, sin ou tan d'un angle | Géométrie › Trigonométrie › Lignes trigonométriques, 1 |
| 6 | 3-061 | Calculer une longueur ou un angle | Géométrie › Trigonométrie › Calculer, 1 |

Bornes : `cycle4.json`, 3e (Thalès : triangles emboîtés et papillon seulement ; trigonométrie :
angle aigu d'un triangle rectangle, cos, sin, tan, angles en degrés, calculatrice). Catégories
neuves : niveau 1 partout. Le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David.

Décisions (David, 2026-10-29, « je te suis ») :
- figures à l'échelle : forme de base fixe, M et N placés au rapport tiré ; les longueurs sont
  dans l'énoncé (en formule, virgule décimale), pas sur la figure ;
- lettres tirées parmi trois jeux (s), deux orientations par figure (o, symétrie) ;
- 3-055 : choix « Oui » / « Non » non mélangé, la raison dans le corrigé (produits en croix,
  toujours exacts).

Pièges (sonde du 2026-10-29) :
- `eval:` : `\\pi` avec antislash (`pi` se lit p × i) ; cos, sin, tan, acos, asin, atan en
  radians ; `round` existe ;
- arrondi attendu : `;d` dans la réponse (sinon 23/5 attendu) ; 4,60 → forme non optimale,
  23/5 → mauvaise forme, 4,5 → faux ; tirages loin d'un demi-dixième (pas d'arrondi ambigu) ;
- case choix : la bonne réponse est écrite en premier (indice d'origine 0), le bloc mélange ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-3.py scripts/questions/3-lot-3
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, variations, specs, delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['3'],
                 'theme': 'Géométrie', 'domain': domain, 'subdomain': subdomain, 'level': 1,
                 'delay': delay, 'status': 'draft', 'variations': variations,
                 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def frac(n, d):
    return '\\dfrac{' + n + '}{' + d + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


X = '\\times'

# --- Lettres : trois jeux, tirés par s -------------------------------------------------------

JEUX = {'A': 'ARE', 'B': 'BSF', 'C': 'CTG', 'M': 'MUK', 'N': 'NVL'}
# Une variable ne peut pas valoir une lettre (relue comme une variable) : la lettre est écrite
# dans le texte, par des {{if}} mis bout à bout (jamais imbriqués).


def lettre(k):
    return ''.join('{{if:s==' + str(j) + '|' + JEUX[k][j] + '|}}' for j in range(3))


LETTRES = [var('s', '0..2')]
LETTRES_TRIANGLE = LETTRES
ORIENTATION = var('o', '0..1')
A, B, C, M, N = (lettre(k) for k in 'ABCMN')
S0 = {'s': 0, 'o': 0}


def seg(p, q):
    return '$' + p + q + '$'


def droite(p, q):
    return '$(' + p + q + ')$'


def rapport(n, d):
    return frac(n, d)


# --- Figures de Thalès ------------------------------------------------------------------------
# Forme de base fixe ; o = 1 : symétrie d'axe horizontal (y → H − y). M sur (AB), N sur (AC),
# au rapport k = AM/AB (et kn = AN/AC, égal à k sauf en 3-055).

H = 6.6


def y(v):
    return '{{if:o==0|' + str(v) + '|' + str(round(H - v, 2)) + '}}'


def place(haut, bas):
    """Étiquette selon l'orientation (la symétrie échange haut et bas)."""
    return '{{if:o==0|' + haut + '|' + bas + '}}'


def point(nom, x, yy, etiquette):
    return nom + ' = point(' + str(x) + ', ' + y(yy) + ', etiquette="' + etiquette + '")\n'


def point_sur(nom, depart, vers, k, etiquette, oppose=False):
    """Point de la droite (depart vers) : depart + k(vers − depart), ou de l'autre côté."""
    signe = '-' if oppose else '+'
    return (nom + ' = point(' + depart + '.x ' + signe + ' (' + k + ')*(' + vers + '.x - '
            + depart + '.x), ' + depart + '.y ' + signe + ' (' + k + ')*(' + vers + '.y - '
            + depart + '.y), etiquette="' + etiquette + '")\n')


def figure(description, corps, fenetre='0 ; 10 ; 0 ; 6.6'):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + corps + '```')


def fig_emboites(k, kn=None):
    kn = kn or k
    return figure(
        'Triangle ' + A + B + C + ', ' + M + ' sur [' + A + B + '], ' + N + ' sur [' + A + C
        + '], segment [' + M + N + '].',
        point(A, 1, 1, 'gauche') + point(B, 9, 1.6, 'droite')
        + point(C, 6.2, 5.6, place('haut', 'bas'))
        + point_sur(M, A, B, k, place('bas', 'haut'))
        + point_sur(N, A, C, kn, place('haut-gauche', 'bas-gauche'))
        + 'segment(' + A + ', ' + B + ')\nsegment(' + A + ', ' + C + ')\nsegment(' + B + ', '
        + C + ')\nsegment(' + M + ', ' + N + ')\n')


def fig_papillon(k, kn=None):
    kn = kn or k
    return figure(
        'Papillon : droites (' + B + M + ') et (' + C + N + ') sécantes en ' + A
        + ', segments [' + B + C + '] et [' + M + N + '].',
        point(A, 5, 3.3, 'haut') + point(B, 9.2, 1.2, place('bas', 'haut'))
        + point(C, 8.4, 5.8, place('haut', 'bas'))
        + point_sur(M, A, B, k, place('haut', 'bas'), oppose=True)
        + point_sur(N, A, C, kn, place('bas', 'haut'), oppose=True)
        + 'segment(' + B + ', ' + M + ')\nsegment(' + C + ', ' + N + ')\nsegment(' + B + ', '
        + C + ')\nsegment(' + M + ', ' + N + ')\n')


K_FIXE = '0.6'  # rapport des figures sans longueurs (3-022, 3-059)
PARALLELES = 'Sur la figure, les droites ' + droite(M, N) + ' et ' + droite(B, C) + ' sont parallèles.'
CONFIG_EMB = ('Les points $' + A + '$, $' + M + '$, $' + B + '$ sont alignés, ainsi que $' + A
              + '$, $' + N + '$, $' + C + '$.')
HYP_EMB = ('Les points $' + A + '$, $' + M + '$, $' + B + '$ sont alignés, ainsi que $' + A
           + '$, $' + N + '$, $' + C + '$, et les droites ' + droite(M, N) + ' et '
           + droite(B, C) + ' sont parallèles.')
HYP_PAP = ('Les droites ' + droite(B, M) + ' et ' + droite(C, N) + ' sont sécantes en $' + A
           + '$, et les droites ' + droite(M, N) + ' et ' + droite(B, C) + ' sont parallèles.')
EGALITE = '$$' + rapport(A + M, A + B) + ' = ' + rapport(A + N, A + C) + ' = ' + rapport(M + N, B + C) + '$$'
MODELES = []

# --- 1. 3-022 : reconnaître une configuration ---------------------------------------------------

CONFIGURATION = (PARALLELES + ' Comment s\'appelle cette configuration de Thalès ?')
OPTIONS_CONFIG = ['Des triangles emboîtés', 'Un papillon',
                  'Le théorème de Thalès ne s\'applique pas']


def quels_triangles(papillon):
    fig = fig_papillon(K_FIXE) if papillon else fig_emboites(K_FIXE)
    distracteurs = ([A + M + B + ' et ' + A + N + C, M + N + B + ' et ' + M + N + C,
                     A + M + C + ' et ' + A + N + B] if papillon else
                    [A + M + N + ' et ' + M + B + C, A + M + B + ' et ' + A + N + C,
                     M + N + B + ' et ' + B + N + C])
    return variation(
        PARALLELES + ' Dans quels triangles peut-on appliquer le théorème de Thalès ?' + fig
        + choix(['$' + A + M + N + '$ et $' + A + B + C + '$'] + ['$' + d.replace(' et ', '$ et $')
                                                                 + '$' for d in distracteurs]),
        LETTRES + [ORIENTATION], ['0'],
        [('Les droites ' + droite(M, N) + ' et ' + droite(B, C) + ' sont parallèles et coupent'
          ' deux droites sécantes en $' + A + '$ : le théorème de Thalès s\'applique dans les'
          ' triangles ' + '$' + col(A + M + N) + '$ et $' + col(A + B + C) + '$' + '.'),
         ('$' + A + M + B + '$ n\'est pas un triangle : ses trois sommets sont alignés.'
          if papillon else
          'Les deux triangles ont le sommet $' + A + '$ en commun, et leurs côtés ' + seg(M, N)
          + ' et ' + seg(B, C) + ' sont parallèles.')])


def quelles_paralleles(papillon):
    fig = fig_papillon(K_FIXE) if papillon else fig_emboites(K_FIXE)
    alignes = (('Les droites ' + droite(B, M) + ' et ' + droite(C, N) + ' sont sécantes en $' + A
                + '$.') if papillon else CONFIG_EMB)
    return variation(
        alignes + ' Pour appliquer le théorème de Thalès dans les triangles $' + A + M + N
        + '$ et $' + A + B + C + '$, quelles droites doivent être parallèles ?' + fig
        + choix([droite(M, N) + ' et ' + droite(B, C), droite(A, B) + ' et ' + droite(A, C),
                 droite(M, B) + ' et ' + droite(N, C), droite(A, M) + ' et ' + droite(A, N)]),
        LETTRES + [ORIENTATION], ['0'],
        ['Le théorème de Thalès demande deux droites **parallèles** qui coupent les deux côtés'
         ' issus de $' + A + '$ : ici $' + col('(' + M + N + ')') + '$ et $' + col('(' + B + C + ')') + '$' + '.',
         'Les droites ' + droite(A, B) + ' et ' + droite(A, C) + ' sont sécantes en $' + A
         + '$ : elles ne peuvent pas être parallèles.'])


MODELES.append(modele(
    '01-reconnaitre-configuration-thales', 'Reconnaître une configuration de Thalès',
    'Reconnaître une configuration de Thalès : triangles emboîtés ou papillon, les deux'
    ' triangles où l\'appliquer, les droites qui doivent être parallèles',
    'Théorème de Thalès', 'Configurations',
    [variation(CONFIGURATION + fig_emboites(K_FIXE) + choix(OPTIONS_CONFIG),
               LETTRES + [ORIENTATION], ['0'],
               ['Les points $' + M + '$ et $' + N + '$ sont **sur les côtés** [' + A + B + '] et ['
                + A + C + '] : le petit triangle $' + A + M + N + '$ est dans le grand triangle $'
                + A + B + C + '$. Ce sont des ' + '**triangles emboîtés**' + '.']),
     variation(CONFIGURATION + fig_papillon(K_FIXE)
               + choix([OPTIONS_CONFIG[1], OPTIONS_CONFIG[0], OPTIONS_CONFIG[2]]),
               LETTRES + [ORIENTATION], ['0'],
               ['Les points $' + M + '$ et $' + N + '$ sont **de l\'autre côté** de $' + A
                + '$ : les triangles $' + A + M + N + '$ et $' + A + B + C + '$ sont opposés par'
                ' le sommet $' + A + '$. C\'est un ' + '**papillon**' + '.']),
     quels_triangles(False), quels_triangles(True), quelles_paralleles(False),
     quelles_paralleles(True)],
    [spec('Emboîtés : bonne réponse', 0, S0, '0', 'correct'),
     spec('Emboîtés : « papillon »', 0, S0, '1', 'incorrect'),
     spec('Papillon : bonne réponse', 1, S0, '0', 'correct'),
     spec('Papillon : « emboîtés »', 1, S0, '1', 'incorrect'),
     spec('Triangles AMN et ABC', 2, S0, '0', 'correct'),
     spec('Erreur : AMB et ANC (points alignés)', 2, S0, '2', 'incorrect'),
     spec('Papillon : AMN et ABC', 3, S0, '0', 'correct'),
     spec('Papillon : AMB et ANC', 3, S0, '1', 'incorrect'),
     spec('Parallèles (MN) et (BC)', 4, S0, '0', 'correct'),
     spec('Erreur : (AB) et (AC)', 4, S0, '1', 'incorrect'),
     spec('Papillon : (MN) et (BC)', 5, S0, '0', 'correct'),
     spec('Papillon : (MB) et (NC)', 5, S0, '2', 'incorrect')],
    delay=45))

# --- 2. 3-059 : écrire l'égalité des rapports --------------------------------------------------

QUELLE_EGALITE = ' Quelle égalité donne le théorème de Thalès ?'


def egalite(papillon, renverse=False):
    fig = fig_papillon(K_FIXE) if papillon else fig_emboites(K_FIXE)
    hyp = HYP_PAP if papillon else HYP_EMB

    def eg(a, b, c):
        return '$' + rapport(*a) + ' = ' + rapport(*b) + ' = ' + rapport(*c) + '$'
    if renverse:
        bonne = eg((A + B, A + M), (A + C, A + N), (B + C, M + N))
        fausses = [eg((A + B, A + M), (A + C, A + N), (M + N, B + C)),
                   eg((A + B, M + B), (A + C, N + C), (B + C, M + N)),
                   eg((A + B, A + N), (A + C, A + M), (B + C, M + N))]
    else:
        bonne = eg((A + M, A + B), (A + N, A + C), (M + N, B + C))
        fausses = [eg((A + M, M + B), (A + N, N + C), (M + N, B + C)),
                   eg((A + M, A + B), (A + N, A + C), (B + C, M + N)),
                   eg((A + M, A + C), (A + N, A + B), (M + N, B + C))]
    etapes = [
        'Les côtés du petit triangle $' + A + M + N + '$ sont **proportionnels** à ceux du grand'
        ' triangle $' + A + B + C + '$ : chaque rapport met un côté de $' + A + M + N
        + '$ et le côté **correspondant** de $' + A + B + C + '$, sur la même droite.',
        '$$' + col(rapport(A + B, A + M) + ' = ' + rapport(A + C, A + N) + ' = '
                   + rapport(B + C, M + N) if renverse else rapport(A + M, A + B) + ' = '
                   + rapport(A + N, A + C) + ' = ' + rapport(M + N, B + C)) + '$$']
    if renverse:
        etapes.append('Ici le grand triangle est **en haut** de chaque fraction : les trois'
                      ' rapports doivent tous être écrits dans le même sens.')
    else:
        etapes.append('$' + M + B + '$ n\'est pas un côté du triangle $' + A + B + C
                      + '$ : on écrit $' + A + M + '$ sur $' + A + B + '$, pas sur $' + M + B
                      + '$.')
    return variation(hyp + QUELLE_EGALITE + fig + choix([bonne] + fausses),
                     LETTRES + [ORIENTATION], ['0'], etapes)


MODELES.append(modele(
    '02-ecrire-egalite-thales', 'Écrire l\'égalité de Thalès',
    'Écrire l\'égalité des rapports de Thalès (AM/AB = AN/AC = MN/BC) : triangles emboîtés,'
    ' papillon, puis le grand triangle en haut de chaque fraction',
    'Théorème de Thalès', 'Égalité des rapports',
    [egalite(False), egalite(True), egalite(False, renverse=True)],
    [spec('Emboîtés : bonne égalité', 0, S0, '0', 'correct'),
     spec('Erreur : AM/MB', 0, S0, '1', 'incorrect'),
     spec('Erreur : un rapport renversé', 0, S0, '2', 'incorrect'),
     spec('Erreur : sommets croisés', 0, S0, '3', 'incorrect'),
     spec('Papillon : bonne égalité', 1, S0, '0', 'correct'),
     spec('Papillon : AM/MB', 1, S0, '1', 'incorrect'),
     spec('Renversée : bonne égalité', 2, S0, '0', 'correct'),
     spec('Renversée : MN/BC à l\'endroit', 2, S0, '1', 'incorrect')],
    delay=60))

# --- 3. 3-060 : calculer une longueur ------------------------------------------------------------
# Longueurs entières en cm ; résultat décimal exact, au plus deux décimales.

CM = '~\\unit{cm}'


def donnees(*paires):
    textes = ['$' + n + ' = ' + v + CM + '$' for n, v in paires]
    return 'On donne ' + ', '.join(textes[:-1]) + ' et ' + textes[-1] + '.'


def calcul(papillon, inconnue, donnes, rapports, resultat, conditions, variables, etapes_avant=None,
           k='{{am}}/{{ab}}'):
    """inconnue : nom du segment cherché ; rapports : (n1, d1, n2, d2) de l'égalité utile."""
    fig = fig_papillon(k) if papillon else fig_emboites(k)
    hyp = HYP_PAP if papillon else HYP_EMB
    n1, d1, n2, d2 = rapports
    etapes = (etapes_avant or []) + [
        hyp + ' D\'après le **théorème de Thalès** :', EGALITE,
        'On garde les deux rapports utiles et on remplace par les longueurs connues :',
        '$$' + frac(n1[0], d1[0]) + ' = ' + frac(n2[0], d2[0]) + ' \\quad\\text{donc}\\quad '
        + frac(n1[1], d1[1]) + ' = ' + frac(n2[1], d2[1]) + '$$',
        '$$' + inconnue + ' = ' + resultat[0] + ' = ' + col(resultat[1] + CM) + '$$']
    return variation(
        hyp + ' ' + donnees(*donnes) + ' Calcule $' + inconnue + '$.' + fig + '\n\n$' + inconnue
        + ' = ?' + CM + '$',
        LETTRES + [ORIENTATION] + variables, [resultat[1]], etapes, conditions)


def exact(x):
    """x a au plus deux décimales (condition de tirage)."""
    return 'round(100*(' + x + ')) == 100*(' + x + ')'


LONGUEURS = [var('ab', '4..12'), var('am', '2..11'), var('bc', '3..15')]
MN = '{{bc}}*{{am}}/{{ab}}'

# v1 : MN = BC × AM / AB (emboîtés)
V_MN = calcul(False, M + N, [(A + M, '{{am}}'), (A + B, '{{ab}}'), (B + C, '{{bc}}')],
              ((A + M, '{{am}}'), (A + B, '{{ab}}'), (M + N, M + N), (B + C, '{{bc}}')),
              (frac('{{bc}} ' + X + ' {{am}}', '{{ab}}'), evd('bc*am/ab')),
              ['am < ab', exact('bc*am/ab')],
              LONGUEURS)
# v2 : AN = AC × AM / AB (emboîtés)
V_AN = calcul(False, A + N, [(A + M, '{{am}}'), (A + B, '{{ab}}'), (A + C, '{{ac}}')],
              ((A + M, '{{am}}'), (A + B, '{{ab}}'), (A + N, A + N), (A + C, '{{ac}}')),
              (frac('{{ac}} ' + X + ' {{am}}', '{{ab}}'), evd('ac*am/ab')),
              ['am < ab', exact('ac*am/ab')],
              [var('ab', '4..12'), var('am', '2..11'), var('ac', '3..15')])
# v3 : papillon, MN = BC × AM / AB
V_PAP = calcul(True, M + N, [(A + M, '{{am}}'), (A + B, '{{ab}}'), (B + C, '{{bc}}')],
               ((A + M, '{{am}}'), (A + B, '{{ab}}'), (M + N, M + N), (B + C, '{{bc}}')),
               (frac('{{bc}} ' + X + ' {{am}}', '{{ab}}'), evd('bc*am/ab')),
               ['am < ab', exact('bc*am/ab')], LONGUEURS)
# v4 : AB = AM × AC / AN (grand triangle inconnu : une division)
V_AB = calcul(False, A + B, [(A + M, '{{am}}'), (A + N, '{{an}}'), (A + C, '{{ac}}')],
              ((A + M, '{{am}}'), (A + B, A + B), (A + N, '{{an}}'), (A + C, '{{ac}}')),
              (frac('{{am}} ' + X + ' {{ac}}', '{{an}}'), evd('am*ac/an')),
              ['an < ac', exact('am*ac/an'), 'am*ac/an > am'],
              [var('am', '2..9'), var('an', '2..9'), var('ac', '4..15')], k='{{an}}/{{ac}}')
# v5 : MB donné, AB = AM + MB d'abord
V_MB = calcul(False, M + N, [(A + M, '{{am}}'), (M + B, '{{mb}}'), (B + C, '{{bc}}')],
              ((A + M, '{{am}}'), (A + B, ev('am+mb')), (M + N, M + N), (B + C, '{{bc}}')),
              (frac('{{bc}} ' + X + ' {{am}}', ev('am+mb')), evd('bc*am/(am+mb)')),
              [exact('bc*am/(am+mb)')],
              [var('am', '2..8'), var('mb', '1..6'), var('bc', '3..15')],
              etapes_avant=['$' + M + '$ est sur le segment [' + A + B + '] : $' + A + B + ' = '
                            + A + M + ' + ' + M + B + ' = {{am}} + {{mb}} = ' + ev('am+mb')
                            + CM + '$.'],
              k='{{am}}/({{am}}+{{mb}})')

MODELES.append(modele(
    '03-calculer-longueur-thales', 'Calculer une longueur avec Thalès',
    'Calculer une longueur avec le théorème de Thalès : côté parallèle MN, longueur sur un côté,'
    ' papillon, longueur du grand triangle, puis MB donné au lieu de AM',
    'Théorème de Thalès', 'Calculer une longueur', [V_MN, V_AN, V_PAP, V_AB, V_MB],
    [spec('AM = 3, AB = 5, BC = 7 : MN = 4,2', 0, {**S0, 'am': 3, 'ab': 5, 'bc': 7}, '4{,}2',
          'correct'),
     spec('Erreur : rapport renversé 11,67', 0, {**S0, 'am': 3, 'ab': 5, 'bc': 7}, '11{,}67',
          'incorrect'),
     spec('Erreur : soustraction BC − (AB − AM) = 5', 0, {**S0, 'am': 3, 'ab': 5, 'bc': 7}, '5',
          'incorrect'),
     spec('AM = 3, AB = 4, AC = 6 : AN = 4,5', 1, {**S0, 'am': 3, 'ab': 4, 'ac': 6}, '4{,}5',
          'correct'),
     spec('Papillon AM = 2, AB = 5, BC = 8 : MN = 3,2', 2, {**S0, 'am': 2, 'ab': 5, 'bc': 8},
          '3{,}2', 'correct'),
     spec('AM = 3, AN = 4, AC = 10 : AB = 7,5', 3, {**S0, 'am': 3, 'an': 4, 'ac': 10}, '7{,}5',
          'correct'),
     spec('Erreur : produit en croix faux 13,33', 3, {**S0, 'am': 3, 'an': 4, 'ac': 10},
          '13{,}33', 'incorrect'),
     spec('AM = 3, MB = 2, BC = 10 : MN = 6', 4, {**S0, 'am': 3, 'mb': 2, 'bc': 10}, '6',
          'correct'),
     spec('Erreur : MB pris pour AB, 15', 4, {**S0, 'am': 3, 'mb': 2, 'bc': 10}, '15',
          'incorrect')],
    delay=120))

# --- 4. 3-055 : réciproque et contraposée ------------------------------------------------------
# w = 0 : rapports égaux (parallèles) ; w = 1 : AN décalé de h dixièmes (pas parallèles).
# On compare les produits en croix AM × AC et AN × AB, toujours exacts.

RECIP_VARS = [var('w', '0..1'), var('ab', '4..12'), var('am', '2..11'), var('ac', '4..15'),
              var('h', '1..3;±'), var('an', 'eval:ac*am/ab+w*h/10;d')]
RECIP_COND = ['am < ab', 'round(10*an) == 10*an', 'an < ac', 'an > 1']


def reciproque(papillon):
    k, kn = '{{am}}/{{ab}}', '{{an}}/{{ac}}'
    fig = fig_papillon(k, kn) if papillon else fig_emboites(k, kn)
    ordre = (('Les points $' + M + '$, $' + A + '$, $' + B + '$ sont alignés dans cet ordre,'
              ' ainsi que $' + N + '$, $' + A + '$, $' + C + '$.') if papillon else
             ('Les points $' + A + '$, $' + M + '$, $' + B + '$ sont alignés dans cet ordre,'
              ' ainsi que $' + A + '$, $' + N + '$, $' + C + '$.'))
    produits = ('$$' + A + M + ' ' + X + ' ' + A + C + ' = {{am}} ' + X + ' {{ac}} = '
                + evd('am*ac') + ' \\qquad ' + A + N + ' ' + X + ' ' + A + B + ' = '
                + evd('an') + ' ' + X + ' {{ab}} = ' + evd('an*ab') + '$$')
    conclusion = ('{{if:w==0|Les produits en croix sont **égaux** : $' + frac(A + M, A + B) + ' = '
                  + frac(A + N, A + C) + '$. Les points sont alignés dans le même ordre : d\'après'
                  ' la **réciproque du théorème de Thalès**, les droites ' + droite(M, N) + ' et '
                  + droite(B, C) + ' sont ' + '**parallèles**' + '.|Les produits en croix sont'
                  ' **différents** : $' + frac(A + M, A + B) + ' \\neq ' + frac(A + N, A + C)
                  + '$. D\'après la **contraposée du théorème de Thalès**, les droites '
                  + droite(M, N) + ' et ' + droite(B, C) + ' ne sont ' + '**pas parallèles**'
                  + '.}}')
    return variation(
        ordre + ' ' + donnees((A + M, '{{am}}'), (A + B, '{{ab}}'), (A + N, evd('an')),
                              (A + C, '{{ac}}'))
        + ' Les droites ' + droite(M, N) + ' et ' + droite(B, C) + ' sont-elles parallèles ?'
        + fig + choix(['Oui', 'Non'], melanger=False),
        LETTRES + [ORIENTATION] + RECIP_VARS, ['{{w}}'],
        ['On compare $' + frac(A + M, A + B) + '$ et $' + frac(A + N, A + C)
         + '$ par les **produits en croix** :', produits, conclusion], RECIP_COND)


MODELES.append(modele(
    '04-reciproque-contraposee-thales', 'Réciproque et contraposée de Thalès',
    'Dire si deux droites sont parallèles par la réciproque ou la contraposée du théorème de'
    ' Thalès : triangles emboîtés, papillon ; rapports égaux ou proches',
    'Théorème de Thalès', 'Réciproque', [reciproque(False), reciproque(True)],
    [spec('Rapports égaux 3/5 = 6/10 : oui', 0,
          {**S0, 'w': 0, 'ab': 5, 'am': 3, 'ac': 10, 'h': 1, 'an': 6}, '0', 'correct'),
     spec('Rapports égaux : « non » faux', 0,
          {**S0, 'w': 0, 'ab': 5, 'am': 3, 'ac': 10, 'h': 1, 'an': 6}, '1', 'incorrect'),
     spec('Rapports 3/5 et 6,2/10 : non', 0,
          {**S0, 'w': 1, 'ab': 5, 'am': 3, 'ac': 10, 'h': 2, 'an': 6.2}, '1', 'correct'),
     spec('Erreur : « oui » quand les rapports diffèrent', 0,
          {**S0, 'w': 1, 'ab': 5, 'am': 3, 'ac': 10, 'h': 2, 'an': 6.2}, '0', 'incorrect'),
     spec('Papillon égaux : oui', 1,
          {**S0, 'w': 0, 'ab': 4, 'am': 3, 'ac': 8, 'h': 1, 'an': 6}, '0', 'correct'),
     spec('Papillon différents : non', 1,
          {**S0, 'w': 1, 'ab': 4, 'am': 3, 'ac': 8, 'h': -1, 'an': 5.9}, '1', 'correct')],
    delay=120))

# --- Triangle rectangle (trigonométrie) --------------------------------------------------------
# Rectangle en A ; o = 1 : symétrie d'axe vertical. angle_b = mesure de l'angle en B (degrés),
# pour tracer à l'échelle : AB = 6 cos(B)·…, figure dans une fenêtre 0..10 × 0..7.


def xo(v):
    return '{{if:o==0|' + str(v) + '|' + str(round(10 - v, 2)) + '}}'


def cote(gauche, droite_):
    return '{{if:o==0|' + gauche + '|' + droite_ + '}}'


def fig_rectangle(xb, yc, marque, haut='8.8'):
    """A = (1,1) (ou symétrique), B = (xb, 1), C = (1, yc) ; marque : sommet de l'angle aigu."""
    autre = {B: (C, A), C: (A, B)}[marque]
    return figure(
        'Triangle ' + A + B + C + ' rectangle en ' + A + ', angle en ' + marque + ' marqué.',
        A + ' = point(' + xo(1) + ', 1, etiquette="' + cote('bas-gauche', 'bas-droite') + '")\n'
        + B + ' = point(' + cote(xb, '10 - (' + xb + ')') + ', 1, etiquette="'
        + cote('bas-droite', 'bas-gauche') + '")\n'
        + C + ' = point(' + xo(1) + ', ' + yc + ', etiquette="' + cote('haut-gauche', 'haut-droite')
        + '")\n'
        + 'segment(' + A + ', ' + B + ')\nsegment(' + B + ', ' + C + ')\nsegment(' + C + ', ' + A
        + ')\nangle(' + B + ', ' + A + ', ' + C + ', marque="carre")\nangle(' + autre[0] + ', '
        + marque + ', ' + autre[1] + ')\n',
        fenetre='0 ; 10 ; 0 ; ' + haut)


RECTANGLE = 'Le triangle $' + A + B + C + '$ est rectangle en $' + A + '$.'


def angle(sommet):
    autres = {B: A + B + C, C: A + C + B}
    return '\\widehat{' + autres[sommet] + '}'


# --- 5. 3-023 : écrire cos, sin, tan ------------------------------------------------------------

def ligne(f, sommet):
    """Bonne fraction et trois autres, pour f (cos, sin, tan) de l'angle en sommet."""
    hyp = B + C
    adj = A + B if sommet == B else A + C
    opp = A + C if sommet == B else A + B
    bonnes = {'cos': (adj, hyp), 'sin': (opp, hyp), 'tan': (opp, adj)}
    toutes = [(adj, hyp), (opp, hyp), (opp, adj), (adj, opp), (hyp, adj), (hyp, opp)]
    bonne = bonnes[f]
    ordre = {'cos': [(opp, hyp), (adj, opp), (hyp, adj)], 'sin': [(adj, hyp), (adj, opp),
             (hyp, opp)], 'tan': [(adj, opp), (opp, hyp), (adj, hyp)]}[f]
    assert all(o in toutes and o != bonne for o in ordre)
    return bonne, ordre, adj, opp, hyp


DEFS = {'cos': '\\cos = \\dfrac{\\text{côté adjacent}}{\\text{hypoténuse}}',
        'sin': '\\sin = \\dfrac{\\text{côté opposé}}{\\text{hypoténuse}}',
        'tan': '\\tan = \\dfrac{\\text{côté opposé}}{\\text{côté adjacent}}'}


def ecrire(f, sommet):
    bonne, fausses, adj, opp, hyp = ligne(f, sommet)
    return variation(
        RECTANGLE + ' Que vaut $\\' + f + angle(sommet) + '$ ?' + fig_rectangle('8', '5.5', sommet, haut='6.5')
        + choix(['$' + frac(*bonne) + '$'] + ['$' + frac(*o) + '$' for o in fausses]),
        LETTRES_TRIANGLE + [ORIENTATION], ['0'],
        ['Pour l\'angle $' + angle(sommet) + '$ : l\'**hypoténuse** est $' + hyp + '$ (en face'
         ' de l\'angle droit), le **côté adjacent** est $' + adj + '$, le **côté opposé** est $'
         + opp + '$.',
         '$$' + DEFS[f] + ' \\quad\\text{donc}\\quad \\' + f + angle(sommet) + ' = '
         + col(frac(*bonne)) + '$$'])


def ecrire_autre_angle():
    """L'une des trois lignes (f = 0, 1, 2) de l'angle en C."""
    par_f = [ligne(f, C) for f in ('cos', 'sin', 'tan')]

    def selon(vals):
        return ''.join('{{if:f==' + str(j) + '|' + vals[j] + '|}}' for j in range(3))
    nom = selon(['\\cos', '\\sin', '\\tan'])
    lignes = [selon(['$' + frac(*p[0]) + '$' for p in par_f])] + [
        selon(['$' + frac(*p[1][j]) + '$' for p in par_f]) for j in range(3)]
    _, _, adj, opp, hyp = par_f[0]
    return variation(
        RECTANGLE + ' Que vaut $' + nom + angle(C) + '$ ?' + fig_rectangle('8', '5.5', C, haut='6.5')
        + choix(lignes),
        LETTRES_TRIANGLE + [ORIENTATION, var('f', '0..2')], ['0'],
        ['Pour l\'angle $' + angle(C) + '$ : l\'**hypoténuse** est $' + hyp + '$, le **côté'
         ' adjacent** est $' + adj + '$, le **côté opposé** est $' + opp + '$.',
         '$$' + selon([DEFS['cos'], DEFS['sin'], DEFS['tan']]) + ' \\quad\\text{donc}\\quad '
         + nom + angle(C) + ' = ' + col(selon([frac(*p[0]) for p in par_f])) + '$$'])


S_T = {k: v for k, v in S0.items() if k in ('s', 'o', 'pA', 'pB', 'pC')}
MODELES.append(modele(
    '05-ecrire-cos-sin-tan', 'Écrire cos, sin ou tan d\'un angle',
    'Écrire le cosinus, le sinus ou la tangente d\'un angle aigu d\'un triangle rectangle'
    ' (cos B = AB/BC) : angle en B, puis l\'autre angle aigu',
    'Trigonométrie', 'Lignes trigonométriques',
    [ecrire('cos', B), ecrire('sin', B), ecrire('tan', B), ecrire_autre_angle()],
    [spec('cos B = AB/BC', 0, S_T, '0', 'correct'),
     spec('Erreur : cos B = AC/BC (côté opposé)', 0, S_T, '1', 'incorrect'),
     spec('sin B = AC/BC', 1, S_T, '0', 'correct'),
     spec('Erreur : sin B = AB/BC', 1, S_T, '1', 'incorrect'),
     spec('tan B = AC/AB', 2, S_T, '0', 'correct'),
     spec('Erreur : tan B = AB/AC', 2, S_T, '1', 'incorrect'),
     spec('cos C = AC/BC', 3, {**S_T, 'f': 0}, '0', 'correct'),
     spec('Erreur : cos C lu comme cos B', 3, {**S_T, 'f': 0}, '1', 'incorrect')],
    delay=45))

# --- 6. 3-061 : calculer une longueur ou un angle -----------------------------------------------
# Angle b de 20° à 70° ; longueurs données entières ; longueur cherchée arrondie au dixième, loin
# d'un demi-dixième (arrondi sans ambiguïté). Figure à l'échelle : hypoténuse de 7 unités.

RAD = '*\\pi/180'


def loin(x, pas=10):
    """x arrondi à 1/pas sans ambiguïté : à plus de 0,1 pas d'un demi-pas."""
    return 'abs(' + str(pas) + '*(' + x + ') - round(' + str(pas) + '*(' + x + '))) < 0.4'


def r1(x):
    return 'round(10*(' + x + '))/10'


def coords_angle(b):
    """B et C pour un angle en B de mesure b (expression en degrés), hypoténuse 7."""
    return (ev('round(100*(1+7*cos((' + b + ')' + RAD + ')))/100;d'),
            ev('round(100*(1+7*sin((' + b + ')' + RAD + ')))/100;d'))


XB, YC = coords_angle('b')
DEG = '^{\\circ}'


def trig_longueur(f, connu, cherche, valeur, formule, etape):
    """f : cos, sin, tan ; connu = (segment, variable) ; valeur : expression de la longueur."""
    return variation(
        RECTANGLE + ' On donne $' + angle(B) + ' = {{b}}' + DEG + '$ et $' + connu[0] + ' = {{'
        + connu[1] + '}}' + CM + '$. Calcule $' + cherche + '$, arrondie au dixième.'
        + fig_rectangle(XB, YC, B) + '\n\n$' + cherche + ' \\approx ?' + CM + '$',
        LETTRES_TRIANGLE + [ORIENTATION, var('b', '20..70'), var(connu[1], '3..15')],
        [ev(r1(valeur) + ';d')],
        ['Dans le triangle $' + A + B + C + '$ rectangle en $' + A + '$ : $$' + formule + '$$',
         etape,
         '$$' + cherche + ' \\approx ' + col(ev(r1(valeur) + ';d') + CM) + '$$ (à la'
         ' calculatrice, en degrés, arrondi au dixième).'],
        [loin(valeur)])


V_COS = trig_longueur(
    'cos', (B + C, 'bc'), A + B, 'bc*cos(b' + RAD + ')',
    '\\cos' + angle(B) + ' = ' + frac(A + B, B + C) + ' \\quad\\text{donc}\\quad \\cos({{b}}'
    + DEG + ') = ' + frac(A + B, '{{bc}}'),
    '$$' + A + B + ' = {{bc}} ' + X + ' \\cos({{b}}' + DEG + ')$$')
V_SIN = trig_longueur(
    'sin', (A + C, 'ac'), B + C, 'ac/sin(b' + RAD + ')',
    '\\sin' + angle(B) + ' = ' + frac(A + C, B + C) + ' \\quad\\text{donc}\\quad \\sin({{b}}'
    + DEG + ') = ' + frac('{{ac}}', B + C),
    'La longueur cherchée est **au dénominateur** : $$' + B + C + ' = '
    + frac('{{ac}}', '\\sin({{b}}' + DEG + ')') + '$$')
V_TAN = trig_longueur(
    'tan', (A + B, 'ab'), A + C, 'ab*tan(b' + RAD + ')',
    '\\tan' + angle(B) + ' = ' + frac(A + C, A + B) + ' \\quad\\text{donc}\\quad \\tan({{b}}'
    + DEG + ') = ' + frac(A + C, '{{ab}}'),
    '$$' + A + C + ' = {{ab}} ' + X + ' \\tan({{b}}' + DEG + ')$$')

# v4 : l'angle, connaissant AB et BC (f = 0 : cos), AC et BC (f = 1 : sin), AC et AB (f = 2 : tan)
# ang : mesure de l'angle en degrés, au millième (une variable : pas de {{if}} dans un eval)
ANG = var('ang', ''.join('{{if:f==' + str(j) + '|' + ev('round(1000*' + g + '(u/v)*180/\\pi)/1000;d')
                         + '|}}' for j, g in enumerate(('acos', 'asin', 'atan'))))
ANGLE_DEG = 'ang'
XB4, YC4 = coords_angle(ANGLE_DEG)


def selon_f(vals):
    return ''.join('{{if:f==' + str(j) + '|' + vals[j] + '|}}' for j in range(3))


SEG_U = selon_f([A + B, A + C, A + C])
SEG_V = selon_f([B + C, B + C, A + B])
F_NOM = selon_f(['\\cos', '\\sin', '\\tan'])
F_INV = selon_f(['\\arccos', '\\arcsin', '\\arctan'])
V_ANGLE = variation(
    RECTANGLE + ' On donne $' + SEG_U + ' = {{u}}' + CM + '$ et $' + SEG_V + ' = {{v}}' + CM
    + '$. Calcule $' + angle(B) + '$, arrondi au degré.' + fig_rectangle(XB4, YC4, B)
    + '\n\n$' + angle(B) + ' \\approx ?' + DEG + '$',
    LETTRES_TRIANGLE + [ORIENTATION, var('f', '0..2'), var('v', '4..15'), var('u', '2..14'), ANG],
    [ev('round(' + ANGLE_DEG + ')')],
    ['Dans le triangle $' + A + B + C + '$ rectangle en $' + A + '$ : $$' + F_NOM + angle(B)
     + ' = ' + frac(SEG_U, SEG_V) + ' = ' + frac('{{u}}', '{{v}}') + '$$',
     'À la calculatrice (touche $' + F_NOM + '^{-1}$, en degrés) : $$' + angle(B) + ' \\approx '
     + col(ev('round(' + ANGLE_DEG + ')') + DEG) + '$$ (arrondi au degré).'],
    ['u < v', 'round(' + ANGLE_DEG + ') >= 15', 'round(' + ANGLE_DEG + ') <= 75',
     loin(ANGLE_DEG, 1)])

S_B = {**S_T, 'b': 40}
MODELES.append(modele(
    '06-calculer-longueur-angle-trigo', 'Calculer une longueur ou un angle (trigonométrie)',
    'Calculer une longueur ou un angle dans un triangle rectangle avec cos, sin ou tan :'
    ' longueur au numérateur, au dénominateur, avec la tangente, puis un angle ; arrondis',
    'Trigonométrie', 'Calculer', [V_COS, V_SIN, V_TAN, V_ANGLE],
    [spec('BC = 6, B = 40° : AB ≈ 4,6', 0, {**S_B, 'bc': 6}, '4{,}6', 'correct'),
     spec('Erreur : sin au lieu de cos, 3,9', 0, {**S_B, 'bc': 6}, '3{,}9', 'incorrect'),
     spec('Valeur non arrondie 4,596', 0, {**S_B, 'bc': 6}, '4{,}596', 'incorrect'),
     spec('AC = 5, B = 40° : BC ≈ 7,8', 1, {**S_B, 'ac': 5}, '7{,}8', 'correct'),
     spec('Erreur : produit au lieu du quotient, 3,2', 1, {**S_B, 'ac': 5}, '3{,}2', 'incorrect'),
     spec('AB = 7, B = 40° : AC ≈ 5,9', 2, {**S_B, 'ab': 7}, '5{,}9', 'correct'),
     spec('AB = 3, BC = 5 : B ≈ 53°', 3, {**S_T, 'f': 0, 'u': 3, 'v': 5, 'ang': 53.13}, '53',
          'correct'),
     spec('Erreur : arcsin au lieu de arccos, 37°', 3, {**S_T, 'f': 0, 'u': 3, 'v': 5, 'ang': 53.13},
          '37',
          'incorrect')],
    delay=150))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

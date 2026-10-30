"""Écrit les 7 modèles du lot 5 « Pythagore et triangles » de la 4e dans scripts/questions/4-lot-5/.

Phase 0 validée par David le 2026-10-30 (§ 25 du journal « docs/wip/questions-4-progress.md »), un
point par modèle :

| # | Point | Titre                                   | Catégorie, niveau                                         |
| 1 | 4-034 | Calculer une longueur avec Pythagore    | Géométrie › Théorème de Pythagore › Calculer une longueur, 1 |
| 2 | 4-072 | Réciproque et contraposée de Pythagore  | Géométrie › Théorème de Pythagore › Réciproque et contraposée, 1 |
| 3 | 4-033 | Droite des milieux                      | Géométrie › Triangles › Droite des milieux, 1              |
| 4 | 4-036 | Triangle inscrit dans un demi-cercle    | Géométrie › Triangles › Cercle circonscrit, 1              |
| 5 | 4-037 | Centre du cercle circonscrit            | Géométrie › Triangles › Cercle circonscrit, 2              |
| 6 | 4-035 | Réciproque et contraposée               | Géométrie › Raisonner › Réciproque et contraposée, 1       |
| 7 | 4-075 | Formule de l'aire d'un triangle         | Calcul littéral › Produire une formule › Aires, 1          |

Bornes : « cycle4.json », 4e (4-034 : un côté connaissant les deux autres, exact (√) ou approché ;
4-072 : le mot « contraposée » est attendu ; 4-033 : les trois théorèmes de la droite des milieux ;
4-075 : aire d'un triangle de base b et de hauteur h). Le nœud et le tag sont posés par la
migration de rangement, après le « --publier » de David.

Décisions (David, 2026-10-30, « je te suis ») :
- valeur exacte de Pythagore : √n avec n sans facteur carré seulement ;
- figures à l'échelle, longueurs dans l'énoncé (gabarit lot-3-3.py : lettres tirées en trois
  jeux, orientation o) ;
- Oui / Non non mélangé, la raison au corrigé (comme 3-055) ;
- 4-075 : toute expression égale acceptée (contrainte « form » coupée).

Pièges (repris du lot 3-3 de la 3e) :
- arrondi attendu : « ;d » dans la réponse ; tirages loin d'un demi-dixième ;
- case choix : la bonne réponse est écrite en premier (indice 0), le bloc mélange ;
- variables « e » et « i » interdites dans les « eval » ; une variable ne vaut jamais une lettre.

    python3 docs/wip/questions/lot-4-5.py scripts/questions/4-lot-5
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


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return nom, m


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


def selon(nom, valeurs):
    """Texte ou nombre choisi par la variable nom ({{if}} mis bout à bout, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(j) + '|' + v + '|}}' for j, v in enumerate(valeurs))


def loin(x, pas=10):
    """x arrondi à 1/pas sans ambiguïté : à plus de 0,1 pas d'un demi-pas."""
    return 'abs(' + str(pas) + '*(' + x + ') - round(' + str(pas) + '*(' + x + '))) < 0.4'


def pas_entier(x):
    return 'abs((' + x + ') - round(' + x + ')) > 0.01'


def r1(x):
    return 'round(10*(' + x + '))/10'


X = '\\times'
CM = '~\\unit{cm}'
MODELES = []

# --- Lettres : trois jeux, tirés par s -------------------------------------------------------

JEUX = {'A': 'ARE', 'B': 'BSF', 'C': 'CTG', 'M': 'MUK', 'N': 'NVL', 'O': 'OIP'}


def lettre(k):
    return selon('s', list(JEUX[k]))


LETTRES = [var('s', '0..2')]
ORIENTATION = var('o', '0..1')
A, B, C, M, N, O = (lettre(k) for k in 'ABCMNO')
S0 = {'s': 0, 'o': 0}


def seg(p, q):
    return '$[' + p + q + ']$'


def droite(p, q):
    return '$(' + p + q + ')$'


def donnees(*paires):
    textes = ['$' + n + ' = ' + v + CM + '$' for n, v in paires]
    if len(textes) == 1:
        return 'On donne ' + textes[0] + '.'
    return 'On donne ' + ', '.join(textes[:-1]) + ' et ' + textes[-1] + '.'


def figure(description, corps, fenetre='0 ; 10 ; 0 ; 9'):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + corps + '```')


def cote(gauche, droite_):
    return '{{if:o==0|' + gauche + '|' + droite_ + '}}'


def xo(v):
    return '{{if:o==0|' + str(v) + '|' + str(round(10 - v, 2)) + '}}'


# --- Triangle rectangle en A, à l'échelle ------------------------------------------------------
# A = (1, 1), B sur l'horizontale, C sur la verticale ; o = 1 : symétrie d'axe vertical.
# u = AB, v = AC (noms de variables) : le plus long côté de l'angle droit mesure 7 unités.


def echelle(u, v):
    grand = 'max(' + u + ', ' + v + ')'
    return (ev('round(100*(1 + 7*' + u + '/' + grand + '))/100;d'),
            ev('round(100*(1 + 7*' + v + '/' + grand + '))/100;d'),
            ev('round(10*(2.2 + 7*' + v + '/' + grand + '))/10;d'))


def fig_rectangle(xb, yc, haut='7.5', extra=''):
    return figure(
        'Triangle ' + A + B + C + ' rectangle en ' + A + '.',
        A + ' = point(' + xo(1) + ', 1, etiquette="' + cote('bas-gauche', 'bas-droite') + '")\n'
        + B + ' = point(' + cote(xb, '10 - (' + xb + ')') + ', 1, etiquette="'
        + cote('bas-droite', 'bas-gauche') + '")\n'
        + C + ' = point(' + xo(1) + ', ' + yc + ', etiquette="' + cote('haut-gauche', 'haut-droite')
        + '")\n'
        + 'segment(' + A + ', ' + B + ')\nsegment(' + B + ', ' + C + ')\nsegment(' + C + ', ' + A
        + ')\nangle(' + B + ', ' + A + ', ' + C + ', marque="carre")\n' + extra,
        fenetre='0 ; 10 ; 0 ; ' + haut)


RECTANGLE = 'Le triangle $' + A + B + C + '$ est rectangle en $' + A + '$.'

# Triplets pythagoriciens (côtés de l'angle droit p, q ; hypoténuse h), multipliés par k ≤ 30.
TRIPLETS = [(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (20, 21, 29), (6, 8, 10)]
T_P = selon('t', [str(p) for p, _, _ in TRIPLETS])
T_Q = selon('t', [str(q) for _, q, _ in TRIPLETS])
T_H = selon('t', [str(h) for _, _, h in TRIPLETS])


def triplet(r=True):
    """ab, ac, bc entiers : triplet t multiplié par k ; r échange les deux côtés de l'angle droit."""
    vs = [var('t', '0..4'), var('k', '1..6'), var('p', T_P), var('q', T_Q), var('hy', T_H)]
    if r:
        vs.append(var('r', '0..1'))
        vs += [var('ab', 'eval:k*(r*q + (1-r)*p)'), var('ac', 'eval:k*(r*p + (1-r)*q)')]
    else:
        vs += [var('ab', 'eval:k*p'), var('ac', 'eval:k*q')]
    vs.append(var('bc', 'eval:k*hy'))
    return vs


T_COND = ['k*hy <= 30']


def s_triplet(t, k, r=0):
    p, q, h = TRIPLETS[t]
    ab, ac = (q, p) if r else (p, q)
    return {**S0, 't': t, 'k': k, 'p': p, 'q': q, 'hy': h, 'r': r, 'ab': k * ab, 'ac': k * ac,
            'bc': k * h}


# --- 1. 4-034 : calculer une longueur avec Pythagore --------------------------------------------

PYTHA = ('Le triangle $' + A + B + C + '$ est rectangle en $' + A + '$ : d\'après le **théorème'
         ' de Pythagore**, $$' + B + C + '^2 = ' + A + B + '^2 + ' + A + C + '^2$$')
XB, YC, HT = echelle('ab', 'ac')


def hypotenuse(variables, valeur, reponse, conditions, approche=False):
    signe = '\\approx' if approche else '='
    return variation(
        RECTANGLE + ' ' + donnees((A + B, '{{ab}}'), (A + C, '{{ac}}')) + ' Calcule $' + B + C
        + '$' + (', arrondie au dixième.' if approche else '.') + fig_rectangle(XB, YC, HT)
        + '\n\n$' + B + C + ' ' + signe + ' ?' + CM + '$',
        LETTRES + [ORIENTATION] + variables, [reponse],
        [PYTHA,
         '$$' + B + C + '^2 = {{ab}}^2 + {{ac}}^2 = ' + ev('ab^2') + ' + ' + ev('ac^2') + ' = '
         + ev('ab^2+ac^2') + '$$',
         '$$' + B + C + ' = \\sqrt{' + ev('ab^2+ac^2') + '} ' + signe + ' ' + col(valeur + CM)
         + '$$' + (' (à la calculatrice, arrondi au dixième).' if approche else '')],
        conditions)


def cote_droit(variables, valeur, reponse, conditions, approche=False):
    signe = '\\approx' if approche else '='
    return variation(
        RECTANGLE + ' ' + donnees((B + C, '{{bc}}'), (A + C, '{{ac}}')) + ' Calcule $' + A + B
        + '$' + (', arrondie au dixième.' if approche else '.') + fig_rectangle(XB, YC, HT)
        + '\n\n$' + A + B + ' ' + signe + ' ?' + CM + '$',
        LETTRES + [ORIENTATION] + variables, [reponse],
        [PYTHA,
         '$[' + B + C + ']$ est l\'hypoténuse : on cherche un côté de l\'angle droit, on'
         ' **soustrait**. $$' + A + B + '^2 = ' + B + C + '^2 - ' + A + C + '^2 = {{bc}}^2 - {{ac}}^2 = '
         + ev('bc^2') + ' - ' + ev('ac^2') + ' = ' + ev('bc^2-ac^2') + '$$',
         '$$' + A + B + ' = \\sqrt{' + ev('bc^2-ac^2') + '} ' + signe + ' ' + col(valeur + CM)
         + '$$' + (' (à la calculatrice, arrondi au dixième).' if approche else '')],
        conditions)


V34_HYP = hypotenuse(triplet(), '{{bc}}', '{{bc}}', T_COND)
V34_COTE = cote_droit(triplet(), '{{ab}}', '{{ab}}', T_COND)
HYP_APP = 'sqrt(ab^2+ac^2)'
V34_HYP_APP = hypotenuse([var('ab', '2..12'), var('ac', '2..12')], evd(r1(HYP_APP)),
                         evd(r1(HYP_APP)), [pas_entier(HYP_APP), loin(HYP_APP)], approche=True)
COTE_APP = 'sqrt(bc^2-ac^2)'
V34_COTE_APP = cote_droit([var('bc', '5..15'), var('ac', '2..14'),
                           var('ab', 'eval:round(1000*sqrt(bc^2-ac^2))/1000;d')],
                          evd(r1('ab')), evd(r1('ab')),
                          ['ac < bc', pas_entier(COTE_APP), loin(COTE_APP), 'ab >= 2'],
                          approche=True)
N_EXACT = 'ab^2+ac^2'
V34_EXACT = variation(
    RECTANGLE + ' ' + donnees((A + B, '{{ab}}'), (A + C, '{{ac}}')) + ' Calcule la valeur'
    ' **exacte** de $' + B + C + '$.' + fig_rectangle(XB, YC, HT) + '\n\n$' + B + C + ' = ?' + CM + '$',
    LETTRES + [ORIENTATION, var('ab', '1..9'), var('ac', '1..9')],
    ['\\sqrt{ ' + ev(N_EXACT) + ' }'],
    [PYTHA,
     '$$' + B + C + '^2 = {{ab}}^2 + {{ac}}^2 = ' + ev(N_EXACT) + '$$',
     ev(N_EXACT) + ' n\'est pas un carré parfait : on garde la racine carrée. $$' + B + C + ' = '
     + col('\\sqrt{ ' + ev(N_EXACT) + ' }' + CM) + '$$'],
    [pas_entier('sqrt(' + N_EXACT + ')')] + [pas_entier('(' + N_EXACT + ')/' + str(d * d))
                                             for d in (2, 3, 5, 7)])
V34_EGALITE = variation(
    RECTANGLE + ' Quelle égalité donne le théorème de Pythagore ?' + fig_rectangle('8', '6')
    + choix(['$' + B + C + '^2 = ' + A + B + '^2 + ' + A + C + '^2$',
             '$' + A + B + '^2 = ' + B + C + '^2 + ' + A + C + '^2$',
             '$' + B + C + ' = ' + A + B + ' + ' + A + C + '$',
             '$' + A + C + '^2 = ' + A + B + '^2 + ' + B + C + '^2$']),
    LETTRES + [ORIENTATION], ['0'],
    ['L\'**hypoténuse** est le côté opposé à l\'angle droit : ici $[' + B + C + ']$.',
     'Le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés : $$'
     + col(B + C + '^2 = ' + A + B + '^2 + ' + A + C + '^2') + '$$',
     'Les longueurs elles-mêmes ne s\'additionnent pas : $' + B + C + ' \\neq ' + A + B + ' + '
     + A + C + '$.'])

S_HA = {**S0, 'ab': 4, 'ac': 7}
MODELES.append(modele(
    '01-calculer-longueur-pythagore', 'Calculer une longueur avec Pythagore',
    'Calculer une longueur dans un triangle rectangle avec le théorème de Pythagore : hypoténuse,'
    ' côté de l\'angle droit, valeurs arrondies au dixième, valeur exacte, égalité à écrire',
    'Géométrie', 'Théorème de Pythagore', 'Calculer une longueur', 1,
    [V34_EGALITE, V34_HYP, V34_COTE, V34_HYP_APP, V34_COTE_APP, V34_EXACT],
    [spec('Égalité BC² = AB² + AC²', 0, S0, '0', 'correct'),
     spec('Erreur : hypoténuse mal placée', 0, S0, '1', 'incorrect'),
     spec('Erreur : longueurs additionnées', 0, S0, '2', 'incorrect'),
     spec('AB = 6, AC = 8 : BC = 10', 1, s_triplet(0, 2), '10', 'correct'),
     spec('Erreur : AB + AC = 14', 1, s_triplet(0, 2), '14', 'incorrect'),
     spec('Erreur : racine oubliée, 100', 1, s_triplet(0, 2), '100', 'incorrect'),
     spec('BC = 13, AC = 12 : AB = 5', 2, s_triplet(1, 1), '5', 'correct'),
     spec('Erreur : somme au lieu de différence, 17,7', 2, s_triplet(1, 1), '17{,}7', 'incorrect'),
     spec('AB = 4, AC = 7 : BC ≈ 8,1', 3, S_HA, '8{,}1', 'correct'),
     spec('Valeur non arrondie 8,06', 3, S_HA, '8{,}06', 'incorrect'),
     spec('Erreur : AB + AC = 11', 3, S_HA, '11', 'incorrect'),
     spec('BC = 9, AC = 5 : AB ≈ 7,5', 4, {**S0, 'bc': 9, 'ac': 5, 'ab': 7.483}, '7{,}5',
          'correct'),
     spec('Erreur : somme, 10,3', 4, {**S0, 'bc': 9, 'ac': 5, 'ab': 7.483}, '10{,}3', 'incorrect'),
     spec('AB = 4, AC = 5 : BC = √41', 5, {**S0, 'ab': 4, 'ac': 5}, '\\sqrt{41}', 'correct'),
     spec('Valeur approchée 6,4 au lieu de la valeur exacte', 5, {**S0, 'ab': 4, 'ac': 5}, '6{,}4',
          'incorrect'),
     spec('Erreur : racine oubliée, 41', 5, {**S0, 'ab': 4, 'ac': 5}, '41', 'incorrect')],
    delay=120))

# --- 2. 4-072 : réciproque et contraposée de Pythagore ------------------------------------------
# w = 0 : triplet (rectangle) ; w = 1 : BC décalé de h dixièmes (pas rectangle).

CROQUIS = figure(
    'Croquis du triangle ' + A + B + C + ', pas à l\'échelle.',
    A + ' = point(3, 5.5, etiquette="haut")\n' + B + ' = point(1, 1, etiquette="bas-gauche")\n'
    + C + ' = point(9, 1, etiquette="bas-droite")\nsegment(' + A + ', ' + B + ')\nsegment(' + B
    + ', ' + C + ')\nsegment(' + C + ', ' + A + ')\n', fenetre='0 ; 10 ; 0 ; 6.5')
RECIP_VARS = triplet(r=False)[:-1] + [var('w', '0..1'), var('h', '1..3;±'),
                                      var('bc', 'eval:k*hy + w*h/10;d')]


def carres():
    return ['$[' + B + C + ']$ est le plus long côté. On calcule séparément :',
            '$$' + B + C + '^2 = ' + ev('bc') + '^2 = ' + evd('bc^2') + '$$ $$' + A + B + '^2 + '
            + A + C + '^2 = {{ab}}^2 + {{ac}}^2 = ' + ev('ab^2') + ' + ' + ev('ac^2') + ' = '
            + ev('ab^2+ac^2') + '$$']


V72_OUI_NON = variation(
    'Dans le triangle $' + A + B + C + '$, ' + donnees((A + B, '{{ab}}'), (A + C, '{{ac}}'),
                                                       (B + C, evd('bc')))[9:]
    + ' Le triangle $' + A + B + C + '$ est-il rectangle ?' + CROQUIS + choix(['Oui', 'Non'],
                                                                         melanger=False),
    LETTRES + RECIP_VARS, ['{{w}}'],
    carres() + ['{{if:w==0|Les deux résultats sont **égaux** : d\'après la **réciproque du'
                ' théorème de Pythagore**, le triangle $' + A + B + C + '$ est ' + '**rectangle en $'
                + A + '$**' + '.|Les deux résultats sont **différents** : d\'après la **contraposée'
                ' du théorème de Pythagore**, le triangle $' + A + B + C + '$ n\'est ' + '**pas'
                ' rectangle**' + '.}}'],
    ['k*hy <= 25'])
OPTIONS_THEO = ['La réciproque du théorème de Pythagore', 'Le théorème de Pythagore',
                'La contraposée du théorème de Pythagore']


def quel_theoreme(rectangle):
    conclusion = ('le triangle $' + A + B + C + '$ est rectangle en $' + A + '$'
                  if rectangle else 'le triangle $' + A + B + C + '$ n\'est pas rectangle')
    egal = ' = ' if rectangle else ' \\neq '
    options = (OPTIONS_THEO if rectangle else
               [OPTIONS_THEO[2], OPTIONS_THEO[1], OPTIONS_THEO[0]])
    return variation(
        'Dans le triangle $' + A + B + C + '$, $[' + B + C + ']$ est le plus long côté, et on a'
        ' calculé : $' + B + C + '^2 = ' + ev('bc^2') + '$ et $' + A + B + '^2 + ' + A + C + '^2 = '
        + ev('ab^2+ac^2' + ('' if rectangle else '+h')) + '$. Quel théorème permet de conclure que '
        + conclusion + ' ?' + choix(options),
        LETTRES + triplet(r=False) + [var('h', '1..9;±')], ['0'],
        ['On part des longueurs (les carrés sont ' + ('égaux' if rectangle else 'différents')
         + ') pour conclure sur le triangle.',
         ('C\'est la **réciproque** : « si $' + B + C + '^2 = ' + A + B + '^2 + ' + A + C
          + '^2$, alors le triangle est rectangle en $' + A + '$ ». Le théorème de Pythagore'
          ' fait l\'inverse : il part d\'un triangle rectangle.' if rectangle else
          'C\'est la **contraposée** : « si $' + B + C + '^2 \\neq ' + A + B + '^2 + ' + A + C
          + '^2$, alors le triangle n\'est pas rectangle ». Elle est vraie parce que le théorème'
          ' de Pythagore est vrai.'),
         '$$' + col(B + C + '^2' + egal + A + B + '^2 + ' + A + C + '^2') + '$$'],
        T_COND)


MODELES.append(modele(
    '02-reciproque-contraposee-pythagore', 'Réciproque et contraposée de Pythagore',
    'Dire si un triangle est rectangle par la réciproque ou la contraposée du théorème de'
    ' Pythagore : trois longueurs données, puis le théorème qui permet de conclure',
    'Géométrie', 'Théorème de Pythagore', 'Réciproque et contraposée', 1,
    [V72_OUI_NON, quel_theoreme(True), quel_theoreme(False)],
    [spec('6 ; 8 ; 10 : oui', 0, {**s_triplet(0, 2), 'w': 0, 'h': 1, 'bc': 10}, '0', 'correct'),
     spec('6 ; 8 ; 10 : « non » faux', 0, {**s_triplet(0, 2), 'w': 0, 'h': 1, 'bc': 10}, '1',
          'incorrect'),
     spec('6 ; 8 ; 10,1 : non', 0, {**s_triplet(0, 2), 'w': 1, 'h': 1, 'bc': 10.1}, '1', 'correct'),
     spec('Erreur : « oui » au presque-triplet', 0, {**s_triplet(0, 2), 'w': 1, 'h': 1, 'bc': 10.1},
          '0', 'incorrect'),
     spec('Égalité : la réciproque', 1, {**s_triplet(0, 1), 'h': 2}, '0', 'correct'),
     spec('Erreur : « le théorème de Pythagore »', 1, {**s_triplet(0, 1), 'h': 2}, '1',
          'incorrect'),
     spec('Différence : la contraposée', 2, {**s_triplet(0, 1), 'h': 2}, '0', 'correct'),
     spec('Erreur : la réciproque', 2, {**s_triplet(0, 1), 'h': 2}, '2', 'incorrect')],
    delay=90))

# --- 3. 4-033 : droite des milieux ------------------------------------------------------------
# Triangle fixe, A en haut ; o = 1 : symétrie d'axe vertical. M sur [AB], N sur [AC].


def fig_milieux(code_n=True):
    corps = (A + ' = point(' + xo(4) + ', 7.5, etiquette="haut")\n'
             + B + ' = point(' + xo(1) + ', 1, etiquette="' + cote('bas-gauche', 'bas-droite') + '")\n'
             + C + ' = point(' + xo(9) + ', 1.5, etiquette="' + cote('bas-droite', 'bas-gauche')
             + '")\n'
             + M + ' = milieu(' + A + ', ' + B + ')\n' + N + ' = milieu(' + A + ', ' + C + ')\n'
             + 'style(' + M + ', etiquette="' + cote('gauche', 'droite') + '")\nstyle(' + N
             + ', etiquette="' + cote('droite', 'gauche') + '")\n'
             + 'segment(' + A + ', ' + B + ')\nsegment(' + B + ', ' + C + ')\nsegment(' + C + ', '
             + A + ')\nsegment(' + M + ', ' + N + ')\n'
             + 'marque_segment(' + A + ', ' + M + ')\nmarque_segment(' + M + ', ' + B + ')\n')
    if code_n:
        corps += ('marque_segment(' + A + ', ' + N + ', traits=2)\nmarque_segment(' + N + ', ' + C
                  + ', traits=2)\n')
    return figure('Triangle ' + A + B + C + ', ' + M + ' sur [' + A + B + '], ' + N + ' sur ['
                  + A + C + '].', corps)


MILIEUX = ('$' + M + '$ est le milieu de ' + seg(A, B) + ' et $' + N + '$ est le milieu de '
           + seg(A, C) + '.')
TH_PARALLELE = ('Dans un triangle, la droite qui passe par les milieux de deux côtés est'
                ' **parallèle** au troisième côté.')
TH_MOITIE = ('Dans un triangle, le segment qui joint les milieux de deux côtés mesure la'
             ' **moitié** du troisième côté.')
TH_TROISIEME = ('Dans un triangle, la droite qui passe par le milieu d\'un côté et qui est'
                ' parallèle à un deuxième côté coupe le troisième côté **en son milieu**.')

V33_PARALLELES = variation(
    MILIEUX + ' Que peut-on dire des droites ' + droite(M, N) + ' et ' + droite(B, C) + ' ?'
    + fig_milieux() + choix(['Elles sont parallèles', 'Elles sont perpendiculaires',
                             'Elles sont sécantes', 'On ne peut rien dire']),
    LETTRES + [ORIENTATION], ['0'],
    [TH_PARALLELE, 'Donc ' + droite(M, N) + ' et ' + droite(B, C) + ' sont '
     + col('\\text{parallèles}') + '.'])
V33_MOITIE = variation(
    MILIEUX + ' ' + donnees((B + C, '{{bc}}')) + ' Calcule $' + M + N + '$.' + fig_milieux()
    + '\n\n$' + M + N + ' = ?' + CM + '$',
    LETTRES + [ORIENTATION, var('bc', '4..19')], [evd('bc/2')],
    [TH_MOITIE, '$$' + M + N + ' = ' + frac(B + C, '2') + ' = ' + frac('{{bc}}', '2') + ' = '
     + col(evd('bc/2') + CM) + '$$'])
V33_DOUBLE = variation(
    MILIEUX + ' ' + donnees((M + N, evd('mn'))) + ' Calcule $' + B + C + '$.' + fig_milieux()
    + '\n\n$' + B + C + ' = ?' + CM + '$',
    LETTRES + [ORIENTATION, var('m', '15..75'), var('mn', 'eval:m/10;d')], [evd('2*mn')],
    [TH_MOITIE + ' Le troisième côté mesure donc le **double** :',
     '$$' + B + C + ' = 2 ' + X + ' ' + M + N + ' = 2 ' + X + ' ' + evd('mn') + ' = '
     + col(evd('2*mn') + CM) + '$$'])
PAR_M = ('$' + M + '$ est le milieu de ' + seg(A, B) + '. La droite parallèle à ' + droite(B, C)
         + ' qui passe par $' + M + '$ coupe ' + seg(A, C) + ' en $' + N + '$.')
V33_TROISIEME = variation(
    PAR_M + ' ' + donnees((A + C, '{{ac}}')) + ' Calcule $' + A + N + '$.' + fig_milieux(False)
    + '\n\n$' + A + N + ' = ?' + CM + '$',
    LETTRES + [ORIENTATION, var('ac', '4..19')], [evd('ac/2')],
    [TH_TROISIEME + ' Donc $' + N + '$ est le milieu de ' + seg(A, C) + ' :',
     '$$' + A + N + ' = ' + frac(A + C, '2') + ' = ' + frac('{{ac}}', '2') + ' = '
     + col(evd('ac/2') + CM) + '$$'])
V33_QUE_DIRE = variation(
    PAR_M + ' Que peut-on dire du point $' + N + '$ ?' + fig_milieux(False)
    + choix(['$' + N + '$ est le milieu de ' + seg(A, C),
             '$' + M + N + ' = ' + A + M + '$',
             '$' + N + '$ est le milieu de ' + seg(B, C),
             'On ne peut rien dire']),
    LETTRES + [ORIENTATION], ['0'],
    [TH_TROISIEME, 'Donc $' + col(N + '\\text{ est le milieu de }[' + A + C + ']') + '$.'])

MODELES.append(modele(
    '03-droite-des-milieux', 'Droite des milieux',
    'Utiliser les trois théorèmes de la droite des milieux : droites parallèles, segment moitié'
    ' du troisième côté (dans les deux sens), parallèle par un milieu',
    'Géométrie', 'Triangles', 'Droite des milieux', 1,
    [V33_PARALLELES, V33_MOITIE, V33_DOUBLE, V33_TROISIEME, V33_QUE_DIRE],
    [spec('Parallèles', 0, S0, '0', 'correct'),
     spec('Erreur : sécantes', 0, S0, '2', 'incorrect'),
     spec('BC = 9 : MN = 4,5', 1, {**S0, 'bc': 9}, '4{,}5', 'correct'),
     spec('Erreur : MN = BC = 9', 1, {**S0, 'bc': 9}, '9', 'incorrect'),
     spec('Erreur : le double, 18', 1, {**S0, 'bc': 9}, '18', 'incorrect'),
     spec('MN = 3,5 : BC = 7', 2, {**S0, 'm': 35, 'mn': 3.5}, '7', 'correct'),
     spec('Erreur : la moitié, 1,75', 2, {**S0, 'm': 35, 'mn': 3.5}, '1{,}75', 'incorrect'),
     spec('AC = 11 : AN = 5,5', 3, {**S0, 'ac': 11}, '5{,}5', 'correct'),
     spec('Erreur : AN = AC = 11', 3, {**S0, 'ac': 11}, '11', 'incorrect'),
     spec('N milieu de [AC]', 4, S0, '0', 'correct'),
     spec('Erreur : on ne peut rien dire', 4, S0, '3', 'incorrect')],
    delay=60))

# --- 4. 4-036 : triangle inscrit dans un demi-cercle ----------------------------------------------
# B = (1 ; 3,5), C = (9 ; 3,5), cercle de diamètre [BC] (centre O, rayon 4). A à l'angle th
# (degrés, mesuré depuis O), à la distance 4 × d/10 de O ; o = 1 : A sous [BC].

RAD = '*\\pi/180'


def fig_demi_cercle(xa, ya):
    return figure(
        'Cercle de diamètre [' + B + C + '], point ' + A + ', triangle ' + A + B + C + '.',
        B + ' = point(1, 3.5, etiquette="gauche")\n' + C + ' = point(9, 3.5, etiquette="droite")\n'
        + O + ' = milieu(' + B + ', ' + C + ')\nstyle(' + O + ', etiquette="' + cote('bas', 'haut')
        + '")\ncercle(' + O + ', passant=' + B + ')\n'
        + A + ' = point(' + xa + ', ' + ya + ', etiquette="' + cote('haut', 'bas') + '")\n'
        + 'segment(' + A + ', ' + B + ')\nsegment(' + B + ', ' + C + ')\nsegment(' + C + ', ' + A
        + ')\n', fenetre='0 ; 10 ; -2 ; 9')


SENS = '(1 - 2*o)'
XA = ev('round(100*(5 + 4*d/10*cos(th' + RAD + ')))/100;d')
YA = ev('round(100*(3.5 + ' + SENS + '*4*d/10*sin(th' + RAD + ')))/100;d')
SUR_CERCLE = ('Le point $' + A + '$ est sur le cercle de diamètre ' + seg(B, C) + '.')
DEMI_VARS = [var('th', '45..75'), var('g', '0..1'), var('th2', 'eval:th + g*(180 - 2*th)')]
XA2 = XA.replace('th', 'th2')
YA2 = YA.replace('th', 'th2')
TH_CERCLE = ('Si un triangle est inscrit dans un cercle qui a pour diamètre l\'un de ses côtés,'
             ' alors il est **rectangle**, et l\'angle droit est le sommet opposé à ce diamètre.')
OPTIONS_SUR = ['Rectangle en $' + A + '$', 'Rectangle en $' + B + '$', 'Équilatéral',
               'On ne peut pas savoir']

V36_SUR = variation(
    SUR_CERCLE + ' Que peut-on dire du triangle $' + A + B + C + '$ ?'
    + fig_demi_cercle(XA2, YA2) + choix(OPTIONS_SUR),
    LETTRES + [ORIENTATION, var('d', '10')] + DEMI_VARS, ['0'],
    [TH_CERCLE, 'Ici le diamètre est ' + seg(B, C) + ' : le triangle $' + A + B + C + '$ est '
     + col('\\text{rectangle en }' + A) + '.'])
V36_HORS = variation(
    'Le point $' + A + '$ n\'est pas sur le cercle de diamètre ' + seg(B, C)
    + ' : il est {{if:d<10|à l\'intérieur|à l\'extérieur}} du cercle. Que peut-on dire du triangle $'
    + A + B + C + '$ ?' + fig_demi_cercle(XA2, YA2)
    + choix(['Il n\'est pas rectangle en $' + A + '$', 'Rectangle en $' + A + '$',
             'On ne peut pas savoir']),
    LETTRES + [ORIENTATION, var('j', '0..1'), var('d', 'eval:7 + 6*j')] + DEMI_VARS, ['0'],
    ['Un triangle $' + A + B + C + '$ est rectangle en $' + A + '$ **seulement si** $' + A
     + '$ est sur le cercle de diamètre ' + seg(B, C) + '.',
     'Ici $' + A + '$ n\'est pas sur ce cercle : le triangle $' + A + B + C + '$ '
     + col('\\text{n\'est pas rectangle en }' + A) + '. Son angle en $' + A + '$ est'
     ' {{if:d<10|plus grand|plus petit}} qu\'un angle droit.'])
# v3 : diamètre BC et AB donnés ; A placé à l'échelle (cos B = AB/BC).
XA3 = ev('round(100*(1 + 8*(ab/bc)^2))/100;d')
YA3 = ev('round(100*(3.5 + ' + SENS + '*8*(ab/bc)*sqrt(1 - (ab/bc)^2)))/100;d')
V36_CALCUL = variation(
    SUR_CERCLE + ' ' + donnees((B + C, '{{bc}}'), (A + B, '{{ab}}')) + ' Calcule $' + A + C + '$.'
    + fig_demi_cercle(XA3, YA3) + '\n\n$' + A + C + ' = ?' + CM + '$',
    LETTRES + [ORIENTATION] + triplet(), ['{{ac}}'],
    [TH_CERCLE + ' Ici, le triangle $' + A + B + C + '$ est rectangle en $' + A + '$.',
     'D\'après le **théorème de Pythagore** : $$' + A + C + '^2 = ' + B + C + '^2 - ' + A + B
     + '^2 = {{bc}}^2 - {{ab}}^2 = ' + ev('bc^2-ab^2') + '$$',
     '$$' + A + C + ' = \\sqrt{' + ev('bc^2-ab^2') + '} = ' + col('{{ac}}' + CM) + '$$'],
    T_COND)

S_DEMI = {**S0, 'd': 10, 'th': 60, 'g': 0, 'th2': 60}
MODELES.append(modele(
    '04-triangle-inscrit-demi-cercle', 'Triangle inscrit dans un demi-cercle',
    'Reconnaître un triangle rectangle par son cercle circonscrit : sommet sur le cercle de'
    ' diamètre l\'un des côtés, sommet hors du cercle, puis un côté par Pythagore',
    'Géométrie', 'Triangles', 'Cercle circonscrit', 1, [V36_SUR, V36_HORS, V36_CALCUL],
    [spec('Rectangle en A', 0, S_DEMI, '0', 'correct'),
     spec('Erreur : rectangle en B', 0, S_DEMI, '1', 'incorrect'),
     spec('Erreur : on ne peut pas savoir', 0, S_DEMI, '3', 'incorrect'),
     spec('Hors du cercle : pas rectangle en A', 1, {**S_DEMI, 'j': 1, 'd': 13}, '0', 'correct'),
     spec('Erreur : rectangle en A', 1, {**S_DEMI, 'j': 1, 'd': 13}, '1', 'incorrect'),
     spec('BC = 10, AB = 6 : AC = 8', 2, s_triplet(0, 2), '8', 'correct'),
     spec('Erreur : somme des carrés, 11,7', 2, s_triplet(0, 2), '11{,}7', 'incorrect')],
    delay=60))

# --- 5. 4-037 : centre du cercle circonscrit ------------------------------------------------------

TH_CENTRE = ('Dans un triangle rectangle, le centre du cercle circonscrit est le **milieu de'
             ' l\'hypoténuse**.')
V37_CENTRE = variation(
    RECTANGLE + ' Où est le centre du cercle circonscrit au triangle $' + A + B + C + '$ ?'
    + fig_rectangle('8', '6')
    + choix(['Au milieu de ' + seg(B, C), 'En $' + A + '$', 'Au milieu de ' + seg(A, B),
             'À l\'intérieur du triangle, loin des côtés']),
    LETTRES + [ORIENTATION], ['0'],
    [TH_CENTRE, 'L\'hypoténuse est le côté opposé à l\'angle droit, ' + seg(B, C)
     + ' : le centre est ' + col('\\text{le milieu de }[' + B + C + ']') + '.'])
V37_RAYON = variation(
    RECTANGLE + ' ' + donnees((B + C, '{{bc}}')) + ' Calcule le rayon du cercle circonscrit au'
    ' triangle $' + A + B + C + '$.' + fig_rectangle('8', '6') + '\n\n$r = ?' + CM + '$',
    LETTRES + [ORIENTATION, var('bc', '5..19')], [evd('bc/2')],
    [TH_CENTRE + ' L\'hypoténuse ' + seg(B, C) + ' est donc un **diamètre** du cercle.',
     '$$r = ' + frac(B + C, '2') + ' = ' + frac('{{bc}}', '2') + ' = ' + col(evd('bc/2') + CM)
     + '$$'])
V37_PYTHA = variation(
    RECTANGLE + ' ' + donnees((A + B, '{{ab}}'), (A + C, '{{ac}}')) + ' Calcule le rayon du cercle'
    ' circonscrit au triangle $' + A + B + C + '$.' + fig_rectangle(XB, YC, HT) + '\n\n$r = ?' + CM + '$',
    LETTRES + [ORIENTATION] + triplet(), [evd('bc/2')],
    ['D\'après le **théorème de Pythagore** : $$' + B + C + '^2 = {{ab}}^2 + {{ac}}^2 = '
     + ev('ab^2+ac^2') + ' \\quad\\text{donc}\\quad ' + B + C + ' = {{bc}}' + CM + '$$',
     TH_CENTRE + ' $[' + B + C + ']$ est un diamètre : $$r = ' + frac('{{bc}}', '2') + ' = '
     + col(evd('bc/2') + CM) + '$$'],
    T_COND)

MODELES.append(modele(
    '05-centre-cercle-circonscrit', 'Centre du cercle circonscrit',
    'Le centre du cercle circonscrit à un triangle rectangle est le milieu de l\'hypoténuse :'
    ' le placer, calculer le rayon, puis le rayon après Pythagore',
    'Géométrie', 'Triangles', 'Cercle circonscrit', 2, [V37_CENTRE, V37_RAYON, V37_PYTHA],
    [spec('Milieu de [BC]', 0, S0, '0', 'correct'),
     spec('Erreur : en A', 0, S0, '1', 'incorrect'),
     spec('BC = 13 : r = 6,5', 1, {**S0, 'bc': 13}, '6{,}5', 'correct'),
     spec('Erreur : r = BC = 13 (diamètre)', 1, {**S0, 'bc': 13}, '13', 'incorrect'),
     spec('AB = 6, AC = 8 : r = 5', 2, s_triplet(0, 2), '5', 'correct'),
     spec('Erreur : le diamètre, 10', 2, s_triplet(0, 2), '10', 'incorrect')],
    delay=60))

# --- 6. 4-035 : réciproque et contraposée -------------------------------------------------------
# Propriétés vraies, tirées par p : (si, alors, non si, non alors, réciproque vraie ?, raison).

PROPRIETES = [
    ('un quadrilatère est un carré', 'c\'est un rectangle',
     'un quadrilatère n\'est pas un carré', 'ce n\'est pas un rectangle', False,
     'un rectangle de longueur 5 cm et de largeur 3 cm n\'est pas un carré.'),
    ('un nombre entier se termine par 0', 'il est pair',
     'un nombre entier ne se termine pas par 0', 'il n\'est pas pair', False,
     '12 est pair et ne se termine pas par 0.'),
    ('un triangle est équilatéral', 'il est isocèle',
     'un triangle n\'est pas équilatéral', 'il n\'est pas isocèle', False,
     'un triangle de côtés 5 cm, 5 cm et 3 cm est isocèle sans être équilatéral.'),
    ('un nombre entier est divisible par 6', 'il est divisible par 3',
     'un nombre entier n\'est pas divisible par 6', 'il n\'est pas divisible par 3', False,
     '9 est divisible par 3 mais pas par 6.'),
    ('un quadrilatère est un parallélogramme', 'ses diagonales se coupent en leur milieu',
     'un quadrilatère n\'est pas un parallélogramme',
     'ses diagonales ne se coupent pas en leur milieu', True,
     'c\'est une propriété du cours : un quadrilatère dont les diagonales se coupent en leur'
     ' milieu est un parallélogramme.'),
    ('un triangle $ABC$ est rectangle en $A$', '$BC^2 = AB^2 + AC^2$',
     'un triangle $ABC$ n\'est pas rectangle en $A$', '$BC^2 \\neq AB^2 + AC^2$', True,
     'c\'est la réciproque du théorème de Pythagore.'),
]


def champ(j):
    return selon('p', [pr[j] for pr in PROPRIETES])


SI, ALORS, NON_SI, NON_ALORS = (champ(j) for j in range(4))
RAISON = champ(5)
P_VARS = [var('p', '0..' + str(len(PROPRIETES) - 1)),
          var('rv', selon('p', ['0' if pr[4] else '1' for pr in PROPRIETES]))]


def phrase(si, alors):
    return '« Si ' + si + ', alors ' + alors + '. »'


PROPRIETE = 'On sait que cette propriété est vraie : ' + phrase(SI, ALORS)
RECIPROQUE, CONTRAPOSEE = phrase(ALORS, SI), phrase(NON_ALORS, NON_SI)
INVERSE = phrase(NON_SI, NON_ALORS)
DEF_RECIPROQUE = ('La **réciproque** échange le « si » et le « alors » : ' + RECIPROQUE)
DEF_CONTRAPOSEE = ('La **contraposée** échange le « si » et le « alors » **et** les met à la'
                   ' forme négative : ' + CONTRAPOSEE)

V35_RECIPROQUE = variation(
    PROPRIETE + ' Quelle est sa réciproque ?' + choix([RECIPROQUE, CONTRAPOSEE, INVERSE]),
    P_VARS, ['0'], [DEF_RECIPROQUE])
V35_CONTRAPOSEE = variation(
    PROPRIETE + ' Quelle est sa contraposée ?' + choix([CONTRAPOSEE, RECIPROQUE, INVERSE]),
    P_VARS, ['0'], [DEF_CONTRAPOSEE, 'Les deux parties sont échangées : on ne garde pas l\'ordre'
                    ' de départ.'])
V35_RECIP_VRAIE = variation(
    PROPRIETE + ' Sa réciproque, ' + RECIPROQUE + ', est-elle vraie ?'
    + choix(['Oui', 'Non'], melanger=False),
    P_VARS, ['{{rv}}'],
    ['Une propriété vraie n\'a pas toujours une réciproque vraie : il faut la vérifier.',
     '{{if:rv==0|La réciproque est **vraie** : ' + RAISON + '|La réciproque est **fausse**.'
     ' Contre-exemple : ' + RAISON + '}}'])
V35_CONTRA_VRAIE = variation(
    PROPRIETE + ' Sa contraposée, ' + CONTRAPOSEE + ', est-elle vraie ?'
    + choix(['Oui, toujours', 'Non, jamais', 'Ça dépend de la propriété']),
    P_VARS, ['0'],
    ['La contraposée d\'une propriété vraie est **toujours vraie** : si « ' + NON_ALORS
     + ' » était possible avec « ' + SI + ' », la propriété de départ serait fausse.'])

MODELES.append(modele(
    '06-reciproque-contraposee', 'Réciproque et contraposée',
    'Écrire la réciproque et la contraposée d\'une propriété vraie du collège, puis dire si'
    ' elles sont vraies (contre-exemple)',
    'Géométrie', 'Raisonner', 'Réciproque et contraposée', 1,
    [V35_RECIPROQUE, V35_CONTRAPOSEE, V35_RECIP_VRAIE, V35_CONTRA_VRAIE],
    [spec('Carré : la réciproque', 0, {'p': 0, 'rv': 1}, '0', 'correct'),
     spec('Erreur : la contraposée', 0, {'p': 0, 'rv': 1}, '1', 'incorrect'),
     spec('Pair : la contraposée', 1, {'p': 1, 'rv': 1}, '0', 'correct'),
     spec('Erreur : « si non… alors non… » dans l\'ordre', 1, {'p': 1, 'rv': 1}, '2', 'incorrect'),
     spec('Carré : réciproque fausse', 2, {'p': 0, 'rv': 1}, '1', 'correct'),
     spec('Erreur : réciproque d\'une vraie crue vraie', 2, {'p': 0, 'rv': 1}, '0', 'incorrect'),
     spec('Parallélogramme : réciproque vraie', 2, {'p': 4, 'rv': 0}, '0', 'correct'),
     spec('Contraposée toujours vraie', 3, {'p': 2, 'rv': 1}, '0', 'correct'),
     spec('Erreur : ça dépend', 3, {'p': 2, 'rv': 1}, '2', 'incorrect')],
    delay=60))

# --- 7. 4-075 : formule de l'aire d'un triangle -------------------------------------------------
# Figures fixes ; la base b et la hauteur h sont des lettres écrites sur la figure.


def etiquette_m(x, y, t):
    return 'texte(' + str(x) + ', ' + str(y) + ', "' + t + '")\n'


FIG_AIGU = figure(
    'Triangle ABC, hauteur [AH] perpendiculaire à [BC] ; BC = b, AH = h.',
    'A = point(3.5, 6, etiquette="haut")\nB = point(1, 1, etiquette="bas-gauche")\n'
    'C = point(9, 1, etiquette="bas-droite")\nH = point(3.5, 1, etiquette="bas")\n'
    'segment(A, B)\nsegment(B, C)\nsegment(C, A)\nsegment(A, H, trait="tirets")\n'
    'angle(A, H, C, marque="carre")\n' + etiquette_m(6, 0.4, 'b') + etiquette_m(3.9, 3.5, 'h'),
    fenetre='0 ; 10 ; 0 ; 7')
FIG_OBTUS = figure(
    'Triangle ABC obtus en C, hauteur [AH] à l\'extérieur, H sur le prolongement de [BC] ;'
    ' BC = b, AH = h.',
    'A = point(8.5, 6, etiquette="haut")\nB = point(1, 1, etiquette="bas-gauche")\n'
    'C = point(5.5, 1, etiquette="bas")\nH = point(8.5, 1, etiquette="bas-droite")\n'
    'segment(A, B)\nsegment(B, C)\nsegment(C, A)\nsegment(C, H, trait="tirets")\n'
    'segment(A, H, trait="tirets")\nangle(A, H, B, marque="carre")\n'
    + etiquette_m(3.2, 0.4, 'b') + etiquette_m(8.9, 3.5, 'h'),
    fenetre='0 ; 10 ; 0 ; 7')
FIG_MAISON = figure(
    'Maison : rectangle de côtés a et b surmonté d\'un triangle de base a et de hauteur h.',
    'D = point(2, 1)\nE = point(8, 1)\nF = point(8, 4.5)\nG = point(2, 4.5)\nS = point(5, 7.5)\n'
    'K = point(5, 4.5)\npolygone(D, E, F, G)\nsegment(G, S)\nsegment(S, F)\n'
    'segment(S, K, trait="tirets")\nangle(S, K, F, marque="carre")\n'
    + etiquette_m(5, 0.4, 'a') + etiquette_m(8.5, 2.75, 'b') + etiquette_m(5.4, 6, 'h'),
    fenetre='0 ; 10 ; 0 ; 8.5')
AIRE = '\\dfrac{b\\times h}{2}'
AIRE_EXPLIQUE = ('L\'aire d\'un triangle est la **moitié** de celle du rectangle de côtés $b$ et'
                 ' $h$ : $$\\mathcal{A} = ' + col(AIRE) + '$$')


def formule(fig, extra):
    return variation(
        'Écris l\'aire $\\mathcal{A}$ du triangle $ABC$ en fonction de $b$ et de $h$.' + fig
        + '\n\n$\\mathcal{A} = ?$',
        [], [AIRE], extra + [AIRE_EXPLIQUE])


V75_AIGU = formule(FIG_AIGU, ['$[AH]$ est la **hauteur** issue de $A$ : elle est perpendiculaire'
                              ' à la base $[BC]$.'])
V75_OBTUS = formule(FIG_OBTUS, ['La hauteur issue de $A$ tombe **à l\'extérieur** du triangle,'
                                ' sur le prolongement de $[BC]$ : la formule ne change pas.'])
V75_MAISON = variation(
    'Écris l\'aire $\\mathcal{A}$ de cette maison (rectangle et toit triangulaire) en fonction'
    ' de $a$, $b$ et $h$.' + FIG_MAISON + '\n\n$\\mathcal{A} = ?$',
    [], ['a\\times b+\\dfrac{a\\times h}{2}'],
    ['Aire du rectangle : $a \\times b$. Aire du toit, triangle de base $a$ et de hauteur $h$ :'
     ' $\\dfrac{a\\times h}{2}$.',
     '$$\\mathcal{A} = ' + col('a\\times b+\\dfrac{a\\times h}{2}') + '$$'])
V75_VRAISEMBLABLE = variation(
    'Le triangle $ABC$ a pour base $b$ et pour hauteur $h$. Quelle formule peut donner son aire ?'
    + FIG_AIGU + choix(['$' + AIRE + '$', '$b + h$', '$2 \\times b \\times h$',
                        '$b \\times h \\times h$']),
    [], ['0'],
    ['Une aire est le produit de **deux** longueurs : $b + h$ est une longueur, $b \\times h'
     ' \\times h$ un volume.',
     'Le triangle tient dans le rectangle de côtés $b$ et $h$ : son aire est plus petite que $b'
     ' \\times h$, ce qui écarte $2 \\times b \\times h$.', AIRE_EXPLIQUE])
V75_TESTER = variation(
    'L\'aire d\'un triangle de base $b$ et de hauteur $h$ est $\\mathcal{A} = ' + AIRE + '$.'
    ' Calcule l\'aire pour $b = {{bb}}' + CM + '$ et $h = {{hh}}' + CM + '$.' + FIG_AIGU
    + '\n\n$\\mathcal{A} = ?~\\unit{cm^2}$',
    [var('bb', '3..15'), var('hh', '2..12')], [evd('bb*hh/2')],
    ['On remplace $b$ par {{bb}} et $h$ par {{hh}} : $$\\mathcal{A} = \\dfrac{ {{bb}} \\times'
     ' {{hh}} }{2} = \\dfrac{' + ev('bb*hh') + '}{2} = ' + col(evd('bb*hh/2') + '~\\unit{cm^2}')
     + '$$'])

MODELES.append(modele(
    '07-formule-aire-triangle', 'Formule de l\'aire d\'un triangle',
    'Produire la formule de l\'aire d\'un triangle (b × h ÷ 2) : hauteur intérieure, hauteur'
    ' extérieure, figure composée, formule vraisemblable, puis la tester',
    'Calcul littéral', 'Produire une formule', 'Aires', 1,
    [V75_AIGU, V75_OBTUS, V75_MAISON, V75_VRAISEMBLABLE, V75_TESTER],
    [spec('b × h ÷ 2', 0, {}, '\\dfrac{b\\times h}{2}', 'correct'),
     spec('Autre écriture : bh/2', 0, {}, '\\frac{bh}{2}', 'correct'),
     spec('Autre écriture : 0,5 × b × h', 0, {}, '0{,}5\\times b\\times h', 'correct'),
     spec('Erreur : b × h sans ÷ 2', 0, {}, 'b\\times h', 'incorrect'),
     spec('Obtus : b × h ÷ 2', 1, {}, '\\frac{b\\times h}{2}', 'correct'),
     spec('Maison : ab + ah/2', 2, {}, 'a\\times b+\\frac{a\\times h}{2}', 'correct'),
     spec('Maison : a(b + h/2)', 2, {}, 'a\\left(b+\\frac{h}{2}\\right)', 'correct'),
     spec('Erreur : toit sans ÷ 2', 2, {}, 'a\\times b+a\\times h', 'incorrect'),
     spec('Formule vraisemblable', 3, {}, '0', 'correct'),
     spec('Erreur : b + h', 3, {}, '1', 'incorrect'),
     spec('b = 6, h = 4 : 12', 4, {'bb': 6, 'hh': 4}, '12', 'correct'),
     spec('Erreur : sans ÷ 2, 24', 4, {'bb': 6, 'hh': 4}, '24', 'incorrect')],
    delay=60, options={'constraints': {'form': 'off', 'products': 'off'}}))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

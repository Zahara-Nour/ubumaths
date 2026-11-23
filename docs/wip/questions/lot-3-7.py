"""Écrit les 4 modèles du lot 7 « Algorithmique » de la 3e dans scripts/questions/3-lot-7/.

Phase 0 validée par David le 2026-11-01 (journal `questions-3-progress.md` § 14 et 14.6, un point
par modèle) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-047 | Plusieurs variables | Algorithmique › Variables et instructions › Variables et affectation, 1 |
| 2 | 3-048 | Conditions composées | Algorithmique › Variables et instructions › Instructions conditionnelles, 1 |
| 3 | 3-049 | Boucle « répéter jusqu'à ce que » | Algorithmique › Boucles › Boucle non bornée, 1 |
| 4 | 3-050 | Bloc personnalisé | Algorithmique › Structurer un programme › Bloc personnalisé, 1 |

Le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.
Tous les programmes sont des blocs ` ```scratch ` (chantier `bloc-scratch`, #2122) : pas en prod au
2026-11-01, le lot reste en brouillon jusqu'au `deploy:prod` qui livre le bloc.

Décisions et pièges :
- syntaxe des `scratchblocks` en FRANÇAIS ; un bloc personnalisé doit être défini dans le même bloc
  que son appel (sinon « instruction non reconnue ») ;
- « répéter jusqu'à ce que » : condition testée AVANT chaque passage, arrêt dès qu'elle est vraie
  (sémantique Scratch) ; l'arrêt un tour trop tôt est parmi les erreurs typiques ;
- choix : la bonne réponse écrite en premier (indice 0), le bloc mélange ; un programme en option
  = bloc ```scratch dans un ````choix (clôture à 4 accents graves) ;
- vrai / faux selon le tirage : le texte de chaque option choisi par `{{if}}` (`and` / `or` admis
  dans les conditions) ;
- `%` refusé dans l'`eval` d'une variable : reste écrit `n-d*floor(n/d)` ;
- noms de variables du programme en *italique* hors des formules (`$quantité$` se lit en lettres
  découpées) ; réponse en texte : en **gras**, jamais `\\textcolor` hors de `$…$` ;
- `audit-question-draws` : « gabarit non résolu » sur `<<` = faux positif (syntaxe Scratch
  d'une condition composée).

    python3 docs/wip/questions/lot-3-7.py scripts/questions/3-lot-7
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=90,
           options=None):
    m = {'title': title, 'description': description, 'grades': ['3'], 'theme': theme,
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
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def scratch(lignes):
    return '\n\n```scratch\n' + '\n'.join(lignes) + '\n```'


def choix(options):
    """Options : texte (str) ou programme (list de lignes Scratch)."""
    out = '\n\n````choix\n'
    for o in options:
        if isinstance(o, list):
            out += '- ```scratch\n' + ''.join('  ' + l + '\n' for l in o) + '  ```\n'
        else:
            out += '- ' + o + '\n'
    return out + '````'


DRAPEAU = 'quand le drapeau vert pressé'
MODELES = []

# --- 1. 3-047 : plusieurs variables ------------------------------------------------------------

V_AB = variation(
    'Voici un programme qui utilise deux variables $a$ et $b$.'
    + scratch(['mettre [a v] à ({{n}})', 'mettre [b v] à ({{m}})', 'mettre [a v] à ((a) + (b))',
               'mettre [b v] à ((a) - (b))'])
    + '\n\nQuelles sont les valeurs de $a$ et de $b$ à la fin du programme ?\n\n$a = ?$ et $b = ?$',
    [var('n', '2..20'), var('m', '2..20')], [ev('n+m'), '{{n}}'],
    ['Les instructions s\'exécutent **dans l\'ordre**, et chaque affectation remplace l\'ancienne'
     ' valeur.',
     'Après les deux premières lignes : $a = {{n}}$ et $b = {{m}}$.',
     'Ligne 3 : $a$ prend la valeur $a + b = {{n}} + {{m}} = ' + ev('n+m') + '$.',
     'Ligne 4 : $b$ prend la valeur $a - b$, calculée avec la **nouvelle** valeur de $a$ :'
     ' $' + ev('n+m') + ' - {{m}} = {{n}}$.',
     'À la fin : $' + col('a = ' + ev('n+m')) + '$ et $' + col('b = {{n}}') + '$.'],
    ['n!=m'])

V_PRIX = variation(
    'Un commerçant utilise ce programme pour calculer le prix à payer, frais de port compris.'
    + scratch([DRAPEAU, 'demander [Prix d\'un objet ?] et attendre', 'mettre [prix v] à (réponse)',
               'demander [Nombre d\'objets ?] et attendre', 'mettre [quantité v] à (réponse)',
               'mettre [total v] à ((prix) * (quantité))',
               'mettre [total v] à ((total) + ({{f}}))', 'dire (total)'])
    + '\n\nOn saisit ${{p}}$ puis ${{q}}$. Que dit le programme à la fin ?\n\n$?$',
    [var('p', '2..15'), var('q', '2..9'), var('f', '3..9')], [ev('p*q+f')],
    ['La variable *prix* vaut ${{p}}$ et la variable *quantité* vaut ${{q}}$.',
     '*total* prend d\'abord la valeur *prix* × *quantité* : ${{p}} \\times {{q}} = '
     + ev('p*q') + '$.',
     'Puis *total* prend la valeur *total* + ${{f}}$ : $' + ev('p*q') + ' + {{f}} = ' + ev('p*q+f')
     + '$.',
     'Le programme dit $' + col(ev('p*q+f')) + '$.'],
    ['p!=q'])

ECHANGE_C = ['mettre [c v] à (a)', 'mettre [a v] à (b)', 'mettre [b v] à (c)']
ECHANGE_SANS = ['mettre [a v] à (b)', 'mettre [b v] à (a)']
ECHANGE_ENVERS = ['mettre [c v] à (a)', 'mettre [b v] à (c)', 'mettre [a v] à (b)']
V_ECHANGE = variation(
    'Au départ, la variable $a$ vaut ${{n}}$ et la variable $b$ vaut ${{m}}$. Lequel de ces'
    ' programmes **échange** leurs valeurs (à la fin, $a$ vaut ${{m}}$ et $b$ vaut ${{n}}$) ?'
    + choix([ECHANGE_C, ECHANGE_SANS, ECHANGE_ENVERS]),
    [var('n', '2..20'), var('m', '2..20')], ['0'],
    ['Avec deux affectations seulement (`a` ← `b`, puis `b` ← `a`), l\'ancienne valeur de $a$ est'
     ' **perdue** dès la première ligne : $a$ et $b$ valent tous deux ${{m}}$.',
     'Il faut une troisième variable $c$ pour **garder** l\'ancienne valeur de $a$ :'
     ' $c = {{n}}$, puis $a = {{m}}$, puis $b = c = {{n}}$.',
     'Dans l\'ordre « $c$ ← $a$, $b$ ← $c$, $a$ ← $b$ », $b$ prend ${{n}}$ puis $a$ prend la'
     ' nouvelle valeur de $b$ : les deux valent ${{n}}$.',
     'Le bon programme : ' + '**c ← a, puis a ← b, puis b ← c**' + '.'],
    ['n!=m'])

MODELES.append(modele(
    '01-plusieurs-variables', 'Plusieurs variables',
    'Suivre un programme Scratch à plusieurs variables : valeurs finales après des affectations'
    ' successives, programme de calcul avec saisies, échange de deux variables',
    'Algorithmique', 'Variables et instructions', 'Variables et affectation', 1,
    [V_AB, V_PRIX, V_ECHANGE],
    [spec('n = 5, m = 3 : a = 8, b = 5', 0, {'n': 5, 'm': 3}, ['8', '5'], 'correct'),
     spec('Erreur : b inchangé (b = 3)', 0, {'n': 5, 'm': 3}, ['8', '3'], 'incorrect'),
     spec('Erreur : b calculé avec l\'ancien a (5 − 3 = 2)', 0, {'n': 5, 'm': 3}, ['8', '2'],
          'incorrect'),
     spec('Prix 4, 3 objets, port 6 : 18', 1, {'p': 4, 'q': 3, 'f': 6}, '18', 'correct'),
     spec('Erreur : port oublié (12)', 1, {'p': 4, 'q': 3, 'f': 6}, '12', 'incorrect'),
     spec('Erreur : tout ajouté (13)', 1, {'p': 4, 'q': 3, 'f': 6}, '13', 'incorrect'),
     spec('Échange avec c', 2, {'n': 5, 'm': 3}, '0', 'correct'),
     spec('Erreur : sans variable c', 2, {'n': 5, 'm': 3}, '1', 'incorrect'),
     spec('Erreur : avec c, mais à l\'envers', 2, {'n': 5, 'm': 3}, '2', 'incorrect')]))

# --- 2. 3-048 : conditions composées -----------------------------------------------------------

ET = 'x>p and x<q'
OU = 'x<p or x>q'


def oui_non(cond):
    return ['« {{if:' + cond + '|Oui|Non}} »', '« {{if:' + cond + '|Non|Oui}} »']


V_ET = variation(
    'Que dit ce programme ?'
    + scratch(['mettre [x v] à ({{x}})', 'si <<(x) > [{{p}}]> et <(x) < [{{q}}]>> alors',
               'dire [Oui]', 'sinon', 'dire [Non]', 'fin'])
    + choix(oui_non(ET)),
    [var('p', '2..9'), var('q', 'eval:p+5'), var('dx', '-2..7'), var('x', 'eval:p+dx')], ['0'],
    ['Une condition « … **et** … » est vraie seulement si **les deux** conditions sont vraies.',
     '$x = {{x}}$ : « $x > {{p}}$ » est {{if:x>p|vraie|fausse}} ; « $x < {{q}}$ » est'
     ' {{if:x<q|vraie|fausse}}.',
     'La condition composée est donc {{if:' + ET + '|vraie|fausse}} : le programme dit '
     + '**« {{if:' + ET + '|Oui|Non}} »**' + '.'])

V_OU = variation(
    'Que dit ce programme ?'
    + scratch(['mettre [x v] à ({{x}})', 'si <<(x) < [{{p}}]> ou <(x) > [{{q}}]>> alors',
               'dire [Oui]', 'sinon', 'dire [Non]', 'fin'])
    + choix(oui_non(OU)),
    [var('p', '2..9'), var('q', 'eval:p+5'), var('dx', '-2..7'), var('x', 'eval:p+dx')], ['0'],
    ['Une condition « … **ou** … » est vraie dès qu\'**au moins une** des deux conditions est'
     ' vraie.',
     '$x = {{x}}$ : « $x < {{p}}$ » est {{if:x<p|vraie|fausse}} ; « $x > {{q}}$ » est'
     ' {{if:x>q|vraie|fausse}}.',
     'La condition composée est donc {{if:' + OU + '|vraie|fausse}} : le programme dit '
     + '**« {{if:' + OU + '|Oui|Non}} »**' + '.'])

MANEGE = 'a>A and t>T'
V_MANEGE = variation(
    'Ce programme décide si un enfant peut monter dans un manège.'
    + scratch([DRAPEAU, 'demander [Quel est ton âge ?] et attendre', 'mettre [âge v] à (réponse)',
               'demander [Quelle est ta taille en cm ?] et attendre',
               'mettre [taille v] à (réponse)',
               'si <<(âge) > [{{A}}]> et <(taille) > [{{T}}]>> alors', 'dire [Tu peux monter]',
               'sinon', 'dire [Pas encore]', 'fin'])
    + '\n\nUn enfant saisit ${{a}}$ pour son âge et ${{t}}$ pour sa taille. Que dit le programme ?'
    + choix(['« {{if:' + MANEGE + '|Tu peux monter|Pas encore}} »',
             '« {{if:' + MANEGE + '|Pas encore|Tu peux monter}} »']),
    [var('A', '7..10'), var('T', '120..140'), var('a', '6..13'), var('dt', '-12..12'),
     var('t', 'eval:T+dt')], ['0'],
    ['Il faut **les deux** : âge $> {{A}}$ **et** taille $> {{T}}$.',
     'Âge ${{a}}$ : « ${{a}} > {{A}}$ » est {{if:a>A|vraie|fausse}} ; taille ${{t}}$ :'
     ' « ${{t}} > {{T}}$ » est {{if:t>T|vraie|fausse}}.',
     'Le programme dit ' + '**« {{if:' + MANEGE + '|Tu peux monter|Pas encore}} »**'
     + '.'],
    ['dt!=0'])


def cond(g, op1, op, d, op2):
    return '<<(x) ' + op1 + ' [{{' + g + '}}]> ' + op + ' <(x) ' + op2 + ' [{{' + d + '}}]>>'


V_TRADUIRE = variation(
    'Quelle condition est vraie exactement quand $x$ est **strictement compris** entre ${{p}}$ et'
    ' ${{q}}$ ?'
    + choix([[cond('p', '>', 'et', 'q', '<')], [cond('p', '>', 'ou', 'q', '<')],
             [cond('p', '<', 'et', 'q', '>')], [cond('p', '<', 'ou', 'q', '>')]]),
    [var('p', '2..9'), var('dq', '3..9'), var('q', 'eval:p+dq')], ['0'],
    ['« $x$ est strictement compris entre ${{p}}$ et ${{q}}$ » signifie : $x > {{p}}$ **et**'
     ' $x < {{q}}$ (les deux à la fois).',
     'Avec « ou », $x = ' + ev('q+5') + '$ conviendrait (car $' + ev('q+5') + ' > {{p}}$) :'
     ' la condition serait vraie pour tous les nombres.',
     'La bonne condition : ' + '**(x > {{p}}) et (x < {{q}})**' + '.'])

MODELES.append(modele(
    '02-conditions-composees', 'Conditions composées',
    'Lire une condition composée avec « et » ou « ou » dans un programme Scratch : ce que dit le'
    ' programme selon les valeurs, traduire « strictement compris entre »',
    'Algorithmique', 'Variables et instructions', 'Instructions conditionnelles', 1,
    [V_ET, V_OU, V_MANEGE, V_TRADUIRE],
    [spec('et, x dedans : Oui', 0, {'p': 3, 'q': 8, 'dx': 2, 'x': 5}, '0', 'correct'),
     spec('Erreur : et lu ou (x = 10)', 0, {'p': 3, 'q': 8, 'dx': 7, 'x': 10}, '1', 'incorrect'),
     spec('Erreur : borne incluse (x = 3)', 0, {'p': 3, 'q': 8, 'dx': 0, 'x': 3}, '1', 'incorrect'),
     spec('ou, x dehors : Oui', 1, {'p': 3, 'q': 8, 'dx': 7, 'x': 10}, '0', 'correct'),
     spec('Erreur : ou lu et (x = 10)', 1, {'p': 3, 'q': 8, 'dx': 7, 'x': 10}, '1', 'incorrect'),
     spec('Manège : 12 ans, 130 cm, seuils 8 et 135 → Pas encore', 2,
          {'A': 8, 'T': 135, 'a': 12, 'dt': -5, 't': 130}, '0', 'correct'),
     spec('Erreur : une seule condition suffit', 2,
          {'A': 8, 'T': 135, 'a': 12, 'dt': -5, 't': 130}, '1', 'incorrect'),
     spec('Traduire : (x > p) et (x < q)', 3, {'p': 3, 'dq': 5, 'q': 8}, '0', 'correct'),
     spec('Erreur : ou à la place de et', 3, {'p': 3, 'dq': 5, 'q': 8}, '1', 'incorrect'),
     spec('Erreur : bornes inversées', 3, {'p': 3, 'dq': 5, 'q': 8}, '2', 'incorrect')]))

# --- 3. 3-049 : boucle « répéter jusqu'à ce que » ----------------------------------------------

TEST_AVANT = ('La condition est testée **avant** chaque passage : dès qu\'elle est vraie, la boucle'
              ' s\'arrête.')
RESTE = 'n-d*floor(n/d)'

V_RESTE = variation(
    'Voici un programme (exemple du programme officiel).'
    + scratch([DRAPEAU, 'demander [Quel est le nombre à diviser ?] et attendre',
               'mettre [reste v] à (réponse)', 'demander [Quel est le diviseur ?] et attendre',
               'répéter jusqu\'à ce que <(reste) < (réponse)>',
               'mettre [reste v] à ((reste) - (réponse))', 'fin', 'dire (reste)'])
    + '\n\nOn saisit ${{n}}$ puis ${{d}}$. Que dit le programme à la fin ?\n\n$?$',
    [var('d', '3..9'), var('n', '20..60')], [ev(RESTE)],
    ['La variable *réponse* contient la dernière saisie : le diviseur ${{d}}$. *reste* part de'
     ' ${{n}}$.',
     TEST_AVANT + ' Tant que *reste* $\\geqslant {{d}}$, on lui retire ${{d}}$.',
     '*reste* prend les valeurs ${{n}}$, $' + ev('n-d') + '$, $' + ev('n-2*d') + '$, … ; après $'
     + ev('floor(n/d)') + '$ passages, *reste* $= {{n}} - ' + ev('floor(n/d)') + ' \\times {{d}} = '
     + ev(RESTE) + '$, et $' + ev(RESTE) + ' < {{d}}$ : la boucle s\'arrête.',
     'Le programme dit $' + col(ev(RESTE)) + '$ : c\'est le reste de la division euclidienne de'
     ' ${{n}}$ par ${{d}}$.'],
    ['n>=3*d'])

V_PASSAGES = variation(
    'Combien de fois les instructions de la boucle sont-elles exécutées ?'
    + scratch(['mettre [reste v] à ({{n}})', 'répéter jusqu\'à ce que <(reste) < [{{d}}]>',
               'mettre [reste v] à ((reste) - ({{d}}))', 'fin', 'dire (reste)'])
    + '\n\n$?$ fois',
    [var('d', '3..9'), var('n', '20..60'), var('r', 'eval:' + RESTE)], [ev('floor(n/d)')],
    [TEST_AVANT,
     'Chaque passage retire ${{d}}$ à *reste* ; la boucle s\'arrête quand *reste* $< {{d}}$.',
     '${{n}} = ' + ev('floor(n/d)') + ' \\times {{d}}{{if:r>0| + {{r}}|}}$ : après $'
     + ev('floor(n/d)') + '$ passages, *reste* $= {{r}} < {{d}}$.',
     'La boucle est exécutée $' + col(ev('floor(n/d)')) + '$ fois.'],
    ['n>=3*d', 'floor(n/d)<=12'])

V_COMPTEUR = variation(
    'Que dit ce programme à la fin ?'
    + scratch(['mettre [i v] à (0)', 'répéter jusqu\'à ce que <(i) > [{{s}}]>',
               'ajouter ({{k}}) à [i v]', 'fin', 'dire (i)'])
    + '\n\n$?$',
    [var('k', '2..9'), var('s', '10..60')], [ev('k*(floor(s/k)+1)')],
    [TEST_AVANT,
     '$i$ prend les valeurs $0$, ${{k}}$, $' + ev('2*k') + '$, $' + ev('3*k') + '$, … (les'
     ' multiples de ${{k}}$).',
     'Le plus grand multiple de ${{k}}$ inférieur ou égal à ${{s}}$ est $' + ev('k*floor(s/k)')
     + '$ : « $' + ev('k*floor(s/k)') + ' > {{s}}$ » est fausse, la boucle continue.',
     'Le multiple suivant, $' + ev('k*(floor(s/k)+1)') + '$, est plus grand que ${{s}}$ : la'
     ' boucle s\'arrête. Le programme dit $' + col(ev('k*(floor(s/k)+1)')) + '$.'],
    ['floor(s/k)+1<=12', 'floor(s/k)>=3'])

V_DOUBLE = variation(
    'Que dit ce programme à la fin ?'
    + scratch(['mettre [x v] à (1)', 'répéter jusqu\'à ce que <(x) > [{{s}}]>',
               'mettre [x v] à ((x) * (2))', 'fin', 'dire (x)'])
    + '\n\n$?$',
    [var('t', '4..9'), var('u', '0..9'), var('s', 'eval:2^(t-1)+floor(u*2^(t-1)/10)')],
    [ev('2^t')],
    [TEST_AVANT,
     '$x$ double à chaque passage : $1$, $2$, $4$, $8$, $16$, … (les puissances de $2$).',
     '$' + ev('2^(t-1)') + ' \\leqslant {{s}}$ : la boucle continue ; puis $x = ' + ev('2^t')
     + '$ et $' + ev('2^t') + ' > {{s}}$ : la boucle s\'arrête.',
     'Le programme dit $' + col(ev('2^t')) + '$.'])

MODELES.append(modele(
    '03-boucle-repeter-jusqu-a', 'Boucle « répéter jusqu\'à ce que »',
    'Exécuter à la main une boucle « répéter jusqu\'à ce que » d\'un programme Scratch : reste par'
    ' soustractions successives, nombre de passages, compteur, doublement',
    'Algorithmique', 'Boucles', 'Boucle non bornée', 1,
    [V_RESTE, V_PASSAGES, V_COMPTEUR, V_DOUBLE],
    [spec('47 et 6 : reste 5', 0, {'n': 47, 'd': 6}, '5', 'correct'),
     spec('Erreur : arrêt un tour trop tôt (11)', 0, {'n': 47, 'd': 6}, '11', 'incorrect'),
     spec('Erreur : le nombre de départ (47)', 0, {'n': 47, 'd': 6}, '47', 'incorrect'),
     spec('Erreur : le quotient (7)', 0, {'n': 47, 'd': 6}, '7', 'incorrect'),
     spec('47 et 6 : 7 passages', 1, {'n': 47, 'd': 6, 'r': 5}, '7', 'correct'),
     spec('Erreur : un passage de trop (8)', 1, {'n': 47, 'd': 6, 'r': 5}, '8', 'incorrect'),
     spec('k = 5, s = 23 : 25', 2, {'k': 5, 's': 23}, '25', 'correct'),
     spec('Erreur : arrêt un tour trop tôt (20)', 2, {'k': 5, 's': 23}, '20', 'incorrect'),
     spec('k = 4, s = 20 : 24 (20 n\'est pas > 20)', 2, {'k': 4, 's': 20}, '24', 'correct'),
     spec('Erreur : arrêt à i = s (20)', 2, {'k': 4, 's': 20}, '20', 'incorrect'),
     spec('s = 40 : 64', 3, {'t': 6, 'u': 2, 's': 40}, '64', 'correct'),
     spec('Erreur : arrêt un tour trop tôt (32)', 3, {'t': 6, 'u': 2, 's': 40}, '32',
          'incorrect')]))

# --- 4. 3-050 : bloc personnalisé --------------------------------------------------------------

DEFINIR = ['définir dessine carré (côté)', 'répéter (4) fois', 'avancer de (côté) pas',
           'tourner ↻ de (90) degrés', 'fin', '']
BLOC_EXPLIQUE = ('Le bloc « dessine carré (côté) » est **défini** une fois (en haut) :'
                 ' il trace un carré dont le côté est la valeur donnée entre parenthèses à'
                 ' chaque **appel**.')

V_PLUS_GRAND = variation(
    'Le programme ci-dessous utilise un bloc personnalisé « dessine carré ».'
    + scratch(DEFINIR + [DRAPEAU, 'stylo en position d\'écriture', 'mettre [c v] à ({{a}})',
                         'répéter ({{n}}) fois', 'dessine carré (c)', 'ajouter ({{k}}) à [c v]',
                         'fin'])
    + '\n\nQuelle est la longueur du côté du **plus grand** carré dessiné (en pas) ?\n\n$?$',
    [var('a', '10..40'), var('n', '3..6'), var('k', '5..20')], [ev('a+(n-1)*k')],
    [BLOC_EXPLIQUE,
     'La boucle appelle ${{n}}$ fois le bloc, avec $c = {{a}}$, puis $' + ev('a+k') + '$, $'
     + ev('a+2*k') + '$, … : $c$ augmente de ${{k}}$ **après** chaque carré.',
     'Le dernier carré (le ${{n}}$e) a pour côté ${{a}} + ' + ev('n-1') + ' \\times {{k}} = '
     + ev('a+(n-1)*k') + '$ ; l\'ajout qui suit ne dessine plus rien.',
     'Le plus grand carré a un côté de $' + col(ev('a+(n-1)*k')) + '$ pas.'])

V_NOMBRE = variation(
    'Le programme ci-dessous utilise un bloc personnalisé « dessine carré ».'
    + scratch(DEFINIR + [DRAPEAU, 'stylo en position d\'écriture', 'mettre [c v] à ({{a}})',
                         'répéter jusqu\'à ce que <(c) > [{{s}}]>', 'dessine carré (c)',
                         'ajouter ({{k}}) à [c v]', 'fin'])
    + '\n\nCombien de carrés le programme dessine-t-il ?\n\n$?$',
    [var('a', '10..30'), var('k', '5..15'), var('s', '60..120')],
    [ev('floor((s-a)/k)+1')],
    [BLOC_EXPLIQUE,
     'Les carrés ont pour côtés ${{a}}$, $' + ev('a+k') + '$, $' + ev('a+2*k') + '$, … tant que'
     ' $c \\leqslant {{s}}$ (la condition est testée avant chaque passage).',
     'Le dernier côté dessiné est $' + ev('a+floor((s-a)/k)*k') + ' \\leqslant {{s}}$ ; le'
     ' suivant, $' + ev('a+(floor((s-a)/k)+1)*k') + '$, dépasse ${{s}}$ : la boucle s\'arrête.',
     'De ${{a}}$ à $' + ev('a+floor((s-a)/k)*k') + '$ de ${{k}}$ en ${{k}}$ : $'
     + ev('floor((s-a)/k)') + ' + 1 = ' + col(ev('floor((s-a)/k)+1')) + '$ carrés.'],
    ['floor((s-a)/k)+1>=3', 'floor((s-a)/k)+1<=10'])

V_LONGUEUR = variation(
    'Le programme ci-dessous utilise un bloc personnalisé « dessine carré ».'
    + scratch(DEFINIR + [DRAPEAU, 'stylo en position d\'écriture', 'dessine carré ({{a}})',
                         'dessine carré ({{b}})'])
    + '\n\nQuelle longueur le stylo trace-t-il en tout (en pas) ?\n\n$?$',
    [var('a', '10..60'), var('b', '10..60')], [ev('4*(a+b)')],
    [BLOC_EXPLIQUE,
     'Un appel « dessine carré (côté) » avance $4$ fois de *côté* pas : il trace $4 \\times$ *côté*'
     ' pas.',
     'Premier appel : $4 \\times {{a}} = ' + ev('4*a') + '$ pas ; second appel : $4 \\times {{b}} = '
     + ev('4*b') + '$ pas.',
     'En tout : $' + ev('4*a') + ' + ' + ev('4*b') + ' = ' + col(ev('4*(a+b)')) + '$ pas.'],
    ['a!=b', 'a%10==0 or b%10==0'])

MODELES.append(modele(
    '04-bloc-personnalise', 'Bloc personnalisé',
    'Lire un programme Scratch qui définit et appelle un bloc personnalisé « dessine carré » :'
    ' côté du plus grand carré, nombre de carrés, longueur tracée',
    'Algorithmique', 'Structurer un programme', 'Bloc personnalisé', 1,
    [V_PLUS_GRAND, V_NOMBRE, V_LONGUEUR],
    [spec('a = 20, 4 carrés, +10 : 50', 0, {'a': 20, 'n': 4, 'k': 10}, '50', 'correct'),
     spec('Erreur : le dernier ajout compté (60)', 0, {'a': 20, 'n': 4, 'k': 10}, '60',
          'incorrect'),
     spec('Erreur : le premier carré (20)', 0, {'a': 20, 'n': 4, 'k': 10}, '20', 'incorrect'),
     spec('a = 20, +10, jusqu\'à > 75 : 6 carrés', 1, {'a': 20, 'k': 10, 's': 75}, '6',
          'correct'),
     spec('Erreur : un carré de moins (5)', 1, {'a': 20, 'k': 10, 's': 75}, '5', 'incorrect'),
     spec('Erreur : un carré de trop (7)', 1, {'a': 20, 'k': 10, 's': 75}, '7', 'incorrect'),
     spec('Carrés de 30 et 50 : 320', 2, {'a': 30, 'b': 50}, '320', 'correct'),
     spec('Erreur : les côtés seuls (80)', 2, {'a': 30, 'b': 50}, '80', 'incorrect'),
     spec('Erreur : le premier carré seul (120)', 2, {'a': 30, 'b': 50}, '120', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

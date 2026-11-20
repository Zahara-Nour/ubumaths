"""Écrit les 7 modèles du lot 11a du CM2 (problèmes en une étape) dans scripts/questions/cm2-11a/.

Phase 0 validée par David le 2026-11-18 (§ 17 et 17.1 du journal `docs/archive/wip/questions-cm2-progress.md`,
« je suis tes recos ») : 058 en deux modèles (parties-tout, comparaison additive) ; 061 sans variation en
une étape ; 115 avec une variation chiffrée (le « oui » vient du contexte écrit) ; 116 avec des nombres
propres à chaque variation ; niveaux : parties-tout 25, comparaison 6 et 7, multiplicatifs 14 ; nombre
inconnu, caractérisation, quatrième proportionnelle : 1.

Bornes (`cycle3.json`, exemples de réussite CM2) : entiers jusqu'à 999 999 999, décimaux aux millièmes,
fractions de dénominateur ≤ 60 (l'un multiple de l'autre pour additionner) ; 059 : nombre de parts
seulement si une part vaut un entier ≤ 10 ; 061 : plusieurs étapes (trottinette, 161,25 €) ; 066 :
symboles, deux pesées, schéma en barres (179 billes) ; 116 : linéarité × ou +, jamais le retour à
l'unité, ni tableau, ni coefficient.

Patron : `lot-cm1-6.py` (énoncés, phrases-réponses, corrigés en quatre temps, schémas en barres dans
le corrigé), `lot-cm1-6ter.py` (balance dessinée, plusieurs cases), `lot-cm2-10.py` (case « choix »).

Pièges (relus) : « Espaces dès 4 chiffres » → specs `esp()` ; prix tirés en centimes, écrits à deux
décimales (`euros()`), `zeros: off` ; décimaux à virgule exigée ; fractions `reducedFractions: off` ;
aucune `{{if}}` dans une réponse attendue (indicatrices) ; étiquettes des schémas en texte simple,
grands nombres groupés à la main (`grp()`) ; la case choix répond par l'indice d'origine.

    python3 docs/wip/questions/lot-cm2-11a.py scripts/questions/cm2-11a
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
ENTIERS = {'constraints': {'spacesFromFourDigits': True}}
DECIMAUX = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}
DECIMAUX_FRACTIONS = {'constraints': {'spacesFromFourDigits': True, 'zeros': 'off',
                                      'reducedFractions': 'off'}}
VIRGULE_EXIGEE = {'pattern': 'a:number'}
MODELES = {}

# ---- Gabarits (comme lot-cm1-6.py) ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, options=ENTIERS, delay=120):
    # le rangement (sous-notion du point) et le tag sont posés par la migration (ADR 0035)
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    """`reponses` : attendus (`{{eval:…}}`) ou dicts de case, une par case."""
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def probleme(texte, question, reponse, variables, conditions, etapes):
    return variation(texte + '\n\n' + question, variables, [reponse], etapes, conditions)


def decimal(x):
    return {'expectedAnswer': x, 'requiredForm': VIRGULE_EXIGEE}


def v(x):
    return '${{' + x + '}}$'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return '{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1) + '}}'


def esp(n):
    """Réponse tapée avec les espaces de l'école : 342320 → 342\\,320."""
    return f'{n:,}'.replace(',', '\\,')


def trois(x):
    """Les trois chiffres d'une classe, zéros compris : 7 → « 007 »."""
    return (ev(f'floor(mod(({x}),1000)/100)') + ev(f'floor(mod(({x}),100)/10)')
            + ev(f'mod(({x}),10)'))


def grp(x):
    """Entier de 1 000 à 999 999 en texte simple, groupé : « 245 300 » (étiquette d'un schéma)."""
    return ev(f'floor(({x})/1000)') + ' ' + trois(x)


def grp_m(x):
    """Entier de 1 000 000 à 999 999 999 en texte simple, groupé : « 4 503 120 »."""
    return ev(f'floor(({x})/1000000)') + ' ' + trois(f'floor(({x})/1000)') + ' ' + trois(x)


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », affiché « 7,50 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c):
    return '$' + euros(c) + '~\\unit{€}$'


def euros_txt(c):
    """Prix en texte simple pour un schéma : « 32,25 € »."""
    return (ev(f'floor(({c})/100)') + ',' + ev(f'floor(mod(({c}),100)/10)') + ev(f'mod(({c}),10)')
            + ' €')


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale à virgule."""
    return decimal('{{eval:(' + c + ')/100;d}}')


def prix_var(nom, bornes_euros, bornes_centimes='1..99'):
    """Les trois variables d'un prix : euros `nomE`, centimes `nomC`, total en centimes `nom`."""
    return [var(nom + 'E', bornes_euros), var(nom + 'C', bornes_centimes),
            var(nom, 'eval:100*' + nom + 'E+' + nom + 'C')]


def prix_spec(nom, euros_, centimes):
    return {nom + 'E': euros_, nom + 'C': centimes, nom: 100 * euros_ + centimes}


def schema(lignes):
    """Bloc schéma en barres, collé à la fin d'une étape du corrigé."""
    return '\n\n```schema-barres\n' + '\n'.join(lignes) + '\n```'


def repete(k, etiquette, kmax=9, longueur=None):
    """`k` segments identiques (k de 2 à kmax), séparés par « ; »."""
    seg = etiquette + (' (' + longueur + ')' if longueur else '')
    return seg + ' ; ' + seg + ''.join(
        '{{if:' + k + '>' + str(j - 1) + '| ; ' + seg + '|}}' for j in range(3, kmax + 1))


def choix(lignes):
    """Case « choix » dans l'ordre écrit (l'attendu est l'indice d'origine)."""
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + c + '\n' for c in lignes) + '```'


EURO = '~\\text{€}'  # juste après une case : case de nombre

# =============== 11a-1. CM2-058 : additifs, parties-tout ===============

PT_TOUT = probleme(
    'L\'an dernier, le musée régional a accueilli ' + v('a') + ' visiteurs, et le parc'
    ' naturel ' + v('b') + ' visiteurs.',
    'Combien de visiteurs les deux sites ont-ils accueillis en tout ?\n\nIls ont accueilli $?$'
    ' visiteurs.',
    ev('a+b'), [var('a', '1200000..480000000'), var('b', '1500000..480000000')],
    ['a + b <= 999999999'],
    ['Chaque site est une **partie** ; on cherche **le tout** : on ajoute les parties, classe par'
     ' classe (unités, milliers, millions).'
     + schema(['Visiteurs : ' + grp_m('a') + ' (4) ; ' + grp_m('b') + ' (4) = ?']),
     '$${{a}} + {{b}} = ' + col(ev('a+b')) + '$$',
     'Les deux sites ont accueilli $' + ev('a+b') + '$ visiteurs en tout.',
     'Le tout est plus grand que chaque partie : $' + ev('a+b') + '$ est plus grand que ' + v('a')
     + ' et que ' + v('b') + '. C\'est vraisemblable.'])

# masses tirées en grammes (millièmes de kg)
PT_PARTIE = probleme(
    'Un colis pèse $' + evd('T/1000') + '~\\unit{kg}$. Il contient un livre de $'
    + evd('a/1000') + '~\\unit{kg}$ et un jeu.',
    'Combien pèse le jeu ?\n\nLe jeu pèse $?~\\text{kg}$.',
    decimal(evd('(T-a)/1000')), [var('T', '1500..9800'), var('a', '205..4800')],
    ['T - a >= 300', 'mod(T,10) != 0', 'mod(a,10) != 0', 'mod(T-a,10) != 0'],
    ['Le colis entier, c\'est **le tout** ; le livre est une partie, on cherche l\'autre partie :'
     ' on enlève, en alignant les virgules (millièmes sous millièmes).',
     '$$' + evd('T/1000') + ' - ' + evd('a/1000') + ' = ' + col(evd('(T-a)/1000')) + '$$',
     'Le jeu pèse $' + evd('(T-a)/1000') + '~\\unit{kg}$.',
     'On vérifie en remettant les deux parties ensemble : $' + evd('a/1000') + ' + '
     + evd('(T-a)/1000') + ' = ' + evd('T/1000') + '$, on retrouve bien le colis.'])

# BO (Côme) : « il lui reste » alors qu'il faut ajouter
PT_DEPART = probleme(
    'Ce matin, Côme avait de l\'argent dans son porte-monnaie. Il a dépensé ' + prix('a')
    + ' au marché ; il lui reste ' + prix('b') + '.',
    'Combien d\'argent Côme avait-il ce matin ?\n\nIl avait $?' + EURO + '$.',
    en_euros('a+b'), prix_var('a', '12..58') + prix_var('b', '6..39'), ['aC + bC != 100'],
    ['L\'argent du matin, c\'est **le tout** : ce qu\'il a dépensé et ce qui lui reste. « Il lui'
     ' reste » ne veut pas dire qu\'on enlève : on cherche le tout, on ajoute.'
     + schema(['Ce matin : ? (8)', 'Dépensé, reste : ' + euros_txt('a') + ' (5) ; '
               + euros_txt('b') + ' (3)']),
     '$$' + euros('a') + ' + ' + euros('b') + ' = ' + col(euros('a+b')) + '$$',
     'Côme avait ' + prix('a+b') + ' ce matin.',
     'On vérifie : $' + euros('a+b') + ' - ' + euros('a') + ' = ' + euros('b') + '$ ; après le'
     ' marché, il lui reste bien ' + prix('b') + '.'])

# a/d + b/D, D = q × d ≤ 60 : on écrit a/d en D-ièmes
LU = fr(ev('a*q+b'), ev('q*d'))
PT_FRACTIONS = probleme(
    'Lina lit un roman. Samedi, elle en lit $' + fr('{{a}}', '{{d}}') + '$ ; dimanche, elle en'
    ' lit $' + fr('{{b}}', ev('q*d')) + '$.',
    'Quelle fraction du roman Lina a-t-elle lue pendant le week-end ?\n\nElle en a lu $?$.',
    LU, [var('d', '2..12'), var('q', '2..5'), var('a', '1..{{eval:d-1}}'),
         var('b', '1..{{eval:q*d-1}}')],
    ['q * d <= 60', 'a * q + b < q * d', 'mod(b,q) != 0'],
    ['Samedi et dimanche sont les deux **parties** ; on cherche **le tout** : on ajoute. Les'
     ' parts ne sont pas de la même taille : on écrit d\'abord $' + fr('{{a}}', '{{d}}')
     + '$ avec le dénominateur $' + ev('q*d') + '$ (chaque part coupée en ' + v('q') + ').',
     '$$' + fr('{{a}}', '{{d}}') + ' = ' + fr(ev('a*q'), ev('q*d')) + '$$',
     '$$' + fr(ev('a*q'), ev('q*d')) + ' + ' + fr('{{b}}', ev('q*d')) + ' = ' + col(LU) + '$$',
     'Lina a lu $' + LU + '$ du roman pendant le week-end.',
     'C\'est moins que le roman entier, $' + fr(ev('q*d'), ev('q*d')) + '$ : il lui reste des'
     ' pages à lire, c\'est vraisemblable.'])

FR_EX = {'d': 4, 'q': 2, 'a': 1, 'b': 3}       # 1/4 + 3/8 = 5/8
FR_EX2 = {'d': 6, 'q': 3, 'a': 1, 'b': 5}      # 1/6 + 5/18 = 8/18
MODELES['01-problemes-additifs-parties-tout'] = modele(
    'Problèmes additifs : parties-tout',
    'Le tout avec des entiers jusqu\'au milliard, une partie avec des millièmes (un colis de'
    ' 3,275 kg), l\'état de départ (« il a dépensé…, il lui reste… »), des fractions dont l\'un des'
    ' dénominateurs est multiple de l\'autre (1/4 + 3/8) ; une étape', 25,
    [PT_TOUT, PT_PARTIE, PT_DEPART, PT_FRACTIONS],
    [spec('tout : 4 503 120 + 12 786 400 = 17 289 520', 0, {'a': 4503120, 'b': 12786400},
          esp(17289520), 'correct'),
     spec('Erreur : tout, soustraction (8 283 280)', 0, {'a': 4503120, 'b': 12786400},
          esp(8283280), 'incorrect'),
     spec('Erreur : tout, retenue des millions oubliée (16 289 520)', 0,
          {'a': 4503120, 'b': 12786400}, esp(16289520), 'incorrect'),
     spec('Forme : sans les espaces', 0, {'a': 4503120, 'b': 12786400}, '17289520',
          'unoptimal_form', ['spaces']),
     spec('partie : 3,275 − 1,482 = 1,793 kg', 1, {'T': 3275, 'a': 1482}, '1,793', 'correct'),
     spec('Erreur : partie, les deux ajoutés (4,757)', 1, {'T': 3275, 'a': 1482}, '4,757',
          'incorrect'),
     spec('Erreur : partie, le petit chiffre ôté du grand (2,213)', 1, {'T': 3275, 'a': 1482},
          '2,213', 'incorrect'),
     spec('Forme : 1793/1000', 1, {'T': 3275, 'a': 1482}, '\\frac{1793}{1000}', 'bad_form',
          ['form']),
     spec('départ : 23,45 + 17,80 = 41,25 €', 2, {**prix_spec('a', 23, 45), **prix_spec('b', 17, 80)},
          '41,25', 'correct'),
     spec('Erreur : départ, « il reste » lu soustraction (5,65 €)', 2,
          {**prix_spec('a', 23, 45), **prix_spec('b', 17, 80)}, '5,65', 'incorrect'),
     spec('Erreur : départ, retenue des centimes oubliée (40,25 €)', 2,
          {**prix_spec('a', 23, 45), **prix_spec('b', 17, 80)}, '40,25', 'incorrect'),
     spec('fractions : 1/4 + 3/8 = 5/8', 3, FR_EX, '\\frac{5}{8}', 'correct'),
     spec('Erreur : fractions, numérateurs et dénominateurs ajoutés (4/12)', 3, FR_EX,
          '\\frac{4}{12}', 'incorrect'),
     spec('Erreur : fractions, 1/4 lu 1/8 (4/8)', 3, FR_EX, '\\frac{4}{8}', 'incorrect'),
     spec('fractions : 1/6 + 5/18 = 8/18', 3, FR_EX2, '\\frac{8}{18}', 'correct'),
     spec('fractions : 4/9, fraction égale à 8/18', 3, FR_EX2, '\\frac{4}{9}', 'correct')],
    options=DECIMAUX_FRACTIONS)

# =============== 11a-2. CM2-058 : comparaison additive ===============

CMP_PLUS_GRAND = probleme(
    'L\'an dernier, une usine a fabriqué ' + v('a') + ' bouteilles. Cette année, elle en a'
    ' fabriqué ' + v('d') + ' de plus.',
    'Combien de bouteilles l\'usine a-t-elle fabriquées cette année ?\n\nElle en a fabriqué $?$.',
    ev('a+d'), [var('a', '1200000..8500000'), var('d', '15000..900000')], [],
    ['Cette année, l\'usine en a fabriqué autant que l\'an dernier, et encore ' + v('d')
     + ' de plus : on ajoute l\'écart.'
     + schema(['L\'an dernier : ' + grp_m('a') + ' (6)', 'Cette année : ' + grp_m('a') + ' (6) ; '
               + grp('d') + ' (2) = ?']),
     '$${{a}} + {{d}} = ' + col(ev('a+d')) + '$$',
     'L\'usine a fabriqué $' + ev('a+d') + '$ bouteilles cette année.',
     'C\'est plus que l\'an dernier, et $' + ev('a+d') + ' - {{a}} = {{d}}$.'])

CMP_ECART = probleme(
    'La ville d\'Arlan compte ' + v('f') + ' habitants ; la ville de Bério en compte ' + v('g')
    + '.',
    'Combien d\'habitants Arlan compte-t-elle de plus que Bério ?\n\nArlan en compte $?$ de plus.',
    ev('f-g'), [var('f', '1100000..9800000'), var('g', '1000000..9700000')],
    ['f - g >= 12000', 'f - g <= 900000'],
    ['On cherche **l\'écart** : ce qu\'il faut ajouter à ' + v('g') + ' pour arriver à ' + v('f')
     + '. C\'est une soustraction, même si la question dit « de plus ».'
     + schema(['Bério : ' + grp_m('g') + ' (6)', 'Arlan : ' + grp_m('g') + ' (6) ; ? (2) = '
               + grp_m('f')]),
     '$${{f}} - {{g}} = ' + col(ev('f-g')) + '$$',
     'Arlan compte $' + ev('f-g') + '$ habitants de plus que Bério.',
     'On vérifie : ${{g}} + ' + ev('f-g') + ' = {{f}}$.'])

# piège : « de plus » qui demande une soustraction
CMP_PLUS_PETIT = probleme(
    'Le département du Valmont compte ' + v('a') + ' habitants. Il en compte ' + v('d')
    + ' de plus que le département du Sorbier.',
    'Combien d\'habitants le département du Sorbier compte-t-il ?\n\nLe Sorbier compte $?$'
    ' habitants.',
    ev('a-d'), [var('a', '520000..2600000'), var('d', '12000..300000')], ['a - d >= 400000'],
    ['Le Valmont a plus d\'habitants : c\'est le Sorbier qui en a ' + v('d') + ' de **moins**.'
     ' On enlève l\'écart, même si l\'énoncé dit « de plus ».',
     '$${{a}} - {{d}} = ' + col(ev('a-d')) + '$$',
     'Le département du Sorbier compte $' + ev('a-d') + '$ habitants.',
     'On vérifie : $' + ev('a-d') + ' + {{d}} = {{a}}$ ; le Valmont en a bien ' + v('d')
     + ' de plus.'])

# deux unités : kg et g ; masses en grammes
CMP_DEUX_UNITES = probleme(
    'Le sac de Nina pèse $' + evd('A/1000') + '~\\unit{kg}$. Il pèse ${{d}}~\\unit{g}$ de plus'
    ' que le sac de Yanis.',
    'Combien pèse le sac de Yanis ?\n\nIl pèse $?~\\text{kg}$.',
    decimal(evd('(A-d)/1000')), [var('A', '1250..4800'), var('d', '35..480')],
    ['mod(A,10) != 0', 'mod(A-d,10) != 0'],
    ['Le sac de Nina est le plus lourd : celui de Yanis pèse ${{d}}~\\unit{g}$ de **moins**. On'
     ' enlève l\'écart, après avoir tout écrit dans la **même unité** : ${{d}}~\\unit{g} = '
     + evd('d/1000') + '~\\unit{kg}$.',
     '$$' + evd('A/1000') + ' - ' + evd('d/1000') + ' = ' + col(evd('(A-d)/1000')) + '$$',
     'Le sac de Yanis pèse $' + evd('(A-d)/1000') + '~\\unit{kg}$.',
     'Les deux sacs ont des masses proches, à quelques centaines de grammes près : c\'est'
     ' vraisemblable.'])

MODELES['02-problemes-de-comparaison-additive'] = modele(
    'Problèmes de comparaison additive',
    'Le plus grand, l\'écart (« combien de plus ? »), le plus petit quand l\'énoncé dit « de'
    ' plus », avec des nombres de sept chiffres ; deux unités (2,345 kg, 85 g de plus) ; une étape',
    6, [CMP_PLUS_GRAND, CMP_ECART, CMP_PLUS_PETIT, CMP_DEUX_UNITES],
    [spec('plus grand : 3 450 200 + 125 600 = 3 575 800', 0, {'a': 3450200, 'd': 125600},
          esp(3575800), 'correct'),
     spec('Erreur : plus grand, l\'écart enlevé (3 324 600)', 0, {'a': 3450200, 'd': 125600},
          esp(3324600), 'incorrect'),
     spec('écart : 4 215 300 − 3 987 450 = 227 850', 1, {'f': 4215300, 'g': 3987450},
          esp(227850), 'correct'),
     spec('Erreur : écart, « de plus » lu addition (8 202 750)', 1, {'f': 4215300, 'g': 3987450},
          esp(8202750), 'incorrect'),
     spec('Erreur : écart, soustraction chiffre à chiffre (1 772 150)', 1,
          {'f': 4215300, 'g': 3987450}, esp(1772150), 'incorrect'),
     spec('plus petit : 1 248 500 − 86 250 = 1 162 250', 2, {'a': 1248500, 'd': 86250},
          esp(1162250), 'correct'),
     spec('Erreur : plus petit, « de plus » lu addition (1 334 750)', 2,
          {'a': 1248500, 'd': 86250}, esp(1334750), 'incorrect'),
     spec('deux unités : 2,345 kg − 87 g = 2,258 kg', 3, {'A': 2345, 'd': 87}, '2,258',
          'correct'),
     spec('Erreur : deux unités, 87 g lu 0,87 kg (1,475)', 3, {'A': 2345, 'd': 87}, '1,475',
          'incorrect'),
     spec('Erreur : deux unités, écart ajouté (2,432)', 3, {'A': 2345, 'd': 87}, '2,432',
          'incorrect')])

# =============== 11a-3. CM2-059 : multiplicatifs parties-tout ===============

MU_TOUT = probleme(
    'Un club de football achète ' + v('g') + ' maillots à ' + prix('p') + ' l\'un.',
    'Combien le club paie-t-il en tout ?\n\nIl paie $?' + EURO + '$.',
    en_euros('g*p'), [var('g', '3..9')] + prix_var('p', '8..45', '5..95'), ['mod(pC,10) != 0'],
    [v('g') + ' maillots à ' + prix('p') + ', c\'est ' + v('g') + ' fois ' + prix('p')
     + ' : on multiplie (multiplication posée d\'un décimal par un entier).',
     '$${{g}} \\times ' + euros('p') + ' = ' + col(euros('g*p')) + '$$',
     'Le club paie ' + prix('g*p') + ' en tout.',
     'Ordre de grandeur : ${{g}} \\times ' + ev('floor(p/100+0.5)') + ' = '
     + ev('g*floor(p/100+0.5)') + '$ ; le résultat en est proche, il est vraisemblable.'])

# BO : six dictionnaires, 73,20 €
MU_PART = probleme(
    'La maîtresse a acheté ' + v('g') + ' dictionnaires identiques pour la classe. Elle a payé '
    + prix('g*p') + '.',
    'Quel est le prix d\'un dictionnaire ?\n\nUn dictionnaire coûte $?' + EURO + '$.',
    en_euros('p'), [var('g', '2..9')] + prix_var('p', '8..24', '5..95'),
    ['mod(pC,5) == 0', 'g * p <= 99999'],
    ['On partage ' + prix('g*p') + ' en ' + v('g') + ' parts égales : on divise (division'
     ' décimale posée, par un nombre à un chiffre).',
     '$$' + euros('g*p') + ' \\div {{g}} = ' + col(euros('p')) + '$$',
     'Un dictionnaire coûte ' + prix('p') + '.',
     'On vérifie : ${{g}} \\times ' + euros('p') + ' = ' + euros('g*p') + '$, on retrouve ce que'
     ' la maîtresse a payé.'])

# BO : 2 611 € à 7 € ; une part entière ≤ 10
MU_PARTS = probleme(
    'À la fête du village, monsieur Dupin vend des sandwichs avec une boisson, à ${{q}}~\\unit{€}$'
    ' l\'ensemble. À la fin de la journée, sa recette est de $' + ev('q*n') + '~\\unit{€}$.',
    'Combien de sandwichs monsieur Dupin a-t-il vendus ?\n\nIl en a vendu $?$.',
    ev('n'), [var('q', '3..10'), var('n', '120..1400')], ['q * n >= 1000', 'q * n <= 12000'],
    ['On cherche combien de fois il y a ${{q}}~\\unit{€}$ dans $' + ev('q*n') + '~\\unit{€}$ :'
     ' on divise.',
     '$$' + ev('q*n') + ' \\div {{q}} = ' + col('{{n}}') + '$$',
     'Monsieur Dupin a vendu ' + v('n') + ' sandwichs.',
     'On vérifie : ${{n}} \\times {{q}} = ' + ev('q*n') + '$, on retrouve la recette.'])

MODELES['03-problemes-multiplicatifs-le-tout-une-part'] = modele(
    'Problèmes multiplicatifs : le tout, une part',
    'Le tout (7 maillots à 18,45 €), la valeur d\'une part (6 dictionnaires pour 73,20 €), le'
    ' nombre de parts quand une part vaut un entier jusqu\'à 10 (2 611 € à 7 €) ; une étape', 14,
    [MU_TOUT, MU_PART, MU_PARTS],
    [spec('tout : 7 × 18,45 = 129,15 €', 0, {'g': 7, **prix_spec('p', 18, 45)}, '129,15',
          'correct'),
     spec('Erreur : tout, 7 + 18,45 (25,45)', 0, {'g': 7, **prix_spec('p', 18, 45)}, '25,45',
          'incorrect'),
     spec('Erreur : tout, virgule mal placée (1 291,5)', 0, {'g': 7, **prix_spec('p', 18, 45)},
          esp(1291) + ',5', 'incorrect'),
     spec('part : 73,20 ÷ 6 = 12,20 €', 1, {'g': 6, **prix_spec('p', 12, 20)}, '12,2', 'correct'),
     spec('Zéro final accepté : 12,20 €', 1, {'g': 6, **prix_spec('p', 12, 20)}, '12,20',
          'correct'),
     spec('Erreur : part, le zéro du quotient oublié (12,2 lu 1,22)', 1,
          {'g': 6, **prix_spec('p', 12, 20)}, '1,22', 'incorrect'),
     spec('Erreur : part, 73,20 − 6 (67,20)', 1, {'g': 6, **prix_spec('p', 12, 20)}, '67,2',
          'incorrect'),
     spec('parts : 2 611 ÷ 7 = 373', 2, {'q': 7, 'n': 373}, '373', 'correct'),
     spec('Erreur : parts, 2 611 × 7 (18 277)', 2, {'q': 7, 'n': 373}, esp(18277), 'incorrect'),
     spec('Erreur : parts, 2 611 − 7 (2 604)', 2, {'q': 7, 'n': 373}, esp(2604), 'incorrect')],
    options=DECIMAUX)

# =============== 11a-4. CM2-061 : comparaison multiplicative en deux étapes ===============

FOIS = selon('k', ['deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'], 2)

# BO : trottinette quatre fois plus chère que le casque, 161,25 € en tout ; c = prix du casque
FM_TOTAL_GRAND = probleme(
    'Axel achète une trottinette et un casque. La trottinette coûte ' + FOIS + ' fois plus cher'
    ' que le casque. Axel paie ' + prix('(k+1)*c') + ' en tout.',
    'Combien coûte la trottinette ?\n\nLa trottinette coûte $?' + EURO + '$.',
    en_euros('k*c'), [var('k', '2..9')] + prix_var('c', '12..49', '5..95'),
    ['mod(cC,5) == 0', '(k + 1) * c <= 99999'],
    ['Le casque, c\'est **une part** ; la trottinette en fait ' + v('k') + '. En tout, cela fait $'
     + ev('k+1') + '$ parts égales, pour ' + prix('(k+1)*c') + '.'
     + schema(['Casque : ? (2)', 'Trottinette : ' + repete('k', '?', longueur='2'),
               'total : ' + euros_txt('(k+1)*c')]),
     '**Une part (le casque).** $' + euros('(k+1)*c') + ' \\div ' + ev('k+1') + ' = '
     + euros('c') + '$',
     '**La trottinette.** ${{k}} \\times ' + euros('c') + ' = ' + col(euros('k*c')) + '$',
     'La trottinette coûte ' + prix('k*c') + '.',
     'On vérifie : $' + euros('c') + ' + ' + euros('k*c') + ' = ' + euros('(k+1)*c') + '$, et $'
     + euros('k*c') + '$ est bien ' + v('k') + ' fois ' + prix('c') + '.'])

# l'écart connu : (k − 1) parts
FM_ECART = probleme(
    'La ville de Mirande compte ' + FOIS + ' fois plus d\'habitants que le village de Lerne.'
    ' Elle en compte $' + ev('(k-1)*c') + '$ de plus.',
    'Combien d\'habitants le village de Lerne compte-t-il ?\n\nLerne compte $?$ habitants.',
    ev('c'), [var('k', '2..9'), var('c', '1200..60000')], ['(k - 1) * c <= 480000'],
    ['Lerne, c\'est **une part** ; Mirande en fait ' + v('k') + '. L\'écart entre les deux, c\'est $'
     + ev('k-1') + '$ parts égales.'
     + schema(['Lerne : ? (2)', 'Mirande : ' + repete('k', '?', longueur='2')]),
     '$$' + ev('(k-1)*c') + ' \\div ' + ev('k-1') + ' = ' + col('{{c}}') + '$$',
     'Le village de Lerne compte ' + v('c') + ' habitants.',
     'On vérifie : Mirande compte ${{k}} \\times {{c}} = ' + ev('k*c') + '$ habitants, et $'
     + ev('k*c') + ' - {{c}} = ' + ev('(k-1)*c') + '$.'])

# « fois moins », le total connu, chercher le plus petit ; c = prix de la sonnette
FM_TOTAL_PETIT = probleme(
    'Un vélo et une sonnette coûtent ' + prix('(k+1)*c') + ' ensemble. La sonnette coûte ' + FOIS
    + ' fois moins cher que le vélo.',
    'Combien coûte la sonnette ?\n\nLa sonnette coûte $?' + EURO + '$.',
    en_euros('c'), [var('k', '2..9')] + prix_var('c', '4..24', '5..95'),
    ['mod(cC,5) == 0', 'k * c >= 5000'],
    ['« ' + v('k') + ' fois moins cher » : le vélo coûte ' + v('k') + ' fois le prix de la'
     ' sonnette. La sonnette, c\'est **une part** ; en tout, $' + ev('k+1') + '$ parts égales.',
     '$$' + euros('(k+1)*c') + ' \\div ' + ev('k+1') + ' = ' + col(euros('c')) + '$$',
     'La sonnette coûte ' + prix('c') + '.',
     'On vérifie : le vélo coûte ${{k}} \\times ' + euros('c') + ' = ' + euros('k*c') + '$, et $'
     + euros('k*c') + ' + ' + euros('c') + ' = ' + euros('(k+1)*c') + '$.'])

# « fois plus » puis « de plus »
FM_PUIS_PLUS = probleme(
    'Léa a ' + v('a') + ' billes. Tom en a ' + FOIS + ' fois plus que Léa. Inès en a ' + v('d')
    + ' de plus que Tom.',
    'Combien de billes Inès a-t-elle ?\n\nInès a $?$ billes.',
    ev('k*a+d'), [var('k', '2..9'), var('a', '12..95'), var('d', '3..40')], ['d != a'],
    ['Deux étapes : d\'abord les billes de Tom (« fois plus » : on multiplie), puis celles'
     ' d\'Inès (« de plus » : on ajoute).',
     '**Tom.** ${{k}} \\times {{a}} = ' + ev('k*a') + '$',
     '**Inès.** $' + ev('k*a') + ' + {{d}} = ' + col(ev('k*a+d')) + '$',
     'Inès a $' + ev('k*a+d') + '$ billes.',
     'Inès en a un peu plus que Tom, et bien plus que Léa : c\'est cohérent.'])

MODELES['04-comparaison-multiplicative-en-deux-etapes'] = modele(
    'Comparaison multiplicative en deux étapes',
    '« k fois plus », « k fois moins » avec le total connu (une trottinette 4 fois plus chère que'
    ' le casque, 161,25 € en tout) ou l\'écart connu ; « fois plus » puis « de plus » ; schéma en'
    ' barres dans le corrigé', 7,
    [FM_TOTAL_GRAND, FM_ECART, FM_TOTAL_PETIT, FM_PUIS_PLUS],
    [spec('trottinette : 161,25 ÷ 5 × 4 = 129 €', 0, {'k': 4, **prix_spec('c', 32, 25)}, '129',
          'correct'),
     spec('Erreur : trottinette, le prix du casque (32,25)', 0, {'k': 4, **prix_spec('c', 32, 25)},
          '32,25', 'incorrect'),
     spec('Erreur : trottinette, 161,25 ÷ 4 (40,31)', 0, {'k': 4, **prix_spec('c', 32, 25)},
          '40,31', 'incorrect'),
     spec('Erreur : trottinette, 4 × 161,25 (645)', 0, {'k': 4, **prix_spec('c', 32, 25)},
          '645', 'incorrect'),
     spec('écart : 5 fois plus, 18 000 de plus → 4 500', 1, {'k': 5, 'c': 4500}, esp(4500),
          'correct'),
     spec('Erreur : écart, 18 000 ÷ 5 (3 600)', 1, {'k': 5, 'c': 4500}, esp(3600), 'incorrect'),
     spec('Erreur : écart, la ville (22 500)', 1, {'k': 5, 'c': 4500}, esp(22500), 'incorrect'),
     spec('sonnette : 3 fois moins, 86,40 € → 21,60 €', 2, {'k': 3, **prix_spec('c', 21, 60)},
          '21,6', 'correct'),
     spec('Erreur : sonnette, 86,40 ÷ 3 (28,80)', 2, {'k': 3, **prix_spec('c', 21, 60)}, '28,8',
          'incorrect'),
     spec('Erreur : sonnette, le vélo (64,80)', 2, {'k': 3, **prix_spec('c', 21, 60)}, '64,8',
          'incorrect'),
     spec('billes : 3 × 24 + 5 = 77', 3, {'k': 3, 'a': 24, 'd': 5}, '77', 'correct'),
     spec('Erreur : billes, Tom seulement (72)', 3, {'k': 3, 'a': 24, 'd': 5}, '72', 'incorrect'),
     spec('Erreur : billes, 3 × (24 + 5) (87)', 3, {'k': 3, 'a': 24, 'd': 5}, '87', 'incorrect'),
     spec('Erreur : billes, « fois plus » lu « de plus » (32)', 3, {'k': 3, 'a': 24, 'd': 5}, '32',
          'incorrect')],
    options=DECIMAUX)

# =============== 11a-5. CM2-066 : problèmes algébriques ===============


def boite(nom, x1, x2, etiquette):
    """Une masse marquée posée sur le fléau (y de 1,3 à 2,2), son étiquette au centre."""
    centre = round((x1 + x2) / 2, 2)
    return [
        f'{nom}1 = point({x1}, 1.3, visible=faux)',
        f'{nom}2 = point({x2}, 1.3, visible=faux)',
        f'{nom}3 = point({x2}, 2.2, visible=faux)',
        f'{nom}4 = point({x1}, 2.2, visible=faux)',
        f'{nom}P = polygone({nom}1, {nom}2, {nom}3, {nom}4, couleur="noir", remplissage="jaune",'
        ' opacite_fond=0.3)',
        f'texte({centre}, 1.75, "{etiquette}")',
    ]


def balance(description, gauche, droite):
    """Balance à l'équilibre (comme `lot-cm1-6ter.py`), boîtes étiquetées sur chaque plateau."""
    lignes = [
        '```figure',
        'fenetre: 0 ; 9 ; -0.4 ; 2.6',
        'description: ' + description,
        '---',
        'B1 = point(3.95, 0, visible=faux)',
        'B2 = point(5.05, 0, visible=faux)',
        'B3 = point(4.5, 1.15, visible=faux)',
        'BP = polygone(B1, B2, B3, couleur="noir", remplissage="gris", opacite_fond=1)',
        'F1 = point(0.3, 1.2, visible=faux)',
        'F2 = point(8.7, 1.2, visible=faux)',
        'segment(F1, F2, epaisseur=4)',
    ]
    for nom, x1, x2, etiquette in gauche + droite:
        lignes += boite(nom, x1, x2, etiquette)
    lignes.append('```')
    return '\n'.join(lignes)


# 2 C + 1 K = w1 ; 1 C + 1 K = w2 (C : une paire de ciseaux, K : un crayon)
BAL1 = balance('Première pesée : à gauche deux paires de ciseaux C et un crayon K, à droite une '
               'masse de {{eval:2*c+k}} g.',
               [('A', 0.4, 1.4, 'C'), ('B', 1.6, 2.6, 'C'), ('K', 2.8, 3.8, 'K')],
               [('D', 5.3, 7.7, '{{eval:2*c+k}} g')])
BAL2 = balance('Deuxième pesée : à gauche une paire de ciseaux C et un crayon K, à droite une '
               'masse de {{eval:c+k}} g.',
               [('A', 1.6, 2.6, 'C'), ('K', 2.8, 3.8, 'K')],
               [('D', 5.3, 7.7, '{{eval:c+k}} g')])
AL_BALANCES = variation(
    'Les paires de ciseaux (C) sont toutes identiques, les crayons (K) aussi. Voici deux pesées,'
    ' la balance est en équilibre.\n\n' + BAL1 + '\n\n' + BAL2
    + '\n\nQuelle est la masse d\'une paire de ciseaux ? Quelle est la masse d\'un crayon ?'
    '\n\nUne paire de ciseaux pèse $?$ g.\n\nUn crayon pèse $?$ g.',
    [var('c', '25..90'), var('k', '6..30')], ['{{c}}', '{{k}}'],
    ['**Comparer les pesées.** La première a une paire de ciseaux de plus que la deuxième ; tout'
     ' le reste est pareil. La différence des masses, c\'est donc une paire de ciseaux.',
     '**Une paire de ciseaux.** $' + ev('2*c+k') + ' - ' + ev('c+k') + ' = ' + col('{{c}}')
     + '$ g.',
     '**Un crayon.** Deuxième pesée : $' + ev('c+k') + ' - {{c}} = ' + col('{{k}}') + '$ g.',
     '**Vérification.** Première pesée : $2 \\times {{c}} + {{k}} = ' + ev('2*c+k') + '$.'],
    ['c != k'])

# n carrés + 1 triangle = A ; 1 carré + 1 triangle = B
CARRES = '\\square' + ''.join('{{if:n>' + str(j - 1) + '| + \\square|}}' for j in range(2, 5))
AL_SYMBOLES = variation(
    'Chaque symbole cache toujours le même nombre.\n\n$$' + CARRES + ' + \\triangle = '
    + ev('n*s+t') + '$$\n\n$$\\square + \\triangle = ' + ev('s+t') + '$$'
    + '\n\nQuels nombres cachent $\\square$ et $\\triangle$ ?\n\n$\\square = ?$\n\n'
    '$\\triangle = ?$',
    [var('n', '2..4'), var('s', '3..40'), var('t', '2..40')], ['{{s}}', '{{t}}'],
    ['**Comparer les deux égalités.** La première a $' + ev('n-1') + '$ carré{{if:n>2|s|}} de'
     ' plus que la deuxième : ' + '{{if:n>2|ces carrés valent|ce carré vaut}} $' + ev('n*s+t')
     + ' - ' + ev('s+t') + ' = ' + ev('(n-1)*s') + '$.',
     '**Le carré.** {{if:n>2|On partage entre les ' + v('n-1').replace('{{n-1}}', ev('n-1'))
     + ' carrés : |}}$\\square = ' + col('{{s}}') + '$.',
     '**Le triangle.** Deuxième égalité : $' + ev('s+t') + ' - {{s}} = ' + col('{{t}}') + '$.',
     '**Vérification.** $' + ev('n') + ' \\times {{s}} + {{t}} = ' + ev('n*s+t') + '$.'],
    ['s != t'])

# BO : 179 billes ; rouges = k × vertes ; bleues = vertes + d
PARTS_K = repete('k', '?', 5, '2')
AL_TROIS = variation(
    'Dans un paquet de billes rouges, vertes et bleues, il y a $' + ev('(k+2)*w+d')
    + '$ billes. Il y a ' + FOIS
    + ' fois plus de billes rouges que de billes vertes, et ' + v('d') + ' billes vertes de moins'
    ' que de billes bleues.\n\nCombien y a-t-il de billes de chaque couleur ?\n\nRouges : $?$'
    ' billes\n\nVertes : $?$ billes\n\nBleues : $?$ billes',
    [var('k', '2..5'), var('w', '8..60'), var('d', '5..30')],
    [ev('k*w'), '{{w}}', ev('w+d')],
    ['**Le schéma.** Les vertes font **une part**. Les rouges en font ' + v('k') + ', les bleues'
     ' une part et encore ' + v('d') + '.'
     + schema(['Vertes : ? (2)', 'Rouges : ' + PARTS_K, 'Bleues : ? (2) ; {{d}} (1)',
               'total : ' + ev('(k+2)*w+d')]),
     '**On enlève ' + v('d') + '.** Il reste des parts égales : $1 + {{k}} + 1 = ' + ev('k+2')
     + '$ parts, pour $' + ev('(k+2)*w+d') + ' - {{d}} = ' + ev('(k+2)*w') + '$ billes.',
     '**Vertes.** $' + ev('(k+2)*w') + ' \\div ' + ev('k+2') + ' = ' + col('{{w}}') + '$.',
     '**Rouges.** ${{k}} \\times {{w}} = ' + col(ev('k*w')) + '$. **Bleues.** ${{w}} + {{d}} = '
     + col(ev('w+d')) + '$.',
     '**Vérification.** $' + ev('k*w') + ' + {{w}} + ' + ev('w+d') + ' = ' + ev('(k+2)*w+d')
     + '$.'])

MODELES['05-problemes-algebriques-symboles-et-schemas'] = modele(
    'Problèmes algébriques : symboles et schémas',
    'Deux pesées dessinées (ciseaux et crayons), deux égalités à symboles (□ et △), trois'
    ' quantités liées par « fois plus » et « de moins » pour un total (179 billes) ; schéma en'
    ' barres dans le corrigé', 1,
    [AL_BALANCES, AL_SYMBOLES, AL_TROIS],
    [spec('pesées : 2C + K = 110, C + K = 70 → 40 et 30', 0, {'c': 40, 'k': 30}, ['40', '30'],
          'correct'),
     spec('Erreur : pesées, 110 ÷ 3 et 70 ÷ 2 (36, 35)', 0, {'c': 40, 'k': 30}, ['36', '35'],
          'incorrect'),
     spec('Erreur : pesées, inversées (30, 40)', 0, {'c': 40, 'k': 30}, ['30', '40'], 'incorrect'),
     spec('symboles : 2□ + △ = 23, □ + △ = 15 → 8 et 7', 1, {'n': 2, 's': 8, 't': 7}, ['8', '7'],
          'correct'),
     spec('Erreur : symboles, confondus (7, 8)', 1, {'n': 2, 's': 8, 't': 7}, ['7', '8'],
          'incorrect'),
     spec('symboles : 4□ + △ = 50, □ + △ = 17 → 11 et 6', 1, {'n': 4, 's': 11, 't': 6},
          ['11', '6'], 'correct'),
     spec('Erreur : symboles, 50 − 17 sans diviser (33, −16)', 1, {'n': 4, 's': 11, 't': 6},
          ['33', '-16'], 'incorrect'),
     spec('billes : 179, 4 fois plus, 17 de moins → 108, 27, 44', 2, {'k': 4, 'w': 27, 'd': 17},
          ['108', '27', '44'], 'correct'),
     spec('Erreur : billes, 179 ÷ 6 ≈ 29 sans retirer 17 (116, 29, 46)', 2,
          {'k': 4, 'w': 27, 'd': 17}, ['116', '29', '46'], 'incorrect'),
     spec('Erreur : billes, bleues = vertes − 17 (108, 27, 10)', 2, {'k': 4, 'w': 27, 'd': 17},
          ['108', '27', '10'], 'incorrect')],
    delay=180)

# =============== 11a-6. CM2-115 : identifier une situation de proportionnalité ===============

OUI_NON = choix(['Oui', 'Non'])

SITUATIONS = [
    # (énoncé, justification) ; les 5 premières : oui ; les 5 suivantes : non
    ('Des cahiers identiques sont vendus au même prix chacun. Le prix à payer est-il'
     ' proportionnel au nombre de cahiers achetés ?',
     '**Oui.** Les cahiers coûtent tous le même prix : si on en achète trois fois plus, on paie'
     ' trois fois plus.'),
    ('Des manuels sont tous identiques. La masse d\'une pile de ces manuels est-elle'
     ' proportionnelle au nombre de manuels ?',
     '**Oui.** Les manuels ont tous la même masse : s\'il y a trois fois plus de manuels dans la'
     ' pile, elle est trois fois plus lourde.'),
    ('Pour faire une pâte à crêpes, on met toujours $250~\\unit{g}$ de farine pour $2$ œufs. La'
     ' masse de farine est-elle proportionnelle au nombre d\'œufs ?',
     '**Oui.** Avec deux fois plus d\'œufs, on met deux fois plus de farine : $4$ œufs pour'
     ' $500~\\unit{g}$, $6$ œufs pour $750~\\unit{g}$.'),
    ('Un train roule toujours à la même vitesse. La distance parcourue est-elle proportionnelle'
     ' à la durée du trajet ?',
     '**Oui.** À vitesse constante, en deux fois plus de temps, le train parcourt deux fois plus'
     ' de distance.'),
    ('Le périmètre d\'un carré est-il proportionnel à la longueur de son côté ?',
     '**Oui.** Le périmètre, c\'est quatre fois le côté : un côté trois fois plus long donne un'
     ' périmètre trois fois plus long.'),
    ('La taille d\'une personne est-elle proportionnelle à son âge ?',
     '**Non.** À quarante ans, on n\'est pas deux fois plus grand qu\'à vingt ans.'),
    ('Un taxi fait payer $4~\\unit{€}$ dès qu\'on monte, puis $2~\\unit{€}$ par kilomètre. Le'
     ' prix de la course est-il proportionnel au nombre de kilomètres ?',
     '**Non.** Pour $10~\\unit{km}$, on paie $4 + 20 = 24~\\unit{€}$ ; pour $20~\\unit{km}$,'
     ' $4 + 40 = 44~\\unit{€}$. Deux fois plus de kilomètres, mais pas deux fois plus cher.'),
    ('L\'aire d\'un carré est-elle proportionnelle à la longueur de son côté ?',
     '**Non.** Un carré de $2~\\unit{cm}$ de côté a une aire de $4~\\unit{cm^2}$ ; un carré de'
     ' $4~\\unit{cm}$ de côté, $16~\\unit{cm^2}$. Le côté est deux fois plus long, l\'aire quatre'
     ' fois plus grande.'),
    ('Un magasin vend des stylos à $1~\\unit{€}$ l\'un, et le lot de $10$ stylos à'
     ' $7~\\unit{€}$. Le prix payé est-il proportionnel au nombre de stylos ?',
     '**Non.** Un stylo coûte $1~\\unit{€}$, mais dix stylos ne coûtent pas dix fois plus :'
     ' $7~\\unit{€}$ seulement.'),
    ('Un forfait de téléphone coûte $15~\\unit{€}$ par mois, quel que soit le nombre d\'appels.'
     ' Le prix payé est-il proportionnel au nombre d\'appels ?',
     '**Non.** Pour $10$ appels ou pour $20$ appels, on paie toujours $15~\\unit{€}$ : deux fois'
     ' plus d\'appels, mais pas deux fois plus cher.'),
]

ID_MOTS = variation(
    selon('s', [e for e, _ in SITUATIONS]) + OUI_NON,
    [var('s', '1..10'), var('r', '{{if:s<6|0|1}}')], ['{{r}}'],
    ['Deux grandeurs sont proportionnelles quand, si l\'une devient deux, trois… fois plus'
     ' grande, l\'autre devient aussi deux, trois… fois plus grande.',
     selon('s', [j for _, j in SITUATIONS])])

# o = 0 : prix au kilo affiché, k fois plus de kilos, k fois plus cher → oui ;
# o = 1 : sacs à prix fixe, pas k fois plus cher → non. u = prix d'un kilo, en centimes.
ID_CHIFFRES = variation(
    'Au marché, un marchand {{if:o==0|affiche le prix d\'un kilo de pommes. Pour|vend des sacs de'
    ' pommes tout prêts. Le sac de}} ${{a}}~\\unit{kg}$, {{if:o==0|on paie|il coûte}} '
    + prix('a*u') + ' ; {{if:o==0|pour|le sac de}} $' + ev('k*a') + '~\\unit{kg}$, '
    '{{if:o==0|on paie|il coûte}} ' + prix('k*a*u-o*r') + '.\n\nLe prix des pommes'
    ' est-il proportionnel à leur masse ?' + OUI_NON,
    [var('o', '0..1'), var('a', '1..3'), var('k', '2..4'), var('x', '30..90'),
     var('u', 'eval:5*x'), var('y', '10..60'), var('r', 'eval:5*y')],
    ['{{o}}'],
    ['On compare : $' + ev('k*a') + '~\\unit{kg}$, c\'est ' + v('k') + ' fois plus que $'
     + ev('a') + '~\\unit{kg}$. Le prix est-il ' + v('k') + ' fois plus grand ? ${{k}} \\times '
     + euros('a*u') + ' = ' + euros('k*a*u') + '$.',
     '{{if:o==0|**Oui.** On paie bien ' + v('k') + ' fois plus : le prix d\'un kilo est le même'
     ' pour toutes les masses.|**Non.** Le grand sac coûte ' + prix('k*a*u-r') + ', pas '
     + prix('k*a*u') + ' : ' + v('k') + ' fois plus de pommes, mais pas ' + v('k') + ' fois plus'
     ' cher.}}'],
    ['k * a * u - r > a * u'])

MODELES['06-est-ce-une-situation-de-proportionnalite'] = modele(
    'Est-ce une situation de proportionnalité ?',
    'Dire si deux grandeurs sont proportionnelles (case « choix » Oui / Non) : situations en mots'
    ' (pile de manuels identiques : oui ; âge et taille : non ; taxi avec prise en charge : non),'
    ' ou deux prix au marché (« 3 fois plus de kilos, 3 fois plus cher ? »)', 1,
    [ID_MOTS, ID_CHIFFRES],
    [spec('manuels : oui', 0, {'s': 2, 'r': 0}, '0', 'correct'),
     spec('Erreur : manuels, non', 0, {'s': 2, 'r': 0}, '1', 'incorrect'),
     spec('taxi : non', 0, {'s': 7, 'r': 1}, '1', 'correct'),
     spec('Erreur : taxi, oui (le prix augmente)', 0, {'s': 7, 'r': 1}, '0', 'incorrect'),
     spec('âge et taille : non', 0, {'s': 6, 'r': 1}, '1', 'correct'),
     spec('aire du carré : non', 0, {'s': 8, 'r': 1}, '1', 'correct'),
     spec('périmètre du carré : oui', 0, {'s': 5, 'r': 0}, '0', 'correct'),
     spec('prix au kilo : 2 kg 5,50 €, 6 kg 16,50 € → oui', 1,
          {'o': 0, 'a': 2, 'k': 3, 'x': 55, 'u': 275, 'y': 20, 'r': 100}, '0', 'correct'),
     spec('Erreur : prix au kilo, non', 1,
          {'o': 0, 'a': 2, 'k': 3, 'x': 55, 'u': 275, 'y': 20, 'r': 100}, '1', 'incorrect'),
     spec('sacs : 2 kg 5,50 €, 6 kg 15,50 € → non', 1,
          {'o': 1, 'a': 2, 'k': 3, 'x': 55, 'u': 275, 'y': 20, 'r': 100}, '1', 'correct'),
     spec('Erreur : sacs, oui (le prix augmente)', 1,
          {'o': 1, 'a': 2, 'k': 3, 'x': 55, 'u': 275, 'y': 20, 'r': 100}, '0', 'incorrect')],
    delay=90)

# =============== 11a-7. CM2-116 : résoudre un problème de proportionnalité ===============

# V1 : × une fois. u = prix d'un croissant (jamais écrit), en centimes.
PR_FOIS = probleme(
    'À la boulangerie, ' + v('n') + ' croissants coûtent ' + prix('n*u') + '.',
    'Combien coûtent $' + ev('k*n') + '$ croissants ?\n\nIls coûtent $?' + EURO + '$.',
    en_euros('k*n*u'), [var('n', '2..6'), var('k', '2..5'), var('x', '17..28'),
                        var('u', 'eval:5*x')], [],
    ['$' + ev('k*n') + '$ croissants, c\'est ' + v('k') + ' fois plus que ' + v('n')
     + ' croissants. Les croissants coûtent tous le même prix : on paie ' + v('k')
     + ' fois plus.',
     '$${{k}} \\times ' + euros('n*u') + ' = ' + col(euros('k*n*u')) + '$$',
     '$' + ev('k*n') + '$ croissants coûtent ' + prix('k*n*u') + '.',
     'On n\'a pas eu besoin du prix d\'un seul croissant.'])

# V2 : ÷ puis × (BO : 200 feuilles, 24 mm → 50 feuilles → 250 feuilles)
# g feuilles font w mm ; N = a × g, M = b × g ; g = 20, 50 ou 100
GROUPE = [var('gi', '1..3'),
          var('g', 'eval:20+30*min(max(gi-1,0),1)+50*min(max(gi-2,0),1)')]
PR_DIV_FOIS = probleme(
    'Un paquet de $' + ev('a*g') + '$ feuilles d\'un'
    ' certain papier a une épaisseur de $' + ev('a*w') + '~\\unit{mm}$.',
    'Quelle est l\'épaisseur de $' + ev('b*g') + '$ feuilles de ce papier ?\n\nElle est de'
    ' $?~\\text{mm}$.',
    ev('b*w'), [var('a', '2..5'), var('b', '3..9'), var('w', '2..15')] + GROUPE,
    ['mod(b,a) != 0', 'mod(a,b) != 0', 'b * g <= 900', '20 * w >= g', '5 * w <= g'],
    ['On passe par un petit paquet : ${{g}}$ feuilles, c\'est ' + v('a') + ' fois moins que $'
     + ev('a*g') + '$ feuilles ; son épaisseur est ' + v('a') + ' fois plus petite.',
     '$$' + ev('a*w') + ' \\div {{a}} = {{w}}$$',
     '$' + ev('b*g') + '$ feuilles, c\'est ' + v('b') + ' fois ${{g}}$ feuilles : l\'épaisseur est '
     + v('b') + ' fois plus grande.',
     '$${{b}} \\times {{w}} = ' + col(ev('b*w')) + '$$',
     '$' + ev('b*g') + '$ feuilles ont une épaisseur de $' + ev('b*w') + '~\\unit{mm}$.'])

# V3 : ÷ puis + (12 œufs, 300 g → 6 œufs → 18 œufs = 12 + 6). n1 = q × h, n2 = n1 + h.
PR_PLUS = probleme(
    'Pour faire un gâteau avec $' + ev('q*h') + '$ œufs, on utilise $' + ev('q*f') + '~\\unit{g}$ de farine.',
    'Quelle masse de farine faut-il avec $' + ev('q*h+h') + '$ œufs ?\n\nIl faut $?~\\text{g}$ de'
    ' farine.',
    ev('(q+1)*f'), [var('q', '2..4'), var('h', '2..6'), var('z', '8..96'), var('f', 'eval:5*z')],
    ['f >= 30 * h', 'f <= 80 * h'],
    ['$' + ev('q*h+h') + '$ œufs, c\'est $' + ev('q*h') + '$ œufs et encore ' + v('h')
     + ' œufs. Et ' + v('h') + ' œufs, c\'est ' + v('q') + ' fois moins que $' + ev('q*h')
     + '$ œufs.',
     '**' + v('h') + ' œufs.** $' + ev('q*f') + ' \\div {{q}} = {{f}}$ g de farine.',
     '**$' + ev('q*h+h') + '$ œufs.** On ajoute les deux quantités de farine : $' + ev('q*f')
     + ' + {{f}} = ' + col(ev('(q+1)*f')) + '$.',
     'Il faut $' + ev('(q+1)*f') + '~\\unit{g}$ de farine pour $' + ev('q*h+h') + '$ œufs.'])

MODELES['07-problemes-de-proportionnalite-linearite'] = modele(
    'Problèmes de proportionnalité (linéarité)',
    'Résoudre par « k fois plus » une fois (4 croissants → 12 croissants), deux fois (200 feuilles'
    ' → 50 → 250 feuilles), ou une fois puis en ajoutant (12 œufs → 6 œufs → 18 œufs) ; jamais en'
    ' passant par l\'unité, sans tableau', 1,
    [PR_FOIS, PR_DIV_FOIS, PR_PLUS],
    [spec('croissants : 4 pour 4,40 €, 12 → 13,20 €', 0, {'n': 4, 'k': 3, 'x': 22, 'u': 110},
          '13,2', 'correct'),
     spec('Erreur : croissants, 4,40 + 8 (12,40)', 0, {'n': 4, 'k': 3, 'x': 22, 'u': 110}, '12,4',
          'incorrect'),
     spec('Erreur : croissants, 12 × 4,40 (52,80)', 0, {'n': 4, 'k': 3, 'x': 22, 'u': 110},
          '52,8', 'incorrect'),
     spec('feuilles : 200 → 24 mm, 250 → 30 mm', 1, {'a': 4, 'b': 5, 'w': 6, 'gi': 2, 'g': 50},
          '30', 'correct'),
     spec('Erreur : feuilles, 24 + 50 (74)', 1, {'a': 4, 'b': 5, 'w': 6, 'gi': 2, 'g': 50}, '74',
          'incorrect'),
     spec('Erreur : feuilles, 24 ÷ 4 seulement (6)', 1, {'a': 4, 'b': 5, 'w': 6, 'gi': 2, 'g': 50},
          '6', 'incorrect'),
     spec('Erreur : feuilles, 24 × 5 (120)', 1, {'a': 4, 'b': 5, 'w': 6, 'gi': 2, 'g': 50}, '120',
          'incorrect'),
     spec('œufs : 12 → 600 g, 18 → 900 g', 2, {'q': 2, 'h': 6, 'z': 60, 'f': 300}, '900', 'correct'),
     spec('Erreur : œufs, 600 + 6 (606)', 2, {'q': 2, 'h': 6, 'z': 60, 'f': 300}, '606',
          'incorrect'),
     spec('Erreur : œufs, la farine pour 6 œufs (300)', 2, {'q': 2, 'h': 6, 'z': 60, 'f': 300},
          '300', 'incorrect')],
    options=DECIMAUX)

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
print(len(MODELES), 'modèles écrits')

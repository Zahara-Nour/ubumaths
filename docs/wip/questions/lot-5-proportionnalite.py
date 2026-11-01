"""Écrit les 6 modèles du lot 7 « Proportionnalité, fonctions » de la 5e dans scripts/questions/5-proportionnalite/.

Phase 0 validée par David le 2026-11-01 (« je te suis » sur les recos) ; un point par modèle :

| #  | Point | Titre | Réponse | Catégorie, niveau |
| 01 | 5-140 | Calculer 1 % d'une quantité | case | Proportionnalité › Pourcentages › Calculer, 8 |
| 02 | 5-085 | Utiliser un pourcentage : réduction | 2 cases | Proportionnalité › Pourcentages › Problèmes, 1 |
| 03 | 5-086 | Exprimer une proportion en pourcentage (tout quelconque) | case | Proportionnalité › Pourcentages › Proportion, 3 |
| 04 | 5-087 | Reconnaître des situations de proportionnalité | choix (plusieurs) | Proportionnalité › Situations de proportionnalité › Définition, 3 |
| 05 | 5-092 | Employer « en fonction de » | choix | Calcul littéral › Écrire › Formules, 4 |
| 06 | 5-098 | Écrire une formule reliant deux grandeurs | case (expression) | Calcul littéral › Écrire › Formules, 5 |

Décisions (journal § 18) :
- sans coefficient multiplicateur (4e) dans 02 ; pourcentages 10, 25, 50 % ;
- 03 : totaux qui ne sont ni diviseurs ni multiples de 100 (6 voix sur 24, 22 sur 40) ;
- 04 : contextes du BO (prix, recettes, distances, échelles), contre-exemples âge-taille, taxi, abonnement ;
- 06 : pas de géométrie (5-124 a son modèle), pas de π ; le produit écrit avec × est accepté ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions/lot-5-proportionnalite.py scripts/questions/5-proportionnalite
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


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': theme,
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
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    """Formule mise en couleur, en ligne."""
    return '$' + col(x) + '$'


def texte(x, k=0):
    """Texte mis en couleur, en ligne."""
    return '$' + col('\\text{' + x + '}', k) + '$'


def choix(lignes, melanger=True, plusieurs=False):
    entete = ('' if melanger else 'melanger: non\n') + ('plusieurs: oui\n' if plusieurs else '')
    return '\n\n```choix\n' + entete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def euros(x):
    return x + '~\\unit{€}'


PR = 'Proportionnalité'
POURCENTAGES = 'Pourcentages'
MODELES = []
# Prix en euros : 4,80 s'écrit comme 4,8 (précédent : problèmes de prix de CE1, CE2, 6e)
PRIX = {'constraints': {'zeros': 'off'}}

# --- 1. 5-140 : calculer 1 % d'une quantité ---------------------------------------------

UN_POURCENT_DEF = ('**1 %.** Prendre $1~\\%$ d\'une quantité, c\'est en prendre $1$ sur $100$ :'
                   ' on la divise par $100$.')

UN_POURCENT = variation(
    'Calcule $1~\\%$ de ${{q}}$.\n\n$?$',
    [var('q', '100..3000')],
    ['{{eval:q/100;d}}'],
    [UN_POURCENT_DEF,
     '$1~\\%$ de ${{q}}$, c\'est ${{q}} \\div 100 = ' + col('{{eval:q/100;d}}') + '$.'],
    ['q%10==0'])
UN_POURCENT_PRIX = variation(
    'Un vélo coûte $' + euros('{{q}}') + '$.\n\nCombien représente $1~\\%$ de son prix ?\n\n'
    '$?~\\unit{€}$',
    [var('q', '150..990')],
    ['{{eval:q/100;d}}'],
    [UN_POURCENT_DEF,
     '${{q}} \\div 100 = ' + col('{{eval:q/100;d}}') + '$ : $1~\\%$ du prix, c\'est $'
     + euros(col('{{eval:q/100;d}}')) + '$.'],
    ['q%10==0'])
PAR_UN_POURCENT = variation(
    'On veut calculer ${{p}}~\\%$ de ${{q}}$ en passant par $1~\\%$.\n\n'
    '$1~\\%$ de ${{q}}$ $= ?$\n\n${{p}}~\\%$ de ${{q}}$ $= ?$',
    [var('p', '2|3|4|6|7|8|9'), var('c', '2..9'), var('q', 'eval:100*c')],
    ['{{eval:q/100}}', '{{eval:p*q/100}}'],
    [UN_POURCENT_DEF,
     '$1~\\%$ de ${{q}}$ : ${{q}} \\div 100 = ' + col('{{eval:q/100}}') + '$.',
     '${{p}}~\\%$, c\'est ${{p}}$ fois $1~\\%$ : ${{p}} \\times {{eval:q/100}} = '
     + col('{{eval:p*q/100}}', 1) + '$.'])

MODELES.append(modele(
    '01-calculer-1-pourcent', 'Calculer 1 % d\'une quantité',
    'Calculer 1 % d\'une quantité en la divisant par 100 (1 % de 350 = 3,5), puis s\'en servir'
    ' pour un autre pourcentage (7 % de 300 = 7 × 3 = 21)',
    PR, POURCENTAGES, 'Calculer', 8,
    [UN_POURCENT, UN_POURCENT_PRIX, PAR_UN_POURCENT],
    [spec('1 % de 350 : 3,5', 0, {'q': 350}, '3,5', 'correct'),
     spec('Erreur : 35 (divisé par 10)', 0, {'q': 350}, '35', 'incorrect'),
     spec('Erreur : 0,35 (divisé par 1 000)', 0, {'q': 350}, '0,35', 'incorrect'),
     spec('1 % de 2 400 : 24', 0, {'q': 2400}, '24', 'correct'),
     spec('Vélo 480 € : 4,8', 1, {'q': 480}, '4,8', 'correct'),
     spec('Vélo 480 € : 4,80', 1, {'q': 480}, '4,80', 'correct'),
     spec('Erreur : 479 (moins 1)', 1, {'q': 480}, '479', 'incorrect'),
     spec('7 % de 300 : 3 puis 21', 2, {'p': 7, 'c': 3, 'q': 300}, ['3', '21'], 'correct'),
     spec('Erreur : 7 % de 300 = 7 + 3', 2, {'p': 7, 'c': 3, 'q': 300}, ['3', '10'], 'incorrect'),
     spec('Erreur : 7 % de 300 = 300 − 7', 2, {'p': 7, 'c': 3, 'q': 300}, ['3', '293'], 'incorrect')],
    delay=45, options=PRIX))

# --- 2. 5-085 : utiliser un pourcentage (réduction) ----------------------------------------

REDUC_DEF = ('**Réduction.** La réduction est le pourcentage du prix de départ ; le prix payé est'
             ' le prix de départ moins la réduction.')
REDUC_QUESTION = ('\n\nMontant de la réduction : $?~\\unit{€}$\n\nPrix payé : $?~\\unit{€}$')


def reduction(p, objet, prix, calcul):
    """Réduction de p % sur un objet ; prix = variable du prix ; calcul = étape de la réduction,
    dont la dernière formule reste ouverte (le « = » la prolonge)."""
    return variation(
        objet + ' coûte $' + euros('{{' + prix + '}}') + '$. Pendant les soldes, son prix baisse'
        ' de $' + p + '~\\%$.' + REDUC_QUESTION,
        [], ['{{eval:' + p + '*' + prix + '/100;d}}', '{{eval:' + prix + '-' + p + '*' + prix
                                                         + '/100;d}}'],
        [REDUC_DEF,
         'Réduction : ' + calcul + ' = ' + euros(col('{{eval:' + p + '*' + prix + '/100;d}}'))
         + '$.',
         'Prix payé : ${{' + prix + '}} - {{eval:' + p + '*' + prix + '/100;d}} = '
         + euros(col('{{eval:' + prix + '-' + p + '*' + prix + '/100;d}}', 1)) + '$.'])


REDUC_10 = reduction('10', 'Un pantalon', 'x', '$10~\\%$ de ${{x}}$, c\'est ${{x}} \\div 10')
REDUC_10['variables'] = [var('x', '20..90')]
REDUC_10['conditions'] = ['x%5==0']
REDUC_25 = reduction('25', 'Une paire de chaussures', 'x',
                     '$25~\\%$, c\'est le quart : ${{x}} \\div 4')
REDUC_25['variables'] = [var('x', '40..120')]
REDUC_25['conditions'] = ['x%4==0']
REDUC_50 = reduction('50', 'Un jeu vidéo', 'x', '$50~\\%$, c\'est la moitié : ${{x}} \\div 2')
REDUC_50['variables'] = [var('x', '20..80')]

MODELES.append(modele(
    '02-utiliser-un-pourcentage-reduction', 'Utiliser un pourcentage : réduction',
    'Calculer une réduction de 10 %, 25 % ou 50 % et le prix payé (25 % de 60 € = 15 € ;'
    ' prix payé 45 €), sans coefficient multiplicateur',
    PR, POURCENTAGES, 'Problèmes', 1,
    [REDUC_10, REDUC_25, REDUC_50],
    [spec('10 % de 45 € : 4,5 et 40,5', 0, {'x': 45}, ['4,5', '40,5'], 'correct'),
     spec('Erreur : réduction de 10 €', 0, {'x': 45}, ['10', '35'], 'incorrect'),
     spec('Erreur : prix payé = la réduction', 0, {'x': 45}, ['4,5', '4,5'], 'incorrect'),
     spec('25 % de 60 € : 15 et 45', 1, {'x': 60}, ['15', '45'], 'correct'),
     spec('Erreur : 25 € de réduction', 1, {'x': 60}, ['25', '35'], 'incorrect'),
     spec('Erreur : prix payé 75 (ajouté)', 1, {'x': 60}, ['15', '75'], 'incorrect'),
     spec('50 % de 35 € : 17,5 et 17,5', 2, {'x': 35}, ['17,5', '17,5'], 'correct'),
     spec('Erreur : 50 % = 50 €', 2, {'x': 35}, ['50', '35'], 'incorrect'),
     spec('10 % de 45 € : 4,50 et 40,50', 0, {'x': 45}, ['4,50', '40,50'], 'correct')],
    delay=90, options=PRIX))

# --- 3. 5-086 : exprimer une proportion en pourcentage ---------------------------------------

PROPORTION_DEF = ('**Proportion en pourcentage.** On écrit la proportion sous forme de fraction,'
                  ' on la calcule en nombre décimal, puis on lit le nombre de centièmes :'
                  ' $0{,}25 = \\dfrac{25}{100} = 25~\\%$.')
PROPORTION_VARS = [var('t', '24|30|36|40|48|60|80'),
                   var('p', '10|20|25|30|40|60|70|75|80|90'),
                   var('n', 'eval:p*t/100')]
PROPORTION_CONDS = ['(p*t)%100==0']
PROPORTION_ETAPES = [
    PROPORTION_DEF,
    '$\\dfrac{{{n}}}{{{t}}} = {{n}} \\div {{t}} = {{eval:n/t;d}} = \\dfrac{{{p}}}{100}$, soit '
    + m('{{p}}~\\%') + '.']

PROPORTION_VOTES = variation(
    'Lors de l\'élection des délégués, Malik a obtenu ${{n}}$ voix sur ${{t}}$.\n\n'
    'Quel pourcentage des voix a-t-il obtenu ?\n\n$?~\\%$',
    PROPORTION_VARS, ['{{p}}'], PROPORTION_ETAPES, PROPORTION_CONDS)
PROPORTION_CONTROLE = variation(
    'À un questionnaire de ${{t}}$ questions, Jade a donné ${{n}}$ bonnes réponses.\n\n'
    'Quel pourcentage de bonnes réponses a-t-elle obtenu ?\n\n$?~\\%$',
    PROPORTION_VARS, ['{{p}}'], PROPORTION_ETAPES, PROPORTION_CONDS)
PROPORTION_CLUB = variation(
    'Un club de sport compte ${{t}}$ adhérents, dont ${{n}}$ font de la natation.\n\n'
    'Quel pourcentage des adhérents fait de la natation ?\n\n$?~\\%$',
    PROPORTION_VARS, ['{{p}}'], PROPORTION_ETAPES, PROPORTION_CONDS)

MODELES.append(modele(
    '03-proportion-en-pourcentage-tout-quelconque', 'Exprimer une proportion en pourcentage',
    'Exprimer une part en pourcentage quand le tout n\'est ni un diviseur ni un multiple de 100'
    ' (6 voix sur 24 = 25 % ; 22 sur 40 = 55 %)',
    PR, POURCENTAGES, 'Proportion', 3,
    [PROPORTION_VOTES, PROPORTION_CONTROLE, PROPORTION_CLUB],
    [spec('6 sur 24 : 25 %', 0, {'t': 24, 'p': 25, 'n': 6}, '25', 'correct'),
     spec('Erreur : 6 (l\'effectif)', 0, {'t': 24, 'p': 25, 'n': 6}, '6', 'incorrect'),
     spec('Erreur : 0,25 (la proportion)', 0, {'t': 24, 'p': 25, 'n': 6}, '0,25', 'incorrect'),
     spec('Erreur : 18 (les autres voix)', 0, {'t': 24, 'p': 25, 'n': 6}, '18', 'incorrect'),
     spec('18 sur 30 : 60 %', 1, {'t': 30, 'p': 60, 'n': 18}, '60', 'correct'),
     spec('Erreur : 12 (30 − 18)', 1, {'t': 30, 'p': 60, 'n': 18}, '12', 'incorrect'),
     spec('28 sur 40 : 70 %', 2, {'t': 40, 'p': 70, 'n': 28}, '70', 'correct'),
     spec('Erreur : 28', 2, {'t': 40, 'p': 70, 'n': 28}, '28', 'incorrect')],
    delay=90))

# --- 4. 5-087 : reconnaître des situations de proportionnalité ----------------------------

SITUATION_DEF = ('**Situation de proportionnalité.** Deux grandeurs sont proportionnelles quand on'
                 ' obtient l\'une en multipliant l\'autre toujours par le même nombre : si l\'une'
                 ' double, l\'autre double aussi, et pour $0$ de l\'une, on a $0$ de l\'autre.')
SITUATION_QUESTION = 'Dans quelles situations les deux grandeurs sont-elles proportionnelles ?'

SITUATIONS_1 = variation(
    SITUATION_QUESTION
    + choix(['Le prix payé et la masse de pommes achetée, à $' + euros('2') + '$ le'
             ' kilogramme.',
             'La taille d\'un enfant et son âge.',
             'La quantité de farine et le nombre de crêpes, en suivant toujours la même'
             ' recette.',
             'Le prix d\'une course en taxi et la distance parcourue, avec $' + euros('3')
             + '$ de prise en charge puis $' + euros('2') + '$ par kilomètre.',
             'Sur une carte, la distance mesurée sur la carte et la distance réelle.'],
            plusieurs=True),
    [], ['0;2;4'],
    [SITUATION_DEF,
     'Pommes : $2$ kg coûtent $' + euros('4') + '$, $4$ kg coûtent $' + euros('8') + '$ : on'
     ' multiplie toujours par $2$. ' + texte('Proportionnel') + '.',
     'Crêpes : pour deux fois plus de crêpes, il faut deux fois plus de farine. '
     + texte('Proportionnel') + '. Carte : l\'échelle multiplie toutes les distances par le même'
     ' nombre. ' + texte('Proportionnel') + '.',
     'Taille et âge : un enfant de $10$ ans ne mesure pas deux fois la taille qu\'il avait à $5$'
     ' ans. ' + texte('Pas proportionnel', 1) + '. Taxi : pour $0$ km, on paie déjà $'
     + euros('3') + '$. ' + texte('Pas proportionnel', 1) + '.'])
SITUATIONS_2 = variation(
    SITUATION_QUESTION
    + choix(['Le prix à la piscine et le nombre d\'entrées, avec un abonnement de $'
             + euros('20') + '$ puis $' + euros('4') + '$ par entrée.',
             'La distance parcourue et la durée du trajet, pour un train qui roule toujours'
             ' à $120~\\unit{km/h}$.',
             'La masse d\'une personne et sa taille.',
             'Le prix payé et le nombre de cahiers achetés, à $' + euros('2') + '$ le cahier.',
             'La quantité de sucre et le nombre de gâteaux, en suivant toujours la même'
             ' recette.'],
            plusieurs=True),
    [], ['1;3;4'],
    [SITUATION_DEF,
     'Train : en $2$ h, il parcourt $240$ km ; en $3$ h, $360$ km : on multiplie toujours par'
     ' $120$. ' + texte('Proportionnel') + '. Cahiers et gâteaux : deux fois plus de cahiers'
     ' coûtent deux fois plus cher, deux fois plus de gâteaux demandent deux fois plus de sucre. '
     + texte('Proportionnel') + '.',
     'Piscine : $1$ entrée coûte $' + euros('24') + '$, $2$ entrées $' + euros('28')
     + '$, pas le double. ' + texte('Pas proportionnel', 1) + '. Masse et taille : deux'
     ' personnes de même taille n\'ont pas forcément la même masse. '
     + texte('Pas proportionnel', 1) + '.'])
SITUATIONS_3 = variation(
    SITUATION_QUESTION
    + choix(['Le prix d\'un plein d\'essence et le nombre de litres, à $' + euros('1{,}80')
             + '$ le litre.',
             'La température extérieure et l\'heure de la journée.',
             'Sur un plan à l\'échelle $\\dfrac{1}{100}$, la longueur d\'une pièce sur le plan et'
             ' sa longueur réelle.',
             'La distance parcourue par une randonneuse et la durée de sa marche, avec des'
             ' pauses, des montées et des descentes.',
             'Le prix d\'une location de vélo et le nombre d\'heures, avec $' + euros('5')
             + '$ d\'assurance puis $' + euros('3') + '$ par heure.'],
            plusieurs=True),
    [], ['0;2'],
    [SITUATION_DEF,
     'Essence : $10$ litres coûtent $' + euros('18') + '$, $20$ litres $' + euros('36')
     + '$. ' + texte('Proportionnel') + '. Plan : chaque longueur réelle vaut $100$ fois celle du'
     ' plan. ' + texte('Proportionnel') + '.',
     'Température : elle monte puis redescend dans la journée. ' + texte('Pas proportionnel', 1)
     + '. Randonnée : la vitesse change (pauses, montées), la distance n\'est pas la durée'
     ' multipliée par un même nombre. ' + texte('Pas proportionnel', 1) + '. Vélo : pour $0$ h,'
     ' on paie déjà $' + euros('5') + '$. ' + texte('Pas proportionnel', 1) + '.'])

MODELES.append(modele(
    '04-reconnaitre-situations-de-proportionnalite',
    'Reconnaître des situations de proportionnalité',
    'Dire si deux grandeurs sont proportionnelles dans des contextes concrets : prix au kilo,'
    ' recette, vitesse constante, échelle (oui) ; âge et taille, taxi, abonnement (non)',
    PR, 'Situations de proportionnalité', 'Définition', 3,
    [SITUATIONS_1, SITUATIONS_2, SITUATIONS_3],
    [spec('Série 1 : 0, 2, 4', 0, {}, '0;2;4', 'correct'),
     spec('Erreur : le taxi', 0, {}, '0;2;3;4', 'incorrect'),
     spec('Oubli de la carte : partiel', 0, {}, '0;2', 'unoptimal_form'),
     spec('Série 2 : 1, 3, 4', 1, {}, '1;3;4', 'correct'),
     spec('Erreur : l\'abonnement', 1, {}, '0;1;3;4', 'incorrect'),
     spec('Série 3 : 0, 2', 2, {}, '0;2', 'correct'),
     spec('Erreur : la randonnée', 2, {}, '0;2;3', 'incorrect')],
    delay=90))

# --- 5. 5-092 : employer « en fonction de » -------------------------------------------------

EN_FONCTION_DEF = ('**« En fonction de ».** Exprimer une grandeur $A$ en fonction d\'une grandeur'
                   ' $B$, c\'est écrire une formule qui donne $A$ quand on connaît $B$ : $A$ est'
                   ' seule d\'un côté du signe $=$, et $B$ est dans le calcul.')
EN_FONCTION_VARS = [var('k', '0..3')]
# Lettres écrites dans le texte (pas de variable lettre)
LA = '{{if:k==0|p|{{if:k==1|d|{{if:k==2|A|m}}}}}}'
LB = '{{if:k==0|n|{{if:k==1|t|{{if:k==2|c|x}}}}}}'
EN_FONCTION_FORMULE = ('{{if:k==0|p = 2n|{{if:k==1|d = 60t|{{if:k==2|A = c \\times c|'
                       'm = 250x}}}}}}')

LIRE_FORMULE = variation(
    'La formule $' + EN_FONCTION_FORMULE + '$ exprime :'
    + choix(['$'+LA+'$ en fonction de $'+LB+'$', '$'+LB+'$ en fonction de $'+LA+'$'],
            melanger=False),
    EN_FONCTION_VARS, ['0'],
    [EN_FONCTION_DEF,
     'Dans $' + EN_FONCTION_FORMULE + '$, on calcule $' + LA + '$ à partir de $' + LB + '$ : la formule'
     ' exprime ' + m(LA + '\\text{ en fonction de }' + LB) + '.'])
CHOISIR_FORMULE = variation(
    'Les pommes coûtent $' + euros('{{k}}') + '$ le kilogramme. On veut exprimer le prix $p$ à'
    ' payer, en euros, **en fonction de** la masse $m$ achetée, en kilogrammes.\n\nQuelle formule'
    ' convient ?'
    + choix(['$p = {{k}}m$', '$m = {{k}}p$', '$m = \\dfrac{p}{{{k}}}$', '$p = m + {{k}}$']),
    [var('k', '2..5')], ['0'],
    [EN_FONCTION_DEF,
     'Le prix, c\'est ${{k}}$ fois la masse : $p = {{k}} \\times m$, qui s\'écrit '
     + m('p = {{k}}m') + '.',
     '$m = \\dfrac{p}{{{k}}}$ est juste aussi, mais elle exprime $m$ en fonction de $p$ : ce'
     ' n\'est pas ce qu\'on demande.'])
QUOI_CALCULER = variation(
    'On veut calculer le prix à payer **en fonction du** nombre de places de cinéma achetées.'
    '\n\nQue calcule-t-on, et à partir de quoi ?'
    + choix(['On calcule le prix à partir du nombre de places.',
             'On calcule le nombre de places à partir du prix.'], melanger=False),
    [], ['0'],
    [EN_FONCTION_DEF,
     'Le prix est exprimé en fonction du nombre de places : '
     + texte('on calcule le prix à partir du nombre de places') + '.'])

MODELES.append(modele(
    '05-employer-en-fonction-de', 'Employer « en fonction de »',
    'Comprendre « exprimer A en fonction de B » : la formule p = 2n exprime p en fonction de n ;'
    ' choisir la formule qui exprime le prix en fonction de la masse',
    'Calcul littéral', 'Écrire', 'Formules', 4,
    [LIRE_FORMULE, CHOISIR_FORMULE, QUOI_CALCULER],
    [spec('p = 2n : p en fonction de n', 0, {'k': 0}, '0', 'correct'),
     spec('Erreur : n en fonction de p', 0, {'k': 0}, '1', 'incorrect'),
     spec('A = c × c : A en fonction de c', 0, {'k': 2}, '0', 'correct'),
     spec('Pommes 3 € : p = 3m', 1, {'k': 3}, '0', 'correct'),
     spec('Erreur : m = p/3 (à l\'envers)', 1, {'k': 3}, '2', 'incorrect'),
     spec('Erreur : p = m + 3', 1, {'k': 3}, '3', 'incorrect'),
     spec('Cinéma : le prix', 2, {}, '0', 'correct'),
     spec('Erreur : le nombre de places', 2, {}, '1', 'incorrect')],
    delay=30))

# --- 6. 5-098 : écrire une formule reliant deux grandeurs --------------------------------

FORMULE_DEF = ('**Écrire une formule.** On fait le calcul avec un exemple (pour $2$, pour $3$…),'
               ' puis on remplace le nombre par la lettre. On peut supprimer le signe $\\times$'
               ' devant une lettre : $3 \\times n$ s\'écrit $3n$.')

FORMULE_CAHIERS = variation(
    'Un cahier coûte $' + euros('{{k}}') + '$. Écris le prix $p$ à payer, en euros, pour $n$'
    ' cahiers.\n\n$p = ?$',
    [var('k', '2..9')], ['{{k}}n'],
    [FORMULE_DEF,
     'Pour $2$ cahiers : ${{k}} \\times 2$ ; pour $n$ cahiers : ${{k}} \\times n$, donc $p = '
     + col('{{k}}n') + '$.'])
FORMULE_ABONNEMENT = variation(
    'À la médiathèque, l\'inscription coûte $' + euros('{{a}}') + '$, puis chaque film emprunté'
    ' coûte $' + euros('{{b}}') + '$. Écris le prix $p$ à payer, en euros, pour $n$ films.'
    '\n\n$p = ?$',
    [var('a', '3..10'), var('b', '2..5')], ['{{a}}+{{b}}n'],
    [FORMULE_DEF,
     'Pour $3$ films : ${{a}} + {{b}} \\times 3$ ; pour $n$ films : ${{a}} + {{b}} \\times n$,'
     ' donc $p = ' + col('{{a}} + {{b}}n') + '$.'],
    ['a!=b'])
FORMULE_VITESSE = variation(
    'Une voiture roule toujours à ${{v}}~\\unit{km/h}$. Écris la distance $d$ parcourue, en'
    ' kilomètres, en $t$ heures.\n\n$d = ?$',
    [var('v', '50|60|70|80|90|110|130')], ['{{v}}t'],
    [FORMULE_DEF,
     'En $1$ h, elle parcourt ${{v}}$ km ; en $2$ h, ${{v}} \\times 2$ km ; en $t$ heures,'
     ' ${{v}} \\times t$ km, donc $d = ' + col('{{v}}t') + '$.'])
FORMULE_RECETTE = variation(
    'Une recette de crêpes demande ${{g}}~\\unit{g}$ de farine par personne. Écris la masse $m$'
    ' de farine, en grammes, pour $n$ personnes.\n\n$m = ?$',
    [var('g', '40|50|60|75|80|100')], ['{{g}}n'],
    [FORMULE_DEF,
     'Pour $4$ personnes : ${{g}} \\times 4$ ; pour $n$ personnes : ${{g}} \\times n$, donc'
     ' $m = ' + col('{{g}}n') + '$.'])

MODELES.append(modele(
    '06-ecrire-une-formule-deux-grandeurs', 'Écrire une formule reliant deux grandeurs',
    'Écrire la formule qui relie deux grandeurs dans un contexte concret : prix de n cahiers'
    ' (3n), inscription et films (5 + 2n), distance à vitesse constante (60t)',
    'Calcul littéral', 'Écrire', 'Formules', 5,
    [FORMULE_CAHIERS, FORMULE_ABONNEMENT, FORMULE_VITESSE, FORMULE_RECETTE],
    [spec('Cahiers à 3 € : 3n', 0, {'k': 3}, '3n', 'correct'),
     spec('Cahiers à 3 € : 3 × n', 0, {'k': 3}, '3\\times n', 'correct'),
     spec('Cahiers à 3 € : n × 3', 0, {'k': 3}, 'n\\times3', 'correct'),
     spec('Erreur : n + 3', 0, {'k': 3}, 'n+3', 'incorrect'),
     spec('Erreur : 3 (une valeur)', 0, {'k': 3}, '3', 'incorrect'),
     spec('Erreur : 3n² ', 0, {'k': 3}, '3n^2', 'incorrect'),
     spec('Médiathèque : 5 + 2n', 1, {'a': 5, 'b': 2}, '5+2n', 'correct'),
     spec('Médiathèque : 2n + 5', 1, {'a': 5, 'b': 2}, '2n+5', 'correct'),
     spec('Erreur : 7n', 1, {'a': 5, 'b': 2}, '7n', 'incorrect'),
     spec('Erreur : 5n + 2 (inversé)', 1, {'a': 5, 'b': 2}, '5n+2', 'incorrect'),
     spec('Erreur : 2n (oubli de l\'inscription)', 1, {'a': 5, 'b': 2}, '2n', 'incorrect'),
     spec('Voiture à 60 km/h : 60t', 2, {'v': 60}, '60t', 'correct'),
     spec('Erreur : 60 + t', 2, {'v': 60}, '60+t', 'incorrect'),
     spec('Erreur : t/60', 2, {'v': 60}, '\\frac{t}{60}', 'incorrect'),
     spec('Recette 50 g : 50n', 3, {'g': 50}, '50n', 'correct'),
     spec('Erreur : 50 + n', 3, {'g': 50}, '50+n', 'incorrect')],
    delay=60,
    # n × 3 est une écriture juste du produit : le signe × n'est pas compté comme une maladresse
    options={'constraints': {'products': 'off'}}))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

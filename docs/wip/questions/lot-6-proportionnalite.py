"""Écrit les 6 modèles du lot 6a « Pourcentages et proportionnalité » de la 6e dans
scripts/questions/6-proportionnalite/.

Phase 0 validée par David le 2026-10-29 (§ 13 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (6-139 : hérite de « general », pourcentages entre 0 et 100 % ; 6-140 : le
tout diviseur ou multiple de 100 ; 6-189 : grandeurs seulement, « prix au kilo », « par minute » ;
6-211 : double, quadruple, moitié, tiers, quart). Proportionnalité : grandeurs seulement, pas de
produit en croix, le coefficient n'est pas nommé. Un point par modèle ; le nœud et le tag sont posés
par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- choix en case choix (bloc ```choix, ADR 0033) ; le bon choix est le premier de la liste (indice 0),
  sauf en M6 v1 où l'indice est la relation tirée (`{{r}}`, sans `{{if:…}}`) ;
- pourcentage demandé en case de nombre : `$?\\,\\%$` (l'élève tape le nombre) ;
- montants en `\\unit{€}` (`en_unit`), sauf juste après une case (`?~\\text{€}` : case de nombre) ;
- niveaux à la suite des niveaux publiés (Pourcentages / Définition : 1 à 3 publiés) ; catégories
  neuves : Pourcentages / Proportion, Situations de proportionnalité / Définition et Relations
  multiplicatives.

    python3 docs/wip/questions/lot-6-proportionnalite.py scripts/questions
"""
import json
import os
import re
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-proportionnalite')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=30, options=None):
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
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


EURO = '~\\text{€}'
POURCENT = '\\,\\%'
MODELES = []

# --- 1. 6-139 : comprendre le sens d'un pourcentage ----------------------------------------

SENS = ('**Pourcentage.** ${{p}}' + POURCENT + '$ signifie « ${{p}}$ sur $100$ » : ${{p}}' + POURCENT
        + ' = ' + fr('{{p}}', '100') + '$.')
GROUPES = ['sont demi-pensionnaires', 'pratiquent un sport en club', 'viennent au collège à pied']

SENS_SUR_CENT = variation(
    'Dans un collège, ${{p}}' + POURCENT + '$ des élèves ' + selon('c', GROUPES) + '.\n\nCela'
    ' signifie que, sur $100$ élèves du collège, $?$ ' + selon('c', GROUPES) + '.',
    [var('c', '0..2'), var('p', '2..99')],
    ['{{p}}'],
    [SENS,
     'Sur $100$ élèves, $' + col('{{p}}') + '$ ' + selon('c', GROUPES) + '.'])

SENS_POURCENTAGE = variation(
    'Sur $100$ élèves d\'un collège, ${{n}}$ font du judo.\n\nQuel pourcentage des élèves font du'
    ' judo ?\n\n$$?' + POURCENT + '$$',
    [var('n', '2..99')],
    ['{{n}}'],
    ['**Pourcentage.** « ${{n}}$ sur $100$ », c\'est $' + fr('{{n}}', '100') + '$, c\'est-à-dire'
     ' ${{n}}' + POURCENT + '$.',
     '$' + col('{{n}}' + POURCENT) + '$ des élèves font du judo.'])

TOUT_MOITIE_RIEN = variation(
    selon('t', ['Tous les élèves de la classe ont rendu leur devoir.',
                'La moitié des élèves de la classe ont rendu leur devoir.',
                'Aucun élève de la classe n\'a rendu son devoir.'])
    + '\n\nQuel pourcentage des élèves de la classe ont rendu leur devoir ?\n\n$$?' + POURCENT
    + '$$',
    [var('t', '0..2')],
    ['{{eval:100-50*t}}'],
    ['**Pourcentage.** Tous, c\'est « $100$ sur $100$ » ; la moitié, « $50$ sur $100$ » ; aucun,'
     ' « $0$ sur $100$ ».',
     selon('t', ['Tous les élèves', 'La moitié des élèves', 'Aucun élève'])
     + ' : $' + col('{{solution}}' + POURCENT) + '$.'])

MODELES.append(modele(
    '01-comprendre-le-sens-d-un-pourcentage', 'Comprendre le sens d\'un pourcentage',
    'Lire un pourcentage comme « tant sur 100 » : 35 % des élèves, c\'est 35 élèves sur 100 ;'
    ' tous = 100 %, la moitié = 50 %, aucun = 0 %',
    'Proportionnalité', 'Pourcentages', 'Définition', 4,
    [SENS_SUR_CENT, SENS_POURCENTAGE, TOUT_MOITIE_RIEN],
    [spec('35 % : 35 élèves sur 100', 0, {'c': 0, 'p': 35}, '35', 'correct'),
     spec('Erreur : 0,35', 0, {'c': 0, 'p': 35}, '0,35', 'incorrect'),
     spec('Erreur : 3,5', 0, {'c': 0, 'p': 35}, '3,5', 'incorrect'),
     spec('23 sur 100 : 23 %', 1, {'n': 23}, '23', 'correct'),
     spec('Erreur : 0,23', 1, {'n': 23}, '0,23', 'incorrect'),
     spec('Tous : 100 %', 2, {'t': 0}, '100', 'correct'),
     spec('La moitié : 50 %', 2, {'t': 1}, '50', 'correct'),
     spec('Erreur : 0,5 pour la moitié', 2, {'t': 1}, '0,5', 'incorrect'),
     spec('Aucun : 0 %', 2, {'t': 2}, '0', 'correct')]))

# --- 2-3. 6-140 : exprimer une proportion en pourcentage -----------------------------------

PROPORTION = ('**Proportion en pourcentage.** On écrit la proportion (la partie sur le tout) sous'
              ' forme d\'une fraction, puis on cherche la fraction égale de dénominateur $100$.')
CONTEXTES_PETITS = [
    ('Dans un sac de ${{d}}$ billes, ${{a}}$ sont rouges.',
     'Quel pourcentage des billes sont rouges ?', 'des billes sont rouges'),
    ('Sur un parking de ${{d}}$ places, ${{a}}$ sont occupées.',
     'Quel pourcentage des places sont occupées ?', 'des places sont occupées')]
CONTEXTES_GRANDS = [
    ('Un collège compte ${{d}}$ élèves ; ${{a}}$ d\'entre eux viennent en bus.',
     'Quel pourcentage des élèves viennent en bus ?', 'des élèves viennent en bus'),
    ('Un festival a accueilli ${{d}}$ spectateurs ; ${{a}}$ d\'entre eux avaient moins de'
     ' $18$ ans.',
     'Quel pourcentage des spectateurs avaient moins de $18$ ans ?',
     'des spectateurs avaient moins de $18$ ans')]


def enonce(contextes):
    return (selon('c', [c[0] for c in contextes]) + '\n\n' + selon('c', [c[1] for c in contextes])
            + '\n\n$$?' + POURCENT + '$$')


def conclusion(contextes):
    return '$' + col('{{solution}}' + POURCENT) + '$ ' + selon('c', [c[2] for c in contextes]) + '.'


PROPORTION_PETIT_TOUT = variation(
    enonce(CONTEXTES_PETITS),
    [var('c', '0..1'), var('d', '10|20|25|50'), var('k', 'eval:100/d'), var('a', '2..49')],
    ['{{eval:a*k}}'],
    [PROPORTION,
     '$$' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{a}} \\times {{k}}', '{{d}} \\times {{k}}') + ' = '
     + fr('{{eval:a*k}}', '100') + '$$',
     conclusion(CONTEXTES_PETITS)],
    ['a<d'])

PROPORTION_GRAND_TOUT = variation(
    enonce(CONTEXTES_GRANDS),
    [var('c', '0..1'), var('d', '200|300|400|500'), var('m', 'eval:d/100'), var('p', '1..99'),
     var('a', 'eval:p*m')],
    ['{{p}}'],
    [PROPORTION,
     '$$' + fr('{{a}}', '{{d}}') + ' = ' + fr('{{a}} \\div {{m}}', '{{d}} \\div {{m}}') + ' = '
     + fr('{{p}}', '100') + '$$',
     conclusion(CONTEXTES_GRANDS)])

MODELES.append(modele(
    '02-exprimer-une-proportion-en-pourcentage-tout-diviseur-de-100',
    'Exprimer une proportion en pourcentage (tout diviseur de 100)',
    'Écrire la partie sur le tout, puis la fraction égale sur 100 : 7 billes sur 20, c\'est'
    ' 35/100, soit 35 % (le tout vaut 10, 20, 25 ou 50)',
    'Proportionnalité', 'Pourcentages', 'Proportion', 1,
    [PROPORTION_PETIT_TOUT],
    [spec('7 sur 20 : 35 %', 0, {'c': 0, 'd': 20, 'k': 5, 'a': 7}, '35', 'correct'),
     spec('Erreur : 7 (la partie)', 0, {'c': 0, 'd': 20, 'k': 5, 'a': 7}, '7', 'incorrect'),
     spec('Erreur : 0,35', 0, {'c': 0, 'd': 20, 'k': 5, 'a': 7}, '0,35', 'incorrect'),
     spec('Erreur : 13 (20 − 7)', 0, {'c': 0, 'd': 20, 'k': 5, 'a': 7}, '13', 'incorrect'),
     spec('9 sur 25 : 36 %', 0, {'c': 1, 'd': 25, 'k': 4, 'a': 9}, '36', 'correct')]))

MODELES.append(modele(
    '03-exprimer-une-proportion-en-pourcentage-tout-multiple-de-100',
    'Exprimer une proportion en pourcentage (tout multiple de 100)',
    'Écrire la partie sur le tout, puis la simplifier en une fraction sur 100 : 120 élèves sur'
    ' 400, c\'est 30/100, soit 30 % (le tout vaut 200, 300, 400 ou 500)',
    'Proportionnalité', 'Pourcentages', 'Proportion', 2,
    [PROPORTION_GRAND_TOUT],
    [spec('120 sur 400 : 30 %', 0, {'c': 0, 'd': 400, 'm': 4, 'p': 30, 'a': 120}, '30', 'correct'),
     spec('Erreur : 120 (la partie)', 0, {'c': 0, 'd': 400, 'm': 4, 'p': 30, 'a': 120}, '120',
          'incorrect'),
     spec('Erreur : 0,3', 0, {'c': 0, 'd': 400, 'm': 4, 'p': 30, 'a': 120}, '0,3', 'incorrect'),
     spec('Erreur : 3 (400 ÷ 120 arrondi)', 0, {'c': 0, 'd': 400, 'm': 4, 'p': 30, 'a': 120}, '3',
          'incorrect'),
     spec('111 sur 300 : 37 %', 0, {'c': 1, 'd': 300, 'm': 3, 'p': 37, 'a': 111}, '37',
          'correct')]))

# --- 4-5. 6-189 : définition de la proportionnalité, expressions de la vie courante --------

DEFINITION = ('**Proportionnalité.** Deux grandeurs sont proportionnelles quand on obtient l\'une'
              ' en multipliant l\'autre par un même nombre : si l\'une est multipliée (ou divisée)'
              ' par un nombre, l\'autre est multipliée (ou divisée) par le même nombre.')
# (phrase, première grandeur, accord de la première, seconde grandeur, accord de la seconde)
SITUATIONS = [
    ('Au marché, le prix des pommes est proportionnel à leur masse.', 'la masse', 'e', 'le prix', ''),
    ('Un cycliste roule toujours à la même vitesse : la distance parcourue est proportionnelle à la'
     ' durée du trajet.', 'la durée', 'e', 'la distance', 'e'),
    ('À la papeterie, le prix à payer est proportionnel au nombre de cahiers achetés.',
     'le nombre de cahiers', '', 'le prix', '')]


def situation(i):
    return selon('g', [s[i] for s in SITUATIONS])


EFFET_MULTIPLIER = variation(
    situation(0) + '\n\nQuand ' + situation(1) + ' est multiplié' + situation(2) + ' par ${{k}}$, '
    + situation(3) + ' est :'
    + choix(['multiplié' + situation(4) + ' par ${{k}}$', 'augmenté' + situation(4) + ' de ${{k}}$',
             'divisé' + situation(4) + ' par ${{k}}$', 'le même']),
    [var('g', '0..2'), var('k', '2..5')],
    ['0'],
    [DEFINITION,
     'Quand ' + situation(1) + ' est multiplié' + situation(2) + ' par ${{k}}$, ' + situation(3)
     + ' est $' + col('\\text{multiplié' + situation(4) + ' par } {{k}}') + '$.'])

EFFET_DIVISER = variation(
    situation(0) + '\n\nQuand ' + situation(1) + ' est divisé' + situation(2) + ' par ${{k}}$, '
    + situation(3) + ' est :'
    + choix(['divisé' + situation(4) + ' par ${{k}}$', 'diminué' + situation(4) + ' de ${{k}}$',
             'multiplié' + situation(4) + ' par ${{k}}$', 'le même']),
    [var('g', '0..2'), var('k', '2..4')],
    ['0'],
    [DEFINITION,
     'Quand ' + situation(1) + ' est divisé' + situation(2) + ' par ${{k}}$, ' + situation(3)
     + ' est $' + col('\\text{divisé' + situation(4) + ' par } {{k}}') + '$.'])

MODELES.append(modele(
    '04-reconnaitre-la-proportionnalite-par-son-effet',
    'Reconnaître la proportionnalité par son effet',
    'Deux grandeurs proportionnelles : quand l\'une est multipliée (ou divisée) par un nombre,'
    ' l\'autre l\'est aussi par le même nombre (et non augmentée de ce nombre)',
    'Proportionnalité', 'Situations de proportionnalité', 'Définition', 1,
    [EFFET_MULTIPLIER, EFFET_DIVISER],
    [spec('Masse × 3 : prix × 3', 0, {'g': 0, 'k': 3}, '0', 'correct'),
     spec('Erreur : augmenté de 3', 0, {'g': 0, 'k': 3}, '1', 'incorrect'),
     spec('Erreur : le même', 0, {'g': 1, 'k': 3}, '3', 'incorrect'),
     spec('Durée ÷ 2 : distance ÷ 2', 1, {'g': 1, 'k': 2}, '0', 'correct'),
     spec('Erreur : diminuée de 2', 1, {'g': 1, 'k': 2}, '1', 'incorrect')]))

FRUITS = ['pommes', 'poires', 'tomates']
PAR_UNITE = ('**« Prix au kilo », « par minute ».** Ces expressions donnent la quantité pour une'
             ' unité : le prix de $1~\\unit{kg}$, le nombre de battements en $1$ minute.')

PRIX_AU_KILO_SENS = variation(
    'Au marché, les ' + selon('f', FRUITS) + ' coûtent ${{p}}~\\unit{€}$ le kilo.\n\nCela signifie'
    ' que :'
    + choix(['$1~\\unit{kg}$ de ' + selon('f', FRUITS) + ' coûte ${{p}}~\\unit{€}$',
             '${{p}}~\\unit{kg}$ de ' + selon('f', FRUITS) + ' coûtent $1~\\unit{€}$',
             'le cageot de ' + selon('f', FRUITS) + ' coûte ${{p}}~\\unit{€}$',
             'le prix ne dépend pas de la masse achetée']),
    [var('f', '0..2'), var('p', '2..6')],
    ['0'],
    [PAR_UNITE,
     '« ${{p}}~\\unit{€}$ le kilo » : $' + col('1~\\unit{kg} \\text{ coûte } {{p}}~\\unit{€}')
     + '$. Le prix payé est proportionnel à la masse achetée.'])

PAR_MINUTE = variation(
    'Au repos, le cœur de Léa bat ${{b}}$ fois par minute.\n\nCombien de fois bat-il en ${{n}}$'
    ' minutes ?\n\n$$?$$',
    [var('b', '60..80'), var('n', '2..5')],
    ['{{eval:b*n}}'],
    [PAR_UNITE,
     'En $1$ minute, ${{b}}$ battements ; en ${{n}}$ minutes, ${{n}}$ fois plus :',
     '$${{b}} \\times {{n}} = ' + col('{{solution}}') + '$$'])

TROUVER_PRIX_AU_KILO = variation(
    'Au marché, ${{m}}~\\unit{kg}$ de ' + selon('f', FRUITS) + ' coûtent ${{t}}~\\unit{€}$.\n\n'
    'Quel est le prix au kilo ?\n\n$$?' + EURO + '$$',
    [var('f', '0..2'), var('m', '2..6'), var('p', '2..9'), var('t', 'eval:m*p')],
    ['{{p}}'],
    [PAR_UNITE,
     'Le prix au kilo, c\'est le prix de $1~\\unit{kg}$ : ${{m}}$ fois moins que pour'
     ' ${{m}}~\\unit{kg}$.',
     '$${{t}} \\div {{m}} = ' + col('{{solution}}') + '$$',
     'Le prix au kilo est de ${{p}}~\\unit{€}$.'])

MODELES.append(modele(
    '05-comprendre-prix-au-kilo-et-par-minute', 'Comprendre « prix au kilo » et « par minute »',
    'Relier les expressions de la vie courante à la proportionnalité : « 3 € le kilo », c\'est'
    ' le prix de 1 kg ; 70 battements par minute, c\'est 210 en 3 minutes ; 15 € pour 5 kg,'
    ' c\'est 3 € le kilo',
    'Proportionnalité', 'Situations de proportionnalité', 'Définition', 2,
    [PRIX_AU_KILO_SENS, PAR_MINUTE, TROUVER_PRIX_AU_KILO],
    [spec('3 € le kilo : 1 kg coûte 3 €', 0, {'f': 0, 'p': 3}, '0', 'correct'),
     spec('Erreur : 3 kg coûtent 1 €', 0, {'f': 0, 'p': 3}, '1', 'incorrect'),
     spec('70 par minute, 3 minutes : 210', 1, {'b': 70, 'n': 3}, '210', 'correct'),
     spec('Erreur : 73 (70 + 3)', 1, {'b': 70, 'n': 3}, '73', 'incorrect'),
     spec('15 € pour 5 kg : 3 € le kilo', 2, {'f': 0, 'm': 5, 'p': 3, 't': 15}, '3', 'correct'),
     spec('Erreur : 75 (15 × 5)', 2, {'f': 0, 'm': 5, 'p': 3, 't': 15}, '75', 'incorrect'),
     spec('Erreur : 10 (15 − 5)', 2, {'f': 0, 'm': 5, 'p': 3, 't': 15}, '10', 'incorrect')]))

# --- 6. 6-211 : relations multiplicatives simples ------------------------------------------

# r : 0 double, 1 quadruple, 2 moitié, 3 tiers, 4 quart. Le grand nombre A, le petit B :
# double et quadruple → A = 2n ou 4n, B = n ; moitié, tiers, quart → A = n, B = 2n, 3n ou 4n.
RELATIONS = ['le double', 'le quadruple', 'la moitié', 'le tiers', 'le quart']
A = '{{if:r<2|{{eval:(2+2*r)*n}}|{{n}}}}'
B = '{{if:r<2|{{n}}|{{eval:r*n}}}}'
REL = ('**Relations.** Le double : $\\times 2$ ; le quadruple : $\\times 4$ ; la moitié :'
       ' $\\div 2$ ; le tiers : $\\div 3$ ; le quart : $\\div 4$.')
CALCUL = selon('r', [A + ' = ' + B + ' \\times 2', A + ' = ' + B + ' \\times 4',
                     A + ' = ' + B + ' \\div 2', A + ' = ' + B + ' \\div 3',
                     A + ' = ' + B + ' \\div 4'])

RELATION_NOMMER = variation(
    'Quel mot manque ?\n\n$$' + A + ' \\text{ est } \\ldots \\text{ de } ' + B + '$$'
    + choix(RELATIONS + ['le triple']),
    [var('r', '0..4'), var('n', '3..25')],
    ['{{r}}'],
    [REL,
     '$$' + CALCUL + '$$',
     '$' + A + '$ est $' + col('\\text{' + selon('r', RELATIONS) + '}') + '$ de $' + B + '$.'])

RELATION_RETROUVER = variation(
    'Complète.\n\n$$' + A + ' \\text{ est ' + selon('r', RELATIONS) + ' de } ?$$',
    [var('r', '0..4'), var('n', '3..25')],
    ['{{if:r<2|{{n}}|{{eval:r*n}}}}'],
    [REL,
     selon('r', ['Le nombre cherché est $2$ fois plus petit que $' + A + '$.',
                 'Le nombre cherché est $4$ fois plus petit que $' + A + '$.',
                 'Le nombre cherché est $2$ fois plus grand que $' + A + '$.',
                 'Le nombre cherché est $3$ fois plus grand que $' + A + '$.',
                 'Le nombre cherché est $4$ fois plus grand que $' + A + '$.']),
     '$$' + selon('r', [A + ' \\div 2', A + ' \\div 4', A + ' \\times 2', A + ' \\times 3',
                        A + ' \\times 4']) + ' = ' + col('{{solution}}') + '$$'])

MODELES.append(modele(
    '06-reperer-double-moitie-quadruple-quart-tiers',
    'Repérer double, moitié, quadruple, quart et tiers',
    'Nommer la relation entre deux nombres (12 est le tiers de 36) ou retrouver le nombre'
    ' (12 est le tiers de 36 : 12 × 3)',
    'Proportionnalité', 'Situations de proportionnalité', 'Relations multiplicatives', 1,
    [RELATION_NOMMER, RELATION_RETROUVER],
    [spec('12 est le tiers de 36', 0, {'r': 3, 'n': 12}, '3', 'correct'),
     spec('Erreur : le triple (sens inversé)', 0, {'r': 3, 'n': 12}, '5', 'incorrect'),
     spec('24 est le double de 12', 0, {'r': 0, 'n': 12}, '0', 'correct'),
     spec('Erreur : la moitié (sens inversé)', 0, {'r': 0, 'n': 12}, '2', 'incorrect'),
     spec('12 est le tiers de 36', 1, {'r': 3, 'n': 12}, '36', 'correct'),
     spec('Erreur : 4 (12 ÷ 3)', 1, {'r': 3, 'n': 12}, '4', 'incorrect'),
     spec('40 est le quadruple de 10', 1, {'r': 1, 'n': 10}, '10', 'correct'),
     spec('Erreur : 160 (40 × 4)', 1, {'r': 1, 'n': 10}, '160', 'incorrect')]))

# case de nombre (l'unité est écrite, l'élève ne la tape pas)
GRANDEUR_TEXTE = re.compile(r'(?<!\?)~\\text\{(€)\}')


def en_unit(texte):
    return GRANDEUR_TEXTE.sub(lambda g: '~\\unit{' + g.group(1) + '}', texte)


for _, m in MODELES:
    for v in m['variations']:
        v['statement'] = en_unit(v['statement'])
        v['correction']['steps'] = [en_unit(x) for x in v['correction']['steps']]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

"""Écrit les 6 modèles du lot 13 « Schémas en barres » de la 6e dans
scripts/questions/6-schemas-en-barres/.

Phase 0 validée par David le 2026-11-12 (§ 30 du journal `docs/wip/questions-6-progress.md`).
Point 6-142, aucune borne propre ; cadre du § 29 point 5 : entiers, résultats entiers < 1 000,
longueurs des segments écrites ici (fixes par variation, jamais calculées sur les nombres). Le
nœud et le tag sont posés par la migration de rangement, après la création des brouillons.

Décisions et pièges :
- les inconnues sont tirées d'abord, les totaux en sont calculés (aucune divisibilité à vérifier) ;
- nombre de parts variable (n, a de 2 à 6) : segments ajoutés par `{{if:…| ; ?|}}` ;
- (1) choix entre trois schémas : bon schéma à l'indice 0, choix mélangés ; clôture ```` (un
  choix contient un bloc) ;
- (3) v2 : pas d'accolade sur une partie de barre (§ 30, question 1) : l'écart est dans l'énoncé ;
- corrigé : le schéma rempli (les `?` remplacés par les valeurs), puis les calculs.

    python3 docs/wip/questions/lot-13-schemas-en-barres.py scripts/questions
"""
import json
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-schemas-en-barres')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=120):
    m = {'title': title, 'description': description, 'grades': ['6'], 'level': level,
         'delay': delay,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
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


def schema(lignes, retrait=''):
    corps = ['```schema-barres'] + lignes + ['```']
    return '\n'.join(retrait + l if i else l for i, l in enumerate(corps))


def bloc(lignes):
    return '\n\n' + schema(lignes) + '\n\n'


def parts(n, etiquette='?', longueur=None, mini=2, maxi=6):
    """`? ; ? ; …` : n segments (n variable de mini à maxi)."""
    seg = etiquette + ('' if longueur is None else ' (' + longueur + ')')
    texte = ' ; '.join([seg] * mini)
    for k in range(mini, maxi):
        texte += '{{if:' + n + '>' + str(k) + '| ; ' + seg + '|}}'
    return texte


def choix_schemas(schemas):
    lignes = ['````choix']
    for s in schemas:
        lignes.append('- ' + schema(s, '  '))
    lignes.append('````')
    return '\n\n' + '\n'.join(lignes)


MODELES = []

# --- 1. Choisir le schéma -----------------------------------------------------------------------
# p = la petite part, d = l'écart, total 2p + d. v1 : Léa en a d de plus que Tom (Tom = petite
# barre) ; v2 : Léa en a d de moins que Tom (Léa = petite barre).

VARS_1 = [var('p', '10..300'), var('d', '2..90')]
COND_1 = ['2*p+d<1000', 'p>=2*d', 'd*6>=p']
TOTAL_1 = '{{eval:2*p+d}}'


def choisir(petit, grand, objet, relation):
    bon = [petit + ' : ? (3)', grand + ' : ? (3) ; {{d}} (1)', 'total : ' + TOTAL_1]
    mauvaise_barre = [petit + ' : ? (3) ; {{d}} (1)', grand + ' : ? (3)',
                      'total : ' + TOTAL_1]
    inverse = [petit + ' : ? (3)', grand + ' : ? (3) ; ' + TOTAL_1 + ' (1)',
               'total : {{d}}']
    enonce = ('Léa et Tom ont $' + TOTAL_1 + '$ ' + objet + ' en tout. ' + relation
              + '\n\nQuel schéma traduit cet énoncé ?' + choix_schemas([bon, mauvaise_barre,
                                                                      inverse]))
    etapes = ['**Le tout.** Les deux barres ensemble font $' + TOTAL_1 + '$ ' + objet
              + ' : l\'accolade, à droite, embrasse les deux barres.',
              '**L\'écart.** ' + grand + ' en a ${{d}}$ de plus que ' + petit + ' : c\'est la barre de '
              + grand + ' qui dépasse de ${{d}}$.' + bloc(bon)]
    return enonce, etapes


e1, s1 = choisir('Tom', 'Léa', 'billes', 'Léa en a ${{d}}$ de plus que Tom.')
e2, s2 = choisir('Léa', 'Tom', 'cartes', 'Léa en a ${{d}}$ de moins que Tom.')
MODELES.append(modele(
    '01-choisir-le-schema', 'Schéma en barres : choisir le schéma d\'un énoncé',
    'Somme et différence de deux quantités : choisir parmi trois schémas en barres celui qui'
    ' traduit l\'énoncé (écart « de plus » ou « de moins »)', 1,
    [variation(e1, VARS_1, ['0'], s1, COND_1), variation(e2, VARS_1, ['0'], s2, COND_1)],
    [spec('Bon schéma', 0, {'p': 36, 'd': 12}, '0', 'correct'),
     spec('Erreur : écart sur la barre de Tom', 0, {'p': 36, 'd': 12}, '1', 'incorrect'),
     spec('Erreur : écart et total inversés', 0, {'p': 36, 'd': 12}, '2', 'incorrect'),
     spec('« de moins » : bon schéma', 1, {'p': 50, 'd': 25}, '0', 'correct'),
     spec('« de moins » : écart sur la barre de Léa', 1, {'p': 50, 'd': 25}, '1', 'incorrect')]))

# --- 2. Somme et différence, schéma donné -------------------------------------------------------

VARS_2 = [var('p', '10..400'), var('d', '2..150')]
COND_2 = ['2*p+d<1000', 'p>=d', 'd*4>=p']
S2 = '{{eval:2*p+d}}'


def somme_difference(enonce, petit, grand, unite, question):
    lignes = [petit + ' : ? (3)', grand + ' : ? (3) ; {{d}} (1,5)', 'total : ' + S2 + unite]
    rempli = [petit + ' : {{p}} (3)', grand + ' : {{p}} (3) ; {{d}} (1,5)',
              'total : ' + S2 + unite]
    etapes = ['**Deux parts égales.** On enlève l\'écart du total : $' + S2 + ' - {{d}} = '
              '{{eval:2*p}}$. Il reste deux barres égales.',
              '**Une part.** ${{eval:2*p}} \\div 2 = ' + col('{{p}}') + '$.',
              '**L\'autre part.** ${{p}} + {{d}} = ' + col('{{eval:p+d}}') + '$.' + bloc(rempli)]
    return variation(enonce + bloc(lignes) + question, VARS_2, ['{{p}}', '{{eval:p+d}}'],
                     etapes, COND_2)


MODELES.append(modele(
    '02-somme-et-difference', 'Schéma en barres : somme et différence',
    'Deux quantités dont on connaît la somme et la différence, schéma en barres donné : trouver'
    ' chacune (deux personnes, ou un ruban coupé en deux morceaux)', 1,
    [somme_difference('Hugo et Nina ont ' + S2 + ' cartes à eux deux. Nina en a ${{d}}$ de plus'
                      ' que Hugo.', 'Hugo', 'Nina', '',
                      'Combien de cartes chacun a-t-il ?\n\nHugo : $?$ cartes\n\nNina : $?$ cartes'),
     somme_difference('Un ruban de $' + S2 + '$ cm est coupé en deux morceaux. Le grand morceau'
                      ' mesure ${{d}}$ cm de plus que le petit.', 'Petit', 'Grand', ' cm',
                      'Combien mesure chaque morceau ?\n\nPetit morceau : $?$ cm\n\n'
                      'Grand morceau : $?$ cm')],
    [spec('84 cartes, écart 12 : 36 et 48', 0, {'p': 36, 'd': 12}, ['36', '48'], 'correct'),
     spec('Erreur : moitié du total', 0, {'p': 36, 'd': 12}, ['42', '42'], 'incorrect'),
     spec('Erreur : total moins l\'écart non partagé', 0, {'p': 36, 'd': 12}, ['72', '84'],
          'incorrect'),
     spec('Ruban de 150 cm, écart 30 : 60 et 90', 1, {'p': 60, 'd': 30}, ['60', '90'], 'correct'),
     spec('Erreur : morceaux inversés', 1, {'p': 60, 'd': 30}, ['90', '60'], 'incorrect')]))

# --- 3. « n fois plus » -------------------------------------------------------------------------

VARS_3 = [var('n', '2..5'), var('t', '3..150')]


def fois_plus(enonce, cond, etapes_calc):
    lignes = ['Tom : ?', 'Léa : ' + parts('n', mini=2, maxi=5)]
    rempli = ['Tom : {{t}}', 'Léa : ' + parts('n', '{{t}}', mini=2, maxi=5)]
    question = ('Combien de timbres chacun a-t-il ?\n\nTom : $?$ timbres\n\nLéa : $?$ timbres')
    return variation(enonce + bloc(lignes) + question, VARS_3, ['{{t}}', '{{eval:n*t}}'],
                     etapes_calc + ['**Léa.** ${{n}} \\times {{t}} = ' + col('{{eval:n*t}}') + '$.'
                                    + bloc(rempli)], cond)


MODELES.append(modele(
    '03-n-fois-plus', 'Schéma en barres : « n fois plus »',
    'Une quantité vaut n fois l\'autre (n de 2 à 5), on connaît leur somme ou leur différence :'
    ' trouver les deux quantités à l\'aide du schéma en barres', 1,
    [fois_plus('Léa a ${{n}}$ fois plus de timbres que Tom. À eux deux, ils ont'
               ' ${{eval:(n+1)*t}}$ timbres.', ['(n+1)*t<1000'],
               ['**Les parts.** Tom a une part, Léa en a ${{n}}$ : ${{eval:n+1}}$ parts égales en'
                ' tout.',
                '**Une part.** ${{eval:(n+1)*t}} \\div {{eval:n+1}} = ' + col('{{t}}')
                + '$ : c\'est le nombre de timbres de Tom.']),
     fois_plus('Léa a ${{n}}$ fois plus de timbres que Tom, soit ${{eval:(n-1)*t}}$ timbres de'
               ' plus que lui.', ['n*t<1000'],
               ['**L\'écart.** La barre de Léa dépasse celle de Tom '
                + '{{if:n>2|de ${{eval:n-1}}$ parts : ces ${{eval:n-1}}$ parts font|d\'une part :'
                ' cette part fait}}' + ' ${{eval:(n-1)*t}}$ timbres.',
                '**Une part.** ' + '{{if:n>2|${{eval:(n-1)*t}} \\div {{eval:n-1}} = '
                + col('{{t}}') + '$|Une part vaut ' + '$' + col('{{t}}') + '$}}'
                + ' : c\'est le nombre de timbres de Tom.'])],
    [spec('n = 3, 4 parts de 25 : 25 et 75', 0, {'n': 3, 't': 25}, ['25', '75'], 'correct'),
     spec('Erreur : total ÷ n', 0, {'n': 3, 't': 25}, ['33', '67'], 'incorrect'),
     spec('n = 2, 3 parts de 150 : 150 et 300', 0, {'n': 2, 't': 150}, ['150', '300'], 'correct'),
     spec('Écart 60, n = 4 : 20 et 80', 1, {'n': 4, 't': 20}, ['20', '80'], 'correct'),
     spec('Erreur : écart ÷ n', 1, {'n': 4, 't': 20}, ['15', '60'], 'incorrect'),
     spec('n = 2 : l\'écart est une part', 1, {'n': 2, 't': 40}, ['40', '80'], 'correct')]))

# --- 4. Trois parts avec écarts -----------------------------------------------------------------
# v1 (source) : or = argent + u, bronze = argent - v ; inconnue de base : argent a.
# v2 (chaîne) : argent = bronze + v, or = argent + u ; inconnue de base : bronze b.

QUESTION_4 = ('Quelle est la prime de chacun ?\n\nOr : $?$ €\n\nArgent : $?$ €\n\nBronze : $?$ €')
INTRO_4 = ('Une prime totale de ${{T}}$ € est partagée entre les trois premiers d\'une course : la'
           ' prime d\'or, la prime d\'argent et la prime de bronze. ')

V1_LIGNES = ['Or : ? (4) ; {{u}} (2)', 'Argent : ? (4)', 'Bronze : ? (2,5) ; -{{v}} (1,5)',
             'total : {{T}} €']
V1_REMPLI = ['Or : {{a}} (4) ; {{u}} (2)', 'Argent : {{a}} (4)',
             'Bronze : {{eval:a-v}} (2,5) ; -{{v}} (1,5)', 'total : {{T}} €']
V2_LIGNES = ['Or : ? (3) ; {{v}} (1,5) ; {{u}} (1,5)', 'Argent : ? (3) ; {{v}} (1,5)',
             'Bronze : ? (3)', 'total : {{T}} €']
V2_REMPLI = ['Or : {{b}} (3) ; {{v}} (1,5) ; {{u}} (1,5)', 'Argent : {{b}} (3) ; {{v}} (1,5)',
             'Bronze : {{b}} (3)', 'total : {{T}} €']

MODELES.append(modele(
    '04-trois-parts-avec-ecarts', 'Schéma en barres : trois parts avec des écarts',
    'Un total partagé en trois parts liées par des écarts (« de plus », « de moins »), comme les'
    ' primes d\'une course : trouver les trois parts à l\'aide du schéma en barres', 2,
    [variation(INTRO_4 + 'La prime d\'or vaut ${{u}}$ € de plus que la prime d\'argent, et la prime'
               ' de bronze ${{v}}$ € de moins que la prime d\'argent.' + bloc(V1_LIGNES)
               + QUESTION_4,
               [var('a', '30..300'), var('u', '5..90'), var('v', '5..90'),
                var('T', 'eval:3*a+u-v')], ['{{eval:a+u}}', '{{a}}', '{{eval:a-v}}'],
               ['**Trois parts égales.** Si l\'on enlève les ${{u}}$ € de l\'or et qu\'on ajoute les'
                ' ${{v}}$ € qui manquent au bronze, les trois barres sont égales : $' '{{T}} - {{u}}'
                ' + {{v}} = {{eval:3*a}}$.',
                '**L\'argent.** ${{eval:3*a}} \\div 3 = ' + col('{{a}}') + '$ €.',
                '**L\'or et le bronze.** ${{a}} + {{u}} = ' + col('{{eval:a+u}}') + '$ € et'
                ' ${{a}} - {{v}} = ' + col('{{eval:a-v}}') + '$ €.' + bloc(V1_REMPLI)],
               ['a-v>=10', 'a>=u', 'a>=v', 'u*5>=a', 'v*5>=a', '3*a+u-v<1000']),
     variation(INTRO_4 + 'La prime d\'or vaut ${{u}}$ € de plus que la prime d\'argent, et la prime'
               ' d\'argent ${{v}}$ € de plus que la prime de bronze.' + bloc(V2_LIGNES)
               + QUESTION_4,
               [var('b', '10..250'), var('u', '5..90'), var('v', '5..90'),
                var('T', 'eval:3*b+2*v+u')], ['{{eval:b+v+u}}', '{{eval:b+v}}', '{{b}}'],
               ['**Trois parts égales.** On enlève les écarts : ${{v}}$ € à l\'argent, ${{v}}$ € et'
                ' ${{u}}$ € à l\'or : ${{T}} - {{v}} - {{v}} - {{u}} = {{eval:3*b}}$.',
                '**Le bronze.** ${{eval:3*b}} \\div 3 = ' + col('{{b}}') + '$ €.',
                '**L\'argent et l\'or.** ${{b}} + {{v}} = ' + col('{{eval:b+v}}') + '$ € et'
                ' ${{eval:b+v}} + {{u}} = ' + col('{{eval:b+v+u}}') + '$ €.' + bloc(V2_REMPLI)],
               ['3*b+2*v+u<1000', 'b>=u', 'b>=v', 'u*4>=b', 'v*4>=b'])],
    [spec('Source : 320 €, +70, -80 : 180, 110, 30', 0,
          {'a': 110, 'u': 70, 'v': 80, 'T': 320}, ['180', '110', '30'], 'correct'),
     spec('Erreur : partage égal', 0, {'a': 110, 'u': 70, 'v': 80, 'T': 320},
          ['107', '107', '106'], 'incorrect'),
     spec('Erreur : bronze compté « de plus »', 0, {'a': 110, 'u': 70, 'v': 80, 'T': 320},
          ['127', '57', '137'], 'incorrect'),
     spec('Chaîne : 300 €, +40, +20 : 140, 100, 80', 1,
          {'b': 80, 'u': 40, 'v': 20, 'T': 300}, ['140', '100', '80'], 'correct'),
     spec('Erreur : or et bronze inversés', 1, {'b': 80, 'u': 40, 'v': 20, 'T': 300},
          ['80', '100', '140'], 'incorrect')]))

# --- 5. Deux lignes -----------------------------------------------------------------------------
# x = le petit prix (segment de longueur 1), y = le grand (longueur 1,5), x < y.

VARS_5 = [var('x', '1..20'), var('y', '2..30')]
COND_5 = ['x<y', 'y<=2*x']

L5_V1 = ['Achat 1 : S ; S ; S ; C (1,5) = {{eval:3*x+y}} €', 'Achat 2 : S ; C (1,5) = {{eval:x+y}} €']
R5_V1 = ['Achat 1 : {{x}} ; {{x}} ; {{x}} ; {{y}} (1,5) = {{eval:3*x+y}} €',
         'Achat 2 : {{x}} ; {{y}} (1,5) = {{eval:x+y}} €']
L5_V2 = ['Achat 1 : A ; A ; A ; A ; P (1,5) = {{eval:4*x+y}} €',
         'Achat 2 : A ; A ; P (1,5) ; P (1,5) = {{eval:2*x+2*y}} €']
R5_V2 = ['Achat 1 : {{x}} ; {{x}} ; {{x}} ; {{x}} ; {{y}} (1,5) = {{eval:4*x+y}} €',
         'Achat 2 : {{x}} ; {{x}} ; {{y}} (1,5) ; {{y}} (1,5) = {{eval:2*x+2*y}} €']

MODELES.append(modele(
    '05-deux-lignes', 'Schéma en barres : deux achats pour deux prix',
    'Deux achats de deux articles en quantités différentes, schéma en barres donné : trouver le prix'
    ' de chaque article (différence des deux lignes, ou moitié d\'une ligne puis différence)', 2,
    [variation('3 stylos et 1 cahier coûtent ${{eval:3*x+y}}$ €. 1 stylo et 1 cahier coûtent'
               ' ${{eval:x+y}}$ €. Les stylos ont tous le même prix, les cahiers aussi.\n\n'
               'Sur le schéma, S est le prix d\'un stylo et C celui d\'un cahier.' + bloc(L5_V1)
               + 'Quel est le prix d\'un stylo, et celui d\'un cahier ?\n\nUn stylo : $?$ €\n\n'
               'Un cahier : $?$ €',
               VARS_5, ['{{x}}', '{{y}}'],
               ['**La différence.** L\'achat 1 a deux stylos de plus que l\'achat 2 :'
                ' $2$ stylos coûtent ${{eval:3*x+y}} - {{eval:x+y}} = {{eval:2*x}}$ €.',
                '**Un stylo.** ${{eval:2*x}} \\div 2 = ' + col('{{x}}') + '$ €.',
                '**Un cahier.** ${{eval:x+y}} - {{x}} = ' + col('{{y}}') + '$ €.' + bloc(R5_V1)],
               COND_5),
     variation('4 ananas et 1 pastèque coûtent ${{eval:4*x+y}}$ €. 2 ananas et 2 pastèques coûtent'
               ' ${{eval:2*x+2*y}}$ €. Les ananas ont tous le même prix, les pastèques aussi.\n\n'
               'Sur le schéma, A est le prix d\'un ananas et P celui d\'une pastèque.' + bloc(L5_V2)
               + 'Quel est le prix d\'un ananas, et celui d\'une pastèque ?\n\nUn ananas : $?$ €\n\n'
               'Une pastèque : $?$ €',
               VARS_5, ['{{x}}', '{{y}}'],
               ['**La moitié de l\'achat 2.** 1 ananas et 1 pastèque coûtent ${{eval:2*x+2*y}}'
                ' \\div 2 = {{eval:x+y}}$ €.',
                '**La différence.** L\'achat 1 a trois ananas de plus que cette moitié : $3$ ananas'
                ' coûtent ${{eval:4*x+y}} - {{eval:x+y}} = {{eval:3*x}}$ €, donc un ananas'
                ' ${{eval:3*x}} \\div 3 = ' + col('{{x}}') + '$ €.',
                '**Une pastèque.** ${{eval:x+y}} - {{x}} = ' + col('{{y}}') + '$ €.' + bloc(R5_V2)],
               COND_5)],
    [spec('Stylo 4 €, cahier 7 €', 0, {'x': 4, 'y': 7}, ['4', '7'], 'correct'),
     spec('Erreur : prix inversés', 0, {'x': 4, 'y': 7}, ['7', '4'], 'incorrect'),
     spec('Erreur : différence prise pour un stylo', 0, {'x': 4, 'y': 7}, ['8', '3'], 'incorrect'),
     spec('Ananas 6 €, pastèque 9 €', 1, {'x': 6, 'y': 9}, ['6', '9'], 'correct'),
     spec('Erreur : moitié oubliée', 1, {'x': 6, 'y': 9}, ['1', '28'], 'incorrect')]))

# --- 6. a × ? + b = c ---------------------------------------------------------------------------

VARS_6 = [var('a', '2..6'), var('x', '2..150'), var('b', '2..50')]
COND_6 = ['a*x+b<1000', 'b<=2*x', 'b*5>=x']


def a_fois_plus_b(enonce, unite, question, mot):
    lignes = [': ' + parts('a') + ' ; {{b}} = {{eval:a*x+b}}' + unite]
    rempli = [': ' + parts('a', '{{x}}') + ' ; {{b}} = {{eval:a*x+b}}' + unite]
    etapes = ['**Les parts égales.** On enlève ' + mot + ' : ${{eval:a*x+b}} - {{b}} ='
              ' {{eval:a*x}}$.',
              '**Une part.** ${{eval:a*x}} \\div {{a}} = ' + col('{{x}}') + '$.' + bloc(rempli)]
    return variation(enonce + bloc(lignes) + question, VARS_6, ['{{x}}'], etapes, COND_6)


MODELES.append(modele(
    '06-parts-egales-et-un-reste', 'Schéma en barres : parts égales et un reste',
    'Un total fait de a parts égales (a de 2 à 6) et d\'une quantité connue, schéma en barres'
    ' donné : trouver une part (a × ? + b = c)', 1,
    [a_fois_plus_b('${{a}}$ cahiers identiques et une règle à ${{b}}$ € coûtent'
                   ' ${{eval:a*x+b}}$ € en tout.', ' €',
                   'Quel est le prix d\'un cahier ?\n\n$?$ €', 'le prix de la règle'),
     a_fois_plus_b('Zoé a ${{a}}$ paquets de billes identiques et ${{b}}$ billes en vrac, soit'
                   ' ${{eval:a*x+b}}$ billes en tout.', ' billes',
                   'Combien de billes y a-t-il dans un paquet ?\n\n$?$ billes',
                   'les billes en vrac')],
    [spec('Source CM1 : 3 × ? + 7 = 100 → 31', 0, {'a': 3, 'x': 31, 'b': 7}, '31', 'correct'),
     spec('Erreur : (c + b) ÷ a', 0, {'a': 3, 'x': 31, 'b': 7}, '35', 'incorrect'),
     spec('Erreur : c − b sans partager', 0, {'a': 3, 'x': 31, 'b': 7}, '93', 'incorrect'),
     spec('6 paquets de 150, 49 en vrac', 1, {'a': 6, 'x': 150, 'b': 49}, '150', 'correct'),
     spec('2 paquets de 2, 2 en vrac', 1, {'a': 2, 'x': 2, 'b': 2}, '2', 'correct')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')

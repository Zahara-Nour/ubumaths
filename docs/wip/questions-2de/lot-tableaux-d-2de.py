"""Écrit les 7 modèles du lot 8 D « Tableaux croisés » de la 2de dans scripts/questions/2de-tableaux-d/.

Phase 0 validée par David le 2026-11-02 (§ 51 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-383, 2-485, 2-486, 2-384, 2-385, 2-386, 2-487) : deux variables
qualitatives ; effectifs tirés admis (l2-9). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- un seul décor (élèves d'un lycée, sexe × régime) ; ` ```tableau-croise ` montre les totaux par
  défaut ; une case à trouver est écrite dans le bloc puis cachée par `masquer: Ligne/Colonne`
  (la case `?` ne sert qu'aux tableaux sans valeur connue) ; la réponse se tape dans une case `$?$`
  sous le tableau ;
- un pourcentage demandé doit tomber juste : on tire l'effectif de la marge (multiple de 20) et le
  pourcentage (multiple de 5), puis on en déduit la case, au lieu d'une condition `mod` à faible
  taux d'acceptation (le générateur ne retente que 100 fois) ;
- une fréquence demandée en fraction : `{{eval:a/b}}` (fraction exacte), le décimal est accepté ;
- un choix se répond par son rang dans la liste écrite (mélangée à l'affichage), la bonne en tête ;
- jamais de `{{if:…}}` imbriqué : une variation par cas ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-tableaux-d-2de.py scripts/questions/2de-tableaux-d
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
EFFECTIFS = ('Statistiques', 'Tableaux croisés', 'Effectifs')
MARGINALES = ('Statistiques', 'Tableaux croisés', 'Fréquences marginales')
CONDITIONNELLES = ('Statistiques', 'Tableaux croisés', 'Fréquences conditionnelles')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=90):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options):
    return question + '\n\n```choix\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def frac(a, b):
    return '\\dfrac{ ' + a + ' }{ ' + b + ' }'


# =============================================================================================
# Le tableau 2 × 3 : Filles / Garçons × Externe / Demi-pensionnaire / Interne
# =============================================================================================

COLONNES = ['Externe', 'Demi-pensionnaire', 'Interne']


def tableau(masquer=None, totaux=True):
    t = ('```tableau-croise\nlignes: Filles ; Garçons\ncolonnes: ' + ' ; '.join(COLONNES) + '\n'
         'Filles = {{f1}} ; {{f2}} ; {{f3}}\nGarçons = {{g1}} ; {{g2}} ; {{g3}}\n'
         'coin: Sexe \\ Régime\n')
    if not totaux:
        t += 'totaux: non\n'
    if masquer:
        t += 'masquer: ' + ' ; '.join(masquer) + '\n'
    return t + '```'


INTRO = 'Le tableau ci-dessous donne la répartition des élèves d\'un lycée selon leur sexe et leur régime.\n\n'

# Cases tirées, marges calculées
CASES = [var(n, '8..60') for n in ('f1', 'f2', 'f3', 'g1', 'g2', 'g3')]
MARGES = [var('tf', 'eval:(f1)+(f2)+(f3)'), var('tg', 'eval:(g1)+(g2)+(g3)'),
          var('t1', 'eval:(f1)+(g1)'), var('t2', 'eval:(f2)+(g2)'), var('t3', 'eval:(f3)+(g3)'),
          var('nt', 'eval:(tf)+(tg)')]
VARS = CASES + MARGES


def avec_marges(d):
    """Complète un jeu de cases par ses marges (specs)."""
    d = dict(d)
    d['tf'] = d['f1'] + d['f2'] + d['f3']
    d['tg'] = d['g1'] + d['g2'] + d['g3']
    d['t1'], d['t2'], d['t3'] = d['f1'] + d['g1'], d['f2'] + d['g2'], d['f3'] + d['g3']
    d['nt'] = d['tf'] + d['tg']
    return d


SP = avec_marges({'f1': 40, 'f2': 55, 'f3': 15, 'g1': 35, 'g2': 45, 'g3': 20})
# tf 110, tg 100, t1 75, t2 100, t3 35, nt 210

MODELES = []

# =============================================================================================
# 1. 2-383 : lire un tableau croisé
# =============================================================================================

LIRE_CASE = variation(
    INTRO + tableau() + '\n\nCombien de filles sont demi-pensionnaires ?\n\n$?$ filles',
    VARS, ['{{f2}}'],
    ['Une case du tableau croise une **ligne** (le sexe) et une **colonne** (le régime).',
     'Ligne « Filles », colonne « Demi-pensionnaire » : ' + col('{{f2}}') + ' filles.'])

LIRE_MARGE = variation(
    INTRO + tableau() + '\n\nCombien d\'élèves du lycée sont internes ?\n\n$?$ élèves',
    VARS, ['{{t3}}'],
    ['Tous les internes, filles et garçons : c\'est la case de la ligne **Total**, colonne'
     ' « Interne ».',
     '${{f3}}+{{g3}}=' + col('{{t3}}') + '$ élèves.'])

LIRE_TOTAL = variation(
    INTRO + tableau(totaux=False) + '\n\nCombien d\'élèves compte le lycée ?\n\n$?$ élèves',
    VARS, ['{{nt}}'],
    ['Chaque élève est compté dans **une seule** case : on additionne les six cases.',
     '${{f1}}+{{f2}}+{{f3}}+{{g1}}+{{g2}}+{{g3}}=' + col('{{nt}}') + '$ élèves.'],
    ['f3 != g3'])

MODELES.append(modele(
    '01-lire-un-tableau-croise', 'Lire un tableau croisé d\'effectifs',
    'Tableau croisé sexe × régime : effectif d\'une case, d\'une marge, effectif total',
    EFFECTIFS, 1, [LIRE_CASE, LIRE_MARGE, LIRE_TOTAL],
    [spec('Filles demi-pensionnaires : 55', 0, SP, '55', 'correct'),
     spec('Erreur : garçons demi-pensionnaires (45)', 0, SP, '45', 'incorrect'),
     spec('Internes : 35', 1, SP, '35', 'correct'),
     spec('Erreur : filles internes seulement (15)', 1, SP, '15', 'incorrect'),
     spec('Total : 210', 2, SP, '210', 'correct'),
     spec('Erreur : filles seulement (110)', 2, SP, '110', 'incorrect')]))

# =============================================================================================
# 2. 2-485 : fréquence marginale (notion)
# =============================================================================================

MARG_INTERNES = variation(
    INTRO + tableau() + '\n\n' + choix(
        'Quelle est la fréquence des internes dans l\'ensemble du lycée ?',
        ['$' + frac('{{t3}}', '{{nt}}') + '$', '$' + frac('{{f3}}', '{{t3}}') + '$',
         '$' + frac('{{t3}}', '{{tf}}') + '$', '$' + frac('{{nt}}', '{{t3}}') + '$']),
    VARS, ['0'],
    ['Une **fréquence marginale** se lit dans les marges : effectif d\'une modalité (ligne ou colonne'
     ' **Total**) divisé par l\'effectif total.',
     'Internes : ${{t3}}$ sur ${{nt}}$ élèves : ' + col(frac('{{t3}}', '{{nt}}')) + '.'],
    ['tf != nt'])

MARG_GARCONS = variation(
    INTRO + tableau() + '\n\n' + choix(
        'Quelle est la fréquence des garçons dans l\'ensemble du lycée ?',
        ['$' + frac('{{tg}}', '{{nt}}') + '$', '$' + frac('{{g1}}', '{{nt}}') + '$',
         '$' + frac('{{tg}}', '{{tf}}') + '$', '$' + frac('{{g3}}', '{{tg}}') + '$']),
    VARS, ['0'],
    ['Une **fréquence marginale** se lit dans les marges : effectif d\'une modalité (ligne ou colonne'
     ' **Total**) divisé par l\'effectif total.',
     'Garçons : ${{tg}}$ sur ${{nt}}$ élèves : ' + col(frac('{{tg}}', '{{nt}}')) + '.'],
    ['tg != tf'])

MODELES.append(modele(
    '02-frequence-marginale-notion', 'Reconnaître une fréquence marginale',
    'Tableau croisé : choisir le quotient qui donne la fréquence d\'une modalité dans toute la'
    ' population',
    MARGINALES, 1, [MARG_INTERNES, MARG_GARCONS],
    [spec('Internes : 35/210 (rang 0)', 0, SP, '0', 'correct'),
     spec('Erreur : parmi les internes, les filles', 0, SP, '1', 'incorrect'),
     spec('Erreur : divisé par les filles', 0, SP, '2', 'incorrect'),
     spec('Garçons : 100/210 (rang 0)', 1, SP, '0', 'correct'),
     spec('Erreur : divisé par les filles', 1, SP, '2', 'incorrect')]))

# =============================================================================================
# 3. 2-486 : calculer une fréquence marginale
# =============================================================================================

# Effectif total 200 : g3 en découle ; t2 pair pour un pourcentage entier.
VARS_200 = ([var(n, '10..35') for n in ('f1', 'f2', 'f3', 'g1', 'g2')]
            + [var('g3', 'eval:200-(f1)-(f2)-(f3)-(g1)-(g2)')] + MARGES)

CALC_POURCENT = variation(
    INTRO + tableau() + '\n\nQuel pourcentage des élèves du lycée sont demi-pensionnaires ?\n\n$?\\,\\%$',
    VARS_200, ['{{eval:(t2)/2}}'],
    ['Fréquence marginale : effectif des demi-pensionnaires (ligne **Total**) divisé par l\'effectif'
     ' total.',
     '$' + frac('{{t2}}', '{{nt}}') + '={{eval:(t2)/200;d}}=' + col('{{eval:(t2)/2}}\\,\\%') + '$.'],
    ['mod(t2,2) == 0'])

CALC_FRACTION = variation(
    INTRO + tableau() + '\n\nQuelle est la fréquence des filles dans l\'ensemble du lycée ? Donne une'
    ' fraction irréductible ou un nombre décimal.\n\n$?$',
    VARS_200, ['{{eval:(tf)/(nt)}}'],
    ['Fréquence marginale : effectif des filles (colonne **Total**) divisé par l\'effectif total.',
     '$' + frac('{{tf}}', '{{nt}}') + '=' + col('{{eval:(tf)/(nt)}}') + '$.'])

SP_200 = avec_marges({'f1': 30, 'f2': 34, 'f3': 16, 'g1': 25, 'g2': 30, 'g3': 65})
# tf 80, tg 120, t2 64, nt 200
MODELES.append(modele(
    '03-calculer-une-frequence-marginale', 'Calculer une fréquence marginale',
    'Tableau croisé de 200 élèves : fréquence d\'une modalité, en pourcentage ou en fraction',
    MARGINALES, 2, [CALC_POURCENT, CALC_FRACTION],
    [spec('Demi-pensionnaires : 64/200 = 32 %', 0, SP_200, '32', 'correct'),
     spec('Erreur : l\'effectif (64)', 0, SP_200, '64', 'incorrect'),
     spec('Erreur : filles demi-pensionnaires parmi les filles (42,5)', 0, SP_200, '42.5', 'incorrect'),
     spec('Filles : 80/200 = 2/5', 1, SP_200, '\\frac{2}{5}', 'correct'),
     spec('Filles : 0,4', 1, SP_200, '0.4', 'correct'),
     spec('Erreur : filles / garçons (2/3)', 1, SP_200, '\\frac{2}{3}', 'incorrect')]))

# =============================================================================================
# 4. 2-384 : fréquence conditionnelle (notion)
# =============================================================================================

COND_FILLES = variation(
    INTRO + tableau() + '\n\n' + choix(
        'Parmi les **filles**, quelle est la proportion d\'internes ?',
        ['$' + frac('{{f3}}', '{{tf}}') + '$', '$' + frac('{{f3}}', '{{nt}}') + '$',
         '$' + frac('{{f3}}', '{{t3}}') + '$', '$' + frac('{{tf}}', '{{nt}}') + '$']),
    VARS, ['0'],
    ['« Parmi les filles » : on ne regarde que la ligne des filles ; le dénominateur est l\'effectif'
     ' des **filles**, pas l\'effectif total.',
     'Filles internes : ${{f3}}$ sur ${{tf}}$ filles : ' + col(frac('{{f3}}', '{{tf}}')) + '.'],
    ['tf != t3'])

COND_INTERNES = variation(
    INTRO + tableau() + '\n\n' + choix(
        'Parmi les **internes**, quelle est la proportion de filles ?',
        ['$' + frac('{{f3}}', '{{t3}}') + '$', '$' + frac('{{f3}}', '{{tf}}') + '$',
         '$' + frac('{{f3}}', '{{nt}}') + '$', '$' + frac('{{t3}}', '{{nt}}') + '$']),
    VARS, ['0'],
    ['« Parmi les internes » : on ne regarde que la colonne des internes ; le dénominateur est'
     ' l\'effectif des **internes**.',
     'Filles internes : ${{f3}}$ sur ${{t3}}$ internes : ' + col(frac('{{f3}}', '{{t3}}')) + '.'],
    ['tf != t3'])

MODELES.append(modele(
    '04-frequence-conditionnelle-notion', 'Reconnaître une fréquence conditionnelle',
    'Tableau croisé : « parmi les A, proportion de B » — choisir le quotient au bon dénominateur',
    CONDITIONNELLES, 1, [COND_FILLES, COND_INTERNES],
    [spec('Parmi les filles, internes : 15/110 (rang 0)', 0, SP, '0', 'correct'),
     spec('Erreur : divisé par le total', 0, SP, '1', 'incorrect'),
     spec('Erreur : parmi les internes', 0, SP, '2', 'incorrect'),
     spec('Parmi les internes, filles : 15/35 (rang 0)', 1, SP, '0', 'correct'),
     spec('Erreur : parmi les filles', 1, SP, '1', 'incorrect')]))

# =============================================================================================
# 5. 2-385 : calculer une fréquence conditionnelle
# =============================================================================================

# Garçons : tg = 20k, pourcentage de demi-pensionnaires pg multiple de 5 → g2 entier.
VARS_385 = ([var(n, '8..60') for n in ('f1', 'f2', 'f3')]
            + [var('k', '3..6'), var('q', '5..14'), var('pg', 'eval:5*(q)'), var('g2', 'eval:20*(k)*(pg)/100'),
               var('g1', '3..40'), var('g3', 'eval:20*(k)-(g1)-(g2)')] + MARGES)

CALC_COND_POURCENT = variation(
    INTRO + tableau() + '\n\nParmi les **garçons**, quel pourcentage est demi-pensionnaire ?\n\n$?\\,\\%$',
    VARS_385, ['{{pg}}'],
    ['« Parmi les garçons » : le dénominateur est l\'effectif des **garçons**, ${{tg}}$ (colonne'
     ' Total), pas l\'effectif du lycée.',
     '$' + frac('{{g2}}', '{{tg}}') + '={{eval:(pg)/100;d}}=' + col('{{pg}}\\,\\%') + '$.'],
    ['g3 >= 3', 'g2 != g1'])

CALC_COND_FRACTION = variation(
    INTRO + tableau() + '\n\nParmi les **externes**, quelle est la fréquence des filles ? Donne une'
    ' fraction irréductible ou un nombre décimal.\n\n$?$',
    VARS, ['{{eval:(f1)/(t1)}}'],
    ['« Parmi les externes » : le dénominateur est l\'effectif des **externes**, ${{t1}}$ (ligne'
     ' Total).',
     '$' + frac('{{f1}}', '{{t1}}') + '=' + col('{{eval:(f1)/(t1)}}') + '$.'],
    ['f1 != g1'])

SP_385 = dict(avec_marges({'f1': 30, 'f2': 20, 'f3': 10, 'g1': 20, 'g2': 36, 'g3': 24}), k=4, q=9, pg=45)
# tg 80, nt 140, t2 56
SP_F = avec_marges({'f1': 30, 'f2': 20, 'f3': 10, 'g1': 20, 'g2': 36, 'g3': 24})
# t1 50 : 30/50 = 3/5
MODELES.append(modele(
    '05-calculer-une-frequence-conditionnelle', 'Calculer une fréquence conditionnelle',
    'Tableau croisé : « parmi les A, fréquence de B », en pourcentage ou en fraction (piège :'
    ' diviser par le total)',
    CONDITIONNELLES, 2, [CALC_COND_POURCENT, CALC_COND_FRACTION],
    [spec('Parmi 80 garçons, 36 demi-pensionnaires : 45 %', 0, SP_385, '45', 'correct'),
     spec('Erreur : divisé par le total (36/140 ≈ 25,7)', 0, SP_385, '25.7', 'incorrect'),
     spec('Erreur : parmi les demi-pensionnaires (36/56 ≈ 64,3)', 0, SP_385, '64.3', 'incorrect'),
     spec('Parmi 50 externes, 30 filles : 3/5', 1, SP_F, '\\frac{3}{5}', 'correct'),
     spec('Parmi 50 externes, 30 filles : 0,6', 1, SP_F, '0.6', 'correct'),
     spec('Erreur : parmi les filles (30/60 = 1/2)', 1, SP_F, '\\frac{1}{2}', 'incorrect')]))

# =============================================================================================
# 6. 2-386 : compléter un tableau croisé par les effectifs
# =============================================================================================

COMPLETER_A = variation(
    INTRO + tableau(masquer=['Filles/Interne', 'Garçons/Total']) + '\n\nComplète les cases'
    ' cachées.\n\nFilles internes : $?$\n\nNombre total de garçons : $?$',
    VARS, ['{{f3}}', '{{tg}}'],
    ['Chaque total est la **somme** de sa ligne ou de sa colonne : une case inconnue s\'obtient par'
     ' **différence**.',
     'Filles internes : total des filles moins les autres filles : ${{tf}}-{{f1}}-{{f2}}='
     + col('{{f3}}') + '$ (ou ${{t3}}-{{g3}}$).',
     'Garçons : effectif total moins les filles : ${{nt}}-{{tf}}=' + col('{{tg}}') + '$.',
     tableau()])

COMPLETER_B = variation(
    INTRO + tableau(masquer=['Filles/Total', 'Garçons/Externe', 'Total/Externe']) + '\n\nComplète'
    ' les cases cachées.\n\nNombre total de filles : $?$\n\nGarçons externes : $?$\n\nNombre total'
    ' d\'externes : $?$',
    VARS, ['{{tf}}', '{{g1}}', '{{t1}}'],
    ['Chaque total est la **somme** de sa ligne ou de sa colonne : une case inconnue s\'obtient par'
     ' **différence**.',
     'Filles : ${{nt}}-{{tg}}=' + col('{{tf}}') + '$.',
     'Garçons externes : ${{tg}}-{{g2}}-{{g3}}=' + col('{{g1}}') + '$.',
     'Externes : ${{f1}}+{{g1}}=' + col('{{t1}}') + '$.',
     tableau()])

MODELES.append(modele(
    '06-completer-par-les-effectifs', 'Compléter un tableau croisé par les effectifs',
    'Cases cachées d\'un tableau croisé retrouvées par sommes et différences',
    EFFECTIFS, 2, [COMPLETER_A, COMPLETER_B],
    [spec('Filles internes 15, garçons 100', 0, SP, ['15', '100'], 'correct'),
     spec('Erreur : t3 au lieu de f3', 0, SP, ['35', '100'], 'incorrect'),
     spec('Filles 110, garçons externes 35, externes 75', 1, SP, ['110', '35', '75'], 'correct'),
     spec('Erreur : externes = filles externes', 1, SP, ['110', '35', '40'], 'incorrect')],
    delay=150))

# =============================================================================================
# 7. 2-487 : compléter avec une fréquence conditionnelle
# =============================================================================================

# tf = 20a, pf multiple de 5 → filles internes entières ; garçons internes tirés.
VARS_487 = [var('a', '3..8'), var('r', '2..12'), var('pf', 'eval:5*(r)'), var('b', '3..8'),
            var('tf', 'eval:20*(a)'), var('tg', 'eval:20*(b)'),
            var('fi', 'eval:(tf)*(pf)/100'), var('gi', '4..50'),
            var('fx', 'eval:(tf)-(fi)'), var('gx', 'eval:(tg)-(gi)'),
            var('ti', 'eval:(fi)+(gi)'), var('tx', 'eval:(fx)+(gx)'), var('nt', 'eval:(tf)+(tg)')]


def tableau_487():
    return ('```tableau-croise\nlignes: Filles ; Garçons\ncolonnes: Interne ; Externe\n'
            'Filles = {{fi}} ; {{fx}}\nGarçons = {{gi}} ; {{gx}}\ncoin: Sexe \\ Régime\n'
            '{masquer}```')


TAB_487 = tableau_487().replace('{masquer}', 'masquer: Filles/Interne ; Filles/Externe ;'
                                ' Garçons/Interne ; Garçons/Externe\n')
TAB_487_PLEIN = tableau_487().replace('{masquer}', '')

COMPLETER_FREQ = variation(
    'Dans un lycée, on a relevé le sexe et le régime des élèves. On sait que **${{pf}}\\,\\%$ des'
    ' filles** sont internes.\n\n' + TAB_487 + '\n\nComplète le tableau.\n\nFilles internes : $?$'
    '\n\nGarçons internes : $?$\n\nGarçons externes : $?$',
    VARS_487, ['{{fi}}', '{{gi}}', '{{gx}}'],
    ['« ${{pf}}\\,\\%$ des filles » : le pourcentage porte sur les **${{tf}}$ filles**, pas sur tout'
     ' le lycée.',
     'Filles internes : ${{eval:(pf)/100;d}}\\times{{tf}}=' + col('{{fi}}') + '$.',
     'Garçons internes : ${{ti}}-{{fi}}=' + col('{{gi}}') + '$ ; garçons externes : ${{tg}}-{{gi}}='
     + col('{{gx}}') + '$.',
     TAB_487_PLEIN],
    ['gi < tg', 'gi != fi'])

SP_487 = {'a': 5, 'r': 6, 'pf': 30, 'b': 4, 'tf': 100, 'tg': 80, 'fi': 30, 'gi': 20, 'fx': 70, 'gx': 60,
          'ti': 50, 'tx': 130, 'nt': 180}
MODELES.append(modele(
    '07-completer-avec-une-frequence-conditionnelle',
    'Compléter un tableau croisé avec une fréquence conditionnelle',
    'Marges données et « p % des filles » : cases du tableau croisé',
    CONDITIONNELLES, 3, [COMPLETER_FREQ],
    [spec('30 % de 100 filles = 30 ; 50 − 30 = 20 ; 80 − 20 = 60', 0, SP_487, ['30', '20', '60'],
          'correct'),
     spec('Erreur : 30 % de tout le lycée (54)', 0, SP_487, ['54', '-4', '84'], 'incorrect'),
     spec('Erreur : 30 % des garçons aussi (24)', 0, SP_487, ['30', '24', '56'], 'incorrect')],
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

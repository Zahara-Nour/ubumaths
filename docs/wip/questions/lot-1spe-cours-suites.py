"""Écrit les modèles du lot « questions de cours : suites » de la 1re spé dans
scripts/questions/1spe-cours-suites/.

Liste validée par David le 2026-11-09 (31 questions, A à F) ; journal :
docs/wip/cours-suites-progress.md. Toutes portent le marqueur « question de cours »
(`options.courseQuestion`) ; les cartes de cours (non évaluables, Flash-cards et En classe
seulement) portent en plus `options.courseCard`.

Écarts à la liste, à faire valider :
- n° 24 et 25 (étapes des démonstrations de 1 + 2 + ⋯ + n et 1 + q + ⋯ + qⁿ) NON écrites :
  elles existent déjà (variation « Remets les étapes » des modèles « Démontrer la somme… »).
- n° 22 dédoublée : une carte par point (somme arithmétique 1SPE-226, géométrique 1SPE-227).
- n° 11 (« Associer » en attendant le geste) : QCM arithmétique / géométrique par situation.

Un point par modèle (ADR 0020) ; le rangement (nœud + tag) viendra par migration.

Formes : case choix (la première proposition est la bonne quand l'affichage mélange ;
vrai/faux en `melanger: non`, Vrai = 0, Faux = 1) ; plusieurs réponses : indices d'origine
triés, séparés par `;` ; étapes à ranger (```ranger, `signe: aucun`, étiquettes écrites
dans le bon ordre) ; case MathLive.

    python3 docs/wip/questions/lot-1spe-cours-suites.py scripts/questions/1spe-cours-suites
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

VRAI_FAUX = '\n\n```choix\nmelanger: non\n- Vrai\n- Faux\n```'


# ---------------------------------------------------------------------------------------------
# Briques
# ---------------------------------------------------------------------------------------------


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def modele(title, point, level, delay, variations, specs, carte=False, description=''):
    options = {'courseQuestion': True}
    if carte:
        options['courseCard'] = True
    return {'title': title, 'description': description or ('Question de cours, ' + point),
            'grades': ['1_SPE'], 'level': level, 'delay': delay, 'status': 'draft',
            'options': options, 'shared': {}, 'variations': variations,
            'testSpecs': specs, '_point': point}


def carte(recto, verso, variables=None):
    return {'statement': recto, 'variables': variables or [],
            'correction': {'steps': verso}}


def choix(enonce, bonne, autres, steps, variables=None, conditions=None):
    """Case choix mélangée : la bonne réponse est écrite en premier (index 0)."""
    bloc = '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in [bonne] + autres) + '```'
    v = {'statement': enonce + bloc, 'variables': variables or [],
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def choix_fixe(enonce, propositions, bonne, steps, variables=None):
    """Case choix dans l'ordre écrit (`melanger: non`) : `bonne` = rang de la bonne réponse."""
    bloc = ('\n\n```choix\nmelanger: non\n' + ''.join('- ' + l + '\n' for l in propositions)
            + '```')
    return {'statement': enonce + bloc, 'variables': variables or [],
            'blanks': [{'expectedAnswer': str(bonne)}], 'correction': {'steps': steps}}


def plusieurs(enonce, propositions, bonnes, steps):
    bloc = ('\n\n```choix\nplusieurs: oui\n' + ''.join('- ' + l + '\n' for l in propositions)
            + '```')
    return {'statement': enonce + bloc, 'variables': [],
            'blanks': [{'expectedAnswer': ';'.join(str(b) for b in bonnes)}],
            'correction': {'steps': steps}}


def vrai_faux(affirmation, vrai, steps, variables=None):
    return {'statement': affirmation + VRAI_FAUX, 'variables': variables or [],
            'blanks': [{'expectedAnswer': '0' if vrai else '1'}],
            'correction': {'steps': ['{{solution:html}}' + steps[0]] + steps[1:]}}


def ranger(enonce, etapes, steps, variables=None):
    bloc = '\n\n```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```'
    return {'statement': enonce + bloc, 'variables': variables or [],
            'correction': {'steps': steps}}


def case(enonce, attendu, steps, variables=None, forme_libre=False):
    blank = {'expectedAnswer': attendu}
    if forme_libre:
        blank['requiredForm'] = {'pattern': 'u'}
    return {'statement': enonce, 'variables': variables or [], 'blanks': [blank],
            'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


def specs_vf(vi, vrai, variables=None):
    bonne, fausse = ('0', '1') if vrai else ('1', '0')
    return [spec('Réponse ' + ('Vrai' if vrai else 'Faux'), vi, bonne, 'correct', variables),
            spec('Erreur : ' + ('Faux' if vrai else 'Vrai'), vi, fausse, 'incorrect', variables)]


def specs_ranger(vi, variables=None):
    """Réponses sous les variables de la spec (tirage fixe du lanceur de specs) : places dans
    l'ordre affiché, relevées par la sonde du 2026-11-09."""
    return [spec('Étapes dans l\'ordre', vi, ['3', '0', '1', '2'], 'correct', variables),
            spec('Erreur : deuxième et troisième étapes échangées', vi, ['3', '1', '0', '2'],
                 'incorrect', variables),
            spec('Erreur : ordre affiché recopié', vi, ['0', '1', '2', '3'], 'incorrect',
                 variables)]


MODELES = []

# ---------------------------------------------------------------------------------------------
# A. Vocabulaire et modes de génération
# ---------------------------------------------------------------------------------------------

# A1 — carte, 1SPE-211
VERSO_MODES = [
    "- **Forme explicite** : $u_n$ est donné en fonction de $n$, $u_n=f(n)$. On calcule"
    " directement n'importe quel terme : avec $u_n=3n+1$, $u_{10}=31$.\n"
    "- **Relation de récurrence** : on donne le premier terme et la façon de passer d'un terme"
    " au suivant, $u_{n+1}=f(u_n)$. Avec $u_0=2$ et $u_{n+1}=3u_n-1$, on calcule $u_1=5$,"
    " puis $u_2=14$, de proche en proche.",
]
MODELES.append(('A1-cours-deux-facons-de-definir-une-suite', modele(
    'Cours : deux façons de définir une suite', '1SPE-211', 1, 30,
    [carte('Quelles sont les deux façons les plus courantes de définir une suite $(u_n)$ ?',
           VERSO_MODES),
     carte('Quelle différence y a-t-il entre une suite définie **explicitement** et une suite'
           ' définie **par récurrence** ?', VERSO_MODES)],
    [], carte=True, description='Carte de cours : forme explicite, relation de récurrence')))

# A2 — case choix, 1SPE-368
PROPS_MODE = ['de façon explicite : $u_n$ est donné en fonction de $n$',
              'par une relation de récurrence : $u_{n+1}$ est donné en fonction de $u_n$']
V_ABC = [var('a', '1..9'), var('b', '2..5'), var('c', '1..9')]


def mode(expr, recurrence, explication):
    return choix_fixe(
        'Une suite $(u_n)$ est définie ainsi :\n\n$$' + expr + '$$\n\nElle est définie…',
        PROPS_MODE, 1 if recurrence else 0, [explication], V_ABC)


MODELES.append(('A2-cours-explicite-ou-par-recurrence', modele(
    'Cours : suite définie explicitement ou par récurrence ?', '1SPE-368', 1, 30,
    [mode('u_0={{a}}\\ \\text{ et, pour tout entier naturel } n,\\ u_{n+1}={{b}}u_n-{{c}}', True,
          '$u_{n+1}$ est calculé à partir de $u_n$ : c\'est une **relation de récurrence**.'),
     mode('u_n={{b}}n^2-{{c}}\\ \\text{ pour tout entier naturel } n', False,
          '$u_n$ est donné directement en fonction de $n$ : c\'est une **forme explicite**.'),
     mode('u_n=\\dfrac{n+{{a}}}{n+{{c}}}\\ \\text{ pour tout entier naturel } n', False,
          '$u_n$ est donné directement en fonction de $n$ : c\'est une **forme explicite**.'),
     mode('u_0={{a}}\\ \\text{ et, pour tout entier naturel } n,\\ u_{n+1}=u_n+n+{{c}}', True,
          '$u_{n+1}$ est calculé à partir de $u_n$ (et de $n$) : c\'est une **relation de'
          ' récurrence**.')],
    [spec('récurrence', 0, '1', 'correct'), spec('Erreur : explicite', 0, '0', 'incorrect'),
     spec('explicite', 1, '0', 'correct'), spec('Erreur : récurrence', 1, '1', 'incorrect'),
     spec('explicite (quotient)', 2, '0', 'correct'),
     spec('récurrence avec n', 3, '1', 'correct'), spec('Erreur : explicite', 3, '0', 'incorrect')],
    description='Reconnaître une forme explicite ou une relation de récurrence')))

# A3 — vrai/faux, 1SPE-368
MODELES.append(('A3-cours-vrai-faux-modes-de-generation', modele(
    'Cours : vrai ou faux sur les modes de génération d\'une suite', '1SPE-368', 1, 30,
    [vrai_faux('Si une suite est définie par une relation de récurrence, on peut calculer'
               ' $u_{100}$ sans calculer les termes précédents.', False,
               [' : il faut en général calculer $u_1$, $u_2$, …, $u_{99}$ de proche en proche'
                ' (ou trouver d\'abord une forme explicite).']),
     vrai_faux('Si $u_n=f(n)$ pour tout entier naturel $n$, on peut calculer $u_{100}$'
               ' directement.', True, [' : $u_{100}=f(100)$, sans calculer les termes'
                                       ' précédents.']),
     vrai_faux('Une suite définie par une relation de récurrence $u_{n+1}=f(u_n)$ a besoin d\'un'
               ' premier terme.', True,
               [' : sans $u_0$, on ne peut pas calculer $u_1=f(u_0)$, ni les termes suivants.']),
     vrai_faux('Si $u_{n+1}=f(u_n)$ pour tout entier naturel $n$, alors $u_n=f(n)$.', False,
               [' : avec $f(x)=2x$ et $u_0=1$, on a $u_1=2$, $u_2=4$, $u_3=8$, mais'
                ' $f(3)=6\\neq u_3$. La relation $u_{n+1}=f(u_n)$ ne dit pas que'
                ' $u_n=f(n)$.'])],
    specs_vf(0, False) + specs_vf(1, True) + specs_vf(2, True) + specs_vf(3, False),
    description='Vrai/faux : forme explicite et relation de récurrence')))

# A4 — case choix, 1SPE-212
MODELES.append(('A4-cours-notations', modele(
    'Cours : notations uₙ₊₁, uₙ + 1, (uₙ)', '1SPE-212', 1, 30,
    [choix('Pour tout entier naturel $n$, $u_n=n^2$. Que vaut $u_{n+1}$ ?',
           '$(n+1)^2$', ['$n^2+1$', '$n^2+n$'],
           ['$u_{n+1}$ est le terme de rang $n+1$ : on remplace $n$ par $n+1$ dans $u_n=n^2$,'
            ' donc $u_{n+1}=(n+1)^2$.', '$n^2+1$, c\'est $u_n+1$ : un autre nombre.']),
     choix('Pour tout entier naturel $n$, $u_n=n^2$. Que vaut $u_n+1$ ?',
           '$n^2+1$', ['$(n+1)^2$', '$2n+1$'],
           ['$u_n+1$, c\'est le terme $u_n$ auquel on ajoute $1$ : $n^2+1$.',
            '$(n+1)^2$, c\'est $u_{n+1}$ : un autre nombre.']),
     choix('Pour tout entier naturel $n$, $u_n=\\dfrac{1}{n+1}$. Que vaut $u_{n+1}$ ?',
           '$\\dfrac{1}{n+2}$', ['$\\dfrac{1}{n+1}+1$', '$\\dfrac{2}{n+1}$'],
           ['On remplace $n$ par $n+1$ : $u_{n+1}=\\dfrac{1}{(n+1)+1}=\\dfrac{1}{n+2}$.']),
     choix('Que désigne la notation $(u_n)$ ?', 'la suite tout entière',
           ['le terme de rang $n$', 'le terme de rang $n$ augmenté de $1$'],
           ['$(u_n)$, avec les parenthèses, désigne la **suite** ; $u_n$, sans parenthèses,'
            ' désigne **un terme**, celui de rang $n$.']),
     choix('Que désigne la notation $u_n$ ?', 'le terme de rang $n$',
           ['la suite tout entière', 'la somme des $n$ premiers termes'],
           ['$u_n$, sans parenthèses, est **un nombre** : le terme de rang $n$. La suite se note'
            ' $(u_n)$.'])],
    specs_choix(0, '(n+1)²', ['n² + 1', 'n² + n']) + specs_choix(1, 'n² + 1', ['(n+1)²', '2n+1'])
    + specs_choix(2, '1/(n+2)', ['1/(n+1) + 1', '2/(n+1)'])
    + specs_choix(3, 'la suite', ['un terme', 'terme + 1'])
    + specs_choix(4, 'le terme', ['la suite', 'une somme']),
    description='Notations : u(n+1) et u(n) + 1, (uₙ) et uₙ')))

# ---------------------------------------------------------------------------------------------
# B. Suites arithmétiques
# ---------------------------------------------------------------------------------------------

# B5 — carte, 1SPE-213
MODELES.append(('B5-cours-definition-suite-arithmetique', modele(
    'Cours : définition d\'une suite arithmétique', '1SPE-213', 1, 30,
    [carte('Quand dit-on qu\'une suite $(u_n)$ est **arithmétique** ?',
           ['On passe d\'un terme au suivant en **ajoutant toujours le même nombre** $r$, appelé'
            ' la **raison** : pour tout entier naturel $n$, $u_{n+1}=u_n+r$.',
            'Exemple : $5$, $8$, $11$, $14$, … est arithmétique de raison $3$.'])],
    [], carte=True, description='Carte de cours : définition d\'une suite arithmétique')))

# B6 — case, 1SPE-371
TG_ARITH = ('$(u_n)$ est une suite arithmétique de raison $r$. Complète la formule, valable pour'
            ' tout entier naturel $n$.\n\n')
MODELES.append(('B6-cours-formule-terme-general-arithmetique', modele(
    'Cours : formule du terme général d\'une suite arithmétique', '1SPE-371', 1, 45,
    [case(TG_ARITH + '$u_n=u_0+?$', 'nr',
          ['De $u_0$ à $u_n$, on ajoute $n$ fois la raison : $u_n=u_0+nr$.'], forme_libre=True),
     case(TG_ARITH + '$u_n=u_1+?$', '(n-1)r',
          ['De $u_1$ à $u_n$, on ajoute $n-1$ fois la raison : $u_n=u_1+(n-1)r$.'],
          forme_libre=True),
     case('$(u_n)$ est une suite arithmétique de raison $r$, et $p$ un entier naturel. Complète'
          ' la formule, valable pour tout entier naturel $n$.\n\n$u_n=u_p+?$', '(n-p)r',
          ['De $u_p$ à $u_n$, on ajoute $n-p$ fois la raison : $u_n=u_p+(n-p)r$.'],
          forme_libre=True)],
    [spec('nr', 0, 'nr', 'correct'), spec('rn', 0, 'rn', 'correct'),
     spec('Erreur : (n−1)r', 0, '(n-1)r', 'incorrect'), spec('Erreur : r', 0, 'r', 'incorrect'),
     spec('(n−1)r', 1, '(n-1)r', 'correct'), spec('Erreur : nr', 1, 'nr', 'incorrect'),
     spec('(n−p)r', 2, '(n-p)r', 'correct'), spec('Erreur : nr', 2, 'nr', 'incorrect')],
    description='Compléter uₙ = u₀ + nr, uₙ = u₁ + (n − 1)r, uₙ = uₚ + (n − p)r')))

# B7 — étapes à ranger, 1SPE-213
MODELES.append(('B7-cours-demontrer-suite-arithmetique-etapes', modele(
    'Cours : démontrer qu\'une suite est arithmétique (étapes)', '1SPE-213', 1, 60,
    [ranger('On veut démontrer que la suite définie, pour tout entier naturel $n$, par'
            ' $u_n={{a}}n+{{b}}$ est arithmétique. Remets les étapes dans l\'ordre.',
            ['Pour tout entier naturel $n$, on calcule $u_{n+1}-u_n$.',
             '$u_{n+1}-u_n={{a}}(n+1)+{{b}}-({{a}}n+{{b}})$',
             '$u_{n+1}-u_n={{a}}$',
             'Cette différence ne dépend pas de $n$ : la suite est arithmétique de raison'
             ' ${{a}}$.'],
            ['On calcule la différence de deux termes consécutifs, on la simplifie, puis on'
             ' conclut : elle ne dépend pas de $n$.'],
            [var('a', '2..9'), var('b', '1..9')]),
     ranger('Remets dans l\'ordre les étapes de la méthode pour démontrer qu\'une suite $(u_n)$'
            ' est arithmétique.',
            ['Exprimer $u_{n+1}$ en fonction de $n$.',
             'Calculer la différence $u_{n+1}-u_n$ et la simplifier.',
             'Constater que le résultat est un nombre $r$ qui ne dépend pas de $n$.',
             'Conclure : $(u_n)$ est arithmétique de raison $r$.'],
            ['La conclusion vient en dernier : elle s\'appuie sur le calcul de'
             ' $u_{n+1}-u_n$.'])],
    specs_ranger(0, {'a': 3, 'b': 5}) + specs_ranger(1),
    description='Remettre dans l\'ordre les étapes de la méthode')))

# B8 — case choix, 1SPE-213
MODELES.append(('B8-cours-methode-suite-arithmetique', modele(
    'Cours : quelle méthode pour une suite arithmétique ?', '1SPE-213', 1, 30,
    [choix('Pour démontrer qu\'une suite $(u_n)$ est arithmétique, on calcule, pour tout entier'
           ' naturel $n$ :', '$u_{n+1}-u_n$',
           ['$\\dfrac{u_{n+1}}{u_n}$', '$u_1-u_0$', '$u_{n+1}+u_n$'],
           ['Une suite est arithmétique quand $u_{n+1}-u_n$ est le même nombre pour **tout** $n$'
            ' : on calcule cette différence.', '$u_1-u_0$ ne regarde que les deux premiers'
            ' termes : cela ne suffit pas.']),
     choix('On a montré que, pour tout entier naturel $n$, $u_{n+1}-u_n={{r}}$. Que peut-on'
           ' conclure ?', '$(u_n)$ est arithmétique de raison ${{r}}$.',
           ['$(u_n)$ est géométrique de raison ${{r}}$.',
            '$(u_n)$ est arithmétique de raison $u_0+{{r}}$.', 'On ne peut rien conclure.'],
           ['La différence de deux termes consécutifs vaut toujours ${{r}}$ : la suite est'
            ' arithmétique de raison ${{r}}$.'], [var('r', '2..9')]),
     choix('On a calculé, pour tout entier naturel $n$, $u_{n+1}-u_n=2n+{{c}}$. La suite'
           ' $(u_n)$ est-elle arithmétique ?', 'Non, car cette différence dépend de $n$.',
           ['Oui, de raison $2n+{{c}}$.', 'Oui, de raison $2$.', 'Oui, de raison ${{c}}$.'],
           ['La raison est un **nombre fixe** : ici $u_{n+1}-u_n$ change avec $n$ (${{c}}$ pour'
            ' $n=0$, ${{eval:c+2}}$ pour $n=1$), donc la suite n\'est pas arithmétique.'],
           [var('c', '1..9')])],
    specs_choix(0, 'différence', ['quotient', 'u₁ − u₀', 'somme'])
    + specs_choix(1, 'arithmétique de raison r', ['géométrique', 'raison u₀ + r', 'rien'],
                  {'r': 4})
    + specs_choix(2, 'non', ['raison 2n + c', 'raison 2', 'raison c'], {'c': 3}),
    description='Choisir le calcul qui montre qu\'une suite est arithmétique, et conclure')))

# B9 — vrai/faux, 1SPE-213
MODELES.append(('B9-cours-vrai-faux-suites-arithmetiques', modele(
    'Cours : vrai ou faux sur les suites arithmétiques', '1SPE-213', 1, 30,
    [vrai_faux('Une suite vérifie $u_1-u_0=u_2-u_1={{r}}$. Elle est forcément arithmétique.',
               False,
               [' : deux écarts égaux ne suffisent pas, il faut que $u_{n+1}-u_n$ soit le même'
                ' pour **tout** $n$. Par exemple, $u_n={{r}}n+n(n-1)(n-2)$ donne $u_0=0$,'
                ' $u_1={{r}}$, $u_2={{eval:2*r}}$, mais $u_3={{eval:3*r+6}}$.'],
               [var('r', '2..9')]),
     vrai_faux('Si $(u_n)$ est arithmétique de raison $r$, alors $u_{10}-u_4=6r$.', True,
               [' : de $u_4$ à $u_{10}$, on ajoute $6$ fois la raison.']),
     vrai_faux('Si $(u_n)$ est arithmétique de raison $r$, alors $u_n=u_1+nr$.', False,
               [' : de $u_1$ à $u_n$, on ajoute $n-1$ fois la raison, donc $u_n=u_1+(n-1)r$.'
                ' C\'est $u_n=u_0+nr$ qui part de $u_0$.']),
     vrai_faux('La suite définie, pour tout entier naturel $n$, par $u_n={{a}}n^2$ est'
               ' arithmétique.', False,
               [' : $u_{n+1}-u_n={{a}}(2n+1)$ dépend de $n$.'], [var('a', '2..9')])],
    specs_vf(0, False, {'r': 3}) + specs_vf(1, True) + specs_vf(2, False)
    + specs_vf(3, False, {'a': 2}),
    description='Vrai/faux : définition et terme général d\'une suite arithmétique')))

# B10 — case choix, 1SPE-228
PROPS_SENS = ['strictement croissante', 'strictement décroissante', 'constante',
              'on ne peut pas savoir']
MODELES.append(('B10-cours-sens-variation-selon-la-raison', modele(
    'Cours : sens de variation d\'une suite arithmétique selon sa raison', '1SPE-228', 1, 30,
    [choix_fixe('$(u_n)$ est une suite arithmétique de raison $r>0$. Alors $(u_n)$ est…',
                PROPS_SENS, 0, ['$u_{n+1}-u_n=r>0$ : chaque terme est plus grand que le'
                                ' précédent.']),
     choix_fixe('$(u_n)$ est une suite arithmétique de raison $r<0$. Alors $(u_n)$ est…',
                PROPS_SENS, 1, ['$u_{n+1}-u_n=r<0$ : chaque terme est plus petit que le'
                                ' précédent.']),
     choix('Le sens de variation d\'une suite arithmétique dépend…',
           'du signe de sa raison seulement',
           ['de son premier terme seulement', 'de son premier terme et de sa raison'],
           ['$u_{n+1}-u_n=r$ : seul le signe de $r$ compte, quel que soit $u_0$.'])],
    [spec('croissante', 0, '0', 'correct'), spec('Erreur : décroissante', 0, '1', 'incorrect'),
     spec('Erreur : on ne sait pas', 0, '3', 'incorrect'),
     spec('décroissante', 1, '1', 'correct'), spec('Erreur : croissante', 1, '0', 'incorrect')]
    + specs_choix(2, 'raison', ['premier terme', 'les deux']),
    description='Signe de la raison et sens de variation, sans valeurs')))

# B11 — case choix, 1SPE-214 (le geste « associer » viendra plus tard)
PROPS_AG = ['arithmétique', 'géométrique']


def situation(texte, arith, explication, variables):
    return choix_fixe(texte + ' La suite qui modélise cette situation est…', PROPS_AG,
                      0 if arith else 1, [explication], variables)


MODELES.append(('B11-cours-arithmetique-ou-geometrique-situation', modele(
    'Cours : arithmétique ou géométrique ? (situation)', '1SPE-214', 1, 30,
    [situation('Chaque mois, Léa ajoute ${{m}}~\\unit{€}$ dans sa tirelire.', True,
               'On **ajoute** toujours ${{m}}~\\unit{€}$ : la suite est arithmétique de raison'
               ' ${{m}}$.', [var('m', '5..30')]),
     situation('Un capital augmente de ${{t}}\\,\\%$ par an.', False,
               'Augmenter de ${{t}}\\,\\%$, c\'est **multiplier** par $1+\\dfrac{ {{t}} }{100}$'
               ' : la suite est géométrique.', [var('t', '2..9')]),
     situation('Chaque année, une voiture perd ${{t}}\\,\\%$ de sa valeur.', False,
               'Baisser de ${{t}}\\,\\%$, c\'est **multiplier** par $1-\\dfrac{ {{t}} }{100}$ :'
               ' la suite est géométrique.', [var('t', '10..20')]),
     situation('Chaque jour, un réservoir perd ${{v}}$ litres d\'eau.', True,
               'On **retire** toujours ${{v}}$ litres : la suite est arithmétique de raison'
               ' $-{{v}}$.', [var('v', '2..15')]),
     situation('Une population de bactéries double toutes les heures.', False,
               'Doubler, c\'est **multiplier** par $2$ : la suite est géométrique de raison $2$.',
               [])],
    [spec('arithmétique', 0, '0', 'correct', {'m': 10}),
     spec('Erreur : géométrique', 0, '1', 'incorrect', {'m': 10}),
     spec('géométrique', 1, '1', 'correct', {'t': 3}),
     spec('Erreur : arithmétique', 1, '0', 'incorrect', {'t': 3}),
     spec('géométrique', 2, '1', 'correct', {'t': 12}),
     spec('arithmétique', 3, '0', 'correct', {'v': 5}),
     spec('géométrique', 4, '1', 'correct')],
    description='Accroissement constant ou taux constant : reconnaître le type de suite')))

# B12 — case choix, 1SPE-372
MODELES.append(('B12-cours-suite-arithmetique-points-alignes', modele(
    'Cours : représentation graphique d\'une suite arithmétique', '1SPE-372', 1, 30,
    [choix('Dans un repère, les points de coordonnées $(n\\,;u_n)$ d\'une suite arithmétique'
           ' sont…', 'alignés', ['sur une parabole', 'sur une courbe exponentielle'],
           ['$u_n=u_0+nr$ : les points $(n\\,;u_n)$ sont sur la droite d\'équation'
            ' $y=rx+u_0$.']),
     choix('La suite arithmétique de premier terme $u_0={{b}}$ et de raison ${{a}}$ vérifie'
           ' $u_n=f(n)$ pour la fonction affine…', '$f(x)={{a}}x+{{b}}$',
           ['$f(x)={{b}}x+{{a}}$', '$f(x)={{a}}x$'],
           ['$u_n=u_0+nr={{b}}+{{a}}n$ : c\'est $f(n)$ avec $f(x)={{a}}x+{{b}}$. La raison est'
            ' le coefficient directeur, le premier terme l\'ordonnée à l\'origine.'],
           [var('a', '2..9'), var('b', '1..9')], ['a != b']),
     choix('Les points $(n\\,;u_n)$ d\'une suite sont sur une droite de coefficient directeur'
           ' ${{a}}$. La suite $(u_n)$ est…', 'arithmétique de raison ${{a}}$',
           ['géométrique de raison ${{a}}$', 'arithmétique de premier terme ${{a}}$'],
           ['$u_n=an+b$ avec $a={{a}}$ : $u_{n+1}-u_n={{a}}$, la suite est arithmétique de'
            ' raison ${{a}}$.'], [var('a', '2..9')])],
    specs_choix(0, 'alignés', ['parabole', 'exponentielle'])
    + specs_choix(1, 'ax + b', ['bx + a', 'ax'], {'a': 3, 'b': 5})
    + specs_choix(2, 'raison a', ['géométrique', 'premier terme a'], {'a': 3}),
    description='Suite arithmétique, fonction affine, points alignés')))

# ---------------------------------------------------------------------------------------------
# C. Suites géométriques
# ---------------------------------------------------------------------------------------------

# C13 — carte, 1SPE-216
MODELES.append(('C13-cours-definition-suite-geometrique', modele(
    'Cours : définition d\'une suite géométrique', '1SPE-216', 1, 30,
    [carte('Quand dit-on qu\'une suite $(u_n)$ est **géométrique** ?',
           ['On passe d\'un terme au suivant en **multipliant toujours par le même nombre** $q$,'
            ' appelé la **raison** : pour tout entier naturel $n$, $u_{n+1}=q\\times u_n$.',
            'Exemple : $3$, $6$, $12$, $24$, … est géométrique de raison $2$.'])],
    [], carte=True, description='Carte de cours : définition d\'une suite géométrique')))

# C14 — case, 1SPE-373
TG_GEOM = ('$(u_n)$ est une suite géométrique de raison $q$. Complète la formule, valable pour'
           ' tout entier naturel $n$.\n\n')
MODELES.append(('C14-cours-formule-terme-general-geometrique', modele(
    'Cours : formule du terme général d\'une suite géométrique', '1SPE-373', 1, 45,
    [case(TG_GEOM + '$u_n=u_0\\times ?$', 'q^n',
          ['De $u_0$ à $u_n$, on multiplie $n$ fois par la raison : $u_n=u_0\\times q^n$.'],
          forme_libre=True),
     case(TG_GEOM + '$u_n=u_1\\times ?$', 'q^{n-1}',
          ['De $u_1$ à $u_n$, on multiplie $n-1$ fois par la raison :'
           ' $u_n=u_1\\times q^{n-1}$.'], forme_libre=True),
     case('$(u_n)$ est une suite géométrique de raison $q$, et $p$ un entier naturel. Complète'
          ' la formule, valable pour tout entier naturel $n$.\n\n$u_n=u_p\\times ?$', 'q^{n-p}',
          ['De $u_p$ à $u_n$, on multiplie $n-p$ fois par la raison :'
           ' $u_n=u_p\\times q^{n-p}$.'], forme_libre=True)],
    [spec('qⁿ', 0, 'q^n', 'correct'), spec('Erreur : nq', 0, 'nq', 'incorrect'),
     spec('Erreur : qⁿ⁻¹', 0, 'q^{n-1}', 'incorrect'),
     spec('qⁿ⁻¹', 1, 'q^{n-1}', 'correct'), spec('Erreur : qⁿ', 1, 'q^n', 'incorrect'),
     spec('qⁿ⁻ᵖ', 2, 'q^{n-p}', 'correct'), spec('Erreur : qⁿ', 2, 'q^n', 'incorrect')],
    description='Compléter uₙ = u₀ × qⁿ, uₙ = u₁ × qⁿ⁻¹, uₙ = uₚ × qⁿ⁻ᵖ')))

# C15 — étapes à ranger, 1SPE-216
MODELES.append(('C15-cours-demontrer-suite-geometrique-etapes', modele(
    'Cours : démontrer qu\'une suite est géométrique (étapes)', '1SPE-216', 1, 60,
    [ranger('On veut démontrer que la suite définie, pour tout entier naturel $n$, par'
            ' $u_n={{a}}\\times{{q}}^n$ est géométrique. Remets les étapes dans l\'ordre.',
            ['Pour tout entier naturel $n$, on exprime $u_{n+1}$.',
             '$u_{n+1}={{a}}\\times{{q}}^{n+1}$',
             '$u_{n+1}={{q}}\\times\\left({{a}}\\times{{q}}^n\\right)={{q}}\\times u_n$',
             'On passe de $u_n$ à $u_{n+1}$ en multipliant par ${{q}}$, qui ne dépend pas de'
             ' $n$ : la suite est géométrique de raison ${{q}}$.'],
            ['On exprime $u_{n+1}$, on fait apparaître $u_n$, puis on conclut.'],
            [var('a', '2..9'), var('q', '2..5')], ),
     ranger('Remets dans l\'ordre les étapes de la méthode pour démontrer qu\'une suite $(u_n)$'
            ' est géométrique.',
            ['Exprimer $u_{n+1}$ en fonction de $n$.',
             'Faire apparaître $u_n$ : écrire $u_{n+1}$ sous la forme $q\\times u_n$.',
             'Constater que $q$ est un nombre qui ne dépend pas de $n$.',
             'Conclure : $(u_n)$ est géométrique de raison $q$.'],
            ['La conclusion vient en dernier : elle s\'appuie sur l\'écriture'
             ' $u_{n+1}=q\\times u_n$.'])],
    specs_ranger(0, {'a': 3, 'q': 2}) + specs_ranger(1),
    description='Remettre dans l\'ordre les étapes de la méthode')))

# C16 — case choix, 1SPE-217
MODELES.append(('C16-cours-coefficient-multiplicateur', modele(
    'Cours : coefficient multiplicateur d\'une évolution', '1SPE-217', 1, 30,
    [choix('Augmenter une quantité de ${{t}}\\,\\%$ revient à la multiplier par…',
           '$1{,}0{{t}}$', ['$0{,}0{{t}}$', '$1{,}{{t}}$', '$0{,}9{{eval:10-t}}$'],
           ['Augmenter de ${{t}}\\,\\%$ : $x+\\dfrac{ {{t}} }{100}x=\\left(1+\\dfrac{ {{t}} }{100}'
            '\\right)x=1{,}0{{t}}\\,x$.'], [var('t', '2..9')]),
     choix('Diminuer une quantité de ${{t}}\\,\\%$ revient à la multiplier par…',
           '$0{,}9{{eval:10-t}}$', ['$1{,}0{{t}}$', '$0{,}0{{t}}$', '$-0{,}0{{t}}$'],
           ['Diminuer de ${{t}}\\,\\%$ : $x-\\dfrac{ {{t}} }{100}x=\\left(1-\\dfrac{ {{t}} }{100}'
            '\\right)x=0{,}9{{eval:10-t}}\\,x$.'], [var('t', '2..9')]),
     choix('Une quantité augmente de ${{t}}\\,\\%$ chaque année. La suite de ses valeurs'
           ' annuelles est…', 'géométrique de raison $1{,}0{{t}}$',
           ['arithmétique de raison ${{t}}$', 'géométrique de raison ${{t}}$',
            'géométrique de raison $0{,}0{{t}}$'],
           ['Chaque année, on multiplie par $1+\\dfrac{ {{t}} }{100}=1{,}0{{t}}$ : la suite est'
            ' géométrique de raison $1{,}0{{t}}$.'], [var('t', '2..9')])],
    specs_choix(0, '1,0t', ['0,0t', '1,t', 'baisse'], {'t': 3})
    + specs_choix(1, '0,9(10−t)', ['hausse', '0,0t', 'négatif'], {'t': 3})
    + specs_choix(2, 'géométrique 1,0t', ['arithmétique', 'raison t', 'raison 0,0t'], {'t': 3}),
    description='Hausse, baisse en pourcentage et suite géométrique')))

# C17 — vrai/faux, 1SPE-229
MODELES.append(('C17-cours-vrai-faux-variation-geometrique', modele(
    'Cours : vrai ou faux sur le sens de variation d\'une suite géométrique', '1SPE-229', 1, 30,
    [vrai_faux('Une suite géométrique de raison $q={{q}}$ est croissante.', False,
               [' : tout dépend du signe du premier terme. Avec $u_0=-1$, les termes $-1$,'
                ' $-{{q}}$, $-{{eval:q*q}}$, … diminuent.'], [var('q', '2..5')]),
     vrai_faux('Si $u_0>0$ et $q>1$, la suite géométrique de premier terme $u_0$ et de raison'
               ' $q$ est strictement croissante.', True,
               [' : $u_{n+1}-u_n=u_0q^n(q-1)$, produit de nombres strictement positifs.']),
     vrai_faux('Si $u_0>0$ et $0<q<1$, la suite géométrique de premier terme $u_0$ et de raison'
               ' $q$ est strictement décroissante.', True,
               [' : $u_{n+1}-u_n=u_0q^n(q-1)$, avec $u_0q^n>0$ et $q-1<0$.']),
     vrai_faux('Une suite géométrique de raison $q=-2$ et de premier terme $u_0=1$ est'
               ' croissante.', False,
               [' : ses termes $1$, $-2$, $4$, $-8$, … changent de signe à chaque rang : elle'
                ' n\'est ni croissante ni décroissante.'])],
    specs_vf(0, False, {'q': 2}) + specs_vf(1, True) + specs_vf(2, True) + specs_vf(3, False),
    description='Vrai/faux : signe du premier terme, raison et sens de variation')))

# C18 — plusieurs réponses, 1SPE-229
PROPS_CROISS = ['$u_0>0$ et $q>1$', '$u_0<0$ et $0<q<1$', '$u_0>0$ et $0<q<1$',
                '$u_0<0$ et $q>1$', '$q<0$']
MODELES.append(('C18-cours-quand-une-suite-geometrique-est-croissante', modele(
    'Cours : quand une suite géométrique est-elle croissante ?', '1SPE-229', 2, 45,
    [plusieurs('Une suite géométrique a pour premier terme $u_0$ et pour raison $q$. Coche tous'
               ' les cas où elle est **strictement croissante**.', PROPS_CROISS, [0, 1],
               ['$u_{n+1}-u_n=u_0q^n(q-1)$ ; pour $q>0$, $q^n>0$, donc ce signe est celui de'
                ' $u_0(q-1)$ : positif quand $u_0$ et $q-1$ ont le même signe.',
                'Si $q<0$, les termes changent de signe à chaque rang : la suite n\'est pas'
                ' monotone.']),
     plusieurs('Une suite géométrique a pour premier terme $u_0$ et pour raison $q$. Coche tous'
               ' les cas où elle est **strictement décroissante**.', PROPS_CROISS, [2, 3],
               ['$u_{n+1}-u_n=u_0q^n(q-1)$ ; pour $q>0$, ce signe est celui de $u_0(q-1)$ :'
                ' négatif quand $u_0$ et $q-1$ sont de signes contraires.',
                'Si $q<0$, les termes changent de signe à chaque rang : la suite n\'est pas'
                ' monotone.'])],
    [spec('croissante : 0 et 1', 0, '0;1', 'correct'),
     # une bonne réponse oubliée, aucune fausse : moitié des points (unoptimal_form)
     spec('Incomplet : seulement le premier cas', 0, '0', 'unoptimal_form'),
     spec('Erreur : q > 1 sans regarder u₀', 0, '0;3', 'incorrect'),
     spec('décroissante : 2 et 3', 1, '2;3', 'correct'),
     spec('Erreur : q < 0 coché', 1, '2;3;4', 'incorrect')],
    description='Plusieurs réponses : signe de u₀ et position de q par rapport à 1')))

# C19 — trouver l'erreur, 1SPE-216
MODELES.append(('C19-cours-erreur-suite-geometrique', modele(
    'Cours : trouver l\'erreur (suite géométrique)', '1SPE-216', 2, 45,
    [choix('Tom calcule les premiers termes d\'une suite : $u_0=1$, $u_1=2$, $u_2=4$. Il écrit'
           ' : « $\\dfrac{u_1}{u_0}=\\dfrac{u_2}{u_1}=2$, donc la suite est géométrique de'
           ' raison $2$. » Où est l\'erreur ?',
           'Deux quotients égaux ne suffisent pas : il faut que $\\dfrac{u_{n+1}}{u_n}$ soit le'
           ' même pour tout $n$.',
           ['Les quotients sont mal calculés.', 'La raison est $\\dfrac{1}{2}$.',
            'Il n\'y a pas d\'erreur.'],
           ['Trois termes ne disent rien des suivants. Par exemple, $u_n=2^n+n(n-1)(n-2)$ donne'
            ' $u_0=1$, $u_1=2$, $u_2=4$, mais $u_3=14$, et non $8$.']),
     choix('Léna lit : « pour tout entier naturel $n$, $u_{n+1}={{b}}u_n+{{c}}$ ». Elle conclut'
           ' : « la suite $(u_n)$ est géométrique de raison ${{b}}$ ». A-t-elle raison ?',
           'Non : à cause du $+{{c}}$, $u_{n+1}$ n\'est pas de la forme $q\\times u_n$.',
           ['Oui, la raison est ${{b}}$.', 'Oui, la raison est ${{eval:b+c}}$.',
            'Non, elle est arithmétique de raison ${{c}}$.'],
           ['Une suite géométrique vérifie $u_{n+1}=q\\times u_n$, sans terme ajouté. Ici, avec'
            ' $u_0=1$ : $u_1={{eval:b+c}}$, $u_2={{eval:b*(b+c)+c}}$, et'
            ' $\\dfrac{u_1}{u_0}\\neq\\dfrac{u_2}{u_1}$.'],
           [var('b', '2..5'), var('c', '1..9')])],
    specs_choix(0, 'pour tout n', ['calcul', 'raison 1/2', 'pas d\'erreur'])
    + specs_choix(1, 'non, à cause du + c', ['raison b', 'raison b + c', 'arithmétique'],
                  {'b': 2, 'c': 3}),
    description='Repérer l\'erreur dans une preuve qu\'une suite est géométrique')))

# ---------------------------------------------------------------------------------------------
# D. Sommes
# ---------------------------------------------------------------------------------------------

# D20 — case, 1SPE-215
MODELES.append(('D20-cours-formule-somme-des-entiers', modele(
    'Cours : formule de 1 + 2 + ⋯ + n', '1SPE-215', 1, 45,
    [case('Complète, pour tout entier naturel $n$ non nul.\n\n$1+2+\\cdots+n=?$',
          '\\dfrac{n(n+1)}{2}', ['$1+2+\\cdots+n=\\dfrac{n(n+1)}{2}$.'], forme_libre=True),
     case('Complète, pour tout entier naturel $n$ non nul.\n\n'
          '$1+2+\\cdots+n=\\dfrac{n\\times(?)}{2}$', 'n+1',
          ['$1+2+\\cdots+n=\\dfrac{n(n+1)}{2}$ : le nombre de termes, $n$, fois le premier plus'
           ' le dernier, $1+n$, divisé par $2$.'], forme_libre=True)],
    [spec('n(n+1)/2', 0, '\\frac{n(n+1)}{2}', 'correct'),
     spec('Erreur : n(n−1)/2', 0, '\\frac{n(n-1)}{2}', 'incorrect'),
     spec('Erreur : sans diviser par 2', 0, 'n(n+1)', 'incorrect'),
     spec('n + 1', 1, 'n+1', 'correct'), spec('Erreur : n − 1', 1, 'n-1', 'incorrect')],
    description='Compléter la formule de la somme des n premiers entiers')))

# D21 — case, 1SPE-218
MODELES.append(('D21-cours-formule-somme-puissances-de-q', modele(
    'Cours : formule de 1 + q + ⋯ + qⁿ', '1SPE-218', 1, 45,
    [case('Complète, pour tout réel $q\\neq1$ et tout entier naturel $n$.\n\n'
          '$1+q+q^2+\\cdots+q^n=\\dfrac{?}{1-q}$', '1-q^{n+1}',
          ['$1+q+\\cdots+q^n=\\dfrac{1-q^{n+1}}{1-q}$ : l\'exposant est $n+1$, le nombre de'
           ' termes.'], forme_libre=True),
     case('Complète, pour tout réel $q\\neq1$ et tout entier naturel $n$.\n\n'
          '$1+q+q^2+\\cdots+q^n=\\dfrac{1-q^{?}}{1-q}$', 'n+1',
          ['La somme compte $n+1$ termes ($q^0$ à $q^n$) : l\'exposant est $n+1$.'],
          forme_libre=True)],
    [spec('1 − qⁿ⁺¹', 0, '1-q^{n+1}', 'correct'),
     spec('Erreur : 1 − qⁿ', 0, '1-q^n', 'incorrect'),
     spec('n + 1', 1, 'n+1', 'correct'), spec('Erreur : n', 1, 'n', 'incorrect')],
    description='Compléter la formule de 1 + q + ⋯ + qⁿ')))

# D22 — cartes, 1SPE-226 et 1SPE-227
MODELES.append(('D22a-cours-somme-termes-arithmetique', modele(
    'Cours : somme de termes consécutifs d\'une suite arithmétique', '1SPE-226', 1, 30,
    [carte('Comment calcule-t-on une somme de termes consécutifs d\'une suite'
           ' **arithmétique** ?',
           ['$$S=\\text{(nombre de termes)}\\times'
            '\\dfrac{\\text{premier terme}+\\text{dernier terme}}{2}$$',
            'Exemple : $u_0+u_1+\\cdots+u_{9}$ compte $10$ termes, donc'
            ' $S=10\\times\\dfrac{u_0+u_9}{2}$.'])],
    [], carte=True, description='Carte de cours : somme de termes, suite arithmétique')))

MODELES.append(('D22b-cours-somme-termes-geometrique', modele(
    'Cours : somme de termes consécutifs d\'une suite géométrique', '1SPE-227', 1, 30,
    [carte('Comment calcule-t-on une somme de termes consécutifs d\'une suite **géométrique**'
           ' de raison $q\\neq1$ ?',
           ['$$S=\\text{(premier terme)}\\times'
            '\\dfrac{1-q^{\\text{nombre de termes}}}{1-q}$$',
            'Exemple : $u_0+u_1+\\cdots+u_{9}$ compte $10$ termes, donc'
            ' $S=u_0\\times\\dfrac{1-q^{10}}{1-q}$.'])],
    [], carte=True, description='Carte de cours : somme de termes, suite géométrique')))

# D23 — case choix, 1SPE-226
MODELES.append(('D23-cours-nombre-de-termes-d-une-somme', modele(
    'Cours : nombre de termes d\'une somme', '1SPE-226', 1, 30,
    [choix('Combien de termes compte la somme $u_{ {{p}} }+u_{ {{eval:p+1}} }+\\cdots'
           '+u_{ {{m}} }$ ?', '${{eval:m-p+1}}$',
           ['${{eval:m-p}}$', '${{m}}$', '${{eval:m+1}}$'],
           ['De $u_{ {{p}} }$ à $u_{ {{m}} }$, il y a ${{m}}-{{p}}+1={{eval:m-p+1}}$ termes :'
            ' on n\'oublie pas de compter le premier.'],
           [var('p', '2..9'), var('d', '5..20'), var('m', 'eval:p+d')]),
     choix('Combien de termes compte la somme $u_0+u_1+\\cdots+u_{ {{m}} }$ ?',
           '${{eval:m+1}}$', ['${{m}}$', '${{eval:m-1}}$'],
           ['De $u_0$ à $u_{ {{m}} }$, il y a ${{m}}+1={{eval:m+1}}$ termes, car on part de'
            ' $0$.'], [var('m', '8..30')])],
    specs_choix(0, 'm − p + 1', ['m − p', 'm', 'm + 1'], {'p': 3, 'd': 10, 'm': 13})
    + specs_choix(1, 'm + 1', ['m', 'm − 1'], {'m': 10}),
    description='Compter les termes d\'une somme (piège du premier terme)')))

# ---------------------------------------------------------------------------------------------
# E. Sens de variation
# ---------------------------------------------------------------------------------------------

# E26 — carte, 1SPE-219
MODELES.append(('E26-cours-methodes-sens-de-variation', modele(
    'Cours : méthodes pour le sens de variation d\'une suite', '1SPE-219', 1, 30,
    [carte('Quelles méthodes permettent d\'étudier le sens de variation d\'une suite $(u_n)$ ?',
           ['- Étudier le **signe de $u_{n+1}-u_n$** : positif pour tout $n$, la suite est'
            ' croissante ; négatif, elle est décroissante.\n'
            '- Si **tous les termes sont strictement positifs**, comparer'
            ' $\\dfrac{u_{n+1}}{u_n}$ à $1$ : supérieur à $1$, la suite est croissante.\n'
            '- Si $u_n=f(n)$, étudier les **variations de $f$** sur $[0\\,;+\\infty[$ : si $f$'
            ' est croissante, la suite aussi.'])],
    [], carte=True, description='Carte de cours : trois méthodes pour le sens de variation')))

# E27 — case choix, 1SPE-219
PROPS_METH = ['étudier le signe de $u_{n+1}-u_n$',
              'comparer $\\dfrac{u_{n+1}}{u_n}$ à $1$',
              'étudier les variations d\'une fonction $f$ telle que $u_n=f(n)$']
MODELES.append(('E27-cours-choisir-la-methode-sens-de-variation', modele(
    'Cours : choisir la méthode pour le sens de variation', '1SPE-219', 2, 45,
    [choix_fixe('La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$,'
                ' $u_{n+1}=u_n+n^2+{{c}}$. Pour étudier son sens de variation, la méthode la plus'
                ' adaptée est de…', PROPS_METH, 0,
                ['$u_{n+1}-u_n=n^2+{{c}}$ se lit directement : c\'est strictement positif, la'
                 ' suite est strictement croissante.',
                 'Pas de forme explicite ici, donc pas de fonction $f$ ; et rien ne dit que les'
                 ' termes sont positifs pour le quotient… même s\'ils le sont.'],
                [var('a', '1..9'), var('c', '1..9')]),
     choix_fixe('La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
                ' $u_n={{a}}\\times{{q}}^n$. Pour étudier son sens de variation, la méthode la'
                ' plus adaptée est de…', PROPS_METH, 1,
                ['Tous les termes sont strictement positifs et'
                 ' $\\dfrac{u_{n+1}}{u_n}={{q}}>1$ : la suite est strictement croissante.',
                 'Le quotient se simplifie tout de suite, alors que la différence demande une'
                 ' factorisation.'], [var('a', '1..9'), var('q', '2..5')]),
     choix_fixe('La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
                ' $u_n=\\sqrt{n+{{c}}}$. Pour étudier son sens de variation, la méthode la plus'
                ' adaptée est de…', PROPS_METH, 2,
                ['$u_n=f(n)$ avec $f(x)=\\sqrt{x+{{c}}}$, croissante sur $[0\\,;+\\infty[$ : la'
                 ' suite est croissante.'], [var('c', '1..9')])],
    [spec('différence', 0, '0', 'correct'), spec('Erreur : fonction', 0, '2', 'incorrect'),
     spec('quotient', 1, '1', 'correct'), spec('Erreur : différence', 1, '0', 'incorrect'),
     spec('fonction', 2, '2', 'correct'), spec('Erreur : quotient', 2, '1', 'incorrect')],
    description='Choisir entre différence, quotient et fonction associée')))

# E28 — vrai/faux, 1SPE-219
MODELES.append(('E28-cours-vrai-faux-sens-de-variation', modele(
    'Cours : vrai ou faux sur le sens de variation d\'une suite', '1SPE-219', 1, 30,
    [vrai_faux('Si $u_0<u_1<u_2$, alors la suite $(u_n)$ est croissante.', False,
               [' : trois termes ne disent rien des suivants. Par exemple, $u_n=4n-n^2$'
                ' donne $u_0=0<u_1=3<u_2=4$, puis $u_3=3$.']),
     vrai_faux('Si, pour tout entier naturel $n$, $u_{n+1}-u_n>0$, alors la suite $(u_n)$ est'
               ' strictement croissante.', True,
               [' : chaque terme est strictement plus grand que le précédent.']),
     vrai_faux('Si $u_n=f(n)$ pour tout entier naturel $n$, et si $f$ est croissante sur'
               ' $[0\\,;+\\infty[$, alors la suite $(u_n)$ est croissante.', True,
               [' : $n<n+1$ et $f$ croissante donnent $f(n)\\leqslant f(n+1)$, soit'
                ' $u_n\\leqslant u_{n+1}$.']),
     vrai_faux('Une suite peut n\'être ni croissante ni décroissante.', True,
               [' : par exemple $u_n=(-1)^n$ vaut $1$, $-1$, $1$, $-1$, …'])],
    specs_vf(0, False) + specs_vf(1, True) + specs_vf(2, True) + specs_vf(3, True),
    description='Vrai/faux : méthodes et pièges du sens de variation')))

# E29 — trouver l'erreur, 1SPE-219
MODELES.append(('E29-cours-erreur-sens-de-variation', modele(
    'Cours : trouver l\'erreur (sens de variation)', '1SPE-219', 2, 45,
    [choix('Inès étudie la suite définie par $u_n=(-{{q}})^n$. Elle calcule'
           ' $\\dfrac{u_{n+1}}{u_n}=-{{q}}$, puis écrit : « $-{{q}}<1$, donc la suite est'
           ' décroissante ». Où est l\'erreur ?',
           'On ne compare le quotient à $1$ que si tous les termes sont strictement positifs.',
           ['Le quotient est mal calculé.', 'Il fallait comparer le quotient à $0$.',
            'Il n\'y a pas d\'erreur.'],
           ['Ici les termes changent de signe : $1$, $-{{q}}$, ${{eval:q*q}}$, … La suite n\'est'
            ' ni croissante ni décroissante.'], [var('q', '2..5')]),
     choix('Inès étudie une suite qui vérifie, pour tout entier naturel $n$,'
           ' $u_{n+1}-u_n=n-{{k}}$. Elle conclut : « la suite est croissante ». Où est'
           ' l\'erreur ?',
           '$n-{{k}}$ est négatif pour $n<{{k}}$ : la suite n\'est croissante qu\'à partir du'
           ' rang ${{k}}$.',
           ['La différence est mal calculée.', 'Il fallait calculer le quotient.',
            'Il n\'y a pas d\'erreur.'],
           ['Pour $n<{{k}}$, $u_{n+1}-u_n<0$ : les premiers termes diminuent. Le signe doit être'
            ' étudié pour **tout** $n$.'], [var('k', '3..9')])],
    specs_choix(0, 'termes positifs', ['calcul', 'comparer à 0', 'pas d\'erreur'], {'q': 2})
    + specs_choix(1, 'signe selon n', ['calcul', 'quotient', 'pas d\'erreur'], {'k': 4}),
    description='Repérer l\'erreur dans une étude de sens de variation')))

# ---------------------------------------------------------------------------------------------
# F. Limites, approche intuitive
# ---------------------------------------------------------------------------------------------

# F30 — case choix, 1SPE-231
PROPS_LIM = ['la suite tend vers $+\\infty$', 'la suite converge vers ${{l}}$',
             'la suite n\'a pas de limite', 'la suite est constante']
MODELES.append(('F30-cours-conjecturer-une-limite-en-mots', modele(
    'Cours : conjecturer une limite à partir d\'une description', '1SPE-231', 1, 30,
    [choix_fixe('Quand $n$ augmente, les termes d\'une suite deviennent aussi grands qu\'on veut'
                ' et le restent. On conjecture que…', PROPS_LIM, 0,
                ['Des termes qui dépassent tout nombre, à partir d\'un certain rang : la suite'
                 ' tend vers $+\\infty$.'], [var('l', '2..9')]),
     choix_fixe('Quand $n$ augmente, les termes d\'une suite se rapprochent autant qu\'on veut de'
                ' ${{l}}$. On conjecture que…', PROPS_LIM, 1,
                ['Des termes aussi proches qu\'on veut de ${{l}}$ : la suite converge vers'
                 ' ${{l}}$. Elle n\'a pas besoin de valoir ${{l}}$.'], [var('l', '2..9')]),
     choix_fixe('Les termes d\'une suite valent alternativement ${{l}}$ et $-{{l}}$. On'
                ' conjecture que…', PROPS_LIM, 2,
                ['Les termes ne se rapprochent d\'aucun nombre et ne grandissent pas : la suite'
                 ' n\'a pas de limite.'], [var('l', '2..9')])],
    [spec('+∞', 0, '0', 'correct', {'l': 2}), spec('Erreur : sans limite', 0, '2', 'incorrect',
                                                    {'l': 2}),
     spec('converge', 1, '1', 'correct', {'l': 3}),
     spec('Erreur : constante', 1, '3', 'incorrect', {'l': 3}),
     spec('pas de limite', 2, '2', 'correct', {'l': 4}),
     spec('Erreur : converge', 2, '1', 'incorrect', {'l': 4})],
    description='Tend vers +∞, converge ou n\'a pas de limite, en mots')))

# F31 — vrai/faux, 1SPE-220
MODELES.append(('F31-cours-vrai-faux-limite', modele(
    'Cours : vrai ou faux sur la limite d\'une suite', '1SPE-220', 1, 30,
    [vrai_faux('Une suite croissante tend forcément vers $+\\infty$.', False,
               [' : $u_n=1-\\dfrac{1}{n+1}$ est croissante et ses termes se rapprochent de $1$'
                ' sans jamais le dépasser.']),
     vrai_faux('Une suite peut n\'avoir aucune limite.', True,
               [' : $u_n=(-1)^n$ vaut alternativement $1$ et $-1$, sans se rapprocher d\'aucun'
                ' nombre.']),
     vrai_faux('Une suite qui converge vers ${{l}}$ peut avoir des termes supérieurs à ${{l}}$.',
               True, [' : $u_n={{l}}+\\dfrac{1}{n+1}$ converge vers ${{l}}$ et tous ses termes'
                      ' sont supérieurs à ${{l}}$.'], [var('l', '2..9')]),
     vrai_faux('La suite géométrique de premier terme $1$ et de raison ${{q}}$ tend vers'
               ' $+\\infty$.', True,
               [' : ses termes $1$, ${{q}}$, ${{eval:q*q}}$, … deviennent aussi grands qu\'on'
                ' veut.'], [var('q', '2..5')])],
    specs_vf(0, False) + specs_vf(1, True) + specs_vf(2, True, {'l': 3})
    + specs_vf(3, True, {'q': 2}),
    description='Vrai/faux : limite, croissance, absence de limite')))


# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_point')
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien_id = None
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien_id = json.load(f).get('id')
    if ancien_id:
        m = {'id': ancien_id, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
for nom, m in MODELES:
    print(' ', m['_point'], nom)

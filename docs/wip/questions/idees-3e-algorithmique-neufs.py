"""Modèle neuf de 5e du chantier idees-3e-algorithmique : fiche E, « Diviseurs et multiples avec
un programme » (point 5-011), dans scripts/questions/idees-3e-algorithmique-neufs/.

Phase 0 validée par David le 2026-11-28 (« je valide tes recos », Q1 : dans ce chantier). Idée
reprise de 3I12-1 à 3I12-4 de l'autre plateforme : un script qui teste « a modulo b = 0 » et un
script qui dit les diviseurs d'un nombre. Chez eux, on complète des briques sur papier ; chez
nous, on choisit la brique qui manque, ou on lit ce que dit le lutin.

Décisions et pièges :
- Point 5-011 (5e) : « algorithme de la division (recherche des diviseurs, nombre de diviseurs),
  Scratch ou tableur ». Le modèle va en 5e (`grades` ['5']), sous-notion « Algorithmique >
  Variables et instructions > instructions conditionnelles » (le point est sur la notion). La
  5e n'a pas d'autre modèle dans cette sous-notion : niveau 1.
- Le programme est LU, jamais écrit : la boîte à outils de 5e n'a pas de « si » (les
  conditionnelles s'écrivent en 4e). Lire un « si » sur le reste suffit au point.
- Pas de Oui / Non (une chance sur deux) : v1 et v2 font choisir parmi quatre.
- v1 : la phrase du lutin change avec `w` (multiple, diviseur, « divise »), et la bonne condition
  avec elle (« a divise b » → b modulo a). Indice du bon choix dans une variable (`k`), jamais
  un `{{if}}` imbriqué.
- v3, v4 : nombres de départ dans une liste (nombre de diviseurs et 3e diviseur lus par la même
  liste, sélecteur `s`).

Usage : python3 docs/wip/questions/idees-3e-algorithmique-neufs.py scripts/questions/idees-3e-algorithmique-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

P0 = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v.update({'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint})
    return v


def couleur(contenu):
    return '$' + P0 + '{' + contenu + '}$'


def ind(u, k):
    return f'(1-min(abs(({u})-({k})),1))'


def choisir(selecteur, valeurs):
    return 'eval:' + '+'.join(f'({v})*{ind(selecteur, k)}' for k, v in enumerate(valeurs))


def diviseurs(n):
    return [d for d in range(1, n + 1) if n % d == 0]


MODULO = ('**Rappel.** Dans Scratch, « $a$ modulo $b$ » donne le **reste** de la division '
          'euclidienne de $a$ par $b$ : $17$ modulo $5$ vaut $2$.')

# ---------------------------------------------------------------------------
# v1 : quelle condition ?
# ---------------------------------------------------------------------------

PHRASES = ['Le premier nombre est un multiple du second.',
           'Le second nombre est un diviseur du premier.',
           'Le premier nombre divise le second.']
V1 = variation(
    MODULO + '\n\nOn veut que ce programme dise « ' + ''.join(
        f'{{{{if:w=={k}|{p}|}}}}' for k, p in enumerate(PHRASES)) + ' » quand c\'est vrai.\n\n'
    '```scratch\ndemander [Donne un premier nombre entier.] et attendre\nmettre [a v] à (réponse)\n'
    'demander [Donne un second nombre entier.] et attendre\nmettre [b v] à (réponse)\n'
    'si <> alors\ndire [Oui]\nsinon\ndire [Non]\nfin\n```\n\n'
    'Quelle condition faut-il mettre dans le « si » ?\n\n'
    '````choix\n- ```scratch\n  <((a) modulo (b)) = [0]>\n  ```\n'
    '- ```scratch\n  <((b) modulo (a)) = [0]>\n  ```\n'
    '- ```scratch\n  <((a) modulo (b)) = [1]>\n  ```\n'
    '- ```scratch\n  <((a) / (b)) = [0]>\n  ```\n````',
    [var('w', '0..2'), var('k', choisir('w', [0, 0, 1]))],
    [case('{{k}}')],
    ['« $a$ est un multiple de $b$ », « $b$ est un diviseur de $a$ » et « $b$ divise $a$ » veulent '
     'dire la même chose : la division de $a$ par $b$ tombe juste, son reste vaut $0$.',
     '{{if:w==2|Ici, c\'est le premier nombre, $a$, qui divise le second, $b$ : on teste le reste de $b$ par $a$.|'
     'Ici, on teste le reste de la division de $a$ par $b$.}}',
     'La bonne condition est ' + couleur('\\text{{{if:w==2|(b modulo a) = 0|(a modulo b) = 0}}}') + '.'],
    'Un nombre est un multiple d\'un autre quand la division tombe juste : que vaut alors le reste ?',
)
SPECS_V1 = [
    spec('v1 : multiple → a modulo b', 0, {'w': 0}, 'correct', ['0']),
    spec('v1 : diviseur → a modulo b', 0, {'w': 1}, 'correct', ['0']),
    spec('v1 : divise → b modulo a', 0, {'w': 2}, 'correct', ['1']),
    spec('v1 : divise, modulo à l\'envers', 0, {'w': 2}, 'incorrect', ['0']),
    spec('v1 : reste 1', 0, {'w': 0}, 'incorrect', ['2']),
    spec('v1 : quotient nul', 0, {'w': 0}, 'incorrect', ['3']),
]

# ---------------------------------------------------------------------------
# v2 : pour quel couple le lutin dit-il « multiple » ?
# ---------------------------------------------------------------------------

PROGRAMME_MULTIPLE = (
    '```scratch\ndemander [Donne un premier nombre entier.] et attendre\nmettre [a v] à (réponse)\n'
    'demander [Donne un second nombre entier.] et attendre\nmettre [b v] à (réponse)\n'
    'si <((a) modulo (b)) = [0]> alors\ndire [Le premier nombre est un multiple du second.]\nsinon\n'
    'dire [Le premier nombre n\'est pas un multiple du second.]\nfin\n```')
V2 = variation(
    MODULO + '\n\n' + PROGRAMME_MULTIPLE + '\n\n'
    'Pour quels nombres saisis, dans cet ordre, le lutin dit-il « Le premier nombre est un multiple '
    'du second. » ?\n\n'
    '```choix\n- ${{eval:q*b}}$ puis ${{b}}$\n- ${{b}}$ puis ${{eval:q*b}}$\n'
    '- ${{eval:q*b+1}}$ puis ${{b}}$\n- ${{eval:q*b}}$ puis ${{eval:b+1}}$\n```',
    [var('b', '3..9'), var('q', '2..9')],
    [case('0')],
    ['Le lutin dit « multiple » quand le reste de la division du **premier** nombre par le **second** '
     'vaut $0$.',
     '${{eval:q*b}} = {{q}} \\times {{b}}$ : le reste de ${{eval:q*b}}$ par ${{b}}$ vaut $0$. '
     'Dans l\'autre ordre, le reste de ${{b}}$ par ${{eval:q*b}}$ vaut ${{b}}$.',
     'Il faut saisir ' + couleur('{{eval:q*b}}') + ' puis ' + couleur('{{b}}') + '.'],
    'Pour chaque proposition, calcule le reste de la division du premier nombre par le second.',
    ['(q*b)%(b+1)!=0'],
)
V_V2 = {'b': 7, 'q': 6}  # 42 puis 7
SPECS_V2 = [
    spec('v2 : 42 puis 7', 1, V_V2, 'correct', ['0']),
    spec('v2 : ordre inversé', 1, V_V2, 'incorrect', ['1']),
    spec('v2 : 43 puis 7', 1, V_V2, 'incorrect', ['2']),
    spec('v2 : 42 puis 8', 1, V_V2, 'incorrect', ['3']),
]

# ---------------------------------------------------------------------------
# v3, v4 : le programme des diviseurs
# ---------------------------------------------------------------------------

DEPARTS = [12, 18, 20, 24, 28, 30, 36, 40]
NB_DIV = [len(diviseurs(n)) for n in DEPARTS]
TROISIEME = [diviseurs(n)[2] for n in DEPARTS]
QUATRIEME = [diviseurs(n)[3] for n in DEPARTS]
LISTES = [', '.join(str(d) for d in diviseurs(n)) for n in DEPARTS]
PROGRAMME_DIVISEURS = (
    '```scratch\nquand le drapeau vert pressé\ndemander [Donne un nombre entier.] et attendre\n'
    'mettre [d v] à (1)\nrépéter (réponse) fois\nsi <((réponse) modulo (d)) = [0]> alors\n'
    'dire (d) pendant (1) secondes\nfin\najouter (1) à [d v]\nfin\n```')
LISTE_DIT = 'Le lutin dit, dans l\'ordre : ' + ''.join(
    f'{{{{if:s=={k}|${LISTES[k]}$|}}}}' for k in range(len(DEPARTS))) + '.'
VARS_DIV = [var('s', f'0..{len(DEPARTS) - 1}'), var('N', choisir('s', DEPARTS)),
            var('D', choisir('s', NB_DIV)), var('T', choisir('s', TROISIEME)),
            var('Q', choisir('s', QUATRIEME))]
ETAPE_DIV = ('La variable $d$ prend les valeurs $1$, $2$, $3$, …, ${{N}}$ (la boucle tourne ${{N}}$ '
             'fois). Le lutin dit $d$ quand le reste de ${{N}}$ par $d$ vaut $0$ : il dit les '
             '**diviseurs** de ${{N}}$.')
MSG_BORNES = 'Le lutin dit aussi $1$ et ${{N}}$ : ce sont des diviseurs de ${{N}}$.'
V3 = variation(
    MODULO + '\n\n' + PROGRAMME_DIVISEURS + '\n\nOn saisit ${{N}}$. **Combien** de nombres le lutin '
    'dit-il ?\n\n$?$',
    VARS_DIV,
    [case('{{D}}', [erreur('{{eval:D-2}}', MSG_BORNES, '1 et le nombre oubliés'),
                    erreur('{{eval:D-1}}', 'Le dernier tour teste $d = {{N}}$ : le reste vaut $0$, le '
                           'lutin dit aussi ${{N}}$.', 'Le nombre lui-même oublié'),
                    erreur('{{N}}', 'Le lutin ne parle que quand le reste vaut $0$, pas à chaque tour.',
                           'Un nombre par tour')])],
    [ETAPE_DIV, LISTE_DIT, 'Il dit ' + couleur('{{D}}') + ' nombres.'],
    'La variable $d$ va de $1$ au nombre saisi. Le lutin ne parle que quand le reste vaut $0$ : '
    'écris les valeurs de $d$ pour lesquelles c\'est le cas.',
)
V_V3 = {'s': 0}  # 12 : 1, 2, 3, 4, 6, 12
SPECS_V3 = [
    spec('v3 : 12 → 6', 2, V_V3, 'correct', ['6']),
    spec('v3 : 36 → 9', 2, {'s': 6}, 'correct', ['9']),
    spec('v3 : 1 et 12 oubliés', 2, V_V3, 'incorrect', ['4'],
         'Le lutin dit aussi $1$ et $12$ : ce sont des diviseurs de $12$.'),
    spec('v3 : 12 oublié', 2, V_V3, 'incorrect', ['5'],
         'Le dernier tour teste $d = 12$ : le reste vaut $0$, le lutin dit aussi $12$.'),
    spec('v3 : un par tour', 2, V_V3, 'incorrect', ['12'],
         'Le lutin ne parle que quand le reste vaut $0$, pas à chaque tour.'),
]

V4 = variation(
    MODULO + '\n\n' + PROGRAMME_DIVISEURS + '\n\nOn saisit ${{N}}$. Quel est le **troisième** nombre '
    'que dit le lutin ?\n\n$?$',
    VARS_DIV,
    [case('{{T}}', [erreur('{{Q}}', 'Le premier nombre dit est $1$ : $1$ divise tous les nombres.',
                           '1 oublié'),
                    erreur('3', 'Le lutin ne dit pas toutes les valeurs de $d$ : seulement celles où le '
                           'reste vaut $0$.', 'Troisième valeur de d')])],
    [ETAPE_DIV, LISTE_DIT, 'Le troisième nombre dit est ' + couleur('{{T}}') + '.'],
    'Écris les valeurs de $d$ pour lesquelles le reste vaut $0$, dans l\'ordre, sans oublier $1$.',
)
SPECS_V4 = [
    spec('v4 : 20 → 4', 3, {'s': 2}, 'correct', ['4']),
    spec('v4 : 28 → 4', 3, {'s': 4}, 'correct', ['4']),
    spec('v4 : 1 oublié (5)', 3, {'s': 2}, 'incorrect', ['5'],
         'Le premier nombre dit est $1$ : $1$ divise tous les nombres.'),
    spec('v4 : 3e valeur de d', 3, {'s': 2}, 'incorrect', ['3'],
         'Le lutin ne dit pas toutes les valeurs de $d$ : seulement celles où le reste vaut $0$.'),
]

# ---------------------------------------------------------------------------
# v5 : que fait ce programme ?
# ---------------------------------------------------------------------------

V5 = variation(
    MODULO + '\n\n' + PROGRAMME_DIVISEURS + '\n\nQue fait ce programme ?\n\n'
    '```choix\n- Il dit tous les diviseurs du nombre saisi.\n'
    '- Il dit les premiers multiples du nombre saisi.\n'
    '- Il dit tous les nombres entiers de $1$ au nombre saisi.\n'
    '- Il dit le reste de la division du nombre saisi par $2$.\n```',
    [],
    [case('0')],
    ['La variable $d$ prend les valeurs $1$, $2$, $3$, … jusqu\'au nombre saisi.',
     'Le lutin dit $d$ seulement quand le reste de la division du nombre saisi par $d$ vaut $0$, '
     'c\'est-à-dire quand $d$ est un diviseur du nombre.',
     '$' + P0 + '{\\text{Il dit tous les diviseurs du nombre saisi.}}$'],
    'Essaie le programme avec un petit nombre, par exemple $6$ : note ce que dit le lutin.',
)
SPECS_V5 = [
    spec('v5 : diviseurs', 4, {}, 'correct', ['0']),
    spec('v5 : multiples', 4, {}, 'incorrect', ['1']),
    spec('v5 : tous les nombres', 4, {}, 'incorrect', ['2']),
]

variations = [V1, V2, V3, V4, V5]
specs = SPECS_V1 + SPECS_V2 + SPECS_V3 + SPECS_V4 + SPECS_V5

modele = {
    'rangement': {'noeud': 'Algorithmique > Variables et instructions > instructions conditionnelles',
                  'point': '5-011'},
    'title': 'Diviseurs et multiples avec un programme',
    'description': ("Lire un programme Scratch qui utilise le reste (modulo) : condition « est un "
                    "multiple de », nombres pour lesquels le lutin dit « multiple », programme qui "
                    "dit les diviseurs d'un nombre (combien, le troisième, ce qu'il fait)"),
    'grades': ['5'],
    'level': 1,
    'delay': 90,
    'status': 'draft',
    'variations': variations,
    'testSpecs': specs,
}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


ecrire('e-diviseurs-multiples-programme', modele)
print(f'{len(variations)} variations, {len(specs)} specs → {DOSSIER}')

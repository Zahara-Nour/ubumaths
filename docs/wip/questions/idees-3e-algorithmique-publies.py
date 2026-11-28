"""Ajoute les variations validées aux 6 modèles publiés exportés de prod dans
scripts/questions/idees-3e-algorithmique-publies/ (chantier idees-3e-algorithmique).

Phase 0 validée par David le 2026-11-28 (« je valide tes recos ») : fiches A, B, C, D, F, G, H du
journal (docs/wip/idees-3e-algorithmique-progress.md). Les variations s'ajoutent À LA FIN (les
réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Décisions et pièges du lot :
- Lutin (A) : déplacements multiples de 10, tirés en dizaines (kx, ky…) puis multipliés ; une plage
  négative ne se tire pas, on passe par un décalage (`eval:10*(a-7)`). `eval:` ne connaît ni `>` ni
  `==` : indicatrices `min(max(u-v,0),1)` sur des entiers (écart ≥ 1).
- A1 (« ou ») : quand une seule des deux conditions est vraie, « branche échangée » et « ou lu
  comme et » donnent la même position : une seule erreur prévue les couvre.
- A2 (boucle de 5 tours) : chaque tour est déroulé dans des variables (x1, y1… x6, y6). Le 6e tour
  sert à l'erreur « un tour de trop ».
- Syracuse (B) : départs tirés par un sélecteur dans une liste (3 à 10 étapes, valeurs ≤ 84),
  étapes et maximum lus par la même liste (fonction `choisir`). B2 exclut les départs dont le
  maximum est le départ ou la première valeur calculée (l'erreur prévue tomberait sur la réponse).
- Programmes à écrire (C, F) : notation du calcul de 3e, comme v0 à v2 de 6e99d291.
- Tableur (G) : températures en colonne B2:B6, négatives comprises (en ligne, le tableau débordait à
  390 px, vu à l'écran), formule à choisir (décision Q22 du 2026-11-18). Pas de « =SOMME(B2:B6)/5 »
  parmi les faux choix : c'est juste aussi.

Usage : python3 docs/wip/questions/idees-3e-algorithmique-publies.py scripts/questions/idees-3e-algorithmique-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

P0 = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-28)
ORIGINE = {'0a470416': (3, 9), '4ce8eb3c': (4, 12), '5c092e43': (4, 9), '6e99d291': (3, 9),
           '962da675': (3, 9), '9f9bddbd': (4, 10)}


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
    """Indicatrice de u == k (u, k entiers) pour `eval:`."""
    return f'(1-min(abs(({u})-({k})),1))'


def sup(u, v):
    """Indicatrice de u > v (u, v entiers) pour `eval:`."""
    return f'min(max(({u})-({v}),0),1)'


def choisir(selecteur, valeurs):
    """eval: valeur numéro `selecteur` (0, 1, 2…) de la liste."""
    return 'eval:' + '+'.join(f'({v})*{ind(selecteur, k)}' for k, v in enumerate(valeurs))


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


# ---------------------------------------------------------------------------
# A — Où est le lutin ? (9f9bddbd, 3-048 ; 4ce8eb3c, 3-049)
# ---------------------------------------------------------------------------

POSITION = '\n\nOù se trouve le lutin à la fin du programme ?\n\n$x = ?$ et $y = ?$'
HINT_LUTIN = ('Suis le lutin instruction par instruction : note $x$ et $y$ après chacune, et teste '
              'la condition avec les valeurs du moment.')

# A1 : 9f9bddbd v4, « ou » après deux déplacements
A1_VARS = [var('kx', '1..9'), var('ky', '1..9'), var('kp', '1..9'), var('kq', '1..9'),
           var('ku', '1..5'), var('kw', '1..5'),
           var('ax', 'eval:10*kx'), var('ay', 'eval:10*ky'), var('p', 'eval:10*kp'),
           var('q', 'eval:10*kq'), var('u', 'eval:10*ku'), var('w', 'eval:10*kw'),
           var('t', f'eval:min({sup("kx", "kp")}+{sup("ky", "kq")},1)')]
A1 = variation(
    'Le lutin part du point $(0\\,;0)$.\n\n```scratch\naller à x: (0) y: (0)\n'
    'ajouter ({{ax}}) à x\najouter ({{ay}}) à y\n'
    'si <<(abscisse x) > [{{p}}]> ou <(ordonnée y) > [{{q}}]>> alors\n'
    'ajouter ({{u}}) à x\nsinon\najouter ({{w}}) à y\nfin\n```' + POSITION,
    A1_VARS,
    [case('{{eval:ax+u*t}}', [
        erreur('{{eval:ax+u*(1-t)}}',
               'Relis la condition : avec « ou », il suffit qu\'une des deux comparaisons soit vraie '
               'pour faire le « alors ».', 'Condition mal évaluée (ou lu comme et)'),
        erreur('{{eval:u*t}}', 'Les deux premiers « ajouter » déplacent déjà le lutin avant le test.',
               'Déplacements du début oubliés')]),
     case('{{eval:ay+w*(1-t)}}', [
         erreur('{{eval:ay+w*t}}',
                'Relis la condition : avec « ou », il suffit qu\'une des deux comparaisons soit vraie '
                'pour faire le « alors ».', 'Condition mal évaluée (ou lu comme et)'),
         erreur('{{eval:w*(1-t)}}', 'Les deux premiers « ajouter » déplacent déjà le lutin avant le test.',
                'Déplacements du début oubliés')])],
    ['Après les deux premiers « ajouter », le lutin est en $({{ax}}\\,;{{ay}})$.',
     'Test : ${{ax}} > {{p}}$ est {{if:kx>kp|vrai|faux}}, ${{ay}} > {{q}}$ est {{if:ky>kq|vrai|faux}}. '
     'Avec « ou », la condition est {{if:t==1|vraie : le lutin fait le « alors »|fausse : le lutin fait le « sinon »}}.',
     'Position finale : ' + couleur('x = {{eval:ax+u*t}}') + ' et ' + couleur('y = {{eval:ay+w*(1-t)}}') + '.'],
    HINT_LUTIN,
    ['kx!=kp', 'ky!=kq'],
)
# kx=6, kp=4 (vrai), ky=2, kq=5 (faux) : t=1, x=60+u, y=20 ; u=30, w=20
V_A1_UN = {'kx': 6, 'ky': 2, 'kp': 4, 'kq': 5, 'ku': 3, 'kw': 2}
# kx=2, kp=4 (faux), ky=3, kq=5 (faux) : t=0, x=20, y=30+20=50
V_A1_ZERO = {'kx': 2, 'ky': 3, 'kp': 4, 'kq': 5, 'ku': 3, 'kw': 2}
MSG_OU = ('Relis la condition : avec « ou », il suffit qu\'une des deux comparaisons soit vraie '
          'pour faire le « alors ».')
MSG_DEBUT = 'Les deux premiers « ajouter » déplacent déjà le lutin avant le test.'
SPECS_A1 = [
    spec('A1 : une condition vraie → alors', 0, V_A1_UN, 'correct', ['90', '20']),
    spec('A1 : aucune vraie → sinon', 0, V_A1_ZERO, 'correct', ['20', '50']),
    spec('A1 : ou lu comme et (x)', 0, V_A1_UN, 'incorrect', ['60', '20'], MSG_OU),
    spec('A1 : départ oublié (x)', 0, V_A1_UN, 'incorrect', ['30', '20'], MSG_DEBUT),
    spec('A1 : branche échangée (y)', 0, V_A1_ZERO, 'incorrect', ['20', '30'], MSG_OU),
]

# A2 : 9f9bddbd v5, « et » dans une boucle de 5 tours (déroulée)
A2_VARS = [var('kp', '1..4'), var('kq', '1..4'), var('ku', '1..3'), var('kw', '1..3'),
           var('p', 'eval:10*kp'), var('q', 'eval:10*kq'), var('u', 'eval:10*ku'),
           var('w', 'eval:10*kw'), var('x0', 'eval:0'), var('y0', 'eval:0')]
for k in range(1, 7):
    c = f'{sup(f"x{k-1}", "p")}*{sup("q", f"y{k-1}")}'
    A2_VARS += [var(f'c{k}', f'eval:{c}'),
                var(f'x{k}', f'eval:x{k-1}+w*(1-c{k})'),
                var(f'y{k}', f'eval:y{k-1}+u*c{k}')]
A2_VARS.append(var('nc', 'eval:c1+c2+c3+c4+c5'))
MSG_TOURS_MOINS = 'Compte les tours : la boucle répète ses instructions 5 fois.'
A2 = variation(
    'Le lutin part du point $(0\\,;0)$.\n\n```scratch\naller à x: (0) y: (0)\nrépéter (5) fois\n'
    'si <<(abscisse x) > [{{p}}]> et <(ordonnée y) < [{{q}}]>> alors\n'
    'ajouter ({{u}}) à y\nsinon\najouter ({{w}}) à x\nfin\nfin\n```' + POSITION,
    A2_VARS,
    [case('{{x5}}', [erreur('{{x4}}', MSG_TOURS_MOINS, 'Un tour de moins'),
                     erreur('{{x6}}', MSG_TOURS_MOINS, 'Un tour de trop')]),
     case('{{y5}}', [erreur('{{y4}}', MSG_TOURS_MOINS, 'Un tour de moins'),
                     erreur('{{y6}}', MSG_TOURS_MOINS, 'Un tour de trop')])],
    ['À chaque tour, on teste la condition avec la position du moment : avec « et », il faut '
     '$x > {{p}}$ **et** $y < {{q}}$ pour ajouter ${{u}}$ à $y$ ; sinon on ajoute ${{w}}$ à $x$.',
     'Positions après chaque tour : $({{x1}}\\,;{{y1}})$, $({{x2}}\\,;{{y2}})$, $({{x3}}\\,;{{y3}})$, '
     '$({{x4}}\\,;{{y4}})$, $({{x5}}\\,;{{y5}})$.',
     'Position finale : ' + couleur('x = {{x5}}') + ' et ' + couleur('y = {{y5}}') + '.'],
    HINT_LUTIN,
    ['nc>=1', 'nc<=4'],
)
# p=20, q=20, u=10, w=10 : x 10, 20, 30 (x>20 au 4e tour) → y 10, puis y=10<20 → y 20 ?
V_A2 = {'kp': 2, 'kq': 2, 'ku': 1, 'kw': 1, 'x0': 0, 'y0': 0}
# Tours : (0,0) sinon → (10,0) ; sinon → (20,0) ; sinon → (30,0) ; 30>20 et 0<20 → (30,10) ;
# 30>20 et 10<20 → (30,20). Final (30 ; 20) ; 4 tours (30 ; 10) ; 6e tour : 20<20 faux → (40 ; 20).
SPECS_A2 = [
    spec('A2 : (30 ; 20)', 0, V_A2, 'correct', ['30', '20']),
    spec('A2 : un tour de moins (y)', 0, V_A2, 'incorrect', ['30', '10'], MSG_TOURS_MOINS),
    spec('A2 : un tour de trop (x)', 0, V_A2, 'incorrect', ['40', '20'], MSG_TOURS_MOINS),
]

# A3 : 4ce8eb3c v4, « répéter jusqu'à » sur l'abscisse
A3_VARS = [var('a', '1..6'), var('kk', '3..10'), var('dd', '2..5'), var('hh', '1..4'),
           var('x0', 'eval:-10*a'), var('k', 'eval:10*kk'), var('d', 'eval:10*dd'),
           var('h', 'eval:10*hh'), var('n', 'eval:floor((k-x0)/d)+1')]
MSG_AVANT = ('La boucle continue tant que $x$ n\'a pas **dépassé** la limite : le tour où $x$ la '
             'dépasse compte aussi.')
A3 = variation(
    '```scratch\naller à x: ({{x0}}) y: (0)\nrépéter jusqu\'à ce que <(abscisse x) > [{{k}}]>\n'
    'ajouter ({{d}}) à x\najouter ({{h}}) à y\nfin\n```' + POSITION,
    A3_VARS,
    [case('{{eval:x0+n*d}}', [erreur('{{eval:x0+(n-1)*d}}', MSG_AVANT, 'Un tour de moins'),
                              erreur('{{k}}', 'Le lutin ne s\'arrête pas exactement sur la limite : '
                                     'il avance de ${{d}}$ à chaque tour.', 'Limite donnée pour x')]),
     case('{{eval:n*h}}', [erreur('{{eval:(n-1)*h}}', MSG_AVANT, 'Un tour de moins')])],
    ['La condition est testée **avant** chaque tour : la boucle s\'arrête dès que $x > {{k}}$.',
     'Abscisses successives : ${{x0}}$, ${{eval:x0+d}}$, ${{eval:x0+2*d}}$, … Il faut ${{n}}$ tours '
     'pour dépasser ${{k}}$ : $x = {{x0}} + {{n}} \\times {{d}} = {{eval:x0+n*d}}$.',
     'À chaque tour, $y$ augmente de ${{h}}$ : $y = {{n}} \\times {{h}} = {{eval:n*h}}$.',
     'Position finale : ' + couleur('x = {{eval:x0+n*d}}') + ' et ' + couleur('y = {{eval:n*h}}') + '.'],
    HINT_LUTIN,
    ['(k-x0)%d!=0', 'n>=3', 'n<=8'],
)
# x0 = −30, k = 50, d = 20 : −30, −10, 10, 30, 50 (pas > 50), 70 → 5 tours ? (80/20=4 → n = 5)
# (k−x0)%d = 0 exclu : prendre k = 60 → (90)/20 = 4,5 → n = 5 : x = 70, y = 5h.
V_A3 = {'a': 3, 'kk': 6, 'dd': 2, 'hh': 1}
SPECS_A3 = [
    spec('A3 : (70 ; 50)', 0, V_A3, 'correct', ['70', '50']),
    spec('A3 : un tour de moins', 0, V_A3, 'incorrect', ['50', '40'], MSG_AVANT),
    spec('A3 : la limite pour x', 0, V_A3, 'incorrect', ['60', '50'],
         'Le lutin ne s\'arrête pas exactement sur la limite : il avance de $20$ à chaque tour.'),
]

# ---------------------------------------------------------------------------
# B — Syracuse (4ce8eb3c, 3-049)
# ---------------------------------------------------------------------------

SYRACUSE = ('quand le drapeau vert pressé\ndemander [Choisis un nombre entier.] et attendre\n'
            'mettre [n v] à (réponse)\nmettre [compteur v] à (0)\n'
            'répéter jusqu\'à ce que <(n) = [1]>\n'
            'si <((n) modulo (2)) = [0]> alors\nmettre [n v] à ((n) / (2))\nsinon\n'
            'mettre [n v] à (((3) * (n)) + (1))\nfin\najouter (1) à [compteur v]\nfin\n'
            'dire (compteur)')
INTRO_SYR = ('Ce programme applique l\'algorithme de **Syracuse** : si $n$ est pair, on le divise '
             'par $2$ ; sinon, on le multiplie par $3$ et on ajoute $1$, jusqu\'à obtenir $1$.\n\n'
             '```scratch\n' + SYRACUSE + '\n```\n\n')


def suite(n):
    valeurs = [n]
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        valeurs.append(n)
    return valeurs


B1_DEPARTS = [3, 5, 6, 10, 12, 13, 20, 21, 24, 26, 40, 42]
B1_ETAPES = [len(suite(n)) - 1 for n in B1_DEPARTS]
B1_SUITES = [', '.join(str(v) for v in suite(n)) for n in B1_DEPARTS]
MSG_DEPART = 'Le compteur part de $0$ : le nombre de départ ne compte pas comme une étape.'
MSG_N = 'À la fin, $n$ vaut toujours $1$ : le lutin dit la valeur du compteur.'
B1 = variation(
    INTRO_SYR + 'On saisit ${{N}}$. Que dit le lutin à la fin ?\n\n$?$',
    [var('s', f'0..{len(B1_DEPARTS) - 1}'), var('N', choisir('s', B1_DEPARTS)),
     var('E', choisir('s', B1_ETAPES))],
    [case('{{E}}', [erreur('{{eval:E+1}}', MSG_DEPART, 'Départ compté comme une étape'),
                    erreur('{{eval:E-1}}', 'Le dernier tour, celui qui donne $1$, ajoute aussi $1$ au compteur.',
                           'Dernière étape oubliée'),
                    erreur('1', MSG_N, 'Valeur de n au lieu du compteur')])],
    ['À chaque tour, $n$ change une fois et le compteur augmente de $1$ ; la boucle s\'arrête '
     'quand $n = 1$.',
     'Valeurs successives de $n$ : ' + '{{if:s==0|' + B1_SUITES[0] + '|}}',  # remplacée plus bas
     'Le lutin dit ' + couleur('{{E}}') + '.'],
    'Écris la suite des valeurs de $n$, une par tour de boucle, et compte les tours.',
)
# Liste des valeurs par un {{if}} à un seul niveau par départ (une étape par départ serait
# trop longue : on concatène les {{if}} plats).
B1['correction']['steps'][1] = 'Valeurs successives de $n$ : ' + ''.join(
    f'{{{{if:s=={k}|${B1_SUITES[k]}$|}}}}' for k in range(len(B1_DEPARTS))) + '.'
V_B1 = {'s': 0}  # N = 3 : 3, 10, 5, 16, 8, 4, 2, 1 → 7 compteur
SPECS_B1 = [
    spec('B1 : 3 → 7 compteur', 0, V_B1, 'correct', ['7']),
    spec('B1 : 12 → 9 compteur', 0, {'s': 4}, 'correct', ['9']),
    spec('B1 : départ compté', 0, V_B1, 'incorrect', ['8'], MSG_DEPART),
    spec('B1 : dernière étape oubliée', 0, V_B1, 'incorrect', ['6'],
         'Le dernier tour, celui qui donne $1$, ajoute aussi $1$ au compteur.'),
    spec('B1 : valeur de n', 0, V_B1, 'incorrect', ['1'], MSG_N),
]

B2_DEPARTS = [3, 6, 10, 12, 26, 42]
B2_MAX = [max(suite(n)) for n in B2_DEPARTS]
B2_PREMIER = [suite(n)[1] for n in B2_DEPARTS]
B2_SUITES = [', '.join(str(v) for v in suite(n)) for n in B2_DEPARTS]
MSG_B2_DEPART = 'La suite peut monter au-dessus du nombre de départ : écris toutes les valeurs de $n$.'
MSG_B2_PREMIER = 'Ne t\'arrête pas au premier tour : continue jusqu\'à ce que $n$ vaille $1$.'
B2 = variation(
    INTRO_SYR + 'On saisit ${{N}}$. Quel est le **plus grand** nombre que prend la variable $n$ '
    'pendant le programme ?\n\n$?$',
    [var('s', f'0..{len(B2_DEPARTS) - 1}'), var('N', choisir('s', B2_DEPARTS)),
     var('M', choisir('s', B2_MAX)), var('P', choisir('s', B2_PREMIER))],
    [case('{{M}}', [erreur('{{N}}', MSG_B2_DEPART, 'Nombre de départ'),
                    erreur('{{P}}', MSG_B2_PREMIER, 'Premier tour seulement')])],
    ['Valeurs successives de $n$ : ' + ''.join(
        f'{{{{if:s=={k}|${B2_SUITES[k]}$|}}}}' for k in range(len(B2_DEPARTS))) + '.',
     'Le plus grand nombre est ' + couleur('{{M}}') + '.'],
    'Écris la suite des valeurs de $n$ jusqu\'à $1$, puis repère la plus grande.',
)
SPECS_B2 = [
    spec('B2 : 3 → 16', 0, {'s': 0}, 'correct', ['16']),
    spec('B2 : 26 → 40', 0, {'s': 4}, 'correct', ['40']),
    spec('B2 : nombre de départ', 0, {'s': 4}, 'incorrect', ['26'], MSG_B2_DEPART),
    spec('B2 : premier tour', 0, {'s': 0}, 'incorrect', ['10'], MSG_B2_PREMIER),
]

# ---------------------------------------------------------------------------
# C, F — programmes à écrire (6e99d291, 3-051)
# ---------------------------------------------------------------------------

C_ATTENDU = ('mettre x à nombre ; mettre compteur à 0 ; répéter jusqu’à x = 1 [ si reste de x par 2 = 0 '
             'alors [ mettre x à x ÷ 2 ] sinon [ mettre x à 3 × x + 1 ] ; ajouter 1 à compteur ] ; '
             'afficher compteur')
C = variation(
    'L\'algorithme de **Syracuse** part d\'un entier positif non nul : s\'il est pair, on le divise '
    'par $2$ ; sinon, on le multiplie par $3$ et on ajoute $1$. On recommence jusqu\'à obtenir $1$.\n\n'
    'Écris un programme qui affiche le **nombre d\'étapes** pour passer du nombre choisi à $1$ : pour '
    '$3$, il affiche $7$ ($3 \\to 10 \\to 5 \\to 16 \\to 8 \\to 4 \\to 2 \\to 1$).\n\n'
    '```calcul\nniveau: 3e\nattendu: ' + C_ATTENDU + '\nessais: 1 ; 2 ; 3 ; 6 ; 7 ; 12\n```',
    [], [],
    ['On garde le nombre dans une variable $x$ et on compte les étapes dans une autre, qui part de $0$.',
     'Tant que $x \\neq 1$ : si le reste de $x$ par $2$ vaut $0$, $x$ devient $x \\div 2$, sinon '
     '$3 \\times x + 1$ ; puis on ajoute $1$ au compteur.',
     'Un programme juste : `' + C_ATTENDU + '`.'],
    'Utilise une variable qui compte les étapes, et le reste de la division par $2$ pour savoir si '
    'le nombre est pair.',
)
SPECS_C = [
    spec('C : référence', 0, {}, 'correct', [C_ATTENDU]),
    spec('C : test « impair » d\'abord', 0, {}, 'correct', [
        'mettre x à nombre ; mettre compteur à 0 ; répéter jusqu’à x = 1 [ si reste de x par 2 = 1 '
        'alors [ mettre x à 3 × x + 1 ] sinon [ mettre x à x ÷ 2 ] ; ajouter 1 à compteur ] ; '
        'afficher compteur']),
    spec('C : compteur à 1', 0, {}, 'incorrect', [
        'mettre x à nombre ; mettre compteur à 1 ; répéter jusqu’à x = 1 [ si reste de x par 2 = 0 '
        'alors [ mettre x à x ÷ 2 ] sinon [ mettre x à 3 × x + 1 ] ; ajouter 1 à compteur ] ; '
        'afficher compteur']),
    spec('C : affiche x au lieu des compteur', 0, {}, 'incorrect', [
        'mettre x à nombre ; mettre compteur à 0 ; répéter jusqu’à x = 1 [ si reste de x par 2 = 0 '
        'alors [ mettre x à x ÷ 2 ] sinon [ mettre x à 3 × x + 1 ] ; ajouter 1 à compteur ] ; '
        'afficher x']),
]

F_ATTENDU = ('mettre d à 1 ; mettre diviseurs à 0 ; répéter jusqu’à d > nombre [ si reste de nombre '
             'par d = 0 alors [ ajouter 1 à diviseurs ] ; ajouter 1 à d ] ; afficher diviseurs')
F = variation(
    'Écris un programme qui affiche le **nombre de diviseurs** du nombre choisi (un entier positif '
    'non nul) : pour $12$, il affiche $6$ ($1$, $2$, $3$, $4$, $6$ et $12$).\n\n'
    '```calcul\nniveau: 3e\nattendu: ' + F_ATTENDU + '\nessais: 1 ; 7 ; 12 ; 36 ; 60\n```',
    [], [],
    ['On teste chaque entier $d$ de $1$ au nombre choisi : $d$ est un diviseur quand le reste de la '
     'division du nombre par $d$ vaut $0$.',
     'Une variable compte les diviseurs trouvés ; une autre, $d$, augmente de $1$ à chaque tour.',
     'Un programme juste : `' + F_ATTENDU + '`.'],
    'Teste chaque nombre de $1$ au nombre choisi : est-ce que le reste de la division vaut $0$ ?',
)
SPECS_F = [
    spec('F : référence', 0, {}, 'correct', [F_ATTENDU]),
    spec('F : boucle « répéter nombre fois »', 0, {}, 'correct', [
        'mettre d à 1 ; mettre diviseurs à 0 ; répéter nombre [ si reste de nombre par d = 0 alors '
        '[ ajouter 1 à diviseurs ] ; ajouter 1 à d ] ; afficher diviseurs']),
    spec('F : d part de 2 (1 oublié)', 0, {}, 'incorrect', [
        'mettre d à 2 ; mettre diviseurs à 0 ; répéter jusqu’à d > nombre [ si reste de nombre par '
        'd = 0 alors [ ajouter 1 à diviseurs ] ; ajouter 1 à d ] ; afficher diviseurs']),
    spec('F : s\'arrête avant le nombre', 0, {}, 'incorrect', [
        'mettre d à 1 ; mettre diviseurs à 0 ; répéter jusqu’à d = nombre [ si reste de nombre par '
        'd = 0 alors [ ajouter 1 à diviseurs ] ; ajouter 1 à d ] ; afficher diviseurs']),
]

# ---------------------------------------------------------------------------
# D — Quelle valeur saisir ? (962da675, 3-047)
# ---------------------------------------------------------------------------

HINT_SAISIR = ('Le lutin dit cette phrase quand la condition du « si » est vraie : écris l\'égalité '
               'qu\'elle teste avec les valeurs connues, puis trouve la valeur qui manque.')

# D1 : réciproque de Thalès. AD = m·t, AB = n·t, AC = n·s, AE = m·s.
D1 = variation(
    'Le point $D$ est sur le segment $[AB]$ et le point $E$ sur le segment $[AC]$. Ce programme '
    'teste si les droites $(BC)$ et $(DE)$ sont parallèles.\n\n```scratch\n'
    'demander [Longueur AB ?] et attendre\nmettre [AB v] à (réponse)\n'
    'demander [Longueur AC ?] et attendre\nmettre [AC v] à (réponse)\n'
    'demander [Longueur AD ?] et attendre\nmettre [AD v] à (réponse)\n'
    'demander [Longueur AE ?] et attendre\nmettre [AE v] à (réponse)\n'
    'si <((AB) / (AD)) = ((AC) / (AE))> alors\ndire [Les droites sont parallèles.]\nsinon\n'
    'dire [Les droites ne sont pas parallèles.]\nfin\n```\n\n'
    'On saisit $AB = {{eval:n*t}}$, $AC = {{eval:n*s}}$ et $AD = {{eval:m*t}}$. Quelle valeur '
    'faut-il saisir pour $AE$ pour que le lutin dise « Les droites sont parallèles. » ?\n\n$AE = ?$',
    [var('m', '2..4'), var('dn', '1..3'), var('n', 'eval:m+dn'), var('t', '1..3'), var('s', '2..5')],
    [case('{{eval:m*s}}', [
        erreur('{{eval:n*n*s/m}}', 'Le programme compare $\\frac{AB}{AD}$ et $\\frac{AC}{AE}$ : '
               'mets les longueurs dans le même ordre.', 'Rapport à l\'envers'),
        erreur('{{eval:n*s-(n-m)*t}}', 'Les longueurs sont proportionnelles, pas décalées d\'un même '
               'nombre : compare des quotients, pas des différences.', 'Différences au lieu de quotients'),
        erreur('{{eval:m*t}}', 'Tu as recopié $AD$ : calcule $AE$ avec l\'égalité des quotients.',
               'AD recopiée')])],
    ['Le lutin dit « Les droites sont parallèles. » quand $\\frac{AB}{AD} = \\frac{AC}{AE}$ '
     '(réciproque du théorème de Thalès).',
     '$\\frac{AB}{AD} = \\frac{{{eval:n*t}}}{{{eval:m*t}}}$, donc il faut '
     '$\\frac{{{eval:n*s}}}{AE} = \\frac{{{eval:n*t}}}{{{eval:m*t}}}$.',
     '$AE = \\frac{{{eval:n*s}} \\times {{eval:m*t}}}{{{eval:n*t}}} = ' + P0 + '{{{eval:m*s}}}$.'],
    HINT_SAISIR,
    ['s!=t'],
)
V_D1 = {'m': 2, 'dn': 1, 't': 2, 's': 4}  # AB 6, AC 12, AD 4 → AE 8
SPECS_D1 = [
    spec('D1 : AE = 8', 0, V_D1, 'correct', ['8']),
    spec('D1 : rapport à l\'envers (18)', 0, V_D1, 'incorrect', ['18'],
         'Le programme compare $\\frac{AB}{AD}$ et $\\frac{AC}{AE}$ : mets les longueurs dans le même ordre.'),
    spec('D1 : différences (10)', 0, V_D1, 'incorrect', ['10'],
         'Les longueurs sont proportionnelles, pas décalées d\'un même nombre : compare des quotients, '
         'pas des différences.'),
    spec('D1 : AD recopiée', 0, V_D1, 'incorrect', ['4'],
         'Tu as recopié $AD$ : calcule $AE$ avec l\'égalité des quotients.'),
]

# D2 : équation a·x + b = c·x + d, solution entière non nulle de −5 à 5.
D2 = variation(
    'Ce programme teste si un nombre est solution d\'une équation.\n\n```scratch\n'
    'demander [Choisis un nombre.] et attendre\nmettre [x v] à (réponse)\n'
    'mettre [gauche v] à (((' + '{{a}}' + ') * (x)) + ({{b}}))\n'
    'mettre [droite v] à (((' + '{{c}}' + ') * (x)) + ({{d}}))\n'
    'si <(gauche) = (droite)> alors\ndire [Gagné !]\nsinon\ndire [Perdu]\nfin\n```\n\n'
    'Quelle valeur faut-il saisir pour que le lutin dise « Gagné ! » ?\n\n$x = ?$',
    [var('a', '2..9'), var('c', '1..8'), var('b', '1..20'), var('xs', '1..10'),
     var('x', 'eval:xs-5'), var('d', 'eval:(a-c)*x+b')],
    [case('{{x}}', [
        erreur('{{eval:-x}}', 'Vérifie le signe : remplace $x$ par ta réponse dans les deux calculs.',
               'Erreur de signe'),
        erreur('{{eval:(d+b)/(a-c)}}', 'En passant ${{b}}$ de l\'autre côté, on le **soustrait**.',
               'Terme constant ajouté'),
        erreur('{{eval:(d-b)/(a+c)}}', 'En passant ${{c}}x$ de l\'autre côté, on le **soustrait**.',
               'Terme en x ajouté')])],
    ['Le lutin dit « Gagné ! » quand ${{a}}x + {{b}} = {{c}}x + {{d;()}}$.',
     'On regroupe : ${{eval:a-c}}x = {{d;()}} - {{b}} = {{eval:d-b}}$.',
     'Donc $x = \\frac{{{eval:d-b}}}{{{eval:a-c}}} = ' + P0 + '{{{x}}}$.'],
    HINT_SAISIR,
    ['a>c', 'x!=0', 'd!=0'],
)
V_D2 = {'a': 5, 'c': 2, 'b': 4, 'xs': 8}  # x = 3, d = 13 : 5x + 4 = 2x + 13
SPECS_D2 = [
    spec('D2 : x = 3', 0, V_D2, 'correct', ['3']),
    spec('D2 : signe', 0, V_D2, 'incorrect', ['-3'],
         'Vérifie le signe : remplace $x$ par ta réponse dans les deux calculs.'),
    spec('D2 : constante ajoutée (17/3)', 0, V_D2, 'incorrect', ['\\frac{17}{3}'],
         'En passant $4$ de l\'autre côté, on le **soustrait**.'),
    spec('D2 : terme en x ajouté (9/7)', 0, V_D2, 'incorrect', ['\\frac{9}{7}'],
         'En passant $2 x$ de l\'autre côté, on le **soustrait**.'),
]

# D3 : produit nul (x + p)(x − q), valeur positive q.
D3 = variation(
    '```scratch\ndemander [Choisis un nombre.] et attendre\nmettre [x v] à (réponse)\n'
    'mettre [a v] à ((x) + ({{p}}))\nmettre [b v] à ((x) - ({{q}}))\n'
    'si <((a) * (b)) = [0]> alors\ndire [Le produit est nul.]\nsinon\n'
    'dire [Le produit n\'est pas nul.]\nfin\n```\n\n'
    'Quelle valeur **positive** faut-il saisir pour que le lutin dise « Le produit est nul. » ?\n\n$x = ?$',
    [var('p', '2..9'), var('q', '2..9')],
    [case('{{q}}', [
        erreur('{{eval:-q}}', 'Vérifie le signe : avec $x = -{{q}}$, $b = x - {{q}}$ ne vaut pas $0$.',
               'Erreur de signe'),
        erreur('{{p}}', 'Vérifie : avec $x = {{p}}$, ni $a$ ni $b$ ne vaut $0$.', 'Signe de p'),
        erreur('{{eval:-p}}', '$-{{p}}$ annule aussi le produit, mais on demande la valeur **positive**.',
               'Valeur négative')])],
    ['Un produit est nul quand l\'un de ses facteurs est nul : $a = 0$ ou $b = 0$.',
     '$a = x + {{p}} = 0$ donne $x = -{{p}}$ ; $b = x - {{q}} = 0$ donne $x = {{q}}$.',
     'La valeur positive est ' + couleur('{{q}}') + '.'],
    'Un produit est nul quand l\'un de ses facteurs est nul : cherche la valeur de $x$ qui annule '
    '$a$, puis celle qui annule $b$.',
    ['p!=q'],
)
V_D3 = {'p': 4, 'q': 7}
SPECS_D3 = [
    spec('D3 : x = 7', 0, V_D3, 'correct', ['7']),
    spec('D3 : signe (−7)', 0, V_D3, 'incorrect', ['-7'],
         'Vérifie le signe : avec $x = -7$, $b = x - 7$ ne vaut pas $0$.'),
    spec('D3 : p (4)', 0, V_D3, 'incorrect', ['4'], 'Vérifie : avec $x = 4$, ni $a$ ni $b$ ne vaut $0$.'),
    spec('D3 : valeur négative (−4)', 0, V_D3, 'incorrect', ['-4'],
         '$-4$ annule aussi le produit, mais on demande la valeur **positive**.'),
]

# D4 : réciproque de Pythagore, AB à trouver (côté de l'angle droit).
TRIPLETS = [(3, 4, 5), (5, 12, 13), (6, 8, 10), (8, 15, 17), (9, 12, 15), (12, 16, 20)]
D4_VARS = [var('s', f'0..{len(TRIPLETS) - 1}'), var('ab', choisir('s', [t[0] for t in TRIPLETS])),
           var('bc', choisir('s', [t[1] for t in TRIPLETS])),
           var('ca', choisir('s', [t[2] for t in TRIPLETS]))]
D4 = variation(
    '```scratch\ndemander [Longueur AB ?] et attendre\nmettre [AB v] à (réponse)\n'
    'demander [Longueur BC ?] et attendre\nmettre [BC v] à (réponse)\n'
    'demander [Longueur CA ?] et attendre\nmettre [CA v] à (réponse)\n'
    'si <(((AB) * (AB)) + ((BC) * (BC))) = ((CA) * (CA))> alors\ndire [Le triangle est rectangle en B.]\n'
    'sinon\ndire [Le triangle n\'est pas rectangle en B.]\nfin\n```\n\n'
    'On saisit $BC = {{bc}}$ et $CA = {{ca}}$. Quelle valeur faut-il saisir pour $AB$ pour que le '
    'lutin dise « Le triangle est rectangle en B. » ?\n\n$AB = ?$',
    D4_VARS,
    [case('{{ab}}', [
        erreur('{{eval:ca*ca-bc*bc}}', 'Tu as trouvé $AB^2$ : il reste à prendre la racine carrée.',
               'Racine oubliée'),
        erreur('{{eval:ca-bc}}', 'Le programme compare des **carrés** : $AB^2 + BC^2 = CA^2$.',
               'Longueurs soustraites'),
        erreur('\\sqrt{{{eval:ca*ca+bc*bc}}}', '$CA$ est le plus long côté (l\'hypoténuse) : on '
               '**soustrait** les carrés, $AB^2 = CA^2 - BC^2$.', 'Carrés ajoutés')])],
    ['Le lutin dit « rectangle en B » quand $AB^2 + BC^2 = CA^2$ (réciproque du théorème de Pythagore).',
     '$AB^2 = CA^2 - BC^2 = {{eval:ca*ca}} - {{eval:bc*bc}} = {{eval:ab*ab}}$.',
     '$AB = \\sqrt{{{eval:ab*ab}}} = ' + P0 + '{{{ab}}}$.'],
    HINT_SAISIR,
)
V_D4 = {'s': 1}  # AB 5, BC 12, CA 13
SPECS_D4 = [
    spec('D4 : AB = 5', 0, V_D4, 'correct', ['5']),
    spec('D4 : racine oubliée (25)', 0, V_D4, 'incorrect', ['25'],
         'Tu as trouvé $AB^2$ : il reste à prendre la racine carrée.'),
    spec('D4 : longueurs soustraites (1)', 0, V_D4, 'incorrect', ['1'],
         'Le programme compare des **carrés** : $AB^2 + BC^2 = CA^2$.'),
    spec('D4 : carrés ajoutés (√313)', 0, V_D4, 'incorrect', ['\\sqrt{313}'],
         '$CA$ est le plus long côté (l\'hypoténuse) : on **soustrait** les carrés, $AB^2 = CA^2 - BC^2$.'),
]

# ---------------------------------------------------------------------------
# G — Tableur, températures (5c092e43, 3-032)
# ---------------------------------------------------------------------------

JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
G_VARS = [var(f'u{k}', '0..18') for k in range(1, 6)] + \
    [var(f't{k}', f'eval:u{k}-6') for k in range(1, 6)]
G = variation(
    'Voici une feuille de calcul : les températures relevées à 8 h, du lundi au vendredi, en °C, sont '
    'dans les cellules B2 à B6.\n\n'
    '|   | A | B |\n|---|---|---|\n| 1 | Jour | °C |\n'
    + ''.join(f'| {k + 2} | {j} | {{{{t{k + 1}}}}} |\n' for k, j in enumerate(JOURS))
    + '| 7 | Moyenne |  |\n\n'
    'Quelle formule écrire dans la cellule B7 pour calculer la température moyenne ?\n\n'
    '```choix\n- =MOYENNE(B2:B6)\n- =MOYENNE(B2;B6)\n- =(B2+B6)/2\n- =MOYENNE(A2:A6)\n```',
    G_VARS,
    [case('0')],
    ['**Tableur.** Une plage de cellules s\'écrit avec deux-points : « B2:B6 » va de B2 à B6. Le '
     'point-virgule sépare des cellules isolées : « B2;B6 » ne prend que B2 et B6.',
     '« =MOYENNE(B2:B6) » calcule la moyenne des cinq températures, négatives comprises : '
     '$' + P0 + '{\\text{c\'est la bonne formule}}$.',
     '« =MOYENNE(B2;B6) » et « =(B2+B6)/2 » ne prennent que lundi et vendredi ; « =MOYENNE(A2:A6) » '
     'vise la colonne des jours, pas celle des températures.'],
    'Les deux-points désignent toutes les cellules entre les deux ; vérifie aussi dans quelle '
    'colonne sont les températures.',
    ['t1<0 or t2<0 or t3<0 or t4<0 or t5<0'],
)
V_G = {f'u{k}': v for k, v in enumerate([4, 9, 12, 15, 8], start=1)}
SPECS_G = [
    spec('G : bonne formule', 0, V_G, 'correct', ['0']),
    spec('G : point-virgule', 0, V_G, 'incorrect', ['1']),
    spec('G : ligne des jours', 0, V_G, 'incorrect', ['3']),
]

# ---------------------------------------------------------------------------
# H — Paramètres d'un bloc personnalisé (0a470416, 3-050)
# ---------------------------------------------------------------------------

MSG_H_MEME = ('Si la tortue tourne toujours de ${{t}}$ degrés, elle ne revient pas à son point de départ : '
              'les deux angles d\'un même côté du losange font $180$ degrés ensemble.')
H = variation(
    'Le bloc « losange » doit tracer un **losange** dont les côtés mesurent ${{c}}$ pas.\n\n'
    '```scratch\ndéfinir losange\nstylo en position d\'écriture\nrépéter (2) fois\n'
    'avancer de ({{c}}) pas\ntourner ↻ de ({{t}}) degrés\navancer de (a) pas\n'
    'tourner ↻ de (b) degrés\nfin\nrelever le stylo\n```\n\n'
    'Par quels nombres faut-il remplacer $a$ et $b$ ?\n\n$a = ?$ et $b = ?$',
    [var('kc', '2..5'), var('c', 'eval:10*kc'), var('t', '50|60|70')],
    [case('{{c}}'),
     case('{{eval:180-t}}', [
         erreur('{{t}}', MSG_H_MEME, 'Même angle que le premier'),
         erreur('90', 'Un angle de $90$ degrés donnerait un carré ou un rectangle, pas ce losange.',
                'Angle droit'),
         erreur('180', 'En tournant de $180$ degrés, la tortue fait demi-tour et repasse sur le même côté.',
                'Demi-tour')])],
    ['Les quatre côtés d\'un losange ont la même longueur : $a = ' + P0 + '{{{c}}}$.',
     'Après le premier côté, la tortue tourne de ${{t}}$ degrés ; pour revenir au départ après deux allers, '
     'les deux rotations d\'un tour de boucle font $180$ degrés ensemble : ${{t}} + b = 180$.',
     'Donc $b = 180 - {{t}} = ' + P0 + '{{{eval:180-t}}}$.'],
    'Un losange a quatre côtés de même longueur. Pour l\'angle : en un tour de boucle, la tortue '
    'doit finir tournée dans le sens opposé à celui du départ.',
)
V_H = {'kc': 4, 't': 60}
SPECS_H = [
    spec('H : a = 40, b = 120', 0, V_H, 'correct', ['40', '120']),
    spec('H : même angle (60)', 0, V_H, 'incorrect', ['40', '60'],
         'Si la tortue tourne toujours de $60$ degrés, elle ne revient pas à son point de départ : les deux '
         'angles d\'un même côté du losange font $180$ degrés ensemble.'),
    spec('H : angle droit', 0, V_H, 'incorrect', ['40', '90'],
         'Un angle de $90$ degrés donnerait un carré ou un rectangle, pas ce losange.'),
    spec('H : demi-tour', 0, V_H, 'incorrect', ['40', '180'],
         'En tournant de $180$ degrés, la tortue fait demi-tour et repasse sur le même côté.'),
]

ajouter('9f9bddbd', [A1, A2], SPECS_A1 + [dict(s, variationIndex=s['variationIndex'] + 1) for s in SPECS_A2])
ajouter('4ce8eb3c', [A3, B1, B2],
        SPECS_A3 + [dict(s, variationIndex=s['variationIndex'] + 1) for s in SPECS_B1]
        + [dict(s, variationIndex=s['variationIndex'] + 2) for s in SPECS_B2])
ajouter('6e99d291', [C, F], SPECS_C + [dict(s, variationIndex=s['variationIndex'] + 1) for s in SPECS_F])
ajouter('962da675', [D1, D2, D3, D4],
        SPECS_D1 + [dict(s, variationIndex=s['variationIndex'] + k)
                    for k, lot in ((1, SPECS_D2), (2, SPECS_D3), (3, SPECS_D4)) for s in lot])
ajouter('5c092e43', [G], SPECS_G)
ajouter('0a470416', [H], SPECS_H)

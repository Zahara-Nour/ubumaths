"""Ajoute des variations à 3 modèles PUBLIÉS (exports de prod de
scripts/questions/6e-entiers-publies/), à la fin de leur tableau `variations`.

Chantier `idees-6e-entiers` (idées reprises de l'autre plateforme). Seuls `variations`,
`testSpecs` et `description` changent (`migration-contenu.ts` ne change rien d'autre) : ni
titre, ni niveau, ni options, ni variation existante.

Usage : python3 docs/wip/questions/lot-6e-entiers-publies.py scripts/questions/6e-entiers-publies
Idempotent : refuse d'écrire un modèle qui porte déjà les nouvelles variations (repérées par
leur énoncé).

Décisions :
- b9677e1f « Chiffre des unités d'un produit » (6e) : + V1 somme de deux nombres de 11 à 999,
  + V2 différence (premier terme de 100 à 999, plus grand que le second ; avec ou sans
  retenue selon le tirage). Le titre dit « d'un produit » : il reste (titre intouchable par
  migration de contenu), à signaler à David. Erreurs prévues : somme des unités non réduite
  (13 au lieu de 3), produit des unités (règle de la V0 appliquée à tort) ; pour la
  différence, plus petit chiffre ôté du plus grand (8 − 2 = 6 au lieu de 12 − 8 = 4), unités
  additionnées.
- d793de49 « Calculer un produit d'entiers » (CM2-047) : + V2 « Complète » a × b décomposé
  en a × c00 + a × d0 + a × u, quatre cases. `b` de la V2 recalculé (100c + 10d + u, chiffres
  de 1 à 9) : il remplace le `b` partagé (fusion par nom). Erreurs prévues : zéros oubliés
  (7 × 300 = 21 ou 210, 7 × 40 = 28).
- 98f558e4 « Trouver le nombre choisi » (CM1-062, reste CM1) : + V3 N ÷ k + a = r,
  + V4 (N + a) ÷ k = r, + V5 N × k − a = r ; divisions exactes, petits entiers. Erreurs
  prévues : programme défait dans le mauvais ordre, une étape oubliée, programme refait dans
  l'ordre (V5, seul cas où il tombe sur un entier).
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, status, answers, violations=None, message=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None, **extra):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v.update(extra)
    return v


def blank(expected, **extra):
    b = {'expectedAnswer': expected}
    b.update(extra)
    return b


def err(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def coul(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def msg(template, **vals):
    out = template
    for k, v in vals.items():
        out = out.replace('{{' + k + '}}', str(v))
    return out


# --- b9677e1f · Chiffre des unités ----------------------------------------------------------

UNITES_HINT = ('Le chiffre des unités du résultat ne dépend que des chiffres des unités des deux '
               'nombres.')

MSG_NON_REDUIT = ('${{s}}$ n\'est pas un chiffre : le chiffre des unités de ${{s}}$ est celui '
                  'du résultat.')
MSG_PRODUIT = ('Tu as multiplié les chiffres des unités : ici, on additionne ${{ux}}$ et '
               '${{uy}}$.')

U_V1 = variation(
    'Quel est le chiffre des unités de la somme ${{x}} + {{y}}$ ?\n\nLe chiffre des unités '
    'est $?$.',
    [var('x', '11..999'), var('y', '11..999'), var('ux', 'eval:mod(x,10)'),
     var('uy', 'eval:mod(y,10)'), var('s', 'eval:ux+uy'), var('g', 'eval:mod(s,10)')],
    [blank('{{g}}', expectedErrors=[
        err('{{s}}', MSG_NON_REDUIT, 'Somme des unités non réduite'),
        err('{{eval:mod(ux*uy,10)}}', MSG_PRODUIT, 'Unités multipliées au lieu d\'additionnées'),
    ])],
    ['Le chiffre des unités d\'une somme ne dépend que des chiffres des unités des termes : '
     '{{if:s>=10|${{ux}} + {{uy}} = {{s}}$, dont le chiffre des unités est $' + coul('{{g}}')
     + '$.|${{ux}} + {{uy}} = ' + coul('{{g}}') + '$.}}',
     '**Vérification.** ${{x}} + {{y}} = {{eval:x+y}}$.'],
    hint=UNITES_HINT)

MSG_A_L_ENVERS = ('Tu as ôté ${{ux}}$ de ${{uy}}$ : on ne peut pas ôter ${{uy}}$ de ${{ux}}$, '
                  'il faut faire ${{eval:ux+10}} - {{uy}}$.')
MSG_ADDITION = 'Tu as additionné les chiffres des unités : ici, on soustrait.'

U_V2 = variation(
    'Quel est le chiffre des unités de la différence ${{x}} - {{y}}$ ?\n\nLe chiffre des '
    'unités est $?$.',
    [var('x', '100..999'), var('y', '11..999'), var('ux', 'eval:mod(x,10)'),
     var('uy', 'eval:mod(y,10)'), var('g', 'eval:mod(ux-uy+10,10)'),
     var('r', 'eval:1-min(max(ux-uy+1,0),1)')],
    [blank('{{g}}', expectedErrors=[
        err('{{eval:abs(ux-uy)}}', MSG_A_L_ENVERS, 'Petit chiffre ôté du grand'),
        err('{{eval:mod(ux+uy,10)}}', MSG_ADDITION, 'Unités additionnées'),
    ])],
    ['Le chiffre des unités d\'une différence ne dépend que des chiffres des unités des deux '
     'nombres.',
     '{{if:r==1|On ne peut pas ôter ${{uy}}$ de ${{ux}}$ : on ôte ${{uy}}$ de '
     '${{eval:ux+10}}$ (retenue), ${{eval:ux+10}} - {{uy}} = ' + coul('{{g}}') + '$.|'
     '${{ux}} - {{uy}} = ' + coul('{{g}}') + '$.}}',
     '**Vérification.** ${{x}} - {{y}} = {{eval:x-y}}$.'],
    ['y < x'], hint=UNITES_HINT)


def specs_unites(base):
    s = []
    v = {'x': '487', 'y': '356'}
    vals = dict(s=13, ux=7, uy=6)
    s.append(spec('487 + 356 : 7 + 6 = 13 → 3', base, v, 'correct', ['3']))
    s.append(spec('Erreur prévue : 13 (non réduit)', base, v, 'incorrect', ['13'],
                  message=msg(MSG_NON_REDUIT, **vals)))
    s.append(spec('Erreur prévue : 2 (7 × 6 = 42)', base, v, 'incorrect', ['2'],
                  message=msg(MSG_PRODUIT, **vals)))
    s.append(spec('124 + 35 : 4 + 5 = 9', base, {'x': '124', 'y': '35'}, 'correct', ['9']))
    s.append(spec('250 + 40 : 0', base, {'x': '250', 'y': '40'}, 'correct', ['0']))
    v = {'x': '742', 'y': '168'}
    vals = dict(ux=2, uy=8)
    s.append(spec('742 − 168 : 12 − 8 = 4', base + 1, v, 'correct', ['4']))
    s.append(spec('Erreur prévue : 6 (8 − 2)', base + 1, v, 'incorrect', ['6'],
                  message='Tu as ôté $2$ de $8$ : on ne peut pas ôter $8$ de $2$, il faut faire $12 - 8$.'))
    s.append(spec('Erreur prévue : 0 (2 + 8)', base + 1, v, 'incorrect', ['0'],
                  message=MSG_ADDITION))
    s.append(spec('586 − 231 : 6 − 1 = 5 (sans retenue)', base + 1, {'x': '586', 'y': '231'},
                  'correct', ['5']))
    s.append(spec('Erreur prévue : 7 (6 + 1)', base + 1, {'x': '586', 'y': '231'}, 'incorrect',
                  ['7'], message=MSG_ADDITION))
    s.append(spec('300 − 45 : 10 − 5 = 5', base + 1, {'x': '300', 'y': '45'}, 'correct', ['5']))
    return s


# --- d793de49 · Calculer un produit d'entiers -----------------------------------------------

MSG_ZERO_C = ('Tu as oublié les zéros : ${{a}} \\times {{c}}00$, c\'est ${{a}} \\times {{c}}$ '
              'centaines, soit ${{eval:a*c}}$ centaines.')
MSG_ZERO_D = ('Tu as oublié le zéro : ${{a}} \\times {{d}}0$, c\'est ${{a}} \\times {{d}}$ '
              'dizaines, soit ${{eval:a*d}}$ dizaines.')

P_V2 = variation(
    'Complète.\n\n${{a}} \\times {{b}} = {{a}} \\times {{c}}00 + {{a}} \\times {{d}}0 + {{a}} '
    '\\times {{u}} = ? + ? + ? = ?$',
    [var('c', '1..9'), var('d', '1..9'), var('u', '1..9'), var('b', 'eval:100*c+10*d+u')],
    [blank('{{eval:a*c*100}}', expectedErrors=[
        err('{{eval:a*c}}', MSG_ZERO_C, 'Zéros des centaines oubliés'),
        err('{{eval:a*c*10}}', MSG_ZERO_C, 'Un zéro des centaines oublié'),
    ]),
     blank('{{eval:a*d*10}}', expectedErrors=[
         err('{{eval:a*d}}', MSG_ZERO_D, 'Zéro des dizaines oublié'),
     ]),
     blank('{{eval:a*u}}'),
     blank('{{eval:a*b}}')],
    ['**Chaque morceau.** ${{a}} \\times {{c}}00 = ' + coul('{{eval:a*c*100}}') + '$ ; '
     '${{a}} \\times {{d}}0 = ' + coul('{{eval:a*d*10}}') + '$ ; '
     '${{a}} \\times {{u}} = ' + coul('{{eval:a*u}}') + '$.',
     '**La somme.** ${{eval:a*c*100}} + {{eval:a*d*10}} + {{eval:a*u}} = '
     + coul('{{eval:a*b}}') + '$.'],
    hint='Multiplie ${{a}}$ par chaque morceau de la décomposition, puis ajoute les trois '
         'résultats.')


def specs_produit(base):
    v = {'a': '7', 'c': '3', 'd': '4', 'u': '5'}
    MSG_ZERO_C_7 = ('Tu as oublié les zéros : $7 \\times 300$, c\'est $7 \\times 3$ centaines, '
                    'soit $21$ centaines.')
    juste = ['2\\,100', '280', '35', '2\\,415']
    return [
        spec('7 × 345 = 2 100 + 280 + 35 = 2 415', base, v, 'correct', juste),
        spec('Erreur prévue : 7 × 300 = 21', base, v, 'incorrect', ['21'] + juste[1:],
             message=MSG_ZERO_C_7),
        spec('Erreur prévue : 7 × 300 = 210', base, v, 'incorrect', ['210'] + juste[1:],
             message=MSG_ZERO_C_7),
        spec('Erreur prévue : 7 × 40 = 28', base, v, 'incorrect',
             [juste[0], '28', juste[2], juste[3]],
             message='Tu as oublié le zéro : $7 \\times 40$, c\'est $7 \\times 4$ dizaines, soit $28$ dizaines.'),
        spec('2415 sans espace', base, v, 'unoptimal_form', juste[:3] + ['2415'],
             violations=['spaces']),
        spec('2 × 111 = 200 + 20 + 2 = 222', base, {'a': '2', 'c': '1', 'd': '1', 'u': '1'},
             'correct', ['200', '20', '2', '222']),
        spec('9 × 999 = 8 100 + 810 + 81 = 8 991', base,
             {'a': '9', 'c': '9', 'd': '9', 'u': '9'}, 'correct',
             ['8\\,100', '810', '81', '8\\,991']),
    ]


# --- 98f558e4 · Trouver le nombre choisi ----------------------------------------------------

HINT_ENVERS = ('Fais les calculs à l\'envers en partant de la fin : défais d\'abord la dernière '
               'étape avec l\'opération inverse, puis la première.')

MSG_V3_ORDRE = ('Tu as défait les étapes dans le mauvais ordre : on retire d\'abord ${{a}}$, '
                'puis on multiplie par ${{k}}$.')
MSG_V3_OUBLI = 'Tu as oublié de défaire la division par ${{k}}$ : multiplie par ${{k}}$.'

N_V3 = variation(
    'Inès a choisi un nombre, noté $N$. Elle l\'a divisé par ${{k}}$, puis elle a ajouté '
    '${{a}}$ au résultat. Elle a trouvé ${{r}}$.\n\nQuel nombre Inès a-t-elle choisi ?\n\n'
    '$N = ?$',
    [var('k', '2..5'), var('q', '2..10'), var('a', '1..20'), var('n', 'eval:k*q'),
     var('r', 'eval:q+a')],
    [blank('{{n}}', expectedErrors=[
        err('{{eval:r*k-a}}', MSG_V3_ORDRE, 'Étapes défaites dans le mauvais ordre'),
        err('{{q}}', MSG_V3_OUBLI, 'Division oubliée'),
    ])],
    ['**On défait la dernière étape.** $N \\div {{k}} + {{a}} = {{r}}$, donc '
     '$N \\div {{k}} = {{r}} - {{a}} = {{q}}$.',
     '**Puis la première.** $N = {{q}} \\times {{k}} = ' + coul('{{n}}') + '$.',
     '**Vérification.** ${{n}} \\div {{k}} + {{a}} = {{q}} + {{a}} = {{r}}$.'],
    hint=HINT_ENVERS)

MSG_V4_ORDRE = ('Tu as défait les étapes dans le mauvais ordre : on multiplie d\'abord par '
                '${{k}}$, puis on retire ${{a}}$.')
MSG_V4_OUBLI = 'Tu as oublié de défaire l\'ajout de ${{a}}$ : retire-le.'
MSG_V4_AJOUT = ('Pour défaire « ajouter ${{a}}$ », on retire ${{a}}$ : tu l\'as ajouté une '
                'deuxième fois.')

N_V4 = variation(
    'Malo a choisi un nombre, noté $N$. Il lui a ajouté ${{a}}$, puis il a divisé le résultat '
    'par ${{k}}$. Il a trouvé ${{r}}$.\n\nQuel nombre Malo a-t-il choisi ?\n\n$N = ?$',
    [var('k', '2..5'), var('r', '2..12'), var('a', '1..9'), var('n', 'eval:r*k-a')],
    [blank('{{n}}', expectedErrors=[
        err('{{eval:(r-a)*k}}', MSG_V4_ORDRE, 'Étapes défaites dans le mauvais ordre'),
        err('{{eval:r*k}}', MSG_V4_OUBLI, 'Ajout non défait'),
        err('{{eval:r*k+a}}', MSG_V4_AJOUT, 'Ajouté au lieu de retirer'),
    ])],
    ['**On défait la dernière étape.** $(N + {{a}}) \\div {{k}} = {{r}}$, donc '
     '$N + {{a}} = {{r}} \\times {{k}} = {{eval:r*k}}$.',
     '**Puis la première.** $N = {{eval:r*k}} - {{a}} = ' + coul('{{n}}') + '$.',
     '**Vérification.** $({{n}} + {{a}}) \\div {{k}} = {{eval:r*k}} \\div {{k}} = {{r}}$.'],
    ['r*k - a >= 2', 'r > a'], hint=HINT_ENVERS)

MSG_V5_REFAIT = ('Tu as refait le programme sur ${{r}}$ au lieu de le défaire : on ajoute '
                 '${{a}}$, puis on divise par ${{k}}$.')
MSG_V5_OUBLI = 'Tu as oublié de défaire la multiplication par ${{k}}$ : divise par ${{k}}$.'

N_V5 = variation(
    'Chloé a choisi un nombre, noté $N$. Elle l\'a multiplié par ${{k}}$, puis elle a retiré '
    '${{a}}$ du résultat. Elle a trouvé ${{r}}$.\n\nQuel nombre Chloé a-t-elle choisi ?\n\n'
    '$N = ?$',
    [var('k', '2..9'), var('n', '2..12'), var('a', '1..20'), var('r', 'eval:n*k-a')],
    [blank('{{n}}', expectedErrors=[
        err('{{eval:r*k-a}}', MSG_V5_REFAIT, 'Programme refait au lieu d\'être défait'),
        err('{{eval:r+a}}', MSG_V5_OUBLI, 'Multiplication non défaite'),
    ])],
    ['**On défait la dernière étape.** $N \\times {{k}} - {{a}} = {{r}}$, donc '
     '$N \\times {{k}} = {{r}} + {{a}} = {{eval:r+a}}$.',
     '**Puis la première.** $N = {{eval:r+a}} \\div {{k}} = ' + coul('{{n}}') + '$.',
     '**Vérification.** ${{n}} \\times {{k}} - {{a}} = {{eval:r+a}} - {{a}} = {{r}}$.'],
    ['r >= 1'], hint=HINT_ENVERS)


def specs_nombre(base):
    s = []
    v = {'k': '3', 'q': '6', 'a': '5'}  # N = 18, r = 11
    vals = dict(k=3, a=5)
    s.append(spec('N ÷ 3 + 5 = 11 : N = 18', base, v, 'correct', ['18']))
    s.append(spec('Erreur prévue : 11 × 3 − 5 = 28', base, v, 'incorrect', ['28'],
                  message=msg(MSG_V3_ORDRE, **vals)))
    s.append(spec('Erreur prévue : 6 (division oubliée)', base, v, 'incorrect', ['6'],
                  message=msg(MSG_V3_OUBLI, **vals)))
    v = {'k': '4', 'r': '7', 'a': '3'}  # N = 25
    vals = dict(k=4, a=3)
    s.append(spec('(N + 3) ÷ 4 = 7 : N = 25', base + 1, v, 'correct', ['25']))
    s.append(spec('Erreur prévue : (7 − 3) × 4 = 16', base + 1, v, 'incorrect', ['16'],
                  message=msg(MSG_V4_ORDRE, **vals)))
    s.append(spec('Erreur prévue : 28 (ajout non défait)', base + 1, v, 'incorrect', ['28'],
                  message=msg(MSG_V4_OUBLI, **vals)))
    s.append(spec('Erreur prévue : 31 (ajouté)', base + 1, v, 'incorrect', ['31'],
                  message=msg(MSG_V4_AJOUT, **vals)))
    v = {'k': '5', 'n': '9', 'a': '7'}  # r = 38
    vals = dict(k=5, a=7, r=38)
    s.append(spec('N × 5 − 7 = 38 : N = 9', base + 2, v, 'correct', ['9']))
    s.append(spec('Erreur prévue : 38 × 5 − 7 = 183', base + 2, v, 'incorrect', ['183'],
                  message=msg(MSG_V5_REFAIT, **vals)))
    s.append(spec('Erreur prévue : 45 (multiplication non défaite)', base + 2, v, 'incorrect',
                  ['45'], message=msg(MSG_V5_OUBLI, **vals)))
    return s


AJOUTS = {
    'b9677e1f.json': ([U_V1, U_V2], specs_unites,
                      'Chiffre des unités d\'un produit (un facteur à 2 chiffres, l\'autre à 3), '
                      'd\'une somme ou d\'une différence de deux nombres jusqu\'à 999'),
    'd793de49.json': ([P_V2], specs_produit,
                      'Un facteur à $3$ chiffres ; ou compléter le calcul décomposé '
                      '$a \\times b = a \\times c00 + a \\times d0 + a \\times u$'),
    '98f558e4.json': ([N_V3, N_V4, N_V5], specs_nombre,
                      'Un nombre inconnu noté par une lettre ou un symbole : k × (a + N) = r, '
                      'N × k + a = r, deux égalités à symboles enchaînées ; programmes en phrases '
                      'à défaire : N ÷ k + a = r, (N + a) ÷ k = r, N × k − a = r'),
}

for nom, (nouvelles, faire_specs, description) in AJOUTS.items():
    chemin = os.path.join(DOSSIER, nom)
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    deja = {v['statement'] for v in m['variations']}
    if any(v['statement'] in deja for v in nouvelles):
        sys.exit('⛔ ' + nom + ' porte déjà les nouvelles variations : rien écrit.')
    base = len(m['variations'])
    m['variations'] = m['variations'] + nouvelles
    m['testSpecs'] = m['testSpecs'] + faire_specs(base)
    m['description'] = description
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(nom, ':', len(nouvelles), 'variation(s) ajoutée(s) à partir du rang', base)

"""Écrit les 6 modèles du lot 11 du CE2 (matériel multibase) dans scripts/questions/ce2-11/.

Phase 0 validée par David le 2026-11-06 (« je suis tes recos », § 17 du journal
`docs/wip/questions-ce2-progress.md`) : pas de QCM de dessins (grand bloc illisible imprimé dans
un choix) ; au plus 20 centaines dessinées ; brouillons neufs, migration nœud + tag sans règle
neuve. Outil : bloc ```collection, `centaines:` et `milliers:` (#2420), `construire:` jusqu'à
9 999 (réserve déduite de la valeur, seule la valeur est jugée). Bornes `cycle2.json`, CE2-001,
002, 005 : groupes de dix, cent ou mille ; plus de dix éléments d'une unité (17 u, 8 d, 32 c et
2 milliers) ; matériel → chiffres, unités de numération (463 dizaines et 5 unités).

Niveaux : nœud « dénombrement » (un seul modèle, CP, niveau 1) : 10 à 14, 2 à 9 laissés au CP et
au CE1 ; nœud « écritures » : 20 (après 19, `03-unites-non-canoniques`). Relevé MCP du 2026-11-06.

    python3 docs/wip/questions/lot-ce2-11.py scripts/questions/ce2-11
"""
import json
import sys

DOSSIER = sys.argv[1]

# Règle de l'école en numération (comme le lot 2) : espaces exigées dès 4 chiffres dans une case
# tapée. Pas sur `construire:` : la case y reçoit la valeur posée, écrite par le composant.
ECOLE = {'constraints': {'spacesFromFourDigits': True}}


def groupe(reponse):
    """4635 → 4\\,635 : les réponses des specs s'écrivent comme l'élève doit les écrire."""
    if not reponse.isdigit() or len(reponse) < 4:
        return reponse
    tranches = []
    while len(reponse) > 3:
        tranches.insert(0, reponse[-3:])
        reponse = reponse[:-3]
    return '\\,'.join([reponse] + tranches)


def spec(desc, vi, variables, answers, status, violations=None, brut=False):
    # brut : réponse gardée telle quelle (valeur posée par `construire:`, espace oubliée)
    answers = answers if isinstance(answers, list) else [answers]
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if brut else [groupe(a) for a in answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, level, variations, specs, ecole=True, delay=60):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE2'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if ecole:
        m['options'] = ECOLE
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `blanks` ; `construire:` porte la
    # sienne (posée par le générateur) : `blanks` vide
    v = {'statement': statement, 'variables': variables, 'blanks': [{'expectedAnswer': b}
                                                                     for b in blanks]}
    if conditions:
        v['conditions'] = conditions
    v['correction'] = {'steps': steps}
    return v


def bloc(*lignes):
    return '\n\n```collection\n' + '\n'.join(lignes) + '\n```'


def accord(nom, v):
    # « 1 centaine », « 0 dizaine », « 3 unités » ; « petit cube » → « petits cubes »
    pluriel = ' '.join(mot if mot.endswith('s') else mot + 's' for mot in nom.split(' '))  # « gros »
    return '{{if:' + v + '<=1|' + nom + '|' + pluriel + '}}'


def liste(morceaux):
    # « a, b et c »
    return morceaux[0] if len(morceaux) == 1 else ', '.join(morceaux[:-1]) + ' et ' + morceaux[-1]


# Une ligne de corrigé par rang : « 3 plaques : 3 centaines, c'est 300 cubes. »
RANGS = {
    'm': ('gros cube', 'millier', 1000),
    'c': ('plaque', 'centaine', 100),
    'd': ('barre', 'dizaine', 10),
    'u': ('petit cube', 'unité', 1),
}
LIGNE = {'m': 'milliers: {{m}}', 'c': 'centaines: {{c}}', 'd': 'dizaines: {{d}}',
         'u': 'unités: {{u}}'}


def valeur(rangs):
    return '+'.join(f'{RANGS[r][2]}*{r}' for r in rangs)


def etape_rang(r):
    objet, unite, v = RANGS[r]
    if r == 'u':
        return '${{u}}$ ' + accord('petit cube', 'u') + ' : ${{u}}$ ' + accord('unité', 'u') + '.'
    return ('${{' + r + '}}$ ' + accord(objet, r) + ' : ${{' + r + '}}$ ' + accord(unite, r)
            + ', c\'est ${{eval:' + str(v) + '*' + r + '}}$ cubes.')


def somme(rangs):
    termes = ['{{eval:' + str(RANGS[r][2]) + '*' + r + '}}' if r != 'u' else '{{u}}'
              for r in rangs]
    return '$$' + '+'.join(termes) + '={{solution}}$$'


def denombrer(rangs, plages, conditions=None, rappel=False):
    """Collection dessinée (rangs donnés, plages par rang) → « Il y a ? cubes en tout. »"""
    etapes = [etape_rang(r) for r in rangs]
    if rappel:
        # rang au-delà de 9 : l'échange dit d'abord, puis la somme
        etapes.insert(0, 'Une plaque vaut $100$ cubes, une barre $10$ cubes et un gros cube'
                         ' $1\\,000$ cubes, même quand il y en a plus de $10$.')
    etapes.append(somme(rangs))
    return variation(
        'Combien de petits cubes y a-t-il en tout ?' + bloc(*[LIGNE[r] for r in rangs])
        + '\n\nIl y a $?$ cubes en tout.',
        [var(r, plages[r]) for r in rangs], ['{{eval:' + valeur(rangs) + '}}'], etapes,
        conditions)


# --- 1. CE2-001 : dénombrer jusqu'à 999 -----------------------------------------------------

D_CENT = [
    denombrer('cdu', {'c': '1..9', 'd': '1..9', 'u': '1..9'}),
    # rang vide au milieu : 3 c 0 d 4 u = 304, pas 34
    variation('Combien de petits cubes y a-t-il en tout ?'
              + bloc('centaines: {{c}}', 'unités: {{u}}') + '\n\nIl y a $?$ cubes en tout.',
              [var('c', '1..9'), var('u', '1..9')], ['{{eval:100*c+u}}'],
              [etape_rang('c'), 'Aucune barre : $0$ dizaine.', etape_rang('u'),
               '$${{eval:100*c}}+0+{{u}}={{solution}}$$']),
]

V = {'c': '3', 'd': '4', 'u': '7'}
SPECS_D_CENT = [
    spec('3 plaques, 4 barres, 7 cubes : 347', 0, V, '347', 'correct'),
    spec('Erreur : plaques comptées comme barres (3 + 4 = 7 dizaines, 77)', 0, V, '77',
         'incorrect'),
    spec('Erreur : rangs inversés (374)', 0, V, '374', 'incorrect'),
    spec('Erreur : objets comptés un à un (14)', 0, V, '14', 'incorrect'),
    spec('borne : 9 plaques, 9 barres, 9 cubes : 999', 0, {'c': '9', 'd': '9', 'u': '9'}, '999',
         'correct'),
    spec('3 plaques, 4 cubes : 304', 1, {'c': '3', 'u': '4'}, '304', 'correct'),
    spec('Erreur : zéro oublié (34)', 1, {'c': '3', 'u': '4'}, '34', 'incorrect'),
]

# --- 2. CE2-001 : dénombrer jusqu'à 9 999 ---------------------------------------------------

D_MILLE = [
    denombrer('mcdu', {'m': '1..9', 'c': '1..9', 'd': '1..9', 'u': '1..9'}),
    # pas de plaque : 2 m 0 c 5 d 3 u = 2 053
    variation('Combien de petits cubes y a-t-il en tout ?'
              + bloc('milliers: {{m}}', 'dizaines: {{d}}', 'unités: {{u}}')
              + '\n\nIl y a $?$ cubes en tout.',
              [var('m', '1..9'), var('d', '1..9'), var('u', '1..9')],
              ['{{eval:1000*m+10*d+u}}'],
              [etape_rang('m'), 'Aucune plaque : $0$ centaine.', etape_rang('d'), etape_rang('u'),
               '$${{eval:1000*m}}+0+{{eval:10*d}}+{{u}}={{solution}}$$']),
    # ni barre ni cube : 4 m 7 c = 4 700
    variation('Combien de petits cubes y a-t-il en tout ?'
              + bloc('milliers: {{m}}', 'centaines: {{c}}') + '\n\nIl y a $?$ cubes en tout.',
              [var('m', '1..9'), var('c', '1..9')], ['{{eval:1000*m+100*c}}'],
              [etape_rang('m'), etape_rang('c'), 'Aucune barre, aucun petit cube.',
               '$${{eval:1000*m}}+{{eval:100*c}}={{solution}}$$']),
]

V = {'m': '4', 'c': '6', 'd': '3', 'u': '5'}
SPECS_D_MILLE = [
    spec('4 gros cubes, 6 plaques, 3 barres, 5 cubes : 4 635', 0, V, '4635', 'correct'),
    spec('Erreur : rangs inversés (4 365)', 0, V, '4365', 'incorrect'),
    spec('Erreur : objets comptés un à un (18)', 0, V, '18', 'incorrect'),
    spec('Forme : espace oubliée (4635)', 0, V, '4635', 'unoptimal_form', ['spaces'], brut=True),
    spec('borne : 9 999', 0, {'m': '9', 'c': '9', 'd': '9', 'u': '9'}, '9999', 'correct'),
    spec('2 gros cubes, 5 barres, 3 cubes : 2 053', 1, {'m': '2', 'd': '5', 'u': '3'}, '2053',
         'correct'),
    spec('Erreur : zéro oublié (253)', 1, {'m': '2', 'd': '5', 'u': '3'}, '253', 'incorrect'),
    spec('4 gros cubes, 7 plaques : 4 700', 2, {'m': '4', 'c': '7'}, '4700', 'correct'),
    spec('Erreur : zéros oubliés (47)', 2, {'m': '4', 'c': '7'}, '47', 'incorrect'),
]

# --- 3. CE2-001 : plus de dix objets d'un rang ----------------------------------------------
# Exemple du programme : 17 u, 8 d, 32 c et 2 milliers ; au plus 20 plaques dessinées (§ 17).

D_PLUS = [
    denombrer('cdu', {'c': '1..8', 'd': '11..19', 'u': '1..9'}, rappel=True),
    denombrer('cdu', {'c': '1..9', 'd': '1..9', 'u': '11..19'}, rappel=True),
    denombrer('mcdu', {'m': '1..3', 'c': '11..20', 'd': '1..9', 'u': '11..19'}, rappel=True),
]

SPECS_D_PLUS = [
    spec('3 plaques, 14 barres, 6 cubes : 446', 0, {'c': '3', 'd': '14', 'u': '6'}, '446',
         'correct'),
    spec('Erreur : rangs recopiés (3146)', 0, {'c': '3', 'd': '14', 'u': '6'}, '3146',
         'incorrect'),
    spec('Erreur : 14 barres = 14 (323)', 0, {'c': '3', 'd': '14', 'u': '6'}, '323', 'incorrect'),
    spec('borne : 8 plaques, 19 barres, 9 cubes : 999', 0, {'c': '8', 'd': '19', 'u': '9'}, '999',
         'correct'),
    spec('5 plaques, 2 barres, 17 cubes : 537', 1, {'c': '5', 'd': '2', 'u': '17'}, '537',
         'correct'),
    spec('Erreur : rangs recopiés (5217)', 1, {'c': '5', 'd': '2', 'u': '17'}, '5217', 'incorrect'),
    spec('2 gros cubes, 18 plaques, 8 barres, 17 cubes : 3 897', 2,
         {'m': '2', 'c': '18', 'd': '8', 'u': '17'}, '3897', 'correct'),
    spec('Erreur : rangs recopiés (218817)', 2, {'m': '2', 'c': '18', 'd': '8', 'u': '17'},
         '218817', 'incorrect'),
    spec('borne : 3 gros cubes, 20 plaques, 9 barres, 19 cubes : 5 109', 2,
         {'m': '3', 'c': '20', 'd': '9', 'u': '19'}, '5109', 'correct'),
]

# --- 4 et 5. CE2-002 : construire un nombre donné -------------------------------------------


def construis(rangs, plages, phrase, ecrit='{{n}}'):
    """`construire: n` : l'élève pose plaques, barres, cubes (et gros cubes) ; sa case reçoit la
    valeur posée. `ecrit` : le nombre tel qu'il s'affiche ; à 4 chiffres, groupé chiffre par
    chiffre (4 635), le modèle ne pouvant pas porter « Espaces dès 4 chiffres » (la valeur
    posée, sans espace, y serait une forme à améliorer : mesuré le 2026-11-06)."""
    expr = 'eval:' + valeur(rangs)
    etapes = ['$' + ecrit + '$, c\'est ' + phrase + '.',
              'On pose ' + liste(['${{' + r + '}}$ ' + accord(RANGS[r][0], r) for r in rangs])
              + '.']
    return variation(
        'Construis $' + ecrit + '$ avec le matériel.' + bloc('construire: {{n}}'),
        [var(r, plages[r]) for r in rangs] + [var('n', expr)], [], etapes)


def phrase_rangs(rangs):
    return liste(['${{' + r + '}}$ ' + accord(RANGS[r][1], r) for r in rangs])


C_CENT = [
    construis('cdu', {'c': '1..9', 'd': '1..9', 'u': '1..9'}, phrase_rangs('cdu')),
    construis('cu', {'c': '1..9', 'u': '1..9'}, phrase_rangs('cu') + ', aucune dizaine'),
    construis('cd', {'c': '1..9', 'd': '1..9'}, phrase_rangs('cd') + ', aucune unité'),
]

SPECS_C_CENT = [
    spec('347 construit', 0, {'c': '3', 'd': '4', 'u': '7', 'n': '347'}, '347', 'correct',
         brut=True),
    spec('Erreur : 374 construit', 0, {'c': '3', 'd': '4', 'u': '7', 'n': '347'}, '374',
         'incorrect', brut=True),
    spec('Erreur : 3 barres au lieu de 3 plaques (77)', 0,
         {'c': '3', 'd': '4', 'u': '7', 'n': '347'}, '77', 'incorrect', brut=True),
    spec('borne : 999 construit', 0, {'c': '9', 'd': '9', 'u': '9', 'n': '999'}, '999', 'correct',
         brut=True),
    spec('305 construit', 1, {'c': '3', 'u': '5', 'n': '305'}, '305', 'correct', brut=True),
    spec('Erreur : 35 construit (zéro oublié)', 1, {'c': '3', 'u': '5', 'n': '305'}, '35',
         'incorrect', brut=True),
    spec('470 construit', 2, {'c': '4', 'd': '7', 'n': '470'}, '470', 'correct', brut=True),
    spec('Erreur : 47 construit', 2, {'c': '4', 'd': '7', 'n': '470'}, '47', 'incorrect',
         brut=True),
]

C_MILLE = [
    construis('mcdu', {'m': '1..9', 'c': '1..9', 'd': '1..9', 'u': '1..9'}, phrase_rangs('mcdu'),
              '{{m}}\\,{{c}}{{d}}{{u}}'),
    construis('mdu', {'m': '1..9', 'd': '1..9', 'u': '1..9'},
              phrase_rangs('mdu') + ', aucune centaine', '{{m}}\\,0{{d}}{{u}}'),
    construis('mc', {'m': '1..9', 'c': '1..9'}, phrase_rangs('mc') + ', ni dizaine ni unité',
              '{{m}}\\,{{c}}00'),
]

SPECS_C_MILLE = [
    spec('4 635 construit', 0, {'m': '4', 'c': '6', 'd': '3', 'u': '5', 'n': '4635'}, '4635',
         'correct', brut=True),
    spec('Erreur : 4 365 construit', 0, {'m': '4', 'c': '6', 'd': '3', 'u': '5', 'n': '4635'},
         '4365', 'incorrect', brut=True),
    spec('borne : 9 999 construit', 0, {'m': '9', 'c': '9', 'd': '9', 'u': '9', 'n': '9999'},
         '9999', 'correct', brut=True),
    spec('3 045 construit', 1, {'m': '3', 'd': '4', 'u': '5', 'n': '3045'}, '3045', 'correct',
         brut=True),
    spec('Erreur : 345 construit (zéro oublié)', 1, {'m': '3', 'd': '4', 'u': '5', 'n': '3045'},
         '345', 'incorrect', brut=True),
    spec('6 900 construit', 2, {'m': '6', 'c': '9', 'n': '6900'}, '6900', 'correct', brut=True),
    spec('Erreur : 69 construit', 2, {'m': '6', 'c': '9', 'n': '6900'}, '69', 'incorrect',
         brut=True),
]

# --- 6. CE2-005 : du matériel aux unités de numération --------------------------------------
# 2 à 9 par rang : le pluriel de l'énoncé reste juste quelle que soit la case.

MATERIEL = [
    variation('Complète.' + bloc(*[LIGNE[r] for r in 'mcdu'])
              + '\n\nCe matériel montre $?$ milliers, $?$ centaines, $?$ dizaines et $?$ unités.'
              '\n\nC\'est le nombre $?$.',
              [var(r, '2..9') for r in 'mcdu'],
              ['{{m}}', '{{c}}', '{{d}}', '{{u}}', '{{eval:1000*m+100*c+10*d+u}}'],
              ['Un gros cube = $1$ millier, une plaque = $1$ centaine, une barre = $1$ dizaine,'
               ' un petit cube = $1$ unité.',
               '${{m}}$ milliers, ${{c}}$ centaines, ${{d}}$ dizaines et ${{u}}$ unités.',
               '$${{eval:1000*m}}+{{eval:100*c}}+{{eval:10*d}}+{{u}}={{eval:1000*m+100*c+10*d+u}}$$']),
    # écriture non canonique du programme : 463 dizaines et 5 unités
    variation('Complète.' + bloc(*[LIGNE[r] for r in 'mcdu'])
              + '\n\nCe matériel montre $?$ dizaines et ${{u}}$ unités.',
              [var('m', '1..9'), var('c', '1..9'), var('d', '1..9'), var('u', '2..9')],
              ['{{eval:100*m+10*c+d}}'],
              ['Un gros cube, c\'est $100$ dizaines ; une plaque, $10$ dizaines ; une barre,'
               ' $1$ dizaine.',
               '${{m}}$ ' + accord('gros cube', 'm') + ' : ${{eval:100*m}}$ dizaines ; ${{c}}$ '
               + accord('plaque', 'c') + ' : ${{eval:10*c}}$ dizaines ; ${{d}}$ '
               + accord('barre', 'd') + ' : ${{d}}$ ' + accord('dizaine', 'd') + '.',
               'En tout : ${{eval:100*m}}+{{eval:10*c}}+{{d}}={{solution}}$ dizaines, et ${{u}}$'
               ' unités.']),
]

V = {'m': '4', 'c': '6', 'd': '3', 'u': '5'}
SPECS_MATERIEL = [
    spec('4 m, 6 c, 3 d, 5 u : 4 635', 0, V, ['4', '6', '3', '5', '4635'], 'correct'),
    spec('Erreur : rangs inversés', 0, V, ['4', '3', '6', '5', '4365'], 'incorrect'),
    spec('463 dizaines et 5 unités', 1, V, '463', 'correct'),
    spec('Erreur : chiffre des dizaines seul (3)', 1, V, '3', 'incorrect'),
    spec('Erreur : dizaines entières oubliées du millier (63)', 1, V, '63', 'incorrect'),
    spec('borne : 9 m, 9 c, 9 d : 999 dizaines', 1, {'m': '9', 'c': '9', 'd': '9', 'u': '9'},
         '999', 'correct'),
]

MODELES = {
    '01-denombrer-centaines': modele(
        'Dénombrer des plaques, des barres et des cubes',
        'Matériel multibase jusqu\'à 999 → nombre de cubes ; avec une dizaine vide (304)',
        11, D_CENT, SPECS_D_CENT),
    '02-denombrer-milliers': modele(
        'Dénombrer avec des gros cubes de mille',
        'Gros cubes, plaques, barres, cubes jusqu\'à 9 999 ; centaines vides (2 053), ni dizaine'
        ' ni unité (4 700)',
        13, D_MILLE, SPECS_D_MILLE),
    '03-denombrer-plus-de-dix': modele(
        'Dénombrer avec plus de dix objets d\'un rang',
        'Plus de 10 barres, cubes ou plaques (comme 17 u, 8 d, 32 c, 2 milliers) ; au plus 20'
        ' plaques',
        14, D_PLUS, SPECS_D_PLUS, delay=90),
    '04-construis-trois-chiffres': modele(
        'Construire un nombre de 100 à 999 avec le matériel',
        'Construire avec plaques, barres et cubes ; avec un zéro (305, 470)',
        10, C_CENT, SPECS_C_CENT, ecole=False, delay=90),
    '05-construis-quatre-chiffres': modele(
        'Construire un nombre de 1 000 à 9 999 avec le matériel',
        'Gros cubes, plaques, barres et cubes ; zéros intérieurs (3 045, 6 900)',
        12, C_MILLE, SPECS_C_MILLE, ecole=False, delay=120),
    '06-materiel-unites-numeration': modele(
        'Du matériel aux unités de numération',
        'Matériel dessiné → milliers, centaines, dizaines, unités et le nombre ; en dizaines'
        ' (463 dizaines et 5 unités)',
        20, MATERIEL, SPECS_MATERIEL, delay=90),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')

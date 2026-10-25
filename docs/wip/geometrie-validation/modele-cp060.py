"""Écrit le modèle CP-060 (terminer un carré / un rectangle sur quadrillage) dans scripts/questions/cp-figure/."""
import json
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-26 (journal docs/wip/geometrie-validation-progress.md § 7 et § 9) :
# carré + rectangle seulement ; aucune lettre (sommets invisibles) ; côté en morceaux accepté ;
# trait repassé sur un côté donné ignoré ; delay 90 s.

# Fenêtre 0..12 × 0..8, quadrillage de pas 1. Les deux carrés possibles tiennent dans la fenêtre
# (l'élève ne doit pas être bloqué par le bord), le rectangle aussi.
FENETRE = 'fenetre: 0 ; 12 ; 0 ; 8\ngrille: 1\noutils: segment\n'


def bloc(verifier, script):
    return '```figure-a-completer\n' + FENETRE + f'verifier: {verifier}\n---\n' + script + '\n```'


CARRE_SCRIPT = ('A = point({{xa}}, {{ya}}, visible=faux)\n'
                'B = point({{xb}}, {{yb}}, visible=faux)\n'
                'ab = segment(A, B)')

RECTANGLE_SCRIPT = ('A = point({{xa}}, {{ya}}, visible=faux)\n'
                    'B = point({{xb}}, {{yb}}, visible=faux)\n'
                    'C = point({{xc}}, {{yc}}, visible=faux)\n'
                    'ab = segment(A, B)\n'
                    'bc = segment(B, C)')

CORRECTION_CARRE = {'steps': [
    'Un carré a quatre côtés de la même longueur et quatre angles droits.',
    'Le côté tracé mesure {{c}} carreaux : on trace les trois autres côtés, de {{c}} carreaux '
    'chacun, en suivant les lignes du quadrillage.',
    'On peut construire le carré d\'un côté ou de l\'autre du côté tracé.',
]}

CORRECTION_RECTANGLE = {'steps': [
    'Dans un rectangle, les côtés qui se font face ont la même longueur, et les quatre angles '
    'sont droits.',
    'On trace en face de chaque côté tracé un côté de la même longueur, en suivant les lignes '
    'du quadrillage, et la figure se ferme.',
]}


def v(name, expression):
    return {'name': name, 'expression': expression}


CARRE_HORIZONTAL = {
    'statement': 'Termine le carré.\n\n' + bloc('carre A ; B', CARRE_SCRIPT),
    'variables': [v('c', '2..4'), v('xa', '1..9'), v('ya', '2..6'),
                  v('xb', 'eval:xa + c'), v('yb', 'eval:ya')],
    'conditions': ['xa + c <= 11', 'ya - c >= 0', 'ya + c <= 8'],
    'correction': CORRECTION_CARRE,
}

CARRE_VERTICAL = {
    'statement': 'Termine le carré.\n\n' + bloc('carre A ; B', CARRE_SCRIPT),
    'variables': [v('c', '2..4'), v('xa', '2..10'), v('ya', '1..5'),
                  v('xb', 'eval:xa'), v('yb', 'eval:ya + c')],
    'conditions': ['xa - c >= 0', 'xa + c <= 12', 'ya + c <= 7'],
    'correction': CORRECTION_CARRE,
}

# Rectangle : coin B ; [BA] vertical (h carreaux, vers le haut si t = 1), [BC] horizontal
# (l carreaux, vers la droite si u = 1) ; côtés inégaux (sinon c'est un carré).
RECTANGLE = {
    'statement': 'Termine le rectangle.\n\n' + bloc('rectangle A ; B ; C', RECTANGLE_SCRIPT),
    'variables': [v('l', '2..6'), v('h', '2..5'), v('t', '0..1'), v('u', '0..1'),
                  v('xb', '1..11'), v('yb', '1..7'),
                  v('xa', 'eval:xb'), v('ya', 'eval:yb + (2*t - 1)*h'),
                  v('xc', 'eval:xb + (2*u - 1)*l'), v('yc', 'eval:yb')],
    'conditions': ['l != h', 'ya >= 1', 'ya <= 7', 'xc >= 1', 'xc <= 11'],
    'correction': CORRECTION_RECTANGLE,
}


def spec(desc, vi, variables_, status, answer):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': [answer]}


def s(*points):
    """Segments qui relient les points à la suite : s(p, q, r) = [pq] et [qr]."""
    return '|'.join(f'segment({a[0]};{a[1]};{b[0]};{b[1]})' for a, b in zip(points, points[1:]))


def add(p, q, k=1):
    return (p[0] + k * q[0], p[1] + k * q[1])


def specs_carre(vi, a, b):
    c = abs(b[0] - a[0]) + abs(b[1] - a[1])
    n = (-(b[1] - a[1]), b[0] - a[0])  # quart de tour direct
    variables_ = {'c': str(c), 'xa': str(a[0]), 'ya': str(a[1]), 'xb': str(b[0]), 'yb': str(b[1])}
    c1, d1 = add(b, n), add(a, n)
    c2, d2 = add(b, n, -1), add(a, n, -1)
    milieu = add(b, n, 0.5) if c % 2 == 0 else add(b, n, 1 / 3)
    milieu = (round(milieu[0]), round(milieu[1]))
    court = add(b, n, (c - 1) / c)
    court_a = add(a, n, (c - 1) / c)
    return [
        spec('les trois côtés d\'un côté', vi, variables_, 'correct', s(b, c1, d1, a)),
        spec('les trois côtés de l\'autre côté', vi, variables_, 'correct', s(b, c2, d2, a)),
        spec('un côté en deux morceaux', vi, variables_, 'correct',
             s(b, milieu, c1) + '|' + s(c1, d1, a)),
        spec('un trait repassé sur le côté donné', vi, variables_, 'correct',
             s(b, c1, d1, a) + '|' + s(a, b)),
        spec('Erreur : un côté manque', vi, variables_, 'incorrect', s(b, c1, d1)),
        spec('Erreur : rectangle au lieu de carré', vi, variables_, 'incorrect',
             s(b, (round(court[0]), round(court[1])), (round(court_a[0]), round(court_a[1])), a)),
        spec('Erreur : le bon carré et un trait en trop', vi, variables_, 'incorrect',
             s(b, c1, d1, a) + '|' + s(b, c2)),
    ]


def specs_rectangle(vi, extra, a, b, c):
    d = (a[0] + c[0] - b[0], a[1] + c[1] - b[1])
    variables_ = {**extra, 'xa': str(a[0]), 'ya': str(a[1]), 'xb': str(b[0]), 'yb': str(b[1]),
                  'xc': str(c[0]), 'yc': str(c[1])}
    return [
        spec('les deux côtés qui manquent', vi, variables_, 'correct', s(c, d, a)),
        spec('dans l\'autre sens', vi, variables_, 'correct', s(a, d, c)),
        spec('Erreur : un côté manque', vi, variables_, 'incorrect', s(c, d)),
        spec('Erreur : un trait oblique', vi, variables_, 'incorrect', s(c, a)),
        spec('Erreur : le bon rectangle et un trait en trop', vi, variables_, 'incorrect',
             s(c, d, a) + '|' + s(b, (b[0], b[1] + (b[1] - a[1])))),
    ]


SPECS = (
    specs_carre(0, (2, 4), (5, 4))
    + specs_carre(1, (6, 2), (6, 5))
    + specs_rectangle(2, {'l': '4', 'h': '2', 't': '1', 'u': '1'}, (3, 5), (3, 3), (7, 3))
)

MODELE = {
    'title': 'Termine le carré ou le rectangle sur le quadrillage',
    'description': 'Sur quadrillage, compléter un carré (un côté tracé) ou un rectangle (deux '
                   'côtés consécutifs tracés), côtés suivant les lignes',
    'grades': ['CP'],
    'theme': 'Géométrie',
    'domain': 'Tracés',
    'subdomain': 'Carrés et rectangles',
    'level': 1,
    'delay': 90,
    'status': 'draft',
    'variations': [CARRE_HORIZONTAL, CARRE_VERTICAL, RECTANGLE],
    'testSpecs': SPECS,
}

with open(f'{DOSSIER}/02-terminer-carre-rectangle.json', 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')

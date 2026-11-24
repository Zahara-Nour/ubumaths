"""Écrit les modèles neufs du chantier idees-1re-derivation dans
scripts/questions/idees-1re-derivation-neufs/.

Phase 0 validée par David le 2026-11-23 (« je valide tout » ; journal
docs/archive/wip/idees-1re-derivation/idees-1re-derivation-progress.md, page à cocher
https://claude.ai/artifact/EU7fV67f4F39ze4yHnySLC) : F1 et F2, deux modèles neufs.

Points prévus (rangement par migration, après la création en brouillon) :
F1 1SPE-260, F2 1SPE-272. Grades 1_SPE seulement : F1 calcule le taux de la fonction inverse,
hors des « polynômes simples » de la 1re techno (décision l1t-7).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves),
chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce par variation, qui ne
donne jamais la réponse.

Usage : python3 docs/wip/questions/idees-1re-derivation-neufs.py scripts/questions/idees-1re-derivation-neufs
"""
import json
import os
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if status == 'unoptimal_form':
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, rangement):
    return {'rangement': rangement, 'title': title, 'description': description, 'grades': ['1_SPE'], 'level': level,
            'delay': 180, 'status': 'draft', 'shared': {'cleanCoefficients': True},
            'options': {'constraints': {'form': 'warn'}},
            'variations': variations, 'testSpecs': specs}


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
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def fr(x):
    """Nombre rationnel en LaTeX, comme l'élève le tape."""
    x = Fr(x)
    if x.denominator == 1:
        return str(x.numerator)
    signe = '-' if x < 0 else ''
    return signe + '\\frac{' + str(abs(x.numerator)) + '}{' + str(x.denominator) + '}'


def affine(m, p):
    """mx + p en LaTeX (réponse d'élève)."""
    m, p = Fr(m), Fr(p)
    if m == 1:
        t = 'x'
    elif m == -1:
        t = '-x'
    else:
        t = fr(m) + 'x'
    if p == 0:
        return t
    return t + ('+' if p > 0 else '-') + fr(abs(p))


X = var('x', 'x|x')

# =============================================================================================
# F1 — Nombre dérivé de la fonction inverse par le taux de variation (1AN10-1, 1AN10-2).
# Point 1SPE-260 : le BO cite le second degré et la fonction inverse parmi les « cas qui s'y
# prêtent ». Deux cases, comme 46913a48 : le taux simplifié (expression en h), puis f'(a).
# a > 0 (et a + b > 0) et fractions irréductibles : la réponse attendue est sous forme
# optimale (un a négatif donnait −1/(−2(−2 + h)), jugé « forme à améliorer »).
# Messages sans parenthèses autour d'une variable : la résolution les réécrit (f\left( 3 \right)).
# =============================================================================================

TAUX = '$\\dfrac{f({{a}}+h)-f({{a}})}{h}=?$\n\n$f\'({{a}})=?$'
ERR_TAUX_LIMITE = ('Le taux dépend encore de $h$ : écris-le en fonction de $h$, la limite vient '
                   'ensuite.')
ERR_DERIVE_SIGNE = 'Le nombre dérivé est la limite du taux, qui est négatif : garde le signe −.'
HINT_F1 = ('Écris $f({{a}}+h)-f({{a}})$ comme une seule fraction (même dénominateur), puis '
           'divise par $h$.')


def m_signe(k):
    return ('Réduis au même dénominateur : le numérateur vaut $-' + k + 'h$, donc le taux est '
            'négatif.')


def m_carre(a):
    return ('Quand $h$ tend vers $0$, le dénominateur tend vers ${{' + a + ';()}}^2$, pas vers '
            '${{' + a + '}}$.')


def m_facteur(k):
    return 'N\'oublie pas le facteur $' + k + '$ devant $\\dfrac{1}{x}$.'


f1 = []
f1s = []

# v0 — f(x) = 1/x
f1.append(variation(
    'Soit $f$ la fonction inverse, définie sur $]-\\infty\\,;0[\\cup]0\\,;+\\infty[$ par '
    '$f(x)=\\dfrac{1}{x}$.\n\nPour $h\\neq0$ assez petit, exprime le taux de variation de $f$ entre '
    '${{a}}$ et ${{a}}+h$ sous forme simplifiée, puis déduis-en $f\'({{a}})$.\n\n' + TAUX,
    [var('a', '1..6')],
    [case('-\\frac{1}{ {{a}}({{a}}+h)}', [
        erreur('\\frac{1}{ {{a}}({{a}}+h)}', m_signe(''), 'Signe du taux'),
        erreur('{{eval:-1/a^2}}', ERR_TAUX_LIMITE, 'Limite donnée à la place du taux'),
    ]),
     case('{{eval:-1/a^2}}', [
         erreur('{{eval:1/a^2}}', ERR_DERIVE_SIGNE, 'Signe du nombre dérivé'),
         erreur('{{eval:1/a}}',
                'Tu as donné l\'image de ${{a}}$ : le nombre dérivé est la limite du taux quand '
                '$h$ tend vers $0$.', 'Image au lieu du nombre dérivé'),
         erreur('{{eval:-1/a}}', m_carre('a'), 'Dénominateur a au lieu de a²'),
     ])],
    ['$f({{a}}+h)-f({{a}})=\\dfrac{1}{ {{a}}+h}-\\dfrac{1}{ {{a}} }='
     '\\dfrac{ {{a}}-({{a}}+h)}{ {{a}}({{a}}+h)}=\\dfrac{-h}{ {{a}}({{a}}+h)}$.',
     'Pour $h\\neq0$, on divise par $h$ : $$\\dfrac{f({{a}}+h)-f({{a}})}{h}='
     + PRIMAIRE + '{-\\dfrac{1}{ {{a}}({{a}}+h)} }$$',
     'Quand $h$ tend vers $0$, ${{a}}({{a}}+h)$ tend vers ${{a}}^2={{eval:a^2}}$.',
     'Donc $f\'({{a}})=' + PRIMAIRE + '{ {{eval:-1/a^2}} }$.'],
    HINT_F1, ['a != 1']))
v = {'a': 3}
f1s += [spec('1/x, a = 3 : −1/(3(3 + h)) et −1/9', 0, v, 'correct',
             ['-\\frac{1}{3(3+h)}', '-\\frac{1}{9}']),
        spec('1/x, a = 3 : −1/(9 + 3h), dénominateur développé', 0, v, 'unoptimal_form',
             ['-\\frac{1}{9+3h}', '-\\frac{1}{9}']),
        spec('Signe du taux', 0, v, 'incorrect', ['\\frac{1}{3(3+h)}', '-\\frac{1}{9}'],
             'Réduis au même dénominateur : le numérateur vaut $-h$, donc le taux est négatif.'),
        spec('Limite à la place du taux', 0, v, 'incorrect', ['-\\frac{1}{9}', '-\\frac{1}{9}'],
             ERR_TAUX_LIMITE),
        spec('Signe du nombre dérivé', 0, v, 'incorrect', ['-\\frac{1}{3(3+h)}', '\\frac{1}{9}'],
             ERR_DERIVE_SIGNE),
        spec('f(3) au lieu de f′(3)', 0, v, 'incorrect', ['-\\frac{1}{3(3+h)}', '\\frac{1}{3}'],
             'Tu as donné l\'image de $3$ : le nombre dérivé est la limite du taux quand $h$ '
             'tend vers $0$.'),
        spec('−1/a au lieu de −1/a²', 0, v, 'incorrect', ['-\\frac{1}{3(3+h)}', '-\\frac{1}{3}'],
             'Quand $h$ tend vers $0$, le dénominateur tend vers $3^2$, pas vers $3$.'),
        spec('Décimal −0,25 en a = 2', 0, {'a': 2}, 'correct',
             ['-\\frac{1}{2(2+h)}', '-0{,}25'])]

# v1 — f(x) = k/x
f1.append(variation(
    'Soit $f$ la fonction définie sur $]-\\infty\\,;0[\\cup]0\\,;+\\infty[$ par '
    '$f(x)=\\dfrac{ {{k}} }{x}$.\n\nPour $h\\neq0$ assez petit, exprime le taux de variation de $f$ '
    'entre ${{a}}$ et ${{a}}+h$ sous forme simplifiée, puis déduis-en $f\'({{a}})$.\n\n' + TAUX,
    [var('k', '2..7'), var('a', '2..5')],
    [case('-\\frac{ {{k}} }{ {{a}}({{a}}+h)}', [
        erreur('\\frac{ {{k}} }{ {{a}}({{a}}+h)}', m_signe('{{k}}'), 'Signe du taux'),
        erreur('-\\frac{1}{ {{a}}({{a}}+h)}', m_facteur('{{k}}'), 'Facteur k oublié'),
        erreur('{{eval:-k/a^2}}', ERR_TAUX_LIMITE, 'Limite donnée à la place du taux'),
    ]),
     case('{{eval:-k/a^2}}', [
         erreur('{{eval:k/a^2}}', ERR_DERIVE_SIGNE, 'Signe du nombre dérivé'),
         erreur('{{eval:-1/a^2}}', m_facteur('{{k}}'), 'Facteur k oublié'),
         erreur('{{eval:-k/a}}', m_carre('a'), 'Dénominateur a au lieu de a²'),
     ])],
    ['$f({{a}}+h)-f({{a}})=\\dfrac{ {{k}} }{ {{a}}+h}-\\dfrac{ {{k}} }{ {{a}} }='
     '\\dfrac{ {{k}}\\left({{a}}-({{a}}+h)\\right)}{ {{a}}({{a}}+h)}='
     '\\dfrac{-{{k}}h}{ {{a}}({{a}}+h)}$.',
     'Pour $h\\neq0$, on divise par $h$ : $$\\dfrac{f({{a}}+h)-f({{a}})}{h}='
     + PRIMAIRE + '{-\\dfrac{ {{k}} }{ {{a}}({{a}}+h)} }$$',
     'Quand $h$ tend vers $0$, ${{a}}({{a}}+h)$ tend vers ${{a}}^2={{eval:a^2}}$.',
     'Donc $f\'({{a}})=' + PRIMAIRE + '{ {{eval:-k/a^2}} }$.'],
    HINT_F1, ['gcd(k,a) = 1']))
v = {'k': 3, 'a': 2}
MSG_K3 = 'N\'oublie pas le facteur $3$ devant $\\dfrac{1}{x}$.'
f1s += [spec('3/x, a = 2 : −3/(2(2 + h)) et −3/4', 1, v, 'correct',
             ['-\\frac{3}{2(2+h)}', '-\\frac{3}{4}']),
        spec('3/x, a = 2 : −0,75', 1, v, 'correct', ['-\\frac{3}{2(2+h)}', '-0{,}75']),
        spec('Signe du taux', 1, v, 'incorrect', ['\\frac{3}{2(2+h)}', '-\\frac{3}{4}'],
             'Réduis au même dénominateur : le numérateur vaut $-3 h$, donc le taux est '
             'négatif.'),
        spec('Facteur k oublié (taux)', 1, v, 'incorrect', ['-\\frac{1}{2(2+h)}', '-\\frac{3}{4}'],
             MSG_K3),
        spec('Limite à la place du taux', 1, v, 'incorrect', ['-\\frac{3}{4}', '-\\frac{3}{4}'],
             ERR_TAUX_LIMITE),
        spec('Signe du nombre dérivé', 1, v, 'incorrect', ['-\\frac{3}{2(2+h)}', '\\frac{3}{4}'],
             ERR_DERIVE_SIGNE),
        spec('Facteur k oublié (nombre dérivé)', 1, v, 'incorrect',
             ['-\\frac{3}{2(2+h)}', '-\\frac{1}{4}'], MSG_K3),
        spec('−k/a au lieu de −k/a²', 1, v, 'incorrect', ['-\\frac{3}{2(2+h)}', '-\\frac{3}{2}'],
             'Quand $h$ tend vers $0$, le dénominateur tend vers $2^2$, pas vers $2$.')]

# v2 — f(x) = k/(x + b), s = a + b > 0
f1.append(variation(
    'Soit $f$ la fonction définie pour $x\\neq{{eval:-b}}$ par '
    '$f(x)=\\dfrac{ {{k}} }{x{{b;+}}}$.\n\nPour $h\\neq0$ assez petit, exprime le taux de '
    'variation de $f$ entre ${{a}}$ et ${{a}}+h$ sous forme simplifiée, puis déduis-en '
    '$f\'({{a}})$.\n\n' + TAUX,
    [var('k', '1..6'), var('b', '1..5;±'), var('a', '1..4;±'), var('s', 'eval:a+b')],
    [case('-\\frac{ {{k}} }{ {{s}}({{s}}+h)}', [
        erreur('\\frac{ {{k}} }{ {{s}}({{s}}+h)}', m_signe('{{k}}'), 'Signe du taux'),
        erreur('-\\frac{ {{k}} }{ {{a}}({{a}}+h)}',
               'Le dénominateur de $f$ en ${{a}}$ vaut ${{s}}$, pas ${{a}}$.', 'b oublié'),
        erreur('{{eval:-k/s^2}}', ERR_TAUX_LIMITE, 'Limite donnée à la place du taux'),
    ]),
     case('{{eval:-k/s^2}}', [
         erreur('{{eval:k/s^2}}', ERR_DERIVE_SIGNE, 'Signe du nombre dérivé'),
         erreur('{{eval:-k/a^2}}',
                'Le dénominateur de $f$ en ${{a}}$ vaut ${{s}}$, pas ${{a}}$.', 'b oublié'),
         erreur('{{eval:-k/s}}', m_carre('s'), 'Dénominateur au lieu de son carré'),
     ])],
    ['$f({{a}})=\\dfrac{ {{k}} }{ {{s}} }$ et $f({{a}}+h)=\\dfrac{ {{k}} }{ {{s}}+h}$, donc '
     '$f({{a}}+h)-f({{a}})=\\dfrac{ {{k}}\\left({{s}}-({{s}}+h)\\right)}{ {{s}}({{s}}+h)}='
     '\\dfrac{-{{k}}h}{ {{s}}({{s}}+h)}$.',
     'Pour $h\\neq0$, on divise par $h$ : $$\\dfrac{f({{a}}+h)-f({{a}})}{h}='
     + PRIMAIRE + '{-\\dfrac{ {{k}} }{ {{s}}({{s}}+h)} }$$',
     'Quand $h$ tend vers $0$, ${{s}}({{s}}+h)$ tend vers ${{s}}^2={{eval:s^2}}$.',
     'Donc $f\'({{a}})=' + PRIMAIRE + '{ {{eval:-k/s^2}} }$.'],
    'Calcule d\'abord $f({{a}})$ et $f({{a}}+h)$, écris leur différence comme une seule '
    'fraction, puis divise par $h$.',
    ['a+b > 1', 'gcd(k,a+b) = 1']))
v = {'k': 3, 'b': 1, 'a': 1, 's': 2}  # a = 1 permis ici : s = 2
MSG_B = 'Le dénominateur de $f$ en $1$ vaut $2$, pas $1$.'
f1s += [spec('3/(x + 1), a = 1 : −3/(2(2 + h)) et −3/4', 2, v, 'correct',
             ['-\\frac{3}{2(2+h)}', '-\\frac{3}{4}']),
        spec('Signe du taux', 2, v, 'incorrect', ['\\frac{3}{2(2+h)}', '-\\frac{3}{4}'],
             'Réduis au même dénominateur : le numérateur vaut $-3 h$, donc le taux est '
             'négatif.'),
        spec('b oublié (taux)', 2, v, 'incorrect', ['-\\frac{3}{1+h}', '-\\frac{3}{4}'], MSG_B),
        spec('Limite à la place du taux', 2, v, 'incorrect', ['-\\frac{3}{4}', '-\\frac{3}{4}'],
             ERR_TAUX_LIMITE),
        spec('Signe du nombre dérivé', 2, v, 'incorrect', ['-\\frac{3}{2(2+h)}', '\\frac{3}{4}'],
             ERR_DERIVE_SIGNE),
        spec('b oublié (nombre dérivé)', 2, v, 'incorrect', ['-\\frac{3}{2(2+h)}', '-3'], MSG_B),
        spec('Dénominateur au lieu de son carré', 2, v, 'incorrect',
             ['-\\frac{3}{2(2+h)}', '-\\frac{3}{2}'],
             'Quand $h$ tend vers $0$, le dénominateur tend vers $2^2$, pas vers $2$.')]

# Le nombre dérivé s'écrit aussi en décimal exact (−0,25)
for vv in f1:
    vv['blanks'][1]['acceptDecimal'] = True

ecrire('f1-nombre-derive-inverse-par-le-taux', modele(
    'Nombre dérivé de la fonction inverse par le taux de variation',
    'Taux de variation entre a et a + h, simplifié, puis nombre dérivé, pour 1/x, k/x et '
    'k/(x + b).',
    2, f1, f1s, {'noeud': 'Fonctions > Dérivation > nombre dérivé', 'point': '1SPE-260'}))

# =============================================================================================
# F2 — Équation de la tangente à une fonction rationnelle (1AN10-4, cas 4). Point 1SPE-272.
# Une case, y = mx + p. Erreurs prévues : signe de la dérivée, « − a » oublié dans
# f'(a)(x − a), dénominateur de la dérivée pas mis au carré.
# =============================================================================================

TANGENTE = ('\n\nDonne l\'équation réduite de la tangente $T$ à $\\mathcal{C}_f$ au point '
            'd\'abscisse ${{x0}}$.\n\n$y=?$')
ERR_SIGNE_DERIVEE = 'Attention au signe de $f\'$ : vérifie ta dérivée.'
ERR_MOINS_A = ('Tu as oublié de développer le produit par $x - a$ : le terme en $-a$ compte '
               'aussi.')
ERR_CARRE = 'Le dénominateur de la dérivée est un carré : vérifie ta dérivée.'
HINT_F2 = ('Calcule $f({{x0}})$ et $f\'({{x0}})$, puis utilise $y=f\'(a)(x-a)+f(a)$ avec '
           '$a={{x0}}$, et réduis.')


def tangente_y(m, x0, fa):
    return '{{eval:(' + m + ')*x-(' + m + ')*(' + x0 + ')+(' + fa + ')}}'


def erreurs_tangente(m, m_signe, m_carre, x0, fa):
    return [
        erreur(tangente_y(m_signe, x0, fa), ERR_SIGNE_DERIVEE, 'Signe de la dérivée'),
        erreur('{{eval:(' + m + ')*x+(' + fa + ')}}', ERR_MOINS_A, '−a oublié dans (x − a)'),
        erreur(tangente_y(m_carre, x0, fa), ERR_CARRE, 'Dénominateur pas au carré'),
    ]


def specs_tangente(vi, v, m, ms, mc, x0, fa, desc):
    p = -m * x0 + fa
    return [spec(desc + ' : juste', vi, v, 'correct', [affine(m, p)]),
            spec(desc + ' : signe de la dérivée', vi, v, 'incorrect',
                 [affine(ms, -ms * x0 + fa)], ERR_SIGNE_DERIVEE),
            spec(desc + ' : −a oublié', vi, v, 'incorrect', [affine(m, fa)], ERR_MOINS_A),
            spec(desc + ' : dénominateur pas au carré', vi, v, 'incorrect',
                 [affine(mc, -mc * x0 + fa)], ERR_CARRE)]


f2 = []
f2s = []

# v0 — f(x) = k/x
f2.append(variation(
    'Soit $f$ la fonction définie sur $]-\\infty\\,;0[\\cup]0\\,;+\\infty[$ par '
    '$f(x)=\\dfrac{ {{k}} }{x}$, de courbe $\\mathcal{C}_f$.' + TANGENTE,
    [X, var('k', '1..6'), var('x0', '1|2|3|-1|-2|-3')],
    [case(tangente_y('-k/x0^2', 'x0', 'k/x0'),
          erreurs_tangente('-k/x0^2', 'k/x0^2', '-k/x0', 'x0', 'k/x0'))],
    ['$f(x)={{k}}\\times\\dfrac{1}{x}$, donc $f\'(x)=-\\dfrac{ {{k}} }{x^2}$.',
     '$f({{x0}})={{eval:k/x0}}$ et $f\'({{x0}})={{eval:-k/x0^2}}$.',
     '$T$ : $y=f\'({{x0}})(x{{eval:-x0;+}})+f({{x0}})$, soit '
     '$y={{eval:-k/x0^2}}(x{{eval:-x0;+}}){{eval:k/x0;+}}$.',
     'Donc $T$ : $y=' + PRIMAIRE + '{' + tangente_y('-k/x0^2', 'x0', 'k/x0') + '}$.'],
    HINT_F2))
v = {'k': 4, 'x0': 2}
f2s += specs_tangente(0, v, Fr(-1), Fr(1), Fr(-2), 2, Fr(2), '4/x en 2 (y = −x + 4)')
v = {'k': 3, 'x0': -3}
f2s += [spec('3/x en −3 : y = −x/3 − 2', 0, v, 'correct', ['-\\frac{1}{3}x-2']),
        spec('3/x en −3 : écriture (−x − 6)/3', 0, v, 'unoptimal_form', ['\\frac{-x-6}{3}'])]

# v1 — f(x) = k/(x − c), au point x0 = c + e
f2.append(variation(
    'Soit $f$ la fonction définie pour $x\\neq{{c}}$ par '
    '$f(x)=\\dfrac{ {{k}} }{x{{eval:-c;+}}}$, de courbe $\\mathcal{C}_f$.' + TANGENTE,
    [X, var('k', '1..6'), var('c', '1..4;±'), var('q', '1|2|-1|-2'), var('x0', 'eval:c+q')],
    [case(tangente_y('-k/q^2', 'x0', 'k/q'),
          erreurs_tangente('-k/q^2', 'k/q^2', '-k/q', 'x0', 'k/q'))],
    ['$f(x)={{k}}\\times\\dfrac{1}{v(x)}$ avec $v(x)=x{{eval:-c;+}}$ et $v\'(x)=1$, donc '
     '$f\'(x)=-\\dfrac{ {{k}} }{(x{{eval:-c;+}})^2}$.',
     '$f({{x0}})=\\dfrac{ {{k}} }{ {{x0}}{{eval:-c;+}} }={{eval:k/q}}$ et '
     '$f\'({{x0}})=-\\dfrac{ {{k}} }{ {{q;()}}^2}={{eval:-k/q^2}}$.',
     '$T$ : $y={{eval:-k/q^2}}(x{{eval:-x0;+}}){{eval:k/q;+}}$.',
     'Donc $T$ : $y=' + PRIMAIRE + '{' + tangente_y('-k/q^2', 'x0', 'k/q') + '}$.'],
    HINT_F2,
    ['c+q != 0']))
v = {'k': 2, 'c': 1, 'q': 1, 'x0': 2}
f2s += specs_tangente(1, v, Fr(-2), Fr(2), Fr(-2), 2, Fr(2), '2/(x − 1) en 2 (y = −2x + 6)')[:3]  # q = 1 : q² = q
v = {'k': 2, 'c': 3, 'q': 2, 'x0': 5}
f2s += specs_tangente(1, v, Fr(-1, 2), Fr(1, 2), Fr(-1), 5, Fr(1),
                      '2/(x − 3) en 5 (y = −x/2 + 7/2)')

# v2 — f(x) = (ax + b)/(x + d), au point x0 = e − d (x0 + d = q)
f2.append(variation(
    'Soit $f$ la fonction définie pour $x\\neq{{eval:-d}}$ par '
    '$f(x)=\\dfrac{ {{eval:a*x+b}} }{x{{d;+}}}$, de courbe $\\mathcal{C}_f$.' + TANGENTE,
    [X, var('a', '1..4;±'), var('b', '1..6;±'), var('d', '1..4;±'), var('q', '1|2|-1|-2'),
     var('x0', 'eval:q-d'), var('fa', 'eval:(a*x0+b)/q'), var('n', 'eval:a*d-b')],
    [case(tangente_y('n/q^2', 'x0', 'fa'),
          erreurs_tangente('n/q^2', '-n/q^2', 'n/q', 'x0', 'fa'))],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{eval:a*x+b}}$, $v(x)=x{{d;+}}$, $u\'(x)={{a}}$ et $v\'(x)=1$ : '
     '$$f\'(x)=\\dfrac{ {{if:a==-1|-|{{if:a==1||{{a}}}}}}(x{{d;+}})-({{eval:a*x+b}})}{(x{{d;+}})^2}='
     '\\dfrac{ {{n}} }{(x{{d;+}})^2}$$',
     '$f({{x0}})={{fa}}$ et $f\'({{x0}})=\\dfrac{ {{n}} }{ {{q;()}}^2}={{eval:n/q^2}}$.',
     '$T$ : $y={{eval:n/q^2}}(x{{eval:-x0;+}}){{eval:fa;+}}$.',
     'Donc $T$ : $y=' + PRIMAIRE + '{' + tangente_y('n/q^2', 'x0', 'fa') + '}$.'],
    HINT_F2,
    ['a*d-b != 0', 'q-d != 0']))
# 2x + 1 sur x + 1 en x0 = 0 (q = 1) : n = 2 − 1 = 1, f(0) = 1, f'(0) = 1 → y = x + 1
v = {'a': 2, 'b': 1, 'd': 1, 'q': 1, 'x0': 0, 'fa': 1, 'n': 1}
f2s += specs_tangente(2, v, Fr(1), Fr(-1), Fr(1), 0, Fr(1), '(2x + 1)/(x + 1) en 0')[:2]
# (x + 3)/(x − 1) en x0 = 3 (d = −1, q = 2) : n = −1 − 3 = −4, f(3) = 3, f'(3) = −1
v = {'a': 1, 'b': 3, 'd': -1, 'q': 2, 'x0': 3, 'fa': 3, 'n': -4}
f2s += specs_tangente(2, v, Fr(-1), Fr(1), Fr(-2), 3, Fr(3), '(x + 3)/(x − 1) en 3 (y = −x + 6)')

ecrire('f2-tangente-fonction-rationnelle', modele(
    'Équation de la tangente à une fonction rationnelle',
    'Équation réduite de la tangente à la courbe de k/x, k/(x − c) ou (ax + b)/(x + d) en un '
    'point.',
    3, f2, f2s, {'noeud': 'Fonctions > Dérivation > tangente', 'point': '1SPE-272'}))

print('F1 :', len(f1), 'variations,', len(f1s), 'specs')
print('F2 :', len(f2), 'variations,', len(f2s), 'specs')

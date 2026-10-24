"""Génère la migration de la PR 3 des SCISSIONS de la passe lycée (H) : 10 modèles rangés en 1re spé,
HORS_PROGRAMME à ce niveau, traités dans leur vrai programme (`lot-modifier.md` § 4).

Décisions de David :
- 2026-10-23 (« je valide tout ») : H (a), les traiter dans leur vrai programme (modifier, scinder),
  d'après leurs verdicts de `1spe-a.csv` et `1spe-b.csv` (T_SPE ou 2de) ;
- 2026-10-23, PR 3 : leur niveau scolaire (`grades`) passe au vrai programme ([T_SPE] ou [2]), et
  leurs neufs naissent au même niveau.

MODIFIER (sans neuf) : `463f483e` et `fccd570b` se résolvent sur [−π ; π] (décision lts-2,
TSPE-458) ; `99c772c0` garde V1-V2 (ensemble vide ; TSPE-457). Scissions : `7eec7032` (parité /
période), `68db64b0` (image / extremum, « sur [−π ; 2π] »), `0a1ff14f` (réunion / produit
cartésien), `6c3ee9e6` (« et » / « ou »), `5426cead` (vérité / réciproque / contraposée) ;
dédoublements : `9724dc3d` (une case par modèle : réunion, intersection, complémentaire ; la V3 de
l'intersection demande A ∩ B au lieu de Ā ∩ B, qui mobilise aussi le complémentaire) et `219c9470`
(la V3 au connecteur tiré au hasard va dans les deux modèles, connecteur fixé).

Contenu relevé dans `../releves/templates.json`, empreintes md5 identiques à la prod le 2026-10-23
(MCP, lecture seule) ; nœuds et tags : `etat-prod-2026-10-23b/` (0 tag sur les 10, comme en prod) ;
niveaux pris dans les catégories : relevés en prod le même jour.

    python3 docs/wip/passe-lycee/analyse/lot-h.py [dossier où écrire les modèles]
"""

import json
import re
import sys
from fractions import Fraction

sys.path.insert(0, 'docs/wip/passe-lycee/analyse')
sys.path.insert(0, 'docs/wip/arbre-notions/analyse')
from lot_2bis_outils import garder_variations  # noqa: E402
from scissions_outils import generer  # noqa: E402

ANALYSE = 'docs/wip/passe-lycee/analyse/'
ETAT = ANALYSE + 'etat-prod-2026-10-23b/'


# ============================================================================
# OUTILS
# ============================================================================

def remplacer(texte: str, avant: str, apres: str, fois: int = 1) -> str:
    assert texte.count(avant) == fois, (avant, texte.count(avant), texte)
    return texte.replace(avant, apres)


def renumeroter(t: dict) -> None:
    """Descriptions de specs « variation N : » (sans le préfixe vN de `garder_variations`)."""
    for s in t['test_specs']:
        s['description'] = re.sub(r'^variation \d+\b', f"variation {s['variationIndex']}", s['description'])


def spec(reponses: list[str], statut: str, variables: dict, description: str, variation: int) -> dict:
    return {'answers': reponses, 'expected': {'status': statut}, 'variables': variables,
            'description': description, 'variationIndex': variation}


def tex_pi(x: Fraction) -> str:
    """kπ/n en LaTeX de réponse (sans espaces, comme les specs d'avant)."""
    signe, x = ('-', -x) if x < 0 else ('', x)
    if x == 0:
        return '0'
    if x.denominator == 1:
        return signe + ('\\pi' if x.numerator == 1 else f'{x.numerator}\\pi')
    k = '' if x.numerator == 1 else str(x.numerator)
    return f'{signe}\\frac{{{k}\\pi}}{{{x.denominator}}}'


# ============================================================================
# 463f483e : cos x ≥ a ou cos x < a, sur [−π ; π] (TSPE-458)
# ============================================================================

OUVERT = r'\left]-\pi\,;\pi\right]'
FERME = r'\left[-\pi\,;\pi\right]'


def cos_sur_moins_pi_pi(t: dict) -> None:
    for i, v in enumerate(t['variations']):
        v['statement'] = remplacer(v['statement'], OUVERT, FERME)
        if i >= 2:
            v['blanks'][0]['expectedAnswer'] = remplacer(v['blanks'][0]['expectedAnswer'], ']-\\pi;', '[-\\pi;')
            etapes = v['correction']['steps']
            etapes[0] = remplacer(etapes[0], f'dans ${OUVERT}$, il donne deux intervalles.',
                                  f'dans ${FERME}$, il donne deux intervalles ($-\\pi$ et $\\pi$, qui repèrent '
                                  'le même point, sont solutions).')
            etapes[2] = remplacer(etapes[2], r'\left]-\pi\,;-{{a}}\right[', r'\left[-\pi\,;-{{a}}\right[')
    specs = []
    for s in t['test_specs']:
        (r,) = s['answers']
        if s['description'] == '-π inclus':
            # [−π ; π] : −π est solution ; c'est l'ancienne réponse juste qui devient fausse.
            s = {**s, 'answers': [r.replace('[-\\pi;', ']-\\pi;')], 'expected': {'status': 'incorrect'},
                 'description': '−π exclu à tort'}
        else:
            s = {**s, 'answers': [r.replace(']-\\pi;', '[-\\pi;')]}
        specs.append(s)
    t['test_specs'] = specs
    t['description'] = ('Inéquation en cosinus, a valeur remarquable, résolue dans [−π ; π] ; réponse : intervalle '
                        'ou réunion')


# ============================================================================
# fccd570b : sin x > a, sur [−π ; π] (TSPE-458)
# ============================================================================

ZERO_DEUX_PI = r'\left[0\,;2\pi\right['
A_REMARQUABLES = (Fraction(1, 6), Fraction(1, 4), Fraction(1, 3))


def sin_sur_moins_pi_pi(t: dict) -> None:
    v1, v2, v3 = t['variations']
    for v in t['variations']:
        v['statement'] = remplacer(v['statement'], ZERO_DEUX_PI, FERME)
    # V2 : sin x > −sin a. Sur le cercle, l'arc va de −a à π + a en passant par π/2 et π ; dans
    # [−π ; π] : [−π ; −π + a[ ∪ ]−a ; π].
    v2['variables'] = [
        {'name': 'a', 'expression': '\\frac{\\pi}{6}|\\frac{\\pi}{4}|\\frac{\\pi}{3}'},
        {'name': 'n', 'expression': 'eval:12*a/\\pi'},
        {'name': 'u', 'expression': 'eval:(12-n)/gcd(12-n,12)'},
        {'name': 'w', 'expression': 'eval:12/gcd(12-n,12)'},
    ]
    v2['blanks'] = [{'expectedAnswer': '[-\\pi;-\\frac{ {{u}}\\pi}{ {{w}} }[\\cup]-{{a}};\\pi]'}]
    v2['correction'] = {'steps': [
        r"$\sin\left(-{{a}}\right)=\sin\left(-\frac{ {{u}}\pi}{ {{w}} }\right)={{eval:-sin(n*\pi/12)}}$. Sur le "
        r"cercle, les points d'ordonnée strictement supérieure à ${{eval:-sin(n*\pi/12)}}$ forment l'arc qui va de "
        r"$-{{a}}$ à $-\frac{ {{u}}\pi}{ {{w}} }$ en passant par $\dfrac{\pi}{2}$ et par $\pi$ : dans "
        r"$\left[-\pi\,;\pi\right]$, il donne deux intervalles ($-\pi$ et $\pi$, qui repèrent le même point, sont "
        r"solutions).",
        "```trig\npreset: custom\nangles: -{{n}}*pi/12, -{{eval:12-n}}*pi/12\nequation: sin(x) > sin(-{{n}}*pi/12)\n"
        "mode: arc\nmesures: principales\n```",
        r"$S=\textcolor{{{color:primary.0}}}{\left[-\pi\,;-\frac{ {{u}}\pi}{ {{w}} }\right[\cup\left]-{{a}}\,;\pi\right] }$.",
    ]}
    specs = []
    for s in t['test_specs']:
        i, d = s['variationIndex'], s['description']
        if i == 1:
            continue
        if d == 'arc complémentaire':
            if i == 0:
                a = Fraction(re.search(r'frac\{\\pi\}\{(\d)\}', s['variables']['a']).group(1)) ** -1
                s = {**s, 'answers': [f'[-\\pi;{tex_pi(a)}]\\cup[{tex_pi(1 - a)};\\pi]']}
            else:
                s = {**s, 'answers': [']-\\pi;0[']}
        specs.append(s)
    for a in A_REMARQUABLES:
        variables = {'a': tex_pi(a)}
        juste = f'[-\\pi;{tex_pi(a - 1)}[\\cup]{tex_pi(-a)};\\pi]'
        valeur = {Fraction(1, 6): '-1/2', Fraction(1, 4): '-sqrt(2)/2', Fraction(1, 3): '-sqrt(3)/2'}[a]
        specs += [
            spec([juste], 'correct', variables, f'sin x > {valeur} : juste', 1),
            spec([f']{tex_pi(-a)};\\pi]\\cup[-\\pi;{tex_pi(a - 1)}['], 'correct', variables,
                 "réunion dans l'autre ordre : juste", 1),
            spec([f']{tex_pi(-a)};{tex_pi(1 + a)}['], 'incorrect', variables, 'arc écrit hors intervalle', 1),
            spec([f']{tex_pi(-a)};\\pi]'], 'incorrect', variables, 'un seul des deux intervalles', 1),
            spec([']' + juste[1:]], 'incorrect', variables, '−π exclu à tort', 1),
            spec([f'[0;{tex_pi(1 + a)}[\\cup]{tex_pi(2 - a)};2\\pi['], 'incorrect', variables,
                 'réponse sur [0 ; 2π[', 1),
        ]
    t['test_specs'] = sorted(specs, key=lambda s: s['variationIndex'])
    t['description'] = 'Inéquation sin x > a, a valeur remarquable, résolue dans [−π ; π] ; réponse : intervalle ou réunion'


# ============================================================================
# 99c772c0 : V1-V2 gardées (TSPE-457)
# ============================================================================

def sans_solution(t: dict) -> None:
    garder_variations(t, [0, 1])


# ============================================================================
# 68db64b0 : extremum sur [−π ; 2π] (2-350)
# ============================================================================

def extremum_sur_intervalle(t: dict) -> None:
    for v, mot in zip(t['variations'], ('maximum', 'minimum')):
        v['statement'] = remplacer(v['statement'], f'le {mot} de $f$ sur $\\mathbb{{R}}$.',
                                   f"le {mot} de $f$ sur l'intervalle $\\left[-\\pi\\,;2\\pi\\right]$.")
        etapes = v['correction']['steps']
        haut = 'hauts' if mot == 'maximum' else 'bas'
        etapes[0] = remplacer(
            etapes[0],
            f"Le {mot} est l'ordonnée des points les plus {haut} de la courbe, par exemple le point $M$. La fonction "
            f"est périodique : la courbe atteint ce {mot} une fois par période.",
            f"Sur $\\left[-\\pi\\,;2\\pi\\right]$, le {mot} est l'ordonnée des points les plus {haut} de la courbe, par "
            "exemple le point $M$.")
        etapes[2] = remplacer(etapes[2], f'Le {mot} de $f$ est', f'Le {mot} de $f$ sur $\\left[-\\pi\\,;2\\pi\\right]$ est')
    renumeroter(t)


# ============================================================================
# 9724dc3d : une case par modèle (réunion, intersection, complémentaire)
# ============================================================================

QUESTIONS_V12 = '$A\\cap B=?$\n\n$A\\cup B=?$\n\n$\\overline{A}=?$ (complémentaire de $A$ dans $E$)'
QUESTIONS_V3 = '$A\\cup B=?$\n\n$\\overline{B}=?$\n\n$\\overline{A}\\cap B=?$'
CONSIGNE = "Écris chaque ensemble entre accolades"
CONSIGNE_UNE = "Écris cet ensemble entre accolades"
DIVISEURS_AB = (r"${{eval:p*q}}={{p}}\times{{q}}$, donc $A=\{ 1;{{p}};{{q}};{{eval:p*q}} \}$ ; "
                r"${{eval:p*r}}={{p}}\times{{r}}$, donc $B=\{ 1;{{p}};{{r}};{{eval:p*r}} \}$.")

# Case → (blanc gardé de V1, V2 et V3 ; question de V1-V2 ; question de V3).
CASES = {
    'reunion': ((1, 1, 0), '$A\\cup B=?$', '$A\\cup B=?$'),
    'intersection': ((0, 0, None), '$A\\cap B=?$', '$A\\cap B=?$'),
    'complementaire': ((2, 2, 1), '$\\overline{A}=?$ (complémentaire de $A$ dans $E$)',
                       '$\\overline{B}=?$ (complémentaire de $B$ dans $E$)'),
}
V1_VARS = {'k1': '2', 'k2': '3', 'k3': '1', 'k4': '3', 'k5': '1', 'k6': '2', 'k7': '2', 'k8': '3', 'w1': '3'}
V3_VARS = {'k1': '3', 'k2': '3', 'k3': '4', 'k4': '2', 'k5': '3', 'k6': '3', 'k7': '3', 'w1': '2'}


def ensembles_case(t: dict, case: str) -> None:
    blancs, question, question_v3 = CASES[case]
    v1, v2, v3 = t['variations']
    for v, b, q, avant in ((v1, blancs[0], question, QUESTIONS_V12), (v2, blancs[1], question, QUESTIONS_V12),
                           (v3, blancs[2], question_v3, QUESTIONS_V3)):
        v['statement'] = remplacer(v['statement'], avant, q)
        v['statement'] = remplacer(v['statement'], CONSIGNE, CONSIGNE_UNE)
        if b is not None:
            v['blanks'] = [v['blanks'][b]]
    # La V3 dit « Les complémentaires sont pris dans E » : seul le modèle du complémentaire en parle,
    # et sa question le redit.
    v3['statement'] = remplacer(v3['statement'], 'Les complémentaires sont pris dans $E$. Écris',
                                'Écris')
    c1, c2, c3 = (v['correction']['steps'] for v in (v1, v2, v3))
    if case == 'reunion':
        v1['correction']['steps'] = [c1[1]]
        v2['correction']['steps'] = [DIVISEURS_AB, c2[2]]
        v3['correction']['steps'] = [c3[0]]
    elif case == 'intersection':
        v1['correction']['steps'] = [c1[0]]
        v2['correction']['steps'] = [DIVISEURS_AB, c2[1]]
        # Ā ∩ B mobilise aussi le complémentaire : la V3 demande A ∩ B.
        v3['blanks'] = [{'expectedAnswer': '\\{ {{w4}};{{w7}} \\}'}]
        v3['correction']['steps'] = [
            r"$A\cap B$ contient les éléments qui sont **à la fois** dans $A$ et dans $B$ : "
            r"$A\cap B=\textcolor{{{color:primary.0}}}{\{ {{w4}};{{w7}} \}}$."]
    else:
        v1['correction']['steps'] = [c1[2]]
        v2['correction']['steps'] = [c2[0], c2[3]]
        v3['correction']['steps'] = [c3[1]]
    p23 = {'f': '1', 'p': '2', 's': '3', 't': '5'}
    p27 = {'f': '0', 'p': '2', 's': '5', 't': '7'}
    juste = {
        'reunion': ('\\{3;5;8;9;13;15;17\\}', '\\{1;2;3;5;6;10\\}', '\\{1;2;5;7;10;14\\}', '\\{2;5;12;14;17;20\\}'),
        'intersection': ('\\{8;17\\}', '\\{1;2\\}', '\\{1;2\\}', '\\{12;20\\}'),
        'complementaire': ('\\{5;12;13;20\\}', '\\{5;10;15;30\\}', '\\{5;10;35;70\\}', '\\{5;8;14;23\\}'),
    }[case]
    desordre = {'reunion': ('\\{17;3;5;8;8;9;13;15\\}', 'v0 : ordre quelconque et doublon'),
                'intersection': ('\\{17;8\\}', 'v0 : ordre quelconque'),
                'complementaire': ('\\{20;13;12;5\\}', 'v0 : ordre quelconque')}[case]
    specs = [
        spec([juste[0]], 'correct', V1_VARS, 'v0 : juste', 0),
        spec([desordre[0]], 'correct', V1_VARS, desordre[1], 0),
        spec([juste[0].replace(';', ',')], 'incorrect', V1_VARS, 'v0 : virgules au lieu de points-virgules', 0),
        spec([juste[1]], 'correct', p23, 'v1 : diviseurs de 6, 10, 30 : juste', 1),
        spec([juste[2]], 'correct', p27, 'v1 : diviseurs de 14, 10, 70 (rôles échangés) : juste', 1),
        spec([juste[3]], 'correct', V3_VARS, 'v2 : juste', 2),
    ]
    if case == 'reunion':
        specs += [
            spec(['\\{8;17\\}'], 'incorrect', V1_VARS, "v0 : intersection au lieu de la réunion", 0),
            spec(['\\{3;5;8;9;13;15\\}'], 'incorrect', V1_VARS, 'v0 : un élément oublié', 0),
            spec(['\\{1;2;3;5;6\\}'], 'incorrect', p23, 'v1 : un élément oublié (10)', 1),
            spec(['\\{12;20\\}'], 'incorrect', V3_VARS, "v2 : intersection au lieu de la réunion", 2),
        ]
    elif case == 'intersection':
        specs += [
            spec(['\\{3;5;8;9;13;15;17\\}'], 'incorrect', V1_VARS, "v0 : réunion au lieu de l'intersection", 0),
            spec(['\\{2\\}'], 'incorrect', p23, 'v1 : 1 oublié', 1),
            spec(['\\{2;17\\}'], 'incorrect', V3_VARS, 'v2 : Ā ∩ B au lieu de A ∩ B', 2),
        ]
    else:
        specs += [
            spec(['\\{5;13\\}'], 'incorrect', V1_VARS, 'v0 : complémentaire pris dans A ∪ B (oubli de 12 et 20)', 0),
            spec(['\\{3;6;15;30\\}'], 'incorrect', p23, 'v1 : complémentaire de B au lieu de A', 1),
            spec(['\\{2;8;17;23\\}'], 'incorrect', V3_VARS, 'v2 : complémentaire de A au lieu de B', 2),
        ]
    t['test_specs'] = sorted(specs, key=lambda s: s['variationIndex'])


def reunion(t: dict) -> None:
    ensembles_case(t, 'reunion')


def intersection(t: dict) -> None:
    ensembles_case(t, 'intersection')


def complementaire(t: dict) -> None:
    ensembles_case(t, 'complementaire')


# ============================================================================
# 219c9470 : la V3 garde un seul connecteur
# ============================================================================

def connecteur(t: dict, k: int) -> None:
    """La V3 (2e variation du modèle) tirait k : 0 « et », 1 « ou ». Elle garde `k`."""
    v = t['variations'][1]
    noms = [x['name'] for x in v['variables']]
    assert noms == ['m', 'a', 'n', 'k', 'T1', 'T2', 'T'], noms
    v['variables'] = [x for x in v['variables'] if x['name'] != 'k']
    v['variables'][-1] = {'name': 'T', 'expression': '{{eval:T1*T2}}' if k == 0 else '{{eval:T1+T2-T1*T2}}'}
    v['statement'] = remplacer(v['statement'], '{{if:k=1|ou|et}}', ('et', 'ou')[k])
    etapes = v['correction']['steps']
    etapes[2] = remplacer(
        etapes[2],
        '{{if:k=1|Une proposition « $A$ ou $B$ » est vraie dès que l\'une au moins des deux est vraie.|Une proposition '
        '« $A$ et $B$ » est vraie seulement quand les deux sont vraies.}}',
        ('Une proposition « $A$ et $B$ » est vraie seulement quand les deux sont vraies.',
         "Une proposition « $A$ ou $B$ » est vraie dès que l'une au moins des deux est vraie.")[k])
    specs = []
    for s in t['test_specs']:
        if s['variationIndex'] == 1:
            if s['variables']['k'] != str(k):
                continue
            s = {**s, 'variables': {x: y for x, y in s['variables'].items() if x != 'k'}}
        specs.append(s)
    t['test_specs'] = specs


def connecteur_et(t: dict) -> None:
    connecteur(t, 0)


def connecteur_ou(t: dict) -> None:
    connecteur(t, 1)


# ============================================================================
# LE LOT
# ============================================================================

def V(*numeros: int) -> list[int]:
    """Variations V1, V2… (numérotation des notes) → indices base 0."""
    return [i - 1 for i in numeros]


TRIGO = ['T_SPE']
SECONDE = ['2']

# Même forme que lot-scissions.py : l'origine (variations, points, titre, sous-titre, retouche), puis
# ses neufs (UUID fixé, variations, points, titre, sous-titre, retouche).
LOT = {
    # ---- MODIFIER, Tle spé (aucun neuf) --------------------------------------------------------
    '463f483e': [
        (V(1, 2, 3, 4), ['TSPE-458'], 'Résoudre cos x ≥ a ou cos x < a sur un tour', '', cos_sur_moins_pi_pi),
    ],
    'fccd570b': [
        (V(1, 2, 3), ['TSPE-458'], 'Résoudre sin x > a sur un tour', '', sin_sur_moins_pi_pi),
    ],
    '99c772c0': [
        (V(1, 2, 3, 4, 5), ['TSPE-457'], 'Équations trigonométriques sans solution',
         'cos x = k avec |k| > 1, sin x = ±3/2 ou ±5/2 : ensemble vide', sans_solution),
    ],
    # ---- Scissions, Tle spé --------------------------------------------------------------------
    '7eec7032': [
        (V(1, 2, 3, 4, 5, 6, 7, 8), ['TSPE-597'], 'Parité des fonctions cosinus et sinus',
         "Reconnaître une fonction paire, impaire ou ni l'une ni l'autre (cos, sin, sin(kx), x sin x…)", renumeroter),
        ('8afc09bc-8271-4e40-96a5-78351c893ae9', V(9), ['TSPE-598'], 'Période de la fonction sinus',
         'La plus petite période strictement positive de sin : 2π', renumeroter),
    ],
    # ---- Scissions, 2de ------------------------------------------------------------------------
    '68db64b0': [
        (V(1, 2), ['2-491'], 'Lire une image sur une courbe', 'f(π/2) ou f(π), lus sur une courbe tracée de −π à 2π',
         renumeroter),
        ('f96d3e43-ada2-48e5-a6a8-dc2482a4b650', V(3, 4), ['2-350'], 'Lire un maximum ou un minimum sur une courbe',
         "Extremum d'une fonction sur [−π ; 2π], lu sur sa courbe", extremum_sur_intervalle),
    ],
    '9724dc3d': [
        (V(1, 2, 3), ['2-404'], 'Réunion de deux ensembles finis',
         'Écrire A ∪ B pour des ensembles finis donnés en extension ou par leurs diviseurs', reunion),
        ('0598a535-b015-4367-a775-fccf2e9b3151', V(1, 2, 3), ['2-405'], 'Intersection de deux ensembles finis',
         'Écrire A ∩ B pour des ensembles finis donnés en extension ou par leurs diviseurs', intersection),
        ('5676627b-3989-438c-9c54-5002c0cd7e21', V(1, 2, 3), ['2-406'], "Complémentaire d'un ensemble fini",
         'Écrire le complémentaire dans E d\'une partie donnée en extension ou par ses diviseurs', complementaire),
    ],
    '0a1ff14f': [
        (V(1, 2, 3), ['2-207'], "Cardinal d'une réunion",
         'Card(A ∪ B) = Card A + Card B − Card(A ∩ B), en contexte (activités, langues) ou avec Card(·)'),
        ('a26e6e50-aa5b-42d0-ac68-1e24a646345c', V(4), ['2-205'], "Cardinal d'un produit cartésien",
         'Card(A × B) = Card A × Card B'),
    ],
    '219c9470': [
        (V(1, 3), ['2-210'], '« Et » : vrai ou faux ?',
         'Décider si une proposition « A et B » est vraie pour une valeur donnée de la variable', connecteur_et),
        ('1e9a534f-b04c-4a1d-88fb-5aba696422e0', V(2, 3), ['2-408'], '« Ou » : vrai ou faux ?',
         'Décider si une proposition « A ou B » est vraie pour une valeur donnée de la variable', connecteur_ou),
    ],
    '6c3ee9e6': [
        (V(1, 3), ['2-210'], '« Et » et intervalles',
         'Traduire une proposition composée avec « et » par un intervalle'),
        ('55341e85-6782-4ccd-84a4-8b2d3ef10a80', V(2, 4), ['2-408'], '« Ou » et intervalles',
         'Traduire une proposition composée avec « ou » par un intervalle ou une réunion d\'intervalles'),
    ],
    '5426cead': [
        (V(2, 3), ['2-214'], "Réciproque d'une implication",
         "Énoncer la réciproque d'une implication, et décider si elle est vraie"),
        ('e05203b0-9833-4647-b6dc-39b10f2ae5be', V(1), ['2-410'], 'Une implication est-elle vraie ?',
         'Décider si « si x > a, alors x > b » est vraie, ou trouver un contre-exemple'),
        ('bed58c24-6ead-4e6a-bd3e-3aaf2891ea00', V(4), ['2-411'], "Contraposée d'une implication",
         "Énoncer la contraposée d'une implication"),
    ],
}

GRADES_APRES = {court: (TRIGO if court in ('463f483e', 'fccd570b', '99c772c0', '7eec7032') else SECONDE)
                for court in LOT}

NIVEAUX_PRIS = {
    ('Fonctions', 'Fonctions trigonométriques', 'Fonctions cosinus et sinus'): 3,
    ('Logique', 'Ensembles', 'Opérations sur les ensembles'): 2,
    ('Logique', 'Ensembles', 'Cardinal et produit cartésien'): 2,
    ('Logique', 'Logique et raisonnement', 'Connecteurs et contre-exemples'): 2,
    ('Logique', 'Logique et raisonnement', 'Implication et équivalence'): 3,
}

ENTETE = """-- ============================================================================
-- Passe lycée, scissions PR 3 (H) : {n} modèles de 1re spé traités dans leur vrai programme, {k} modèles neufs
-- ============================================================================
-- Ces modèles, rangés en 1re spé, y sont HORS PROGRAMME ; leur tâche relève de la Tle spé ou de la
-- 2de. Leur niveau scolaire passe à ce vrai programme ([T_SPE] ou [2]) et leurs neufs naissent au
-- même niveau. MODIFIER (sans neuf) : 463f483e et fccd570b se résolvent sur [−π ; π] (TSPE-458) ;
-- 99c772c0 garde ses deux équations sans solution (TSPE-457). Scissions : 7eec7032 parité
-- (TSPE-597) / période (TSPE-598) ; 68db64b0 image (2-491) / extremum sur [−π ; 2π] (2-350) ;
-- 9724dc3d une case par modèle : réunion (2-404), intersection (2-405, sa V3 demande A ∩ B),
-- complémentaire (2-406) ; 0a1ff14f cardinal d'une réunion (2-207) / d'un produit cartésien
-- (2-205) ; 219c9470 « et » (2-210) / « ou » (2-408), la V3 au connecteur tiré allant dans les deux ;
-- 6c3ee9e6 « et » (2-210) / « ou » (2-408) ; 5426cead réciproque (2-214) / vérité d'une implication
-- (2-410) / contraposée (2-411). Les origines dont les points vivent ailleurs passent sur leur nœud
-- (R2) ; les neufs se rangent sur le nœud de leur premier point.
-- ============================================================================
-- Source de vérité : docs/wip/passe-lycee/analyse/lot-modifier.md § 4 (H) et les verdicts de
-- 1spe-a.csv / 1spe-b.csv, VALIDÉS par David le 2026-10-23, et sa décision du même jour sur le
-- niveau scolaire. Fichier GÉNÉRÉ par docs/wip/passe-lycee/analyse/lot-h.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-h.test.ts, qui fabrique des copies des identifiants de la prod
-- (contenu, nœud, niveaux et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-23 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud, aux niveaux et au statut relevés, et ne porter
-- AUCUN tag (relevé), à tout niveau.
--
-- Données d'élèves : aucune (relevé du 2026-10-23 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal sur les 10 modèles, tous brouillons). Les
-- neufs copient le statut de leur origine : brouillons.
--
-- Accès (question tranchée par David le 2026-10-23) : personne ne gagne d'accès. Aucune règle ne
-- change ; tous les modèles, origines et neufs, sont des brouillons ; les tags sont lisibles par tout
-- utilisateur connecté (policy question_template_points_read_authenticated), comme ceux de #1632.
--"""


if __name__ == '__main__':
    releve = []
    noeuds = {t['id']: t['node'] for t in json.load(open(ETAT + 'templates.json'))}
    for t in json.load(open('docs/wip/passe-lycee/releves/templates.json')):
        if t['id'][:8] in LOT:
            releve.append({**t, 'classification_node_id': noeuds[t['id']]})
    assert len(releve) == len(LOT) == 10, len(releve)
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris=NIVEAUX_PRIS,
            dedoubles={'9724dc3d', '219c9470'}, grades_apres=GRADES_APRES,
            migration='supabase/migrations/20261024010000_passe_lycee_h.sql',
            fixture='tests/integration/fixtures/passe-lycee-h.json', prefixe='plh', entete=ENTETE)

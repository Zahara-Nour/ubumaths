"""Génère la migration de la PR 2 des SCISSIONS de la passe lycée : les 7 modèles qui ne se partagent
pas en répartissant leurs variations (`scissions-notes.md`, A_TRANCHER 1-6 et 11).

Décisions de David :
- 2026-10-23 (« je valide tout ») : E3 (a) dédoubler et réécrire, S6 (a) scission par case, S11 (b)
  scinder en 3 et enrichir V2 ;
- 2026-10-23, PR 2 : pour les deux modèles d'E3 qui portent un tag de 1re techno (`c90fa022`
  1TECHNO-042, `d2067413` 1TECHNO-045), dont le point décrit la question à trois choix telle
  qu'elle est, l'origine reste INTACTE (contenu, nœud, tag) et DEUX modèles neufs portent la
  1re spé (« arithmétique ? » et « géométrique ? »). Le tag 1SPE-214 que le plan disait retirer de
  `d2067413` n'existe pas en prod.

E3 : chaque question devient binaire (« Oui… » / « Non… ») et garde TOUTES ses variations ; le corrigé
ne parle plus que de la nature demandée. S6 : `0dee4515` garde la case « somme » (1SPE-245), son neuf
la case « produit » (1SPE-383). S11 : `30b597c3` garde V1, V4 (binomiale ou aucune loi), neufs V2
(géométrique, dé à n faces tiré) et V3 (Bernoulli).

Contenu relevé dans `../releves/templates.json`, empreintes md5 identiques à la prod le 2026-10-23
(MCP, lecture seule) ; nœuds et tags : `etat-prod-2026-10-23b/` (inchangés depuis) ; niveaux pris dans
les catégories : relevés en prod le même jour.

    python3 docs/wip/passe-lycee/analyse/lot-reecritures.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/wip/passe-lycee/analyse')
from scissions_outils import generer  # noqa: E402

ANALYSE = 'docs/wip/passe-lycee/analyse/'
ETAT = ANALYSE + 'etat-prod-2026-10-23b/'
TOUTES = None  # toutes les variations (dédoublement)


# ============================================================================
# OUTILS
# ============================================================================

def binaire(t: dict, *, oui: str, non: str, question: str, corriges: list) -> None:
    """Question à deux choix : `corriges[i]` = (réponse oui ?, étapes du corrigé[, conditions ajoutées]).
    Les étapes sont des chaînes, ou des entiers : l'étape d'avant de même rang (base 0), reprise telle
    quelle. Les specs : pour chaque variation, le bon choix accepté et l'autre refusé, avec les
    variables de la première spec d'avant de la variation."""
    variations = t['variations']
    assert len(corriges) == len(variations), (t['title'], len(corriges), len(variations))
    assert len(t['shared']['choices']) == 3, t['shared']
    t['shared']['choices'] = [{'content': oui}, {'content': non}]
    specs = []
    for i, (v, c) in enumerate(zip(variations, corriges)):
        est_oui, etapes, *conditions = c
        avant = v['correction']['steps']
        tete, _ = v['statement'].rsplit('\n\n', 1)
        v['statement'] = tete + '\n\n' + question
        v['correction'] = {'steps': [avant[e] if isinstance(e, int) else e for e in etapes]}
        v['correctChoiceIndex'] = ['0' if est_oui else '1']
        if conditions:
            v['conditions'] = v.get('conditions', []) + conditions[0]
        variables = next(s['variables'] for s in t['test_specs'] if s['variationIndex'] == i)
        bon, mauvais = (0, 1) if est_oui else (1, 0)
        reponse = ('oui', 'non')
        specs += [
            {'expected': {'status': 'correct'}, 'variables': variables,
             'description': f'v{i} : « {reponse[bon]} » accepté', 'variationIndex': i, 'selectedChoices': [bon]},
            {'expected': {'status': 'incorrect'}, 'variables': variables,
             'description': f'v{i} : « {reponse[mauvais]} » refusé', 'variationIndex': i,
             'selectedChoices': [mauvais]},
        ]
    t['test_specs'] = specs


def oui_non(nature: str, semble: bool) -> dict:
    if semble:
        return {'oui': f'Oui, elle semble {nature}.', 'non': f'Non, elle ne semble pas {nature}.'}
    return {'oui': f'Oui, elle est {nature}.', 'non': f"Non, elle n'est pas {nature}."}


SI_GEOMETRIQUE = (r"Si la suite était géométrique de raison $q$, on aurait $u_1=q\,u_0$ et $u_2=q\,u_1$, donc "
                  r"$u_1^2=u_0\times u_2$.")


# ============================================================================
# E3 — 61e2ac1f : premiers termes
# ============================================================================

QUOTIENTS_T = r"$\dfrac{u_1}{u_0}={{eval:(t1)/(t0)}}$ mais $\dfrac{u_2}{u_1}={{eval:(t2)/(t1)}}$"
DIFFERENCES_T = r"$u_1-u_0={{eval:t1-(t0)}}$ mais $u_2-u_1={{eval:t2-(t1)}}$"


def e3_termes_arith(t: dict) -> None:
    pas = "La différence n'est pas toujours la même : la suite ne semble **pas arithmétique**."
    binaire(t, **oui_non('arithmétique', True),
            question="D'après ces termes, la suite semble-t-elle arithmétique ?",
            corriges=[
                (True, [0, 1]),
                (False, ["On calcule la différence entre deux termes consécutifs : " + DIFFERENCES_T + ".", pas]),
                (False, ["On calcule la différence entre deux termes consécutifs : " + DIFFERENCES_T + ".", pas]),
                (False, [r"Les différences ne sont pas constantes : $u_1-u_0=1$, $u_2-u_1=3$, $u_3-u_2=5$…",
                         "La suite ne semble **pas arithmétique**."]),
                (False, [r"Les premières différences valent ${{r}}$, mais $u_3-u_2={{eval:t3-(t2)}}$ : la "
                         "différence n'est pas toujours la même.",
                         "La suite ne semble **pas arithmétique** : il faut regarder **toutes** les différences, "
                         "pas seulement les premières."]),
            ])
    t['title'] = 'Reconnaître une suite arithmétique à partir de ses premiers termes'
    t['description'] = ("Différences constantes ou non (suites géométriques, ni arithmétiques ni géométriques, "
                        "différence rompue au 4e terme)")


def e3_termes_geom(t: dict) -> None:
    pas = "Le quotient n'est pas toujours le même : la suite ne semble **pas géométrique**."
    binaire(t, **oui_non('géométrique', True),
            question="D'après ces termes, la suite semble-t-elle géométrique ?",
            corriges=[
                # u₀ = a et u₁ = a + r non nuls : les quotients existent.
                (False, ["On calcule le quotient de deux termes consécutifs : " + QUOTIENTS_T + ".", pas],
                 ['a != 0', 'a+r != 0']),
                (True, [0, 2]),
                (True, [0, 2]),
                (False, ["On calcule le quotient de deux termes consécutifs : " + QUOTIENTS_T + ".", pas]),
                (False, ["On calcule le quotient de deux termes consécutifs : " + QUOTIENTS_T + ".", pas]),
            ])
    t['title'] = 'Reconnaître une suite géométrique à partir de ses premiers termes'
    t['description'] = "Quotients constants ou non (suites arithmétiques, ni arithmétiques ni géométriques)"


# ============================================================================
# E3 — d2943133 : forme explicite
# ============================================================================

def e3_explicite_arith(t: dict) -> None:
    binaire(t, **oui_non('arithmétique', False),
            question="Cette suite est-elle arithmétique ?",
            corriges=[
                (True, [0, 1]),
                (True, [0, 1]),
                (False, [r"On calcule les premiers termes : $u_0={{a}}$, $u_1={{eval:a*q}}$ et $u_2={{eval:a*q^2}}$.",
                         r"$u_1-u_0={{eval:a*q-a}}$ mais $u_2-u_1={{eval:a*q^2-a*q}}$ : la différence n'est pas "
                         "toujours la même, la suite n'est **pas arithmétique**."]),
                (False, [r"On calcule les premiers termes : $u_0={{a}}$, $u_1={{eval:a*q;d}}$ et "
                         r"$u_2={{eval:a*q^2;d}}$.",
                         r"$u_1-u_0={{eval:a*q-a;d}}$ mais $u_2-u_1={{eval:a*q^2-a*q;d}}$ : la différence n'est "
                         "pas toujours la même, la suite n'est **pas arithmétique**."]),
                (False, [0, "La différence **dépend de $n$** : la suite n'est **pas arithmétique**."]),
                (False, [0, "La différence **dépend de $n$** : la suite n'est **pas arithmétique**."]),
            ])
    t['title'] = 'Reconnaître une suite arithmétique à partir de sa forme explicite'
    t['description'] = "u(n) = an + b, ou non : u(n) = u(0) × qⁿ, n² + c, kⁿ + c"


def e3_explicite_geom(t: dict) -> None:
    binaire(t, **oui_non('géométrique', False),
            question="Cette suite est-elle géométrique ?",
            corriges=[
                (False, [r"On calcule les premiers termes : $u_0={{b}}$, $u_1={{eval:a+b}}$ et $u_2={{eval:2*a+b}}$.",
                         SI_GEOMETRIQUE + r" Or $u_1^2={{eval:(a+b)^2}}$ et $u_0\times u_2={{eval:b*(2*a+b)}}$ : "
                         "la suite n'est **pas géométrique**."]),
                (False, [r"On calcule les premiers termes : $u_0={{b}}$, $u_1={{eval:b-a}}$ et $u_2={{eval:b-2*a}}$.",
                         SI_GEOMETRIQUE + r" Or $u_1^2={{eval:(b-a)^2}}$ et $u_0\times u_2={{eval:b*(b-2*a)}}$ : "
                         "la suite n'est **pas géométrique**."]),
                (True, [0, 1]),
                (True, [0, 1]),
                (False, [r"On calcule les premiers termes : $u_0={{u0}}$, $u_1={{u1}}$ et $u_2={{u2}}$. Comme "
                         r"$\dfrac{u_1}{u_0}={{eval:(u1)/(u0)}}$ mais $\dfrac{u_2}{u_1}={{eval:(u2)/(u1)}}$, on ne "
                         "multiplie pas toujours par le même nombre.",
                         "La suite n'est **pas géométrique**."]),
                (False, [r"On calcule les premiers termes : $u_0={{u0}}$, $u_1={{u1}}$ et $u_2={{u2}}$. Comme "
                         r"$\dfrac{u_1}{u_0}={{eval:(u1)/(u0)}}$ mais $\dfrac{u_2}{u_1}={{eval:(u2)/(u1)}}$, on ne "
                         "multiplie pas toujours par le même nombre.",
                         r"Attention : à cause du « $+{{c}}$ », ce n'est pas la forme $u_0\times q^n$. La suite "
                         "n'est **pas géométrique**."]),
            ])
    t['title'] = 'Reconnaître une suite géométrique à partir de sa forme explicite'
    t['description'] = "u(n) = u(0) × qⁿ, ou non : u(n) = an + b, n² + c, kⁿ + c"


# ============================================================================
# E3 — f63408c5 : relation de récurrence
# ============================================================================

DIFFERENCES_U = r"$u_1-u_0={{eval:u1-(a)}}$ mais $u_2-u_1={{eval:u2-(u1)}}$"
QUOTIENTS_U = r"$\dfrac{u_1}{u_0}={{eval:(u1)/(a)}}$ mais $\dfrac{u_2}{u_1}={{eval:(u2)/(u1)}}$"


def e3_recurrence_arith(t: dict) -> None:
    binaire(t, **oui_non('arithmétique', False),
            question="Cette suite est-elle arithmétique ?",
            corriges=[
                (True, [0, 1]),
                (False, [r"Pour passer d'un terme au suivant, on **multiplie** par ${{q}}$ : on n'ajoute pas "
                         "toujours le même nombre.",
                         r"On calcule les premiers termes : $u_1={{eval:q*a}}$ et $u_2={{eval:q^2*a}}$.",
                         r"$u_1-u_0={{eval:q*a-a}}$ mais $u_2-u_1={{eval:q^2*a-q*a}}$ : la suite n'est **pas "
                         "arithmétique**."]),
                (False, [r"Pour passer d'un terme au suivant, on **divise** par ${{k}}$ : on n'ajoute pas "
                         "toujours le même nombre.",
                         r"On calcule les premiers termes : $u_1={{eval:a/k}}$ et $u_2={{eval:a/k^2}}$.",
                         r"$u_1-u_0={{eval:a/k-a}}$ mais $u_2-u_1={{eval:a/k^2-a/k}}$ : la suite n'est **pas "
                         "arithmétique**."]),
                (False, [0, 1, DIFFERENCES_U + " : la suite n'est **pas arithmétique**."]),
                (False, [0, 1, DIFFERENCES_U + " : la suite n'est **pas arithmétique**."]),
            ])
    t['title'] = 'Reconnaître une suite arithmétique à partir de sa relation de récurrence'
    t['description'] = "u(n+1) = u(n) + r, ou non : q u(n), u(n)/k, p u(n) + b, u(n) + kn"


def e3_recurrence_geom(t: dict) -> None:
    binaire(t, **oui_non('géométrique', False),
            question="Cette suite est-elle géométrique ?",
            corriges=[
                (False, [r"Pour passer d'un terme au suivant, on **ajoute** ${{r}}$ : on ne multiplie pas "
                         "toujours par le même nombre.",
                         r"On calcule les premiers termes : $u_1={{eval:a+r}}$ et $u_2={{eval:a+2*r}}$.",
                         SI_GEOMETRIQUE + r" Or $u_1^2={{eval:(a+r)^2}}$ et $u_0\times u_2={{eval:a*(a+2*r)}}$ : "
                         "la suite n'est **pas géométrique**."]),
                (True, [0, 1]),
                (True, [0, 1]),
                (False, [0, 1, QUOTIENTS_U + " : la suite n'est **pas géométrique**."]),
                (False, [0, 1, QUOTIENTS_U + " : la suite n'est **pas géométrique**."]),
            ])
    t['title'] = 'Reconnaître une suite géométrique à partir de sa relation de récurrence'
    t['description'] = "u(n+1) = q u(n) ou u(n)/k, ou non : u(n) + r, p u(n) + b, u(n) + kn"


# ============================================================================
# E3 — d2067413 : nuage de points (origine intacte, 1TECHNO-045)
# ============================================================================

LU = r"On lit $u_0={{u0}}$, $u_1={{u1}}$, $u_2={{u2}}$ et $u_3={{u3}}$."
DIFFERENCES_L = r"$u_1-u_0={{eval:u1-(u0)}}$ mais $u_2-u_1={{eval:u2-(u1)}}$"
QUOTIENTS_L = r"$\dfrac{u_1}{u_0}={{eval:(u1)/(u0)}}$ mais $\dfrac{u_2}{u_1}={{eval:(u2)/(u1)}}$"


def e3_nuage_arith(t: dict) -> None:
    pas = "La suite ne semble **pas arithmétique**."
    binaire(t, **oui_non('arithmétique', True),
            question="Au vu du graphique, cette suite semble-t-elle arithmétique ?",
            corriges=[
                (True, [0, 1, 2]),
                (True, [0, 1, 2]),
                (False, ["Les points ne sont pas alignés : ils montent de plus en plus vite.",
                         LU + " " + DIFFERENCES_L + " : on n'ajoute pas toujours le même nombre.", pas]),
                (False, ["Les points ne sont pas alignés : ils descendent de moins en moins vite.",
                         LU + " " + DIFFERENCES_L + " : on n'ajoute pas toujours le même nombre.", pas]),
                (False, ["Les points ne sont pas alignés : la suite **diminue, puis augmente**.",
                         LU + " " + DIFFERENCES_L + " : on n'ajoute pas toujours le même nombre.", pas]),
                (False, ["Les points ne sont pas alignés : ils montent de plus en plus vite.",
                         LU + " " + DIFFERENCES_L + " : on n'ajoute pas toujours le même nombre.", pas]),
            ])
    t['title'] = 'Reconnaître une suite arithmétique sur un nuage de points'
    t['description'] = "Points alignés, ou non (suites géométriques, ni arithmétiques ni géométriques)"


def e3_nuage_geom(t: dict) -> None:
    lu3 = r"On lit $u_0={{u0}}$, $u_1={{u1}}$ et $u_2={{u2}}$."
    binaire(t, **oui_non('géométrique', True),
            question="Au vu du graphique, cette suite semble-t-elle géométrique ?",
            corriges=[
                (False, ["Les points sont alignés : d'un rang au suivant, on monte toujours de la même hauteur.",
                         lu3 + " " + SI_GEOMETRIQUE + r" Or $u_1^2={{eval:(u1)^2}}$ et "
                         r"$u_0\times u_2={{eval:(u0)*(u2)}}$.",
                         "La suite ne semble **pas géométrique**."]),
                (False, ["Les points sont alignés : d'un rang au suivant, on descend toujours de la même hauteur.",
                         lu3 + " " + SI_GEOMETRIQUE + r" Or $u_1^2={{eval:(u1)^2}}$ et "
                         r"$u_0\times u_2={{eval:(u0)*(u2)}}$.",
                         "La suite ne semble **pas géométrique**."]),
                (True, ["Les points montent de plus en plus vite.", 1, 2]),
                (True, ["Les points descendent de moins en moins vite.", 1, 2]),
                (False, [LU + " " + QUOTIENTS_L + " : on ne multiplie pas toujours par le même nombre.",
                         "La suite ne semble **pas géométrique**."]),
                (False, [LU + " " + QUOTIENTS_L + " : on ne multiplie pas toujours par le même nombre.",
                         "Attention : des points qui montent de plus en plus vite ne suffisent pas pour dire "
                            "« géométrique ». La suite ne semble **pas géométrique**."]),
            ])
    t['title'] = 'Reconnaître une suite géométrique sur un nuage de points'
    t['description'] = "Termes multipliés par un même nombre, ou non (points alignés, ni arithmétique ni géométrique)"


# ============================================================================
# E3 — c90fa022 : placements (origine intacte, 1TECHNO-042)
# ============================================================================

def e3_placement_arith(t: dict) -> None:
    binaire(t, **oui_non('arithmétique', False),
            question="La suite $(u_n)$ est-elle arithmétique ?",
            corriges=[
                (True, [0, 1]),
                (False, [r"Chaque année, les intérêts sont calculés sur le capital **de l'année**, qui augmente : on "
                         "n'ajoute pas toujours la même somme.",
                         r"$u_0={{C}}$, $u_1={{eval:C*(1+t/100);d}}$ et $u_2={{eval:C*(1+t/100)^2;d}}$ : "
                         r"$u_1-u_0={{eval:C*t/100;d}}$ mais $u_2-u_1={{eval:C*(1+t/100)*t/100;d}}$.",
                         "La suite n'est **pas arithmétique**."]),
                (False, [0, 1, 2]),
            ])
    t['title'] = 'Intérêts simples ou composés : la suite est-elle arithmétique ?'
    t['description'] = "Reconnaître une suite arithmétique dans un placement (intérêts simples), ou non"


def e3_placement_geom(t: dict) -> None:
    binaire(t, **oui_non('géométrique', False),
            question="La suite $(u_n)$ est-elle géométrique ?",
            corriges=[
                (False, [0,
                         r"$u_0={{C}}$, $u_1={{eval:C+C*t/100}}$ et $u_2={{eval:C+2*C*t/100}}$. " + SI_GEOMETRIQUE
                         + r" Or $u_1^2={{eval:(C+C*t/100)^2}}$ et $u_0\times u_2={{eval:C*(C+2*C*t/100)}}$.",
                         "La suite n'est **pas géométrique**."]),
                (True, [0, 1]),
                (False, [0, 1, 3]),
            ])
    t['title'] = 'Intérêts simples ou composés : la suite est-elle géométrique ?'
    t['description'] = "Reconnaître une suite géométrique dans un placement (intérêts composés), ou non"


# ============================================================================
# S6 — 0dee4515 : une case par modèle
# ============================================================================

def s6_case(t: dict, case: int) -> None:
    """Garde la case `case` (0 : somme, 1 : produit) de chaque variation."""
    nom, formule = (('somme', r'x_1+x_2'), ('produit', r'x_1\times x_2'))[case]
    regle = (r"$x_1+x_2=-\dfrac{b}{a}$", r"$x_1\times x_2=\dfrac{c}{a}$")[case]
    for i, v in enumerate(t['variations']):
        v['blanks'] = [v['blanks'][case]]
        avant = 'Sans les calculer, détermine leur somme et leur produit.\n\n$x_1+x_2=?$ et $x_1\\times x_2=?$'
        assert v['statement'].count(avant) == 1
        v['statement'] = v['statement'].replace(avant, f'Sans les calculer, détermine leur {nom}.\n\n${formule}=?$')
        etapes = v['correction']['steps']
        etapes[1] = f"Quand un trinôme $ax^2+bx+c$ a deux racines, {regle}."
        if i == 0:
            etapes[2] = ((r"Ici $a=1$ : $x_1+x_2=-b={{eval:-b}}$.", r"Ici $a=1$ : $x_1\times x_2=c={{c}}$.")[case])
        else:
            etapes[2] = ((r"$$x_1+x_2=-\dfrac{b}{a}=\dfrac{ {{eval:-b}} }{ {{a}} }={{eval:-b/a}}$$",
                          r"$$x_1\times x_2=\dfrac{c}{a}=\dfrac{ {{c}} }{ {{a}} }={{eval:c/a}}$$")[case])
    specs = []
    for s in t['test_specs']:
        d = s['description']
        if d == 'somme et produit échangés':
            # Reprise en « mauvaise case » : la somme donnée pour le produit, et l'inverse.
            s = {**s, 'description': ('produit donné pour la somme', 'somme donnée pour le produit')[case]}
            specs.append({**s, 'answers': [s['answers'][case]]})
            continue
        if case == 1 and d in ('S = b (signe oublié)', 'S = b/a (signe)'):
            continue
        if case == 1 and d == 'fraction non réduite 6/4':
            specs.append({**s, 'answers': ['-\\frac{18}{8}'], 'description': 'fraction non réduite 18/8'})
            continue
        specs.append({**s, 'answers': [s['answers'][case]]})
    if case == 1:
        specs.insert(2, {'answers': ['-3'], 'expected': {'status': 'incorrect'},
                         'variables': {'a': '1', 'b': '-5', 'c': '3'}, 'description': 'P = −c (signe)',
                         'variationIndex': 0})
    t['test_specs'] = specs


def s6_somme(t: dict) -> None:
    s6_case(t, 0)


def s6_produit(t: dict) -> None:
    s6_case(t, 1)


# ============================================================================
# S11 — 30b597c3 : V2 enrichie (dé à n faces)
# ============================================================================

def s11_geometrique(t: dict) -> None:
    (v,) = t['variations']
    assert 'variables' not in v
    v['variables'] = [{'name': 'n', 'expression': '4|6|8|10|12|20'}]
    v['statement'] = ("On lance un dé équilibré à ${{n}}$ faces, numérotées de $1$ à ${{n}}$, **jusqu'à** obtenir "
                      "un ${{n}}$ pour la première fois, et on note $X$ le nombre de lancers effectués.\n\n"
                      "Quelle est la loi de $X$ ?")
    v['choices'] = [
        {'content': r"$\mathcal{G}\left(\dfrac{1}{ {{n}} }\right)$"},
        {'content': r"$\mathcal{G}\left(\dfrac{ {{eval:n-1}} }{ {{n}} }\right)$"},
        {'content': r"$\mathcal{B}\left({{n}}\,;\dfrac{1}{ {{n}} }\right)$"},
        {'content': r"La loi de Bernoulli de paramètre $\dfrac{1}{ {{n}} }$"},
    ]
    v['correction'] = {'steps': [
        r"On répète une épreuve de Bernoulli de succès « obtenir ${{n}}$ » ($p=\dfrac{1}{ {{n}} }$), et $X$ est "
        r"le **rang du premier succès**.",
        r"$X$ suit la loi géométrique $\textcolor{{{color:primary.0}}}{\mathcal{G}\left(\dfrac{1}{ {{n}} }\right)}$.",
    ]}
    t['test_specs'] = [
        {'expected': {'status': 'correct'}, 'variables': {'n': '6'}, 'description': 'v0 : n=6, géométrique',
         'variationIndex': 0, 'selectedChoices': [0]},
        {'expected': {'status': 'incorrect'}, 'variables': {'n': '6'}, 'description': 'v0 : G(5/6)',
         'variationIndex': 0, 'selectedChoices': [1]},
        {'expected': {'status': 'incorrect'}, 'variables': {'n': '6'}, 'description': 'v0 : binomiale',
         'variationIndex': 0, 'selectedChoices': [2]},
        {'expected': {'status': 'incorrect'}, 'variables': {'n': '6'}, 'description': 'v0 : Bernoulli',
         'variationIndex': 0, 'selectedChoices': [3]},
        {'expected': {'status': 'correct'}, 'variables': {'n': '20'}, 'description': 'v0 : n=20, géométrique',
         'variationIndex': 0, 'selectedChoices': [0]},
    ]


# ============================================================================
# LE LOT
# ============================================================================

def V(*numeros: int) -> list[int]:
    """Variations V1, V2… (numérotation des notes) → indices base 0."""
    return [i - 1 for i in numeros]


def tout(court: str) -> list[int]:
    return list(range(N_VAR[court]))


N_VAR = {'61e2ac1f': 5, 'd2943133': 6, 'f63408c5': 5, 'd2067413': 6, 'c90fa022': 3, '0dee4515': 2}

# Même forme que lot-scissions.py : l'origine (variations, points, titre, sous-titre, retouche), puis
# ses neufs (UUID fixé, variations, points, titre, sous-titre, retouche). Titre et sous-titre sont
# réécrits par la retouche quand elle existe.
LOT = {
    # ---- E3, origine réécrite « arithmétique ? », neuf « géométrique ? » ---------------------
    '61e2ac1f': [
        (tout('61e2ac1f'), ['1SPE-213'], '', '', e3_termes_arith),
        ('fcf1057e-da6f-40ce-b40d-5a66830d44b9', tout('61e2ac1f'), ['1SPE-216'], '', '', e3_termes_geom),
    ],
    'd2943133': [
        (tout('d2943133'), ['1SPE-213'], '', '', e3_explicite_arith),
        ('84114cb2-cb00-4526-a9d3-a03a3a15976b', tout('d2943133'), ['1SPE-216'], '', '', e3_explicite_geom),
    ],
    'f63408c5': [
        (tout('f63408c5'), ['1SPE-213'], '', '', e3_recurrence_arith),
        ('cea65372-59a4-48b7-adeb-ffd56d6cf8d1', tout('f63408c5'), ['1SPE-216'], '', '', e3_recurrence_geom),
    ],
    # ---- E3, origine intacte (tag de 1re techno), deux neufs --------------------------------
    'd2067413': [
        (tout('d2067413'), ['1TECHNO-045'], 'Reconnaître une suite arithmétique ou géométrique sur un nuage de points',
         "Points alignés, termes multipliés par un même nombre, ou ni l'un ni l'autre"),
        ('55bb8507-9f2e-4e1d-b190-fc8f356c8f4c', tout('d2067413'), ['1SPE-213'], '', '', e3_nuage_arith),
        ('d1010214-1537-4b3d-9b99-1b3718a5d981', tout('d2067413'), ['1SPE-216'], '', '', e3_nuage_geom),
    ],
    'c90fa022': [
        (tout('c90fa022'), ['1TECHNO-042'], 'Intérêts simples ou composés : nature de la suite',
         'Reconnaître une suite arithmétique ou géométrique dans un placement'),
        ('70e682f9-9f54-495b-8943-69c8597a5c32', tout('c90fa022'), ['1SPE-230'], '', '', e3_placement_arith),
        ('f3100c29-23bc-4bfe-b353-20f59d07371e', tout('c90fa022'), ['1SPE-379'], '', '', e3_placement_geom),
    ],
    # ---- S6 : une case par modèle -------------------------------------------------------------
    '0dee4515': [
        (tout('0dee4515'), ['1SPE-245'], 'Somme des racines', 'x₁ + x₂ = −b/a sans calculer les racines', s6_somme),
        ('88a4432e-f4a6-4109-833d-9640cb0d225f', tout('0dee4515'), ['1SPE-383'], 'Produit des racines',
         'x₁x₂ = c/a sans calculer les racines', s6_produit),
    ],
    # ---- S11 : trois modèles, V2 enrichie ----------------------------------------------------
    '30b597c3': [
        (V(1, 4), ['TSPE-618', 'TCOMP-367'], 'Loi binomiale ou non : identifier la loi',
         "Nombre de succès dans des épreuves indépendantes (binomiale), tirages sans remise (aucune loi usuelle)"),
        ('ea8d7ae6-6740-4abf-b488-cc55f8296add', V(2), ['TSPE-516', 'TCOMP-368'], 'Loi géométrique : identifier la loi',
         "Rang du premier succès dans des épreuves indépendantes (dé à n faces)", s11_geometrique),
        ('77498f1b-3625-4701-aa9c-f6132eb3b4ba', V(3), ['TSPE-502', 'TCOMP-295'], 'Loi de Bernoulli : identifier la loi',
         "Variable qui vaut 1 en cas de succès, 0 sinon, sur une seule épreuve"),
    ],
}

NIVEAUX_PRIS = {
    ('Fonctions', 'Polynôme du second degré', 'Racines'): 6,
    ('Probabilités', 'Loi binomiale', 'Reconnaître une loi'): 1,
    ('Suites', 'Modélisation', 'Placements'): 3,
    ('Suites', 'Reconnaître une suite', 'Arithmétique ou géométrique'): 4,
}

ENTETE = """-- ============================================================================
-- Passe lycée, scissions PR 2 : {n} modèles dédoublés ou scindés et réécrits, {k} modèles neufs
-- ============================================================================
-- E3 (5 modèles « arithmétique, géométrique, ou ni l'un ni l'autre ? ») : chaque question devient
-- binaire et garde toutes ses variations. 61e2ac1f, d2943133, f63408c5 : l'origine devient
-- « arithmétique ? » (1SPE-213), un neuf « géométrique ? » (1SPE-216). d2067413 et c90fa022 portent un
-- tag de 1re techno (1TECHNO-045, 1TECHNO-042) qui décrit leur question à trois choix : l'origine reste
-- INTACTE (ni contenu, ni nœud, ni `updated_at` ne changent) et deux neufs portent la 1re spé
-- (1SPE-213 / 1SPE-216 ; 1SPE-230 / 1SPE-379). S6 : 0dee4515 garde la case « somme » (1SPE-245), son
-- neuf la case « produit » (1SPE-383). S11 : 30b597c3 garde V1, V4 (TSPE-618 + TCOMP-367, passe sur
-- le nœud de TSPE-618, R2), neufs V2 enrichie (dé à n faces ; TSPE-516 + TCOMP-368) et V3
-- (TSPE-502 + TCOMP-295). Les neufs se rangent sur le nœud de leur premier point.
-- ============================================================================
-- Source de vérité : docs/wip/passe-lycee/analyse/scissions-notes.md (E3 = A_TRANCHER 1-5, S6, S11),
-- VALIDÉ par David le 2026-10-23, et sa décision du même jour pour les deux modèles de 1re techno.
-- Fichier GÉNÉRÉ par docs/wip/passe-lycee/analyse/lot-reecritures.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-reecritures.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-23 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud, aux niveaux et au statut relevés, et porter
-- EXACTEMENT ses tags relevés (2 en portent un, de 1re techno : gardé), à tout niveau.
--
-- Données d'élèves : aucune (relevé du 2026-10-23 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal sur les 7 modèles, tous brouillons). Les
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
            assert len(t['variations']) == N_VAR.get(t['id'][:8], len(t['variations'])), t['id']
            releve.append({**t, 'classification_node_id': noeuds[t['id']]})
    assert len(releve) == len(LOT) == 7, len(releve)
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris=NIVEAUX_PRIS,
            dedoubles={'61e2ac1f', 'd2943133', 'f63408c5', 'd2067413', 'c90fa022', '0dee4515'},
            intactes={'d2067413', 'c90fa022'},
            migration='supabase/migrations/20261024004000_passe_lycee_reecritures.sql',
            fixture='tests/integration/fixtures/passe-lycee-reecritures.json', prefixe='plre', entete=ENTETE)

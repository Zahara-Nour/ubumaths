"""Génère la migration du lot C du lot MODIFIER de la passe lycée : 10 modèles changent de consigne,
d'énoncé ou de corrigé puis sont tagués ; un 11e (`646b4cd3`, C4) reçoit son tag sans modification.

Source : `lot-modifier.md` § 1 (lot C) et « Choix à faire » (C1-C4 = a), validé en bloc par David le
2026-10-23. Décisions qui fixent les textes : lte-7 (formule de l'inverse admise seulement si
l'énoncé la donne), lte-8 (transformations connues ou définies dans l'énoncé), l1s-1 (seule
composée écrite en 1re spé : t ↦ e^(at)) ; en 1re spé, la limite d'une suite se conjecture.

Contenu relevé dans `../releves/templates.json` (instantané du 2026-10-23 ; empreintes md5 du
contenu et nœuds des 11 modèles identiques à la prod le 2026-10-23, relus par le MCP en lecture
seule ; 0 tag, 0 donnée d'élève) ; nœuds, points et tags : `etat-prod-2026-10-23b/`. Le relevé du
lot est écrit dans `etat-prod-2026-10-23b/modeles-lot-c.json`.

    python3 docs/wip/passe-lycee/analyse/lot-modifier-c.py [dossier où écrire les modèles modifiés]
"""

import json
import sys

sys.path.insert(0, 'docs/wip/arbre-notions/analyse')
from lot_2bis_outils import generer, remplacer  # noqa: E402

ANALYSE = 'docs/wip/passe-lycee/analyse/'
ETAT = ANALYSE + 'etat-prod-2026-10-23b/'
RELEVE = 'modeles-lot-c.json'

# Modèle → (niveau, point) : `lot-modifier.md` § 1, lot C et C4.
LISTE = {
    '849aabbc': ('1_SPE', '1SPE-231'),
    'bb554c62': ('1_SPE', '1SPE-283'),
    '227f2c9c': ('1_SPE', '1SPE-295'),
    'f7194c9d': ('1_SPE', '1SPE-304'),
    'f2cc01fc': ('1_SPE', '1SPE-318'),
    '293f8225': ('T_EXP', 'TEXP-246'),
    '6ff00846': ('T_EXP', 'TEXP-246'),
    '8d69e3a9': ('T_EXP', 'TEXP-323'),
    '93539700': ('T_EXP', 'TEXP-323'),
    'cd4f9fb3': ('T_EXP', 'TEXP-338'),
    '646b4cd3': ('T_SPE', 'TSPE-376'),
}

COULEUR = '\\textcolor{{{color:primary.0}}}'


# ============================================================================
# OUTILS
# ============================================================================

def remplacer_dans(conteneur: dict | list, cle: str | int, avant: str, apres: str, n: int = 1) -> None:
    assert conteneur[cle].count(avant) == n, (cle, avant, conteneur[cle].count(avant))
    conteneur[cle] = conteneur[cle].replace(avant, apres)


def absent(t: dict, *mots: str) -> None:
    texte = json.dumps(t['variations'], ensure_ascii=False)
    for m in mots:
        assert m not in texte, m


# ============================================================================
# 1RE SPÉ
# ============================================================================

def m_849aabbc(t):
    # 1SPE-231 : en 1re, la limite d'une suite se conjecture (« aucune démonstration de limite »).
    remplacer(t, 'title', "Déterminer la limite d'une suite", "Conjecturer la limite d'une suite")
    for v in t['variations']:
        remplacer_dans(v, 'statement', 'Détermine la limite de la suite dont le terme général est :',
                       'Quelle semble être la limite de la suite dont le terme général est donné ci-dessous ?')
    # V9 : le corrigé appliquait le théorème de terminale sur (qⁿ).
    remplacer_dans(t['variations'][8]['correction']['steps'], 0,
                   '$-1<{{eval:1/(b)}}<1$ donc la limite est $0$.',
                   '$-1<{{eval:1/(b)}}<1$ : les termes se rapprochent de $0$, la limite semble être $0$.')
    absent(t, 'Détermine')


def m_bb554c62(t):
    # 1SPE-283 : les limites de fonctions sont hors du programme de 1re spé (borne générale).
    remplacer_dans(t['variations'][0]['correction']['steps'], 1,
                   '\n- ses **limites** aux bornes de son ensemble de définition ;', '')
    absent(t, 'limite')


def m_227f2c9c(t):
    # C1 (a) : e^(ax+b) = e^(ax) × e^b, puis (e^(ax))′ = a·e^(ax) (1SPE-295) ; la règle (e^u)′ = u′e^u
    # n'est plus énoncée (décision l1s-1).
    remplacer(t, 'description',
              "Dérivée de l'exponentielle d'une fonction affine : (e^(ax+b))′ = a·e^(ax+b)",
              "Dériver x ↦ e^(ax+b) en l'écrivant e^(ax) × e^b : (e^(ax))′ = a·e^(ax)")
    regle = ("La dérivée de $x\\mapsto e^{ax}$ est $x\\mapsto a\\,e^{ax}$ : le coefficient de $x$ "
             "**passe devant** l'exponentielle.")
    v1, v2, v3 = t['variations']
    v1['correction']['steps'] = [
        "On écrit $f(x)=e^{ {{eval:a*x}} }\\times e^{ {{b}} }$, car $e^{u+v}=e^u\\times e^v$ ; "
        "$e^{ {{b}} }$ est une constante.",
        regle,
        f"Donc $f'(x)={COULEUR}{{ {{{{a}}}} }}e^{{ {{{{eval:a*x}}}} }}\\times e^{{ {{{{b}}}} }}"
        f"={COULEUR}{{ {{{{a}}}} }}e^{{ {{{{eval:a*x+b}}}} }}$.",
    ]
    v2['correction']['steps'] = [
        "On écrit $f(x)=e^{-x}\\times e^{ {{b}} }$, car $e^{u+v}=e^u\\times e^v$ ; "
        "$e^{ {{b}} }$ est une constante.",
        regle,
        f"Ici $a={COULEUR}{{-1}}$, donc $f'(x)=-e^{{-x}}\\times e^{{ {{{{b}}}} }}=-e^{{ {{{{eval:-x+b}}}} }}$.",
    ]
    v3['correction']['steps'] = [
        regle,
        f"Ici $a={COULEUR}{{ {{{{a}}}} }}$, donc $f'(x)={COULEUR}{{ {{{{a}}}} }}e^{{ {{{{eval:a*x}}}} }}$.",
    ]
    absent(t, 'u(x)', "u'")


def m_f7194c9d(t):
    # 1SPE-304 : pas d'angle orienté en 1re spé ; on parle du réel associé au même point du cercle.
    remplacer(t, 'title', "Mesure principale d'un angle", 'Ramener un réel dans ]−π ; π]')
    remplacer(t, 'description',
              "Ramener une mesure en radians (17π/6, −13π/4, 25π/3…) dans ]−π ; π] en retirant ou en ajoutant des tours",
              "Trouver le réel de ]−π ; π] associé au même point du cercle trigonométrique qu'un réel donné "
              "(17π/6, −13π/4, 25π/3…), en retirant ou en ajoutant des tours")
    intervalle = '$\\left]-\\pi\\,;\\pi\\right]$'
    for v in t['variations']:
        remplacer_dans(v, 'statement', "Détermine la mesure principale de l'angle orienté de mesure ",
                       f"Détermine le réel de l'intervalle {intervalle} associé au même point du cercle "
                       "trigonométrique que le réel ")
        remplacer_dans(v, 'statement', f", c'est-à-dire sa mesure dans l'intervalle {intervalle}.", '.')
        remplacer_dans(v['correction']['steps'], 2, 'la mesure principale est', 'le réel cherché est')
    s = [s for s in t['test_specs'] if s['description'] == "17π/6 : l'angle de l'énoncé n'est pas la mesure principale"]
    assert len(s) == 1, s
    s[0]['description'] = "17π/6 : le réel de l'énoncé n'est pas dans ]−π ; π]"
    absent(t, 'mesure principale', 'angle orienté')


def m_f2cc01fc(t):
    # 1SPE-318 : V3 sans « orienté » (notion absente du BO de 1re spé), comme ba8ae428.
    remplacer_dans(t['variations'][2], 'statement', "une mesure en radians de l'angle orienté $(",
                   "une mesure en radians de l'angle $(")
    absent(t, 'orienté')


# ============================================================================
# TLE EXPERTES
# ============================================================================

CONJUGUE = "On admet que, pour un polynôme à coefficients réels, le conjugué d'une racine est aussi une racine."


def m_293f8225(t):
    # TEXP-246 : V1 s'appuie sur une propriété hors du point, rappelée dans l'énoncé.
    remplacer_dans(t['variations'][0], 'statement', '\n\nDonne ses deux autres racines',
                   f'\n\n{CONJUGUE}\n\nDonne ses deux autres racines')


def m_6ff00846(t):
    # TEXP-246 : polynômes à coefficients réels (borne générale) ; V3, V4 : propriété rappelée.
    v1, _, v3, v4 = t['variations']
    remplacer_dans(v1, 'statement', 'à coefficients complexes.', 'à coefficients réels.')
    remplacer_dans(v3, 'statement', '\n\nQuel autre nombre', f'\n\n{CONJUGUE}\n\nQuel autre nombre')
    remplacer_dans(v4, 'statement', '\n\nQue peut-on affirmer', f'\n\n{CONJUGUE}\n\nQue peut-on affirmer')
    absent(t, 'coefficients complexes')


def m_8d69e3a9(t):
    # C2 (a) : l'homothétie est définie dans l'énoncé, comme la rotation de V1 (décision lte-8).
    remplacer_dans(t['variations'][2], 'statement',
                   "Dans un repère d'origine $O$, donne la matrice de l'homothétie de centre $O$ et de rapport ${{k}}$.",
                   "Dans un repère d'origine $O$, l'homothétie de centre $O$ et de rapport ${{k}}$ transforme le point "
                   "de coordonnées $(x \\,;\\, y)$ en le point de coordonnées $({{k}}x \\,;\\, {{k}}y)$.\n\n"
                   "Donne la matrice de cette homothétie.")


def m_93539700(t):
    # TEXP-323 : V2 donne la matrice de la rotation, comme V3 (décision lte-8).
    v2 = t['variations'][1]
    remplacer_dans(v2, 'statement', '-\\dfrac{\\pi}{2}}}}}$.\n\n',
                   '-\\dfrac{\\pi}{2}}}}}$, de matrice '
                   '$R = \\begin{pmatrix}{{co}}&{{eval:-si}}\\\\{{si}}&{{co}}\\end{pmatrix}$.\n\n')
    remplacer_dans(v2['correction']['steps'], 0,
                   'La matrice de $r$ est $\\begin{pmatrix}\\cos\\theta & -\\sin\\theta\\\\ \\sin\\theta & \\cos\\theta\\end{pmatrix} = ',
                   'La matrice de $r$ est $R = ')
    remplacer(t, 'description',
              "Calculer l'image d'un point par la matrice d'une transformation, par une rotation de centre O d'angle "
              "±π/2 ou π, la matrice d'une composée (produit dans le bon ordre), un antécédent par la matrice inverse "
              "(pièges : produit ligne × matrice, ordre de la composée inversé, multiplier par A au lieu de A⁻¹)",
              "Calculer l'image d'un point par la matrice d'une transformation (rotation de centre O d'angle ±π/2 "
              "ou π comprise, de matrice donnée), la matrice d'une composée (produit dans le bon ordre), un "
              "antécédent par la matrice inverse (pièges : produit ligne × matrice, ordre de la composée inversé, "
              "multiplier par A au lieu de A⁻¹)")
    absent(t, '\\cos\\theta')


INVERSE = ("On admet que, si $ad-bc\\neq0$, la matrice $\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$ est inversible, "
           "d'inverse $\\dfrac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}$.")


def m_cd4f9fb3(t):
    # C3 (a) : la formule de l'inverse est donnée dans l'énoncé (décision lte-7), comme V3 donne ad − bc.
    for i in (0, 1, 3):
        remplacer_dans(t['variations'][i], 'statement', '\\end{pmatrix}$ est inversible.\n\n',
                       f'\\end{{pmatrix}}$ est inversible.\n\n{INVERSE}\n\n')


def m_646b4cd3(t):
    # C4 (a) : V4 (centre et rayon par complétion des carrés) acceptée comme lecture inverse du même
    # savoir : tag seul, contenu inchangé.
    pass


MODIFS = {
    '849aabbc': m_849aabbc, 'bb554c62': m_bb554c62, '227f2c9c': m_227f2c9c, 'f7194c9d': m_f7194c9d,
    'f2cc01fc': m_f2cc01fc, '293f8225': m_293f8225, '6ff00846': m_6ff00846, '8d69e3a9': m_8d69e3a9,
    '93539700': m_93539700, 'cd4f9fb3': m_cd4f9fb3, '646b4cd3': m_646b4cd3,
}
TAGS_SEULS = {'646b4cd3'}


# ============================================================================
# RELEVÉ DU LOT
# ============================================================================

def ecrire_releve() -> None:
    noeuds = {t['id']: t['node'] for t in json.load(open(ETAT + 'templates.json'))}
    lot = []
    for t in json.load(open('docs/wip/passe-lycee/releves/templates.json')):
        if t['id'][:8] in LISTE:
            lot.append({**t, 'classification_node_id': noeuds[t['id']]})
    assert len(lot) == len(LISTE)
    lot.sort(key=lambda t: t['id'])
    json.dump(lot, open(ETAT + RELEVE, 'w'), ensure_ascii=False, indent='\t')
    open(ETAT + RELEVE, 'a').write('\n')


ENTETE = """-- ============================================================================
-- Passe lycée, lot MODIFIER — lot C : 10 modèles du lycée changent de consigne, d'énoncé ou de
-- corrigé pour tenir dans leur point (conjecture au lieu de calcul de limite en 1re spé, plus
-- d'angle orienté en 1re spé, propriétés et formules hors du point rappelées dans l'énoncé en Tle
-- expertes), puis reçoivent le tag de leur point (ADR 0020 § 7). Un 11e modèle (646b4cd3,
-- TSPE-376) reçoit son tag sans changer de contenu. {n} modèles en tout.
-- ============================================================================
-- Source de vérité : docs/wip/passe-lycee/analyse/lot-modifier.md § 1 (lot C) et C1-C4, VALIDÉ par
-- David (2026-10-23). Fichier GÉNÉRÉ par docs/wip/passe-lycee/analyse/lot-modifier-c.py — ne pas
-- éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-lot-c.test.ts, qui fabrique des copies des identifiants de la
-- prod (contenu, nœud, niveaux) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-23 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud et aux niveaux relevés, et ne porter aucun tag.
--
-- Données d'élèves : aucune (relevé du 2026-10-23 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal sur ces modèles). Deux modèles sont
-- publiés (849aabbc, bb554c62) : seule leur formulation change. `updated_at` avance pour les 10
-- modèles dont le contenu change, pas pour 646b4cd3.
--
-- Accès (question tranchée par David le 2026-10-23) : personne ne gagne d'accès. Aucune règle ne
-- change ; les tags sont lisibles par tout utilisateur connecté (policy
-- question_template_points_read_authenticated), comme ceux de #1632 et #1639.
--"""


if __name__ == '__main__':
    ecrire_releve()
    generer(MODIFS, modeles=RELEVE, section='', liste=LISTE, etat=ETAT, tags_seuls=TAGS_SEULS,
            migration='supabase/migrations/20261024002000_passe_lycee_lot_c.sql',
            fixture='tests/integration/fixtures/passe-lycee-lot-c.json', prefixe='plc', entete=ENTETE)

"""Génère la migration des lots A + B du lot MODIFIER de la passe lycée : 6 modèles modifiés (nombres
resserrés, variations retirées) et tagués, dont 3 scindés (B1-B3 : la variation retirée part dans un
modèle neuf tagué sur son propre point).

Source : `lot-modifier.md` §§ 1 (lots A et B) et « Choix à faire » (B1-B3 = a), validé en bloc par David
le 2026-10-23 ; décision l1s-2 (forme canonique : b/(2a) entier ou demi-entier). `95ee8348` (lot A, aussi
scindé en Tle spé) est reporté au lot des scissions : une seule migration touche son contenu.

Contenu relevé dans `../releves/templates.json` (instantané du 2026-10-23, empreintes md5 du contenu
identiques à la prod le 2026-10-23, relues par le MCP en lecture seule) ; nœuds, points et tags :
`etat-prod-2026-10-23b/` (identiques à la prod). Le relevé du lot est écrit dans
`etat-prod-2026-10-23b/modeles-lot-ab.json` (contenu de `releves/`, nœud de l'instantané b).

    python3 docs/wip/passe-lycee/analyse/lot-modifier-ab.py [dossier où écrire les modèles modifiés]
"""

import json
import sys

sys.path.insert(0, 'docs/wip/arbre-notions/analyse')
from lot_2bis_outils import garder_variations, generer, remplacer  # noqa: E402

ANALYSE = 'docs/wip/passe-lycee/analyse/'
ETAT = ANALYSE + 'etat-prod-2026-10-23b/'
RELEVE = 'modeles-lot-ab.json'

# Modèle → (niveau, point ou « point de l'origine,point du neuf ») : `lot-modifier.md` § 1, B1-B3.
LISTE = {
    '9f00da01': ('1_SPE', '1SPE-384'),
    'f3e68e4b': ('2', '2-396'),
    '0ab3faa5': ('1_SPE', '1SPE-204'),
    'a69dfde7': ('T_SPE', 'TSPE-325,TSPE-323'),
    'f2133048': ('T_EXP', 'TEXP-264,TEXP-357'),
    '6be786ef': ('T_EXP', 'TEXP-315,TEXP-316'),
}


# ============================================================================
# OUTILS
# ============================================================================

def retirer_choix(t: dict, variation: int, contenu: str) -> None:
    """Retire un distracteur (jamais la bonne réponse) ; indices de la bonne réponse et des specs suivis."""
    v = t['variations'][variation]
    i = next(i for i, c in enumerate(v['choices']) if c['content'] == contenu)
    bonnes = [int(x) for x in v['correctChoiceIndex']]
    assert i not in bonnes, (variation, contenu)
    del v['choices'][i]
    v['correctChoiceIndex'] = [str(b - (b > i)) for b in bonnes]
    specs = []
    for s in t['test_specs']:
        if s['variationIndex'] == variation:
            if i in s['selectedChoices']:
                continue
            s = {**s, 'selectedChoices': [c - (c > i) for c in s['selectedChoices']]}
        specs.append(s)
    t['test_specs'] = specs


def remplacer_dans(conteneur: dict, cle: str, avant: str, apres: str) -> None:
    assert conteneur[cle].count(avant) == 1, (cle, avant)
    conteneur[cle] = conteneur[cle].replace(avant, apres)


# ============================================================================
# LOT A — resserrer les nombres
# ============================================================================

def m_9f00da01(t):
    # V2 : b/(2a) entier ou demi-entier (décision l1s-2) ; V3 (forme factorisée) retirée (lot B).
    garder_variations(t, [0, 1])
    v = t['variations'][1]
    assert 'conditions' not in v
    v['conditions'] = ['mod(b,a) == 0']
    s = [s for s in t['test_specs'] if s['description'] == 'forme développée : α fractionnaire']
    assert len(s) == 1 and s[0]['variables'] == {'a': '3', 'b': '2', 'c': '-1'}, s
    s[0].update(answers=['-\\frac{1}{2}'], variables={'a': '2', 'b': '2', 'c': '-1'},
                description='forme développée : α demi-entier')


# ============================================================================
# LOT B — retirer des variations
# ============================================================================

def m_f3e68e4b(t):
    # V2 (tableau en pourcentages) retirée.
    garder_variations(t, [0])
    remplacer(t, 'description',
              "Calculer P_B(A) dans un tableau à double entrée, d'effectifs ou de pourcentages, sans la confondre avec P_A(B)",
              "Calculer P_B(A) dans un tableau à double entrée d'effectifs, sans la confondre avec P_A(B)")


def m_0ab3faa5(t):
    # V3 (négation de « et », « ou » sans quantificateur, relève de la 2de) retirée.
    garder_variations(t, [0, 1, 3])
    remplacer(t, 'description',
              "Choisir la négation d'une proposition quantifiée (« pour tout », « il existe ») ou d'une proposition avec « et », « ou »",
              "Choisir la négation d'une proposition quantifiée (« pour tout », « il existe »), implication comprise")


def m_a69dfde7(t):
    # V2 (couples i ≠ j) et V4 (toutes les parties) retirées ; V5 part dans le modèle neuf (B1).
    garder_variations(t, [0, 2])
    remplacer(t, 'title', 'Python : générer les paires, les triplets, les parties', 'Python : générer les paires et les triplets')
    remplacer(t, 'description',
              "Lire un programme qui énumère des objets : paires i < j (C(n, 2)), couples i ≠ j (n(n − 1)), triplets i < j < k "
              "(C(n, 3)), liste des parties (2ⁿ), ligne du triangle de Pascal (pièges : confondre i < j et i ≠ j)",
              "Lire un programme qui énumère les parties à 2 ou 3 éléments : paires i < j (C(n, 2)), triplets i < j < k "
              "(C(n, 3)) (piège : compter les couples ordonnés)")


def neuf_a69dfde7(t):
    garder_variations(t, [4])
    remplacer(t, 'title', 'Python : générer les paires, les triplets, les parties', 'Python : ligne du triangle de Pascal')
    t['description'] = ("Lire un programme qui construit les lignes du triangle de Pascal par la relation de Pascal, "
                        "et y lire un coefficient binomial (pièges : décalage d'indice ou de ligne)")


ROTATION = "la rotation de centre $O$ et d'angle $\\frac{\\pi}{2}$"


def m_f2133048(t):
    # V5 (rotation nommée) retirée ; V4 (image de z̄) part dans le modèle neuf (B2). V1-V3 n'ont pas
    # de distracteur « rotation ».
    garder_variations(t, [0, 1, 2])
    assert 'rotation' not in json.dumps(t['variations'], ensure_ascii=False)
    remplacer(t, 'title', 'Ensembles de points et images de z̄, iz dans le plan complexe',
              'Ensembles de points dans le plan complexe')
    remplacer(t, 'description',
              "|z − z_A| = r (cercle), |z − z_A| = |z − z_B| (médiatrice), |z̄ − w| = r (centre conjugué), image de z̄ et de iz "
              "(pièges : signe du centre, rayon au carré, conjugué oublié, symétrie et rotation confondues)",
              "|z − z_A| = r (cercle), |z − z_A| = |z − z_B| (médiatrice), |z̄ − w| = r (centre conjugué) "
              "(pièges : signe du centre, rayon au carré, conjugué oublié)")


def neuf_f2133048(t):
    garder_variations(t, [3])
    # Distracteur « rotation » remplacé (rotation absente des programmes, décision lte-8) : z ↦ i·z̄.
    choix = t['variations'][0]['choices']
    assert choix[3]['content'] == ROTATION, choix[3]
    choix[3]['content'] = "la symétrie d'axe la droite d'équation $y=x$"
    remplacer(t, 'title', 'Ensembles de points et images de z̄, iz dans le plan complexe',
              "Image du point d'affixe z̄ dans le plan complexe")
    t['description'] = ("M′ d'affixe z̄ est le symétrique de M d'affixe z par rapport à l'axe des réels "
                        "(pièges : symétrie de centre O, axe des imaginaires purs)")


CYCLE = "C'est un cycle."


def m_6be786ef(t):
    # V2 (cycle) et les distracteurs « C'est un cycle » retirés ; V4 (connexité) part dans le modèle neuf (B3).
    garder_variations(t, [0, 2])
    retirer_choix(t, 0, CYCLE)
    retirer_choix(t, 1, CYCLE)
    remplacer_dans(t['variations'][0]['correction']['steps'], 0,
                   " Elle ne revient pas à $A$ : ce n'est pas un cycle.", '')
    assert 'cycle' not in json.dumps(t['variations'], ensure_ascii=False)
    remplacer(t, 'title', 'Chaîne, cycle, connexité', "Chaîne, longueur d'une chaîne")
    remplacer(t, 'description',
              "Reconnaître une chaîne, sa longueur, un cycle, un graphe connexe, sur une figure (pièges : longueur comptée en "
              "sommets, arête inexistante, graphe dessiné en un seul bloc mais non connexe)",
              "Reconnaître une chaîne et sa longueur sur une figure (pièges : longueur comptée en sommets, arête inexistante)")


def neuf_6be786ef(t):
    garder_variations(t, [3])
    remplacer(t, 'title', 'Chaîne, cycle, connexité', 'Graphe connexe')
    t['description'] = ("Reconnaître un graphe connexe sur une figure (piège : graphe sans sommet isolé, "
                        "dessiné en deux blocs)")


MODIFS = {
    '9f00da01': m_9f00da01, 'f3e68e4b': m_f3e68e4b, '0ab3faa5': m_0ab3faa5,
    'a69dfde7': m_a69dfde7, 'f2133048': m_f2133048, '6be786ef': m_6be786ef,
}

# Modèle neuf : identifiant fixé, contenu, niveau dans la catégorie de l'origine (seule à son niveau 2
# en prod le 2026-10-23, brouillons compris).
SCISSIONS = {
    'a69dfde7': ('96be181c-6cd4-43e9-9291-1cd526955408', neuf_a69dfde7, 3),
    'f2133048': ('eb2089bf-418e-4a36-916f-2c0c2a549b8c', neuf_f2133048, 3),
    '6be786ef': ('b954c37d-b331-4d60-92df-2ab76110ae8e', neuf_6be786ef, 3),
}


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
-- Passe lycée, lot MODIFIER — lots A + B : {n} modèles du lycée perdent les variations qui relèvent
-- d'un autre point ou resserrent leurs nombres (specs de test suivies), puis reçoivent le tag de leur
-- point (ADR 0020 § 7). Trois d'entre eux sont scindés : la variation retirée part dans un modèle
-- neuf, rangé et tagué sur son propre point (TSPE-323, TEXP-357, TEXP-316).
-- ============================================================================
-- Source de vérité : docs/wip/passe-lycee/analyse/lot-modifier.md §§ 1 (lots A, B) et B1-B3, VALIDÉ par
-- David (2026-10-23). Fichier GÉNÉRÉ par docs/wip/passe-lycee/analyse/lot-modifier-ab.py — ne pas
-- éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-lot-ab.test.ts, qui fabrique des copies des identifiants de la
-- prod (contenu, nœud, niveaux et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-23 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud et aux niveaux relevés, et porter EXACTEMENT ses
-- tags relevés (f3e68e4b : TCOMP-302, gardé), à tout niveau.
--
-- Données d'élèves : aucune (relevé du 2026-10-23 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal sur ces modèles). Les modèles neufs copient
-- le statut de leur origine (brouillon). `updated_at` avance : le contenu change.
--
-- Accès (question tranchée par David le 2026-10-23) : personne ne gagne d'accès. Aucune règle ne
-- change ; les tags sont lisibles par tout utilisateur connecté (policy
-- question_template_points_read_authenticated), comme ceux de #1632.
--"""


if __name__ == '__main__':
    ecrire_releve()
    generer(MODIFS, modeles=RELEVE, section='', liste=LISTE, etat=ETAT, options=True, scissions=SCISSIONS,
            migration='supabase/migrations/20261024001000_passe_lycee_lot_ab.sql',
            fixture='tests/integration/fixtures/passe-lycee-lot-ab.json', prefixe='plab', entete=ENTETE)

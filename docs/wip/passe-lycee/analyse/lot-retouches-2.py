"""Génère la migration des RETOUCHES 2 de la passe lycée : les défauts relevés en route et restés
ouverts avant le versement (inventaire du 2026-10-24), sur 3 modèles, sans scission ni tag posé.

Décision de David (2026-10-24, phase 0 validée, « je suis tes recos ») :

- `e02fb162` V1 : le terme en x de l'équation perd son signe + quand −ap > 0 (« y′ = 3y9x − 15 ») ;
- `f796ffc0` V4 (desserts) : condition n > k (n = k = 5 donnait deux choix identiques « 5⁵ ») ;
- `0d2edda7` (publié, 2de) : la forme de l'égalité ne doit plus donner la réponse (« + → faux,
  × → vrai ») ; deux variations ajoutées : √a × √b = √(a + b) (faux, sauf a = b = 2 : condition
  ab ≠ a + b) et √a + √a = 2√a (vrai).

Écarté (David, 2026-10-24, option A) : `eae2ff6a` (racines lues sur une parabole, publié, sans point)
reste tel quel. Verdict HORS_PROGRAMME en 1re spé et en 2de (étape d), seul 1TECHNO-059 lui convient
et son tag a été retiré au contrôle des nœuds (R1) ; il relève du futur chantier « modèles 1re
générale et techno ».

Contenu relevé en prod le 2026-10-24 (MCP, lecture seule) : empreintes md5 des 3 modèles identiques
au relevé de l'étape c (`releves/templates.json`, aucun n'a bougé depuis), 0 donnée d'élève ; nœuds
et points concernés identiques à `etat-prod-2026-10-23c/` (copiés) ; tags = les 3 relevés.

    python3 docs/wip/passe-lycee/analyse/lot-retouches-2.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/wip/passe-lycee/analyse')
from scissions_outils import generer  # noqa: E402

ETAT = 'docs/wip/passe-lycee/analyse/etat-prod-2026-10-24/'


# ============================================================================
# OUTILS
# ============================================================================

def remplacer(texte: str, avant: str, apres: str) -> str:
    assert texte.count(avant) == 1, (texte, avant)
    return texte.replace(avant, apres)


# ============================================================================
# RETOUCHES
# ============================================================================

def equation_signe(t: dict) -> None:
    v = t['variations'][0]
    v['statement'] = remplacer(
        v['statement'],
        '{{if:-a*p==1|x}}{{if:-a*p==-1|-x}}{{if:-a*p!=1 && -a*p!=-1|{{eval:-a*p}}x}}',
        '{{if:-a*p==1|+x}}{{if:-a*p==-1|-x}}{{if:-a*p>0 && -a*p!=1|+{{eval:-a*p}}x}}'
        '{{if:-a*p<0 && -a*p!=-1|{{eval:-a*p}}x}}')
    t['test_specs'].append({
        'answers': ['2e^{2x}-x+1'], 'expected': {'status': 'correct'},
        'variables': {'a': '2', 'p': '-1', 'q': '1', 'y0': '3'},
        'description': "v0 : y'=2y+2x−1 (terme en x positif), g=−x+1 → 2e^{2x}−x+1", 'variationIndex': 0})


def desserts_n_sup_k(t: dict) -> None:
    v = t['variations'][3]
    assert 'conditions' not in v
    v['conditions'] = ['n > k']


def racines_formes(t: dict) -> None:
    assert len(t['variations']) == 2
    t['variations'] += [
        {
            'statement': 'Vrai ou Faux ?\n\n$${{expression3}}$$',
            'variables': [{'name': 'expression3', 'expression': 'sqrt({{a}})*sqrt({{b}})=sqrt({{eval:a+b}})'}],
            'conditions': ['a*b != a+b'],
            'correction': {'steps': [
                'Faux : le produit de deux racines est la racine du **produit**, pas de la somme.',
                '$$\\sqrt{{{a}}} \\times \\sqrt{{{b}}} = \\sqrt{{{a}} \\times {{b}}} = \\sqrt{{{eval:a*b}}}$$',
                'Or ${{eval:a*b}} \\neq {{eval:a+b}}$, donc $\\sqrt{{{eval:a*b}}} \\neq \\sqrt{{{eval:a+b}}}$.',
            ]},
            'correctChoiceIndex': ['1'],
        },
        {
            'statement': 'Vrai ou Faux ?\n\n$${{expression4}}$$',
            'variables': [{'name': 'expression4', 'expression': 'sqrt({{a}})+sqrt({{a}})=2sqrt({{a}})'}],
            'correction': {'steps': [
                'Vrai : on ajoute deux fois le même nombre $\\sqrt{{{a}}}$.',
                '$$\\sqrt{{{a}}} + \\sqrt{{{a}}} = 2 \\times \\sqrt{{{a}}} = 2\\sqrt{{{a}}}$$',
            ]},
            'correctChoiceIndex': ['0'],
        },
    ]
    t['test_specs'] += [
        {'expected': {'status': 'correct'}, 'variables': {'a': '3', 'b': '5'},
         'description': 'v2 a=3 b=5 bonne réponse (faux)', 'variationIndex': 2, 'selectedChoices': [1]},
        {'expected': {'status': 'correct'}, 'variables': {'a': '2', 'b': '3'},
         'description': 'v2 a=2 b=3 bonne réponse (faux)', 'variationIndex': 2, 'selectedChoices': [1]},
        {'expected': {'status': 'incorrect'}, 'variables': {'a': '3', 'b': '5'},
         'description': 'v2 mauvaise réponse', 'variationIndex': 2, 'selectedChoices': [0]},
        {'expected': {'status': 'correct'}, 'variables': {'a': '7', 'b': '9'},
         'description': 'v3 a=7 bonne réponse (vrai)', 'variationIndex': 3, 'selectedChoices': [0]},
        {'expected': {'status': 'incorrect'}, 'variables': {'a': '7', 'b': '9'},
         'description': 'v3 mauvaise réponse', 'variationIndex': 3, 'selectedChoices': [1]},
    ]


# ============================================================================
# LE LOT
# ============================================================================

# Une seule part par modèle : toutes les variations, les tags relevés exigés à l'identique, titre et
# sous-titre inchangés (relus dans le relevé).
RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}


def part(court: str, codes: list[str], retouche=None) -> list[tuple]:
    t = RELEVE[court]
    p = (list(range(len(t['variations']))), codes, t['title'], t['description'])
    return [p + ((retouche,) if retouche else ())]


LOT = {
    '0d2edda7': part('0d2edda7', ['2-261'], racines_formes),
    'e02fb162': part('e02fb162', ['TSPE-470'], equation_signe),
    'f796ffc0': part('f796ffc0', ['TSPE-318'], desserts_n_sup_k),
}

ENTETE = """-- ============================================================================
-- Passe lycée, retouches 2 : 3 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
-- Défauts relevés pendant la passe et restés ouverts (inventaire du 2026-10-24) :
--   - e02fb162 V1 : le signe + du terme en x de l'équation (« y′ = 3y9x − 15 ») ;
--   - f796ffc0 V4 : condition n > k (n = k donnait deux choix identiques) ;
--   - 0d2edda7 (publié, 2de) : deux variations, pour que la forme de l'égalité ne donne plus la
--     réponse (√a × √b = √(a + b) faux, √a + √a = 2√a vrai).
-- Ni tag, ni nœud, ni niveau, ni statut ne changent.
-- ============================================================================
-- Décision de David le 2026-10-24 (phase 0 validée). Fichier GÉNÉRÉ par
-- docs/wip/passe-lycee/analyse/lot-retouches-2.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-retouches-2.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-24, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-24 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal sur les 3 modèles).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-24). Aucune règle ne
-- change ; effet visible : les élèves de 2de tirent deux variations de plus dans 0d2edda7 (publié) ;
-- les deux autres sont des brouillons.
--"""


if __name__ == '__main__':
    releve = list(RELEVE.values())
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            migration='supabase/migrations/20261024120000_passe_lycee_retouches_2.sql',
            fixture='tests/integration/fixtures/passe-lycee-retouches-2.json', prefixe='plrt2', entete=ENTETE)

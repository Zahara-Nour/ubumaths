"""Génère la migration de CONTENU du chantier « questions-cm1 », lot 0 (corrections) : 2 modèles
réécrits, sans modèle neuf, qui passent du CM1 au CM2 et reçoivent le tag de leur point CM2. Les
24 autres modèles du lot (niveaux, tags, nœuds, statut, sans contenu) sont dans la migration
suivante, `20261028100100_questions_cm1_rangement_tags.sql`, écrite à la main.

Phase 0 validée par David (2026-10-28, § 5 du journal `docs/wip/questions-cm1-progress.md`) :

- `edc5d7d4` (Trouver la moitié, CM2-037) : impairs de 1 à 15 (aujourd'hui 1 à 29) ;
- `322f3479` (Forme décimale d'une fraction, CM2-039) : liste du point (1/10, 1/100, 1/1 000, 1/2,
  1/4, 3/4, 3/2, 4/2, 5/2), au lieu de 1/2, 1/4, 1/10, 2/10, 3/2, 5/2, 1/100, 2/1000, 7/2, 9/2.

Nœuds inchangés : ceux des deux points (« Décimaux : calculs / division », « Fractions : sens et
écritures / forme décimale »).

Contenu relevé en prod le 2026-10-28 (lecture seule, `releve-prod-cm1.ts`) : empreintes md5 des 26
modèles du lot vérifiées contre le MCP ; 0 tag ; 0 donnée d'élève (srs_cards, skill_attempts,
evaluation_attempt_questions, test_answers, journal_entry_activities, chapter_exercises,
chapter_series, chapter_worksheets, user_favorite_templates).

    python3 docs/wip/questions/lot-corrections-cm1.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/archive/wip/arbre-notions/analyse')
sys.path.insert(0, 'docs/archive/wip/passe-lycee/analyse')
import scissions_outils  # noqa: E402
from scissions_outils import generer  # noqa: E402

# Le générateur du lycée ne connaît que les programmes du lycée.
scissions_outils.GRADES.update({'CM2': 'CM2'})

ETAT = 'docs/wip/questions/etat-prod-2026-10-28/'


# ============================================================================
# OUTILS
# ============================================================================

def spec(reponse: str, statut: str, variables: dict, description: str, variation: int = 0) -> dict:
    s = {'answers': [reponse], 'expected': {'status': statut},
         'variables': {k: str(v) for k, v in variables.items()},
         'description': description, 'variationIndex': variation}
    if statut == 'bad_form':
        s['expected']['constraintViolations'] = ['form']
    return s


# ============================================================================
# RETOUCHES
# ============================================================================

def moitie_impairs_jusqu_a_15(t: dict) -> None:
    v, = t['variations']
    assert v['variables'][0] == {'name': 'a1', 'expression': '0..14'}
    v['variables'][0]['expression'] = '0..7'
    t['description'] = 'Nombres impairs de $1$ à $15$'
    t['test_specs'] = [
        spec('5{,}5', 'correct', {'a1': 5}, 'moitié de 11 = 5,5'),
        spec('5.5', 'correct', {'a1': 5}, '5.5 au point'),
        spec('\\frac{11}{2}', 'bad_form', {'a1': 5}, '11/2 en fraction'),
        spec('5', 'incorrect', {'a1': 5}, 'Erreur : la moitié de 10 au lieu de celle de 11'),
        spec('0{,}5', 'correct', {'a1': 0}, 'borne : moitié de 1 = 0,5'),
        spec('7{,}5', 'correct', {'a1': 7}, 'borne : moitié de 15 = 7,5'),
        spec('7', 'incorrect', {'a1': 7}, 'Erreur : la moitié de 14 au lieu de celle de 15'),
    ]


# Explications par fraction, repérées par 1000 × a (exact) : texte, puis calcul.
P0 = '\\\\textcolor{{{color:primary.0}}}'
P1 = '\\\\textcolor{{{color:primary.1}}}'
SANS_UNITE = ' Il n\'y a pas d\'unités : on écrit $0$ avant la virgule.'
ZEROS = (' Il manque des chiffres entre la virgule et ce rang : on les remplace par des'
         f' ${P1}{{0}}$.')


def par_5(n: int) -> tuple[str, str]:
    """Un nombre de demis n/2, ramené à des dixièmes (× 5)."""
    texte = (f'Le dénominateur $2$ n\'est pas $10$, $100$ ou $1000$. Comme $2 \\\\times {P1}{{5}} = 10$, '
             f'on multiplie le numérateur et le dénominateur par ${P1}{{5}}$. Le dénominateur est '
             f'${P1}{{10}}$ : ')
    if n == 1:
        texte += (f'le chiffre ${P0}{{5}}$ se place au rang des ${P1}{{\\\\text{{dixièmes}}}}$.'
                  + SANS_UNITE)
    else:
        texte += (f'le dernier chiffre de ${5 * n}$, ${P0}{{5}}$, se place au rang des '
                  f'${P1}{{\\\\text{{dixièmes}}}}$.')
    calcul = (f'$$\\\\begin{{align}} \\\\dfrac{{{n}}}{{2}} &= \\\\dfrac{{{n} \\\\times {P1}{{5}}}}'
              f'{{2 \\\\times {P1}{{5}}}} \\\\\\\\ &= \\\\dfrac{{{5 * n}}}{{10}} \\\\\\\\ &= {{{{solution}}}} '
              f'\\\\end{{align}}$$')
    return texte, calcul


def decimale(den: int, rang: str) -> tuple[str, str]:
    """1/10, 1/100, 1/1000 : le chiffre 1 au rang du dénominateur."""
    texte = (f'Le dénominateur est ${P1}{{{den}}}$ : le chiffre ${P0}{{1}}$ se place au rang des '
             f'${P1}{{\\\\text{{{rang}}}}}$.' + SANS_UNITE + (ZEROS if den > 10 else ''))
    calcul = f'$$\\\\begin{{align}} \\\\dfrac{{1}}{{{den}}} &= {{{{solution}}}} \\\\end{{align}}$$'
    return texte, calcul


def quarts(n: int) -> tuple[str, str]:
    """1/4 et 3/4, ramenés à des centièmes (× 25)."""
    texte = (f'Le dénominateur $4$ n\'est pas $10$, $100$ ou $1000$. Comme $4 \\\\times {P1}{{25}} = 100$, '
             f'on multiplie le numérateur et le dénominateur par ${P1}{{25}}$. Le dénominateur est '
             f'${P1}{{100}}$ : le dernier chiffre de ${25 * n}$, ${P0}{{5}}$, se place au rang des '
             f'${P1}{{\\\\text{{centièmes}}}}$.' + SANS_UNITE)
    calcul = (f'$$\\\\begin{{align}} \\\\dfrac{{{n}}}{{4}} &= \\\\dfrac{{{n} \\\\times {P1}{{25}}}}'
              f'{{4 \\\\times {P1}{{25}}}} \\\\\\\\ &= \\\\dfrac{{{25 * n}}}{{100}} \\\\\\\\ &= {{{{solution}}}} '
              f'\\\\end{{align}}$$')
    return texte, calcul


# 4/2 n'a pas de partie décimale : deux demis font une unité.
QUATRE_DEMIS = (
    'Deux demis font une unité, donc quatre demis font $2$ unités : $\\\\dfrac{4}{2}$ est le nombre '
    'entier $2$, sans virgule.',
    '$$\\\\begin{align} \\\\dfrac{4}{2} &= 4 \\\\div 2 \\\\\\\\ &= {{solution}} \\\\end{align}$$',
)

FRACTIONS = {
    '1/10': (100, decimale(10, 'dixièmes')),
    '1/100': (10, decimale(100, 'centièmes')),
    '1/1000': (1, decimale(1000, 'millièmes')),
    '1/2': (500, par_5(1)),
    '1/4': (250, quarts(1)),
    '3/4': (750, quarts(3)),
    '3/2': (1500, par_5(3)),
    '4/2': (2000, QUATRE_DEMIS),
    '5/2': (2500, par_5(5)),
}


def fractions_usuelles(t: dict) -> None:
    v, = t['variations']
    assert v['variables'][0] == {'name': 'a', 'expression': '1/2|1/4|1/10|2/10|3/2|5/2|1/100|2/1000|7/2|9/2'}
    v['variables'][0]['expression'] = '|'.join(FRACTIONS)
    # Le JSON relevé échappe les antislashs une fois : les gabarits ci-dessus les doublent pour
    # rester lisibles à côté du relevé ; on les ramène à un seul.
    def un(s: str) -> str:
        return s.replace('\\\\', '\\')
    texte = ''.join(f'{{{{if:1000*a={k}|{un(x)}|}}}}' for k, (x, _) in FRACTIONS.values())
    calcul = ''.join(f'{{{{if:1000*a={k}|{un(c)}|}}}}' for k, (_, c) in FRACTIONS.values())
    methode = v['correction']['steps'][0]
    assert methode.startswith('**Fraction décimale.**')
    v['correction']['steps'] = [methode, texte, calcul]
    t['test_specs'] = [
        spec('0.1', 'correct', {'a': '1/10'}, 'un dixième'),
        spec('0{,}01', 'correct', {'a': '1/100'}, 'un centième, virgule'),
        spec('0.001', 'correct', {'a': '1/1000'}, 'un millième'),
        spec('0.01', 'incorrect', {'a': '1/1000'}, 'Erreur : millième au rang des centièmes'),
        spec('0.5', 'correct', {'a': '1/2'}, 'un demi'),
        spec('1.2', 'incorrect', {'a': '1/2'}, 'Erreur : 1/2 = 1,2'),
        spec('0.25', 'correct', {'a': '1/4'}, 'un quart'),
        spec('0.4', 'incorrect', {'a': '1/4'}, 'Erreur : 1/4 = 0,4'),
        spec('0{,}75', 'correct', {'a': '3/4'}, 'trois quarts, virgule'),
        spec('3.4', 'incorrect', {'a': '3/4'}, 'Erreur : 3/4 = 3,4'),
        spec('1.5', 'correct', {'a': '3/2'}, 'trois demis'),
        spec('2', 'correct', {'a': '4/2'}, 'quatre demis = 2'),
        spec('4.2', 'incorrect', {'a': '4/2'}, 'Erreur : 4/2 = 4,2'),
        spec('2.5', 'correct', {'a': '5/2'}, 'cinq demis'),
        spec('\\frac{1}{4}', 'bad_form', {'a': '1/4'}, 'recopie de la fraction'),
    ]


# ============================================================================
# LE LOT
# ============================================================================

# Une seule part par modèle : toutes les variations, le tag du point CM2 posé (aucun tag relevé),
# titre relu dans le relevé ; le sous-titre change dans la retouche.
RELEVE = {t['id'][:8]: t for t in json.load(open(ETAT + 'templates.json'))}
CONTENU = ('322f3479', 'edc5d7d4')


def part(court: str, codes: list[str], retouche) -> list[tuple]:
    t = RELEVE[court]
    return [(list(range(len(t['variations']))), codes, t['title'], t['description'], retouche)]


LOT = {
    '322f3479': part('322f3479', ['CM2-039'], fractions_usuelles),
    'edc5d7d4': part('edc5d7d4', ['CM2-037'], moitie_impairs_jusqu_a_15),
}

ENTETE = """-- ============================================================================
-- Chantier « questions-cm1 », lot 0 (corrections) : 2 modèles corrigés, passés du CM1 au CM2
-- ============================================================================
--   - edc5d7d4 (Trouver la moitié) : impairs de 1 à 15 (au lieu de 29), niveau CM2, tag CM2-037 ;
--   - 322f3479 (Forme décimale d'une fraction) : les fractions du point (1/10, 1/100, 1/1 000, 1/2,
--     1/4, 3/4, 3/2, 4/2, 5/2), niveau CM2, tag CM2-039.
-- Nœuds inchangés. Les 24 autres modèles du lot (niveaux, tags, nœuds, statut) sont dans la
-- migration suivante (20261028100100_questions_cm1_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm1-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-cm1.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/questions-cm1-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et ne porter aucun tag.
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice, série ou fiche de chapitre,
-- 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-28). Aucune règle ne
-- change ; effet visible : les 2 modèles, publiés, quittent le CM1 pour le CM2, où leurs élèves
-- tirent les nouvelles variables et lisent le nouveau corrigé.
--"""


if __name__ == '__main__':
    releve = [RELEVE[c] for c in CONTENU]
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris={},
            grades_apres={'322f3479': ['CM2'], 'edc5d7d4': ['CM2']},
            migration='supabase/migrations/20261028100000_questions_cm1_contenu.sql',
            fixture='tests/integration/fixtures/questions-cm1-contenu.json', prefixe='qcm1', entete=ENTETE)

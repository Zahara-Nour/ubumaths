import csv, json, sys, collections, os
sys.path.insert(0, os.path.dirname(__file__))
from data import GENERAL, P
from questions import QUESTIONS

ROOT = "/Users/david/Coding/js/ubumaths-wt-passe-lycee/docs/wip/passe-lycee/bornes"
rows = [r for r in csv.DictReader(open(f"{ROOT}/points-lycee.csv")) if r["grade"] == "T_COMP"]
rows.sort(key=lambda r: int(r["ordre"]))
codes = [r["code"] for r in rows]
missing = [c for c in codes if c not in P]
extra = [c for c in P if c not in codes]
assert not missing and not extra, (missing, extra)

ASPECTS = {"nombres", "format", "operandes", "faits", "figures", "unites", "fonctions", "autre"}
points = {}
for r in rows:
    bornes, rem = P[r["code"]]
    for b in bornes:
        assert b["aspect"] in ASPECTS and b["force"] in ("BO", "déduite"), b
    if any(b["force"] == "déduite" for b in bornes):
        assert rem and "déduite" in rem, r["code"]
    e = {"libelle": r["libelle"], "rubrique": r["rubrique"], "bornes": bornes}
    if rem:
        e["remarque"] = rem
    points[r["code"]] = e

out = {"T_COMP": {"general": GENERAL, "points": points}}
json.dump(out, open(f"{ROOT}/tcomp.json", "w"), ensure_ascii=False, indent=2)
open(f"{ROOT}/tcomp.json", "a").write("\n")
json.dump(QUESTIONS, open(f"{ROOT}/questions-tcomp.json", "w"), ensure_ascii=False, indent=2)
open(f"{ROOT}/questions-tcomp.json", "a").write("\n")

# ---- Markdown
n_avec = sum(1 for e in points.values() if e["bornes"])
forces = collections.Counter(b["force"] for e in points.values() for b in e["bornes"])
forces_g = collections.Counter(b["force"] for b in GENERAL)


def ligne_borne(b, indent="  "):
    return f"{indent}- {b['borne']} — _{b['source']}_ ({b['force']})"


md = []
md.append("# Bornes des points de Terminale, mathématiques complémentaires (T_COMP)\n")
md.append(f"Objectif : pour chaque point de programme actif de l'option mathématiques complémentaires (`grade` = `T_COMP`), dire jusqu'où vont les questions générées (« seulement »), pour juger ensuite qu'un modèle reste entièrement dans le point. {len(rows)} points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22). Données : `tcomp.json` ; incertitudes : `questions-tcomp.json` (`ltc-N`).\n")
md.append("## Sources et façon de citer\n")
md.append("| Abréviation | Document | Page citée |")
md.append("| --- | --- | --- |")
md.append("| **BO Tle compl.** | Programme de l'option de mathématiques complémentaires de terminale, BO n° 14 du 2026-04-02 (`bo/tcomp.txt`) | page du PDF |")
md.append("| **BO 1re spé** | Programme de spécialité de 1re, programme suivi l'année précédente (`bo/1spe.txt`), cité seulement pour l'héritage | page du PDF |")
md.append("| **BO 2de** | Programme de 2de (`bo/2de.txt`), cité seulement pour l'héritage | page du PDF |")
md.append("")
md.append("**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point, ou dans la borne même pour les bornes générales). Aucun document d'accompagnement n'est disponible pour ce programme : aucun n'est cité.\n")
md.append("Le programme a deux volets : neuf **thèmes d'étude** (au moins six traités, problèmes « possibles », non exhaustifs) et les **contenus et capacités attendues**, qui font la borne. Un thème ne sert de source que lorsqu'il précise un contenu (formule de Bayes, rang du premier succès de la loi géométrique, formes des intervalles de fluctuation, déciles). Le reste des thèmes (Lorenz, Gini, tests médicaux, Verhulst…) est en question (ltc-7).\n")
md.append("## Ce qui est le plus utile pour la vérification « seulement »\n")
md += [
    "- **Fonctions** : six fonctions de référence (carré, cube, racine carrée, inverse, exp, ln), plus les polynômes de 1re spé ; **pas de cos ni de sin** comme fonctions.",
    "- **Dérivées** : opérations de 1re spé et **seules compositions f(ax + b), e^{u}, ln u, u²** ; pas de √u (u non affine), pas de uⁿ (n ⩾ 3).",
    "- **Primitives** : dérivées connues lues à l'envers et **formes 2uu', e^{u}u', u'/u** seulement (u > 0, pas de ln |u|).",
    "- **Limites** : approche intuitive ; limites des fonctions de référence et opérations admises ; **pas de croissances comparées au BO** (ltc-1) ; asymptotes horizontales et verticales seulement.",
    "- **Suites** : limite d'une suite géométrique de **raison positive** seulement ; somme pour 0 ⩽ q < 1 ; arithmético-géométriques par la solution constante (limite seulement si a ⩾ 0, lecture déduite).",
    "- **Logarithme** : réciproque de exp, sur ]0, +∞[ ; ln(ab), ln(1/a), ln(qⁿ) = n ln q ; seuil par ln.",
    "- **Équations différentielles** : résolution de y' = ay et y' = ay + b seulement ; non linéaire (logistique) admise en vérification, sans connaissance exigible ; ordre 2 en question (ltc-6).",
    "- **Intégrale** : définie pour f continue positive sur [a, b] (aire) ; signe quelconque en présentation ; calcul par F(b) − F(a) avec les primitives du programme.",
    "- **Lois** : uniforme discrète, Bernoulli, binomiale, géométrique (rang du premier succès, k ⩾ 1) ; uniforme sur [a, b], exponentielle (espérance, pas de variance) ; **pas de loi normale** ; coefficients binomiaux par le triangle de Pascal, **pas de formule factorielle** ; binomiale calculée à la calculatrice (ltc-2).",
    "- **Statistique à deux variables** : point moyen, droite des moindres carrés (calculatrice, logiciel ou calcul), changement de variable vers l'affine ; coefficient de corrélation sans capacité de calcul (ltc-4).",
    "- **Notations** : Σ pour écrire, jamais pour calculer ; ∀ et ∃ non exigibles.",
    "",
]
md.append("## Ce qui change par rapport à la 1re spécialité\n")
md += [
    "1. **Schéma de Bernoulli** : la 1re spé se limitait à n ⩽ 4 ; la Tle compl. ne borne plus n (lecture déduite).",
    "2. **Logique** : la liste de Tle compl. est plus courte (négation sans quantificateurs, ni contraposée ni condition nécessaire / suffisante) que celle de la 1re spé ; contradiction apparente avec l'héritage, en question (ltc-10).",
    "3. **Limites** : la 1re spé ne faisait que conjecturer la limite d'une suite ; la Tle compl. ajoute les opérations (admises), le passage à la limite dans les inégalités, les gendarmes, les limites de fonctions, toujours sans formalisation.",
    "4. **Fonctions** : ln s'ajoute ; aucune fonction trigonométrique n'arrive.",
    "",
]
md.append("## Questions en attente\n")
for q in QUESTIONS:
    md.append(f"- **{q['id']}** — {q['titre']} ({', '.join(q['points'])}) : recommandation « {q['reco']} ».")
md.append("")
md.append(f"## Terminale, mathématiques complémentaires ({len(rows)} points, {n_avec} avec une borne propre)\n")
md.append(f"Bornes : {forces['BO']} `BO` et {forces['déduite']} `déduite` sur les points ; {forces_g['BO']} `BO` et {forces_g['déduite']} `déduite` en bornes générales.\n")
md.append("### Bornes générales (héritées par tous les points)\n")
md.append("Ce qui vient de la 2de et de la 1re spécialité n'est pas recopié, sauf lorsque la Tle compl. le change.\n")
for b in GENERAL:
    md.append(ligne_borne(b, ""))
md.append("")
rub = None
for r in rows:
    e = points[r["code"]]
    if r["rubrique"] != rub:
        rub = r["rubrique"]
        md.append(f"\n### {rub}\n")
    lib = r["libelle"].rstrip(".")
    if e["bornes"]:
        md.append(f"- **{r['code']}** — {lib}.")
        for b in e["bornes"]:
            md.append(ligne_borne(b))
    else:
        md.append(f"- **{r['code']}** — {lib}. — _hérite des bornes générales_")
    if e.get("remarque"):
        md.append(f"  - ⚠ {e['remarque']}")
md_text = "\n".join(md).replace("\n\n\n", "\n\n") + "\n"
open(f"{ROOT}/tcomp.md", "w").write(md_text)

print("points", len(points), "avec borne", n_avec, "sans", len(points) - n_avec)
print("forces points", dict(forces), "general", dict(forces_g))
print("questions", len(QUESTIONS))
# questions : vérifier les points cités
for q in QUESTIONS:
    for c in q["points"]:
        if c.startswith("TCOMP") and c not in points:
            print("point inconnu", q["id"], c)
    assert 2 <= len(q["options"]) <= 3 and q["reco"] in [o[0] for o in q["options"]]

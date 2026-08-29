# Handoff — Référentiel famille A (6ᵉ) — décision modèle en suspens

> ⚠️ **Clos.** La décision en suspens a été tranchée (modèle B, 18 items × 4
> capacités), puis la famille A elle-même a disparu à la fusion du 2026-08-29 :
> ses capacités vivent maintenant dans `curriculum_points`, avec un `rang`
> facultatif qui rend le « exactement 4 » optionnel. Rien à reprendre ici. Cf.
> [`refonte-referentiel-progress.md`](refonte-referentiel-progress.md).

> **Créé le** : 2026-06-07
> **Origine** : session de discussion sur la structure de `6e-savoirs.md` (famille A — Connaissances et savoir-faire) qui s'est étendue trop longtemps. Document pour redémarrer proprement dans une nouvelle session.

---

## Ce qui est acté

1. **Source : BO 2026 cycle 3** (PDF dans `~/Downloads/programme-de-math-matiques-pour-le-cycle-3-439827 (1).pdf`, extrait dans `/tmp/cycle3-new.txt`).
2. **Champ `rubrique` ajouté à `skills`** (`'automatisme' | 'capacite_attendue'`, nullable, famille A uniquement). Cf. design doc décision 56 et historique 2026-06-07 (suite 17).
3. **Famille B** (6 compétences mathématiques) reste **intacte**. Le pivot ne concerne que la famille A.

## Question vivante — choix du modèle famille A

Deux modèles en compétition. **Aucun n'est validé.**

### Modèle A — « 4 paliers par capacité » (modèle actuel du design doc)

- Hiérarchie : Thème → Objectif → **Capacité**
- Une capacité a 4 paliers d'**indicateurs** (`level_indicators` JSONB)
- 3-6 capacités par objectif
- Question taguée avec `skill_id` ET `target_level` (1-4)
- Cible : 15-25 objectifs sur 6ᵉ

**Problème identifié** : la calibration des 4 paliers d'une même capacité est souvent artificielle (les paliers finissent par être 4 capacités distinctes empilées). Volume de rédaction énorme : ~500 indicateurs pour la 6ᵉ.

### Modèle B — « 4 capacités ordonnées par item » (style PDF 2016 de David)

- Hiérarchie : Catégorie → **Item** (= objectif côté élève)
- Un item a **4 capacités distinctes ordonnées par difficulté** (le « niveau » est une capacité, pas un palier)
- Saisie binaire : capacité maîtrisée ou pas
- Question taguée avec `skill_id` **seul** (pas de `target_level`)
- État de l'item = plus grande capacité maîtrisée
- Cible : ~20 items × 4 = ~80 capacités à rédiger
- **Niveau 3 = « objectif pour chacun »**, **Niveau 4 = « expert »**

**Recommandation de la session précédente** : **modèle B**, pour la simplicité, la clarté côté élève, le volume réaliste de rédaction, et le branchement direct des Questions UbuMaths sans calibration subjective.

**Décision attendue de David** : valider ou pas le modèle B.

## Documents de référence à relire avant de redémarrer

1. **`~/Google Drive/Réorganisation/Evaluations/echelles descriptives connaissance 6 2016.pdf`** — référentiel personnel de David (2016), modèle visuel/pédagogique du modèle B. **Tableau 4 colonnes × ~15 items**, intitulés très simples (« Comparer deux nombres décimaux »).
2. **`docs/wip/skills-referentiel-design.md`** — design doc actuel. Sections clés :
   - **§1** : hiérarchies, vocabulaire fixé, **cible 15-25 objectifs / 3-6 capacités par objectif** (cible actée, contraignante).
   - **§3** : régimes d'évaluation famille A (échelle 1-4 sur capacité) et famille B (cadre canonique).
   - **§6.1, §6.3** : algorithmes de calcul du niveau atteint et de l'état d'un objectif.
   - **§7** : schéma DB (avec champ `rubrique` ajouté).
   - **§8** : UI élève actée (dashboard 2 sections, vue détail objectif).
   - **§10 décision 56** + **§14 historique 2026-06-07** : adoption BO 2026 + rubrique.
3. **`docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md`** — cadre canonique famille B (à ne pas toucher).
4. **`docs/wip/referentiel/6e-savoirs.md`** — état actuel = trame BO 2020 (commit `0de2860c0`). **Ancienne version BO 2020 — à refondre selon modèle choisi.**

## Impact sur le design doc si modèle B retenu

À patcher :

- **§1 hiérarchie** : Thème/Objectif/Capacité → Catégorie/Item, avec 4 capacités internes ordonnées.
- **§3 famille A** : abandonner « 4 paliers par capacité » au profit de « 4 capacités binaires ordonnées par item ».
- **§6.1 algorithme** : simplifier (capacité acquise ssi ≥ 3 success ; niveau item = max capacité acquise).
- **§6.3 état objectif** : lecture directe, plus d'agrégation 80 %.
- **§7 schéma DB** :
  - `skills.level_indicators` JSONB → **supprimer**
  - `skills.is_progressive` → **supprimer**
  - `skill_attempts.target_level` → **supprimer**
  - `skills.display_order` ∈ {1,2,3,4} = le niveau de l'item
- **§8 UI élève** : vue détail item = tableau 4 colonnes style PDF 2016.

## Branchement Questions ↔ Référentiel

Dans modèle B, chaque question (template) est taguée avec **un seul `skill_id`** (la capacité qu'elle teste). Quand l'élève réussit → `INSERT skill_attempt(skill_id, success=true)`. Pas de calibration `target_level`. C'est **l'argument décisif** : le tagging des milliers de questions existantes devient un acte objectif et non subjectif.

## Liste d'items proposée (à valider et affiner)

Si modèle B retenu, structure proposée (~20-22 items) :

**Numérique (~10 items)** — Calcul mental ⚡, Nombres entiers, Nombres décimaux, Fractions, Pourcentages, Calcul posé, Représenter des données, Proportionnalité, Probabilités (BO 2026 nouveau), Pensée pré-algébrique (BO 2026 nouveau)

**Géométrie (4-5 items)** — Lexique et reconnaissance ⚡, Constructions, Symétrie, Distances/cercles/médiatrice, Angles et triangles

**Mesures et grandeurs (4-5 items)** — Longueurs, Aires, Volumes, Durées, Angles (mesure)

**Pensée informatique (1 item)** — Programmer (BO 2026 nouveau)

⚡ = item entièrement « automatismes » (régime drill/restitution rapide).

## Première chose à faire dans la prochaine session

1. Relire ce handoff + le PDF 2016 (`~/Google Drive/Réorganisation/Evaluations/...`) + design doc §1 et §3 actuel.
2. **Demander confirmation à David** : modèle B (4 capacités ordonnées) ou modèle A (4 paliers) ?
3. Si modèle B : patcher le design doc dans l'ordre §1 → §3 → §6 → §7 → §8 → §14, puis réécrire `6e-savoirs.md` (court : ~20 items × 4 capacités + rubrique sur chaque).
4. Si modèle A : valider la cible 15-25 objectifs et la structure des objectifs, puis commencer la rédaction des indicateurs (mais le volume sera énorme).

## Ne PAS refaire dans la nouvelle session

- Re-débattre L vs G vs hybride — c'est tranché : la cible 3-6 capacités/objectif rendait Option L invalide.
- Re-proposer la structure 25 objectifs Option L littérale — invalidée.
- Re-écrire `6e-savoirs.md` au format BO 2026 littéral (la version a été révertée pour cette raison).

---

**TL;DR** : adopter le modèle 2016 simple. Patcher le design doc. Écrire ~20 items × 4 capacités. Tagger les questions avec `skill_id` seul.

# Chantier `bilan-controle` — bilan d'un contrôle par question et par notion (P6)

Ouvert le 2026-11-13. Besoin P6 validé par David le 2026-11-11
([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de suivi
validés ») ; David : « go pour P6 ». Phase 0 : **rien de codé**.

## Reprendre ici

_Mis à jour le 2026-11-14, PR #2621 ouverte, revues traitées._

- **État** : codé, testé, doc à jour ; revues faites (sécurité : rien de bloquant ; code : prémisse de Q2 fausse → Q2 retranchée, lecture par lots) · **Prochaine action** : CI verte → merge #2621, puis archiver le journal (fin de chantier) · **En attente de David** : rien · **Pièges en cours** : 0 copie de contrôle en prod (tout se prouve sur fixtures) · **Worktree / branche** : `../ubumaths-wt-bilan-controle` · `feat/bilan-controle`

## Constats vérifiés (2026-11-13)

- **Page résultats du prof** : `/dashboard/teacher/assessments/[id]/results` — 4 cartes (assignés,
  terminés, moyenne des meilleures notes, en attente) + tableau élève × (statut, meilleure note,
  tentatives). `getEvaluationResults` / `computeEvaluationStatistics` (`src/lib/server/evaluations.ts`),
  mode test respecté. **Rien par question ni par notion.**
- **Copie** : `test_sessions` (une tentative, `evaluation_id`) → `test_answers` (une ligne par
  question : `template_id`, `status` ∈ correct / unoptimal_form / bad_form / incorrect / empty,
  `points` 1 / ½ / 0, `user_answer`). Position rangée dans `question_instance`. Copie en retard :
  note 0, **aucune réponse** écrite.
- **Le prof lit déjà** `test_answers` de ses élèves (`test_answers_select_teacher`,
  `is_my_student`) ; `evaluation_attempt_questions` = service seul (pas nécessaire ici).
- **Question = ligne de la série** = un modèle × quantité (ADR 0035) : un modèle peut être tiré
  plusieurs fois dans une copie.
- **Notion** : modèle → points (`question_template_points`) → sous-notion (`curriculum_points.node_id`)
  → notion (`classification_nodes.parent_id`). En prod : 145 modèles sur 2 213 ont plusieurs points.
- **Prod (2026-11-13)** : 1 contrôle publié, **0 copie rendue**.

## Comportements proposés — à valider

### Nominal

- **N1** Sur la page résultats, une section **« Bilan par question »** sous les cartes : une ligne
  par question de la série (ordre de la composition), avec le titre du modèle, le **taux de
  réussite** (points obtenus / points possibles, en %) et la répartition **juste / partiel / faux /
  sans réponse** (en nombres de réponses).
- **N2** Une section **« Bilan par notion »** : une ligne par notion (branche › notion), taux de
  réussite sur toutes les réponses aux questions de cette notion ; triée du plus faible au plus fort.
- **N3** Les taux portent sur **une copie par élève** (cf. Q1), copies rendues seulement.
- **N4** Mode test respecté (comme le reste de la page).

### Limites

- **L1** Aucune copie rendue → les deux sections disent « Pas encore de copie rendue », pas de 0 %.
- **L2** Modèle tiré plusieurs fois → ses réponses s'additionnent sur sa ligne.
- **L3** Modèle rattaché à plusieurs notions → il compte dans **chacune** (cf. Q3) ; modèle sans
  point → ligne « Sans notion ».
- **L4** Copie en retard (note 0, aucune réponse) → hors du bilan par question (rien à compter),
  dite à part : « 1 copie rendue en retard, non comptée ».
- **L5** Question d'une copie retirée de la série depuis (série verrouillée : ne devrait pas arriver)
  → comptée sous son modèle quand même.

### Erreurs

- **E1** Lecture en échec → message d'erreur dans la section, jamais un bilan vide ou faux (la page
  garde ses cartes et son tableau).

## Questions tranchées (David, 2026-11-13 : « je valide » — toutes les recos)

- **Q1 — Quelle copie compte ?** (a) **la meilleure de chaque élève** (même règle que la note et la
  moyenne affichées) · (b) la première (ce que l'élève savait sans s'entraîner) · (c) toutes.
  **Reco : a.**
- **Q2 — Partiel** ⚠️ **retranchée le 2026-11-14** : la prémisse était fausse (`bad_form` vaut
  **0** point, `pointsOfStatus`, seul `unoptimal_form` vaut ½ ; trouvé par la revue de code).
  David : « ok pour 2 » → **partiel = forme non optimale seulement ; mauvaise forme comptée en
  « faux »** (chaque colonne a ses points ; le détail de la forme relève de P4). Énoncé d'origine :
  `unoptimal_form` / `bad_form` rapportent ½ point. Les montrer en « partiel »
  (une colonne) — **reco** — ou les détailler (forme non optimale / mauvaise forme) ?
- **Q3 — Modèle à plusieurs notions** : (a) compté dans chacune — **reco** (le taux d'une notion dit
  « les questions qui la travaillent ») · (b) seulement dans la première.
- **Q4 — Clic sur une question** : rien dans ce chantier (les réponses des élèves = P4 erreurs
  fréquentes, chantier à part) — **reco** — ou déjà la liste des élèves qui l'ont ratée ?
- **Q5 — Livraison** : une seule PR, **sans migration** (tout se lit avec le client du prof, RLS
  existante). Question d'accès : **personne** ne lit rien de plus.

## Tests prévus

Calcul pur (meilleure copie, partiels, modèle répété, plusieurs notions, sans notion, retard, aucune
copie) ; lecture (mock : tables lues, mode test) ; composant (L1, E1, tri des notions) ;
intégration (le prof lit `test_answers` d'un contrôle de ses élèves, pas d'erreur RLS silencieuse).
Revue : `code-reviewer` + `security-auditor` (données d'élèves).

## Implémentation (2026-11-13)

- `src/lib/server/evaluation-breakdown.ts` : `computeEvaluationBreakdown` (pur) + `getEvaluationBreakdown`
  (lecture, client du prof ; jamais d'exception : `{ status: 'error' }`). Types partagés :
  `src/lib/types/evaluation-breakdown.ts`. Composant `EvaluationBreakdown.svelte` sous les cartes.
- Choix d'implémentation non écrits en phase 0 : à note égale, une copie **avec réponses** l'emporte
  (sinon une copie en retard à 0 masquerait une vraie copie à 0), puis la plus récente ; point posé
  directement sur une notion → cette notion ; point posé sur une branche → « Sans notion » ; nœuds
  archivés gardés (bilan d'un contrôle passé) ; modèle supprimé → ligne « Modèle supprimé ».
- Réponses lues par pages de 1 000 (`max_rows` PostgREST) : 30 élèves × 3 copies × 40 questions dépasse.
- Preuve rouge : tests du calcul et du loader rouges sans le code (module absent, loader de `main`).
- Revues (2026-11-14) : `security-auditor` sans finding bloquant ; `code-reviewer` → Q2 (ci-dessus)
  et lecture des copies / réponses par lots de 100 identifiants, chaque lot paginé.

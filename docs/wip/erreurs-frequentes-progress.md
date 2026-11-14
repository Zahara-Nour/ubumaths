# Chantier `erreurs-frequentes` — erreurs fréquentes d'une question / d'un point (P4, E4)

Ouvert le 2026-11-14. Besoins P4 (prof) et E4 (élève) validés par David le 2026-11-11
([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de suivi
validés ») ; suite directe de P6 ([`bilan-controle-progress.md`](../archive/wip/bilan-controle-progress.md),
Q4 : « clic sur une question = P4 »). David : « ok pour P4 / E4 ».

## Reprendre ici

_Mis à jour le 2026-11-14, PR 2 en cours._

- **État** : PR 1 mergée (#2626, pas en prod). PR 2 (erreurs par point, widget « Top à remédier ») : plan écrit (§ PR 2), Q6/Q7 tranchées (séries + contrôles ; anciennes séries libres exclues) · **Prochaine action** : tests rouges du serveur `point-errors.ts`, puis implémentation · **En attente de David** : vérification à l'écran #2626 (`verifications-manuelles.md`) · **Pièges en cours** : prod sans aucune donnée pour la PR 2 (0 trace avec réponse, 0 copie de contrôle) : tester sur la base locale ; comptes = statut seul, comme le bilan · **Worktree / branche** : `../ubumaths-wt-erreurs-frequentes`, `feat/erreurs-frequentes-par-point`

## Ce qui existe (vérifié le 2026-11-14)

- **Contrôles** : `test_answers` garde, par question, l'**énoncé tiré entier** (`question_instance`, réponses
  attendues comprises), la réponse de l'élève case par case (`user_answer.value`), `is_correct`, `points`,
  `status` (juste / partiel / faux / sans réponse). Pas de verdict par case stocké : il est recalculé à la
  relecture d'une copie (`readSubmittedCopy`). Chaque élève a **sa** graine : les valeurs diffèrent d'un élève
  à l'autre.
- **Séries** (Saisie, Contrôle blanc, Course) : `skill_attempts.answer_parts` + `part_verdicts` + `seed`
  (ADR 0038). Flash-cards et révisions : rien de tapé, donc rien à montrer.
- **Bilan P6** (`getEvaluationBreakdown`, `EvaluationBreakdown.svelte`) : une ligne par modèle ; clic = rien.
- Décision déjà prise (2026-11-11) : les erreurs fréquentes d'une **série** ne regroupent que les traces
  **postérieures à la dernière modification du modèle** (graine + modèle modifié = relecture fausse).

## Le problème de fond

Les tirages sont aléatoires : deux élèves ratent « la même » question avec des nombres différents. Regrouper
les réponses fausses **identiques** n'a donc de sens qu'à énoncé identique. Deviner le **type** d'erreur
(signe, oubli du carré…) serait un autre chantier (moteur mathAST) : hors périmètre.
Ce qui reste comparable d'un tirage à l'autre : **quelle case** est ratée, et chaque réponse lue **face à
son énoncé**.

## Phase 0 — comportements proposés

### PR 1 — prof, bilan d'un contrôle : clic sur une question

- **Nominal** : sur la page résultats d'un contrôle, chaque ligne « par question » du bilan s'ouvre. On y voit :
  1. **cases ratées** (question à plusieurs cases) : « case 1 : 2 erreurs sur 12 · case 2 : 9 sur 12 » ;
  2. **les réponses fausses ou partielles**, une par copie comptée (même règle que P6 : meilleure copie) :
     l'énoncé tiré (rendu comme à l'élève), la réponse attendue, la réponse de l'élève (texte échappé, la case
     ratée marquée), le nom de l'élève ;
  3. réponses **identiques à énoncé identique** regroupées : « 3 élèves ont répondu 12 ».
- **Limites** : question juste pour tous → « Aucune erreur sur cette question. » ; « sans réponse » compté à
  part, sans ligne vide ; QCM / ranger / figure à compléter : le choix de l'élève lu comme à la correction
  (libellé du choix, ordre affiché), la figure seulement par son verdict ; modèle sorti de la série : s'ouvre
  aussi ; **mode test** suivi comme dans P6.
- **Erreur** : lecture en échec → le panneau le dit, le reste de la page reste.
- **Pas de mode projection** sur la page résultats (vérifié) : rien à masquer de plus que P6.

### PR 2 — prof, par point du programme (analytique de la classe)

- **Nominal** : depuis « Top à remédier » (widget E, fenêtre des élèves concernés), un onglet « Erreurs » :
  pour chaque modèle du point, mêmes blocs que la PR 1, à partir des **traces de séries** (Saisie, Contrôle blanc,
  Course) **et** des réponses de contrôle de la classe.
- **Limites** : traces antérieures à la dernière modification du modèle écartées (déjà décidé) ; aucune réponse
  tapée → « Pas encore de réponse écrite sur ce point (les flash-cards ne gardent pas de réponse). »
- **Erreur** : comme la PR 1.

### PR 3 — élève, « mes erreurs récurrentes » (E4)

- **Nominal** : une liste des modèles que l'élève **rate encore** : au moins 2 échecs, dont le **dernier essai**
  raté. Pour chacun : son dernier énoncé raté, sa réponse face à la bonne, un bouton « M'entraîner » vers ce
  modèle. Un modèle réussi au dernier essai sort de la liste.
- **Limites** : aucune comparaison avec la classe, aucun compte d'échecs affiché (« à revoir », pas
  « raté 7 fois »), aucune notification ; réponses de contrôle comprises seulement après la date limite ou
  quand la copie est consultable.
- **Erreur** : lecture en échec → message, la page reste.

## Décisions de David (2026-11-14)

- **PR 3 (E4) retirée** : doublon de la révision espacée (un modèle raté revient en révision et en sort
  réussi = E2, qui existe) et de la correction immédiate (Saisie retourne la carte, contrôle = copie corrigée).
  E4 est tenu pour couvert.
- **Q1** : PR 1 (contrôles) puis PR 2 (par point). **Q2** : nominatif côté prof. **Q3** : regroupement des
  réponses identiques à énoncé identique seulement, le reste une par une. Q4, Q5 : sans objet.

## PR 1 — plan technique (2026-11-14)

- **Serveur** `src/lib/server/evaluation-question-errors.ts` : `getEvaluationQuestionErrors(supabase, evaluation,
students, templateId)` ; copies comptées = celles du bilan P6 (`bestCopies` exporté de
  `evaluation-breakdown.ts`, pas recopié) ; lit `test_answers` (`question_instance`, `user_answer`, `status`,
  `points`) du modèle ; verdict par case = `detailsWithinBudget` (`corrected-detail.ts`, budget de la relecture
  d'une copie) ; calcul pur séparé (`computeQuestionErrors`) pour les tests.
- **Rendu** : erreurs par case (≥ 2 cases, hors QCM) sur les réponses dont le détail est disponible ; groupes
  (énoncé tiré identique + réponse identique) → noms des élèves ; « sans réponse » compté à part.
- **Route** `GET …/assessments/[id]/results/question-errors?template=<uuid>` : mêmes gardes que la page
  (rôle, auteur du contrôle, mode test), Zod sur `template`.
- **Écran** : lignes « par question » de `EvaluationBreakdown.svelte` dépliables (bouton, `aria-expanded`),
  chargement au premier dépliage, chaque groupe rendu par `CorrectionCard` avec le verdict du serveur.
- **Revue** : `code-reviewer` + `security-auditor` (données d'élèves, nouvelle route). Doc : `evaluations.md`
  § Résultats.

## PR 2 — état des lieux et plan technique (2026-11-14)

**Prod, mesuré le 2026-11-14** (MCP lecture seule) : 0 trace `skill_attempts` avec réponse (`answer_parts`),
0 réponse de contrôle (1 contrôle, aucune copie). Les 101 lignes `test_answers` viennent toutes d'**anciennes
séries libres** (`test_sessions` sans contrôle, 2026-09-29 → 2026-11-11) : circuit fermé le 2026-11-11 (N13,
`/api/tests/save` n'écrit plus de séance).

**Vérifié dans le code** :

- le prof lit les traces de ses élèves (`skill_attempts_select_teacher` = `is_my_student`) et leurs réponses
  de contrôle (PR 1) : **aucune migration** ;
- les traces de contrôle (`place = 'evaluation'`) n'ont ni réponse ni graine : pas de double compte avec
  `test_answers` ;
- `generateInstance(template, seed)` (déjà utilisé par `evaluation-attempts.ts`) rejoue le tirage d'une trace ;
- point → modèles : `question_template_points` ; élèves de la classe : `class_members` (comme le widget E,
  pas de mode test dans l'analytique).

**Décisions de David (2026-11-14)** : **Q6** — séries **et** contrôles, comme la phase 0 (« contrôles d'abord »
de l'ancien « Reprendre ici » abandonné). **Q7** — anciennes séries libres (`test_answers` sans contrôle)
**exclues** : circuit fermé, stock figé.

**Plan** :

- **Serveur** `src/lib/server/stats/point-errors.ts` : `getClassPointErrors(supabase, classId, pointId)` →
  une entrée par modèle du point (titre + mêmes blocs que la PR 1, type `EvaluationQuestionErrors` réutilisé).
  - Contrôles : copies des élèves de la classe (sessions avec `evaluation_id`), meilleure copie par élève
    **et par contrôle** (`bestCopies`) ; énoncé tiré lu tel quel (aucun filtre de date : il est stocké entier).
  - Séries : traces `typing` / `mock_test` / `number_race` avec réponse et graine, **postérieures à
    `question_templates.updated_at`** ; énoncé rejoué par `generateInstance` ; trace réussie = juste, ratée =
    faux ; verdict par case = `part_verdicts` stocké (pas de recalcul).
  - Les deux sources passent par `computeQuestionErrors` (PR 1), étendu pour accepter un verdict fourni.
  - Lecture bornée (lots de `readInBatches`, plafond de lignes par modèle, budget de détail de la PR 1).
- **Route** `GET /api/teacher/classes/[classId]/analytics/point-errors?point=<uuid>` : `requireTeacherOfClass`,
  Zod sur `classId` et `point`.
- **Écran** : la fenêtre « élèves concernés » du widget E (`AnalyticsModal`) prend deux onglets, « Élèves » et
  « Erreurs » ; « Erreurs » se charge à la première ouverture. Le panneau de la PR 1 (snippet `errorsPanel`
  d'`EvaluationBreakdown.svelte`) devient un composant partagé `QuestionErrorsPanel.svelte`.
- **Vide** : « Pas encore de réponse écrite sur ce point (les flash-cards ne gardent pas de réponse). »
- **Revue** : `code-reviewer` + `security-auditor` (données d'élèves, nouvelle route). Doc : doc système de
  l'analytique de classe + `evaluations.md` (panneau partagé).

## Suites (futurs chantiers, non ouverts — David, 2026-11-14)

- **« Ta dernière réponse » sur la carte de révision** : rappeler à l'élève sa réponse fausse d'avant quand la
  révision lui remet le modèle (seul apport réel qu'E4 aurait eu).
- **Type d'erreur** : deviner la nature d'une erreur (signe, oubli du carré…) par le moteur mathAST.

## Questions à David (phase 0, posées le 2026-11-14 — tranchées ci-dessus)

- **Q1 — Découpage** : trois PR dans l'ordre ci-dessus (contrôles d'abord : ce sont les seules réponses
  qui existent en prod aujourd'hui) ? Ou seulement la PR 1 pour l'instant ?
- **Q2 — Nominatif** : dans la PR 1, le prof voit-il **qui** a répondu quoi (proposé), ou seulement les
  réponses sans nom ?
- **Q3 — Regroupement** : regrouper seulement les réponses identiques **à énoncé identique** (proposé),
  et montrer le reste une par une ?
- **Q4 — Où, pour E4** : sur quelle page élève (« Progression », « Notions », une rubrique à part) ?
- **Q5 — « Récurrente »** : au moins 2 échecs, dont le dernier essai (proposé) ? Autre seuil ?

## Historique

- 2026-11-14 : ouverture, état des lieux, phase 0 écrite.
- 2026-11-14 : #2626 mergée (PR 1). Relecture : comptes alignés sur le bilan (statut seul), question non corrigée faute de temps jamais recalculée ; audit sécurité sans finding bloquant (mineurs laissés : modèle étranger → « aucune erreur », pas de 404 car un modèle sorti de la série garde sa ligne ; cas admin et mode test non testés au niveau route).
- 2026-11-14 : PR 2 — état des lieux prod, plan technique, Q6 (séries + contrôles) et Q7 (anciennes séries libres exclues) tranchées.
- 2026-11-14 : phase 0 tranchée : E4 retiré, PR 1 puis PR 2, nominatif, regroupement à énoncé identique ; deux futurs chantiers.

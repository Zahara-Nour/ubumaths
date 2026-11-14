# Chantier `suivi-eleve` — page de suivi d'un élève (P8), prouvé / déclaré (P9)

Ouvert le 2026-11-14. Besoins P8 et P9 validés par David le 2026-11-11
([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de suivi
validés ») : « P8 page de suivi d'un élève · P9 distinguer prouvé (corrigé par l'appli) et déclaré
(auto-évaluation) ». Choisi par David le 2026-11-14, après la clôture d'`erreurs-frequentes`.

## Reprendre ici

_Mis à jour le 2026-11-14, PR 2 en phase 0._

- **État** : PR 1 (#2639) mergée, pas encore en prod ; plan de la PR 2 écrit (§ « PR 2 — plan technique ») · **Prochaine action** : coder la PR 2 une fois le plan validé · **En attente de David** : R1 à R3 du plan de la PR 2 ; vérification à l'écran de #2639 (`verifications-manuelles.md`) · **Pièges en cours** : prod presque sans traces avec réponse ; la grille A lit `skill_attempts` sans pagination (écart noté dans `analytique-prof.md`) · **Worktree / branche** : `../ubumaths-wt-suivi-eleve`, `feat/suivi-eleve-blocs`

## Ce qui existe (vérifié le 2026-11-14)

- **Aucune page qui rassemble un élève côté prof.** La seule page par élève est
  `/dashboard/teacher/students/[studentId]/journal` : le **journal des récompenses** (gamification),
  ouvert depuis la liste des classes (`studentJournalHref`). Il y a aussi `…/chatterie`.
- **Ce que le prof voit d'un élève est éparpillé** dans l'analytique de classe
  (`/dashboard/teacher/classes/[classId]/analytics`, [analytique-prof.md](../systeme/analytique-prof.md)) :
  sa ligne de la grille A (badge FSRS par point du programme), sa ligne de la régularité (C), sa courbe
  de rétention (B, élève × branche), son niveau dans les compétences ; ses notes, contrôle par contrôle
  (bilan d'un contrôle).
- **Côté élève** : « Ma progression » (`NotionsPanel` + `CompetencesPanel`, E1), révision (E2), notes (E3).
- **P9, la donnée existe** : chaque trace porte son origine (ADR 0038) — **corrigé** (`auto`),
  **déclaré** (`student_self`, et les anciennes `srs`), **prof** (`teacher`). Aucun écran ne la montre :
  le badge FSRS de la grille A mélange corrigé et déclaré (ADR 0016 : en révision, l'auto-évaluation
  compte, un seul résultat par jour, le meilleur).
- **Accès existant pour une page élève** : `verifyTeacherStudentWithRole` (prof de l'élève, admin passe) ;
  l'analytique de classe, elle, refuse l'admin (décision du 2026-10-11).

## Comportements proposés (phase 0, à valider)

- **Nominal** : depuis la liste des classes (nom de l'élève) et depuis la grille A (nom en tête de
  ligne), le prof ouvre « Suivi de <prénom nom> ». Il y voit, pour cet élève :
  1. **Points du programme** (P8 + P9) : les points de son niveau qu'il a travaillés, dans l'ordre de
     l'arbre (branche → notion → point), chacun avec son badge (comme la grille A) et la part
     **prouvée** / **déclarée** : « 4 réussies corrigées sur 6 · 3 déclarées réussies sur 3 ». Un point
     qui ne tient **que** sur du déclaré est signalé (« seulement déclaré »).
  2. **Contrôles** : ses notes, une ligne par contrôle rendu, lien vers le bilan du contrôle.
  3. **Régularité** : sa ligne de la grille C (paliers par semaine, mêmes règles : jamais de date ni de
     nombre exact).
  4. **Compétences** : ses niveaux dans les six compétences.
     Lien vers le journal des récompenses en pied de page.
- **Limite** : élève sans aucune trace → chaque bloc dit qu'il n'y a rien encore, la page reste. Élève
  **hors classe** → la page existe (niveau lu sur son profil), ouverte depuis où ? (Q1).
- **Erreur** : élève qui n'est pas au prof → 403 ; une lecture en échec → le bloc le dit, les autres
  restent.

## Décisions (David, 2026-11-14 : « ok » aux recommandations)

- **Q1** : nouvelle page `/dashboard/teacher/students/[studentId]` ; le nom de l'élève dans la liste des
  classes l'ouvre (élèves en classe **et** section « Élèves non assignés ») ; l'icône du journal des
  récompenses reste à côté.
- **Q2** : quatre blocs (points, contrôles, régularité, compétences), **pas** d'erreurs pour l'instant.
- **Q3** : deux comptes par point, sur la page de l'élève **seulement** (rien dans la grille A).
  **Prouvé** = `auto` + `teacher` (un adulte ou l'appli a jugé) ; **déclaré** = `student_self` + anciennes `srs`.
- **Q4** : badge inchangé (celui de la grille A, déclaré compris, ADR 0016).
- **Q5** : aucune date.
- **Q6** : prof seulement, **admin refusé** (comme l'analytique). PR 1 = page + bloc « Points du
  programme » (P8 + P9) ; PR 2 = contrôles, régularité, compétences, lien depuis la grille A.

## PR 1 — plan technique (2026-11-14)

Aucune migration : le prof lit déjà les traces (`skill_attempts_select_teacher`, `is_my_student`) et la
mémoire FSRS (`Teachers can view card stats of their students`) de ses élèves.

- **Serveur** `src/lib/server/stats/student-follow-up.ts` :
  - `buildStudentPointFollowUp` (pur, testé seul) : traces + liens modèle → point + états FSRS → une
    entrée par point : badge (même règle que la grille A : pire badge des modèles du point), comptes
    `proved = { done, succeeded }`, `declared = { done, succeeded }`, `onlyDeclared`. Trace sans verdict
    (`success` NULL) : comptée nulle part ; origine inconnue : comptée nulle part, journalisée.
  - `getStudentPointFollowUp(supabase, studentId)` : niveau = `profiles.grade` de l'élève ; traces
    (`template_id, source, success`) **paginées** (`readInBatches` ou `.range`, tri sur `id`) ; liens
    `question_template_points` par lots (`fetchInChunks`), points vivants (`isLivePoint`) du niveau
    (`keepLinksOfGrade`) ; `srs_card_stats` de l'élève ; rangement par `placeInTree`, avec branche et
    notion. `isLivePoint` et `placeInTree` sortent de `class-knowledge.ts` (exportés, la grille A les
    garde) ; `placeInTree` rend aussi le nom de la branche.
- **Route** `/dashboard/teacher/students/[studentId]/+page.server.ts` : `requireRole('teacher')` (admin
  refusé) · Zod UUID → 400 · `verifyTeacherStudent` → 403 · profil (prénom, nom) ; lecture des points en
  échec → `pointsError`, la page reste.
- **Page** `+page.svelte` : `BackLink` vers les classes · « Suivi de <prénom nom> » · bloc « Points du
  programme » groupé par branche puis notion ; chaque point : nom (`InlineMarkdown`), badge, « Corrigé :
  4 réussies sur 6 · Déclaré : 3 réussies sur 3 », marque « seulement déclaré » ; vide : « Pas encore de
  point travaillé. » ; lien vers le journal des récompenses (`?depuis=suivi`, retour vers le suivi).
- **Liens** : `studentFollowUpHref` dans `return-links.ts` ; liste des classes : le nom de l'élève
  (en classe et hors classe) mène au suivi.
- **Tests** : `buildStudentPointFollowUp` (comptes, seulement déclaré, NULL, origine inconnue, point
  d'un autre niveau écarté, archivé écarté) ; loader (400, 403 non-élève, admin refusé, échec de
  lecture) ; rendu de la page (groupes, comptes, marque, vide, erreur) ; retour du journal `?depuis=suivi`.
- **Revue** : `code-reviewer` + `security-auditor` (données d'élèves, nouvelle route). **Doc** :
  section « Suivi d'un élève » dans `docs/systeme/analytique-prof.md` (ou doc à part si elle grossit).

## PR 2 — plan technique (2026-11-14, à valider)

Aucune migration. Trois blocs ajoutés à la page de suivi, chacun lu à part : une lecture en échec, le
bloc le dit, les autres restent (comme « Points du programme »). Aucune date (Q5).

- **Contrôles** : `getStudentAssignments(supabase, studentId)` (`src/lib/server/evaluations.ts`, déjà
  écrite pour l'élève) appelée avec le **client du prof** ; la RLS lui laisse lire les assignations de ses
  contrôles, les classes et les séances de ses élèves. Une ligne par contrôle publié assigné à l'élève :
  titre, **meilleure note sur 20** (Q36, `bestGrade`) ou statut (« pas commencé », « en cours »,
  « expiré sans copie »), lien vers les résultats du contrôle. Ordre : celui rendu, sans date affichée.
  - Retour : la page des résultats a désormais deux parents → `?depuis=suivi&eleve=<uuid>` (UUID
    vérifié comme `signalement`, sinon retour par défaut aux contrôles) ; `evaluationResultsReturn`
    dans `return-links.ts`.
- **Régularité** : la ligne de l'élève, mêmes règles que la grille C (palier par semaine, jamais de
  nombre ni de date ; repère de vacances). **R1** ci-dessous. Rentrée = année scolaire de **l'école de
  l'élève** (`profiles.school_id`) ; `readSchoolYear` prend un identifiant d'école au lieu d'une
  classe (la grille C lit l'école de la classe puis appelle la même fonction). Sans école : le 1er
  septembre écoulé (règle existante, `regularityFirstDay`).
- **Compétences** : `student_competence_level` de l'élève × `math_competences` (ordre `display_order`),
  niveau ◯ / 🟠 / 🟢 / ✨ comme la grille F (méta d'icône mise en commun si la grille F l'a en dur) ;
  compétence sans niveau → « pas encore évaluée ». **Sans** la date de dernière saisie (Q5).
- **Lien depuis la grille A** : le nom en tête de ligne mène au suivi, `?depuis=analytique&classe=<uuid>` ;
  le suivi revient alors à l'analytique de la classe (`studentFollowUpReturn`, UUID vérifié ; défaut :
  les classes). **R2** ci-dessous.
- **Code** : `src/lib/server/stats/student-follow-up.ts` gagne `getStudentRegularity` et
  `getStudentCompetences` ; contrôles par `getStudentAssignments` tel quel. Loader : les quatre lectures
  en parallèle (`Promise.allSettled`), un drapeau d'erreur par bloc.
- **Tests** : régularité de l'élève (paliers, semaine de vacances, sans école → 1er septembre, trace de
  contrôle écartée, jour à 4 traces non actif) ; compétences (ordre, sans niveau) ; loader (chaque bloc
  en échec seul, les autres restent) ; rendu (trois blocs, vides, erreurs) ; retours `?depuis=suivi`
  (résultats) et `?depuis=analytique` (suivi), UUID invalide → défaut ; grille A : lien sur le nom,
  absent en projection.
- **Revue** : `code-reviewer` + `security-auditor` (données d'élèves). **Doc** : `analytique-prof.md`
  § Suivi d'un élève, `evaluations.md` (retour des résultats), `composants-ui.md` si BackLink.

### Questions (R1 à R3)

- **R1 — Régularité, où compter** : la fonction de la base `class_regularity_weeks` compte **par
  classe** ; un élève hors classe n'y passe pas. Recommandé : lire **ses** traces depuis la rentrée
  (date, origine, lieu ; paginées), compter en TypeScript avec les fonctions pures déjà testées
  (`isAutonomousTrace`, `weekStartOf`, `activeDaysTier`) ; un élève, c'est au plus quelques milliers de
  lignes par an. Autre voie : une fonction de base `student_regularity_weeks` (migration, puis deux PR).
- **R2 — Mode projection** : dans la grille A en mode projection (noms anonymisés), le nom n'est
  **pas** un lien (un clic afficherait le vrai nom au tableau). Recommandé : pas de lien en projection.
- **R3 — Contrôles, quoi par ligne** : titre + meilleure note (ou statut) + lien vers les résultats,
  sans date ni nombre de tentatives. Recommandé tel quel ; ajouter le nombre de tentatives ?

## Questions à David (phase 0, posées le 2026-11-14 — tranchées ci-dessus)

- **Q1 — Où et quoi** : une **nouvelle page** `/dashboard/teacher/students/[studentId]` (le journal des
  récompenses reste à part, lié depuis elle), ouverte depuis la liste des classes et la grille A ? Et pour
  un élève **hors classe** : d'où l'ouvre-t-on ?
- **Q2 — Contenu** : les quatre blocs ci-dessus (points, contrôles, régularité, compétences) — en
  retirer, en ajouter (par ex. ses **erreurs** récentes, comme l'onglet « Erreurs » de P4) ?
- **Q3 — P9, la forme** : pour chaque point, deux comptes « corrigé » / « déclaré » (proposé) ? Ou
  seulement une marque sur les points qui ne tiennent que sur du déclaré ? Et faut-il **aussi** le montrer
  dans la grille A de la classe (marque sur la case), ou seulement sur la page de l'élève ?
- **Q4 — Le badge** : le badge FSRS reste celui de la grille A (déclaré compris, ADR 0016) — on ne le
  recalcule pas sans le déclaré ? (Proposé : on ne touche pas au badge, on montre seulement les comptes.)
- **Q5 — Dates** : la régularité ne montre aucune date (P5, vie privée). Sur la page d'un élève, les
  points disent-ils **quand** il les a travaillés (« dernière fois : il y a 3 semaines ») ou rien (proposé :
  rien, comme P5) ?
- **Q6 — Accès et découpage** : prof de l'élève seulement, **admin refusé** comme l'analytique (proposé) ?
  Découpage proposé : **PR 1** = page + bloc « Points du programme » avec prouvé / déclaré (P8 + P9) ;
  **PR 2** = contrôles, régularité, compétences, liens depuis la grille A.

## Journal

- 2026-11-14 : PR 2, worktree `feat/suivi-eleve-blocs`, état des lieux et plan technique, R1 à R3 posées.
- 2026-11-14 : #2639 mergée (PR 1), CI verte.
- 2026-11-14 : PR 1 codée (agent), badge mis en commun avec la grille A (`curriculum-point-badge-meta.ts`), doc système (`analytique-prof.md` § Suivi d'un élève, `comptes-classes-ecoles.md`, `composants-ui.md`). Revues : code → clés de liste répétées si deux notions homonymes non voisines (corrigé, test rouge puis vert) ; sécurité sans bloquant. Mineurs laissés : test d'intégration contre la RLS (tout est mocké ; un échec RLS afficherait « pas encore de point » sans fuite), refus de l'admin tenu par le code seul (la RLS le laisse lire, comme l'analytique), assertions non nulles `!` dans `student-follow-up.ts`.
- 2026-11-14 : phase 0 tranchée (recommandations validées), plan technique de la PR 1.
- 2026-11-14 : chantier ouvert, état des lieux, questions de phase 0.

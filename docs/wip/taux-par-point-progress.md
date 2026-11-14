---
status: phase-0
---

# Chantier `taux-par-point` — taux de réussite de la classe par point et par notion (P3)

Ouvert le 2026-11-14, choisi par David après la clôture de `durees-trop-courtes`. Besoin P3 validé le
2026-11-11 ([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « taux de réussite par point et par notion » (prof, classe). Dernier écran prévu
sur les nouvelles traces (P4, P5, P6, P7, P8, P9 faits).

## Reprendre ici

_Mis à jour le 2026-11-14, chantier ouvert._

- **État** : état des lieux fait, phase 0 posée (Q1 à Q5) · **Prochaine action** : réponses de David, puis plan technique · **En attente de David** : Q1 à Q5 · **Pièges en cours** : prod presque vide (vérifier en local, `db:seed-riche`) ; l'analytique refuse le compte admin (décision du 2026-10-11) · **Worktree / branche** : `../ubumaths-wt-taux-par-point`, `feat/taux-par-point`

## Ce qui existe (vérifié le 2026-11-14)

- **Analytique de la classe** (`/dashboard/teacher/classes/[classId]/analytics`, onglet Connaissances,
  [analytique-prof.md](../systeme/analytique-prof.md)) :
  - grille A élève × point : badge de **mémorisation** (révision espacée, 🆘 / 🔁 / ⏳ / ✅ / ◯),
    colonnes dans l'ordre de l'arbre (branche › notion › point), notion sous chaque nom, pied de
    colonne « % acquise / % à remédier » ;
  - E « Top à remédier » : points triés par % 🆘 + 🔁, détail élèves et erreurs (P4) ;
  - C régularité (P5), B courbe de rétention.
  - **Aucun taux de réussite** : tout est mémorisation, rien ne dit « 62 % de réponses justes ».
- **Suivi d'un élève** (P8, P9, `student-follow-up.ts`) : par point, deux comptes `{ done, succeeded }`.
  **Prouvé** = sources `auto` + `teacher` (l'appli ou un adulte a jugé) ; **déclaré** = `student_self`
  - `srs` (l'élève a dit « je sais »). Une trace sans verdict ou d'origine inconnue ne compte nulle part.
- **Traces** (`skill_attempts`) : élève, modèle, réussi, lieu, date ; modèle → points par
  `question_template_points` ; point → notion en remontant l'arbre (`placeInTree`, `keepLinksOfGrade`
  pour le niveau de la classe). Contrôles : traces `evaluation` écrites par le serveur (réussi = juste).
- **Accès** : `requireTeacherOfClass` ; RLS `skill_attempts_select_teacher` (`is_my_student` = prof
  unique ou admin). A priori **aucune migration** ; si la lecture des traces est trop lourde, un
  comptage par la base, comme pour la régularité (`class_regularity_weeks`), serait une migration à part.

## Phase 0 — comportements proposés (à valider)

- **Nominal** : dans l'onglet Connaissances, un widget « Taux de réussite » liste les **notions**
  travaillées par la classe, rangées dans l'ordre de l'arbre (branche › notion). Chaque notion donne
  son taux (« 64 % de réussite · 18 élèves »), et un clic déplie ses **points**, chacun avec son taux.
  Le taux ne compte que le **prouvé** : réponses corrigées par l'appli ou le prof.
- **Limite** : un point ou une notion avec moins de **3 élèves** → « pas assez de réponses » au lieu
  d'un taux. Aucun point travaillé → message. Une classe sans trace → message.
- **Erreur** : lecture en échec → message dans le cadre du widget, le reste de la page reste.

## Questions à David (phase 0, posées le 2026-11-14)

- **Q1 — Où ?** Recommandé : un **widget à part** dans l'onglet Connaissances (notions, dépliables en
  points). Autres choix : une ligne « % réussite » en pied de la grille A (déjà chargée en pieds), ou
  une colonne dans « Top à remédier ».
- **Q2 — Quelles réponses ?** Recommandé : le **prouvé seulement** (Saisie, Contrôle blanc, Course,
  contrôles, prof), puisque les flash-cards sont auto-évaluées. Afficher le déclaré à part, comme dans
  le suivi d'un élève ? Recommandé : **non**, une mention seulement quand un point n'a que du déclaré
  (« seulement déclaré »).
- **Q3 — Comment compter ?** Recommandé : **chaque élève pèse autant** (taux de chaque élève, puis
  moyenne), pour qu'un élève à 100 réponses n'écrase pas les autres. Autre choix : toutes les réponses
  mises ensemble (justes / total).
- **Q4 — Depuis quand ?** Recommandé : **depuis la rentrée** (année scolaire de l'école, comme la
  régularité). Autre choix : tout l'historique.
- **Q5 — Seuil** : moins de **3 élèves** → « pas assez de réponses » (recommandé) ? Ou un autre seuil ?

## Journal

- 2026-11-14 : chantier ouvert, état des lieux, phase 0 posée (Q1 à Q5).

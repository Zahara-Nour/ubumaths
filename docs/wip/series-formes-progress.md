# Séries et leurs formes d'usage — progression

Étude du 2026-09-30 (TinyMath, existant Chiphre, UbuSlides). Aucun code écrit à ce stade.

## Ce que David décrit (2026-09-30)

Une **série** (composition : catégories × répétitions × durée) s'utilise sous plusieurs formes :

- **En classe** : questions projetées une à une (les élèves répondent sur leur cahier), minuteur,
  navigation pour revenir en arrière ; à la fin, grille des questions (pour ceux qui n'ont pas fini),
  puis grille des corrections. C'est le mode « display » de TinyMath.
- **En autonomie** :
  - **flash-cards** : carte retournable, l'élève dit s'il avait trouvé, pas de chrono ;
  - **interactif** : l'élève répond, voit la correction de ses réponses à la fin, avec un score.
- **Course aux nombres** : toutes les questions affichées, espace de réponse, temps global, score.
- **Évaluation** (seulement après assignation) : forme interactive ou course aux nombres ; le score est
  enregistré comme **note**.
- Dès que l'élève donne une réponse, le **SRS est alimenté**.

## Décisions (David, 2026-09-30)

- **Q1 — Vocabulaire** : « série » = la composition ci-dessus ; l'exercice de fiche figé par une graine
  devient une **série figée** (ADR 0011). « Évaluation » = série assignée, réponses enregistrées,
  vérifiées, notées. → `CONTEXT.md`.
- **Q2 — Note** : les évaluations sont corrigées **par le serveur** ; ailleurs, correction dans le
  navigateur inchangée. → [ADR 0015](../adr/0015-evaluation-notee-correction-serveur.md) (restreint
  l'ADR 0001).
- **Q3 — En classe, retour en arrière** : revenir sur une question déjà passée **met le minuteur en
  pause** ; on relance avec Espace.
- **Q4 — Flash-cards en autonomie** : deux boutons « J'avais trouvé » / « Je n'avais pas trouvé »
  (→ Good / Again pour FSRS), comme les cartes de cours du Quiz.

## État des lieux (mesuré le 2026-09-30)

| Forme              | TinyMath (`new-tinymath`, `automaths/assessment/+page.svelte`)                                                                                          | Chiphre aujourd'hui                                                                                                         | UbuSlides                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| En classe          | Une question à la fois, minuteur, ±5 s, Espace = pause, → = suivante ; **pas de retour arrière** (l. 281-301) ; fin : correction sur 2 colonnes + liste | Mode « Révision » (`TestDisplay`) : même principe, sans navigation manuelle ; fin « Revoir tout » / « Voir corrections »    | **Adapté** : diaporama, retour arrière, clavier, plein écran ; aucune saisie → pas de conflit MathLive |
| Flash-cards        | Retournement, ← →, **sans auto-évaluation**, sans fin, rien d'enregistré                                                                                | **Existe** dans la révision SRS (`ReviewSession` : `FlashCard` + retournement + boutons FSRS), pas branché sur une série    | Possible, intérêt faible (la révision SRS fonctionne)                                                  |
| Interactif         | Une question à la fois avec minuteur, correction + score à la fin (demi-point si forme non optimale)                                                    | Mode « Quiz » (`TestInteractive`) : enregistré et SRS si connecté ; 7 défauts vérifiés (ci-dessous)                         | **Peu adapté** : navigation à verrouiller, clavier en conflit avec la saisie MathLive                  |
| Course aux nombres | Toutes les questions, **7 min en dur**, expiration sans effet (bug)                                                                                     | `TestCourse` : temps réglable 1-60 min, fin automatique, score, SRS                                                         | **Non** : une grille, pas un diaporama                                                                 |
| Évaluation         | Panier enregistré puis assigné ; élève en interactif seulement ; **note écrite par le navigateur**                                                      | `assessments` + `assessment_assignments`, Quiz forcé ; limite de temps jamais appliquée. Prod : 1 évaluation, 0 assignation | Comme interactif / course                                                                              |

### UbuSlides (`src/lib/slides/`)

- Solide : store de navigation (52 tests verts), fragments, vue d'ensemble, transitions, pause (écran).
- Absent : défilement automatique (`autoSlide` déclaré, jamais lu), signal de fin, verrouillage de la
  navigation ; `hash: true` par défaut (URL modifiée) ; filtre clavier qui ignore `<math-field>`.
- `QuestionSlide` orphelin et en retard (QCM invalidable, correction QCM fausse, correction masquée par
  les fragments, pas de carte de cours) → à supprimer au profit de `FlashCard`.
- Créé le 2026-01-24 pour les **présentations du prof** (`docs/wip/ubuslides-progress.md`, supprimé le
  2026-02-21) ; aucune trace écrite d'un usage prévu pour les tests du panier.

### Défauts vérifiés du Quiz actuel (`TestInteractive` + page `automaths/test`)

1. Pas de seed (`generateInstance` sans graine).
2. Durées décalées quand une génération échoue ou qu'une catégorie est sautée (`instanceBaseDelays`
   reconstruit depuis le panier).
3. Limite de temps d'une évaluation (`session.timeLimit`) jamais appliquée ; `time_limit` enregistré à `null`.
4. Réponse saisie mais non validée perdue à l'expiration.
5. « Recommencer avec de nouvelles questions » rejoue les mêmes instances.
6. Visiteur non averti que rien n'est enregistré (401 silencieux).
7. Question sautée si le chrono expire dans les 300 ms qui suivent une validation.

## Décisions, tour 2 (David, 2026-09-30)

- **Q5 — Stockage** : deux tables, `series` (la composition) et `evaluations` (l'assignation d'une
  série : forme, réglages, dates, destinataires) ; le panier devient un brouillon de série. Migration à
  venir : question d'accès posée à David AVANT tout SQL.
- **Q6 — Tirage en évaluation** : propre à chaque élève, graine enregistrée (le serveur régénère la
  copie de l'élève pour la corriger, ADR 0015).
- **Q7 — Noms des formes** : **En classe**, **Flash-cards**, **Entraînement**, **Course aux nombres** ;
  « Mode Révision » et « Quiz » bannis pour ces formes. Automaths redéfini (catalogue où l'on compose une
  série) : « Entraînement » y avait un autre sens. → `CONTEXT.md`.
- **Q8 — Ordre des chantiers** :
  1. En classe sur UbuSlides ;
  2. Flash-cards d'une série (réutiliser la révision SRS) ;
  3. Entraînement : corriger les 7 défauts ;
  4. Séparation `series` / `evaluations` ;
  5. Évaluation notée, correction serveur.

## Chantier 1 — « En classe » sur UbuSlides (spécification validée par David, 2026-09-30)

- Une question par diapositive : `FlashCard` en lecture seule, en grand, **sans bouton de retournement**
  (Q9 : la réponse n'est pas montrée à la classe ; corrections dans la grille de fin).
- Minuteur par question = durée de sa catégorie (20 s par défaut) ; à zéro, diapositive suivante.
- Espace = pause / reprise ; ±5 s sur la question en cours et les suivantes de la même catégorie
  (minimum 5 s), sans remettre le compteur à zéro.
- Navigation ← / →, flèches à l'écran, geste. Revenir sur une question déjà passée = pause (Q3) ;
  revenir sur la question la plus avancée = reprise de son temps restant ; avancer vers une question
  jamais vue = son minuteur démarre.
- Fin : grille des questions, puis (bouton) grille des corrections ; aller-retour possible.
  « Recommencer » tire de nouvelles questions.
- Chaque question porte sa propre durée (plus de décalage si une génération échoue).
- **Plein écran** réel (Q10). Rien n'est enregistré, pas de SRS.
- **Minuteur dans UbuSlides** (Q11) : `config.autoSlide` (défaut du diaporama) et `Slide.autoSlide`
  (par diapositive, prioritaire), réactif ; pause (`store.paused`) qui gèle le compte ; signal de fin.

### Tâches

| #   | Tâche                                                                                                                               | Qui                                     | État     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- |
| 1   | UbuSlides : minuteur par diapositive, pause, durée modifiable en cours, signal de fin, `hash` désactivable, filtre clavier MathLive | `svelte-expert` (Opus)                  | en cours |
| 2   | Composant « En classe » : diaporama de flash-cards, règle de la question courante, grilles de fin                                   | `frontend-developer` (Opus)             | à faire  |
| 3   | Branchement de la page, durée par question, suppression de `QuestionSlide`                                                          | session principale                      | à faire  |
| 4   | Relecture + accessibilité                                                                                                           | `code-reviewer`, `accessibility-tester` | à faire  |

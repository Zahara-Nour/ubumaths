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

## Questions ouvertes (tour 2)

Voir la conversation du 2026-09-30 ; à reporter ici une fois tranchées.

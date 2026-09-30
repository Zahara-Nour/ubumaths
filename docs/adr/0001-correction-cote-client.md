# 0001 — Correction des réponses côté client

- **Statut** : acceptée — restreinte par [ADR 0015](0015-evaluation-notee-correction-serveur.md) (évaluations notées : correction serveur)
- **Date** : 2026-09-13 · **Décidée par** : David

## Contexte

Tout le système `question_templates` (automaths, SRS, tests, quiz de chapitre) corrige **dans le
navigateur** : `validateAnswer` est appelé depuis `FlashCard`, `QuestionCard` et `QuestionSlide`,
l'instance envoyée porte la réponse attendue (`blanks[].expectedAnswer`, `correctChoiceIndex`,
`correction`), et le serveur reçoit un verdict déjà rendu (`isCorrect: z.boolean()`). Un élève peut
aussi insérer directement dans `chapter_quiz_results` via PostgREST.

## Décision

On **garde la correction côté client**. Pas de revalidation serveur, pas de garde en base sur
l'insertion des résultats.

## Écarté

- Revalidation serveur de chaque réponse : coût élevé pour une menace étroite.
- Plafond d'insertions en base : ne borne qu'un client qui re-soumet en boucle, ne corrige rien.

## Conséquences

- Le dégât possible plafonne à un élève qui **embellit ses propres** statistiques et pollue son propre
  calendrier SRS. Aucune donnée d'un autre élève n'est atteignable ; aucune policy `UPDATE` / `DELETE`
  sur la table (il ajoute, ne modifie ni n'efface).
- Les statistiques de quiz sont **un outil pour l'élève, jamais une note**. Ne pas construire
  d'évaluation notée dessus sans rouvrir cette décision.
- Si un jour il faut noter : le chantier est la correction serveur (déjà faite pour les combats
  navadra), pas un plafond d'insertions.
- « La réponse attendue part au navigateur » n'est **pas** une découverte à signaler : c'est le modèle.

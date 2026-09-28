# 0009 — Carte de cours : type explicite `course_card`

- **Statut** : acceptée (migration PR #493 ; code en cours, `docs/wip/cartes-de-cours-progress.md`)
- **Date** : 2026-09-28 · **Décidée par** : David

## Contexte

Les questions de cours « Flash » de TinyMath n'ont ni case ni choix. Le générateur les refusait ; la
révision SRS savait déjà retourner une carte et auto-évaluer.

## Décision

- Nom : **« Carte de cours »**, type **explicite** `course_card` dans `question_templates.type`
  (marqueur `options.courseCard: true`).
- Recto = énoncé, verso = correction ; ni `blanks` ni `choices` ; variables et variations permises.
- **Exclue des tests et évaluations notés.**
- **Entraînement libre : auto-évaluation enregistrée** (`skill_attempts`, source `student_self`),
  comme en SRS.

## Écarté

- Inférer le type de l'absence de case et de choix (phase 0 validée : type explicite).

## Conséquences

- Les filtres de sélection des évaluations notées doivent exclure `course_card`.
- La vérification d'un template (`checkTemplate`) n'a pas de spec de réponse pour ce type : elle
  contrôle la génération (50 tirages) et que recto et verso ne sont pas vides.

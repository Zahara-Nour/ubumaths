# Phase 2 — Articulation pool existant + branchement validation auto

> **Démarré** : 2026-06-09
> **Statut** : en cours
> **Spec** : `docs/wip/skills-referentiel-design.md` (décision 59 — tagging template ; §5 — branchement validation auto)
> **Phase 1 livrée** : 3 commits + 3 migrations push sur Ubumaths2 (cf. `competence-referentiel-phase1-progress.md`)

## Constat critique du pool existant

10 `question_templates` seedés (migrations 071, 073, 075). Couverture :

| #             | Theme / domain / subdomain                                                                         | Niveau       | Match capacité 6ᵉ ? |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------ | ------------------- |
| 1             | Arithmétique / Fractions / Addition                                                                | 6ᵉ-5ᵉ        | ✅ Item 3 Rang 4    |
| 2             | Arithmétique / Décimaux / Multiplication                                                           | CM1/CM2/6ᵉ   | ✅ Item 5 Rang 3    |
| 7             | Arithmétique / Pourcentages / Réduction                                                            | 6ᵉ-5ᵉ        | ✅ Item 9 Rang 3    |
| 3, 4, 5, 6, 8 | Aires cercle / Pythagore / Identités remarquables / Équations linéaires / Fractions simplification | cycle 4 / 3ᵉ | ❌ hors V1          |
| 9, 10         | (générique, à confirmer)                                                                           | ?            | ❌                  |

→ **Seulement 3 templates matchent la 6ᵉ V1**. Le pool est insuffisant pour démarrer une UX visible côté élève, mais suffisant pour valider le pipeline data.

## Décisions de cadrage (validées 2026-06-09)

| #       | Choix                                                               | Justification                                                                                             |
| ------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Mapping | **Tagger seulement les 3 templates 6ᵉ + commentaire pour le reste** | Migration concise, pas de tagging factice. Le reste sera tagué quand le référentiel cycle 4 sera produit. |
| Hook UX | **FlashCard.onAnswerSubmit** (point de convergence)                 | Une seule modification couvre tous les flux (Course aux nombres, chapter quiz, assessments).              |
| Erreur  | **Fail silent + log serveur**                                       | L'UI continue normalement, pas de friction. Log serveur pour diagnostic.                                  |

## Plan d'exécution

### 2.1 — Mapping 3 templates 6ᵉ (`supabase/migrations/<ts>_seed_question_template_skills.sql`)

Agent : `supabase-expert` (Opus)
Statut : **🟡 en cours 2026-06-09**

Mapping cible :

- Template Addition fractions (Arithmétique/Fractions/Addition) → skill `Item 3 Rang 4` (Effectuer des opérations sur les fractions)
- Template Multiplication décimaux (Arithmétique/Décimaux/Multiplication) → skill `Item 5 Rang 3` (Multiplier / diviser, entier × décimal)
- Template Pourcentages réduction (Arithmétique/Pourcentages/Réduction) → skill `Item 9 Rang 3` (Comprendre, calculer et appliquer un pourcentage)

Migration : INSERT INTO `question_template_skills (template_id, skill_id)` via SELECT sur `question_templates` + `skills` jointes sur theme/domain/subdomain (pour pas dépendre des UUID).

### 2.2 — Endpoint API `POST /api/skill-attempts`

Agent : `backend-developer` (Sonnet)
Statut : à venir après 2.1

Spec :

- Body : `{ template_id: uuid, success: boolean, with_help?: boolean }`
- Zod validation
- Pour chaque skill_id tagué sur le template via `question_template_skills`, INSERT `skill_attempts (student_id=auth.uid(), skill_id, template_id, success, with_help, source='auto')`
- Réponse : `{ inserted: number, skill_ids: uuid[] }` ou erreur
- Fail-safe : si le template n'a aucun skill tagué, retourner `{ inserted: 0 }` (pas d'erreur — c'est le cas normal pour les templates pas encore tagués)

### 2.3 — Hook FlashCard onAnswerSubmit

Agent : `frontend-developer` (Sonnet)
Statut : à venir après 2.2

Spec :

- Modifier `src/lib/components/questions/FlashCard.svelte` (ou consommateurs)
- Dans `onAnswerSubmit`, après validation locale, appeler `POST /api/skill-attempts` avec `template_id` + `isCorrect`
- Fail-silent : si l'API échoue (réseau, RLS, etc.), continuer l'UX normalement, juste log côté client

### 2.4 — Tests d'intégration

Agent : `test-automator` (Sonnet)
Statut : à venir après 2.3

- Endpoint API : Zod validation, RLS scope élève, idempotence, fail-safe templates sans skills
- End-to-end : answer → POST → INSERT → trigger → cache à jour (sur supabase locale)

### 2.5 — Reviews + commits

Agents : `code-reviewer` + `security-auditor` en parallèle
Statut : à venir

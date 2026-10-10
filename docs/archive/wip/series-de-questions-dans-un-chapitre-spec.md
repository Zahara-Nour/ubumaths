---
title: Séries de questions comme ressource de chapitre — spécification (Phase 0)
date: 2026-09-14
status: ⏸️ EN ATTENTE DE VALIDATION — aucune ligne de code écrite
scope: chapter_quiz_questions (retrait), chapter_assessments (ajout), vue élève, modèles
---

# Des séries de questions dans un chapitre

## La demande

> « Il faut faire le ménage avec l'ancien quiz. Ce qui nous intéresse, c'est
> d'importer des SÉRIES de questions comme ressource du cours, qui peuvent
> servir de quiz pour le bilan, ou pour autre chose. ChapterQuiz n'a donc plus
> lieu d'être. »

## Le point de départ, mesuré

La bascule du quiz de chapitre sur le moteur de questions a eu lieu le
2026-09-13 : `ChapterQuiz` rend des `QuestionInstance` par `FlashCard`, et
`chapter_quiz_questions` ne porte que `question_template_id`. **Il n'y a donc
aucun vestige d'un quiz à énoncés propres.**

Ce qui doit partir, c'est le mécanisme lui-même : il fait choisir les questions
**une par une**, alors que l'unité de travail est la **série**.

| Compteur (production, 2026-09-14) |       |
| --------------------------------- | ----- |
| `chapter_quiz_questions`          | **0** |
| `chapter_quiz_results`            | **0** |
| `assessments`                     | 0     |
| `question_templates` publiés      | **0** |

Aucune donnée ne sera perdue. La fonctionnalité n'a jamais servi, faute de
modèles publiés.

## Ce qu'est une série, dans ce dépôt

| Élément                                                 | Rôle                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `assessments`                                           | la série : `categories: CartItem[]` = `{catégorie, quantité, délai}` |
| `assessment_assignments`                                | la distribution : `assessment_id` + `class_id` **ou** `student_id`   |
| `/automaths/test?assignment=<id>&mode=interactive`      | là où l'élève la joue                                                |
| `/api/tests/save`                                       | l'enregistrement — FSRS, points de programme, XP du buddy            |
| `/dashboard/student/assessments/<assignmentId>/results` | ses résultats                                                        |

⚠️ **Tout existe déjà.** Le seul manque, c'est le lien chapitre ↔ série.

## Le parallèle avec les fiches est exact

Les fiches ont résolu le même problème il y a deux jours, et la solution se
transpose terme à terme :

| Fiches                                   | Séries                              |
| ---------------------------------------- | ----------------------------------- |
| `chapter_worksheets` (rattachement)      | **`chapter_assessments`** (à créer) |
| `worksheet_assignments` (distribution)   | `assessment_assignments` (existe)   |
| L'élève ouvre par `assignment_id`        | idem                                |
| Double garde : publiée **ET** distribuée | idem                                |

**Ne pas inventer une troisième forme.** Une ressource de chapitre qui se
distribue, on sait déjà faire ; s'en écarter créerait un quatrième sens à
« publier ».

## Modèle de données proposé

### Table `chapter_assessments`

| Colonne                        | Rôle                                                   |
| ------------------------------ | ------------------------------------------------------ |
| `id`                           | clé                                                    |
| `chapter_id`                   | → `class_chapters`, `on delete cascade`                |
| `assessment_id`                | → `assessments`                                        |
| `display_order`                | ordre par type (hérité de la forme des 5 autres)       |
| `section_id` / `section_order` | rangement dans le plan, clé composite comme les autres |
| `published_at`                 | mise à disposition, `null` = préparé                   |
| `created_at`                   | audit                                                  |

### Ce qui disparaît

- tables `chapter_quiz_questions` et `chapter_quiz_results` (+ policies) ;
- route `/api/student/chapters/[id]/quiz/submit` ;
- routes professeur `/api/teacher/chapters/[id]/quiz/**` ;
- composants `ChapterQuiz`, `QuizSummary` et leurs tests ;
- le volet quiz du `content_snapshot` des modèles de chapitre ;
- `chapters-quiz.ts` (`buildQuizInstances`).

⚠️ **Ce qui est perdu en fonctionnalité** : la correction **immédiate** question
par question qu'offrait `FlashCard` dans le chapitre. Une série se joue d'un
bloc et se corrige à la fin. C'est le comportement d'une évaluation — à
confirmer que c'est bien voulu pour le cas « bilan ».

## Comportements attendus

### Cas nominaux

1. **Rattacher une série** à un chapitre → elle apparaît dans le plan du
   professeur, rangeable dans une section comme les autres ressources.
2. **Publier une série** → elle est distribuée à la classe
   (`assessment_assignments` avec `class_id`), sur le modèle des fiches.
3. **Vue élève** → la série s'affiche dans sa section ; l'ouvrir mène à
   `/automaths/test?assignment=…`.
4. **Après passage** → l'élève accède à ses résultats ; le professeur voit
   l'avancement.

### Cas limites

1. **Série rattachée mais non distribuée** → invisible pour l'élève, lien
   compris (double garde, comme les fiches).
2. **Série sans modèle publié dans ses catégories** → elle ne peut rien
   générer. À dire explicitement plutôt que d'afficher une série vide.
3. **Suppression d'une série** rattachée à un chapitre → le rattachement part
   en cascade, le chapitre reste.

### Cas d'erreur

1. Série d'un autre professeur → refusée (mono-professeur : sans objet
   aujourd'hui, mais la policy doit le dire).
2. Rattacher une série **non publiée** (`assessments.status`) → refusé, comme
   une fiche en brouillon.

## Questions ouvertes — à trancher avant de coder

1. **Publier une série dans un chapitre la distribue-t-elle** à la classe, comme
   pour les fiches ? (proposé : oui, par cohérence)
2. **Quand supprimer l'ancien quiz** : avant la mise en place, ou après ? Rien
   ne dépend de lui (0 donnée, 0 usage réel), donc le retirer d'abord allège le
   travail — mais laisse le chapitre sans quiz entre les deux livraisons.
3. **La correction immédiate** question par question disparaît-elle sans regret,
   ou faut-il la garder pour un usage « entraînement » distinct du « bilan » ?

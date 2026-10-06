# 0019 — Classement des contenus : branche > notion > sous-notion

- **Statut** : acceptée (remplace [0018](0018-chapitres-liste-tenue-par-le-prof.md))
- **Date** : 2026-10-06 · **Décidée par** : David

## Contexte

Exercices (`exercises.topic`) et modèles de questions (`question_templates.theme` > `domain` >
`subdomain`) sont classés par du texte libre, sans liste. Mesuré le 2026-10-06 : 1 005 modèles,
21 thèmes, 98 domaines, 339 sous-domaines ; l'arbre n'a pas le même sens d'un niveau à l'autre
(en lycée, thème = Fonctions et domaine = Dérivation ; au collège, thème = Fractions et domaine =
Apprivoiser) ; « Apprivoiser » (131 modèles) est tantôt domaine, tantôt sous-domaine ; le « domaine »
des questions correspond au « thème » des exercices. L'arbre construit le menu d'Automaths.

L'ADR 0018 nommait « chapitre » le niveau fin ; ce mot désigne déjà l'unité de cours
(`class_chapters`) : un chapitre peut couvrir plusieurs notions, ou une partie d'une seule.

## Décision

- **Un seul arbre** classe exercices et modèles : **branche > notion > sous-notion**. Il est en base,
  **David l'édite** depuis une page d'administration.
- **Branche** : regroupement propre à Chiphre, stable à tous les niveaux scolaires, distinct du
  **thème** du programme (`curriculum_themes`), qui reste le découpage officiel par niveau.
- **Notion** : valable à un ou plusieurs niveaux ; un élément porte une seule notion, valable à tous
  ses niveaux ; obligatoire pour tout nouvel élément. Rattachement facultatif aux thèmes du programme.
- **Sous-notion** : facultative.
- Hors de l'arbre, champs séparés : **type d'activité** (Apprivoiser, À trou…) et **source** (BAC,
  Concours général, Automatismes…), listes fermées éditables, facultatives.
- Les éléments désignent un nœud, pas un nom : renommer se répercute ; un nœud utilisé s'archive.
- Le **chapitre** de cours reste ce qu'il est : il puise ses contenus où il veut, l'arbre ne le
  connaît pas.

## Écarté

- **« Chapitre » comme nom du classement** (ADR 0018) : déjà l'unité de cours.
- **Thème du programme comme premier niveau** : défini par niveau, nommé différemment d'un niveau à
  l'autre, absent au collège et au primaire.
- **Proposer les valeurs déjà saisies sans liste** : les doublons et les incohérences restent.
- **Mêler le comment (Apprivoiser) et le quoi dans l'arbre** : une même notion apparaît sous deux
  branches.

## Conséquences

- Tables neuves (nœuds de l'arbre, niveaux, rattachements, types d'activité, sources) ; colonnes
  `topic`, `theme`, `domain`, `subdomain` remplacées par une référence (additif d'abord, retrait
  ensuite : destructif, inventaire des usages exigé).
- À reprendre : menu d'Automaths, éditeur de modèles, formulaire d'exercice, `create-questions.ts`
  et scripts de fiches, `/api/questions/categories`.
- Les points du programme (`question_template_points`) ne changent pas.

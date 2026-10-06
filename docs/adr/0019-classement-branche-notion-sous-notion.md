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
- **Niveaux scolaires** portés par la notion **et** par la sous-notion : une sous-notion sans niveaux
  hérite de ceux de sa notion ; avec des niveaux, ils sont pris parmi ceux de sa notion.
- **Rangement** : un **modèle de questions** pointe vers **un seul** nœud (notion ou sous-notion) ; un
  **exercice** vers **un ou plusieurs**, l'un pouvant être marqué principal (le premier par défaut).
  Obligatoire pour tout nouvel élément. Nœud hors des niveaux du contenu : **avertissement**, pas de
  refus (exercice d'approfondissement).
- **Sous-notion** : facultative.
- **Pas de lien entre l'arbre et le programme officiel** : le lien passe déjà par les points du
  programme rattachés aux contenus ; il s'ajoutera si une page en a l'usage.
- **Un champ par question posée, sans recouvrement** (complété le 2026-10-07) :
  - de quoi ça parle → l'arbre (exercices et questions) ;
  - quel genre de tâche → **catégorie** d'exercice (existante : automatisme, application, recherche,
    synthèse…) ; une question n'en a pas : elle est **question de cours** (marqueur existant) ou, à
    défaut, automatisme ;
  - d'où ça vient → **source** (exercices seulement) : texte libre existant (« BAC Juin 2025 Asie J1 »)
    plus un **type de source** en liste fermée (Bac, Brevet, Concours, Manuel…) pour filtrer ;
  - dans quel ordre on progresse → **niveau de difficulté** des questions (`level`, existant) ;
  - sous quelle forme on répond → **type** de question (existant) ;
  - mot-clé transversal (lecture graphique, algorithme, démonstration, modélisation) → **tags** ; les
    tags de contenu deviennent des notions ou sous-notions au reclassement, « bac » et « terminale »
    sont retirés ; les exercices Python gardent leurs tags.
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
- **Un « type d'activité »** (proposé le 2026-10-06) : chacune de ses valeurs avait déjà une place —
  Apprivoiser = niveau de difficulté bas, À trou = forme d'énoncé (pas un classement), astucieux =
  sous-notion « calcul astucieux ».
- **Une catégorie pour les questions** : elle n'aurait que deux valeurs, que le marqueur « question de
  cours » donne déjà.

## Conséquences

- Tables neuves (nœuds de l'arbre, niveaux, rattachements, types de source) ; colonnes
  `topic`, `theme`, `domain`, `subdomain` remplacées par une référence (additif d'abord, retrait
  ensuite : destructif, inventaire des usages exigé).
- À reprendre : menu d'Automaths, éditeur de modèles, formulaire d'exercice, `create-questions.ts`
  et scripts de fiches, `/api/questions/categories`.
- Les points du programme (`question_template_points`) ne changent pas.

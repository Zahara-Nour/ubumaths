# 0018 — Chapitres : une liste tenue par le prof, distincte de la source

- **Statut** : remplacée par [0019](0019-classement-branche-notion-sous-notion.md)
- **Date** : 2026-10-06 · **Décidée par** : David

## Contexte

Le « thème » d'un exercice (`exercises.topic`) et celui d'un modèle de questions
(`question_templates.theme`) étaient du texte libre, saisi sans proposition. Mesuré le 2026-10-06 :
doublons (« Fonction » / « Fonctions », « Bac » / « BAC », fusionnés ce jour-là), étiquettes isolées
(« Equations », « Inégalités », « Inéquations », « Nombres »), et des valeurs qui ne sont pas des
contenus (« BAC », « Concours général », « Automatismes »). Les deux champs divergent : en lycée,
« Fonctions » couvre 85 modèles de 1re, alors que les exercices distinguent Second degré, Suites,
Dérivation…

Le mot « thème » désigne déjà le regroupement du programme officiel (`curriculum_themes`), plus large
et défini seulement pour 6 niveaux (2, 1re spé, terminale spé, expertes, complémentaires, 6e).

## Décision

- Le découpage fin s'appelle **chapitre**. Une **seule liste** classe exercices et modèles de
  questions ; elle est en base et **David l'édite depuis une page d'administration**.
- Un chapitre est valable à **un ou plusieurs niveaux**. Un élément porte **un seul** chapitre, valable
  à tous ses niveaux.
- Pour chacun de ses niveaux, un chapitre peut être rattaché à un thème du programme. Ce rattachement
  est **facultatif** : le collège et le primaire n'ont pas de thème en base.
- Chapitre **obligatoire** pour tout nouvel élément. Les existants reprennent leur valeur actuelle ;
  ce qui ne correspond à aucun chapitre va dans une liste « à classer ».
- Les éléments désignent le chapitre, pas son nom : un renommage se répercute partout. Un chapitre
  utilisé ne se supprime pas, il s'**archive** (absent des choix, conservé par les éléments).
- **Source** (BAC, Concours général, Automatismes…) : champ séparé, facultatif, liste fermée éditable
  comme les chapitres, commune aux exercices et aux modèles.

## Écarté

- **Proposer les valeurs déjà saisies sans imposer de liste** : supprime les fautes de frappe, mais
  laisse la liste diverger ; David a préféré une liste tenue.
- **Réutiliser `curriculum_themes`** : trop grossier (« Fonctions » pour tout le lycée) et absent de
  la plupart des niveaux.
- **Liste figée dans le code** : chaque ajout de chapitre aurait demandé une PR.
- **Un chapitre par niveau** (« Suites 1re » ≠ « Suites terminale ») : les 55 modèles à deux niveaux
  auraient dû porter deux chapitres.
- **Source mêlée aux chapitres** : un sujet de bac sur les suites n'aurait pas de chapitre.

## Conséquences

- Tables neuves (chapitres, leurs niveaux et rattachements, sources) ; `exercises.topic` et
  `question_templates.theme` remplacés par une référence. Migration additive d'abord, retrait des
  anciennes colonnes ensuite (destructif : inventaire des usages exigé).
- Les formulaires d'exercice et de modèle proposent une liste déroulante filtrée par niveau.
- Les scripts de création de fiches (`scripts/create-*.ts`, `create-questions.ts`) passent du nom
  libre au chapitre.

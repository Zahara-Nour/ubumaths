# 0030 — Le type de fiche décide de la forme du PDF ; les options d'affichage disparaissent

- **Statut** : acceptée — mise en œuvre à faire
- **Date** : 2026-10-15 · **Décidée par** : David

## Contexte

Trois réglages d'une fiche se recouvrent et embrouillent le prof :

- le **type** (Fiche d'exercices, Contrôle, Examen, Quiz, Devoirs) ne change presque rien au PDF :
  seuls Contrôle et Examen ajoutent un cadre de réponse sous l'énoncé
  (`hasAnswerSpace`, `src/lib/worksheets/document/render-exercise.ts`) ; ailleurs, c'est une
  étiquette ;
- le **style** (ADR 0028) décide de l'apparence, mais quatre styles de Chiphre portent le nom d'un
  type (« Contrôle », « Examen », « Devoirs », « Quiz ») : on peut choisir le type « Fiche
  d'exercices » avec le style « Examen » ;
- les **options d'affichage** (titre, date, nom, classe, points, numérotation, format, taille de
  police, marges, corrigé concis ou détaillé) doublent en partie le style : « Fiche élève »
  n'imprime jamais les points, quelle que soit la case (ADR 0028, D8).

Or une fiche d'exercices et une évaluation ne diffèrent que par la forme : nom de l'élève, points,
titre, place pour répondre.

## Décision

| Sujet          | Décision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types          | Quatre : **Fiche d'exercices**, **Évaluation écrite**, **Devoir maison**, **Examen blanc**. Quiz disparaît.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Le type décide | Le type fixe l'en-tête et ce qui l'accompagne (tableau ci-dessous). Plus de cases « afficher le nom, la classe, la date… ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Style          | Inchangé (ADR 0028) mais réduit à l'**apparence** : les styles de Chiphre qui imitent un type (Contrôle, Examen, Devoirs, Quiz) sortent de la liste.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Options        | Les options d'affichage disparaissent. Restent, selon le type : **nom de l'élève** (option de la fiche d'exercices, pour les groupes de niveaux), **points** (option de l'évaluation écrite), **calculatrice autorisée / interdite** (évaluation écrite et examen blanc), **date de rendu** (devoir maison), **réponses sur le sujet** (évaluation écrite et examen blanc).                                                                                                                                                                                                                                      |
| Corrigé        | **Toujours détaillé** : l'option « corrigé concis ou détaillé » de la fiche disparaît. Remplace la règle du glossaire « sur une fiche PDF, la fiche choisit concise ou détaillée » ; l'ADR 0017 (concise à l'écran, détails marqués dans le texte) est inchangé.                                                                                                                                                                                                                                                                                                                                                 |
| Format         | **Toujours A4**, y compris en anglais (David n'imprime qu'en A4). Numérotation, taille de police et marges : décidées par le style.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cadres         | Avec « réponses sur le sujet » : un cadre **après chaque question** (par défaut) ou **après l'exercice**, choix de la fiche. Hauteur **estimée** d'après la longueur de la réponse dans le corrigé, **ajustable question par question en nombre de lignes** (pour faire tenir une évaluation sur une page, par exemple), réglage enregistré **dans la fiche**, pas dans l'exercice. Le serveur envoie à l'élève la hauteur des cadres de sa copie (jamais le texte du corrigé) : son PDF a les mêmes cadres que celui du prof (accès validé par David le 2026-10-15). Sans l'option : copie à part, aucun cadre. |

| Le PDF imprime                     | Fiche d'exercices | Évaluation écrite | Devoir maison | Examen blanc |
| ---------------------------------- | :---------------: | :---------------: | :-----------: | :----------: |
| Titre                              |         ✓         |         ✓         |       ✓       |      ✓       |
| Nom, classe                        |   nom : option    |         ✓         |       ✓       |      ✓       |
| Date                               |                   |         ✓         | date de rendu |      ✓       |
| Points par exercice et total       |                   |      option       |               |   toujours   |
| Calculatrice autorisée / interdite |                   |         ✓         |               |      ✓       |
| Durée                              |                   |                   |               |      ✓       |
| Cadres de réponse                  |                   |      option       |               |    option    |

## Écarté

- **Garder le type comme simple étiquette et tout régler par options** : c'est l'état actuel, qui
  embrouille ; trois réglages pour une seule intention.
- **Fusionner type et style** : le style reste utile pour l'apparence seule (deux colonnes,
  minimaliste…), indépendamment de la nature du document.
- **Cadres de taille unique** : la place utile varie beaucoup d'une question à l'autre.
- **Tailles des cadres dans l'exercice** : un même exercice sert sans cadre dans une fiche
  d'exercices et avec de grands cadres dans une évaluation.
- **« Évaluation » seule** : terme banni du glossaire (« contrôle » désigne la série notée en ligne).

## Conséquences

- Aucune fiche à convertir : les 32 fiches en base sont des fiches d'exercices (vérifié le
  2026-10-15). La valeur `quiz` disparaît des choix ; `assessment`, `exam` et `homework` prennent
  les libellés Évaluation écrite, Examen blanc et Devoir maison.
- Les clés d'affichage de `worksheets.config` (`show_*`, `numbering_style`, `page_layout`,
  `font_size`, `margins`, `correction_detail`) ne sont plus lues ; les retirer des données est une étape à part, avec
  l'accord de David.
- `CONTEXT.md` : la ligne **Contrôle** ne dit plus « sur papier : une fiche de type contrôle » ;
  entrée **Type de fiche** ajoutée ; **Correction détaillée** : le corrigé PDF est toujours détaillé.
- Les cadres demandent un réglage par question dans la fiche (nouvelle donnée, migration additive).
- **Nom pré-imprimé** : imprimer une fiche en **une copie par élève**, chacune à son nom (classe ou
  groupe de niveaux), pour donner la bonne fiche à la bonne personne. Le nom vient de la liste des
  élèves, jamais d'une saisie ; lot à part, après les cadres. Décidé avec David : on imprime les
  élèves **d'une affectation** (classes et élèves visés, chacun au niveau de guidage de
  l'affectation), depuis un bouton **sur l'affectation** ; le prof **voit le PDF** (toutes les
  copies à la suite, ordre alphabétique, et la copie de chaque élève) avant de l'imprimer. Accès :
  le prof seul, PDF fabriqué dans son navigateur et jamais stocké ; aucun nouvel accès.

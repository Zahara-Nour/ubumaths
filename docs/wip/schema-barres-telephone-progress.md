# Chantier « schema-barres-telephone » — schéma en barres lisible dans une case choix sur téléphone

> N° 34 de [outils-manquants.md](outils-manquants.md). Vu au lot 13 de `questions-6`
> ([journal § 30.1](../archive/wip/questions-6-progress.md)).

## Reprendre ici

_Mis à jour le 2026-11-13, avant l'ouverture de la PR._

- **État** : correctif écrit, tests verts (scène et rendu), mesuré dans l'appli à 390 px.
- **Prochaine action** : PR, CI, merge ; n° 34 passé dans « Livré » de `outils-manquants.md`.
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-schema-barres-telephone` · `fix/schema-barres-telephone`.

## 1. Mesure (2026-11-13)

Modèle 1 du lot 13 (trois schémas en choix), rendu dans `/demo/questions` à 390 px (cadre de 390 px, question
ajoutée en local seulement) :

| Écran                               | Avant : dessin, texte | Après : dessin, texte |
| ----------------------------------- | --------------------- | --------------------- |
| Saisie, Révisions, Flash-cards      | 258 px, 9 px          | 258 px, 12 px         |
| En classe (carte de 260 px)         | 151 px, 5 px          | 151 px, 11 px         |
| Grand écran (dessin à taille fiche) | 381 px, 13 px         | inchangé              |

Cause : la plus longue barre fait toujours 360 unités ; le dessin entier est réduit à la case, texte compris.

## 2. Décision de David (2026-11-13)

Parmi : barres raccourcies, lettre au-dessus du dessin, ne rien faire, retirer le schéma du modèle 1 →
**barres raccourcies** (recommandé).

## 3. Comportements

- Colonne large ou inconnue (rendu serveur, avant montage) : 360 unités, comme au PDF (PDF inchangé).
- Colonne étroite : barres raccourcies pour que le texte rendu fasse 12 px ; noms, total, hauteurs inchangés ;
  échelle commune gardée dans le schéma.
- Plancher : 120 unités, et jamais sous la longueur où une étiquette sortirait de sa part (marge 4 unités) ;
  au plancher, le texte rapetisse (« En classe » : 11 px).
- Tests : `schema-barres-scene.test.ts` (calcul), `SchemaBarres.svelte.test.ts` (rendu dans une colonne de 258 px,
  rouge sans le correctif).

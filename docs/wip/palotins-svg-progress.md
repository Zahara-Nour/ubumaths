# Les Palotins redessinés et animés — journal

> Branche `feat/palotins-svg`, worktree `../ubumaths-wt-palotins-svg`. Démarré le 2026-10-21.
> Suite de [palotin-boucle-progress.md](palotin-boucle-progress.md) (la boucle des pansées, terminée).
> Comparatif visuel : https://claude.ai/artifact/Qxf2d25VYn5JiFvLQ1knKg

## Reprendre ici

_Mis à jour le 2026-10-21, PR #1580 ouverte._

- **État** : PR #1580 ouverte (revue faite, correctif `<picture>` poussé) : 21 SVG animés + 21 versions `-fixe` dans `static/images/buddies/`, `determined` dans `BuddyExpression`, `incorrect` et `streak_lost` → `determined`, réactions (bond, tressaut, affaissement) dans `BuddyAvatar.svelte`.
- **Décidé par David (2026-10-21)** : recos suivies — `streak_lost` → « déterminé » ; « triste » après **21 jours** sans connexion, une seule fois au retour, réplique « tu m'as manqué », à la place de `streak_lost`.
- **Prochaine action** : CI verte → merge ; puis phase 0 du contexte « absence longue » (comportements en français, source de la dernière connexion à vérifier).
- **Pièges en cours** : une `<img>` ne transmet pas « réduire les animations » au SVG (Chromium) → versions `-fixe` choisies par `<picture><source media>` (pas `prefersReducedMotion` : `false` au rendu serveur, `src` non corrigé à l'hydratation — trouvé en revue). Générateur : `node gen.mjs && node gen2.mjs && node page.mjs` dans `scripts/palotins-svg/`, puis copier `final/*.svg`.
- **Worktree / branche** : `../ubumaths-wt-palotins-svg` · `feat/palotins-svg`.

## Décisions de David (2026-10-21)

1. Style « affiche de cabaret » (Steinlen 1896) + pièce héraldique portée sur le vêtement : écusson gironné d'or et de sable (Giron), pile d'or en plastron (Pile), cotice d'or en écharpe (Cotice). Les autres styles (pantins, blason, bois gravé) sont écartés.
2. Pas de spirale (gidouille) sur le ventre : réservée au Père Ubu.
3. Joyeux, formes pas trop simples ; traits fins (épaisseurs × 0,6).
4. Aucun doigt levé seul au milieu du poing : Cotice tient un livre (plus d'index levé), Giron fait un 👍 pouce au bord du poing.
5. Plume de Cotice : vraie plume d'oie (barbes, tuyau), pas une lame.
6. Essai « affermi » (tête plus petite, yeux en amande, ombre au lieu des joues roses) écarté : on garde la version d'avant (`gen2.mjs` = cet essai, gardé pour mémoire).
7. Animation au repos dans le SVG (respiration, clignement, chapeau, geste propre à chacun, rythmes différents) : validée. Réactions dans le composant (bond, tressaut, affaissement) : validées.
8. Cotice « content » refait : sa bouche ronde faisait peur → yeux plissés de rire et grand sourire ouvert.
9. Pas de Palotin triste après une erreur : nouvelle expression « déterminé ». « Triste » gardé pour une longue absence de l'élève.
10. Constance perdue → « déterminé ». Longue absence = 21 jours sans connexion (14 attraperait les petites vacances), une fois au retour, « tu m'as manqué », remplace `streak_lost`.

## Gestes par expression

Giron lève le pouce en content / excité / encourageant, main au menton en pensif, rien en neutre / triste. Pile : carte tombante en triste, brandie en excité, clin d'œil seulement en content. Cotice : livre fermé en triste, lu (regard baissé) en pensif. Étincelles d'or en excité.

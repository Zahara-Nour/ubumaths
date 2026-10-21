# Les Palotins redessinés et animés — journal

> Branche `feat/palotins-svg`, worktree `../ubumaths-wt-palotins-svg`. Démarré le 2026-10-21.
> Suite de [palotin-boucle-progress.md](palotin-boucle-progress.md) (la boucle des pansées, terminée).
> Comparatif visuel : https://claude.ai/artifact/Qxf2d25VYn5JiFvLQ1knKg

## Reprendre ici

_Mis à jour le 2026-10-21, avant la première PR._

- **État** : 7 expressions × 3 Palotins dessinées et animées (21 SVG dans `scripts/palotins-svg/final/`, rien encore dans `static/images/buddies/`). « Déterminé » fait : regard décidé (paupière à plat), sourire en coin ; Giron lève le poing manche retroussée, Pile rebat son paquet, Cotice tourne la page.
- **Décidé par David (2026-10-21)** : après une erreur → « déterminé » ; « triste » gardé pour une longue absence (contexte à créer dans `CONTEXT_EXPRESSION_MAP`).
- **En attente de David** (recos données) : (a) absence longue = **21 jours** (14 attraperait les petites vacances), une seule fois au retour, réplique « tu m'as manqué », remplace `streak_lost` ; (b) `streak_lost` → **« déterminé »** (les 12 répliques disent « on repart »).
- **Prochaine action** : David regarde « déterminé » (`scripts/palotins-svg/palotins-styles.html`) ; puis PR : 21 SVG dans `static/images/buddies/`, `determined` dans `BuddyExpression`, `incorrect` (+ `streak_lost` si (b)) → `determined`, réactions (bond, tressaut, affaissement) dans `BuddyAvatar.svelte`, « réduire les animations » dans une `<img>`. Absence longue = phase 0 à part.
- **Pièges en cours** : relancer `node gen.mjs && node gen2.mjs && node page.mjs` dans `scripts/palotins-svg/` ; sorties ignorées par git (`final/` = les fichiers à copier).
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

## Gestes par expression

Giron lève le pouce en content / excité / encourageant, main au menton en pensif, rien en neutre / triste. Pile : carte tombante en triste, brandie en excité, clin d'œil seulement en content. Cotice : livre fermé en triste, lu (regard baissé) en pensif. Étincelles d'or en excité.

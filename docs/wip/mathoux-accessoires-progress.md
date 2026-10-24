# Mathoux : gidouilles du travail et décorations de panse — journal

> Branche `feat/mathoux-accessoires`, worktree `../ubumaths-wt-mathoux-accessoires`. Démarré le
> 2026-10-24. Suite de [mathoux-sans-gidouille-progress.md](mathoux-sans-gidouille-progress.md) ;
> conception : [mathoux-conception.md § 4, étape 3](mathoux-conception.md).

## Reprendre ici

_Mis à jour le 2026-10-24, phase 0 validée._

- **État** : phase 0 validée (ci-dessous) ; lot A en cours, rien de codé.
- **Prochaine action** : réponse de David à la question d'accès du lot A, puis la migration
  (colonnes « déjà payé » + fonction de versement), avec ses tests d'intégration rouges d'abord.
- **En attente de David** : question d'accès du lot A.
- **Pièges en cours** : fonction SQL et code qui l'appelle = deux PR (`db:types` depuis la prod).
- **Worktree / branche** : `../ubumaths-wt-mathoux-accessoires` · `feat/mathoux-accessoires`.

## Constat (2026-10-24)

- Le travail mathématique ne rapporte **aucune** gidouille : Entraînement, révisions, fiches et
  Mathoux ne donnent que l'XP du Palotin (seule exception : +1 pour une erreur de fiche signalée).
- Jeux : 1 gidouille à la première victoire du jour, par jeu (démineur, énigmes, 2048, Mathémo).
- Prix de comparaison : tirage VIP 3, pouvoirs de jeu 5 à 40, changement de Palotin 50.
- Prod : 81 élèves, **aucune** ligne `student_mathoux`, aucun point réussi → rattrapage nul
  aujourd'hui (le mécanisme le fera de lui-même si des Mathoux naissent avant la livraison).
- Hors sujet, noté : achat VIP et changement de Palotin débitent sans ligne `gidouilles_activity` ;
  l'élève peut baisser son propre solde (policy de self-update) sans trace.

## Phase 0 — décisions de David (2026-10-24, recommandations validées)

### Lot A : les gidouilles récompensent le travail

- Une fois par étape franchie, jamais deux : naissance (chaton) **+3**, matou **+5**, grand matou
  **+10**, étoile de classe **+5**. Un Mathou qui s'endort, se réveille ou dont un point change de
  tagage ne repaie rien.
- **+2 par jour** quand le forfait de révision du jour est donné (lié au forfait du Palotin : pas
  de forfait, pas de gidouilles).
- Crédit côté serveur, ligne au journal des récompenses (« Ton Mathou … est devenu matou : +5 »).
  Crédit en échec : le Mathou grandit quand même, versement retenté au calcul suivant, jamais en
  double.
- **Rattrapage** : oui, une fois, annoncé par le Palotin (nul en prod aujourd'hui, voir constat).

### Lot B : décorations de panse

- Catalogue fixé dans le code : **6 décorations**, prix **10 / 20 / 40** (petite gidouille,
  cocarde, médaille de l'Ordre de la Grande Passoire, blason, étoile, cœur — à choisir sur une page
  de dessins ; pas de croissant, réservé au Lunaire).
- Achetée une fois, posable sur n'importe quel Mathou né, une par Mathou ; retrait ou changement
  gratuit. Silhouette : non ; sieste : la garde. Ni échange ni revente.
- Achat atomique côté serveur (solde vérifié, débité, décoration donnée d'un coup).
- **Accès** : l'élève voit les siennes, le prof celles des élèves de ses classes, les autres élèves
  rien. Écriture serveur seule. Export RGPD avec les Mathoux.
- Races à motif de panse, à trancher race par race sur la page de dessins. Penchant : smoking et
  marbré → par-dessus ; arlequin → losanges écartés ; Lunaire → croissant au front ou au cou, ou
  pas de décoration.
- Panse seule en v1. Colliers au lot suivant (règle à trouver pour la fraise du grand matou).
  **Pelages jamais vendus** (identité de la race).

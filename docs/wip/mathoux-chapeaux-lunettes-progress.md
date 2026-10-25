# Mathoux : chapeaux et lunettes (lot D des accessoires) — journal

> Branche `feat/mathoux-chapeaux-lunettes`, worktree `../ubumaths-wt-mathoux-chapeaux-lunettes`.
> Démarré le 2026-10-25. Suite de [mathoux-colliers-progress.md](mathoux-colliers-progress.md)
> (lot C) et [mathoux-accessoires-progress.md](mathoux-accessoires-progress.md) (lots A et B).

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0 tranchée._

- **État** : phase 0 tranchée par David (ci-dessous) ; rien de codé.
- **Prochaine action** : planche de dessins (comme `scripts/mathoux-planches/colliers.test.ts`) :
  plusieurs lunettes et plusieurs chapeaux, en variantes A/B, sur le vrai `MathouAvatar`
  (chaton, matou, grand matou SANS couronne quand il porte un chapeau ; sieste = bonnet de nuit,
  sans lunettes) ; page publiée pour que David choisisse modèles et prix.
- **En attente de David** : le catalogue (combien, lesquels, prix), sur la planche.
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar`.
- **Worktree / branche** : `../ubumaths-wt-mathoux-chapeaux-lunettes`, `feat/mathoux-chapeaux-lunettes`.

## Phase 0 — décisions (2026-10-25)

- **Emplacements** : deux nouveaux, **yeux** (lunettes) et **tête** (chapeaux) ; une pièce au plus
  par emplacement, cumulables entre eux et avec panse et cou.
- **Règles** (calquées sur panse et cou, recommandation acceptée) : achetée une fois, orne un seul
  Mathou à la fois ; déplacement et retrait gratuits ; consentement exigé à l'achat ; vitrine du
  Marché sans achat ; vue prof : visible ; silhouette : rien.
- **Grand matou** (choix de David) : le chapeau **remplace la couronne** ; sans chapeau, la
  couronne revient.
- **Sieste** (recommandation acceptée) : le **bonnet de nuit remplace le chapeau** ; le chapeau
  revient au réveil.
- **Lunettes en sieste** (choix de David) : **retirées** pendant la sieste, reviennent au réveil.
- **Stockage** (recommandation acceptée) : comme les colliers — même table d'achats
  (`student_mathou_decorations`), même catalogue, emplacements `eyes` / `head` ; deux colonnes
  nullables neuves sur `student_mathoux` (`glasses`, `hat`). Une migration additive, puis le code.
- **Accès** (question tranchée en phase 0 : rien de nouveau) : l'élève voit les siennes, le prof
  celles de ses élèves, les autres élèves rien ; écriture serveur seule.

## Historique

- 2026-10-25 — phase 0 tranchée (questions posées en fin de session des colliers, #1725).

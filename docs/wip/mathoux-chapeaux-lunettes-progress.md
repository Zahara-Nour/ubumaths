# Mathoux : chapeaux et lunettes (lot D des accessoires) — journal

> Branche `feat/mathoux-chapeaux-lunettes`, worktree `../ubumaths-wt-mathoux-chapeaux-lunettes`.
> Démarré le 2026-10-25. Suite de [mathoux-colliers-progress.md](mathoux-colliers-progress.md)
> (lot C) et [mathoux-accessoires-progress.md](mathoux-accessoires-progress.md) (lots A et B).

## Reprendre ici

_Mis à jour le 2026-10-25, planche publiée._

- **État** : planche des dessins publiée (https://claude.ai/artifact/7iaTAB3MWhm6dCg764kKqb) :
  5 lunettes et 6 chapeaux, en A/B, sur le vrai `MathouAvatar` ; rien de codé dans l'appli.
- **Prochaine action** : lire les choix de David (`ArtifactData` list, collection `choix`, doc
  `david`), puis écrire le plan (migration additive `glasses` / `hat`, dessins dans
  `mathou-dessin.ts`, rendu dans `MathouAvatar`, Chatterie et Marché).
- **En attente de David** : le catalogue (modèles, variante A/B, prix) sur la planche.
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar` ;
  chapeau à l'échelle bornée (0,92 à 1,35 de la tête du matou), sinon trop petit sur le grand matou.
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
- 2026-10-25 — planche `scripts/mathoux-planches/chapeaux-lunettes.test.ts` publiée pour le choix.

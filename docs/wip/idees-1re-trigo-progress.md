# Chantier `idees-1re-trigo` : idées de la rubrique « fonctions trigonométriques » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-25, lot écrit, brouillons à créer en prod._

- **État** : lot écrit et vert sur la branche `docs/idees-1re-trigo` (worktree
  `../ubumaths-wt-idees-1re-trigo`, poussée, pas de PR) : 2 modèles neufs (N1 [0 ; 2π[, N2 sin x
  connaissant cos x) et 7 variations de 5 publiés, migration de contenu générée
  (`20261125064801`, test d'intégration vert) · **Prochaine action** : après les brouillons, ids
  commités, migration de rangement, `security-auditor`, PR · **En attente de David** :
  `create-questions --dir scripts/questions/idees-1re-trigo-neufs --publier` depuis le worktree ·
  **Pièges en cours** : l1s-3 ; titre d'un publié non modifiable (d'où N1) ; `√0,91` refusé par la
  forme (annoncé dans la consigne).

## Journal

### 2026-11-25 — réservation, relevé, phase 0

- Rubrique 1AN4 (6 exercices) réservée dans [idees-ailleurs-repartition.md](idees-ailleurs-repartition.md)
  (`9795fd3f1`).
- Relevé : 1 ✅ (hors programme, déjà en brouillon), 5 🟡, 0 ❌. La 1re spé est déjà bien couverte
  (9 modèles publiés sur 1SPE-303 à 1SPE-410) ; il manque des plages et des sens.
- Phase 0 : 1 modèle neuf (F5 : sin x connaissant cos x, 1SPE-305) et 8 variations sur 5 modèles publiés :
  F1 4b3c1d88 +2, F2 f7194c9d +2, F3 aad6c700 +1, F4 679a2e3e +2, F6 ee4e2ac6 +1. F7 dit ce qui n'est pas
  repris (1AN41-2, hors programme par l1s-3).
- Aucun des 5 modèles publiés n'est réservé par une autre session (grep de `docs/wip/`).
- Question d'accès : personne ne gagne d'accès (rangement et variations de modèles).
- Rien pour `outils-manquants.md` : la figure à points nommés de l'autre plateforme est remplacée par le
  geste `placer:` du bloc `trig`.

### 2026-11-25 — lot écrit

- David : « je valide les modèles », puis « tout le lot » (variations comprises). Page à cocher sans
  verdict.
- F2 : le titre de f7194c9d (« … dans ]−π ; π] ») ne peut pas changer par la migration de contenu ;
  David choisit un modèle neuf N1 « Ramener un réel dans [0 ; 2π[ » (3 variations, 1SPE-304, cercle
  et radians, niveau 2). f7194c9d ne reçoit que la variation « dénominateurs 5 et 12 ».
- N2 (F5) « Calculer sin x connaissant cos x » : 4 variations, 1SPE-305, cosinus et sinus d'un réel,
  niveau 3. **Écart à la fiche** : `√0,91` est refusé par la contrainte de forme (`form`) ; couper la
  forme accepterait aussi des calculs non finis. La consigne de la variation décimale (N2 V4,
  ee4e2ac6 V7) dit « sans racine d'un nombre décimal ($\frac{\sqrt{91}}{10}$ plutôt que
  $\sqrt{0{,}91}$) ».
- Variations : 4b3c1d88 +2, f7194c9d +1, aad6c700 +1 (description mise à jour), 679a2e3e +2,
  ee4e2ac6 +1. Chaque case a 2 ou 3 erreurs prévues, chaque variation un coup de pouce.
- Vérifs : specs 41/41 (neufs) et 43/43 ajoutées (publiés, anciennes comprises vertes) ; 8 300
  tirages ; 2 708 formules d'aperçu passées à `validateLatex` + accolades, 0 problème ;
  `create-questions` en simulation vert. Base locale : 2 brouillons créés (ids retirés des
  fichiers), aperçus vus par `pnpm voir` (iPhone), 0 erreur de console.
- Migration de contenu des 5 publiés générée, test `migrations-contenu-publie` vert (172 tests).
- 5 modèles publiés réservés dans le tableau de répartition (`9178f3229`). Ce commit a emporté par
  erreur 2 réservations non commitées d'`idees-3e-trigonometrie` (contenu juste) ; session prévenue.

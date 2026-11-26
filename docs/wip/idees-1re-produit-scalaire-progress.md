# Chantier `idees-1re-produit-scalaire` : idées de la rubrique « produit scalaire » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-26, lot écrit._

- **État** : phase 0 validée (« je valide tout ») ; lot écrit et vérifié : 5 modèles neufs
  (`scripts/questions/idees-1re-produit-scalaire-neufs/`) et 11 variations sur 7 publiés
  (`…-publies/`, migration de contenu `20261126090426` générée, test vert) ·
  **Prochaine action** : quand David a créé les brouillons en prod, commiter les ids, générer la
  migration de rangement, `security-auditor`, PR · **En attente de David** :
  `create-questions --dir scripts/questions/idees-1re-produit-scalaire-neufs --publier` en prod ·
  **Pièges en cours** : relancer le script des neufs GARDE les ids écrits en tête ; f2cc01fc a un
  écart ouvert (termes nuls), la variation ajoutée n'en écrit pas ·
  **Worktree / branche** : `../ubumaths-wt-idees-1re-produit-scalaire`, `docs/idees-1re-produit-scalaire`.

## Journal

### 2026-11-26 : réservation, relevé, phase 0

- Rubrique 1G1 (10 exercices) réservée dans [idees-ailleurs-repartition.md](idees-ailleurs-repartition.md)
  (`560dd0596`).
- Relevé : 21 cas, 7 ✅, 10 🟡, 4 ❌. La 1re spé est bien couverte (25 modèles publiés sur les nœuds du
  produit scalaire, 1SPE-310 à 1SPE-436). Il manque des figures (parallélogramme, figure à points
  espacés, quadrillage, vecteurs dessinés), des vecteurs qui ne partent pas du même point, et deux
  synthèses en repère (aire d'un triangle, droite d'Euler).
- 1SPE-310 (projection) et 1SPE-412 (cosinus) n'ont qu'un QCM de cours chacun : N1, N2 et N3 les
  renforcent.
- Aucun des 7 modèles publiés n'est réservé par une autre session (grep de `docs/wip/`).
- Question d'accès : personne ne gagne d'accès (rangement et variations de modèles).
- Rien pour `outils-manquants.md` : le bloc `figure` fait le quadrillage, les vecteurs et le
  parallélogramme.
- Page à cocher (verdicts dans sa base, collection `verdicts`) : https://claude.ai/artifact/Pq3pagc1h93TH99Lo5hgze.

### 2026-11-26 : lot écrit

- David : « je valide tout » (F5 avec l'étape « AB·HC = 0 » gardée, F3 penché jamais nul).
- Scripts : `docs/wip/questions/idees-1re-produit-scalaire-{commun,neufs,publies}.py`.
- Modèles neufs, niveaux relevés en prod (expressions : 1 à 5, 9, 10 ; angles et longueurs : 1 à 8 ;
  propriétés : 1 à 7) : N1 parallélogramme (1SPE-412, expressions, niveau 6, 4 variations), N2 figure
  graduée (1SPE-310, expressions, 7, 4), N3 quadrillage (1SPE-310, expressions, 8, 4), N4 aire d'un
  triangle (1SPE-320, angles et longueurs, 9, 2), N5 droite d'Euler (1SPE-436, propriétés, 8, 2).
- Variations : b73923a1 +1, 9c7f7ef0 +1, d787d8c0 +1, fe407c88 +3, f2cc01fc +1, 6058963e +2,
  bf5dadf6 +2. Chaque case visée a ses erreurs prévues (2 ou 3, aucune inventée), chaque variation un
  coup de pouce. Migration de contenu `20261126090426_questions_idees_1re_produit_scalaire_publies_contenu`
  générée ; `migrations-contenu-publie` vert (213 tests).
- Écarts aux fiches : N3 V4 tire k parmi −2, 2, 3 (pas de « 1·AB » ni « −1·AB » dans le corrigé) ;
  N5 sans figure (les coordonnées suffisent) et sans côté parallèle à un axe (corrigé sans terme nul).
- Vérifs : specs 69/69 (neufs) et toutes vertes sur les publiés (anciennes comprises) ; 300 tirages
  par variation ; `sonde-figures` 0 problème ; 9 953 formules d'aperçu passées à `validateLatex` +
  accolades, 0 problème ; `create-questions` en simulation vert. Base locale : 5 brouillons créés
  (ids retirés des fichiers), aperçus vus par `pnpm voir` (iPhone, Safari) pour N1, N2, N3, N5,
  0 erreur de console.
- Pièges : variable `e` refusée (constante d'Euler) ; une variable ne se construit pas par
  `{{if}}` (calcul arithmétique à la place) ; pas d'`eval` imbriqué dans une figure ; messages
  réécrits à la résolution (`(AB)` → `\left( AB \right)`, `ED=AD-AE` → `ED = AD - AE`).
- 7 modèles publiés réservés dans le tableau de répartition (`a21fe1500`).

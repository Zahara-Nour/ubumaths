# Chantier `idees-1re-geometrie-reperee`

## Reprendre ici

_Mis à jour le 2026-11-27, modèles validés par David._

- **État** : N1 (75a03073) et N2 (bbafb6dd) validés par David (« je valide les modeles »), `publier-lot.ts` simulé (2 passent), garde des niveaux verte · **Prochaine action** : vérifier par le MCP que les 2 sont `published`, puis finir : rubrique 1G2 « publiée » dans `idees-ailleurs-repartition.md`, journal, relevé et fiches versés selon `couvrir-un-niveau.md` (archive `docs/archive/wip/idees-1re-geometrie-reperee/`) · **En attente de David** : `pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/idees-1re-geometrie-reperee-neufs --publier` · **Pièges en cours** : aucun · **Worktree / branche** : aucun

## Historique

### 2026-11-27 — prise et relevé

- Rubrique 1G2 réservée sur `main` (390bb6f4c2).
- 5 exercices lus dans la copie locale (1G20-1, 1G20-2, 1G20-3, 1G21-1, 1G21-2 ; `Old` ignorés).
- Prod (lecture seule) : 16 modèles publiés sur les points de géométrie repérée de 1re spé, tous
  rangés sous « Géométrie repérée ». Les deux synthèses sont les seuls manques.
- [Relevé](idees-1re-geometrie-reperee-releve.md) · [fiches](idees-1re-geometrie-reperee-fiches.md).
- Question d'accès de la migration : personne (on range deux modèles).
- Page à cocher de la phase 0 : https://claude.ai/artifact/KcQ3rQhyGqn2jhJFDjgcBJ (verdicts en base, collection `verdicts`).

### 2026-11-27 — phase 0 tranchée, lot écrit

- David : « je valide tes recos » → F1 et F2 oui, point 1SPE-437 pour les deux (sous-notion
  « projeté orthogonal », niveaux 4 et 5).
- Script `docs/wip/questions/idees-1re-geometrie-reperee-neufs.py` → N1 (2 variations, 15 specs),
  N2 (2 variations, 14 specs). N1 a 8 cases (et non 9 comme l'annonçait la page à cocher).
- Écarts aux fiches, faits en écrivant :
  - N1 V2 : AB² ⩽ 50 en plus, pour que H n'ait pas des fractions énormes.
  - N2 : le cercle passe par un point entier M0 de (CH), pour que le cas « sur les deux » existe ;
    son rayon est donc √n/2, et non une demi-longueur entière comme chez eux. Condition `N4 != 0`
    (cercle de rayon nul vu au rejeu).
  - N2 : OH avec une racine au dénominateur est refusé comme mauvaise forme (réglage par défaut) ;
    l'élève rend le dénominateur rationnel, comme le dit la fiche.
- Contrôles : `create-questions` en simulation vert ; `question:specs` 15/15 et 14/14, 400 tirages ;
  `sonde-figures` 0 problème (300 blocs) ; 210 formules des aperçus : accolades et `validateLatex`
  0 problème.
- Base locale : les deux modèles créés en brouillon, aperçus vus avec `pnpm voir` (figure, cases,
  choix, 0 erreur de console) ; le jugement des réponses justes et des erreurs prévues est vérifié
  par les specs. Ids locaux retirés des fichiers.

- #3221 mergée le 2026-11-27 (fichiers seuls, sans migration).
- Écarts aux fiches (cercle de N2 passant par un point entier de (CH), rayon √n/2 ; AB² ⩽ 50 en
  N1 V2) : décidés sans question pendant l'écriture, soumis après coup ; David les valide le
  2026-11-27 (« je valide »). Rien à corriger.

### 2026-11-27 — brouillons en prod, rangement

- David a créé les 2 brouillons en prod : N1 75a03073, N2 bbafb6dd (niveaux 4 et 5) ; ids commités.
- Niveaux relevés en prod juste avant : « projeté orthogonal » n'a que les niveaux 2 et 3.
- Migration de rangement générée (`20261127105154`) : 1SPE-437, sur Géométrie > Géométrie repérée >
  projeté orthogonal (point sur la notion, admis par la règle). Test d'intégration vert (155),
  **rouge sans la migration** (5 échecs, fichier écarté le temps d'un passage puis remis depuis une
  copie, `cmp` identique) ; `garde-niveaux-tags` : aucun niveau manquant.
- `security-auditor` sur la migration : **aucun finding bloquant**. Aucune policy, aucun grant,
  aucune fonction sûre (`SECURITY DEFINER`) ; additive ; rollback correct ; trigger toujours réactivé
  sous `db push` ; seule migration en attente en prod. Non bloquant : `set local lock_timeout` peut
  rester sans effet hors bloc de transaction (au pire une attente de verrou). Personne ne gagne ni
  ne perd d'accès.
- #3224 mergée ; `db:migrate` le 2026-11-27 (seule migration en attente) ; MCP : 2/2 rangés et tagués 1SPE-437.
- 2026-11-27 : David valide les 2 modèles (aucun verdict en base, validation dans la session) ; `publier-lot.ts` simulé : 2 brouillons passent ; `garde-niveaux-tags` verte.

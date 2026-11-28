# Chantier `idees-1re-trigo` : idées de la rubrique « fonctions trigonométriques » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-25, chantier clos._

- **État** : rubrique **publiée** : les 2 modèles neufs (6a461989, 7dba5a1d) sont publiés et validés
  par David ; les 7 variations des 5 publiés sont en prod (migration de contenu) ; journal archivé ·
  **Prochaine action** : aucune · **En attente de David** : rien · **Worktree / branche** : aucun.

## Journal

### 2026-11-25 — réservation, relevé, phase 0

- Rubrique 1AN4 (6 exercices) réservée dans [idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md)
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

### 2026-11-25 — brouillons en prod, #3135 mergée

- David a créé les brouillons en prod : 6a461989 (N1), 7dba5a1d (N2) ; ids commités.
- Migration de rangement générée (`20261125065639`) : 1SPE-304 sur cercle et radians, 1SPE-305 sur
  cosinus et sinus d'un réel. Tests d'intégration des deux fixtures verts, **rouges sans les
  migrations** (fichiers écartés le temps d'un passage) ; `garde-niveaux-tags` : aucun manque.
- `security-auditor` : aucun finding bloquant ; question d'accès confirmée (personne). Remarques :
  trigger `updated_at` désactivé le temps d'un UPDATE dans la migration de rangement (motif du
  générateur) ; les variations des publiés seront visibles des élèves dès `db:migrate`.
- #3135 mergée par `pr:merger` (CI verte). `db:migrate` **pas lancé** : `migration list --linked`
  montre aussi `20261125063042_messages_marques_lus_par_le_prof` (autre session), qui partirait
  avec les nôtres.

### 2026-11-25 — migrations en prod, publiée, chantier clos

- Les migrations `20261125064801` et `20261125065639` sont passées en prod avec celle de l'écart T21
  (`db:migrate` lancé hors de cette session). Vérifié en base : 5 publiés avec leurs variations et
  specs ajoutées, 2 brouillons rangés et tagués (1SPE-304, 1SPE-305).
- David : « je valide » ; aucun verdict en base (`question_template_reviews`), lu comme un oui aux
  2 brouillons. `publier-lot.ts` en simulation : 2 brouillons passent le contrôle.
- David a lancé `publier-lot.ts --publier` : 6a461989 et 7dba5a1d sont `published` (vérifié). Rubrique
  1AN4 passée à « publiée », réservations des 5 publiés levées, journal archivé.

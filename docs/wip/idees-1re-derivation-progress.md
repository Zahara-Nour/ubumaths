# Chantier `idees-1re-derivation` : idées de la rubrique « dérivation » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-23, lot écrit (aucune PR encore)._

- **État** : lot écrit et commité sur `feat/idees-1re-derivation` (2 commits) : F1, F2 neufs
  (`scripts/questions/idees-1re-derivation-neufs/`, avec `rangement`) ; 13 variations sur 7
  publiés (`…-publies/`) ; migration de contenu `20261123165942_…_publies_contenu.sql` + fixture.
  Simulation verte, sonde des courbes 0 problème, formules valides, rendu vu à l'écran.
- **Prochaine action** : après les brouillons en prod, commiter les ids, `migration-rangement.ts
--dir …-neufs`, merger `origin/main` (branche en retard), revue (`security-auditor`), PR.
- **En attente de David** : `create-questions --publier` des 2 neufs en PROD (commande dans le
  dernier message de la session).
- **Pièges en cours** : 46913a48, d58208eb, 1666b8e9 aussi en 1re techno (l1t-7) ; messages
  d'erreur prévue réécrits à la résolution (pas de parenthèses autour d'une variable) ; `{{e}}`
  interdit ; migration de contenu déjà jouée en base LOCALE (`db:a-jour`).
- **Worktree / branche** : `../ubumaths-wt-idees-1re-derivation`, `feat/idees-1re-derivation`.

## Journal

### 2026-11-23 — réservation, relevé, phase 0

- Rubrique 1AN1 (12 exercices) réservée dans [idees-ailleurs-repartition.md](idees-ailleurs-repartition.md) (`cc3b3979a`).
- Relevé : 3 ✅, 9 🟡, 0 ❌. Nos 21 modèles de 1re spé couvrent chaque exercice au moins en partie ;
  il manque des cas (inverse dans le taux, autres courbes, tangente à une rationnelle, coefficients
  fractionnaires ou décimaux, produits et quotients plus variés).
- Phase 0 : 2 modèles neufs (F1 nombre dérivé de l'inverse par le taux, 1SPE-260, 1 SPE seul ;
  F2 tangente à une fonction rationnelle, 1SPE-272) et 13 variations sur 7 modèles publiés (F3 à F9).
  F10 : ce qui n'est pas repris, et pourquoi.
- Question d'accès : personne ne gagne d'accès (rangement et variations de modèles).
- Message reçu de la session `idees-6e-entiers-decimaux` : `migration-contenu.ts` saura bientôt
  écrire les `options` d'un modèle publié (branche `feat/migration-contenu-options`). Rien à faire ici
  tant qu'aucune variation ne demande de changer les options.

### 2026-11-23 — phase 0 validée

- David : « je valide tout » (F1 à F10, comme proposé). Les 7 modèles publiés sont réservés dans le
  tableau de répartition.

### 2026-11-23 — lot écrit

- Scripts `docs/wip/questions/idees-1re-derivation-{neufs,publies}.py`. F1 : a > 0 et fractions
  irréductibles (un a négatif rendait la réponse attendue « forme à améliorer ») ; F2 : variable
  `q` (pas `e`). Erreurs prévues : 2 ou 3 par case, aucune inventée ; coup de pouce partout.
- Formes « à améliorer » (form = warn des modèles) : numérateur factorisé d'un quotient,
  3/2 x² dans le modèle décimal, somme non réduite — specs `unoptimal_form`, comme les publiées.
- Vérifs : `create-questions` simulation verte (2 neufs, 7 publiés) ; `sonde-courbes` 0 problème
  (600 blocs) ; 5 774 formules d'aperçu passées à `validateLatex` + accolades, 0 erreur.
- Base locale : neufs créés et joués (ids locaux retirés) ; migration de contenu jouée par
  `db:a-jour` ; rendu vu dans l'aperçu admin (Chrome, lien du tailnet) : quotient −4x²/(x − 5),
  courbe de degré 3, pente 1/3.
- Rangement : F1 « Fonctions > Dérivation > nombre dérivé », 1SPE-260, niveau 2 ; F2
  « … > tangente », 1SPE-272, niveau 3 (niveaux relevés en prod).

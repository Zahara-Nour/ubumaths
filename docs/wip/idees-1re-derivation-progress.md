# Chantier `idees-1re-derivation` : idées de la rubrique « dérivation » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-23, phase 0 validée (aucune PR encore)._

- **État** : relevé fait ([idees-1re-derivation-releve.md](idees-1re-derivation-releve.md)), phase 0 publiée en page à cocher : https://claude.ai/artifact/EU7fV67f4F39ze4yHnySLC (10 fiches, verdicts dans la collection `verdicts`).
- **Prochaine action** : gros lot dans le worktree : 2 modèles neufs (F1, F2) et 13 variations (F3 à F9), avec tests, erreurs prévues et coups de pouce.
- **En attente de David** : rien (phase 0 validée en entier le 2026-11-23).
- **Pièges en cours** : 46913a48, d58208eb, 1666b8e9 portent aussi la 1re techno → rien au-delà des polynômes simples dans leurs variations de calcul (l1t-7) ; u(ax + b) hors liste du BO de 1re (l1s-1).
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

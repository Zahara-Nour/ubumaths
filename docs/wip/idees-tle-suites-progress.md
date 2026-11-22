# Chantier `idees-tle-suites` — journal

Idées reprises d'ailleurs, rubrique « Suites numériques » de Terminale spécialité (code TSA1,
26 exercices), selon le skill `idees-rubrique`. Relevé : [idees-tle-suites-releve.md](idees-tle-suites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, après #2999._

- **État** : #2999 mergée et appliquée (`db push --include-all`, une migration plus récente d'une
  autre session était passée avant) : 708f8a08 et 98ba277c revenus à 4 variations ; en prod, 5
  neufs rangés en brouillon, 9 variations ajoutées à 6 publiés · **Prochaine action** : commiter
  les ids des 2 nouveaux brouillons (`f02-…`, `f03-…`), puis PR de rangement (TSPE-383 et
  TSPE-578, nœuds des publiés voisins) ; ensuite relecture dans `/dev/modeles` (brouillons par
  `?point=`, série de relecture pour les 6 publiés complétés) · **En attente de David** : lancer
  `pnpm tsx scripts/create-questions.ts --dir scripts/questions/idees-tle-suites-neufs --publier`
  depuis le worktree `ubumaths-wt-idees-tle-suites` · **Pièges en cours** : vérifier les bornes de
  **tous** les points d'un publié (autres niveaux compris) avant d'y ajouter une variation · **Worktree / branche** : `ubumaths-wt-idees-tle-suites`,
  `feat/idees-tle-suites-rangement-2`.

## Historique

### 2026-11-22 — rubrique prise

- Terminale ajoutée au tableau de répartition (spécialité, maths expertes, technologique ; les
  rubriques sans exercice laissées de côté). Rubrique suites (TSA1) choisie par David.
- Existant en prod relevé (MCP lecture seule) : une trentaine de modèles publiés sur les points
  de suites de Tle spé (TSPE-378 à 402, 432, 576 à 579), plus deux modèles arithmético-géométriques
  tagués TCOMP. Liste dans le relevé.

### 2026-11-22 — relevé et phase 0

- Relevé par deux agents (Sonnet), verdicts « à vérifier » relus dans nos variations en base :
  [idees-tle-suites-releve.md](idees-tle-suites-releve.md).
- Phase 0 : 14 fiches (8 variations de modèles publiés, 4 modèles neufs, 2 outils manquants, idées
  laissées), page à cocher https://claude.ai/artifact/TAe8JNJyzAsp3Qyv3uZq6q. Question d'accès :
  personne (rangement de modèles).
- Questions ouvertes, sans réponse = non tranchées : chaque fiche F1 à F14.

### 2026-11-22 — phase 0 validée

- David : « je valide », oui aux outils manquants (lignes 48 et 49 de `outils-manquants.md`).
- F14 : David demande pourquoi ne pas garder les idées non reprises en modèles hors programme.
  Réponse : elles sont au programme. Décision : **moyenne Sₙ/n d'une arithmético-géométrique
  ajoutée au lot** (nouveau modèle, TSPE-577) ; homographique avec étude de f, suites avec ln,
  suites d'intégrales → « Idées en attente » du tableau, pour les rubriques dérivation, logarithme,
  intégration.
- Modèles publiés réservés dans le tableau : 3d7d1d25, 651907b3, 667a3618, 7063979e, 708f8a08,
  98ba277c, 9f14d672, d1aee0b9.
- Lot à écrire : variations F1 à F8 (publiés, à exporter de prod), modèles neufs F9 à F12 + Sₙ/n.

### 2026-11-22 — lot écrit

- Deux agents `pedagogy-expert` : variations F1 à F8 ajoutées à la fin des 8 publiés
  (`scripts/questions/idees-tle-suites-publies/`, diff = ajouts seuls) ; 5 modèles neufs par
  `docs/wip/questions/idees-tle-suites-neufs.py` → `scripts/questions/idees-tle-suites-neufs/`.
- Relu et corrigé : F6, le 2e choix (« … ⩽ f(ℓ) ») était vrai mais incomplet → remplacé par une
  rédaction fausse (une fonction croissante qui « change le sens des inégalités »).
- F12 : les 4 affirmations étaient toutes fausses ; **David : ajouter 2 vraies** (croissante
  majorée converge ; comparaison vers +∞), v4 et v5.
- Choix des agents à connaître : F3 |L| ≠ a et a ± c ≠ ab (erreurs prévues distinctes) ; F7 m de
  2 à 4 (pas de nombre à 4 chiffres) ; F8 variable `g` (`e` = Euler) ; F14 bis q = 1/2 et
  q = k/10 (k de 5 à 9) ; `4×(1−1/2ⁿ)/(1−1/2)` jugé « perfectible » (signe ×).

### 2026-11-22 — #2993 mergée

- Essai dans l'aperçu local passé, avec l'accord de David (le Chrome relié n'atteint pas le serveur du
  Mac mini) : la relecture dans `/dev/modeles` le remplace.
- CI verte, mergée ; worktree et branche `docs/idees-tle-suites` supprimés.

### 2026-11-22 — #2996 mergée, migrations appliquées, bornes TCOMP ratées

- `db:migrate` (seules nos 2 migrations en attente) : 5 neufs rangés et tagués, 11 variations
  ajoutées à 8 publiés (et non 15, compte corrigé), vérifié en prod.
- Erreur : 3 publiés portent aussi un point TCOMP. 667a3618 (TCOMP-212) reste dans les bornes ;
  708f8a08 (TCOMP-210, 0 ⩽ q < 1) et 98ba277c (TCOMP-205, pas de trigonométrie) non. Aucune
  variation ne se réserve à un niveau. Réponses d'élèves sur ces 2 modèles depuis l'ajout : 0.
- David : déplacer les 4 variations vers 2 modèles neufs de spécialité. Migration de retour générée
  par `genererMigration` avec avant / après inversés (script ponctuel), en-tête réécrit ; fichiers
  des 2 publiés rendus à leur export de prod (bb833432aa).

### 2026-11-22 — #2999 mergée et appliquée

- Oui de David au retrait. `db:migrate` refusé (« inserted before » : une autre session avait
  appliqué une migration plus récente) ; `db push --dry-run --include-all` ne listait que la nôtre,
  appliquée par `--include-all`. Vérifié en prod : 4 variations, 17 et 16 specs.

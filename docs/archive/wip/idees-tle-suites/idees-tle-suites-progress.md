# Chantier `idees-tle-suites` — journal

Idées reprises d'ailleurs, rubrique « Suites numériques » de Terminale spécialité (code TSA1,
26 exercices), selon le skill `idees-rubrique`. Relevé : [idees-tle-suites-releve.md](idees-tle-suites-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, chantier clos._

- **État** : rubrique **publiée** : les 7 modèles neufs sont publiés et validés par David ; les 9 variations des 6
  publiés aussi ; journal archivé · **Prochaine action** : aucune · **En attente de David** : rien
  · **Pièges retenus** : vérifier les bornes de **tous** les points d'un publié (autres niveaux
  compris) avant d'y ajouter une variation · **Worktree / branche** : aucun.

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

### 2026-11-22 — #3001 mergée et appliquée

- df02afc2 (somme, q ⩾ 2 ou q ⩽ −1) → TSPE-383, « suites géométriques » ; ab0f98c4 (gendarmes avec
  cos n ou sin n) → TSPE-578, « comparaison et encadrement ». Vérifié en prod. Garde des niveaux :
  aucun niveau manquant.

### 2026-11-22 — #3003 mergée

- Série de relecture des 6 publiés complétés enregistrée par David (`5189a0c6`), fichier commité.
  Relecture en prod, sur `/dev/modeles`.

### 2026-11-22 — relecture et publication

- David a validé dans `/dev/modeles` les 6 publiés complétés et les 7 brouillons (aucun verdict
  « À revoir » en base).
- `publier-lot.ts` en simulation : 7 brouillons passent le contrôle ; David a lancé `--publier`. En
  base, les 7 (df02afc2, ab0f98c4, 535f9f8e, 7830c983, aa3cb8e7, b408ace2, 2e10cd76) sont `published`.
- Rubrique passée à « publiée » dans le tableau, les 8 réservations de modèles sont levées, et le journal, le relevé et les fiches sont versés
  dans `docs/archive/wip/idees-tle-suites/`.

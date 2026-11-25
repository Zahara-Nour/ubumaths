# Chantier `idees-1re-probas-cond` : probabilités conditionnelles de Première

## Reprendre ici

_Mis à jour le 2026-11-25, après #3121._

- **État** : #3121 mergée (ids des 4 brouillons, migrations de rangement et de contenu). `db:migrate` refusé à la session par le mode auto (écriture en prod) : les 2 migrations (`20261124220806`, `20261124220853`) sont les seules en attente, `--dry-run --include-all` les liste toutes deux.
- **Prochaine action** : David lance `! pnpm db:migrate --include-all` → vérifier en prod nœud, tag, brouillon des 4, et les variations ajoutées (31096bae : 5, 69a05f98 : 4) → donner l'adresse `/dev/modeles` de relecture.
- **En attente de David** : le `db:migrate --include-all`, puis la relecture.
- **Pièges en cours** : F2 est un modèle de 2de (`grades = ["2"]`, 2-390). Les variations ajoutées à F1 et F3 sont visibles des élèves dès le `db:migrate`. `garde-niveaux-tags.ts` avant `publier-lot.ts`.
- **Worktree / branche** : aucun (retiré après #3121).

## Historique

### 2026-11-24 : prise, relevé, phase 0

- Rubrique 1P1 (8 exercices) réservée sur `main` (70084dd54).
- Relevé : 1P10-1 à 1P14-2 lus dans le code (6 d'entre eux par un agent Sonnet, ses dires vérifiés
  par sondage dans le code : tirages de 1P12-1, 1P13-1 et 1P11-2, menus de 1P13-1). Comparaison avec
  21 modèles publiés de prod. Aucun brouillon sur ces points ; 1SPE-421 n'a aucun modèle.
- Fiches : F1 (variation de 31096bae), F2 (modèle neuf de 2de), F3 (variation de 69a05f98),
  F4 (rien), F5, F6 et F7 (modèles neufs de 1re).
- Aucun outil ne manque : les branches `?` de ` ```probtree `, les cellules `?` des tableaux et les QCM
  justifiés suffisent.

### 2026-11-24 : phase 0 validée

- David : « je valide tes propositions » (page à cocher sans verdicts : lu comme un oui à toutes les
  recommandations). Donc F1, F2, F3, F5, F6, F7 à écrire, F4 rien ; F5 sur **1SPE-340** (pas 421).
- 31096bae et 69a05f98 réservés dans le tableau de répartition (commit direct sur `main`).

### 2026-11-24 : lot écrit

- Écrit par un agent `pedagogy-expert`, relu par moi : `question:specs` relancé sur les 6 fichiers
  (100 tirages par variation, tout vert) ; tirages réels de F6 (QCM : index juste, propositions
  mélangées à l'affichage ; V3 entier) et de F7 (coiffure : valeurs recalculées, arbre du corrigé)
  relus.
- Écarts à la fiche, acceptés : F1 n'a que 2 erreurs prévues pour P(A ∩ B) et P_B(Ā) (tout se lit
  dans l'énoncé) ; F7 V1 sans P(A) = 50 % (l'erreur P(Ā) tomberait juste) ; F6 V2 garde les deux
  leurres de V1 ; les modèles neufs sans `cleanCoefficients` (il réécrit `P_{A}(B)`).

### 2026-11-24 : lot joué en base locale

- 4 modèles neufs créés en brouillon dans la base locale (`create-questions --publier` avec `.env.local`), ids retirés des fichiers ensuite (`git restore`). F1 et F3 copiés dans 31096bae et 69a05f98 locaux (variations, `shared`, `test_specs`).
- Jeu automatique (Playwright, aperçu admin sur `http://[::1]:5178`) : une graine par variation, les 19 tirées. 17 variations à saisie : réponse attendue → « Juste », `0` → « Faux » (captures relues pour F7 v3 et F1, valeurs refaites à la main). 2 variations `choix` de F6 : chaque proposition essayée, une seule « Juste » sur 4.
- Seules erreurs de console : des 429 (limite de débit du serveur de dev, dus au rythme du script), aucune liée aux modèles.

### 2026-11-24 : brouillons en prod, migrations générées

- David a lancé `create-questions --publier` en prod : 4 brouillons, ids écrits en tête des fichiers (vérifiés par `migration-rangement.ts`, appariés en prod).
- `migration-rangement.ts` : 4 « rangé » → `20261124220806_…_neufs_rangement_tags.sql`. `migration-contenu.ts` : 31096bae et 69a05f98 « migré » (+1 variation, specs) → `20261124220853_…_publies_contenu.sql`. Une seule PR pour les deux, comme dans `idees-tle-probas`.

### 2026-11-25 : #3121 mergée

- CI verte, `pr:merger` a mergé. `security-auditor` : aucun finding sur les deux migrations. Tests `migrations-rangement-tags` et `migrations-contenu-publie` verts en local.

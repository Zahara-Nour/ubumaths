# Chantier « questions-1spe-geometrie » — première spécialité, produit scalaire et géométrie repérée (lot 6b, lot formules)

> Sous-chantier de [`questions-1spe`](questions-1spe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, lot 6a et phase 0 D29 § 23, répartition § 24). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points`. En base, le niveau est `1_SPE`.
> Réparti le 2026-11-02 (David : « accélérer le chantier en répartissant les lots sur plusieurs sessions ») en trois
> sessions parallèles : `questions-1spe-geometrie` (6b, formules), `questions-1spe-analyse` (restes, automatismes),
> `questions-1spe-logique` (logique et listes Python). Outils C (433, 271, 306) : chantiers à part (D5).

## Reprendre ici

_Mis à jour le 2026-11-02, à la création du sous-chantier._

- **État** : rien d'écrit. Phase 0 du lot 6b **déjà validée** (D29, tableau du § 23 de l'index, lignes 8 à 14).
- **Prochaine action** : lot 6b : worktree neuf, relevé MCP (catégories Produit scalaire et Géométrie repérée, aucune « À savoir » encore), script `docs/wip/questions/lot-1spe-savoir-b.py` sur le gabarit `lot-1spe-savoir-a.py`.
- **En attente de David** : rien.
- **Pièges en cours** : voir « Décisions communes et pièges » ci-dessous.
- **Worktree / branche** : aucun ; worktree neuf `../ubumaths-wt-questions-1spe-geometrie` depuis `origin/main`.

---

## Lots

| Lot      | Thème                                               | Points                            |
| -------- | --------------------------------------------------- | --------------------------------- |
| 6b       | « À savoir » (D2, D29) : produit scalaire, cercle   | 412, 310, 313, 311, 415, 316, 329 |
| formules | Produit scalaire : formules (§ 4 de l'index, lot 5) | 413, 414, 314, 315, 416           |

Les deux lots écrivent dans la catégorie Produit scalaire : 6b d'abord (catégorie neuve « À savoir », niveaux 1-6),
puis les formules (relever les niveaux des catégories voisines après la création du 6b).

## Points (classement du § 3 de l'index)

- **6b, =** (D2 : un modèle « à savoir » par point) : 412 (produit scalaire et cosinus), 310 (projection
  orthogonale), 313 (base orthonormée), 311 (caractérisation de l'orthogonalité), 415 (critère en base
  orthonormée), 316 (Al-Kashi) ; 329 (équation de cercle, Géométrie repérée › À savoir, 1).
- **6b, forme validée (D29)** : un modèle par point, rangé sur le nœud de son point ; 2-3 variations dans les deux
  sens (formule → propriété, propriété → formule) ; case choix à 4 propositions, erreurs typiques en distracteurs.
- **Formules, A** : 413 (symétrie), 414 (norme en base orthonormée), 314 (coordonnées par produits scalaires),
  315, 416 (développement de ‖u ± v‖²). Phase 0 à faire valider.
- **Voisins** (déjà couverts) : catégories Calculer un produit scalaire 1-5, Propriétés 1-5, Angles et longueurs 1-3,
  Équation de cercle 1-5. Doublons de savoir-faire sans modèle (D2) : 417 → 327, 328 → 331.

## Décisions communes et pièges (repris du journal d'index)

- **Décisions** : D1 brouillons d'abord (fait) ; D2 points « = » ; D4 points P hors chantier ; D6 case choix (en
  prod). Lots neufs : niveau `1_SPE` seul, un point par modèle (ADR 0020).
- **Gabarits** : script `docs/wip/questions/lot-1spe-savoir-a.py` (→ `scripts/questions/1spe-savoir-a/`) ; migration
  `supabase/migrations/20261102090607_questions_1spe_savoir_a_rangement_tags.sql` + son test
  `tests/integration/questions-1spe-savoir-a-rangement-tags.test.ts` (rouge sans l'étape 4).
- **Rendu** : **pas de `cleanCoefficients` sur un modèle sans variable** (`\sigma(X)` rendu « σX ») ;
  `blankDefaults.acceptDecimal` obligatoire (réponses numériques) ; **variable `e` = Euler** ; choix mélangés →
  jamais « première phrase » dans un corrigé ; `col()` hors `$…$` (`colt`) ; relire les tirages
  (`question:specs --apercu 40`), pas seulement les specs.
- **Prod** : `create-questions --publier` et `publier-lot --publier` → David (`!`) ; `create-questions` depuis le
  dépôt principal APRÈS le merge des fichiers. `db:migrate` après `migration list --linked` : il passe **toutes** les
  migrations en attente, celles des autres sessions comprises → ne pas passer celle d'un autre sans le dire à David.
  Horodatage : `pnpm migration:horodatage`, puis `check:migrations --pr`. Worktree non lié à Supabase → copier
  `supabase/.temp/{project-ref,linked-project.json,pooler-url,postgres-version}` du dépôt principal ; `fetch` avant
  (versions distantes absentes du dossier local = worktree en retard, § 23).
- **Sessions parallèles** : port de dev 5176+ (premier libre) ; base Supabase locale partagée (verrou : exit 2 =
  attendre) ; dépôt principal partagé : `git commit -m … -- <fichiers>`, push en course possible (refaire
  `pull --rebase`) ; ne pas toucher aux catégories d'une autre session.
- **Commits** : `Doc-inchangée:` dans un COMMIT (≤ 100 caractères) ; aucun trailer `Claude-Session:`.
- **Page à cocher** : collection `verdicts`, compter les verdicts avant `publier-lot` ; rendu vérifié à 390 px.

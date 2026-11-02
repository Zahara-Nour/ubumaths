# Chantier « questions-1spe-logique » — première spécialité, logique et listes Python

> Sous-chantier de [`questions-1spe`](questions-1spe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots § 18-23, répartition § 24). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points`. En base, le niveau est `1_SPE`.
> Réparti le 2026-11-02 (David : « accélérer le chantier en répartissant les lots sur plusieurs sessions ») en trois
> sessions parallèles : `questions-1spe-geometrie` (6b, formules), `questions-1spe-analyse` (restes, automatismes),
> `questions-1spe-logique` (logique et listes Python). Outils C (433, 271, 306) : chantiers à part (D5).

## Reprendre ici

_Mis à jour le 2026-11-02, à la création du sous-chantier._

- **État** : rien d'écrit ; points et classement repris de l'index (§ 3).
- **Prochaine action** : lot « logique et listes » : worktree neuf, relevé MCP des voisins (nœuds, niveaux des catégories, modèles du chantier `logique-1spe`), phase 0 à faire valider.
- **En attente de David** : rien (la phase 0 est à produire).
- **Pièges en cours** : voir « Décisions communes et pièges » ci-dessous.
- **Worktree / branche** : aucun ; worktree neuf `../ubumaths-wt-questions-1spe-logique` depuis `origin/main`.

---

## Lots

| Lot               | Thème                                            | Points                            |
| ----------------- | ------------------------------------------------ | --------------------------------- |
| logique et listes | Logique et listes Python (§ 4 de l'index, lot 9) | 203, 206, 367, 207, 208, 209, 210 |

## Points (classement du § 3 de l'index)

- **A** : 203 (quantifications implicites) ; 206, 367, 207, 208, 209, 210 (listes : programme Python montré,
  « que contient `L` à la fin ? »).
- **Hors chantier** : 205 (contraposée, point-compétence, D4).
- **Voisins** : modèles du chantier `logique-1spe` (5 publiés le 2026-11-01, § 16 de l'index) et lot 3-suites
  (suites données par un algorithme Python, 369, 378, § 20) : reprendre leur façon d'écrire un programme dans
  l'énoncé.

## Décisions communes et pièges (repris du journal d'index)

- **Décisions** : D1 brouillons d'abord (fait) ; D2 points « = » ; D4 points P hors chantier ; D6 case choix (en
  prod). Lots neufs : niveau `1_SPE` seul, un point par modèle (ADR 0020).
- **Gabarits** : scripts `docs/wip/questions/lot-1spe-suites.py` (programmes Python dans l'énoncé) et
  `lot-1spe-savoir-a.py` ; migration `supabase/migrations/20261102090607_questions_1spe_savoir_a_rangement_tags.sql` +
  son test `tests/integration/questions-1spe-savoir-a-rangement-tags.test.ts` (rouge sans l'étape 4).
- **Rendu** : **pas de `cleanCoefficients` sur un modèle sans variable** ; `blankDefaults.acceptDecimal` obligatoire
  (réponses numériques) ; **variable `e` = Euler** ; choix mélangés → jamais « première phrase » dans un corrigé ;
  `col()` hors `$…$` (`colt`) ; relire les tirages (`question:specs --apercu 40`), pas seulement les specs.
- **Prod** : `create-questions --publier` et `publier-lot --publier` → David (`!`) ; `create-questions` depuis le
  dépôt principal APRÈS le merge des fichiers. `db:migrate` après `migration list --linked` : il passe **toutes** les
  migrations en attente, celles des autres sessions comprises → ne pas passer celle d'un autre sans le dire à David.
  Horodatage : `pnpm migration:horodatage`, puis `check:migrations --pr`. Worktree non lié à Supabase → copier
  `supabase/.temp/{project-ref,linked-project.json,pooler-url,postgres-version}` du dépôt principal ; `fetch` avant.
- **Sessions parallèles** : port de dev 5176+ (premier libre) ; base Supabase locale partagée (verrou : exit 2 =
  attendre) ; dépôt principal partagé : `git commit -m … -- <fichiers>`, push en course possible (refaire
  `pull --rebase`) ; ne pas toucher aux catégories d'une autre session.
- **Commits** : `Doc-inchangée:` dans un COMMIT (≤ 100 caractères) ; aucun trailer `Claude-Session:`.
- **Page à cocher** : collection `verdicts`, compter les verdicts avant `publier-lot` ; rendu vérifié à 390 px.

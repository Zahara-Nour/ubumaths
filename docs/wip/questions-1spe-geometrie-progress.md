# Chantier « questions-1spe-geometrie » — première spécialité, produit scalaire et géométrie repérée (lot 6b, lot formules)

> Sous-chantier de [`questions-1spe`](questions-1spe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, lot 6a et phase 0 D29 § 23, répartition § 24). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points`. En base, le niveau est `1_SPE`.
> Réparti le 2026-11-02 (David : « accélérer le chantier en répartissant les lots sur plusieurs sessions ») en trois
> sessions parallèles : `questions-1spe-geometrie` (6b, formules), `questions-1spe-analyse` (restes, automatismes),
> `questions-1spe-logique` (logique et listes Python). Outils C (433, 271, 306) : chantiers à part (D5).

## Reprendre ici

_Mis à jour le 2026-11-02, après #2237 ; #2242 ouverte._

- **État** : 6b créé en prod par David (brouillons, 17 h 35 UTC) : 4f8c7b91 (412), 7bf472bc (310), 24ca7584 (313),
  52a3ad9b (311), 9af16245 (415), 71205949 (316), 47d451b4 (329). Migration nœud + tag
  `20261102173610_questions_1spe_savoir_b_rangement_tags` en PR #2242 : test 10/10, rouge sans l'étape 4,
  `security-auditor` sans finding, `check:migrations --pr 2242` vert ; CI en cours au `/clear`.
- **Prochaine action** : `gh pr checks 2242` → verte : merger, `db:migrate` depuis le dépôt principal (`migration list
--linked` d'abord) ; relire en base (MCP) ; page à cocher (`scripts/questions/page-a-cocher.ts --dir
scripts/questions/1spe-savoir-b`) ; puis `publier-lot`.
- **En attente de David** : rien avant la page à cocher.
- **Pièges en cours** : `pnpm migration:horodatage` sans `-s` ; KaTeX absent du dépôt, sonde de formules par
  `mathlive-ssr` (`validateLatex`). Base locale : 7 brouillons d'essai du 6b (ids locaux, sans importance).
- **Worktree / branche** : `../ubumaths-wt-questions-1spe-geometrie`, `feat/questions-1spe-savoir-b-tags` (#2242).

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

## Lot 6b : écriture (2026-11-02)

Relevé prod (MCP, 2026-11-02) : aucune catégorie « À savoir » dans Produit scalaire ni Géométrie repérée ; les 12 points du
sous-chantier (6b et formules) toujours sans modèle. Catégories voisines inchangées (Calculer un produit scalaire 1-5,
Propriétés 1-5, Angles et longueurs 1-3, Lieux de points 2-3, Équation de cercle 1-5, Projeté orthogonal 2-3, Vecteur normal
1-5).

Script `docs/wip/questions/lot-1spe-savoir-b.py` → `scripts/questions/1spe-savoir-b/` (01 à 07, ordre du tableau D29) :

| #   | Point | Variation 1 (formule → …)        | Variation 2 (autre sens)                                  |
| --- | ----- | -------------------------------- | --------------------------------------------------------- |
| 01  | 412   | u·v = ‖u‖‖v‖cos(u, v)            | cos(u, v) = u·v / (‖u‖‖v‖)                                |
| 02  | 310   | AB·AC = AB·AH                    | A entre H et B : AB·AC = −AB × AH (signe)                 |
| 03  | 313   | u·v = xx′ + yy′                  | la formule vaut en base orthonormée (pas dans toute base) |
| 04  | 311   | orthogonaux ⟺ u·v = 0            | u·v = 0 ⟹ orthogonaux (pas « un des vecteurs est nul »)   |
| 05  | 415   | orthogonaux ⟺ xx′ + yy′ = 0      | (−y ; x) est orthogonal à u(x ; y)                        |
| 06  | 316   | BC² = AB² + AC² − 2AB·AC·cos BAC | angle droit : Al-Kashi redonne Pythagore                  |
| 07  | 329   | (x − a)² + (y − b)² = r²         | l'équation décrit le cercle de centre (a ; b), rayon r    |

Distracteurs : erreurs typiques (cosinus oublié ou sinus ; AB × AC sans projeter ; signe oublié ; déterminant xy′ − x′y,
critère de colinéarité ; « un des vecteurs est nul » ; angle mal placé ; signes du centre, r au lieu de r², disque).

Vérifications : 56 specs (une juste, trois erreurs par variation) ; `create-questions` en simulation 7 / 7 ; 193 formules
(énoncés, propositions, corrigés) passées à MathLive (`validateLatex`, mathlive-ssr) : 0 erreur ; trois `col()` hors `$…$`
remplacés par `colt` avant l'essai. Base **locale** : 7 brouillons créés ; 07 joué dans l'aperçu admin (bonne réponse comptée
juste, propositions rendues à la largeur d'un téléphone) ; 01 regardé.

PR #2237 (fichiers) mergée le 2026-11-02 (CI verte, 9 succès, 6 sautés).

## Lot 6b : prod et migration (2026-11-02)

Création en prod par David (17 h 35 UTC), relue (MCP) : 7 `draft`, sans nœud ni tag. Nœuds des points : 412, 310, 313 →
Géométrie › Produit scalaire › expressions du produit scalaire ; 311, 415 → … › propriétés ; 316 → … › angles et
longueurs ; 329 → Géométrie › Géométrie repérée › équation de cercle. Migration `20261102173610` (gabarit 6a) et test
`tests/integration/questions-1spe-savoir-b-rangement-tags.test.ts` : 10/10, rouge sans l'étape 4 (« lot incohérent : nœuds
0/7 »). `security-auditor` : aucun finding (diff = le lot ; rollback complet ; prod relue ; aucune règle d'accès). PR #2242.

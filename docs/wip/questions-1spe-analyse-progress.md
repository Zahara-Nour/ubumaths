# Chantier « questions-1spe-analyse » — première spécialité, second degré, exponentielle, trigonométrie (restes), automatismes

> Sous-chantier de [`questions-1spe`](questions-1spe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots § 18-23, répartition § 24). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points`. En base, le niveau est `1_SPE`.
> Réparti le 2026-11-02 (David : « accélérer le chantier en répartissant les lots sur plusieurs sessions ») en trois
> sessions parallèles : `questions-1spe-geometrie` (6b, formules), `questions-1spe-analyse` (restes, automatismes),
> `questions-1spe-logique` (logique et listes Python). Outils C (433, 271, 306) : chantiers à part (D5).

## Reprendre ici

_Mis à jour le 2026-11-02, après la publication des lots A et B._

- **État** : ✅ **clos**. Lots A et B publiés en prod (9 modèles, `publier-lot --publier` lancé par David, statuts
  relus en base) ; 7d6cf480 tagué pour 434. Périmètre couvert : 385, 252, 382 (par 251), 251, 296, 407, 408, 303,
  306, 432, 434.
- **Prochaine action** : aucune ici ; la fin est notée dans l'index (`questions-1spe`), dont le versement prend la suite.
- **En attente de David** : rien.
- **Worktree / branche** : aucun.

---

## Lots

| Lot          | Thème                                                              | Points                                 |
| ------------ | ------------------------------------------------------------------ | -------------------------------------- |
| restes       | Second degré, exponentielle, trigonométrie (§ 4 de l'index, lot 8) | 385, 252, 382, 251, 296, 407, 408, 303 |
| automatismes | Automatismes classés au § 3.2 mais placés dans aucun lot du § 4    | 434, 432                               |

## Points (classement du § 3 de l'index)

- **Second degré** : A 385 (factorisation éventuelle selon Δ), 252 (polynômes s'annulant en deux réels donnés) ;
  B 382, 251 (signe d'une forme factorisée : ` ```variation ` en tableau de signes, réponse en case ou tableau à
  trous).
- **Exponentielle** : B 296, 407 (représenter t ↦ e^{−kt}, e^{kt} : case choix de courbes ; la case choix est en
  prod, D6 levée).
- **Trigonométrie** : A 408 (longueur d'arc) ; B 303 (cercle trigonométrique, ` ```trig `).
- **Automatismes** : A 434 (coefficient directeur par deux points) ; B 432 (signe d'une fonction lu sur
  ` ```courbe `). Vérifier d'abord en prod qu'aucun modèle du chantier `automatismes-1spe` ne les couvre.
- **Hors lot** : 306 (placer un point sur le cercle, outil C, D5) ; 433 (tracer une droite, outil C).
- **Voisins** : catégories des chantiers `second-degre-1spe`, `exponentielle-1spe`, `trigo-1spe`,
  `automatismes-1spe` ; « Fonction exponentielle › À savoir » (lot 6a, niveaux 1-2).

## Décisions communes et pièges (repris du journal d'index)

- **Décisions** : D1 brouillons d'abord (fait) ; D2 points « = » ; D4 points P hors chantier ; D6 case choix (en
  prod). Lots neufs : niveau `1_SPE` seul, un point par modèle (ADR 0020).
- **Gabarits** : scripts `docs/wip/questions/lot-1spe-variations.py` (courbes, case choix) et
  `lot-1spe-savoir-a.py` ; migration `supabase/migrations/20261102090607_questions_1spe_savoir_a_rangement_tags.sql` +
  son test `tests/integration/questions-1spe-savoir-a-rangement-tags.test.ts` (rouge sans l'étape 4).
- **Rendu** : **pas de `cleanCoefficients` sur un modèle sans variable** (`\sigma(X)` rendu « σX ») ;
  `blankDefaults.acceptDecimal` obligatoire (réponses numériques) ; **variable `e` = Euler** ; choix mélangés →
  jamais « première phrase » dans un corrigé ; `col()` hors `$…$` (`colt`) ; relire les tirages
  (`question:specs --apercu 40`), pas seulement les specs.
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

## Relevé (prod, MCP, 2026-11-02)

Aucun des 10 points n'a de modèle ; le point 306 non plus. Nœuds des points et catégories voisines (niveaux pris) :

| Point(s)      | Nœud                                                              | Catégorie voisine, niveaux pris                             |
| ------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| 385           | Second degré › formes                                             | Polynôme du second degré › Formes, 1-3                      |
| 252           | Second degré › racines                                            | Polynôme du second degré › Racines, 1-7                     |
| 251, 382      | Second degré › signe                                              | Polynôme du second degré › Signe et inéquations, 1-3        |
| 296, 407      | Fonction exponentielle › courbe                                   | Fonction exponentielle › Représentation graphique, 1-3      |
| 303, 408, 306 | Fonctions trigonométriques › cercle et radians                    | Fonctions trigonométriques › Cercle et radians, 1-3         |
| 432           | Généralités sur les fonctions › signe                             | Généralités › Signe (seconde), 1                            |
| 434           | Fonctions affines › coefficient directeur et ordonnée à l'origine | Droites du plan › Pente et vecteur directeur (seconde), 1-6 |

- **306 (placer un point sur le cercle)** : le geste ` ```trig placer: ` est livré (#2189, en prod, vérifié
  `merge-base` avec `origin/production`) ; `outils-manquants.md` § 4 dit « 1SPE-306 attend ses modèles ». Le point
  passe de C à B et entre dans ce chantier (Q1).
- **434** : 7d6cf480 « Pente d'une droite passant par deux points » (seconde, publié, tagué 2-313, sur le nœud de 434) fait exactement l'automatisme (Q6).
- **Points jumeaux** : 1GEN-062 et 1TECHNO-139 (= 432), 1GEN-064 et 1TECHNO-141 (= 434) : même libellé, même nœud,
  aucun modèle, aucun chantier ne les porte (Q5).
- Le journal `automatismes-1spe` (2026-09-28) ne contient aucun modèle de lecture de signe ni de coefficient
  directeur.

## Phase 0 (D-A1, validée par David le 2026-11-02 : « je valide » sur les recos)

Deux lots de 5, chacun une PR de fichiers puis une PR de migration (nœud + tag, gabarit lot 6a). Niveau `1_SPE`
seul, un point par modèle (sauf Q5), brouillons. Rangement : nœud du point.

### Lot A — second degré, exponentielle

| #   | Point | Modèle                                     | Catégorie, niveau                                    |
| --- | ----- | ------------------------------------------ | ---------------------------------------------------- |
| A1  | 385   | Factoriser un trinôme quand c'est possible | Polynôme du second degré › Formes, 4                 |
| A2  | 252   | Polynôme s'annulant en deux réels donnés   | Polynôme du second degré › Racines, 8                |
| A3  | 251   | Signe d'un trinôme sous forme factorisée   | Polynôme du second degré › Signe et inéquations, 4   |
| A4  | 296   | Courbe de t ↦ e^{−kt}                      | Fonction exponentielle › Représentation graphique, 4 |
| A5  | 407   | Courbe de t ↦ e^{kt}                       | Fonction exponentielle › Représentation graphique, 5 |

- **A1 (385)** : trinôme développé, coefficients entiers. Variations : Δ > 0 avec a = 1 ; Δ > 0 avec a ≠ 1 ;
  Δ = 0 (a(x − x₀)²) ; Δ < 0. Case choix à 4 : la bonne factorisation, signes des racines inversés, a oublié,
  « ne se factorise pas dans ℝ » (bonne réponse quand Δ < 0, les trois autres étant alors des factorisations
  fausses). Corrigé : Δ, puis la règle (Δ ⩾ 0 : a(x − x₁)(x − x₂) ; Δ < 0 : aucune). La factorisation à racines
  données est déjà 604f83b7 (253) : ici, l'enjeu est de décider si elle existe.
- **A2 (252)** : racines entières distinctes r, s ∈ [−6 ; 6]. Variations : a donné → P(x) en case (forme
  factorisée ou développée acceptée) ; « s'annule en r et s et P(0) = c » → a en case ; case choix « tous les
  polynômes du second degré qui s'annulent en r et s » (a(x − r)(x − s) avec a ≠ 0 / seulement (x − r)(x − s) /
  a(x + r)(x + s) / a(x − r) + (x − s)).
- **A3 (251)** : P(x) = a(x − r)(x − s), a ∈ {±1, ±2, ±3}, r < s entiers. Variations : signe sur un intervalle
  (case choix : strictement positif / strictement négatif / change de signe) ; ensemble des solutions de P(x) > 0
  ou P(x) ⩽ 0 (case intervalles) ; facteur écrit (s − x) qui cache a < 0 (case choix). Corrigé : tableau de signes
  ` ```variation ` (une ligne par facteur, puis P).
- **A4, A5 (296, 407)** : k ∈ {0,5 ; 1 ; 2 ; 3}. Variations : case choix entre 4 ` ```courbe ` (bonne ; e^{kt}
  pour e^{−kt} ou l'inverse ; autre k ; −e^{∓kt}) ; une courbe donnée, quel k (case choix, point (1 ; e^{∓k})
  marqué) ; propriétés (passe par (0 ; 1), sens de variation, limite vers l'axe : case choix). Gabarit
  `lot-1spe-variations.py`. « Représenter » = reconnaître parmi des courbes (le tracé libre est l'outil C 271/433).

### Lot B — trigonométrie, automatismes

| #   | Point | Modèle                                        | Catégorie, niveau                                 |
| --- | ----- | --------------------------------------------- | ------------------------------------------------- |
| B1  | 303   | Le cercle trigonométrique                     | Fonctions trigonométriques › Cercle et radians, 4 |
| B2  | 408   | Longueur d'un arc du cercle trigonométrique   | Fonctions trigonométriques › Cercle et radians, 5 |
| B3  | 306   | Placer un point sur le cercle trigonométrique | Fonctions trigonométriques › Cercle et radians, 6 |
| B4  | 432   | Signe d'une fonction lu sur sa courbe         | Généralités › Signe, 2                            |
| B5  | 434   | (selon Q6)                                    | (selon Q6)                                        |

- **B1 (303)** : rayon (case : 1), longueur du cercle (case : 2π), sens direct (case choix : sens inverse des
  aiguilles d'une montre / sens des aiguilles / au choix), point image de 0 sur un ` ```trig ` à 4 points
  nommés (case choix).
- **B2 (408)** : arc de I à M image de x ∈ ]0 ; 2π[ remarquable → x ; arc entre les images de a < b → b − a ;
  inverse : arc de longueur ℓ, réel associé ; demi-tour, tour → π, 2π. Réponses exactes en π.
- **B3 (306)** : ` ```trig placer: ` ; x multiple remarquable de π/6 ou π/4 : dans ]−π ; π] ; hors de
  ]−π ; π] (13π/6, −7π/4…) ; deux points M et N. Corrigé : mesure principale puis le point.
- **B4 (432)** : ` ```courbe ` d'une fonction (polynôme à racines entières, sur [−5 ; 5]). Variations : signe de
  f(x) sur un intervalle (case choix) ; ensemble où f(x) ⩾ 0 (case intervalles) ; tableau de signes à choisir
  parmi 3 (case choix de ` ```variation `).

### Questions

- **Q1** : 306 (placer sur le cercle, outil livré par #2189) entre dans le lot B ? Reco : oui.
- **Q2** : 382 (contenu « forme factorisée ; signe ») noté « couvert par 251 », comme les doublons de D2 ?
  Reco : oui (même savoir, deux lignes du BO).
- **Q3** : deux lots de 5 (A second degré + exponentielle, B trigonométrie + automatismes) ? Reco : oui.
- **Q4** : A1 en case choix (le cœur du point est « factorisable ou non »), plutôt qu'une case ouverte ?
  Reco : case choix.
- **Q5** : B4 (et B5 s'il est neuf) tagué aussi des points jumeaux 1GEN-062 / 1TECHNO-139, niveaux
  `1_SPE`, `1_GEN`, `1_TECHNO` (ADR 0020 : un point par programme) ? Reco : oui, le libellé est identique et
  aucun chantier ne les couvre.
- **Q6** : 434 : (a) taguer 7d6cf480 (seconde) de 1SPE-434 (+ jumeaux selon Q5) et lui ajouter les niveaux de
  1re, comme D3 ; ou (b) modèle neuf de 1re (coordonnées fractionnaires, coefficient fractionnaire). Reco : (a),
  pas de doublon ; le cahier de texte filtre les niveaux par égalité, d'où l'ajout des niveaux.
- **Q7 (question d'accès des migrations)** : qui pourra lire quoi, qu'il ne pouvait pas lire avant ? Reco :
  personne pour les modèles neufs (brouillons, la migration ne pose que nœud et tags). Si Q6 (a) : 7d6cf480
  (publié) devient visible des classes de 1re dans le cahier de texte ; aucune règle ne change.

**Décisions (David, 2026-11-02, « je valide » sur les recos)** : Q1 306 dans le lot B ; Q2 382 « couvert par 251 » ;
Q3 deux lots (A, B) ; Q4 A1 en case choix ; Q5 B4 tagué aussi 1GEN-062 et 1TECHNO-139, niveaux `1_SPE`, `1_GEN`,
`1_TECHNO` ; Q6 (a) 7d6cf480 tagué 1SPE-434, 1GEN-064, 1TECHNO-141, niveaux de 1re ajoutés (lot B = 4 modèles neufs

- ce tag) ; Q7 personne ne gagne d'accès (brouillons ; seul 7d6cf480, publié, apparaît aux classes de 1re dans le
  cahier de texte).

## Essai en base locale du lot A (2026-11-02)

- `sonde-courbes` : 0 problème (300 tirages par modèle, 211 blocs ``courbe pour 04 et 05).
- `create-questions --publier` sur la base locale : 5 créés en brouillon.
- Aperçu admin, chaque modèle : réponse juste → « Juste » ; piège (somme `x(x+2)−24`, « le seul polynôme »,
  `[−6;1]`, courbe 𝒞₁ au lieu de 𝒞₂, courbe passant par (0 ; 2)) → « Faux » ; correction rendue (tableau de
  signes de 03, courbes de 04 et 05).
- Détails visuels sans gravité, laissés tels quels : l'étiquette 𝒞₂ de 04 (variation 2) touche l'axe des
  abscisses vers t = 2,7 ; le point (0 ; 1) de la correction de 05 est nommé `A` sans que le texte le nomme.

## Lot B — écriture et essai en base locale (2026-11-02)

Fichiers `scripts/questions/1spe-analyse-b/` (gabarit `docs/wip/questions/lot-1spe-analyse-b.py`, qui les régénère) :

| #   | Fichier                                         | Point(s)                      | Variations                                                                                |
| --- | ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| B1  | `01-le-cercle-trigonometrique.json`             | 303                           | rayon + longueur ; sens direct / indirect (choix) ; point associé à un multiple de π/2    |
| B2  | `02-longueur-d-un-arc.json`                     | 408                           | arc IM ; arc AB (b − a) ; réel associé à un arc parcouru dans un sens ; fractions de tour |
| B3  | `03-placer-un-point-sur-le-cercle.json`         | 306                           | ` ```trig placer: ` dans ]−π ; π] ; hors (mesure principale) ; M et N (−x ou π − x)       |
| B4  | `04-signe-d-une-fonction-lu-sur-sa-courbe.json` | 432 (+ 1GEN-062, 1TECHNO-139) | signe sur un intervalle ; f(x) ⩾ 0 (intervalles) ; tableau de signes parmi 3 (choix)      |

- B4 : niveaux `1_SPE`, `1_GEN`, `1_TECHNO` (Q5), catégorie Généralités › Signe, 2. Courbe f(x) = ±(x − r)(x − s)(x − t)/4
  sur [r − 1 ; t + 1], écarts entre racines 2 ou 3 (bosses d'au moins 0,77 : lisibles sur la grille).
- B5 (434) = pas de modèle : tag de 7d6cf480 dans la migration (Q6).
- Essai local (aperçu admin) : B3 placé juste → « Juste » ; rendu des cercles (B1, B2, B3) et de la courbe B4 vérifié.
- Corrigé en cours d'essai : points A-D de B1 renommés M, N, P, Q (ils doublaient les lettres A-D de la case choix) ;
  point `I = 0` ajouté aux cercles de B2 et B3 (les énoncés le citent) ; `mode: arc` retiré (n'affiche rien hors
  équation) ; variable `e` de B4 renommée (Euler).
- À regarder sur la page à cocher : en case choix, le tableau de signes de B4 (5 valeurs de x) déborde d'environ
  25 px à 606 px de large et défile horizontalement ; plus encore à 390 px.

## Identifiants en prod (brouillons, relevé MCP du 2026-11-02)

| Lot | Modèle                                        | `id`                                   |
| --- | --------------------------------------------- | -------------------------------------- |
| A1  | Factoriser un trinôme quand c'est possible    | `db7bb314-7e6a-41e8-86e8-2f38a2a71f72` |
| A2  | Polynôme s'annulant en deux réels donnés      | `aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb` |
| A3  | Signe d'un trinôme sous forme factorisée      | `afe51ac4-8552-454e-b45e-46f0edbd9416` |
| A4  | Courbe de t ↦ e^{−kt}                         | `5a132ffc-86bd-4db2-9e06-954e49da0da3` |
| A5  | Courbe de t ↦ e^{kt}                          | `a2852ea5-ce64-4010-805b-d00874605510` |
| B1  | Le cercle trigonométrique                     | `aae5c0fc-e220-4958-9604-01f110b6fecf` |
| B2  | Longueur d'un arc du cercle trigonométrique   | `ac9b1868-c019-42c3-a5fe-4b2952cce654` |
| B3  | Placer un point sur le cercle trigonométrique | `558c31a7-cbf0-4f7f-b282-2ada6a64c9f3` |
| B4  | Signe d'une fonction lu sur sa courbe         | `33dffa7a-8523-440e-99fe-304df3ced8b3` |

## Migration nœud + tags (2026-11-02)

Relevé MCP du 2026-11-02 avant le SQL : les 9 brouillons sans nœud ni tag (niveaux `1_SPE` ; B4 `1_SPE`, `1_GEN`,
`1_TECHNO`) ; points et jumeaux tous sur le nœud attendu (432, 1GEN-062, 1TECHNO-139 : « Généralités sur les
fonctions › signe » ; 434, 1GEN-064, 1TECHNO-141 : « Fonctions affines › coefficient directeur et ordonnée à
l'origine », nœud de 7d6cf480) ; 7d6cf480 publié, niveaux `{2}`, tagué 2-313 seulement.

- Migration `20261102192857_questions_1spe_analyse_rangement_tags.sql` : 9 neufs rangés et tagués (14 tags en tout
  avec ceux de 7d6cf480) ; 7d6cf480 : + 1SPE-434, 1GEN-064, 1TECHNO-141, niveaux `{2, 1_SPE, 1_GEN, 1_TECHNO}`.
  Gardes : tout ou rien (10 modèles), statut, nœud, niveaux et tags EXACTS du relevé. `updated_at` préservé.
- Test : 12 verts ; sans l'étape 4, suite rouge (la garde du rollback refuse l'état non migré).
- PR #2258. `security-auditor` : aucun finding bloquant (aucune policy ne lit `grades` ; 7d6cf480 déjà publié, donc
  déjà lisible) ; remarque faible prise : la garde du rollback vérifie aussi le nœud des 9 brouillons.
- Mergée (#2258) ; `migration list --linked` : seule celle-ci en attente ; `db:migrate` passé ; relevé MCP conforme.

## Page à cocher (2026-11-02)

https://claude.ai/artifact/LGKmmCDSg2HaC6NpwL3d8G — 9 fiches (lots A et B réunis dans un dossier du scratchpad, fichiers
préfixés `a`/`b`), 30 exemples ; 3 alertes « bloc trig non dessiné » (B1-B3, Q-T3 : à jouer dans l'aperçu). Collection
`verdicts` vide à la publication. Rendu à 390 px (cadre local) : pas de défilement de page ; en case choix, les 3 tableaux
de signes de B4 tiennent (277 px dans 278) ; dans le corrigé de B4, le tableau à 5 valeurs déborde de la fiche d'environ
6 px ; les calculs de Δ du corrigé de A1 défilent dans leur cadre.

**Verdicts** : 9 « ok » sur 9, aucun commentaire. Simulation `publier-lot` : 5/5 (A) et 4/4 (B) passent le contrôle.
`publier-lot --publier` lancé par David le 2026-11-02 : les 9 modèles sont `published` (relevé MCP ; niveaux inchangés,
B4 `1_SPE`, `1_GEN`, `1_TECHNO`).

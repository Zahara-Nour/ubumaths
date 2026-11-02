# Chantier « questions-1spe-analyse » — première spécialité, second degré, exponentielle, trigonométrie (restes), automatismes

> Sous-chantier de [`questions-1spe`](questions-1spe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots § 18-23, répartition § 24). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points`. En base, le niveau est `1_SPE`.
> Réparti le 2026-11-02 (David : « accélérer le chantier en répartissant les lots sur plusieurs sessions ») en trois
> sessions parallèles : `questions-1spe-geometrie` (6b, formules), `questions-1spe-analyse` (restes, automatismes),
> `questions-1spe-logique` (logique et listes Python). Outils C (433, 271, 306) : chantiers à part (D5).

## Reprendre ici

_Mis à jour le 2026-11-02, phase 0 des lots écrite._

- **État** : relevé prod fait (§ Relevé) ; phase 0 des deux lots écrite (§ Phase 0), rien de codé.
- **Prochaine action** : réponses de David à Q1-Q7, puis écrire le lot A (`lot-1spe-analyse-a.py`).
- **En attente de David** : Q1-Q7 (§ Phase 0).
- **Pièges en cours** : 306 n'est plus un outil C (` ```trig placer: `, #2189, en prod) ; voir aussi « Décisions communes et pièges ».
- **Worktree / branche** : `../ubumaths-wt-questions-1spe-analyse`, `content/questions-1spe-analyse`.

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

## Phase 0 (à valider)

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

# Chantier « questions-tspe-restes » — terminale spécialité, logique, dénombrement, suites (lot 7), puis « à savoir » (lot 8)

> Sous-chantier de [`questions-tspe`](questions-tspe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots 2 à 4 § 15-17). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base, le niveau est `T_SPE`.
> Réparti le 2026-11-02 (David : « accélérer en répartissant les lots sur plusieurs sessions ») en trois sessions
> parallèles : `questions-tspe-proba` (lots 5a, 5b), `questions-tspe-espace` (6a, 6b), `questions-tspe-restes`
> (7, puis 8 quand les deux autres sont finis). Lot 9 (espace sur figure) attend le chantier `solides`.

## Reprendre ici

_Mis à jour le 2026-11-02, après #2260 (migration 8a passée en prod)._

- **État** : lot 8 (D-L8 : 26 « à savoir » en 8a/8b/8c) ; 8a : 11 brouillons en prod, rangés et tagués (#2259, #2260), page à cocher publiée.
- **Prochaine action** : lire les verdicts de https://claude.ai/artifact/BEs9jcWtrZegQoP7vN2toa (compter) ; puis `publier-lot.ts --dir scripts/questions/tspe-8a-savoir` simulé, `--publier` par David ; ensuite 8b (primitives, y′ = ay + b, IPP : 7 modèles).
- **En attente de David** : la relecture des 11 fiches de 8a.
- **Pièges en cours** : relevé de nœuds → filtrer `archived_at is null` ; `!=` dans `$…$` lu « ≠ » (écrire `!\,=`) ; garde « notion sans sous-notion » : liste `sous_notions_admises` (migration `20261102181059`).
- **Worktree / branche** : `../ubumaths-wt-questions-tspe-restes` · branche neuve depuis `origin/main` pour 8b.

---

## Lots

| Lot | Thème                                                                                       | Points                                      |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 7   | Logique, dénombrement, suites : restes                                                      | 302, 303, 310, 569, 386, 387                |
| 8   | « À savoir » (D2) : un modèle par fait à connaître, aucun pour les doublons de savoir-faire | points « = » du § 3 de l'index, tous thèmes |

Le lot 8 touche toutes les catégories : il attend la fin des sessions `proba` et `espace` (niveaux).

## Points (classement du § 3 de l'index)

- **7, A** : 302 (négation avec un ou deux quantificateurs), 303 (raisonner par équivalence), 310 (définition de
  n!), 569 (croissante non majorée → +∞), 386 (récurrence sur une suite), 387 (évolutions ; 9f14d672 et 81ff485d,
  arithmético-géométriques, n'ont aucun point TSPE compatible sur leur nœud, § 14 de l'index).
- **8, « = »** : liste par thème au § 3 de l'index (3.1 à 3.16), à reprendre selon D2.

## Décisions communes et pièges (repris du journal d'index)

- **Décisions** : D1 brouillons d'abord (fait, lots 0) ; D2 points « = » → lot 8 « à savoir », pas ici ; D4 points
  P hors chantier ; D7 vérifier aussi contre `tcomp.json` quand un modèle porte `T_COMP`. Lots neufs : niveau
  `T_SPE` seul (lots 2 à 4), un point par modèle (ADR 0020).
- **Gabarits** : script `docs/wip/questions/lot-tspe-integrales-primitives.py` (fonctions `coef()`, `terme()`,
  `colm()`, `par_k()`) ; migration `supabase/migrations/20261102083457_questions_tspe_lot4_rangement_tags.sql` + son
  test (accepte un modèle sur une notion sans sous-notion).
- **Rendu** : `cleanCoefficients` ne nettoie que les formules que le moteur sait analyser (`(E) : y′ = …`,
  `x ↦ …` restent en « +-2x », « 1x³ ») → signes écrits par `coef()` / `terme()` ; couleur toujours dans `$…$`
  (`colm()`) ; `{{eval:…}}` peut rendre `\dfrac{1}{2}`, illisible dans un bloc ```courbe ; `|` interdit dans une
  branche de `{{if:…}}` ; relire les tirages (`question:specs --apercu 40`), pas seulement les specs.
- **Tag** : le point doit être sur le **nœud du modèle ou sa notion** (§ 14 de l'index) ; niveaux numérotés à
  l'écriture, après relevé des niveaux de la catégorie (thème, domaine, sous-domaine).
- **Prod** : `create-questions --publier` et `publier-lot --publier` → David (`!`) ; `create-questions` depuis le
  dépôt principal APRÈS le merge des fichiers. `db:migrate` depuis le dépôt principal, après `migration list
--linked` : il passe **toutes** les migrations en attente, celles des autres sessions comprises → ne pas passer
  celle d'un autre sans le dire à David. Horodatage : `pnpm migration:horodatage`, puis `check:migrations --pr`.
- **Sessions parallèles** : port de dev 5176+ (5176 souvent pris : prendre le premier libre) ; base Supabase locale
  partagée (verrou : exit 2 = attendre) ; une sous-notion neuve oblige à mettre à jour la copie figée de l'arbre des
  tests (lot 2, § 15 de l'index) → prévenir les autres sessions ; dépôt principal partagé : `git commit -m … --
<fichiers>`, push en course possible (refaire `pull --rebase`).
- **CI** : job navigateur `wrapDynamicImport` → relancer les jobs en échec ; une garde de doc veut `Doc-inchangée:
migration de données, aucun code couvert` dans un commit de la PR de migration.
- **Aperçu local** : la saisie MathLive n'est pas pilotable par l'automate (jouer les cases choix ; les réponses
  tapées sont couvertes par les specs).

## Lot 7 : phase 0 (2026-11-02, validée)

_Relevé MCP prod (lecture seule) : nœuds des six points et modèles déjà rangés dessus._

| Point | Nœud du point                                                                                     | Déjà rangé là (niveau)                                                                                |
| ----- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 302   | Logique › Quantificateurs et négation › négation d'une proposition                                | 0ab3faa5 « Nier une proposition » (1re spé, un seul quantificateur), 2                                |
| 303   | Logique › Raisonnements › par équivalence                                                         | rien                                                                                                  |
| 310   | Dénombrement › Arrangements et permutations › factorielle                                         | rien (voisins : arrangements 2, 4 ; permutations 3)                                                   |
| 569   | Suites › Limites de suites › définition                                                           | 849aabbc 1, c0f49b76 2, 146a7c79 2, ddaa7529 3, edb636bf 4                                            |
| 386   | Suites › Raisonnement par récurrence › structure d'une récurrence                                 | 618d795c 2 (hypothèse, hérédité, initialisation ; une variation d'hérédité sur `u_{n+1} = u_n/2 + c`) |
| 387   | Suites › Modèles d'évolution (notion ; sous-notions algorithmes, placements, pourcentages, seuil) | sur la notion : 5 modèles de 1re spé (intérêts simples / composés) ; « pourcentages » vide            |

Proposition : six modèles, niveau `T_SPE` seul, un point chacun, trois variations, cases « choix » sauf indication.

| #   | Point | Titre                                               | Rangement, niveau             | Variations                                                                                                                                                                                                                              |
| --- | ----- | --------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | 302   | Nier une proposition à deux quantificateurs         | négation d'une proposition, 3 | « pour tout x, il existe y… » ; « il existe M tel que pour tout n, uₙ ≤ M » (majorée) ; « il existe N tel que pour tout n ≥ N… ». En mots, sans ∀ ∃ (borne). Leurres : un seul quantificateur changé, propriété non niée, ordre inversé |
| M2  | 303   | Raisonner par équivalence                           | par équivalence, 1            | ⇔ ou seulement ⇒ entre deux étapes (x² = a², passage au ln, division par x) ; repérer l'étape d'une résolution qui n'est pas une équivalence ; propriété caractéristique (géométrique ⇔ uₙ₊₁ = q uₙ pour tout n…)                       |
| M3  | 310   | Factorielle : calculer, simplifier                  | factorielle, 1                | n! pour n de 3 à 7 (nombre) ; (n+1)! connaissant n! (nombre) ; (n+2)!/n! pour n de 3 à 12 (nombre)                                                                                                                                      |
| M4  | 569   | Suite croissante non majorée : limite               | définition, 5                 | de propriétés données (croissante non majorée / croissante majorée / non majorée seule / décroissante non minorée) → +∞, converge, −∞, « on ne peut pas conclure » ; uₙ₊₁ − uₙ ≥ c > 0 ⇒ +∞ ; contre-exemple (−1)ⁿ n                    |
| M5  | 386   | Récurrence sur une suite uₙ₊₁ = f(uₙ), f croissante | structure d'une récurrence, 3 | hérédité d'un encadrement a ≤ uₖ ≤ b ⇒ f(a) ≤ uₖ₊₁ ≤ f(b) (calcul de f(a), f(b), nombre) ; monotonie uₖ ≤ uₖ₊₁ ⇒ f(uₖ) ≤ f(uₖ₊₁) (choix de rédaction) ; formule conjecturée (uₙ = n², hérédité uₖ₊₁ = k² + 2k + 1)                      |
| M6  | 387   | Évolution en pourcentage avec apport constant       | pourcentages, 1               | traduire l'énoncé en uₙ₊₁ = a uₙ + b (abonnés, médicament, lac) ; calculer u₁, u₂ (nombre, valeurs exactes) ; sens de l'évolution à long terme (choix ; la limite chiffrée reste à 81ff485d)                                            |

**Questions à David** :

- **M5** : 618d795c a déjà une hérédité sur une suite ; M5 la complète par le schéma « f croissante » et une formule conjecturée. D'accord, ou autre angle ?
- **M6** : rangé sous « pourcentages » (contextes mêlés : abonnés, médicament, lac) plutôt que « placements » ?
- **Question d'accès** (migration nœud + tag) : personne ne gagne ni ne perd d'accès (brouillons ; visibles des élèves seulement après `publier-lot`).

**Décisions (David, 2026-11-02, « je valide » après « tes recos ? »)** : M5 garde l'angle « f croissante » +
formule conjecturée, sans suite affine (618d795c en a une) ; M6 sous « pourcentages », contextes mêlés (une
variation d'épargne comprise) ; accès : personne ne gagne ni ne perd d'accès. Catégories : M4 dans « Définition de
la limite » (celle des voisins c0f49b76, ddaa7529, edb636bf), les autres au nom de leur sous-notion.

**Écriture** : `docs/wip/questions/lot-tspe-restes.py` → `scripts/questions/tspe-7-restes/`. Specs 8 + 10 + 8 + 8 +
9 + 10 vertes, 3 800 tirages ; aperçus relus (scratchpad). Corrigés après relecture : `0!=1` lu « 0 ≠ 1 » par le
nettoyage (écrire `0!\,=1` partout où `!` précède `=`), `({{eval:n+2}})!` rendu « (7)! », étape
« k²+2k+1=(k²+2k+1) » quand a = 1 ; `{{eval:…}}` ne lit pas un `{{if:…}}` imbriqué (factorielles par cas, `fact()`).
M5 v2 : la forme développée est refusée (`bad_form`), l'énoncé demande la forme factorisée (formule au rang k+1).
Décimaux : l'aperçu montre « 0.8 », la virgule vient au rendu. Simulation `create-questions` (prod) : 6 à créer, 0
en base. Base locale : 6 brouillons créés ; aperçu admin non joué (l'extension Chrome n'ouvre pas `localhost`).

## Lot 7 : création en prod et rangement (2026-11-02)

**Création en prod** (David, 2026-11-02, après #2238), relue au MCP : 6 brouillons [T_SPE], sans nœud ni tag.

| #   | id                                     | Point    | Rangement (branche › notion › sous-notion)                         | Niveau |
| --- | -------------------------------------- | -------- | ------------------------------------------------------------------ | -----: |
| M1  | `d3cf8005-825c-4213-84a8-470a7c303eb7` | TSPE-302 | Logique › Quantificateurs et négation › négation d'une proposition |      3 |
| M2  | `043436d5-b6ad-4525-ab33-6b5bb0ebc48e` | TSPE-303 | Logique › Raisonnements › par équivalence                          |      1 |
| M3  | `ecc7bf70-34d1-4ca6-8c14-bdb74b1c39e5` | TSPE-310 | Dénombrement › Arrangements et permutations › factorielle          |      1 |
| M4  | `5063e393-f45e-4701-afa7-fbccbfb2f070` | TSPE-569 | Suites › Limites de suites › définition                            |      5 |
| M5  | `d1aee0b9-ccca-4e3b-bbeb-80d4fff6f53d` | TSPE-386 | Suites › Raisonnement par récurrence › structure d'une récurrence  |      3 |
| M6  | `651907b3-cb88-498f-92a1-d782b0a3fa1d` | TSPE-387 | Suites › Modèles d'évolution (NOTION, pas de sous-notion)          |      1 |

Les cinq sous-notions de M1 à M5 résolues au MCP (actives, une chacune).

**D-M6 (David, 2026-11-02, « je valide » après « tes recos ? »)** : la sous-notion « pourcentages » visée en phase 0
est **archivée** depuis le 2026-10-10 (avec « placements » et « algorithmes » ; seule « seuil » reste) — erreur du
relevé, qui ne filtrait pas `archived_at`. M6 va **sur la notion « Modèles d'évolution »**, comme les 5 modèles de
1re spé (intérêts) ; TSPE-387 est sur cette notion. La garde de la migration « notion visée sans sous-notion, mais
elle en a » est levée pour M6 seul (commentée). Ni l'arbre ni la copie figée des tests ne changent. Niveau de M6
inchangé (1, catégorie « Suites / Modèles d'évolution / Pourcentages », vide).

**Question d'accès** : personne ne gagne ni ne perd d'accès (brouillons ; élèves seulement après `publier-lot`).

## Lot 7 : migration nœud + tag (2026-11-02)

Prod relue au MCP avant écriture : 6 brouillons [T_SPE] sans nœud ni tag ; sous « Modèles d'évolution », seule
« seuil » est active. Migration `20261102181059_questions_tspe_lot7_rangement_tags.sql` (copie du lot 4) : la garde
« notion sans sous-notion » prend une liste `sous_notions_admises` (`{seuil}` pour M6 seul) au lieu d'être retirée :
si « pourcentages » revient, ou si une autre sous-notion arrive, la migration échoue et M6 doit y aller. Test
`tests/integration/questions-tspe-lot7-rangement-tags.test.ts` : 13 verts ; rouge sans le fichier (8 échecs) et
rouge avec la garde du lot 4 (M6 refusé, « non admise »).

**Mergé** : #2243 (2026-11-02), `db:migrate` passé seul (`migration list --linked` : aucune autre en attente). Prod relue
au MCP : les 6 modèles sur leur nœud, un point chacun, `updated_at` inchangé, toujours en brouillon.

**Page à cocher** (2026-11-02) : `page-a-cocher.ts --dir scripts/questions/tspe-7-restes`, 6 fiches lues en prod
(brouillons, aucune alerte), 19 exemples : https://claude.ai/artifact/XunJ3wwM6yWA9KjwJuSXkz (`verdicts` vide à
la publication). Rendu vu dans Chrome à ~606 px (la fenêtre ne descend pas à 390) : KaTeX dessiné, aucun débordement.

**Relecture** (David, 2026-11-02) : 6 « ok » sur 6, aucun commentaire (lu en base). **Publication** : `publier-lot.ts`
simulé (6 passent), lancé par David avec `--publier` : 6/6 `published`, relus au MCP, toujours sur leur nœud.

## Lot 8 : phase 0 (2026-11-02, validée)

_Relevé MCP prod (lecture seule) des 61 points « = » du § 3 de l'index : tags actuels et catégories `T_SPE`._

**Règle proposée (D2 de 1re spé, lue comme au lot 6 de 1re)** : modèle « à savoir » pour un **fait énonçable**
(formule, propriété, théorème et ses hypothèses), même si un voisin l'applique (264 créé malgré a86442c1) ; aucun
modèle pour une **notion** dont le savoir-faire voisin est la seule épreuve (« représentation paramétrique » ≈
« déterminer une représentation »). Forme D29 : case choix à 4 propositions, erreurs typiques en distracteurs, 2-3
variations dans les deux sens. Rangement : nœud du point ; sous-domaine neuf « À savoir » dans chaque domaine (aucun
en `T_SPE` en prod) → aucune collision de niveaux avec les sessions `proba` et `espace`, qui écrivent ailleurs.

**Déjà couverts par un tag (4)** : 316 (ef3c495c), 508 (4ff9d049), 586 (a80a780f), 609 (7a0b795c).

**À savoir (26)**, en trois sous-lots :

| Sous-lot | Point | Fait                                                  | Domaine › À savoir (niveau)  |
| -------- | ----- | ----------------------------------------------------- | ---------------------------- |
| 8a       | 381   | comparaison : uₙ ≤ vₙ et uₙ → +∞ ⟹ vₙ → +∞            | Suites, 1                    |
| 8a       | 570   | théorème des gendarmes (hypothèses)                   | Suites, 2                    |
| 8a       | 400   | comparaison pour les fonctions                        | Limites de fonctions, 1      |
| 8a       | 401   | opérations : reconnaître les formes indéterminées     | Limites de fonctions, 2      |
| 8a       | 410   | convexe ⟺ courbe sous ses sécantes                    | Convexité, 1                 |
| 8a       | 411   | convexe ⟺ courbe au-dessus de ses tangentes           | Convexité, 2                 |
| 8a       | 585   | convexe ⟺ f′ croissante                               | Convexité, 3                 |
| 8a       | 428   | TVI : hypothèses (continuité)                         | Continuité, 1                |
| 8a       | 429   | TVI, cas strictement monotone : solution unique       | Continuité, 2                |
| 8a       | 439   | ln(ab), ln(a/b), ln(aⁿ), ln(1/a)                      | Fonction logarithme, 1       |
| 8a       | 440   | (ln x)′ = 1/x                                         | Fonction logarithme, 2       |
| 8b       | 463   | primitive de xⁿ, n ∈ ℤ, n ≠ −1                        | Primitives, 1                |
| 8b       | 603   | primitive de 1/√x                                     | Primitives, 2                |
| 8b       | 604   | primitive de exp                                      | Primitives, 3                |
| 8b       | 605   | primitive de sin                                      | Primitives, 4                |
| 8b       | 606   | primitive de cos                                      | Primitives, 5                |
| 8b       | 466   | solutions de y′ = ay + b                              | Équations différentielles, 1 |
| 8b       | 484   | formule d'intégration par parties                     | Calcul intégral, 1           |
| 8c       | 541   | un ensemble à n éléments a 2ⁿ parties                 | Dénombrement, 1              |
| 8c       | 614   | P(X = k) = C(n,k) pᵏ(1−p)ⁿ⁻ᵏ                          | Loi binomiale, 1             |
| 8c       | 519   | linéarité de l'espérance                              | Sommes de v. a., 1           |
| 8c       | 520   | V(X+Y) = V(X)+V(Y) sous indépendance                  | Sommes de v. a., 2           |
| 8c       | 343   | u ⊥ v ⟺ u·v = 0 (espace)                              | domaine de l'espace, 1       |
| 8c       | 351   | plans perpendiculaires ⟺ vecteurs normaux orthogonaux | domaine de l'espace, 2       |
| 8c       | 329   | droite = point + vecteur directeur                    | domaine de l'espace, 3       |
| 8c       | 331   | plan = point + deux vecteurs non colinéaires          | domaine de l'espace, 4       |

**Couverts par leur voisin, sans modèle (31)** : 301, 540 → 306 ; 544 → 541 ; 547 → ef3c495c (316) ; 317 → 318 ;
326, 327, 328, 330 → 550, 333 ; 342 → 345 ; 348 → 357 ; 349 → 565 ; 560 → 367 ; 350 → 370 ; 561 → 369 ; 363 → 365 ;
397, 572, 573 → 415 ; 398 → 404 ; 399, 574, 575 → 403 (limites usuelles, lot 2) ; 581 → 806c10f4, 04ec9518 (415) ;
427 → 432 ; 453 → 597-601 ; 477 → 487 ; 608 → dd0ee69a (489) ; 503, 504 → 508 ; 523 → 524.

**Questions** : Q1 règle et partage 26 / 31 ; Q2 trois sous-lots (8a 11, 8b 7, 8c 8), dans cet ordre ; Q3 sous-domaine
« À savoir » neuf par domaine ; Q4 cas limites : 427 (suite convergente et fonction continue), 477 (∫ = F(b) − F(a)),
398 (asymptote) laissés « couverts » ; Q5 question d'accès : personne ne gagne ni ne perd d'accès (brouillons ; la
migration ne pose que nœud et tags).

**D-L8 (David, 2026-11-02, « je valide », sur les recos)** : Q1 26 à savoir, 31 couverts ; Q2 8a → 8b → 8c ; Q3
sous-domaine « À savoir » neuf par domaine ; Q4 427, 477, 398 couverts ; Q5 accès : personne.

## Lot 8a : écriture (2026-11-02)

`docs/wip/questions/lot-tspe-savoir-a.py` → `scripts/questions/tspe-8a-savoir/` : 11 modèles `[T_SPE]`, sous-domaine
« À savoir » (Suites › Limites de suites 1-2 ; Fonctions › Limites de fonctions 1-2 ; Fonctions convexes › Convexité
1-3 ; Fonctions › Continuité 1-2 ; Fonctions › Fonction logarithme 1-2). 2 ou 3 variations par modèle, case choix à 4
propositions ; pour les théorèmes (381, 400), une variation « piège » dont la bonne réponse est « On ne peut rien
conclure ». Specs : 128 vertes (une juste, trois fausses par variation), 1 550 tirages ; aperçus relus (scratchpad).
Simulation `create-questions` : 11 à créer, 0 en base. **#2259 mergée** (CI verte). Nœuds des 11 points (MCP) : sous-notions
actives — Suites › Limites de suites › comparaison et encadrement (381, 570) ; Fonctions › Limites de fonctions ›
comparaison et encadrement (400), opérations (401) ; Fonctions › Convexité › caractérisations (410, 411, 585) ;
Fonctions › Continuité › valeurs intermédiaires (428, 429) ; Fonctions › Logarithmes › propriétés algébriques (439),
dérivée (440).

## Lot 8a : création en prod et migration nœud + tag (2026-11-02)

**Création en prod** (David, 2026-11-02, 20 h 39 UTC, après #2259), relue au MCP : 11 brouillons [T_SPE], « À savoir »,
sans nœud ni tag — 747d627a (381), 2b29942c (570), 5bf5b452 (400), f6415cb9 (401), 12ed13ec (410), eeb72d3a (411),
cfd13223 (585), c10096eb (428), fe7f5218 (429), 7c8b341b (439), 9de80159 (440).

Migration `20261102204034_questions_tspe_lot8a_rangement_tags.sql` (copie du lot 7, préfixe `_qtl8a_` ; diff avec le
gabarit = les lignes du lot). Test `tests/integration/questions-tspe-lot8a-rangement-tags.test.ts` (copie du lot 7, sans
les trois cas propres à M6) : 10/10 ; **rouge** sans l'étape 4 (suite principale « lot incohérent », 5 sautés, et le
test du rollback).

`security-auditor` (2026-11-02, prod relue au MCP) : **aucun finding bloquant** (diff avec le gabarit refait : les lignes
du lot seulement). Non bloquants : pas de garde `status = 'draft'` (comme le gabarit) ; garde « notion sans sous-notion »
sans effet ici. `check:migrations --pr 2260` vert ; **#2260 mergée** (CI 16/16). `migration list --linked` : seule
`20261102204034` en attente ; **`db:migrate`** lancé depuis le dépôt principal (4 conditions réunies). Prod relue au
MCP : 11 modèles sur leur sous-notion, un tag chacun, `updated_at` = `created_at`, toujours `draft`.

**Page à cocher** : `page-a-cocher.ts --dir scripts/questions/tspe-8a-savoir`, 11 fiches lues en prod, aucune alerte,
31 exemples : https://claude.ai/artifact/BEs9jcWtrZegQoP7vN2toa (`verdicts` vide à la publication ; rendu non regardé
dans Chrome).

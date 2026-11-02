# Chantier « questions-tspe-restes » — terminale spécialité, logique, dénombrement, suites (lot 7), puis « à savoir » (lot 8)

> Sous-chantier de [`questions-tspe`](questions-tspe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots 2 à 4 § 15-17). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base, le niveau est `T_SPE`.
> Réparti le 2026-11-02 (David : « accélérer en répartissant les lots sur plusieurs sessions ») en trois sessions
> parallèles : `questions-tspe-proba` (lots 5a, 5b), `questions-tspe-espace` (6a, 6b), `questions-tspe-restes`
> (7, puis 8 quand les deux autres sont finis). Lot 9 (espace sur figure) attend le chantier `solides`.

## Reprendre ici

_Mis à jour le 2026-11-02, après #2238 et la création des brouillons en prod._

- **État** : lot 7 en prod, 6 brouillons sans nœud ni tag (`id` au § « Lot 7 : création en prod ») ; M6 rangé sur la NOTION « Modèles d'évolution » (D-M6 ci-dessous) ; migration pas encore écrite.
- **Prochaine action** : migration nœud + tag (copier `20261102083457_questions_tspe_lot4_rangement_tags.sql` et `tests/integration/questions-tspe-lot4-rangement-tags.test.ts`), garde « notion sans sous-notion » levée pour M6 seul ; test rouge puis vert, `security-auditor`, PR, `check:migrations --pr`, merge, `db:migrate` ; puis page à cocher et publication. Lot 8 après `proba` et `espace`.
- **En attente de David** : rien.
- **Pièges en cours** : relevé de nœuds → filtrer `archived_at is null` (« pourcentages » était archivée) ; `!=` dans `$…$` lu « ≠ » (écrire `!\,=`).
- **Worktree / branche** : `../ubumaths-wt-questions-tspe-restes`, `feat/questions-tspe-restes-lot7-tags` (depuis `origin/main`).

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

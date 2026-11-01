# Chantier « questions-3 » — couvrir la 3e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `3.points`.

## Reprendre ici

_Mis à jour le 2026-11-01, rangement du lot 6 écrit._

- **État** : lot 6 : 7 brouillons en prod ; migration de rangement écrite, auditée (§ 13.9), PR ouverte.
- **Prochaine action** : CI verte → merge → David lance `db:migrate` → vérifier au MCP (nœuds, tags,
  c8306505 en `['4', '3']`) → page à cocher (7 fiches ; 3-019 v2 et 3-020 : ` ```solide `, brouillon jusqu'au
  `deploy:prod`).
- **En attente de David** : `db:migrate` après le merge (depuis le worktree à jour d'`origin/main`).
- **Pièges en cours** : `db:migrate` et `publier-lot.ts` (même en simulation) refusés par le classifieur
  du mode auto → David les lance avec `!` ; ` ```solide ` pas en prod (modèles qui s'en servent : brouillon
  jusqu'au `deploy:prod`) ; étiquette d'un vecteur libre (`vecteur(dx, dy, ancre=…)`) : vérifier qu'un
  `texte()` en LaTeX passe ; dans `points:` d'un ` ```courbe `, ni `{{eval}}` fractionnaire ni virgule ;
  aperçu admin sur `127.0.0.1` ; worktree neuf : `svelte-kit sync` avant `tsx` ; commits de doc depuis le
  worktree (`git push origin HEAD:main`) ; `db:migrate` depuis un worktree À JOUR d'`origin/main` ; réponse
  décimale = fraction refusée (garder la fraction + `acceptDecimal`) ; `Doc-inchangée:` dans un COMMIT ;
  `audit-question-draws` : faux positif « nombres juxtaposés » sur les blocs statistiques.
- **Worktree / branche** : `../ubumaths-wt-questions-3`, HEAD détachée sur `origin/main`.

## 1. Relevé (prod, 2026-10-28)

- 66 points de 3e ; **10 ont au moins un modèle, 56 aucun**.
- 27 modèles `'3' = any(grades)`, tous publiés, tous rangés sur un nœud ; 19 tagués, 8 sans point.
- Points tagués : 3-011 (3), 3-012, 3-013 (2), 3-016 (2), 3-058 (2), 3-044 (3), 3-066 (2), 3-052 (2),
  3-068 (290dcf6f), 3-069 (24f7a007).

## 2. L'existant contre les bornes

> La passe du chantier « arbre des notions » fait foi : `docs/archive/wip/arbre-notions/analyse/cycle4.csv`
> et `cycle4-notes.md`. Ses HORS_PROGRAMME n'ont jamais changé de niveau : c'est à faire ici.

### 2.1 Tagués : OK (verdicts TAG de la passe)

Opposé (aeb86af9, 843c3186, c32ebff9 → 3-011), réduire un produit (93a5f7a9 → 3-012, décision du 2026-10-20),
double distributivité (1703620c, 9fefb94c → 3-013), identités (a6a6c491, 32cf5766 → 3-016 ; ff8082bd,
ff9bb2fb → 3-058), fonctions affines (0d43f797, 1c5bce2c, 2d29792b → 3-044 ; 15ddcc75, 7c07749c → 3-066),
quotient de puissances (8b213d74, 18761148 → 3-052), augmentation / diminution (290dcf6f, 24f7a007 →
3-068 / 3-069 ; ex-6e, la variation à 200 % d'augmentation et à 100 % de diminution relevées en 6e sont
à revoir contre « cas simples »).

Remarque : 3-016 n'est couvert que par (a + b)(a − b) ; ni (a + b)² ni (a − b)², alors que l'exemple
du point est (x + 3)².

### 2.2 Classés 3e, sans point (HORS_PROGRAMME de la passe)

| Modèle   | Ce qu'il fait                                 | Point candidat    |
| -------- | --------------------------------------------- | ----------------- |
| 54107079 | distributivité simple à coefficients relatifs | 4-022 (4e)        |
| ac5d0413 | réduire qa + ra                               | 5-039 (5e)        |
| 77b82211 | réduire une somme à deux lettres              | aucun             |
| 2bdb3db6 | racine de ax + b                              | 4-024 (4e)        |
| 7c0ee046 | sens de variation d'une fonction affine       | 2de               |
| 336451af | droites parallèles ⇔ même coefficient         | 2de               |
| bba95c2d | tableau de signes d'une fonction affine       | 2de               |
| cf4468c3 | puissance d'une puissance, exposants relatifs | aucun (non citée) |

### 2.3 Classés 4e ou 5e, relevant de la 3e (HORS_PROGRAMME de la passe)

| Modèles                 | Ce qu'ils font                            | Point de 3e |
| ----------------------- | ----------------------------------------- | ----------- |
| 90dca27a, acbd2280 (5e) | simplifier « le plus possible »           | 3-001       |
| c9d6c5db (4e)           | idem, fractions relatives                 | 3-001       |
| 15368b02, 65110463 (4e) | a⁻ⁿ = 1/aⁿ ; inverse noté a⁻¹             | 3-004       |
| bb9cff7b, 5b627bb7 (4e) | produit de puissances, exposants relatifs | 3-005       |
| 1db08bdc, 743c0809 (4e) | quotient de puissances de 10              | 3-052       |
| 8ac99be4 (4e)           | (10ᵃ × 10ᵇ) / 10ᶜ                         | 3-052       |
| 953574d4, 9f380957 (4e) | notation scientifique                     | 3-006       |
| a1ae1558, 17f3dfcd (4e) | puissance d'une puissance                 | aucun       |

Changer leur niveau et les taguer couvrirait **3-001, 3-004, 3-005, 3-006** sans écrire de modèle.

## 3. Les 56 points sans modèle

- **A. Texte / formule seuls (26)** :
  - nombres : 3-001, 3-003, 3-004, 3-005, 3-006, 3-007 (les quatre premiers aussi par le § 2.3),
    3-008, 3-009, 3-010 ;
  - calcul littéral, équations : 3-054, 3-014 (réponse « x ⩾ 4 » : vérifier que le juge l'accepte),
    3-015 (deux solutions : deux cases) ;
  - géométrie (cours, case choix) : 3-018, 3-019, 3-021, 3-027 ;
  - données, probabilités : 3-033, 3-036, 3-063 ;
  - fonctions : 3-041 (expression), 3-064, 3-043 ;
  - algorithmique (programme écrit, « que vaut x à la fin ? ») : 3-047, 3-048, 3-049.
- **B. Outil existant (24)** :
  - ` ```courbe ` (lectures graphiques) : 3-053, 3-057, 3-039, 3-040, 3-042, 3-065, 3-045, 3-067,
    3-046 (choisir la bonne courbe), 3-037 ;
  - ` ```figure ` + cases ou choix : Thalès 3-022, 3-059, 3-060, 3-055 ; trigonométrie 3-023, 3-061
    (angle et longueur arrondis) ; translation et vecteurs 3-024, 3-025, 3-026 (quadrillage, choix du
    point image) — après lecture de `figure-et-choix` ;
  - statistiques (` ```effectifs `, ` ```barres `, ` ```frequences-cumulees `) : 3-028, 3-029, 3-056 ;
  - ` ```simulation ` : 3-035, 3-034 (deux épreuves, arbre ou tableau : ` ```probtree `).
- **C. Outil neuf (3)** :
  1. **Boîte à moustaches** (bloc d'affichage, puis geste « construire ») → 3-062 (lire), 3-030
     (construire). Rien n'existe : aucun type `stat-chart` ne la dessine. Sert aussi en 2de.
  2. **Solides et sections** (pavé, cylindre, boule en perspective) → 3-020 ; 3-019 en dessin.
     Même manque qu'en 6e (assemblages de cubes) : un seul chantier « solides » pour les deux.
- **D. Non évaluables dans l'appli (3)** : 3-017 (analyse-synthèse), 3-050 (structurer un programme),
  3-051 (écrire un programme : Blockly, futur). 3-032 (tableur) **à trancher** : grille en tableau
  markdown et formule `=MOYENNE(B2:B9)` en réponse texte, ou D.

## 4. Lots proposés (après les réponses)

0. **Corrections de l'existant** (§ 2) : changements de niveau et tags (§ 2.2, 2.3), plages de 290dcf6f
   / 24f7a007.
1. **Puissances, racines, nombres** (A) : 3-007, 3-008, 3-009, 3-010, 3-003 (+ 3-001, 3-004, 3-005,
   3-006 si le § 2.3 est refusé).
2. **Calcul littéral, équations** (A) : 3-016 en (a ± b)², 3-054, 3-014, 3-015.
3. **Fonctions** : texte 3-041, 3-064, 3-043, puis graphiques (B) 3-039, 3-040, 3-042, 3-065, 3-045,
   3-067, 3-046, 3-053, 3-057, 3-037.
4. **Pourcentages, probabilités, statistiques** : 3-036, 3-063, 3-033, 3-028, 3-029, 3-056, 3-034, 3-035.
5. **Thalès et trigonométrie** (B, figure) : 3-022, 3-059, 3-060, 3-055, 3-023, 3-061.
6. **Translation, vecteurs, sphère** : 3-024, 3-025, 3-026, 3-027, 3-018, 3-019, 3-021.
7. **Algorithmique** (A) : 3-047, 3-048, 3-049.
8. Outils C (boîte à moustaches ; solides), chacun en chantier à part.

## 5. Questions à David

1. **§ 2.3** : passer en 3e (et taguer) les 13 modèles de 4e / 5e qui relèvent de la 3e ? Ils
   quitteraient la 4e / 5e (un modèle a plusieurs niveaux possibles : les garder aussi en 4e ?).
2. **§ 2.2** : les 8 HORS_PROGRAMME classés 3e — changer leur niveau (4e, 5e, 2de) ou les laisser
   sans point ? Puissance d'une puissance (3 modèles) : aucun point ne la cite.
3. **Ordre des lots** du § 4 : d'accord pour commencer par 0 puis 1 ?
4. **Outils C** : la boîte à moustaches en chantier à part (affichage, puis construire) — à lancer, et
   quand ? Les solides : un seul chantier avec ceux de la 6e ?
5. **3-032 (tableur)** : formule en texte, ou non évaluable ?

## 6. Décisions (David, 2026-10-28)

### 6.1 Réponses au § 5

David a répondu « je te suis » aux recommandations faites sur les cinq questions :

1. Les modèles de 4e / 5e du § 2.3 passent en 3e **seulement**, tagués (sauf 2d8e7948, à modifier :
   laissé à la session 4e) ; la session 3e s'en charge.
2. Les HORS_PROGRAMME du § 2.2 vont au niveau de leur point (4e, 5e, 2de) ; ceux sans point restent
   sans tag, non archivés.
3. Ordre des lots : 0 corrections, 1 puissances et nombres, 2 calcul littéral et équations,
   **5 Thalès et trigonométrie avancé en 3e position**, puis 3 fonctions, 4 statistiques et
   probabilités, 6 vecteurs et sphère, 7 algorithmique.
4. Boîte à moustaches : chantier à part après le lot de statistiques en texte (affichage, puis
   construire). Solides : un chantier commun avec la 6e, après les lots A et B.
5. 3-032 (tableur) : classe A, case « choix » entre formules (`=MOYENNE(B2:B9)`…), dans le lot 4.
   **Note de la session 4e (2026-10-29)** : 3-032 est couvert par le modèle tableur du lot 3 de la 4e (grades 4
   et 3, tagué 4-045 et 3-032, décision de David) ; ne pas l'écrire au lot 4. Voir `questions-4-progress.md` § 16.

### 6.2 Lot 0 (corrections) : phase 0 validée (« je te suis »)

**A. Vers la 3e seule, tag posé** :

| Modèle                                 | Point | Nœud                                                                        |
| -------------------------------------- | ----- | --------------------------------------------------------------------------- |
| 90dca27a, acbd2280 (5e), c9d6c5db (4e) | 3-001 | gardé                                                                       |
| 15368b02 (4e)                          | 3-004 | gardé                                                                       |
| 65110463 (4e)                          | 3-004 | Fractions : calculs > inverse → Puissances : sens et écritures > définition |
| bb9cff7b, 5b627bb7 (4e)                | 3-005 | gardé                                                                       |
| 1db08bdc, 743c0809 (4e)                | 3-052 | gardé                                                                       |
| 8ac99be4 (4e)                          | 3-052 | Puissances : calculs → … > quotient de puissances                           |
| 953574d4, 9f380957 (4e)                | 3-006 | gardé                                                                       |
| 17f3dfcd (4e)                          | aucun | gardé (puissance d'une puissance, exposants relatifs)                       |

**B. Hors de la 3e** :

| Modèle   | Niveau | Point | Nœud                                                                   |
| -------- | ------ | ----- | ---------------------------------------------------------------------- |
| 54107079 | 4e     | 4-022 | gardé                                                                  |
| 2bdb3db6 | 4e     | 4-024 | Fonctions affines > équations → Équations : premier degré > ax + b = c |
| ac5d0413 | 5e     | 5-039 | gardé                                                                  |
| 7c0ee046 | 2de    | 2-348 | gardé                                                                  |
| bba95c2d | 2de    | 2-328 | gardé                                                                  |
| 336451af | 2de    | 2-318 | Fonctions affines → Géométrie repérée > intersection de deux droites   |

Restent en 3e sans tag : 77b82211, cf4468c3. a1ae1558 (exposants positifs) reste en 4e.

**C. Contenu** : 290dcf6f « Augmentation » perd sa variation à 200 % (« cas simples ») ; 24f7a007
« Diminution » (10, 20, 30, 50 %) inchangé.

**Accès (tranché)** : les élèves et le prof de 3e voient 12 modèles publiés de plus ; la 4e et la
5e les perdent ; la 3e en cède 6 (4e : 2, 5e : 1, 2de : 3). Aucune règle ne change.

## 7. Lot 0 : écrit (2026-10-28)

- **Écart à la phase 0** : 90dca27a et acbd2280 (5e, prévus en 3e avec 3-001) sont **sortis du lot**. La
  session 5e les avait déjà passés en 4e avec le tag 4-005, sur décision de David
  (`20261028193700_questions_5_niveaux`, #1917, jouée en prod). 3-001 reste couvert par c9d6c5db.
  Le lot compte donc 18 modèles (17 rangés + 290dcf6f).
- **Relevé** `docs/wip/questions/etat-prod-2026-10-28-3e/` (`releve-prod-3.ts`, lecture seule) : 18 modèles,
  md5 = MCP pour les 18 ; 1 tag (290dcf6f → 3-068) ; 0 donnée d'élève (9 tables).
- **Contenu** `20261028200000_questions_3_contenu.sql` (`lot-corrections-3.py`) : 290dcf6f sans la variation
  à 200 % ; la spec « augmentation seule » passe sur 50 %. `verifier-contenu.ts` : specs 14/14, tirages 400/400.
- **Rangement** `20261028200100_questions_3_rangement_tags.sql` (`lot-rangement-3.py`, repris du CM1) :
  17 modèles, 17 niveaux changés, 4 déplacés (65110463, 8ac99be4, 2bdb3db6, 336451af), 16 tags posés.
- **Tests** `questions-3-contenu`, `questions-3-rangement-tags` : rouges les migrations vidées (17 échecs),
  verts avec (31 verts, 17 sautés = options du helper sans objet), relancés après le commit.
- **Revue** : `security-auditor` — 1 bloquant : `20261028200000` déjà joué en prod (6e) ; renuméroté en
  `20261028213000` / `20261028213100` (ff8aa8005), preuves rouge et verte refaites ; SQL sans finding.
- **Livré** : #1921 mergée (CI verte sur ff8aa8005) ; `db:migrate` bloqué par la migration 2de non jouée,
  joué par David (`db push --include-all`, 2026-10-28, avec 2de, 5e et 4e) ; vérification MCP conforme
  (`updated_at` du 2026-10-28 08:35 sur 336451af, 7c0ee046, bba95c2d = migration des QCM en cases, pas ce lot).
- **Coordination 4e** (message de la session 4e, validé par David) : 17f3dfcd ira ensuite en 2de (2-260) par
  le lot 0 de la 4e, après nos migrations ; 90dca27a et acbd2280 → 3e + 3-001 dans un lot suivant de la 3e.

## 8. Lot 1 (puissances et nombres) : phase 0 proposée (2026-10-28)

Relevé MCP du jour : 3-003, 3-007, 3-008, 3-009, 3-010 sans modèle ; 3-001 couvert par c9d6c5db seul ;
4-005 = 4f4a5c94, d14fe0cf, 90dca27a, acbd2280. Niveaux relevés par catégorie (tous statuts) ; la 4e prévoit
« Fractions / Problèmes / Parts et restes, 2 » (son lot 1, pas écrit) : la 3e prend le 3.

### 8.1 Modèles neufs (5, un par point)

| Point | Modèle (catégorie, niveau) · sous-notion                                                                                                        | Variations                                                                                                                                                                                                                                  | Réponse                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 3-003 | Problèmes avec des fractions (Fractions / Problèmes / Parts et restes, 3) · Fractions : calculs > fraction d'une quantité                       | 1) quatre groupes a/b, c/d, f/g : fraction du dernier (complément à 1, dénominateurs ≤ 12) ; 2) a/b dépensé, puis c/d du reste, il reste N € : somme de départ ? ; 3) réservoir aux a/b, + N L, il est aux c/d : capacité ?                 | case                                                    |
| 3-007 | Problèmes et notation scientifique (Puissances / Problèmes / Notation scientifique, 1) · Puissances : sens et écritures > notation scientifique | 1) préfixe → puissance : 1 µm = 10^? m (nano à giga) ; 2) a nm, a µm, a Go… → notation scientifique dans l'unité de base ; 3) produit : la lumière (3 × 10⁸ m/s) en t s ; 4) quotient : combien de bactéries de a µm bout à bout sur 1 cm ? | cases mantisse + exposant (comme 953574d4) ; case en 4  |
| 3-008 | Résoudre x² = a (Calcul littéral / Equations / x² = a, 1) · Équations : produit et quotient > x² = a                                            | 1) x² = n², n de 1 à 12 ; 2) x² = a, a sans facteur carré (2 à 23) : {−√a ; √a}, sans simplification ; 3) x² = 0 ou x² = −n (une ou aucune solution)                                                                                        | case S = ? (comme ac9579d6, 2de, sans sa variation k√m) |
| 3-009 | Problèmes avec la racine carrée (Racines carrées / Problèmes / Aire et côté, 1) · Racines carrées : calculs > techniques de calcul              | 1) carré d'aire n² cm² : côté ; 2) carré d'aire a cm² (non carré) : côté exact √a ; 3) idem, arrondi au mm ; 4) carré de même aire qu'un rectangle a × b (a × b carré parfait : 9 × 4, 8 × 2, 18 × 2…)                                      | case                                                    |
| 3-010 | Décomposer en facteurs premiers (Entiers / Nombres premiers / Décomposition, 1) · Nombres premiers > décomposition en facteurs premiers         | 1) 2^a × 3^b × 5^c (≤ 1 000) : cases des exposants ; 2) 2^a × 3^b × p, p premier de 7 à 37 (306, 124, 2 220 du BO) : cases des exposants et de p ; 3) case choix : la décomposition parmi 2² × 3 × 5 / 4 × 15 / 2 × 30 / 2² × 15            | cases · case choix                                      |

`testSpecs` d'erreurs typiques : 3-003 → c/d de la somme de départ au lieu du reste ; 3-007 → mantisse ≥ 10 ou
exposant du préfixe faux ; 3-008 → {√a} seul, √(−n) ; 3-009 → a/2, a/4 (périmètre) ; 3-010 → 4 × 15.

**Le juge ne sait pas exiger « facteurs premiers »** (mesuré) : avec `product`, 4 × 15 passe ; avec un motif
`2^2 * 3 * 5`, 5 × 3 × 2² et 2 × 2 × 3 × 5 sont refusés. D'où des cases d'exposants et une case choix, sans
réponse libre.

### 8.2 Rangement de 90dca27a et acbd2280

4e → 3e seule, tag 4-005 → 3-001, nœud et niveaux gardés (Fractions / Apprivoiser / Simplification, 4 et 1).
Garde : seulement si `grades = {4}` et tag 4-005 encore posé. 4-005 garde 4f4a5c94 et d14fe0cf.

### 8.3 Question d'accès

Modèles neufs en brouillon : personne ne lit rien de neuf. Rangement : les élèves et le prof de 3e voient 2
modèles publiés de plus, ceux de 4e les perdent. Aucune règle ne change.

### 8.4 Questions à David

1. Valider les 5 modèles (§ 8.1) : points, variations, catégories, niveaux ?
2. 3-010 : cases + case choix suffisent, ou un petit chantier « forme facteurs premiers » dans le juge (réponse
   libre 2² × 3 × 5 en tout ordre), avant ou après le lot ?

### 8.5 Décisions (David, 2026-10-28, « je te suis »)

- Les 5 modèles du § 8.1 validés, avec deux réglages : 3-007 v4 (bactéries) en nombre entier ; 3-009 v3
  (arrondi au mm) aires de 10 à 99 cm².
- 3-010 : cases + case choix ; la forme « facteurs premiers » dans le juge = **futur chantier** (sert aussi
  à 629c231b, Terminale expertes, qui accepte aujourd'hui 360 tel quel).

### 8.6 Lot 1 : écrit (2026-10-28)

- `docs/wip/questions/lot-3-1.py` → `scripts/questions/3-lot-1/` (5 JSON) ; `question:specs` : 47 specs vertes,
  850 tirages ; `create-questions` en simulation : vert.
- Écarts à la phase 0 : 3-009 v2 (valeur exacte) tire des aires **sans facteur carré** (√20 rendait
  `unoptimal_form`, la simplification des racines est en 2de) ; 3-008 porte `shared.blankDefaults.answerKind:
'intervalles'` comme ac9579d6 (sans lui, {−7 ; 7} est jugé faux).
- Base locale : 5 brouillons créés ; aperçu admin : énoncés (préfixes, μ, cases en exposant, fractions, case
  choix) affichés juste ; case choix jouée, « Juste ». La saisie MathLive n'a pas pu être pilotée par le
  navigateur : le jugement des cases repose sur les specs.

### 8.7 Lot 1 : en prod, rangement (2026-10-28)

- Brouillons créés en prod par David (`create-questions --publier`) : 93998734 (Problèmes avec des fractions),
  35f82aad (Problèmes et notation scientifique), 3806ee3d (Résoudre x² = a), 70449b92 (Problèmes avec la racine
  carrée), 77ab770d (Décomposer en facteurs premiers) ; vérifiés au MCP : brouillons [3], sans nœud ni tag.
- Migration `20261029003100_questions_3_lot1_rangement_tags` (générée par `lot-rangement-3-1.py`, relevé
  `etat-prod-2026-10-28-3e-lot1/`) : les 5 sur le nœud de leur point (93998734 sur « Fractions : calculs >
  fraction d'une quantité »), tags 3-003, 3-007, 3-008, 3-009, 3-010 ; 90dca27a et acbd2280 : [4] → [3],
  4-005 → 3-001, nœud gardé. Le gabarit du lot 0 accepte désormais un nœud d'avant vide (brouillon neuf).
- Test `questions-3-lot1-rangement-tags` : 21 verts, 10 rouges sans la migration (migration vidée, rollback gardé).

### 8.8 Lot 1 : rangement joué, page à cocher (2026-10-28)

- #1930 mergée (CI : run annulé puis `forfait-palotin` en délai dépassé, sans rapport, relancé vert) ;
  `db:migrate` lancé par David ; MCP : les 7 modèles conformes à l'en-tête de la migration.
- Page à cocher : https://claude.ai/artifact/RzBxX9RLjAtvkNnTWssq4X (alerte : 77ab770d, bloc choix non dessiné).
- Relecture (2026-10-29) : 5 verdicts en base, 5 OK, aucun commentaire.

## 9. Lot 2 (calcul littéral, équations) : phase 0 proposée (2026-10-29)

Relevé MCP du jour : 3-054, 3-014, 3-015 sans modèle ; 3-016 couvert par (a + b)(a − b) seul (a6a6c491,
32cf5766). **La 2de a des modèles proches** : 85f6e96e, 288c2bf0, 1338da34, 6909bfde ((a ± b)², 2-262),
cf796fab (ax ⩾ b, 2-431), bb3b8e76 (produit nul, 2-267). La session 2de les a corrigés le 2026-10-27 :
ils restent à elle. Ils ne collent pas à la 3e : réponse en intervalle (« pas un enjeu » en 3e),
coefficients entiers seulement, pas de mélange des trois identités. Les 4e factorisent par un nombre ou
une lettre (4-070) ; aucun modèle n'a de facteur commun entre parenthèses.

### 9.1 Modèles neufs (4, un par point)

| Point | Modèle (catégorie, niveau) · sous-notion                                                                                                   | Variations                                                                                                                                                                                                                                                                  | Réponse                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 3-016 | Développer (a + b)² et (a − b)² (Calcul littéral / Transformation / Identités remarquables, 10) · Calcul littéral > identités remarquables | 1) (x + n)², n de 1 à 9 ; 2) (x − n)² ; 3) (ax + b)², a de 2 à 5, b de 1 à 9 ; 4) (ax − b)² ; 5) l'une des trois identités tirée au hasard ((ax + b)², (ax − b)², (ax − b)(ax + b)) : reconnaître laquelle                                                                  | case, forme développée réduite             |
| 3-054 | Factoriser avec un facteur commun (Transformation / Factorisation, 11) · Calcul littéral > factorisation                                   | 1) (x + a)(bx + c) + (x + a)(dx + e) ; 2) idem avec − entre les deux produits ; 3) facteur en tête puis en queue : (2x + 1)(x − 3) + (x + 4)(2x + 1) ; 4) facteur au carré : (x + a)² + (x + a)(bx + c) ; 5) facteur seul : (x + a)(bx + c) + (x + a) → (x + a)(bx + c + 1) | case, forme factorisée                     |
| 3-014 | Résoudre une inéquation ax ⩾ b (Calcul littéral / Inéquations / ax ⩾ b, 1) · Inéquations : premier degré                                   | 1) a > 0, b multiple de a, les quatre sens (3x ⩾ 12) ; 2) a < 0, b multiple de a (−2x < 6 → x > −3) ; 3) a positif ou négatif, borne en fraction non décimale (3x ⩾ 2 → x ⩾ 2/3 ; −7x < 3 → x > −3/7)                                                                       | case « x > 4 » (inégalité, pas intervalle) |
| 3-015 | Résoudre une équation produit nul (Calcul littéral / Equations / Produit nul, 1) · Équations : produit et quotient > produit nul           | 1) (x + a)(x + b) = 0 ; 2) (ax + b)(cx + d) = 0, solutions entières ou fractions ((2x − 3)(5x + 7)) ; 3) coefficients décimaux ((2,5x − 7)(8x − 9,6) = 0 → {2,8 ; 1,2}) ; 4) x(ax + b) = 0 ; 5) (proposée, § 9.4) factoriser d'abord : (x + 2)(3x − 1) + (x + 2)(x + 4) = 0 | case S = {… ; …} (comme 3-008)             |

Consigne de 3-054 : « Factorise » ; tirages tels que le second facteur n'a pas de diviseur commun entier
(sinon « le plus possible » attendrait 2(x + 2)(2x + 3)). Second facteur jamais constant.

`testSpecs` d'erreurs typiques : 3-016 → oubli du double produit (x² + 9), double produit sans le 2
(x² + 3x + 9), signe du double produit en (a − b)², (2x)² écrit 2x² ; 3-054 → signe non distribué au
second facteur (v2), oubli du 1 (v5), facteur non réduit (x + 2)(3x − 1 + x + 4), forme développée ;
3-014 → sens non changé pour a < 0, soustraction (x > 9 pour 3x > 12), inégalité large au lieu de
stricte ; 3-015 → signes inversés, une seule solution, b/a au lieu de −b/a, 0 oublié (v4).

**Le juge, mesuré** (sonde `question:specs`, 2026-10-29) :

- inégalité attendue « x > 4 » : x > 4 juste ; x ⩾ 4, x < 4, x > 9 faux ; 4 < x **mauvaise forme** ;
  x > 12/3 forme non optimale ; `\ge` accepté. Borne attendue −5/2 : −2,5 est en **mauvaise forme** (et
  l'inverse). D'où des bornes entières (v1, v2) ou en fraction **non décimale** (v3) : aucune réponse
  juste ne peut être refusée pour sa forme ;
- ensemble {2,8 ; 1,2} (`answerKind: 'intervalles'`) : ordre inverse et {14/5 ; 6/5} justes, signes
  inversés faux. « x = 3 ou x = −5/2 » n'est **pas** compris (jugé faux) : d'où l'ensemble ;
- factorisée attendue (x + 2)(4x + 3) : ordre inverse juste, forme développée et facteur non réduit en
  mauvaise forme, (x + 2)(4x + 5) faux ; (x + 3)² attendu x² + 6x + 9 : x² + 3x + 3x + 9 en mauvaise forme.

### 9.2 Rangement

Les 4 sur le nœud de leur sous-notion : identités remarquables (ad32128c), factorisation (2c0359a2),
Inéquations : premier degré (3a3a3e35, comme cf796fab), produit nul (17987933). Tags 3-016, 3-054, 3-014,
3-015. Aucun modèle existant déplacé.

### 9.3 Question d'accès

Modèles neufs en brouillon : personne ne lit rien de neuf. Rangement puis publication : les élèves et le
prof de 3e voient 4 modèles publiés de plus. Aucune règle ne change.

### 9.4 Questions à David

1. Valider les 4 modèles (§ 9.1) : points, variations, catégories, niveaux, réponse en inégalité pour 3-014 ?
2. Les 6 modèles de 2de restent à la 2de sans tag 3e (recommandé), ou les taguer aussi 3e (niveaux
   {2, 3}) en plus des modèles neufs ?
3. 3-015 v5 (factoriser puis produit nul, la suite que cite la borne de 3-054) : dans ce modèle, ou pas ?
4. La borne de 3-014 cite la droite graduée avec un crochet : ` ```line ` ne trace pas de demi-droite.
   Le noter comme outil manquant (pour plus tard), sans bloquer le lot ?

### 9.5 Décisions (David, 2026-10-29, « je te suis »)

- Les 4 modèles du § 9.1 validés tels quels, réponse en inégalité pour 3-014.
- Les 6 modèles de 2de restent à la 2de, sans tag 3e.
- 3-015 v5 (factoriser puis produit nul) gardée, au niveau le plus haut du modèle.
- Droite graduée avec crochet : notée comme geste manquant (`couvrir-un-niveau.md` § 3 bis), sans bloquer.

### 9.6 Lot 2 : écrit (2026-10-29)

- `docs/wip/questions/lot-3-2.py` → `scripts/questions/3-lot-2/` (4 JSON) ; `question:specs` : 54 specs vertes,
  3 600 tirages ; `create-questions` en simulation : vert. PR #1959.
- Écart de rendu corrigé : `{{eval:…}}` écrit 2,5 en 5/2 (7x/2 − 63/10) ; la v3 de 3-015 passe par `;d`
  (écriture décimale) et `;d;+` (signe forcé), mesurés.
- Délais : 60 s (identités, inéquation), 90 s (factorisation, produit nul).
- Base locale : 4 brouillons créés (b1e9bc94, 8bf02b12, 1048f256, d4250900). Aperçu admin non joué : la
  session Chrome sur `localhost` n'était pas admin, et s'en déconnecter aurait fermé celle de David
  (cookies partagés entre ports). Énoncés et corrigés relus dans l'aperçu de `question:specs`.

### 9.7 Lot 2 : en prod, rangement (2026-10-29)

- Brouillons créés en prod par David : 18e2afca (Développer (a + b)² et (a − b)²), dcaabf69 (Factoriser avec un
  facteur commun), 24aff7b0 (Résoudre une inéquation ax ⩾ b), 2ab49a6f (Résoudre une équation produit nul) ;
  MCP : brouillons [3], sans nœud ni tag.
- Migration `20261029233000_questions_3_lot2_rangement_tags` (`lot-rangement-3-2.py`, relevé
  `etat-prod-2026-10-29-3e-lot2/`) : chacun sur le nœud de son point. **Écart au § 9.2** : 24aff7b0 va sur
  « Inéquations : premier degré > ax + b < c », nœud du point 3-014 (la garde exige le nœud du point ou sa
  notion ; la notion seule n'est pas acceptée pour un point posé sur une sous-notion).
- Test `questions-3-lot2-rangement-tags` : 19 verts, rouge corps vidé. Cas « tag ajouté » impossible (le
  trigger refuse de taguer un modèle sans nœud), remplacé par un commentaire. `security-auditor` : aucun
  bloquant. #1965 mergée.
- **`db:migrate` bloqué** : collision d'horodatage `20261029213000` (questions_5_lot3, jouée, et
  questions_ce1_lot3_niveaux, non jouée) → `db push` refuse. `--include-all` écarté (doublon de version).
  Session ce1 prévenue (David, 2026-10-29) : renommer sa migration, puis `db:migrate` jouera les deux.

### 9.8 Lot 2 : rangement joué, page à cocher (2026-10-29)

- Migration ce1 renommée en `20261029233100` (#1972, session ce1) ; `db:migrate` lancé par David : 233000 puis
  233100 jouées. MCP : les 4 modèles sur le nœud de leur point, tags 3-016, 3-054, 3-014, 3-015, brouillons
  [3], `updated_at` préservé.
- Page à cocher : https://claude.ai/artifact/KRBQJkNHzZABUFwXrSzYAv (capacité `db`, collection `verdicts`
  vide au départ ; aucune alerte). Rendu relu en vue large ; la vue à 390 px n'a pas pu être forcée.
- Worktree `ubumaths-wt-questions-3` et ses deux branches retirés (#1959, #1965 mergées).
- Relecture (2026-10-29) : 4 verdicts en base, 4 OK, aucun commentaire.

### 9.9 Lot 2 : publié (2026-10-29)

- `publier-lot.ts --dir scripts/questions/3-lot-2 --publier` lancé par David : 4/4 publiés. MCP : 18e2afca,
  dcaabf69, 24aff7b0, 2ab49a6f en `published`.

## 10. Lot 3 (Thalès et trigonométrie, lot 5 du § 4) : phase 0 proposée (2026-10-29)

Relevé MCP du jour : **aucun modèle de géométrie en 5e, 4e ou 3e** (ni Thalès, ni trigonométrie, ni
Pythagore) ; les seuls « trigonométriques » sont de 1re et Terminale (cercle, fonctions). Ce lot est le premier
du cycle 4 en géométrie. Nœuds : 3-022, 3-059, 3-060 sur Théorème de Thalès > calcul de longueurs
(63e3a973) ; 3-055 sur Théorème de Thalès > réciproque (216be680) ; 3-023, 3-061 sur la notion
Trigonométrie du triangle rectangle (8809d4ee). Catégories neuves : niveaux libres.

Outils : ` ```figure ` (variables `{{…}}` acceptées dans le script, comme CP-058), angle droit
`angle(…, marque="carre")`, angle aigu `angle(…)` en arc, longueurs par `texte(…)` ; case choix
(` ```choix `, en prod depuis v0.55.0) ou case nombre. Figures **à l'échelle** : forme de base fixe par
variation, M et N placés au rapport tiré (proposé). Lettres tirées parmi quelques jeux (A B C M N ;
R S T U V ; E F G K L) et deux ou trois orientations par configuration (proposé).

### 10.1 Modèles neufs (6, un par point)

| Point | Modèle (catégorie, niveau)                                                        | Variations                                                                                                                                                                                                                                                                       | Réponse                                             |
| ----- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 3-022 | Reconnaître une configuration de Thalès (Géométrie / Thalès / Configurations, 1)  | 1) (MN) // (BC) donné : emboîtés ou papillon ? ; 2) quels triangles ? (AMN et ABC ; distracteurs AMN et MBC, AMB et ANC, MNB et MNC) ; 3) pour appliquer le théorème dans AMN et ABC, quelles droites doivent être parallèles ?                                                  | choix                                               |
| 3-059 | Écrire l'égalité de Thalès (Géométrie / Thalès / Égalité des rapports, 1)         | 1) emboîtés ; 2) papillon ; 3) petit triangle au dénominateur (AB/AM = AC/AN = BC/MN). Distracteurs : AM/MB = AN/NC = MN/BC, un rapport renversé, sommets croisés (AM/AC = AN/AB = MN/BC)                                                                                        | choix (4 égalités)                                  |
| 3-060 | Calculer une longueur avec Thalès (Géométrie / Thalès / Calculer une longueur, 1) | 1) emboîtés, côté parallèle MN ; 2) emboîtés, longueur sur un côté (AN) ; 3) papillon ; 4) longueur du grand triangle (AB, par une division) ; 5) MB donné au lieu de AM (AB = AM + MB d'abord). Longueurs en cm, entières ou au dixième, résultat décimal exact (≤ 2 décimales) | case « MN = ? cm »                                  |
| 3-055 | Réciproque et contraposée de Thalès (Géométrie / Thalès / Réciproque, 1)          | Alignement dans le même ordre dit dans l'énoncé ; 1) emboîtés, rapports égaux ou non (tirés) ; 2) papillon, idem. Rapports différents mais proches (0,6 et 0,625), décimaux simples                                                                                              | choix « Oui » / « Non », non mélangé (CP-058)       |
| 3-023 | Écrire cos, sin ou tan (Géométrie / Trigonométrie / Lignes trigonométriques, 1)   | Triangle rectangle, angle droit codé, angle aigu marqué ; 1) cos ; 2) sin ; 3) tan ; 4) l'une des trois, sur l'autre angle aigu. Distracteurs : les trois autres rapports de côtés                                                                                               | choix (4 fractions de côtés)                        |
| 3-061 | Calculer une longueur ou un angle (Géométrie / Trigonométrie / Calculer, 1)       | 1) longueur au numérateur (AB = BC × cos B) ; 2) longueur au dénominateur (BC = AB ÷ cos B) ; 3) avec tan ; 4) angle (cos, sin ou tan connu par deux côtés). Angles en degrés, entiers de 20° à 70° ; longueurs au dixième                                                       | case ; longueur arrondie au dixième, angle au degré |

`testSpecs` d'erreurs typiques : 3-060 → rapport renversé (MN = BC × AB/AM), AM + MB oublié (v5), produit en
croix faux ; 3-055 → Oui quand les rapports diffèrent ; 3-061 → mauvaise ligne (sin au lieu de cos), produit au
lieu du quotient (v2), arrondi au degré pour une longueur, valeur non arrondie.

**À mesurer à l'écriture** : `cos` de `eval:` en radians (passer par `cos(a*pi/180)` si besoin), `round` y est ;
le juge sur un arrondi (4,6 attendu : 4,60 ? 4,58 ?) ; une case précédée d'un nom de segment.

### 10.2 Rangement

Chacun sur le nœud de son point (ci-dessus), tags 3-022, 3-059, 3-060, 3-055, 3-023, 3-061.

### 10.3 Question d'accès

Modèles neufs en brouillon : personne ne lit rien de neuf. Rangement puis publication : les élèves et le
prof de 3e voient 6 modèles publiés de plus. Aucune règle ne change.

### 10.4 Questions à David

1. Valider les 6 modèles du § 10.1 (points, variations, catégories, formes de réponse) ?
2. Figures à l'échelle (rapports vrais) plutôt qu'un croquis « la figure n'est pas à l'échelle » ?
3. Lettres tirées parmi quelques jeux, plutôt que toujours A, B, C, M, N ?
4. 3-055 : choix « Oui » / « Non » seul (la raison dans le corrigé), ou la raison dans le choix
   (« Non, car AM/AB ≠ AN/AC ») ?
5. Pythagore (4e) n'a aucun modèle en prod : le signaler à la session 4e, sans rien faire ici ?

### 10.5 Décisions (David, 2026-10-29, « je te suis »)

- Les 6 modèles du § 10.1 validés tels quels.
- Figures à l'échelle ; lettres tirées parmi trois jeux ; 3-055 en « Oui » / « Non », la raison dans le corrigé.
- Pythagore (4e, aucun modèle en prod) : à signaler à la session 4e, rien ici.

### 10.6 Lot 3 : écrit (2026-10-29)

- `docs/wip/questions/lot-3-3.py` → `scripts/questions/3-lot-3/` (6 JSON, 24 variations, 51 specs) ;
  `question:specs` vert, `audit-question-draws` 0 défaut (2 400 tirages), `create-questions` en simulation vert.
- Figures dessinées hors appli (`figure-scene` + `figure-svg`, 6 tirages par variation) puis dans l'aperçu
  admin : à l'échelle, deux orientations, trois jeux de lettres.
- **Sonde du juge** (2026-10-29) : `\pi` avec antislash dans `eval:` ; arrondi attendu en `;d` (sinon 23/5) ;
  4,6 juste, 4,60 forme non optimale, 23/5 mauvaise forme, 4,5 faux. Tirages loin d'un demi-dixième.
- **Pièges trouvés** : une variable ne peut pas valoir une lettre (« A » relue comme variable) → lettres
  écrites dans le texte par `{{if:s==0|A|}}…` bout à bout ; AN tiré en fraction (`\dfrac`) cassait la
  figure de 3-055 → `;d` ; C hors fenêtre pour un angle de 70° → fenêtre 0..8,8 (3-061), 0..6,5 (3-023) ;
  `\textcolor` hors formule remplacé par du gras.
- Base locale : 6 brouillons (68bdee32, 1cb702fe, 96e60c92, ae4c93a4, 92af8fa2, 06b064ce). Aperçu admin joué
  sur `127.0.0.1:5176` (cookies séparés de `localhost` : la session de David n'est pas touchée) : 3-060 v5
  (MN = 4, juste), 3-023 v3 (tan, choix mélangé, juste).
- Délais : 45 s (configurations, lignes trigonométriques), 60 s (égalité), 120 s (calcul, réciproque),
  150 s (trigonométrie, calcul).

### 10.7 Lot 3 : en prod, rangement (2026-10-29)

- Brouillons créés en prod par David : 16478dab (Reconnaître une configuration de Thalès), 034e6b74 (Écrire
  l'égalité de Thalès), f55d07b0 (Calculer une longueur avec Thalès), 37c13d51 (Réciproque et contraposée de
  Thalès), dbd5debf (Écrire cos, sin ou tan d'un angle), 57c73be1 (Calculer une longueur ou un angle) ; MCP :
  brouillons [3], sans nœud ni tag.
- Migration `20261030002300_questions_3_lot3_rangement_tags` (`lot-rangement-3-3.py`, relevé
  `etat-prod-2026-10-29-3e-lot3/`, lu par `releve-prod-3.ts`) : chacun sur le nœud de son point (§ 10.2).
  Horodatage pris après `20261030001000` (dictionnaire), le plus récent de toutes les branches.
- Test `questions-3-lot3-rangement-tags` : 19 verts ; corps de la migration vidé : 8 rouges.
- PR #1984. `security-auditor` : aucun bloquant (diff avec le lot 2 : données et compteurs seuls ; prod mesurée : 6 brouillons
  sans nœud ni tag, points actifs, nœuds uniques). Point faible relevé : la notion « Trigonométrie du triangle
  rectangle » a deux sous-notions sans point (« calcul de longueurs », « calcul d'angles ») ; 57c73be1 mêle
  longueurs et angle → gardé sur la notion (§ 10.2), à confirmer par David.

### 10.8 Lot 3 : migration jouée (2026-10-29)

- `pnpm db:migrate --include-all` lancé par David depuis le dépôt principal : `20261030002300` (lot 3) et
  `20261030004900` (`questions-2de`, jouée par moi selon la règle du 2026-10-27) inscrites en prod.
- Vérifié au MCP : 16478dab (3-022), 034e6b74 (3-059), f55d07b0 (3-060) sur Thalès > calcul de longueurs ;
  37c13d51 (3-055) sur Thalès > réciproque ; dbd5debf (3-023), 57c73be1 (3-061) sur la notion
  Trigonométrie du triangle rectangle ; tous `draft`, un tag chacun. Session `questions-2de` prévenue.

### 10.9 Lot 3 : relu et publié (2026-10-30)

- Page à cocher : https://claude.ai/artifact/BEU7ZroDY1kdeLsw9i8jiY (capacité `db`, collection `verdicts`
  vide au départ ; aucune alerte sur les 6 fiches).
- Relecture : 6 verdicts en base, 6 OK, aucun commentaire. 57c73be1 gardé sur la notion trigonométrie (OK de David).
- `publier-lot.ts --dir scripts/questions/3-lot-3 --publier` lancé par David : 6/6 publiés. MCP : 16478dab,
  034e6b74, f55d07b0, 37c13d51, dbd5debf, 57c73be1 `published`, niveau 1.

## 11. Lot 4 (fonctions, lot 3 du § 4) : phase 0 proposée (2026-10-30)

Relevé MCP du jour : les 13 points du thème n'ont **aucun modèle**. Patrons en prod, en 2de : 17809937
(antécédents lus sur une courbe), a55ad3b4 (inéquation f(x) < k, droite), 9c4f6b4f (x² = k) — ` ```courbe `
à variables tirées, droite y = k en pointillé, points nommés, partie solution repassée en vert dans le corrigé.
Réponse en inégalité « x ⩽ 3 » mesurée au lot 2 (§ 9.6) ; ` ```line ` ne trace pas de demi-droite.

13 points, c'est trop pour un lot (3 à 10) : **deux lots proposés**, 4a puis 4b.

Nœuds (prod) : 3-041, 3-064, 3-043, 3-042, 3-065 → Fonctions affines > fonction linéaire (144df13a) ;
3-045, 3-067 → Fonctions affines > coefficient directeur et ordonnée à l'origine (e3f91bf9) ; 3-040 →
Généralités > images et antécédents (233d6b1b) ; 3-039 → notion Généralités sur les fonctions (acb6a17e) ;
3-046 → Fonction carré > définition et courbe (9f59bc2b) ; 3-053 → Fonction carré > x² = k, x² < k (b43e40ab) ;
3-057 → Inéquations : premier degré > ax + b < c (eab18112) ; 3-037 → Proportionnalité > Situations de
proportionnalité > caractérisation (026bc8f6).

### 11.1 Lot 4a : vocabulaire, linéaire, lectures sur une droite (7 modèles, un par point)

| Point | Modèle (catégorie, niveau)                                                                | Variations                                                                                                                                                                                                                                                               | Réponse                            |
| ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 3-064 | Calculer une image par une fonction linéaire (Fonctions / Fonctions linéaires / Image, 1) | 1) f(x) = ax, a et x entiers (a de −9 à 9, ≠ 0, ±1) ; 2) x négatif ; 3) a décimal (1,5 ; −0,4) ; 4) notation f : x ↦ ax                                                                                                                                                  | case nombre                        |
| 3-041 | Reconnaître une fonction linéaire (Fonctions / Fonctions linéaires / Reconnaître, 1)      | 1) quatre expressions, une linéaire (3x ; distracteurs 3x + 1, x², 3/x, x + 3) ; 2) écrite autrement (x/4, −x, 0,5x : laquelle est linéaire ?) ; 3) un repère, quatre tracés nommés d₁…d₄ (droite par l'origine, droite qui n'y passe pas, parabole, droite horizontale) | choix                              |
| 3-043 | Linéaire et proportionnalité (Fonctions / Fonctions linéaires / Proportionnalité, 1)      | 1) tableau de proportionnalité → coefficient a ; 2) f linéaire, f(2) = 6 → a ; 3) situation (prix au kg, vitesse constante) → expression f(x) = ax                                                                                                                       | case nombre ; case expression (v3) |
| 3-039 | Formule, tableau, graphique (Fonctions / Généralités / Représentations, 1)                | 1) formule → compléter une case d'un tableau de valeurs ; 2) graphique → valeur du tableau ; 3) tableau → quelle formule (choix entre 4). Fonctions simples : 2x − 1, x² + 1, 10 − x                                                                                     | case ; choix (v3)                  |
| 3-040 | Image et antécédent (Fonctions / Généralités / Image et antécédent, 1)                    | 1) image lue dans un tableau ; 2) antécédent lu dans un tableau ; 3) image lue sur une courbe ; 4) antécédent(s) lus sur une courbe (un ou deux, le nombre de cases le dit) ; 5) image par une expression simple (2x + 1, x² − 3)                                        | case nombre (cases)                |
| 3-045 | Lire l'ordonnée à l'origine (Fonctions / Fonctions affines / Lecture graphique, 1)        | droite tracée, b entier de −5 à 5 ; 1) a > 0 ; 2) a < 0 ; 3) fonction linéaire (b = 0)                                                                                                                                                                                   | case nombre                        |
| 3-067 | Lire le coefficient directeur (Fonctions / Fonctions affines / Lecture graphique, 1)      | droite passant par des nœuds du quadrillage ; 1) a entier positif ; 2) a entier négatif ; 3) a = 1/2, 1/3, −2/3 (fraction)                                                                                                                                               | case nombre                        |

Erreurs typiques (`testSpecs`) : 3-064 → a + x, signe ; 3-043 → a renversé (2/6) ; 3-040 → image et antécédent
inversés, un seul antécédent sur deux ; 3-045 → abscisse à l'origine au lieu de l'ordonnée ; 3-067 → Δx/Δy,
signe oublié pour a < 0.

### 11.2 Lot 4b : résolutions graphiques, fonction carré, Thalès (6 modèles)

| Point | Modèle (catégorie, niveau)                                                                          | Variations                                                                                                                                                                               | Réponse                  |
| ----- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 3-042 | Résoudre f(x) = k sur un graphique (Fonctions / Fonctions linéaires / Résolution graphique, 1)      | droite par l'origine tracée ; 1) a > 0 ; 2) a < 0 ; solution entière                                                                                                                     | case « x = ? »           |
| 3-065 | Résoudre f(x) ⩽ k sur un graphique (même catégorie, 1)                                              | les quatre sens ; 1) a > 0 ; 2) a < 0 (le sens change)                                                                                                                                   | case inégalité « x ⩽ 3 » |
| 3-057 | Résoudre ax ⩾ b graphiquement (Calcul littéral / Inéquations / Résolution graphique, 1)             | énoncé « 3x ⩾ 6 », droite y = 3x et y = 6 tracées ; 1) a > 0 ; 2) a < 0                                                                                                                  | case inégalité           |
| 3-046 | La courbe de la fonction carré (Fonctions / Fonction carré / Courbe, 1)                             | 1) laquelle des quatre courbes représente x ↦ x² (distracteurs −x², x² + 2, droite) ; 2) compléter le tableau de valeurs (x de −3 à 3) ; 3) le point (a ; b) est-il sur la courbe ?      | choix ; case             |
| 3-053 | Résoudre x² = a graphiquement (Fonctions / Fonction carré / x² = a, 1)                              | parabole et droite y = a tracées ; 1) a carré parfait (4, 9) : deux cases ; 2) a = 0 : une solution ; 3) a < 0 : aucune (choix « aucune solution »)                                      | cases ; choix (v3)       |
| 3-037 | Proportionnalité, graphique et Thalès (Proportionnalité / Caractérisation / Graphique et Thalès, 1) | droite par l'origine, A(2 ; 3) et B d'abscisse 6 dessus, projetés sur l'axe en pointillé (triangles emboîtés) ; 1) quelle égalité de Thalès (choix) ; 2) ordonnée de B par Thalès (case) | choix ; case             |

Erreurs typiques : 3-065 / 3-057 → sens non changé pour a < 0, inégalité large au lieu de stricte ; 3-053 → une
seule solution (oubli de −√a), « −2 » pour a < 0.

### 11.3 Rangement

Chacun sur le nœud de son point (relevé ci-dessus), un tag par modèle.

### 11.4 Question d'accès

Brouillons : personne ne lit rien de neuf. Rangement puis publication : élèves et prof de 3e voient 7, puis 6
modèles publiés de plus. Aucune règle ne change.

### 11.5 Questions à David

1. Deux lots (4a : 7 modèles, puis 4b : 6) plutôt qu'un seul de 13 ?
2. Valider les modèles du § 11.1 (et du § 11.2 pour plus tard) : points, variations, formes de réponse ?
3. 3-057 et 3-065 se ressemblent : deux modèles (« 3x ⩾ 6 » contre « f(x) ⩽ 6 »), comme proposé ?
4. 3-037 : la forme proposée (Thalès dans le graphique d'une proportionnalité) te convient ?

### 11.6 Décisions (David, 2026-10-30, « je te suis »)

- Deux lots : 4a (§ 11.1, 7 modèles) d'abord, 4b (§ 11.2, 6) ensuite.
- 4a validé, une retouche : 3-067, le coefficient en fraction passe au **niveau 2** (variation à part des entiers).
- 3-057 et 3-065 : deux modèles. 3-037 : forme proposée gardée.
- Dossier `../ubumaths-wt-questions-3` (caches seuls, 36 Ko) supprimé ; worktree neuf au même nom,
  branche `content/questions-3-lot4a`.
- Pythagore 4e : note ajoutée en fin de `questions-4-progress.md` (commit direct sur `main`).
- Après coup, à comparer plus tard (David) : les modèles de 2de ae0ad163 (ordonnée à l'origine) et 09f0c9ec
  (coefficient directeur), images fixes, restent tels quels ; 3-045 et 3-067 ont leurs modèles neufs.
- Niveau par modèle, pas par variation : 3-067 = **deux modèles** (entier, niveau 3 ; fraction, niveau 4) → lot 4a
  = 8 modèles. « Fonctions affines › Lecture graphique » a déjà le niveau 1 (2de) → 3-045 au niveau 2.

### 11.7 Lot 4a : écrit (2026-10-30)

- `docs/wip/questions/lot-3-4a.py` → `scripts/questions/3-lot-4a/` (8 JSON, 27 variations, 63 specs) ;
  `create-questions` en simulation vert, `audit-question-draws` 0 défaut (300 tirages), `sonde-courbes` 0 problème.
- **Juge mesuré** : une moitié attendue en 1/2 refuse 0,5 (« mauvaise forme ») → 3-067 fraction en **tiers
  seulement** (1/3, 2/3, −1/3, −2/3) ; « 2,5x » accepté pour f(x) = 2,5x, x/2,5 et 2,5 + x refusés.
- **Pièges trouvés** : `answerKind: 'intervalles'` en `shared` s'applique à toutes les cases (nombres illisibles)
  → sur la seule case des antécédents ; « 1x » quand b = 1 dans un choix de formule → b ⩾ 2 ; **tableau avec une
  case** : MathLive ne connaît pas `\hline` (écrit en clair, case vide en trop) → `$\begin{array}{|l|c|…|}` sans
  `\hline`, forme de 4b080eed.
- Base locale : 8 brouillons. Aperçu admin sur `127.0.0.1:5176` (serveur lancé avec `--host 127.0.0.1`) :
  3-041 v3 (quatre tracés, d₃ juste), 3-039 v2 (case dans le tableau, −11 faux, 21 attendu affiché).
- Délais : 45 s (image, reconnaître, ordonnée), 60 s (proportionnalité, image et antécédent, coefficient
  entier), 75 s (représentations, coefficient fraction).

### 11.8 Lot 4a : en prod, brouillons (2026-10-30)

- `create-questions --publier` lancé par David : 8 brouillons, vérifiés au MCP (`draft`, sans nœud ni tag) :
  81dda1bd-cd4f-4055-9427-072d8f7f513c (image, 3-064) · 0612be84-01ce-42a3-aa33-2e2051502450 (reconnaître, 3-041) ·
  45247528-23f3-44cc-860e-afe643abaf2b (proportionnalité, 3-043) · 6ad254b4-69c3-49db-9541-fa921964cefc
  (représentations, 3-039) · d820232a-62a0-422f-9c08-33b279258af1 (image et antécédent, 3-040) ·
  c64028b0-2001-4320-a02b-5d0692089d1a (ordonnée, 3-045, niv. 2) · 0d0e88f5-3825-418f-b12b-d6e541fbecba
  (coefficient entier, 3-067, niv. 3) · b9771108-fe6a-4f37-8b49-671b5627f5d3 (coefficient fraction, 3-067, niv. 4).

### 11.9 Lot 4a : rangement écrit (2026-10-30)

- Relevé `etat-prod-2026-10-30-3e-lot4a/` (`releve-prod-3.ts`, colonne `multiple_answers` retirée de la
  lecture : supprimée en #2009) : 8 brouillons, sans nœud ni tag, niveaux 1-1-1-1-1-2-3-4 conformes au § 11.8.
- Migration `20261030162000_questions_3_lot4a_rangement_tags` (`lot-rangement-3-4a.py`) : chacun sur le nœud
  de son point (§ 11), 8 tags posés (3-067 pour 0d0e88f5 et b9771108). Horodatage pris après `20261030161000`
  (ce2 lot 4), le plus récent de toutes les branches.
- Test `questions-3-lot4a-rangement-tags` : 19 verts ; corps de la migration vidé : 8 rouges.
- PR #2024.
- `security-auditor` : aucun bloquant (SQL et rollback identiques au lot 3 hors données ; prod mesurée).
  Relevé : commentaire « admin seul » inexact (le prof lit aussi les brouillons), existant.

### 11.10 Lot 4a : migration jouée, page à cocher (2026-10-30)

- #2024 mergée ; `pnpm db:migrate --include-all` lancé par David. MCP : `20261030162000` inscrite ;
  81dda1bd (3-064), 0612be84 (3-041), 45247528 (3-043) sur Fonctions affines > fonction linéaire ;
  6ad254b4 (3-039) sur la notion Généralités sur les fonctions ; d820232a (3-040) sur Généralités >
  images et antécédents ; c64028b0 (3-045), 0d0e88f5 et b9771108 (3-067) sur Fonctions affines >
  coefficient directeur et ordonnée à l'origine ; tous `draft`, un tag chacun, niveaux inchangés.
- Page à cocher : https://claude.ai/artifact/JgBMF94tqmj3AaRtu1ALhJ (capacité `db`, collection `verdicts`
  vide au départ ; aucune alerte sur les 8 fiches).

### 11.11 Lot 4a : relu et publié (2026-10-30)

- Relecture : 8 verdicts en base, 8 OK, aucun commentaire.
- `publier-lot.ts --dir scripts/questions/3-lot-4a --publier` lancé par David : MCP, les 8 modèles
  `published`, niveaux 1-1-1-1-1-2-3-4 inchangés.

### 11.12 Lot 4b : écrit (2026-10-30)

- `docs/wip/questions/lot-3-4b.py` → `scripts/questions/3-lot-4b/` (6 JSON, 14 variations, 44 specs) ;
  `create-questions` en simulation vert, `sonde-courbes` 0 problème (300 tirages par modèle),
  `audit-question-draws` ✅ partout.
- Niveaux (relevé MCP du jour) : « Fonctions linéaires › Résolution graphique » neuve → 3-042 niveau 1,
  3-065 niveau 2 ; « Inéquations › Résolution graphique », « Fonction carré › Courbe », « Fonction carré ›
  x² = a », « Proportionnalité › Caractérisation › Graphique et Thalès » neuves → niveau 1.
- **Pièges trouvés** : un `{{eval}}` fractionnaire s'écrit `\dfrac` → illisible dans `points:` d'un
  ` ```courbe ` (et une virgule décimale casserait la liste) : calcul brut `{{q}}*{{r}}/{{p}}` ; nom de tracé
  `\Delta` refusé (formes admises : `C_f`, `\mathcal{X}`) → `\mathcal{H}` ; le bloc ne trace pas de segment :
  projections de 3-037 en verticales `asymptotes: x=… ; x=…` ; une droite `sur [0 ; …]` porte un point plein
  au bout → droite entière.
- 3-053 v1 : deux cases « la plus petite d'abord » (forme validée) ; 3-046 v1 : droite y = ±x (y = 2x coupait
  la parabole en (2 ; 4), noms C₁ et C₃ superposés) ; 3-037 : B à 2 unités au moins de A.
- Base locale : 6 brouillons. Aperçu admin (`127.0.0.1:5176`) : 3-065 corrigé (partie verte, x ⩾ 3),
  3-046 v1 (quatre tracés) et v2 (tableau à case), 3-053 v1 (deux cases) et v2, 3-037 v1 (figure, choix,
  corrigé) et v2. Juge : couvert par les specs (la saisie MathLive ne passe pas par l'outil navigateur).
- Délais : 45 s (f(x) = k), 60 s (inéquations, courbe carré, x² = a), 75 s (Thalès).

### 11.13 Lot 4b : fichiers mergés (2026-10-30)

- #2029 mergée (CI verte). Attendu : `create-questions --publier` lancé par David.

### 11.14 Lot 4b : en prod, brouillons (2026-10-30)

- `create-questions --publier` lancé par David : 6 brouillons, vérifiés au MCP (`draft`, sans tag, niveaux
  1-2-1-1-1-1) : eb04ebf7-8476-4c01-8e6b-25fc488a1acb (f(x) = k, 3-042) · 77500c81-ffb6-4404-a096-89476d219565
  (f(x) ⩽ k, 3-065, niv. 2) · 320f5ac7-b16a-48a7-b136-704d62854138 (ax ⩾ b, 3-057) ·
  7407f328-e770-49da-8bc8-38cdf6081b6d (courbe carré, 3-046) · 8cb2cdfd-d905-4e37-bff4-cceeb774fdc9
  (x² = a, 3-053) · 19889310-745e-4dba-b236-38b3f813e71d (Thalès, 3-037).
- Nœuds d'arrivée (§ 11) : 3-042, 3-065 → Fonctions affines > fonction linéaire ; 3-057 → Inéquations :
  premier degré > ax + b < c ; 3-046 → Fonction carré > définition et courbe ; 3-053 → Fonction carré >
  x² = k, x² < k ; 3-037 → Proportionnalité > Situations de proportionnalité > caractérisation.

### 11.15 Lot 4b : rangement écrit (2026-10-30)

- Relevé `etat-prod-2026-10-30-3e-lot4b/` (6 modèles `draft`, grades `['3']`, sans nœud ni tag) ;
  `lot-rangement-3-4b.py` (copie du 4a) écrit `20261030162300_questions_3_lot4b_rangement_tags.sql`
  (`20261030162200` pris par la branche ce1 lot 5 bis) et la fixture.
- `questions-3-lot4b-rangement-tags.test.ts` : 12 rouges sans la migration, 19 verts avec.
- #2033 mergée (CI verte, `security-auditor` sans finding). Attendu : `db:migrate` lancé par David.

### 11.16 Lot 4b : migration jouée, page à cocher (2026-10-30)

- `20261030162300` jouée en prod, emportée par le `db:migrate` d'une autre session (la simulation depuis
  `origin/main` la disait déjà jouée). MCP : les 6 modèles à leur nœud (§ 11.14), un tag chacun (3-042,
  3-065, 3-057, 3-046, 3-053, 3-037), `draft`, `updated_at` inchangé.
- Page à cocher : https://claude.ai/artifact/SXKVm8GkhzwBvQZ2tbfJqd (capacité `db`, collection `verdicts`
  vide au départ ; 14 exemples, aucune alerte sur les 6 fiches).

### 11.17 Lot 4b : relu (2026-10-31)

- Relecture : 6 verdicts en base, 6 OK, aucun commentaire. Attendu : `publier-lot.ts --publier` lancé par David.

### 11.18 Lot 4b : publié (2026-10-31)

- `publier-lot.ts --dir scripts/questions/3-lot-4b --publier` lancé par David : MCP, les 6 modèles
  `published`, niveaux 1-2-1-1-1-1 et grades `['3']` inchangés. Lot 4 (fonctions) clos.

## 12. Lot 5 (pourcentages, probabilités, statistiques, lot 4 du § 4) : phase 0 proposée (2026-10-31)

Relevé MCP du jour : les 8 points n'ont **aucun modèle**. Proches, en 4e (publiés) : ccb51039
« Augmentation et coefficient multiplicateur » (4-057) et 76f5f143 « Diminution et coefficient
multiplicateur » (4-080) — même contenu que 3-036 / 3-063 (t % ↔ × (1 ± t/100), nouveau prix par le
coefficient) ; b2908d52 médiane en série brute (4-040) ; b28ed4fa deux épreuves, calcul (4-049, sans nœud) ;
17a469bb fluctuation, bb4dc318 fréquences et probabilités (` ```simulation `) ; abd1eeb7 contraire, réunion,
intersection (4-047). Convention des quartiles (3-029, décision c4-2) = celle du module (`statistics/`,
Q1 = plus petite valeur dont l'effectif cumulé atteint 25 %). Outils : ` ```effectifs ` (`lignes: effectifs ;
effectifs cumulés`, `masquer:` une case), ` ```barres `, ` ```simulation ` (modes `tirages`, `moyenne`),
` ```probtree `.

Nœuds (prod) : 3-036, 3-063 → Proportionnalité > Évolutions > variations en pourcentage (4eb20dcf) ;
3-033 → Probabilités > Expériences aléatoires > événements (bf76cfc3) ; 3-028 → Statistiques > Représenter
des données > fréquences cumulées (765e86f9) ; 3-056 → Indicateurs > médiane (97ed51ec) ; 3-029 →
Indicateurs > quartiles (afbcd648) ; 3-034, 3-035 → Expériences aléatoires > fréquences (fee494e2).

### 12.1 Pourcentages : 3-036, 3-063

**Recommandé : aucun modèle neuf.** ccb51039 et 76f5f143 passent en grades `['4', '3']` et reçoivent le tag
3-036 / 3-063 en plus de 4-057 / 4-080 (précédent : 5c092e43, tableur, 4-045 et 3-032). Variante si refusé :
deux modèles de 3e (même forme, taux décimaux 2,5 % et taux > 100 %, retrouver le taux depuis × 0,85).

### 12.2 Modèles neufs (6, un par point)

| Point | Modèle (catégorie)                                                                    | Variations                                                                                                                                                                                                                                                                                                                                                                        | Réponse                           |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 3-033 | P(A ∪ B) et P(A ∩ B) (Probabilités / Évènements / Réunion et intersection)            | 1) P(A), P(B), P(A ∩ B) donnés → P(A ∪ B) ; 2) P(A ∪ B), P(A), P(B) donnés → P(A ∩ B) ; 3) équiprobabilité : dé à 12 faces ou urne, A et B décrits (« pair », « multiple de 3 ») → P(A ou B) en comptant les cas ; 4) « ou exclusif » : P(A ou B, mais pas les deux) = P(A ∪ B) − P(A ∩ B)                                                                                        | case nombre (fraction ou décimal) |
| 3-028 | Effectifs cumulés croissants (Statistiques / Effectifs cumulés / Calculer, 1)         | ` ```effectifs ` (notes, pointures…, 5 à 7 valeurs) ; 1) une case de la ligne des cumulés masquée ; 2) « combien ont au plus k ? » ; 3) « combien ont au moins k ? » (total − cumulé précédent)                                                                                                                                                                                   | case nombre                       |
| 3-056 | Médiane d'une série à effectifs (Statistiques / Indicateurs / Médiane à effectifs, 1) | 1) tableau d'effectifs, effectif total impair ; 2) diagramme en barres, total impair ; 3) total pair, les deux valeurs centrales égales (médiane unique, pas d'intervalle à accepter)                                                                                                                                                                                             | case nombre                       |
| 3-029 | Quartiles d'une série à effectifs (Statistiques / Indicateurs / Quartiles, 1)         | 1) tableau d'effectifs → Q1 ; 2) tableau → Q3 ; 3) diagramme en barres → Q1 et Q3 (deux cases) ; effectif total tiré pour que N/4 tombe juste ou non                                                                                                                                                                                                                              | case(s) nombre                    |
| 3-034 | Simuler deux épreuves indépendantes (Probabilités / Simulation / Deux épreuves, 1)    | 1) quelle simulation pour la somme de deux dés (choix : « deux nombres entre 1 et 6, additionnés » contre « un nombre entre 2 et 12 ») ; 2) somme de deux dés simulée (` ```simulation `, 1 000 tirages) + tableau à double entrée → probabilité de la somme k (case) ; 3) deux pièces, arbre (` ```probtree `) et fréquence simulée de « deux Pile » : 1/4, 1/3 ou 1/2 ? (choix) | choix ; case                      |
| 3-035 | Stabilisation des fréquences (Probabilités / Simulation / Stabilisation, 1)           | 1) ` ```simulation ` en mode `moyenne` (fréquence de Pile au fil des lancers) → vers quelle valeur elle se stabilise (choix) ; 2) tableau des fréquences pour 10, 100, 1 000, 10 000 lancers → laquelle estime le mieux la probabilité (choix) ; 3) punaise lancée 5 000 fois, effectif donné → estimation de la probabilité (case)                                               | choix ; case                      |

Erreurs typiques (`testSpecs`) : 3-033 → P(A) + P(B) sans retrancher P(A ∩ B) ; 3-028 → l'effectif au lieu du
cumulé, « au moins k » lu comme « au plus k » ; 3-056 → la valeur la plus fréquente, la valeur du milieu du
tableau (sans les effectifs), la moyenne ; 3-029 → la médiane de la demi-série (convention de calculatrice) ;
3-034 → 1/11 (sommes tenues pour équiprobables) ; 3-035 → la fréquence des 10 premiers lancers.

### 12.3 Rangement

Chacun sur le nœud de son point (relevé ci-dessus), un tag par modèle ; ccb51039 / 76f5f143 (si § 12.1) :
grades et tag dans la même migration.

### 12.4 Question d'accès

Brouillons : personne ne lit rien de neuf. Rangement puis publication : élèves et prof de 3e voient 6 modèles
publiés de plus, et 2 de 4e (§ 12.1) ; la 4e ne perd rien. Aucune règle ne change.

### 12.5 Questions à David

1. § 12.1 : ccb51039 et 76f5f143 partagés avec la 3e (grades 4 et 3, deux tags), plutôt que deux modèles neufs ?
2. Valider les modèles du § 12.2 : points, variations, formes de réponse ?
3. 3-056 v3 : effectif pair avec valeurs centrales égales (médiane unique), plutôt que d'accepter tout
   l'intervalle comme en 4e (4-040) ?
4. 3-034 et 3-035 sur le nœud « fréquences » (collège), plutôt que 3-034 sur « Probabilités conditionnelles
   > épreuves indépendantes successives » (celui de la 1re) ?

### 12.6 Décisions (David, 2026-10-31, « je valide » les recommandations)

- § 12.1 : ccb51039 et 76f5f143 partagés avec la 3e (grades `['4', '3']`, tags 3-036 / 3-063 en plus),
  dans la migration de rangement ; pas de modèle neuf.
- § 12.2 validé ; 3-033 en probabilités décimales à deux chiffres.
- 3-056 v3 : effectif pair, aucun effectif cumulé égal à N/2 (médiane unique).
- 3-034 et 3-035 sur Expériences aléatoires > fréquences.

### 12.7 Lot 5 : écrit (2026-11-01)

- `docs/wip/questions/lot-3-5.py` → `scripts/questions/3-lot-5/` (6 JSON, 19 variations, 50 specs) ;
  `create-questions` en simulation vert. Branche `content/questions-3-lot5`.
- **Écarts au § 12.2** (outil) : ` ```simulation ` en mode `moyenne` écrit « espérance » (1re) et donne la
  valeur cherchée → 3-035 lit un **tableau de fréquences** (10 à 10 000 lancers, tirées autour de p) ;
  3-034 v2 et v3 donnent l'effectif simulé dans l'énoncé (choix : 1/4 contre 1/3, m/36 contre 1/11).
- **Juge mesuré** : réponse attendue décimale (`0{,}{{u}}`) → la fraction juste est refusée (`bad_form`) ;
  attendue en fraction + `acceptDecimal` → les deux acceptées. Corrigé écrit en décimal, comme l'énoncé.
- `audit-question-draws` : « nombres juxtaposés » sur chaque tirage des blocs ` ```effectifs ` / ` ```barres `
  = **faux positif** (son motif lit le saut de ligne entre `= 2` et `1 = 7`). Remplacé par une sonde
  (scratchpad) : 300 tirages par variation, blocs parsés, réponse attendue contre `summarizeTable`
  (médiane, Q1, Q3 du module) et contre les cumulés : 0 défaut.
- Base locale : 6 brouillons. Aperçu admin (`127.0.0.1:5178`) : 3-028 v1 (case masquée), 3-029 v2 (corrigé,
  quarts écrits 29,25 et non 117/4), 3-035 v2 (tableau, choix), 3-034 v3 (choix, corrigé). Saisie MathLive
  hors de portée de l'outil navigateur : le juge est couvert par les specs.

### 12.8 Lot 5 : fichiers mergés (2026-11-01)

- #2049 mergée (CI verte). Attendu : `create-questions --publier` lancé par David.

### 12.9 Lot 5 : en prod, rangement écrit (2026-11-01)

- `create-questions --publier` lancé par David (depuis le dépôt principal, après un `pull` : le premier essai
  n'y trouvait pas le dossier) : 6 brouillons, vérifiés au MCP (`draft`, grades `['3']`, niveau 1, sans nœud
  ni tag) : cd2ffd9b-287b-4409-9384-9060b5ad3fe0 (3-033) · 6acde723-b599-40ec-99b5-eb22f3c578a4 (3-028) ·
  96992ea8-a78f-433d-90e4-5824ed7afb45 (3-056) · acaa7317-3003-4b1a-bde4-ac95bcd3016c (3-029) ·
  c7928fc7-836c-4422-9972-ec3d0b567af1 (3-034) · 302655b9-3be3-485c-9d68-0a5fcf49dad4 (3-035).
- Relevé `etat-prod-2026-11-01-3e-lot5/` (8 modèles : les 6 + ccb51039, 76f5f143, publiés, grades `['4']`,
  tags 4-057 / 4-080) ; `lot-rangement-3-5.py` (copie du 4b) écrit
  `20261101130000_questions_3_lot5_rangement_tags.sql` (après `20261101120000`, questions-4 lot 6, le plus
  récent de toutes les branches) et la fixture : 6 rangés, 2 niveaux (3e ajoutée), 8 tags posés, 2 gardés.
- `questions-3-lot5-rangement-tags.test.ts` : 20 verts ; corps de la migration vidé : 9 rouges et la suite
  principale en échec. Cas neuf : tag d'avant (4-057) retiré depuis le relevé.
- `security-auditor` : aucun bloquant, rien à corriger (diff avec le gabarit 4b : données seules ; gardes,
  ordre des écritures et trigger des tags vérifiés). R1 prise : le commentaire du rollback dit de mesurer
  les usages en 3e de ccb51039 / 76f5f143 avant de les rendre à la seule 4e. R2 (pas de test d'accès par
  de vrais clients) et R3 (verrou du `disable trigger`, déjà au gabarit) : remarques, rien à faire.
- PR #2059. Premier passage de la CI : Lint rouge (garde « doc à jour » : `base-de-donnees.md` couvre les
  migrations ; la ligne `Doc-inchangée:` doit être dans un **commit**, pas dans la description de la PR) ;
  Client Tests shard 1 rouge (`wrapDynamicImport` indéfini, aucun fichier client dans la PR).

### 12.10 Lot 5 : migration jouée, page à cocher (2026-11-01)

- #2059 mergée ; `pnpm db:migrate --include-all` lancé par David. MCP : `20261101130000` inscrite ; les 6
  brouillons à leur nœud (§ 12), un tag chacun ; ccb51039 et 76f5f143 en grades `['4', '3']`, tags
  3-036,4-057 et 3-063,4-080, `published` ; `updated_at` inchangé partout.
- Page à cocher : https://claude.ai/artifact/CJ17SXoC5SjnCQQhdM4MYn (capacité `db`, collection `verdicts`
  vide au départ). Les blocs ` ```effectifs `, ` ```barres `, ` ```probtree ` n'y sont pas dessinés (source
  montrée, alerte sur 4 fiches). ccb51039 / 76f5f143 hors page (déjà publiés et relus en 4e).
- Trouvé en relisant la page : corrigé de 3-035 v2, `\textcolor` posé autour de `$…$` (hors formule) →
  corrigé dans le fichier (#2069) ; la prod attend `create-questions --publier --mettre-a-jour`.

### 12.11 Lot 5 : relu (2026-11-01)

- `ArtifactData list verdicts` : 6 documents, tous `ok`, sans commentaire (les 6 fiches de la page ;
  ccb51039 / 76f5f143 hors page).
- MCP : 302655b9 (3-035) a encore l'ancien corrigé (`updated_at` 2026-10-31 23:26) → la mise à jour
  `--mettre-a-jour` reste à lancer avant la publication.

### 12.12 Lot 5 : publié (2026-11-01)

- David : `create-questions --publier --mettre-a-jour` → 302655b9 mis à jour (MCP : nouveau corrigé,
  `updated_at` 11:34) ; `publier-lot.ts` simulation (6 passent) puis `--publier` → 6/6.
- MCP : cd2ffd9b, 6acde723, 96992ea8, acaa7317, c7928fc7, 302655b9 `published`, grades `['3']`.

## 13. Lot 6 (translation, vecteurs, sphère, lot 6 du § 4) : phase 0 proposée (2026-11-01)

Relevé MCP du jour : les 7 points du lot (3-018, 3-019, 3-021, 3-024 à 3-027) n'ont **aucun modèle**, ni 3-020.
Proches, en 4e (publiés le 2026-10-31, session 4e) : c8306505 « Translation et parallélogramme » (4-031 :
ABDC parallélogramme, image de C, frise ; ` ```figure ` `grille: 1` + `vecteur(A, B)` + ` ```choix `),
0150ef82 « Effet d'une translation » (4-030), e7ef2835 « Ce que conserve une translation » (4-032).
Volumes : 47971d3d / 55b26d32 cylindre (5-053, exact / π ≈ 3,14), 35002b15 cône (4-076, brouillon).

Outils : ` ```figure ` sur quadrillage (`vecteur(A, B)`, `vecteur(dx, dy, ancre=…)`) + ` ```choix ` ;
` ```solide ` `boule r` et `section:` (boule `d`, `0` = grand cercle ; pavé, cylindre) — **pas encore en prod**
(chantier `solides`, 23 commits après v0.58.0) : les modèles qui s'en servent restent en brouillon jusqu'au
`deploy:prod`. **Changement depuis le § 3** : 3-020 (sections) était classé C ; ` ```solide ` le couvre
désormais (son nom accessible tait la nature de la section, « réponse de 3e-020 »).

Nœuds (prod) : 3-025 → Vecteurs > égalité de vecteurs (5cc5fd1c) ; 3-026, 3-027 → Vecteurs > somme et
relation de Chasles (145027b5) ; 3-021 → Volumes > boule (17e866a3) ; 3-018, 3-019 → Solides > propriétés
(ae67e98f) ; 3-020 → Solides > sections planes (79a5ec75) ; c8306505 garde le sien.

### 13.1 Translation : 3-024

**Recommandé : aucun modèle neuf.** c8306505 passe en grades `['4', '3']` et reçoit le tag 3-024 en plus de
4-031 (son contenu est la définition du point : « C a pour image l'unique D tel que ABDC soit un
parallélogramme » ; précédents ccb51039 / 76f5f143, § 12.1).

### 13.2 Modèles neufs (6, un par point ; 7 avec 3-020)

| Point | Modèle (catégorie)                                                          | Variations                                                                                                                                                                                                                                                                                                                     | Réponse                   |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 3-025 | Vecteurs égaux, opposés, nul (Géométrie / Vecteurs / Égalité, 1)            | quadrillage, vecteur $\vec u$ et 4 vecteurs numérotés : 1) lequel est égal à $\vec u$ ; 2) lequel est l'opposé de $\vec u$ ; 3) parallélogramme ABCD : $\vec{AB} = ?$ parmi $\vec{DC}$, $\vec{CD}$, $\vec{AD}$, $\vec{BC}$ ; 4) « $\vec{AB} = \vec 0$ » : A = B, AB = 0 cm… (choix)                                            | choix                     |
| 3-026 | Somme de deux vecteurs (Géométrie / Vecteurs / Somme, 1)                    | quadrillage, $\vec u$, $\vec v$, point A : 1) image de A par la translation de vecteur $\vec u$ puis celle de vecteur $\vec v$ (choix entre 4 points) ; 2) quel vecteur numéroté est $\vec u + \vec v$ ; 3) translation de vecteur $\vec{AB}$ puis $\vec{BC}$ = translation de vecteur ? ($\vec{AC}$, $\vec{CA}$, $\vec{BC}$…) | choix                     |
| 3-027 | Relation de Chasles (Géométrie / Vecteurs / Chasles, 1-2)                   | 1) $\vec{AB} + \vec{BC}$ ; 2) trois termes $\vec{AB} + \vec{BC} + \vec{CD}$ ; 3) $\vec{AB} + \vec{BA}$ (= $\vec 0$) ; 4) termes dans le désordre $\vec{BC} + \vec{AB}$ ; lettres tirées                                                                                                                                        | choix (4 vecteurs)        |
| 3-018 | Boule ou sphère ? (Géométrie / Solides / Sphère et boule, 1)                | sphère de centre O, rayon r : 1) OM = d, M est-il sur la sphère, à l'intérieur, à l'extérieur (d < r, = r, > r) ; 2) « l'ensemble des points M tels que OM = r » / « OM ⩽ r » : sphère, boule, cercle, disque ; texte seul (pas de ` ```solide `)                                                                              | choix                     |
| 3-019 | Grands cercles et diamètre (Géométrie / Solides / Sphère et boule, 1)       | 1) rayon → diamètre, diamètre → rayon ; 2) ` ```solide boule ` coupée par le centre (`section: 0`) : rayon du grand cercle (= r) ; 3) la Terre : équateur, méridien, parallèle de latitude 45° — lesquels sont des grands cercles (`plusieurs: oui`)                                                                           | case nombre ; choix       |
| 3-021 | Volume d'une boule (Grandeurs / Volumes / Boule, 1-2)                       | V = 4/3 π r³ : 1) valeur exacte en fonction de π (r multiple de 3 → coefficient entier) ; 2) arrondi au cm³ ; 3) diamètre donné ; 4) demi-boule                                                                                                                                                                                | case (exacte ou arrondie) |
| 3-020 | Sections de solides (Géométrie / Solides / Sections, 1-2) — **si § 13.4.2** | ` ```solide ` coupé : 1) pavé ‖ à une face : nature (rectangle) et dimensions = celles de la face ; 2) cylindre ⊥ à l'axe : disque de même rayon ; 3) cylindre ‖ à l'axe : rectangle, une dimension = hauteur ; 4) boule à d du centre : cercle, rayon par Pythagore (R, d entiers d'un triplet)                               | choix ; case nombre       |

Erreurs typiques (`testSpecs`) : 3-025 → le vecteur de même direction mais de sens contraire, $\vec{CD}$ au
lieu de $\vec{DC}$ ; 3-026 → $\vec u - \vec v$, le seul $\vec v$ ; 3-027 → $\vec{CA}$, $\vec{BB}$ ; 3-018 →
boule / sphère inversées ; 3-019 → le diamètre pris pour le rayon, le parallèle compté grand cercle ; 3-021 →
4/3 π r² ou π r³, le diamètre mis à la place du rayon ; 3-020 → le rayon de la boule pour celui de la section.

### 13.3 Rangement

Chacun sur le nœud de son point (relevé ci-dessus), un tag par modèle ; c8306505 : grades et tag 3-024 dans
la même migration.

### 13.4 Questions à David

1. § 13.1 : c8306505 partagé avec la 3e (grades 4 et 3, tags 4-031 et 3-024), plutôt qu'un modèle neuf ?
2. **3-020 (sections) dans ce lot**, maintenant que ` ```solide ` sait couper ? Il resterait en brouillon,
   comme 3-019 v2, jusqu'au `deploy:prod` qui livre le bloc.
3. Valider le § 13.2 : points, variations, formes de réponse. Vecteurs en **choix** partout (pas de saisie
   de $\vec{AC}$ dans une case).
4. 3-021 : valeur exacte « en fonction de π » (36π, 32/3 π acceptés) et arrondi, comme le cylindre de 5e ?

### 13.5 Question d'accès

Brouillons : personne ne lit rien de neuf. Rangement puis publication : élèves et prof de 3e voient 6 (ou 7)
modèles publiés de plus, et c8306505 de 4e ; la 4e ne perd rien. Aucune règle ne change.

### 13.6 Décisions (David, 2026-11-01, « je te suis » sur les recommandations)

- § 13.1 : c8306505 partagé (grades `['4', '3']`, tag 3-024 en plus de 4-031), dans la migration de rangement.
- § 13.2 validé ; **3-020 ajouté au lot** (7 modèles) ; vecteurs toujours en choix.
- 3-021 : exact (r multiple de 3 → coefficient entier ; une variation en fraction, 32/3 π) et arrondi au cm³.
- Hors lot : la PR `fix` qui refuse une option à geste dans un ` ```choix ` (question restée ouverte du
  chantier `solides`) — recommandée, à faire à part.

### 13.7 Lot 6 : écrit (2026-11-01)

- `docs/wip/questions/lot-3-6.py` → `scripts/questions/3-lot-6/` (7 JSON, 25 variations, 65 specs) ;
  `create-questions` en simulation vert. Branche `content/questions-3-lot6`.
- **Pièges mesurés** : `%` refusé dans l'`eval` d'une variable (« Unexpected token ») — admis dans les
  conditions ; la case de chaque vecteur est donc choisie par `{{if}}` sur p. Choix à plusieurs réponses : une
  partie seulement des bonnes = `unoptimal_form` (incomplet), pas `incorrect`.
- Sonde (scratchpad, supprimée) : 300 tirages par variation, blocs ` ```figure ` (scène construite, ni erreur
  ni avertissement), ` ```solide ` (parseur + scène), choix sans doublon, gabarits résolus : **0 défaut**.
- Base locale : 7 brouillons. Aperçu admin (`127.0.0.1:5176`) : 3-025 v2 (quadrillage, GH = u, KL = −u),
  3-026 v1 (points, R = A + u + v), 3-020 v2 (cylindre ⊥, disque teinté) et v4 (boule, R = 10, d = 6).
  Retouche : choix « un disque de rayon r cm, comme la base » (la parenthèse coupait la ligne).

### 13.8 Lot 6 : fichiers mergés (2026-11-01)

- #2091 mergée (CI verte). Attendu : `create-questions --dir scripts/questions/3-lot-6 --publier` lancé par
  David depuis le dépôt principal à jour (`git pull` d'abord).

### 13.9 Lot 6 : en prod, rangement écrit (2026-11-01)

- `create-questions --publier` lancé par David : 7 brouillons, vérifiés au MCP (`draft`, grades `['3']`, niveau
  1, sans nœud ni tag) : ff3bd841-6d22-40f6-a4e3-4ddc7e017905 (3-025) · 787cc937-5bc7-435f-9a63-7d4d0f102ea1
  (3-026) · d157dfb2-3666-484d-93f9-9fe46a0e2fcf (3-027) · 6bcb3535-6632-4659-9a83-23a740b8e685 (3-018) ·
  cd756e21-af71-4922-8106-8387658a45e1 (3-019) · 87f79961-03c8-44af-98b5-438165d2f689 (3-021) ·
  7bb95104-9256-4bdb-a481-bdd2aae66a67 (3-020).
- Relevé `etat-prod-2026-11-01-3e-lot6/` (8 modèles : les 7 + c8306505, publié, grades `['4']`, tag 4-031) ;
  `lot-rangement-3-6.py` (copie du 3-5) écrit `20261101183000_questions_3_lot6_rangement_tags.sql` (d'abord
  `170000` ; renommée après l'arrivée sur main de `180000` (1re spé) et `180100` pris par la PR ce2 lot 5) et la fixture : 7 rangés, 1 niveau (3e ajoutée), 8 tags
  posés, 1 gardé. ff3bd841 sur la sous-notion « Vecteurs > égalité de vecteurs » (le point 3-025 vit sur la
  notion).
- `questions-3-lot6-rangement-tags.test.ts` : 20 verts ; corps de la migration vidé : 9 rouges, 7 sautés.
- `security-auditor` : aucun bloquant, rien à corriger (écart au gabarit : commentaires, données, compteurs ;
  prod relue au MCP = relevé). Remarque : pluriels figés du bilan généré (« 1 gardés »), cosmétique.
- CI #2100, 1er passage : 6 rouges, tous dus à main (`20261101141600` en double, corrigé par #2093) →
  `origin/main` fusionnée, migration renommée `183000`. Vu en passant : les PR ouvertes 4e lot 7 et 5e lot 6
  prennent toutes deux `20261101170000` (signalé à David).

# Chantier « questions-3 » — couvrir la 3e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `3.points`.

## Reprendre ici

_Mis à jour le 2026-10-29, après la relecture du lot 1 (5/5 OK)._

- **État** : lot 1 en prod en brouillon, rangé (#1930, migration `20261029003100` jouée et vérifiée). Page à
  cocher https://claude.ai/artifact/RzBxX9RLjAtvkNnTWssq4X : **5 verdicts, 5 OK** (relus le 2026-10-29).
- **Prochaine action** : `pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/3-lot-1` en
  simulation ; puis **David** le relance avec `--publier` ; relire `published` en base (MCP). Ensuite : phase 0
  du lot 2 (§ 4).
- **En attente de David** : le `--publier` après la simulation.
- **Pièges en cours** : `db:migrate` refusé par le classifieur du mode auto → David le lance avec `!` ;
  test `forfait-palotin` qui dépasse 5 s en CI (aléatoire, relancer le job) ; § 9 de `couvrir-un-niveau.md`.
- **Worktree / branche** : aucun.

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

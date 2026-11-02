# Chantier « questions-4 » — couvrir la 4e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `4.points`.

## Reprendre ici

_Mis à jour le 2026-11-02, après #2166 (lot 9 mergé) ; #2169 (rangement du lot 9) en attente._

- **État** : lots 1 à 8 en prod et publiés. Lot 9 « pensée informatique » : fichiers mergés (#2166), 3 brouillons en
  prod (6c9c9649 → 4-065, 8b6f9e98 → 4-066, 20cb9b55 → 4-067), sans nœud ni tag. #2169 (migration de rangement) :
  CI verte 3 fois, bloquée 4 fois par la garde (horodatages pris par d'autres sessions, § 47) ; renommée en local
  `20261102041300` (outil de #2181, heure réelle), garde OK, intégration 9/9, **commits locaux NON poussés**.
- **Prochaine action** : au « go » de David : `git merge origin/main`, push, CI de #2169, `pnpm check:migrations --pr
2169`, merge, `db:migrate` (s'il refuse « inserted before the last migration » : `--dry-run --include-all`, relire,
  puis `--include-all`), vérifier au MCP (nœud + tag des 3), page à cocher (`page-a-cocher.ts --dir
scripts/questions/4-lot-9`, après le `db:migrate`). Puis : outils C (§ 3) et fin de chantier (versement).
- **En attente de David** : le « go » pour pousser #2169 (il a choisi « attendre un créneau », 2026-11-01).
- **Pièges en cours** : migrations, dès #2165 mergée (règle de David, 2026-11-01) : horodatage par `pnpm
migration:horodatage` (jamais un nombre rond choisi à la main), `pnpm check:migrations --pr <n>` avant `gh pr merge`,
  premier job de CI = porte des horodatages (`git merge origin/main` dans le worktree d'abord) ; `mtexte()` refusé dans une figure de question (§ 26) ; `db push --include-all` : **réservé à
  David** (§ 27, § 30, § 34), même quand une autre session dit le contraire ; horodatage de migration : rebaser sur
  `origin/main` avant la CI (§ 34) et relever la dernière version jouée juste avant de pousser (§ 42) ; exemption de doc d'une migration de données = ligne `Doc-inchangée:` dans un
  COMMIT ; QCM = case choix ; un grand nombre s'écrit `10\,000` dans une spec ; tests navigateur de la CI parfois
  tombés (`wrapDynamicImport`) : relancer le job ; une borne qui ne repose que sur 2019/2016 : la signaler dans la
  phase 0 du lot qui s'en sert (§ 36).
- **Worktree / branche** : `../ubumaths-wt-questions-4` (HEAD détachée sur `origin/main`), aucune branche en cours.

## 1. Relevé (prod, MCP lecture seule, 2026-10-28)

- **82 points** de 4e ; **17** ont au moins un modèle, **65** aucun.
- **80 modèles** `'4' = any(grades)`, tous publiés, tous rangés sur un nœud ; 57 tagués, 23 sans point.
- Aucun modèle d'un autre niveau n'est tagué d'un point de 4e.
- Points tagués (nombre de modèles) : 001 (3), 002 (3), 003 (2), 073 (1), 007 (1), 008 (4), 011 (1),
  012 (5), 015 (6), 016 (2), 019 (4), 022 (2), 070 (8), 024 (11), 025 (2), 052 (2), 055 (1).

Catégories publiées (thème / domaine / sous-domaine : niveaux pris), à relire avant de numéroter un lot :

| Catégorie                                                                     | Niveaux pris         |
| ----------------------------------------------------------------------------- | -------------------- |
| Calcul littéral / Equations / Dans ℕ                                          | 3                    |
| Calcul littéral / Equations / Dans ℚ                                          | 4, 5, 6              |
| Calcul littéral / Equations / Dans ℤ                                          | 4, 5, 6, 7           |
| Calcul littéral / Equations / Linéaire du premier degré                       | 1 à 6                |
| Calcul littéral / Transformation / Développement                              | 1, 2                 |
| Calcul littéral / Transformation / Factorisation                              | 1 à 10               |
| Entiers / Vocabulaire / Traduire                                              | 1, 2                 |
| Fractions / A trou / Addition - Soustraction                                  | 2                    |
| Fractions / A trou / Multiplication                                           | 1, 2                 |
| Fractions / Apprivoiser / Simplification                                      | 5, 6                 |
| Fractions / Calculer / Division                                               | 1 à 5                |
| Fractions / Calculer / Inverse                                                | 1, 2                 |
| Fractions / Calculer / Multiplication                                         | 3 à 6                |
| Grandeurs / Vitesses / Calculer · Convertir                                   | 1 · 1                |
| Proportionnalité / Tableaux… / Calculer une 4e prop.                          | 3                    |
| Puissances / Apprivoiser / Définition · Notation sci. · Puissances de 10      | 1-3 · 1-2 · 1-3      |
| Puissances / Calculer / Diviser · Mixer · Multiplier · Puissance de puissance | 1, 3 · 1 · 1-4 · 1-3 |
| Racines carrées / Apprivoiser / Définition · Manipuler / Calculer             | 2-4 · 1-2            |
| Relatifs / Multiplier et Diviser / Carré · Produit · Quotient                 | 1 · 1-6 · 1-4        |

## 2. L'existant contre les bornes

> La passe « arbre des notions » (2026-10-18 → 20) fait foi :
> `docs/archive/wip/arbre-notions/analyse/cycle4.csv` (79 modèles de 4e : 46 TAG, 12 MODIFIER,
> 21 HORS_PROGRAMME) et `cycle4-notes.md`.

### 2.1 Les 12 MODIFIER : 11 appliqués, 1 non

Appliqués le 2026-10-20 / 21 (nombre de variations réduit en prod) : 6a60ed10, b2af6f39, 11607586,
9231b54b, d7f2568a, 39c5bcfa, 3abfcd7b, e66089e0, 99f5a54a, 0b6d749f, 2d8e7948.

**Non appliqué** : **c9d6c5db** « Simplifier une fraction » (avec signes), modifié le 2026-10-01, toujours
3 variations, **sans tag** : consigne « Simplifie le plus possible » (forme irréductible = 3e, 3-001) ;
la passe demande « Simplifie » et d'accepter toute fraction simplifiée → TAG 4-005. Seul modèle
candidat pour 4-005.

Remarque : b2af6f39, titré « Simplifier une fraction », est tagué 4-007 (opposé d'un rationnel :
−a/b = a/(−b)). Le tag est juste ; le titre trompe.

### 2.2 Les 21 HORS_PROGRAMME (sans tag) — niveau jamais changé

Règle déjà validée au chantier de la 6e (2026-10-26) : un modèle HORS_PROGRAMME prend le niveau du point
qui le décrit. Application proposée (à vérifier en inclusion stricte contre les bornes du niveau cible,
comme `questions-6/destinations-42.csv`) :

| Modèles                      | Ce qu'ils font                              | Destination proposée              |
| ---------------------------- | ------------------------------------------- | --------------------------------- |
| 15368b02, 65110463           | exposant négatif, inverse noté a⁻¹          | 3e, 3-004                         |
| bb9cff7b, 5b627bb7           | produit de puissances, exposants relatifs   | 3e, 3-005                         |
| 1db08bdc, 743c0809, 8ac99be4 | quotient de puissances (de 10)              | 3e, 3-052                         |
| 953574d4, 9f380957           | notation scientifique                       | 3e, 3-006                         |
| a1ae1558, 2158a2fc, 17f3dfcd | puissance d'une puissance                   | aucun point (ni 4e ni 3e)         |
| 2de1b93d, 294c4316           | factorisation **numérique** (2 × 9 + 2 × 7) | 5e, 5-008                         |
| 419887ff, b0ef6947           | a/x = b                                     | 2de seulement : aucun au collège  |
| 07a51f8f                     | x/9 = 9/7 (second membre fractionnaire)     | aucun point                       |
| 86b80159, e8de8b81, 23b29a15 | opérations à trou sur des fractions         | 4e sans tag (décision 2026-10-17) |
| 8919c37b                     | (b√a)², √a × b × √a                         | aucun au collège (2de, 2-271 ?)   |

Plus **5d515eb1** (« Traduire une phrase », venu de la 6e le 2026-10-26, sans tag par décision).

## 3. Les 65 points sans modèle

La QCM s'écrit désormais en **case choix** (bloc ` ```choix `). Un bloc ` ```python ` (code coloré) existe
pour afficher un programme ; les transformations (`translation`, `vecteur`) existent dans le DSL de figure.

- **A. Texte / formule seuls, case ou case choix (≈ 45)** :
  - relatifs, rationnels : 082, 004, 005 (aussi par c9d6c5db), 006, 009, 010, 013, 014 ;
  - puissances, racines : 017, 018, 020 ;
  - calcul littéral : 021, 023 (case choix : « quelle expression prouve… »), 071 ;
  - proportionnalité, pourcentages : 053, 054, 056, 057, 080, 058, 059 ;
  - programmes de calcul, formules : 060, 081, 061, 062 ;
  - statistiques sur données brutes ou tableau : 039, 040, 077, 041, 078, 042, 043, 044 ;
  - tableur : 045 (« quelle formule écrire ? » `=MOYENNE(B2:B8)`, case choix) ;
  - probabilités : 046, 047, 048, 079, 049 ;
  - géométrie sans dessin : 029, 076 (volumes), 035 (réciproque / contraposée, case choix), 072 (le triangle
    de côtés 5, 12, 13 est-il rectangle ?) ;
  - pensée informatique avec ` ```python ` : 065, 066, 067 (que vaut la variable à la fin ? que s'affiche-t-il ?).
- **B. Outil existant (≈ 15)** :
  - ` ```figure ` : 030, 031, 032 (translation : image d'un point, parallélogramme associé, conservation),
    033 (droite des milieux), 034 (Pythagore : côté manquant), 036, 037 (cercle circonscrit au triangle
    rectangle), 075 (formule d'aire d'un triangle lue sur la figure) ;
  - ` ```barres `, ` ```simulation `, ` ```effectifs ` : 039 et 041 en variante diagramme, 050, 051 ;
  - ` ```courbe ` et tableau : 063, 064 ;
  - ` ```probtree ` : 049 en variante.
- **C. Outil neuf (4)** :
  1. **Solides en perspective** (pyramide, cône, cylindre, prisme, pavé ; patrons) → **027, 028**. Prolonge
     le chantier « assemblages de cubes » décidé en 6e (1er des outils neufs) : un seul bloc « solides »
     couvrirait 6e et 4e.
  2. **Schéma de fraction** (carré unité partagé, schéma en barres) → **074** ; même outil que le « schéma en
     barres » de la 6e (6-142, 3e des outils neufs).
  3. **Construire un rectangle sans équerre** (compas, règle) → **038** : nouveau contrôle de la figure à
     compléter, dans `figure-et-choix`.
- **D. Non évaluables dans l'appli (4)** : 026 (conjecturer avec un algorithme ou un tableur), 068, 069
  (écrire / modifier un programme : en attente de Blockly).

## 4. Lots proposés (après les réponses)

0. **Corrections de l'existant** (§ 2) : c9d6c5db (contenu + tag 4-005), puis niveaux et tags des 21
   HORS_PROGRAMME (une PR contenu, une PR migration, comme la 6e).
1. **Relatifs et rationnels** (A) : 082, 004, 005, 006, 009, 010, 013, 014.
2. **Puissances, racines, calcul littéral** (A) : 017, 018, 020, 021, 023, 071.
3. **Proportionnalité et pourcentages** (A) : 053, 054, 056, 057, 080, 058, 059.
4. **Programmes de calcul, formules, fonctions** (A + B) : 060, 081, 061, 062, 063, 064.
5. **Statistiques** (A + B) : 039, 040, 077, 041, 078, 042, 043, 044, 045.
6. **Probabilités** (A + B) : 046, 047, 048, 079, 049, 050, 051.
7. **Géométrie** (A + B) : 029, 076, 034, 072, 035, 033, 036, 037, 075, 030, 031, 032 — peut-être en deux
   lots (Pythagore et triangles ; translations et volumes).
8. **Pensée informatique** (A) : 065, 066, 067.
9. Outils C, chacun en chantier à part, dans l'ordre que choisit David.

## 5. Questions à David (posées le 2026-10-28) — tranchées : voir § 5 bis

1. **c9d6c5db** : appliquer enfin la passe (« Simplifie », toute fraction simplifiée acceptée, tag 4-005) ?
2. **Les 21 HORS_PROGRAMME** : appliquer la règle de la 6e (niveau du point qui les décrit : 3e, 5e ; les
   autres restent en 4e sans point) ?
3. **Ordre des lots** : corrections d'abord, puis 1 → 8 ?
4. **Solides en perspective** (027, 028) : les rattacher au chantier « assemblages de cubes » de la 6e (un
   seul bloc « solides ») ?
5. **Schéma de fraction** (074) : même outil que le schéma en barres de la 6e ?
6. **Pensée informatique** (065-067) : programmes affichés en Python (` ```python `) ou en pseudo-code
   « Scratch en texte » ?

## Note de la session 3e (2026-10-28)

Le lot 0 de la 3e (journal `questions-3-progress.md` § 6.2) passe en **3e seule** et tague : 90dca27a,
acbd2280 (5e), c9d6c5db, 15368b02, 65110463, bb9cff7b, 5b627bb7, 1db08bdc, 743c0809, 8ac99be4,
953574d4, 9f380957, 17f3dfcd ; il passe en 4e 54107079 (4-022) et 2bdb3db6 (4-024). Ne pas les
traiter ici. **2d8e7948** (« Puissances de 10 », exposants négatifs à retirer) reste à la 4e.

## 5 bis. Décisions de David (2026-10-28, « je valide » mes recos)

1. c9d6c5db : appliquer la passe (« Simplifie », tag 4-005). **Dépassé** depuis (§ 6.1) : la session 3e le
   prend en 3e avec 3-001, et 4-005 a déjà 4 modèles.
2. Les 21 HORS_PROGRAMME : règle de la 6e (niveau du point qui les décrit), destinations vérifiées contre les
   bornes ; la 4e fait le déplacement de ce qui n'est pas déjà pris par une autre session.
3. Ordre des lots : 0 corrections, 1 relatifs et rationnels, 2 proportionnalité et pourcentages, 3 statistiques,
   4 probabilités, 5 puissances et calcul littéral, 6 programmes de calcul et fonctions, 7 géométrie (après les
   lots 5-6 de `figure-et-choix`), 8 pensée informatique.
4. Solides (027, 028) : un seul bloc « solides » avec les assemblages de cubes de la 6e (ADR) ; palier 1
   affichage en perspective (027), palier 2 patrons et vues (028).
5. Schéma de fraction (074) : le schéma en barres de la 6e, sans carré unité.
6. Pensée informatique (065-067) : pseudo-code en français proche de Scratch, bloc de code sans langage ; pas de
   Python.

## 6. Lot 0 (corrections) : phase 0 (proposée le 2026-10-28)

### 6.1 Ce que les autres sessions ont déjà pris

- **5e (#1917, migrée)** : 4f4a5c94, 90dca27a, acbd2280, d14fe0cf (simplifier une fraction) → 4e, tag 4-005 ;
  554496dd (substitution, relatifs) → 4e sans tag. **4-005 est couvert** (4 modèles).
- **3e (lot 0 validé, pas encore écrit)** : c9d6c5db (→ 3-001), 15368b02, 65110463, bb9cff7b, 5b627bb7,
  1db08bdc, 743c0809, 8ac99be4, 953574d4, 9f380957, 17f3dfcd → 3e ; 54107079 (4-022) et 2bdb3db6 (4-024) → 4e.
  Ses destinations sont les miennes (§ 2.2). c9d6c5db en 3e est cohérent : « le plus possible » = 3e.
- 2d8e7948 (note de la 3e) : déjà corrigé en prod (a de 0 à 5, MCP).

### 6.2 Ce qui reste à la 4e : 6 modèles, une migration (niveaux, nœuds, tags), aucun contenu

Vérifiés contre les bornes du niveau cible (variables relevées en prod, export du 2026-10-28) :

| Modèle   | Ce qu'il fait                              | Niveau | Point | Nœud                                                                        |
| -------- | ------------------------------------------ | ------ | ----- | --------------------------------------------------------------------------- |
| 2de1b93d | factoriser a×b + a×c, entiers 2 à 9        | 5e     | 5-008 | Calcul littéral > factorisation → Entiers : multiplication > distributivité |
| 294c4316 | facteur commun de a×b + a×c, entiers 2 à 9 | 5e     | 5-008 | idem                                                                        |
| 419887ff | b/x = c/a ; b/x = a (2 à 9)                | 2de    | 2-464 | Équations : premier degré > ax = b → Fonction inverse > 1/x = k, 1/x < k    |
| b0ef6947 | ab/x = b, relatifs                         | 2de    | 2-464 | idem                                                                        |
| a1ae1558 | (aᵇ)ᶜ, exposants 2 à 9                     | 2de    | 2-260 | gardé (point sur la notion « Puissances : calculs »)                        |
| 2158a2fc | (10ᵃ)ᵇ, exposants 2 à 9                    | 2de    | 2-260 | gardé                                                                       |

- 5-008 : « exemples numériques, décimaux positifs » ; 2-464 : « forme a/x = b admise (automatisme) » ;
  2-260 : « règles de calcul sur les puissances entières relatives » (la puissance d'une puissance n'est citée ni
  en 4e ni en 3e).
- **Restent en 4e sans point** : 07a51f8f (x/9 = 9/7 : aucun point au collège), 86b80159, e8de8b81, 23b29a15
  (opérations à trou, décision du 2026-10-17), 8919c37b ((b√a)² : passe = hors programme), 5d515eb1 (décision
  du chantier 6e), 554496dd (décision de la 5e).
- **Usages en prod** des 17 modèles concernés (MCP) : 0 carte de révision, 0 essai, 0 réponse, 0 question
  d'évaluation, 0 journal, 0 série, 0 exercice, 0 fiche.

### 6.3 Question d'accès

Les élèves de 4e ne voient plus ces 6 modèles publiés ; ceux de 5e en gagnent 2, ceux de 2de 4. Les tags restent
lisibles par tout connecté, comme aujourd'hui. Aucune règle ne change.

### 6.4 Questions à David

1. Valider le § 6.2 (6 modèles, une migration) ?
2. **17f3dfcd** (puissance d'une puissance, exposants relatifs) : la 3e le prend en 3e sans point, alors que
   2-260 le décrit. Le laisser à la 3e, ou l'envoyer en 2de avec a1ae1558 et 2158a2fc (je préviens la 3e) ?
3. **Conflit 3e / 5e** : 90dca27a et acbd2280 (« Simplifie le plus possible ») sont passés en 4e + 4-005 (#1917)
   alors que le lot 0 de la 3e les envoie en 3e + 3-001 ; la garde de sa migration (niveau `5` attendu) va
   refuser. À la 3e de trancher, mais « le plus possible » = forme irréductible = 3e : je la préviens ?

**Décisions de David (2026-10-28, « je valide » mes recos)** : § 6.2 validé ; 17f3dfcd part aussi en 2de
(2-260), pris par la 4e après le lot 0 de la 3e (#1921, qui le passe en [3] sans tag) ; la 3e prévenue
(message de session) et d'accord ; 90dca27a et acbd2280 → 3e + 3-001 dans un lot suivant de la 3e.

## 7. Lot 0 : écrit (2026-10-28)

- Relevé `questions-4/releve-prod.ts` (lecture seule, `.env`) → `questions-4/etat-prod-2026-10-28/` (7 modèles,
  0 tag) ; usages (MCP) : 0 partout, favoris et chapitres compris.
- `questions-4/lot-niveaux-4.py` (repris de `lot-niveaux-5.py`) → `20261028223000_questions_4_niveaux.sql` +
  fixture `tests/integration/fixtures/questions-4-niveaux.json` (niveaux d'avant par modèle : [3] pour 17f3dfcd).
  Horodatage après ceux de la 3e (`20261028213000` / `213100`, renumérotés).
- Test `questions-4-niveaux.test.ts` : 20 verts (dont « 17f3dfcd encore en [4] » refusé) ; migration vidée → 11 rouges. Le tag « posé depuis la
  migration » du test de rollback est CM2-047 (même nœud, autre programme : le trigger refuse deux points d'un
  même programme).
- `security-auditor` (#1923) : aucun bloquant. Corrigés : numéro du lot 0 de la 3e (`20261028213100`, pas
  `200100`), test explicite « 17f3dfcd encore en [4] → refus ». Rappel opérationnel : `db:migrate` après celui
  de #1921, sinon `db push` échoue sans rien écrire mais bloque les migrations suivantes.
- CI de #1923 : tout vert sauf la garde « doc à jour » (`docs/systeme/base-de-donnees.md` couvre les
  migrations) ; la ligne `Doc-inchangée:` doit être dans un MESSAGE DE COMMIT, pas dans la description de la PR.

## 8. Lot 0 : en prod (2026-10-28)

- #1923 mergée (CI verte après un commit `Doc-inchangée:`). `db:migrate` bloqué (`DbPushMissingRemoteError` :
  migration 2de non jouée) → David a lancé `supabase db push --include-all` : 2de 183000, 3e 213000 / 213100,
  5e 214500, 4e 223000, dans l'ordre.
- MCP : les 7 modèles aux niveaux, nœuds et tags attendus, `updated_at` inchangé ; 17f3dfcd en [2] + 2-260.
- Worktree retiré, branche supprimée.

## 9. Lot 1 (relatifs et rationnels) : phase 0 (proposée le 2026-10-28)

### 9.1 Relevé (MCP, 2026-10-28)

- **4-005 couvert** (acbd2280, d14fe0cf, 4f4a5c94, 90dca27a) : hors lot.
- Voisins à ne pas doubler : b896b6ce (5e, 5-018, « (−a) + a » sur entiers) ; 4115768c (4e, 4-011 : inverse de
  a, de 1/a, de a/b) ; 2f1657b0 (5e, brouillon, 5-006 : « somme ou produit ? ») ; 78feafed (4e, 4-073 : phrase →
  expression, le sens inverse de 4-004) ; 5cd25c2b (6e, 6-137 : problèmes de fractions).
- Catégories et niveaux pris (publiés ; brouillons entre crochets) : Relatifs / Additionner et soustraire /
  Sommes 1-7 · Entiers / Priorités opératoires / Vocabulaire [1, 2] (5e) · Fractions / Apprivoiser / Définition
  1-2 · Fractions / Calculer / Fraction d'une quantité 1-4 · Fractions / Calculer / Inverse 1-2 · Fractions /
  Problèmes / Parts et restes 1 · « Fractions / Calculer / Enchaînements » n'existe pas.
- Une fraction juste non simplifiée est acceptée en ambre (`reducedFractions: warn`) : conforme à 4-005.

### 9.2 Modèles proposés (7, un par point)

| Point | Modèle (catégorie, niveau)                                                  | Variations                                                                                                                                                                                    | Réponse           |
| ----- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 082   | Somme de deux opposés (Relatifs / Additionner et soustraire / Sommes, 8)    | 1) −a + a, a décimal à 1 ou 2 chiffres après la virgule (0,1 à 99,9) ; 2) −a + ? = 0 ; 3) −a + b + a, b entier (repérer les opposés)                                                          | case              |
| 004   | Nommer un enchaînement (Entiers / Priorités opératoires / Vocabulaire, 3)   | expression → phrase, case choix à 4 phrases : 1) (a + b) × c ; 2) a + b × c ; 3) (a − b) ÷ c ; 4) a × (b − c). Entiers 2 à 9                                                                  | case choix        |
| 006   | Nombre rationnel (Fractions / Apprivoiser / Définition, 3)                  | 1-3) « −12/4 est : un entier / un décimal non entier / ni l'un ni l'autre » (une variation par cas, signes variés) ; 4) « −0,3 = ?/10 » (écrire un décimal relatif comme quotient d'entiers)  | case choix · case |
| 009   | Fraction d'une fraction (Fractions / Calculer / Fraction d'une quantité, 5) | 1) les a/b de c/d (dénominateurs ≤ 10) ; 2) idem, simplification possible (3/4 de 8/9) ; 3) problème : les 2/3 des 3/5 des élèves                                                             | case              |
| 010   | Inverse : définition (Fractions / Calculer / Inverse, 3)                    | 1) a × ? = 1 (a de 2 à 12) ; 2) inverse d'un décimal (0,5 ; 0,25 ; 0,2 ; 0,1 ; 2,5 ; 1,25) ; 3) « l'inverse de a est : −a / 1/a / 0,a / a » (piège inverse / opposé)                          | case · case choix |
| 013   | Enchaînements avec des fractions (Fractions / Calculer / Enchaînements, 1)  | 1) a/d + b/d × c ; 2) a/b − c/b × d/e (exemple du BO : 7/4 − 3/4 × 9/8) ; 3) (a/b + c/b) × d/e ; 4) idem avec une fraction négative. Dénominateurs ≤ 10                                       | case              |
| 014   | Problèmes avec des fractions (Fractions / Problèmes / Parts et restes, 2)   | 1) 1/3 puis 1/4 du reste : quelle fraction dépensée ? 2) bouteille de 3/4 L, verres de 1/8 L : combien de verres ? (division) ; 3) les 2/5 d'une ficelle mesurent 12 m : longueur ? (inverse) | case              |

- `testSpecs` d'erreurs typiques : 082 → 2a ou −2a ; 004 → la phrase de la première opération ; 009 → a/b + c/d
  ou a/d × c/b ; 010 → l'opposé ; 013 → calcul de gauche à droite ; 014 → 1/3 + 1/4 sans « du reste ».
- 013 et 014 : rationnels relatifs seulement en 013-4 (borne 4e : « rationnels relatifs ») ; 014 en positifs
  (contexte concret).

### 9.3 Question d'accès

Modèles neufs en brouillon, puis migration nœud + tag : **personne** ne lit rien qu'il ne lisait pas avant
(brouillons invisibles aux élèves ; tags lisibles par tout connecté, comme les autres). À la publication, les
élèves de 4e voient 7 modèles de plus, comme tout modèle publié.

### 9.4 Questions à David

1. Valider les 7 modèles (§ 9.2) : points, variations, niveaux ?
2. 4-004 en **Entiers / Priorités opératoires / Vocabulaire, niveau 3**, à la suite des brouillons 5e (« Nommer un
   calcul ») plutôt qu'en Entiers / Vocabulaire / Traduire (où est 4-073) ?
3. 4-013 : ouvrir la catégorie **Fractions / Calculer / Enchaînements** (aucun modèle n'y est) ?

**Décisions de David (2026-10-28, « je valide » mes recos)** : les 7 modèles du § 9.2, avec deux retouches :
4-006 en **une** variation « entier / décimal non entier / ni l'un ni l'autre » où le cas est tiré (indice du
bon choix par une variable : pas de motif d'une variation à l'autre), plus « −0,3 = ?/10 » ; 4-082 avec **un**
chiffre après la virgule (0,1 à 99,9, comme −7,5 + 7,5). 4-004 en Entiers / Priorités opératoires / Vocabulaire,
niveau 3 ; 4-013 ouvre Fractions / Calculer / Enchaînements.

## 10. Lot 1 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-1`)

- Script `docs/wip/questions/lot-4-1.py` (repris de `lot-5-calcul.py`) → `scripts/questions/4-lot-1/` : 7 modèles,
  niveaux du § 9.2 ; `create-questions` (simulation) : 7 « à créer », 0 en base ; `question:specs` : 66 specs vertes,
  tirages 50 par variation réussis.
- Corrigé en écrivant : 4-010, réponse 0,25 pour 1/4 refusée (`bad_form`) → `acceptDecimal` sur la case (1/3
  arrondi à 0,33 reste faux, spec) ; fractions négatives écrites −5/6 et non \frac{-5}{6} (`signee`) ; 4-004 :
  trois nombres distincts (sinon « la différence de 3 et 3 », diviseur nul) ; 4-009 problème : numérateurs ≥ 2
  (« les 1/3 des élèves » évité).
- 4-006 : le cas est tiré par `k`, numérateur et dénominateur pris par indicatrices arithmétiques de `k`
  (`question:specs` lent sur ce modèle, ~1 min : normal, trois jeux de variables gardés).

## 11. Lot 1 : nœud et tag (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-tags`)

- Relevé prod (MCP, 2026-10-29) : les 7 brouillons `[4]`, sans nœud ni tag. Nœuds des points : 4-082 Relatifs :
  calculs > sommes · 4-004 Entiers : priorités opératoires > écriture d'une expression · 4-006 Fractions : sens et
  écritures > définition · 4-009 Fractions : calculs > fraction d'une quantité · 4-010 Fractions : calculs > inverse ·
  4-013 et 4-014 à la **notion** Fractions : calculs.
- Migration et test repris du lot 2 de la 5e (`20261029170000`, qui gère déjà les points à la notion). Question
  d'accès : § 9.3 (personne ne gagne d'accès), validée avec la phase 0.
- #1948 mergée (CI verte, `security-auditor` sans finding) ; `db:migrate` le 2026-10-29 ; vérifié en prod (MCP).

## 12. Lot 2 (proportionnalité et pourcentages) : phase 0 (proposée le 2026-10-29)

### 12.1 Relevé (MCP, 2026-10-29)

- Points du lot, tous sans modèle : 053, 054, 056, 057, 080, 058, 059 (4-052 et 4-055 sont déjà couverts).
- Voisins à ne pas doubler : 6e Pourcentages / Calculer 1-6 (6-141 : 50 %, 10 %, a % de b·10, 25 %, 75 %) ;
  3e Pourcentages / Variations 1-2 (3-068, 3-069 : augmenter de 10 à 100 % **sans** coefficient) ; 2de
  Pourcentages / Variations 3-11 (2-366 : coefficient pour t de 1 à 100, puis taux, évolutions successives) ;
  4e Tableaux / 4e proportionnelle 3 (4-055). 5-086 et 5-140 (5e, sans modèle) : chantier de la 5e.
- « Pourcentages / Variations » est pris de 1 à 11 par la 3e et la 2de : la 4e ne peut pas s'y glisser sans
  renuméroter ces modèles ; d'où une sous-notion neuve pour le coefficient multiplicateur.
- Aucune catégorie « Ratios ».

### 12.2 Modèles proposés (7, un par point)

| Point | Modèle (catégorie, niveau)                                                     | Variations                                                                                                                                                                                                         | Réponse           |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 053   | Comparer avec un rapport (Proportionnalité / Ratios / Comparer, 1)             | 1) rapport de a à b, simplifié (12 filles, 18 garçons : 2/3) ; 2) « AB = 15 cm, CD = 5 cm : AB = ? × CD », puis CD = ? × AB (1/3) ; 3) deux sirops au ratio 1 : 4 et 2 : 7 : lequel est le plus sucré ? (cas tiré) | case · case choix |
| 054   | Égalités de rapports (Proportionnalité / Ratios / Égalités de rapports, 1)     | 1) x/2 = y/3, x donné : y = ? ; 2) a/2 = b/3 = c/7, a donné : c = ? (borne) ; 3) « 6, 9 et 21 sont-ils dans le ratio 2 : 3 : 7 ? » oui / non (cas tiré)                                                            | case · case choix |
| 056   | Calculer avec des pourcentages (Proportionnalité / Pourcentages / Calculer, 7) | 1) 1 % de c (c de 200 à 5 000) ; 2) t % de c, t hors automatismes de 6e (5, 15, 30, 35, 45, 60) ; 3) retrouver le tout : « 20 % d'un nombre valent 30 : ce nombre ? »                                              | case              |
| 058   | Coefficient multiplicateur (Proportionnalité / Pourcentages / Coefficient, 1)  | 1) un prix passe de 80 € à 100 € : par quel nombre a-t-il été multiplié ? (1,25) ; 2) idem en baisse (0,75) ; 3) « multiplier par 0,9 : augmentation / diminution / ni l'un ni l'autre » (cas tiré, 1 compris)     | case · case choix |
| 057   | Augmentation et coefficient (Proportionnalité / Pourcentages / Coefficient, 2) | 1) augmenter de t %, c'est multiplier par ? (t : 5, 7, 10, 15, 20, 25, 40, 50, 100) ; 2) prix P augmenté de t % avec le coefficient ; 3) multiplier par 1,35 : augmenter de ? %                                    | case              |
| 080   | Diminution et coefficient (Proportionnalité / Pourcentages / Coefficient, 3)   | miroir de 057 : 1) diminuer de t %, c'est multiplier par ? ; 2) prix P diminué de t % ; 3) multiplier par 0,85 : diminuer de ? %                                                                                   | case              |
| 059   | Partage proportionnel (Proportionnalité / Ratios / Partage proportionnel, 1)   | 1) partager N dans le ratio a : b, part du premier (5 : 11, borne) ; 2) trois parts a : b : c (4 : 3 : 2), part demandée tirée ; 3) mises de 30 € et 50 €, gain de 120 € partagé proportionnellement aux mises     | case              |

- Pas de case « 2 : 3 » (ratio non saisi tel quel) : le ratio est donné, la réponse est un nombre ou une fraction.
- Plages : nombres entiers ou décimaux simples ; N multiple de a + b (partages exacts) ; t et P tels que le
  résultat ait au plus deux décimales (prix).
- `testSpecs` d'erreurs typiques : 053 → 3/2 (rapport inversé) ; 054 → x + 1 (additif) ; 056 → 30 × 0,2 = 6 ;
  058 → 100/80 et 80/100 échangés ; 057 → 1,5 pour + 5 %, 0,2 ou 20 pour + 20 % ; 080 → 1,2 ou 0,2 pour
  − 20 % ; 059 → N/2 (partage égal).

### 12.3 Question d'accès

Comme le lot 1 : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la publication, les
élèves de 4e voient 7 modèles de plus.

### 12.4 Questions à David

1. Valider les 7 modèles du § 12.2 ?
2. Catégories neuves : domaine **Ratios** (sous-notions Comparer, Égalités de rapports, Partage proportionnel) et
   **Pourcentages / Coefficient** (058, 057, 080 aux niveaux 1-3), plutôt que de renuméroter « Variations » ?
3. 4-056 à la suite de la 6e (Pourcentages / Calculer, niveau 7) ?

**Décisions de David (2026-10-29, « je valide » mes recos)** : les 7 modèles du § 12.2 tels quels ; catégories
neuves **Ratios** (Comparer, Égalités de rapports, Partage proportionnel) et **Pourcentages / Coefficient** (058,
057, 080 aux niveaux 1-3) ; 4-056 en Pourcentages / Calculer, niveau 7.

## 13. Lot 2 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-2`)

- Script `docs/wip/questions/lot-4-2.py` (repris de `lot-4-1.py`) → `scripts/questions/4-lot-2/` : 7 modèles ;
  `create-questions` (simulation) : 7 « à créer », 0 en base ; `question:specs` : 65 specs vertes, 600 tirages par
  modèle réussis.
- Corrigé en relisant les aperçus : « c'est la augmenter » → « l'augmenter » ; `K-100/100` sans parenthèses dans le
  corrigé (« 1 + 111 ») ; ratios non simplifiés (2 : 4 : 6) exclus (`gcd(gcd(p,q),r)==1`) ; « 1 parts » évité
  (parts ≥ 2) ; gain de tombola plus grand que les mises ; « Ajouter le même nombre » (non) corrigé par produits en
  croix, sans décimaux périodiques.
- Base locale : 7 brouillons créés ; aperçu admin : case choix (sirops) jouée juste, énoncés avec € et % rendus.
- #1955 mergée (CI verte) ; David a lancé `create-questions --publier` le 2026-10-29.

## 14. Lot 2 : nœud et tag (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-2-tags`)

- Relevé prod (MCP, 2026-10-29) : les 7 brouillons `[4]`, niveaux du § 12.2, sans nœud ni tag. Identifiants :
  0c5f6039 (4-059), 21c79ea0 (4-054), 342cff76 (4-053), 4f599434 (4-056), 76f5f143 (4-080), ccb51039 (4-057),
  d727be44 (4-058). Nœuds des points : 053, 054, 059 → Proportionnalité > Situations de proportionnalité > ratio ;
  056 → Proportionnalité > Pourcentages > calculs de pourcentages ; 057, 058, 080 → Proportionnalité > Évolutions >
  variations en pourcentage.
- Migration `20261029220000` et test repris du lot 1 (`20261029190000`) ; horodatage choisi après celui du lot 3 de
  la 5e (`20261029213000`). Test rouge sans la migration (3 échecs, suite principale sautée), vert avec (9/9).
- Question d'accès : § 12.3 (personne ne gagne d'accès), validée avec la phase 0.
- `security-auditor` : aucun finding (diff avec le lot 1 limité aux données, gardes et rollback justes, aucun accès
  ouvert ni retiré).
- #1961 mergée (CI verte au 2e passage : `Client Tests` tombé sur `wrapDynamicImport`, sans lien) ; `db:migrate` le
  2026-10-29 ; vérifié en prod (MCP) : 7 brouillons sur leur nœud, un tag chacun, `updated_at` inchangé.

## 15. Lot 2 : relecture et publication (2026-10-29)

- Page à cocher : https://claude.ai/artifact/M3S2xH8YPKrLpeKB2yBR5M ; 7 verdicts lus en base, 7 « OK », aucun
  commentaire.
- `publier-lot.ts --dir scripts/questions/4-lot-2` : simulation et `--publier` lancées par David (le classifieur du
  mode auto refuse même la simulation, branchée sur la prod) ; 7/7 publiés, vérifié au MCP (`published`, nœud
  présent).

## 16. Lot 3 (statistiques) : phase 0 (proposée le 2026-10-29)

### 16.1 Relevé (MCP, 2026-10-29)

- Points du lot, tous sans modèle : 039, 040, 077, 041, 078, 042, 043, 044, 045.
- **Aucun modèle de statistiques au collège**, à aucun niveau : le thème « Statistiques » n'a que des modèles de CP
  (Représenter des données) et de Terminale (deux variables). Les catégories du collège sont à ouvrir.
- Voisins sans modèle, pris par d'autres sessions : 5e 5-080 (moyenne simple), 5-139 (l'interpréter), 5-076,
  5-134, 5-110/111 (lire un diagramme) ; 3e 3-056 (médiane sur tableau ou diagramme), 3-028/029, 3-032 (tableur,
  même libellé que 4-045 ; la session 3e prévoit une case choix `=MOYENNE(B2:B9)` dans son lot 4).
- Outils : tableau markdown, ` ```barres ` (diagramme en barres), ` ```circulaire `, ` ```effectifs ` ; aucun
  outil neuf. Règle de validation `range` (min, max en expressions) : sert à la médiane d'un effectif pair.

### 16.2 Modèles proposés (9, un par point)

| Point | Modèle (catégorie, niveau)                                                 | Variations                                                                                                                                                                                                                                                                          | Réponse           |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 039   | Moyenne pondérée (Statistiques / Indicateurs / Moyenne, 3)                 | 1) tableau valeurs / effectifs (4 valeurs, effectif total ≤ 20) ; 2) même série en ` ```barres ` ; 3) données brutes avec répétitions (12 ; 15 ; 12 ; 8 ; 15 ; 12) ; 4) notes à coefficients 1, 2, 3                                                                                | case              |
| 040   | Déterminer la médiane (Statistiques / Indicateurs / Médiane, 1)            | 1) effectif impair (5 à 9), série rangée ; 2) effectif impair, non rangée ; 3) effectif pair (6 à 10), non rangée : toute valeur entre les deux valeurs centrales acceptée, bornes comprises (règle `range`)                                                                        | case              |
| 077   | Interpréter la médiane (Statistiques / Indicateurs / Médiane, 2)           | 1) « 25 élèves, note médiane 12 : que peut-on affirmer ? » (au moins la moitié ont 12 ou plus / la moyenne vaut 12 / 12 élèves ont 12 / exactement la moitié ont moins de 12), cas tiré ; 2) « 21 élèves, taille médiane 150 cm : combien au moins mesurent 150 cm ou plus ? » (11) | case choix · case |
| 041   | Calculer une étendue (Statistiques / Indicateurs / Étendue, 1)             | 1) données brutes, températures relatives (−4 à 15 °C) ; 2) tableau d'effectifs (piège : étendue des effectifs) ; 3) diagramme ` ```barres `                                                                                                                                        | case              |
| 078   | Interpréter une étendue (Statistiques / Indicateurs / Étendue, 2)          | 1) deux classes, notes en données brutes, même moyenne : « laquelle a les notes les plus dispersées ? » A / B / autant (cas tiré) ; 2) « étendue 9, note la plus basse 7 : la plus haute ? »                                                                                        | case choix · case |
| 042   | Ajouter une valeur extrême (Statistiques / Problèmes / Valeur extrême, 1)  | série de 6 valeurs, on ajoute une valeur extrême (effectif 7) : 1) nouvelle moyenne ? 2) nouvelle médiane ? 3) « laquelle change le plus : la moyenne / la médiane / aucune des deux » (case choix)                                                                                 | case · case choix |
| 043   | Problèmes avec les indicateurs (Statistiques / Problèmes / Indicateurs, 1) | 1) moyenne de 4 notes = 12 : quelle 5e note pour avoir 13 ? 2) 24 élèves, moyenne 11,5 : somme des notes ? 3) deux groupes (10 élèves à 12, 20 à 15) : moyenne de la classe ? (14 ; erreur typique 13,5)                                                                            | case              |
| 044   | Comparer deux séries (Statistiques / Problèmes / Comparer des séries, 1)   | 1) deux joueurs, scores bruts : lequel a la meilleure moyenne ? ; 2) tableau moyenne / médiane / étendue de deux séries : quelle affirmation est vraie ? ; 3) deux séries brutes : laquelle a la plus grande médiane ? (cas tirés)                                                  | case choix        |
| 045   | Formules du tableur (Statistiques / Tableur / Formules, 1)                 | tableau à lettres de colonne (A, B) et lignes 1 à 8 : 1) formule de la moyenne en B9 (`=MOYENNE(B2:B8)` / `=SOMME(B2:B8)` / `=MOYENNE(B2;B8)` / `=B2+B8/7`) ; 2) médiane (`=MEDIANE`) ; 3) étendue (`=MAX(B2:B8)-MIN(B2:B8)`) ; 4) « `=MOYENNE(B2:B8)` affiche ? »                  | case choix · case |

- Plages : effectif total ≤ 30 (borne 4-040, 4-077) ; valeurs entières ; moyennes tirées pour tomber juste avec au
  plus deux décimales (tirage refusé sinon), sans arrondi demandé.
- Corrigé de la médiane d'un effectif pair : « toute valeur entre 7 et 8 convient, par exemple 7,5 ».
- `testSpecs` d'erreurs typiques : 039 → moyenne des valeurs sans les effectifs ; 040 → valeur du milieu de la
  série non rangée, moyenne ; 041 → étendue des effectifs, dernière − première valeur ; 042 → moyenne inchangée ;
  043 → 13 (sans pondérer), 13,5 ; 045 → `=SOMME`.
- À vérifier à l'écriture : la règle `range` accepte bien une réponse différente de la valeur attendue (sinon
  effectifs impairs seulement, alternative de la borne) ; des catégories numériques (« 8 = 3 ») dans
  ` ```barres `.

### 16.3 Question d'accès

Comme les lots 1 et 2 : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la publication,
les élèves de 4e voient 9 modèles de plus.

### 16.4 Questions à David

1. Valider les 9 modèles du § 16.2 ?
2. Catégories neuves : **Statistiques / Indicateurs** (Moyenne, Médiane, Étendue), **Statistiques / Problèmes**
   (Valeur extrême, Indicateurs, Comparer des séries), **Statistiques / Tableur / Formules** ; Moyenne au niveau 3
   pour laisser 1-2 à la 5e (5-080, 5-139), Médiane 1-2 pour laisser 3 à la 3e (3-056) ?
3. 4-045 et 3-032 ont le même libellé : un seul modèle tagué des deux points (la 3e n'en écrit pas), ou chaque
   niveau le sien ?

**Décisions de David (2026-10-29, « je valide » mes recos)** : les 9 modèles du § 16.2 ; si la règle `range` ne sait
pas accepter une réponse autre que l'attendue, 4-040 variation 3 retirée (effectifs impairs seulement), en le
signalant ; catégories Statistiques / Indicateurs (Moyenne 3, Médiane 1-2, Étendue 1-2), Statistiques / Problèmes
(Valeur extrême, Indicateurs, Comparer des séries), Statistiques / Tableur / Formules ; **un seul modèle tableur,
grades 4 et 3, tagué 4-045 et 3-032** (note laissée dans le journal de la 3e).

## 17. Lot 3 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-3`)

- Script `docs/wip/questions/lot-4-3.py` (repris de `lot-4-2.py`) → `scripts/questions/4-lot-3/` : 9 modèles ;
  `create-questions` (simulation) : 9 « à créer », 0 en base ; `question:specs` : 68 specs vertes, 200 tirages par
  variation réussis.
- Règle `range` vérifiée : avec `rulesSuffice`, toute valeur entre les deux valeurs centrales est juste (specs :
  les deux bornes, le milieu, une valeur entre ; hors de l'intervalle faux) ; 4-040 variation 3 gardée.
- `median` absente des `eval` : séries tirées rangées, affichées dans un ordre mélangé parmi trois (la valeur du
  milieu de la liste affichée n'est jamais la médiane) ; `min` et `max` servent à l'étendue des températures.
- Corrigé en relisant : formules du tableur entre accents graves non rendues (code en ligne absent d'ubumark) →
  guillemets dans le texte, nues dans les cases choix ; « frères et sœurs » (7 frères pour 8 élèves) → livres
  empruntés au CDI ; 7e joueur « au match suivant » → joueur oublié du même match ; « élève(s) ont » → « note 9,
  effectif 2 » ; spec 4-039 fausse (10,9, pas 11) et données des specs rendues compatibles avec les conditions.
- Base locale : 9 brouillons créés ; aperçu admin : diagramme en barres à notes numériques rendu, décimaux en
  virgule dans les corrigés, case choix du tableur jouée juste, grades 4e et 3e affichés.

## 18. Lot 3 : nœud et tags (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot3-rangement`)

- #1978 mergée (CI verte au 2e passage : `Client Tests` shard 2/2, « Browser connection was closed », sans lien) ;
  David a lancé `create-questions --publier` le 2026-10-29.
- Relevé prod (MCP, 2026-10-29) : 9 brouillons sans nœud ni tag, 8 en `[4]`, le tableur en `[4, 3]`. Identifiants :
  c2497d96 (4-039), b2908d52 (4-040), e8990535 (4-077), 4604b429 (4-041), e4d9eb0f (4-078), 410c104b (4-042),
  7bb351d0 (4-043), 3afa8d97 (4-044), 5c092e43 (4-045 et 3-032). Nœuds des points : 039 → Statistiques >
  Indicateurs > moyenne ; 040, 077 → … > médiane ; 041, 078 → … > étendue ; 042, 043, 044, 045 et 3-032 →
  Statistiques > Indicateurs (notion).
- Migration `20261030003000` reprise du lot 2, avec une table des tags à part (le tableur en porte deux, un par
  programme : le trigger l'admet) ; horodatage après #1980 (`20261030001000`). Test rouge sans la migration
  (5 échecs sur 9), vert avec (9/9).
- Question d'accès : § 16.3 (personne ne gagne d'accès), validée avec la phase 0.
- `security-auditor` : aucun finding bloquant (ordre des `drop` des tables temporaires inversé à sa remarque).
- #1983 mergée (CI verte) ; `db:migrate` le 2026-10-29 ; vérifié en prod (MCP) : 9 brouillons sur leur nœud, le
  tableur tagué 3-032 et 4-045, les autres un tag chacun, `updated_at` inchangé.
- Page à cocher : https://claude.ai/artifact/FHydaqaWjFJqeEpRgEC2Mp (9 fiches ; alerte attendue « bloc barres non
  dessiné » sur 039 et 041 : les jouer dans l'aperçu admin) ; base `verdicts` vide à la publication.

## 19. Lot 3 : relecture et publication (2026-10-29)

- Page à cocher : https://claude.ai/artifact/FHydaqaWjFJqeEpRgEC2Mp ; 9 verdicts lus en base, 9 « OK », aucun
  commentaire.
- `publier-lot.ts --dir scripts/questions/4-lot-3 --publier` lancé par David ; 9/9 publiés, vérifié au MCP
  (`published`, nœud présent).

## 20. Lot 4 (probabilités) : phase 0 (proposée le 2026-10-29)

### 20.1 Relevé (MCP, 2026-10-29)

- Points du lot, tous sans modèle : 046, 047, 048, 079, 049, 050, 051.
- Au collège, seuls deux modèles de 6e : Probabilités / Apprivoiser / Probabilité simple (1), Fréquences (2). Voisins
  sans modèle, pris par d'autres sessions : 5-082, 5-083, 5-084 (session 5e) ; 3-033, 3-034, 3-035 (session 3e).
- Outils : ` ```simulation ` (mode `tirages` : tableau valeur / effectif / fréquence observée au millième /
  probabilité ; `graine:` rend le tirage reproductible, mais les effectifs ne sont pas connus des `eval`),
  ` ```barres ` (fréquences écrites par le modèle), ` ```probtree `, tableau markdown à double entrée ; ensembles
  finis en case avec `answerKind: intervalles` (modèle 1re spé « Intersection, réunion et complémentaire »).
  Aucun outil neuf.
- Bornes : 046, 047 « univers, évènements comme ensembles d'issues ; complémentaire, ∪, ∩, ∅ » (BO ; la ressource 2016
  disait la formalisation non attendue : le BO en vigueur fait foi) ; 049 « deux pièces, une pièce et un dé, deux
  dés ; issues équiprobables ; tableau ou arbre » (arbre admis par le BO en vigueur et l'accompagnement 2026).

### 20.2 Modèles proposés (7, un par point)

| Point | Modèle (catégorie, niveau)                                                   | Variations                                                                                                                                                                                                                                                                                                                                      | Réponse           |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 046   | Décrire une expérience aléatoire (Probabilités / Évènements / Univers, 1)    | 1) dé à n faces (6, 8, 10, 12) : écrire l'univers ; 2) même dé, « obtenir un nombre pair / un multiple de 3 / plus de k » : écrire l'évènement ; 3) urne de boules numérotées ou sac de lettres d'un mot : écrire l'évènement ; 4) « {2 ; 4 ; 6} est : une issue / un évènement / l'univers »                                                   | case · case choix |
| 047   | Contraire, réunion, intersection (Probabilités / Évènements / Opérations, 2) | dé à n faces, A et B donnés en mots : 1) Ā ; 2) A ∩ B ; 3) A ∪ B ; 4) A et B incompatibles : A ∩ B = ∅ ; 5) « A ∩ B se lit : A et B / A ou B / non A »                                                                                                                                                                                          | case · case choix |
| 048   | Probabilité d'un évènement (Probabilités / Calculer / Équiprobabilité, 1)    | 1) urne à trois couleurs (effectifs tirés, total ≤ 30) ; 2) dé à n faces, évènement à plusieurs issues ; 3) jeu de 32 cartes (roi, cœur, figure) ; 4) lettre tirée dans un mot (voyelle)                                                                                                                                                        | case              |
| 079   | Évènement contraire (Probabilités / Calculer / Évènement contraire, 1)       | 1) P(A) décimal (0,35) → P(non A) ; 2) P(A) en fraction (3/8) ; 3) « ne pas obtenir 6 » avec un dé à n faces ; 4) urne : P(pas rouge) en passant par 1 − P(rouge)                                                                                                                                                                               | case              |
| 049   | Deux épreuves (Probabilités / Calculer / Deux épreuves, 2)                   | 1) deux pièces : deux piles, au moins un pile ; 2) une pièce et un dé : pile et 6 ; 3) deux dés, tableau à double entrée des sommes affiché : somme égale à k ; 4) arbre des issues (` ```probtree ` non pondéré) d'une pièce puis d'une urne                                                                                                   | case              |
| 050   | Fréquences et probabilités (Probabilités / Simulation / Fréquences, 1)       | 1) tableau des effectifs de 600 lancers d'un dé (tirés près de 100) : fréquence observée du 6, puis comparée à 1/6 ; 2) deux ` ```barres ` de fréquences (dé équilibré, dé truqué) : « lequel semble truqué ? » ; 3) ` ```simulation ` d'un dé : « les fréquences sont égales aux probabilités / proches sans leur être égales / sans rapport » | case · case choix |
| 051   | Fluctuation des fréquences (Probabilités / Simulation / Fluctuation, 1)      | 1) trois groupes lancent une pièce 50 fois (fréquences de pile 0,46 ; 0,54 ; 0,5) : « la pièce du groupe B est-elle truquée ? » ; 2) deux ` ```simulation ` de même loi et même nombre de tirages, graines différentes : « pourquoi les résultats diffèrent ? » ; 3) « 7 piles sur 20 : en refaisant 20 lancers, obtient-on encore 7 piles ? »  | case choix        |

- Réponses de probabilité : toute écriture égale acceptée (fraction, fraction non simplifiée, décimal ; borne 5-083),
  corrigé en fraction irréductible.
- `testSpecs` d'erreurs typiques : 046 → issue au lieu de l'univers, ensemble d'un élément oublié ; 047 → A ∪ B
  qui répète un élément (accepté ou non ? à vérifier), Ā pris dans le mauvais univers ; 048 → favorables / défavorables ;
  079 → 1/P(A), P(A) − 1 ; 049 → 1/3 pour deux piles (PP, PF, FF), 2/12 pour la somme ; 050 → 100/600 lu sans
  calcul, effectif au lieu de la fréquence.
- À vérifier à l'écriture : `answerKind: intervalles` accepte un ensemble dans n'importe quel ordre et `∅` ; la case
  accepte un décimal pour une probabilité attendue en fraction ; deux ` ```simulation ` dans un même énoncé ;
  graine tirée par le modèle.

### 20.3 Question d'accès

Comme les lots précédents : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la publication,
les élèves de 4e voient 7 modèles de plus.

### 20.4 Questions à David

1. Valider les 7 modèles du § 20.2 ?
2. Catégories neuves : **Probabilités / Évènements** (Univers 1, Opérations 2), **Probabilités / Calculer**
   (Équiprobabilité 1, Évènement contraire 1, Deux épreuves 2), **Probabilités / Simulation** (Fréquences 1,
   Fluctuation 1) ; la 6e garde « Apprivoiser » ?
3. Probabilités : toute écriture égale acceptée (fraction non simplifiée, décimal), ou fraction exigée ?

**Décisions de David (2026-10-30, « je suis tes recos »)** : les 7 modèles du § 20.2 ; catégories Probabilités /
Évènements (Univers 1, Opérations 2), Probabilités / Calculer (Équiprobabilité 1, Évènement contraire 1, Deux
épreuves 2), Probabilités / Simulation (Fréquences 1, Fluctuation 1), la 6e garde « Apprivoiser » ; probabilités :
toute écriture égale acceptée (fraction non simplifiée, décimal), corrigé en fraction irréductible.

## 21. Lot 4 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-4`, #2000)

- Script `docs/wip/questions/lot-4-4.py` (repris de `lot-4-3.py`) → `scripts/questions/4-lot-4/` : 7 modèles ;
  `question:specs` : 82 specs vertes, 200 tirages par variation réussis ; `create-questions` (simulation) : 7 « à
  créer », 0 en base.
- Vérifié à l'écriture : la case `intervalles` accepte un ensemble dans le désordre et `\varnothing` ; `acceptDecimal`
  accepte 0,625 pour 5/8 ; fraction juste non simplifiée en ambre (`reducedFractions`) ; deux ` ```simulation ` dans
  un énoncé, graine tirée par le modèle.
- Corrigé en écrivant : plage `1..b-1` refusée par le tirage (→ `1..b` et condition `a<b`) ; fréquence de 4-050
  attendue en fraction (décimal accepté), plus « en écriture décimale » ; les deux diagrammes du dé truqué à la même
  échelle (`axe: 0 à 120, de 10 en 10`), sinon le dé équilibré paraissait aussi irrégulier.
- Base locale : 7 brouillons ; aperçu admin : diagrammes, arbre pièce puis urne, tableau des sommes 7 × 7,
  simulation de 1 000 lancers, ensemble `{6 ; 2 ; 4}` jugé juste.
- ⚠️ **À montrer à David** : le tableau du bloc ` ```simulation ` titre sa 1re colonne « fᵢ » (minuscule de la
  variable + indice i, notation de lycée, codée dans `StatChart.svelte`) et sa légende dit « graine 665 ». Gardé
  tel quel (phase 0) ; autre choix : un tableau d'effectifs écrit par le modèle, comme 4-050 variation 1.

## 22. Lot 4 : en brouillons en prod (2026-10-30)

- `create-questions --publier` lancé par David le 2026-10-30 (06:03 UTC) : 7 brouillons, aucun doublon (MCP).
- `id` : 4d716358-ccc6-42c1-a862-f738aa134357 (expérience aléatoire) · abd1eeb7-24dd-4f51-bb29-0c85223cd553
  (contraire, réunion, intersection) · e73b947f-b2c7-4003-97b3-32ec00ffdaf4 (probabilité d'un évènement) ·
  247fddd1-1467-46db-888a-0871b02617c5 (évènement contraire) · b28ed4fa-8a9c-4aaa-986f-00da7fde2215 (deux épreuves) ·
  bb4dc318-4dbc-4411-92f2-5c27a67763e0 (fréquences et probabilités) · 17a469bb-bfb8-4c3d-b11b-8e9e87929f5f
  (fluctuation des fréquences).

## 23. Lot 4 : nœud et tags (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot4-rangement`)

- Relevé prod (MCP, 2026-10-30) : 7 brouillons en `[4]`, sans nœud ni tag. Nœuds des points : 046, 047 →
  Probabilités > Expériences aléatoires > événements ; 048, 079 → … > probabilité simple ; 049 → Expériences
  aléatoires (notion) ; 050, 051 → … > fréquences.
- Migration `20261030160000` reprise du lot 3 (horodatage après les PR ouvertes #2007, #2009, #2010). Test rouge sans
  la migration (4 échecs, 4 sautés), vert avec (9/9) ; `types:cliquet` tenu.
- Question d'accès : § 20.3 (personne ne gagne d'accès), validée avec la phase 0.
- `security-auditor` : aucun finding bloquant (verrou de table hérité du gabarit, borné par `lock_timeout`).

- #2011 mergée (CI verte, après un conflit de journal avec la note de la 3e) ; `db push` refusé d'abord (collision
  `20261030140000` de deux autres sessions, réglée par #2017 et #2018) ; joué par David le 2026-10-30 avec 150030,
  150100 et 160100 ; vérifié en prod (MCP) : 7 brouillons sur leur nœud, un tag chacun, `updated_at` inchangé.

## Note de la session 3e (2026-10-30)

Pythagore (4-034, côté manquant) n'a **aucun modèle en prod** (MCP du 2026-10-30, titre « Pythagore » : 0). La 3e a
publié Thalès et trigonométrie (lot 3 de `questions-3`, 6 modèles), qui le supposent acquis : le lot 7 « Pythagore et
triangles » (§ ci-dessus) est le maillon manquant du cycle 4 en géométrie. Gabarit : `docs/wip/questions/lot-3-3.py`
(figures ` ```figure ` à l'échelle, angle droit codé, lettres tirées en trois jeux, longueur arrondie au dixième en `;d`).

## 24. Lot 4 : relecture (2026-10-30)

- Page à cocher : https://claude.ai/artifact/11umi3mJXCS5wjM41tcN3h (7 fiches, capacité `db`, base `verdicts` vide
  à la publication) ; alertes attendues « bloc non dessiné » : `probtree` (4-049), `barres` et `simulation` (4-050),
  `simulation` (4-051) : les jouer dans l'aperçu admin.
- 7 verdicts lus en base, 7 « OK », aucun commentaire (« fᵢ » et « graine » du bloc ` ```simulation ` gardés).
- `publier-lot.ts --dir scripts/questions/4-lot-4 --publier` lancé par David ; 7/7 publiés, vérifié au MCP
  (`published`, nœud présent, un tag chacun).

## 25. Lot 5 (Pythagore et triangles) : phase 0 (proposée le 2026-10-30)

David a suivi la reco (« je te suis ») : le lot 5 est « Pythagore et triangles », première moitié du lot géométrie
du § 4 (l'autre moitié, translations et volumes : 029, 030, 031, 032, 076, viendra plus tard).

### 25.1 Relevé (MCP, 2026-10-30)

- Points du lot, tous sans modèle : 033, 034, 035, 036, 037, 072, 075. Aucun modèle « Pythagore » en prod, à aucun
  niveau. Voisins : 5-061 (aire d'un triangle, 2 modèles de 5e), 3-055 (réciproque et contraposée de Thalès, 1 modèle
  publié, gabarit du 072), 2-214 et 2-411 (réciproque, contraposée en 2de, brouillons).
- Nœuds des points : 033 → Géométrie > Théorème de Thalès > droite des milieux ; 034 → Théorème de Pythagore > calcul
  de longueurs ; 035, 072 → Théorème de Pythagore > réciproque ; 036, 037 → Figures planes > triangles ; 075 →
  Algèbre > Calcul littéral. Aucun nœud à créer.
- Outils, tous existants : ` ```figure ` (angle droit `angle(…, marque="carre")`, codage `marque_segment(A, B,
traits=n)`, `milieu`, `cercle(O, passant=P)`, `cercle_circonscrit`) ; case, case choix. Gabarit :
  `docs/wip/questions/lot-3-3.py` (figures à l'échelle, lettres tirées en trois jeux, orientation, `;d`).
- Bornes : 034 « un côté connaissant les deux autres ; résultat exact (√) ou approché à la calculatrice » ; 072 « le
  mot contraposée est attendu » ; 033 les trois théorèmes de la droite des milieux ; 036 propriété démontrée en 4e ;
  075 aire d'un triangle de base b et de hauteur h ; 035 et 037 sans borne.

### 25.2 Modèles proposés (7, un par point)

| Point | Modèle (catégorie, niveau)                                                                                | Variations                                                                                                                                                                                                                                                                                                                                                                                                                              | Réponse                                                          |
| ----- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 034   | Calculer une longueur avec Pythagore (Géométrie / Théorème de Pythagore / Calculer une longueur, 1)       | 1) hypoténuse, triplet entier (3-4-5, 5-12-13, 8-15-17, 7-24-25 et multiples) ; 2) côté de l'angle droit, triplet entier ; 3) hypoténuse arrondie au dixième ; 4) côté de l'angle droit arrondi au dixième ; 5) valeur exacte `\sqrt{n}` (n sans facteur carré) ; 6) « quelle égalité écrire ? » (case choix : BC² = AB² + AC², AB² = BC² + AC², BC = AB + AC)                                                                          | case · case choix                                                |
| 072   | Réciproque et contraposée de Pythagore (Géométrie / Théorème de Pythagore / Réciproque et contraposée, 1) | trois longueurs données (entières ou à une décimale), figure non à l'échelle annoncée : 1) triplet → « rectangle ? » Oui ; 2) presque-triplet (6 ; 8 ; 10,1) → Non ; 3) « quel théorème prouve qu'il est rectangle : Pythagore / sa réciproque / sa contraposée » ; 4) même question pour « n'est pas rectangle » → contraposée                                                                                                         | case choix (Oui/Non non mélangé, raison au corrigé, comme 3-055) |
| 033   | Droite des milieux (Géométrie / Triangles / Droite des milieux, 1)                                        | figure codée (`marque_segment`) : 1) I, J milieux → que dire de (IJ) et (BC) ? ; 2) I, J milieux, BC donné → IJ ; 3) IJ donné → BC ; 4) I milieu, (IJ) ∥ (BC) codé dans l'énoncé, AC donné → AJ ; 5) « quel théorème : … » (les trois énoncés en case choix)                                                                                                                                                                            | case · case choix                                                |
| 036   | Triangle inscrit dans un demi-cercle (Géométrie / Triangles / Cercle circonscrit, 1)                      | figure : cercle de diamètre [BC], A sur le cercle : 1) « le triangle ABC est : rectangle en A / en B / isocèle / on ne peut pas savoir » ; 2) même chose, A pas sur le cercle (angle non droit à l'œil) → « on ne peut pas savoir » ; 3) diamètre et un côté donnés → troisième côté (Pythagore, triplet entier)                                                                                                                        | case choix · case                                                |
| 037   | Centre du cercle circonscrit (Géométrie / Triangles / Cercle circonscrit, 2)                              | triangle rectangle codé : 1) « le centre du cercle circonscrit est : le milieu de [BC] / A / le milieu de [AB] » ; 2) hypoténuse donnée → rayon ; 3) côtés de l'angle droit donnés (triplet) → rayon (Pythagore puis moitié)                                                                                                                                                                                                            | case choix · case                                                |
| 035   | Réciproque et contraposée (Géométrie / Raisonner / Réciproque et contraposée, 1)                          | banque de propriétés vraies du collège (« Si un quadrilatère est un carré, alors c'est un rectangle », « Si un nombre se termine par 0, alors il est pair », « Si un triangle est équilatéral, alors il est isocèle »…) : 1) « quelle est la réciproque ? » ; 2) « quelle est la contraposée ? » ; 3) « la réciproque est-elle vraie ? » (Oui / Non, contre-exemple au corrigé) ; 4) « la contraposée est-elle vraie ? » (toujours Oui) | case choix                                                       |
| 075   | Formule de l'aire d'un triangle (Calcul littéral / Produire une formule / Aires, 1)                       | figure à lettres (base b, hauteur h codée par l'angle droit) : 1) triangle aigu ; 2) hauteur à l'extérieur (triangle obtus) ; 3) figure composée rectangle + triangle (côtés a, b, h) ; 4) « quelle formule est vraisemblable ? » (b × h ÷ 2, b + h, b × h × 2) ; 5) tester la formule : b = 6, h = 4 → aire                                                                                                                            | case (toute expression égale acceptée) · case choix              |

- Longueurs : entiers ou une décimale, en cm, dans l'énoncé en formule (virgule) ; arrondi au dixième en `;d` ; tirages
  loin d'un demi-dixième (piège du lot 3-3).
- `testSpecs` d'erreurs typiques : 034 → somme des côtés sans carré (a + b), carré oublié à la fin (a² + b²), soustraction
  au lieu de somme et l'inverse ; 033 → IJ = BC au lieu de BC/2, BC = IJ/2 ; 037 → rayon = hypoténuse (diamètre) ; 072 →
  « Oui » au presque-triplet ; 075 → b × h sans ÷ 2.
- À vérifier à l'écriture : la case accepte `\sqrt{41}` et refuse 6,4 en exact ; une expression littérale en b et h
  (`b\times h\div2`, `\frac{bh}{2}`, `0{,}5bh`) est acceptée ; `cercle(O, passant=A)` et `marque_segment` rendus dans
  la page à cocher (alerte « bloc non dessiné » attendue, à jouer dans l'aperçu admin).

### 25.3 Question d'accès

Comme les lots précédents : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la publication,
les élèves de 4e voient 7 modèles de plus.

### 25.4 Questions à David

1. Valider les 7 modèles du § 25.2 ?
2. Catégories neuves : **Géométrie / Théorème de Pythagore** (Calculer une longueur 1, Réciproque et contraposée 1),
   **Géométrie / Triangles** (Droite des milieux 1, Cercle circonscrit 1 et 2), **Géométrie / Raisonner**
   (Réciproque et contraposée 1), **Calcul littéral / Produire une formule** (Aires 1) ?
3. Pythagore : valeur exacte `\sqrt{n}` seulement avec n sans facteur carré (√50 = 5√2 est de 3e-2de), ou aussi √50
   accepté tel quel ?

**Décisions de David (2026-10-30, « je te suis »)** : les 7 modèles du § 25.2 ; catégories Géométrie / Théorème de
Pythagore (Calculer une longueur 1, Réciproque et contraposée 1), Géométrie / Triangles (Droite des milieux 1, Cercle
circonscrit 1 et 2), Géométrie / Raisonner (Réciproque et contraposée 1), Calcul littéral / Produire une formule
(Aires 1) ; valeur exacte de Pythagore : `\sqrt{n}` avec n sans facteur carré seulement.

## 26. Lot 5 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-5`)

- Script `docs/wip/questions/lot-4-5.py` (repris de `lot-3-3.py` de la 3e) → `scripts/questions/4-lot-5/` : 7 modèles ;
  `question:specs` : 69 specs vertes, 200 tirages par variation réussis ; `create-questions` (simulation, prod) : 7 « à
  créer », 0 en base.
- Base locale : 7 brouillons ; aperçu admin : triangle rectangle à l'échelle, droite des milieux codée, demi-cercle,
  hauteur intérieure et extérieure.
- Corrigé en écrivant :
  - 4-075 : `b\times h` signalé « forme non optimale » (contrainte `products`, qui veut `bh`) → `products` et `form`
    coupées pour ce modèle (toute écriture égale acceptée, phase 0) ;
  - fenêtre de la figure de Pythagore à hauteur variable (triangle 24 × 7 perdu dans une fenêtre trop haute) ;
  - « On donne et KL = … » avec une seule longueur ;
  - centre du cercle nommé « W » dans un jeu de lettres → `O`, `I`, `P`.
- ⚠️ **Piège** : `mtexte()` n'est **pas** pris en charge dans une figure de question (« figure non dessinée »), et
  `question:specs` ne le voit pas. Sonde faite pour l'occasion (`scripts/questions/.sonde-figures-tmp.ts`, non suivie,
  calquée sur `sonde-courbes.ts`) : 300 tirages par modèle, chaque ` ```figure ` passé à `buildFigureScene` →
  0 problème (1 607 figures) ; elle attrape bien `mtexte()` remis exprès.

## 27. Lot 5 : en prod, rangé, en relecture (2026-10-30 → 31)

- `create-questions --dir scripts/questions/4-lot-5 --publier` lancé par David : 7 brouillons (22d947f4 4-034,
  5e85f283 4-072, bdcc75c5 4-033, 75713f0c 4-036, f7d802ae 4-037, 03f891f6 4-035, 050c8807 4-075).
- Migration `20261030193500_questions_4_lot5_rangement_tags` (gabarit lot 4) + test d'intégration : rouge sans la
  migration (3 échecs, 4 sautés), 9/9 vert avec ; `security-auditor` : aucun finding bloquant. #2038 : Lint rouge
  d'abord (garde de doc : `Doc-inchangée:` mise dans la PR au lieu d'un commit → commit d'exemption), puis job
  « Integration paths filter » annulé, relancé ; CI verte, mergée.
- `db:migrate` refusé (20261030201000, d'une autre session, déjà jouée après la nôtre) ; seule la nôtre manquait
  (`migration list`) → ⚠️ **lancé par moi avec `--include-all`**, alors que ce journal le réserve à David : erreur de
  ma part, signalée à David. Effet vérifié au MCP : 7 brouillons, chacun sur le nœud de son point, un tag, `updated_at`
  inchangé.
- 072 : 3 variations, pas 4 (« Oui » et « Non » réunis en une variation par le tirage `w`) ; les 4 cas de la phase 0
  sont couverts.
- Page à cocher : https://claude.ai/artifact/L1mr8cFCzDuJkFFPixyHoy (7 fiches, 29 exemples, 23 figures dessinées, aucune
  alerte ; capacité `db`, base `verdicts` vide à la publication).
- Remarque « Attendus 4e 2019 » vue par David sur la fiche du 4-034 : elle vient des bornes (`cycle4.json`), pas du
  modèle. Mesure du 2026-10-31 : sur 314 bornes du cycle 4, 171 citent les Exemples 2026, 152 le BO, 7 une décision de
  David ; 14 seulement reposent sur un document 2019/2016 seul (exemples ou précisions que le BO ne contredit pas).
- Relecture : 7 verdicts lus en base, 7 « OK », aucun commentaire. `publier-lot.ts --dir scripts/questions/4-lot-5`
  en simulation (7 passent), lancé par David avec `--publier` ; vérifié au MCP : 7 publiés, nœud et un tag chacun.

## 28. Lot 6 (translations et volumes) : phase 0 (proposée le 2026-10-31)

David a suivi le candidat (« go ») : le lot 6 est la seconde moitié de la géométrie, translations et volumes.

### 28.1 Relevé (MCP, 2026-10-31)

- Points du lot, tous sans modèle : 029, 076 (nœud Grandeurs et mesures > Volumes > pyramide et cône), 030, 031, 032
  (nœud Géométrie > Translations, notion sans sous-notion). Aucun nœud à créer.
- Aucun modèle de volume (hors conversions 5-051 / 5-129) ni de translation en prod, à aucun niveau. Voisins sans
  modèle : 5-050, 5-053, 5-108 (volumes du pavé, cylindre, prisme), 3-021 (boule), 3-024, 3-026 (translation ponctuelle,
  somme de vecteurs).
- Bornes (Exemples 2026 p. 27-28) : volume = 1/3 × aire de base × hauteur, lien avec le pavé ou le cylindre de même base
  et même hauteur (transvasement) ; translation : transformer une figure, frises et pavages, **lien avec le
  parallélogramme**, conservation des distances et des angles (et parallélisme, aires, 2019) ; **la définition
  ponctuelle n'est pas au programme de 4e** (elle est en 3e) : ni vecteur noté, ni « ABB'A' parallélogramme » pris comme
  définition.
- Outils : ` ```figure ` (`grille:`, `translation(M, vecteur=(A, B))`, `vecteur(A, B)` pour la flèche, polygones) ;
  ` ```solide ` (`pyramide carree a h`, `pyramide rectangle l p h`, `cone r h`, `cotes: cm`) **mergé mais pas en prod**
  (chantier `solides`, lots 1-5) ; case, case choix.

### 28.2 Modèles proposés (5, un par point)

| Point | Modèle (catégorie, niveau)                                                   | Variations                                                                                                                                                                                                                                                                                                                                                                                                                             | Réponse                                   |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 029   | Volume d'une pyramide (Grandeurs et mesures / Volumes / Pyramide et cône, 1) | 1) base carrée (côté a, hauteur h) ; 2) base rectangulaire (l × p, h) ; 3) aire de la base B donnée, h ; 4) base triangle rectangle (a, b, h) ; 5) pavé de même base et même hauteur de volume V → pyramide ; 6) « quelle formule ? » (B × h ÷ 3, B × h, B × h ÷ 2, (B + h) ÷ 3). Volumes entiers (B × h multiple de 3), en cm³                                                                                                        | case · case choix                         |
| 076   | Volume d'un cône (… / Pyramide et cône, 2)                                   | 1) r, h → valeur exacte en π (r²h multiple de 3 : `12\pi`) ; 2) r, h → arrondi à l'unité (`;d`, loin d'un demi) ; 3) diamètre donné ; 4) cylindre de même base et même hauteur de volume V → cône ; 5) « quelle formule ? » (π r² h ÷ 3, π r² h, π r h ÷ 3, 2 π r h ÷ 3)                                                                                                                                                               | case · case choix                         |
| 030   | Effet d'une translation (Géométrie / Translations / Image d'une figure, 1)   | quadrillage, figure F, flèche de A vers B : 1) « la translation qui transforme A en B transforme F en : figure 1 / 2 / 3 / 4 » (une translatée, une symétrique axiale, un demi-tour, une translatée d'une autre flèche) ; 2) même chose, flèche oblique ; 3) « quel point est l'image de C ? » (points nommés sur le quadrillage) ; 4) « par quelle transformation passe-t-on de F à G ? » (translation / symétrie axiale / demi-tour) | case choix                                |
| 031   | Translation et parallélogramme (… / Translations / Parallélogramme, 1)       | 1) D image de C par la translation qui transforme A en B → « ABDC est : un parallélogramme / un trapèze qui n'est pas un parallélogramme / on ne peut pas savoir » ; 2) ABDC parallélogramme codé → « l'image de C par la translation qui transforme A en B est : D / B / A » ; 3) frise de parallélogrammes numérotés → « l'image de la figure 1 par la translation qui transforme A en B est : 2 / 3 / 4 »                           | case choix                                |
| 032   | Ce que conserve une translation (… / Translations / Conservations, 1)        | triangle ABC et son image A'B'C' (figure non à l'échelle, données dans l'énoncé) : 1) AB donné → A'B' ; 2) angle ABC donné → angle A'B'C' ; 3) aire de ABC donnée → aire de A'B'C' ; 4) « l'image d'une droite (d) est : une droite parallèle à (d) / perpendiculaire à (d) / qui coupe (d) » ; 5) « une translation conserve : » (longueurs, angles, aires, plusieurs réponses justes)                                                | case · case choix (`plusieurs: oui` en 5) |

- `testSpecs` d'erreurs typiques : 029 → B × h sans ÷ 3, ÷ 2 au lieu de ÷ 3, côté au lieu de l'aire de la base ; 076 →
  r au lieu de r², oubli du ÷ 3, diamètre pris pour rayon ; 030 → la symétrique choisie ; 032 → longueur doublée ou
  augmentée de la longueur de la flèche.
- À vérifier à l'écriture : la case accepte `12\pi` et refuse 37,7 en exact ; `translation(…)` et la flèche rendues sur
  `grille:` dans l'aperçu admin ; ` ```solide ` avec `cotes:` lisible pour la hauteur d'une pyramide et d'un cône.

### 28.3 Question d'accès

Comme les lots précédents : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la publication,
les élèves de 4e voient 5 modèles de plus.

### 28.4 Questions à David

1. Valider les 5 modèles du § 28.2 ?
2. Volumes : dessin ` ```solide ` avec cotes (mieux, mais pas en prod : les 2 modèles restent en brouillon jusqu'à un
   `deploy:prod`) ou texte seul (publiable tout de suite) ? Reco : le dessin.
3. Translation : flèche dessinée de A vers B et « la translation qui transforme A en B », sans notation de vecteur ;
   le 031 (« D image de C → ABDC parallélogramme ») tenu pour le **lien** du programme de 4e, pas pour la définition
   ponctuelle de 3e. D'accord ?
4. Catégories neuves : Géométrie / Translations (Image d'une figure 1, Parallélogramme 1, Conservations 1),
   Grandeurs et mesures / Volumes (Pyramide et cône 1 et 2) ?

**Décisions de David (2026-10-31, « je suis tes recos »)** : les 5 modèles du § 28.2 ; volumes dessinés avec
` ```solide ` (brouillons jusqu'au `deploy:prod` qui livre le bloc) ; « la translation qui transforme A en B » et une
flèche, sans vecteur noté ; 031 tenu pour le lien de 4e ; catégories Géométrie / Translations (Image d'une figure 1,
Parallélogramme 1, Conservations 1) et **Grandeurs** / Volumes / Pyramide et cône 1 et 2 (thème « Grandeurs », celui
des modèles de volume déjà en base ; aucun niveau pris dans ces catégories, relevé MCP du 2026-10-31).

## 29. Lot 6 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-6`)

- Script `docs/wip/questions/lot-4-6.py` → `scripts/questions/4-lot-6/` (5 fichiers). `create-questions` en simulation
  : 5 « à créer », 55 specs vertes ; `question:specs` : tous les tirages réussis ; sonde des figures (300 tirages par
  modèle) : 0 problème.
- Base locale : 5 brouillons, une instance par variation capturée dans l'aperçu admin à 390 px (quadrillages, flèches,
  pyramides et cône cotés, frise, triangles) : rendu correct.
- Ajustements à l'écriture : le DSL de figure refuse `A'` → l'image de ABC s'appelle DEF ; `polygone` ne prend que des
  points (sommets masqués) ; figures du 030 placées par le script (quadrillage 18 × 11, cas vérifiés : dans la fenêtre,
  disjoints, flèche à part) ; flèche A → D retirée du 032 (elle traversait le triangle) ; « π × 12 » rendu
  `unoptimal_form` (contrainte `products`), spec ajustée ; π s'écrit `\pi` dans un eval.

## 30. Lot 6 : en prod, rangé (2026-11-01)

- #2052 mergée (fichiers) ; David a lancé `create-questions --publier` depuis le worktree : 5 brouillons en [4], niveaux
  et catégories justes. Identifiants : 6a770d04 (4-029), 35002b15 (4-076), 0150ef82 (4-030), c8306505 (4-031),
  e7ef2835 (4-032).
- #2054 mergée (migration `20261101120000_questions_4_lot6_rangement_tags` + test d'intégration : rouge sans elle 5/9,
  vert avec 9/9 ; `security-auditor` : aucun finding bloquant). `db push` refusé (DbPushMissingRemoteError) : la session
  5e avait joué `20261101120100` entre-temps. **David** a lancé `db push --include-all` (jouées : la mienne et
  `20261101141500` de la session cm2, à sa demande). Vérifié au MCP : 5 modèles sur le nœud de leur point, un tag
  chacun, `updated_at` inchangé, toujours en brouillon.
- CI : deux jobs de tests navigateur tombés sans lien avec le lot (navigateur fermé, job annulé), relancés, verts.

## 31. Lot 6 : page à cocher (2026-11-01)

- Page à cocher : https://claude.ai/artifact/7Sg6YAf4QPCNUnSoFzFLTT (5 fiches, 23 exemples ; capacité `db`, base
  `verdicts` vide à la publication).
- Alertes : 4-029 et 4-076, « bloc solide non dessiné » (la page ne sait pas dessiner ` ```solide `) ; le rendu des
  pyramides et du cône a été vu en local à 390 px (§ 29), pas encore en prod (bloc non livré).
- Relecture : 5 verdicts lus en base, 5 « OK », aucun commentaire. `publier-lot` ne prend qu'un dossier entier : les 3
  fichiers de translation copiés seuls dans un dossier du scratchpad, simulation (3 passent), lancé par David avec
  `--publier` ; vérifié au MCP : 0150ef82, c8306505, e7ef2835 publiés ; 6a770d04 et 35002b15 toujours en brouillon.

## 32. Lot 7 (puissances, racines, calcul littéral) : phase 0 (proposée le 2026-11-01)

Lot 5 de l'ordre validé au § 5 bis (« puissances et calcul littéral ») ; la géométrie, passée devant, a pris les
numéros 5 et 6. Les 2 volumes du lot 6 attendent toujours le `deploy:prod` qui livre ` ```solide ` (prod en v0.58.0).

### 32.1 Relevé (MCP, 2026-11-01)

- Points du lot, tous encore sans modèle : 017, 018, 020, 021, 023, 071. Voisins : 016 (2), 019 (4), 022 (2),
  024 (12), 070 (6).
- Nœuds : 017 → Puissances : calculs > produit de puissances ; 018 → Puissances : calculs ; 020 → Racines carrées :
  sens et écritures > définition ; 021, 023 → Algèbre > Calcul littéral ; 071 → Équations : premier degré >
  ax + b = cx + d. Aucun nœud à créer.
- Catégories voisines : Puissances / Calculer / Puissance d'un produit 1 (2de, littéral `(kx)^n`) ; Puissances /
  Problèmes / Notation scientifique 1 (3e) ; Racines carrées / Problèmes / Aire et côté 1 (3e) ; Calcul littéral /
  Equations / Mettre en équation 1-2 (5e, ` ```choix `) ; Calcul littéral / Raisonner / Contre-exemple 1 (5e) ;
  Calcul littéral / Produire une formule / Aires 1 (4e, lot 5).
- Bornes : exposants entiers naturels (016-018) ; 017 `(ab)ⁿ = aⁿbⁿ` (accompagnement 2026 ; Repères 2019 : formules
  « pas un attendu », contradiction déjà notée) ; 020 encadrement par deux entiers consécutifs (aire 20 → entre 4 et 5) ;
  021 pair 2n, impair 2n + 1 ; 023 équivalence de programmes, somme de 3 consécutifs ; 071 coefficients entiers relatifs,
  pas de x² ni de produit nul.

### 32.2 Modèles proposés (6, un par point)

| Point | Modèle (catégorie, niveau)                                                               | Variations                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Réponse                                       |
| ----- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 017   | Puissance d'un produit (Puissances / Calculer / Puissance d'un produit, 2)               | a, b de 2 à 5, n de 2 à 6 : 1) `(3 × 4)^2 = 3^? × 4^?` ; 2) `2^5 × 3^5` en une seule puissance → `6^5` ; 3) calcul astucieux `2^4 × 5^4` → 10 000 (via `10^4`) ; 4) « `(2 × 3)^4` est égal à : `2^4 × 3^4` / `2 × 3^4` / `2^4 × 3` / `6^8` »                                                                                                                                                                                                                                             | case (puissance exigée en 2) · case choix     |
| 018   | Problèmes avec des puissances (Puissances / Problèmes / Situations, 1)                   | 1) des bactéries doublent chaque heure : nombre après n heures (n de 3 à 10), écrit en puissance de 2 puis en valeur ; 2) chaîne de messages, chacun prévient 3 personnes : au tour n ; 3) cadenas à k molettes de 10 chiffres → `10^k` codes ; 4) cube d'arête `10^k` cm → volume `10^{3k}` cm³ ; 5) « quelle expression donne le nombre de … : `2^n` / `2n` / `n^2` »                                                                                                                  | case · case choix                             |
| 020   | Encadrer une racine carrée (Racines carrées / Apprivoiser / Encadrer, 1)                 | n entier de 2 à 143, pas un carré : 1) `? < √n < ?` (deux entiers consécutifs) ; 2) carré d'aire n cm² : son côté est compris entre ? et ? cm ; 3) « `√20` est compris entre : 4 et 5 / 10 et 11 / 19 et 21 / 2 et 3 » (la moitié, les voisins de n)                                                                                                                                                                                                                                     | case (2 trous) · case choix                   |
| 021   | Pairs et impairs (Calcul littéral / Produire une formule / Pairs et impairs, 1)          | n entier : 1) « quelle expression est toujours paire : 2n / n + 2 / n² / 2n + 1 » ; 2) idem impaire ; 3) le nombre pair qui suit 2n → `2n+2` ; 4) l'impair qui suit 2n + 1 → `2n+3` ; 5) tester la vraisemblance : « Tom dit que n + 1 est toujours impair ; pour n = 3 ? » → Tom a tort (case choix)                                                                                                                                                                                    | case choix · case (expression égale acceptée) |
| 023   | Démontrer avec le calcul littéral (Calcul littéral / Raisonner / Démontrer, 1)           | 1) `n + (n+1) + (n+2)` réduit → `3n+3` ; 2) « quelle écriture prouve que cette somme est un multiple de 3 : `3(n+1)` / `3n+1` / `n^3+3` / `3+n` » ; 3) programmes A (ajouter a, multiplier par k, soustraire k·a) et B (multiplier par k) : résultat de A réduit → `kx`, puis « que conclure : toujours le même résultat / seulement pour x = … / jamais » ; 4) deux pairs 2n + 2m = 2(n + m) ; 5) « lequel est une démonstration : essai sur 3 exemples / calcul littéral pour tout n » | case (expression) · case choix                |
| 071   | Mettre en équation ax + b = cx + d (Calcul littéral / Equations / Mettre en équation, 3) | solution entière positive tirée d'abord : 1) deux tarifs (abonnement b + a € la séance, ou c € la séance) : quelle équation donne l'égalité des prix ? ; 2) idem, combien de séances ? ; 3) nombre mystère (« × a + b » donne autant que « × c + d ») : équation puis nombre ; 4) deux réservoirs (b L + a L/min, d L + c L/min) : au bout de combien de minutes le même volume ?                                                                                                        | case choix (équation) · case (solution)       |

- `testSpecs` d'erreurs typiques : 017 → `6^8` (exposants ajoutés), `2 × 3^4` ; 018 → `2n`, `n^2` ; 020 → moitié de n,
  bornes inversées, √n arrondi seul ; 021 → `n+2` pair ; 023 → `3n+1` ; 071 → `ax = cx + b`, solution d'une autre équation.
- À vérifier à l'écriture : 017 v2 refuse 7 776 quand la puissance est demandée (forme exigée) ; 021 et 023 acceptent
  toute expression égale (`2(n+1)` pour `2n+2`) ; 020 deux trous ordonnés.

### 32.3 Question d'accès

Comme les lots précédents : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la publication,
les élèves de 4e voient 6 modèles de plus.

### 32.4 Questions à David

1. Valider les 6 modèles du § 32.2 ?
2. Catégories : Puissances / Calculer / Puissance d'un produit **2** (le 1 est le modèle littéral de 2de) ; neuves :
   Puissances / Problèmes / Situations 1, Racines carrées / Apprivoiser / Encadrer 1, Calcul littéral / Produire une
   formule / Pairs et impairs 1, Calcul littéral / Raisonner / Démontrer 1 ; Calcul littéral / Equations / Mettre en
   équation **3** (après les 1-2 de 5e) ?
3. 017 : exiger la forme puissance quand la consigne la demande (reco : oui, la valeur seule va au corrigé) ?

**Décisions de David (2026-11-01, « je suis tes recos »)** : les 6 modèles du § 32.2 ; catégories Puissances / Calculer
/ Puissance d'un produit 2, Puissances / Problèmes / Situations 1, Racines carrées / Apprivoiser / Encadrer 1, Calcul
littéral / Produire une formule / Pairs et impairs 1, Calcul littéral / Raisonner / Démontrer 1, Calcul littéral /
Equations / Mettre en équation 3 ; 017 : forme puissance exigée quand la consigne la demande.

## 33. Lot 7 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-7`, #2089)

- Script `docs/wip/questions/lot-4-7.py` → `scripts/questions/4-lot-7/` (6 fichiers). `question:specs` : 69 specs
  vertes, tous les tirages réussis ; `create-questions` (simulation, prod) : 6 « à créer ».
- Base locale : 6 brouillons créés ; **aperçu admin non joué** (Chrome n'ouvrait pas la page, deux essais) : rendu à
  voir dans la page à cocher.
- Ajustements à l'écriture : 7 776 au lieu de `6^5` → `bad_form` avec la violation `form` ; `10000` sans espace →
  `unoptimal_form`, spec écrite `10\,000` ; variations à réponse libre sans `?` dans l'énoncé → « Blank count
  mismatch » (case ajoutée : « Le nombre pair suivant est $?$. »…) ; `form` et `products` coupées pour 021 et 023
  (`2(n+1)`, `3(n+1)` acceptés).
- CI : job « Client Tests (browser, shard 1/2) » tombé (`wrapDynamicImport`, 54 fichiers non chargés, 1 844 tests
  verts), relancé, vert ; mergée.

## 34. Lot 7 : en prod, rangé, page à cocher (2026-11-01)

- David a lancé `create-questions --publier` : 6 brouillons en [4], niveaux et catégories justes (MCP). Identifiants :
  2e9b26b0 (4-017), 0fe6015f (4-018), 207d451a (4-020), 9a06de2e (4-021), 43c4f21f (4-023), 5e2db3d1 (4-071).
- #2098 : migration `20261101170000_questions_4_lot7_rangement_tags` + test d'intégration (rouge sans elle : 3 échecs,
  4 non joués ; vert avec : 9/9) ; `security-auditor` : aucun finding bloquant. CI d'abord rouge : la branche portait
  deux migrations d'autres sessions au même horodatage (`20261101141600`, corrigé sur `main` par #2093) → rebase sur
  `origin/main`, CI verte, mergée.
- `db push` : la mienne était plus ancienne que `20261101180000` déjà jouée → `--include-all` nécessaire. Les sessions
  questions-1spe et questions-ce1, bloquées derrière, m'ont demandé de le lancer (décision du 2026-10-27 en mémoire) ;
  refusé, ce journal le réserve à David. **David** l'a lancé : jouées 170000 (la mienne), 183000 (questions-3), 190000
  (questions-1spe), 190100 (questions-ce1). Vérifié au MCP : 6 modèles sur le nœud de leur point, un tag chacun,
  `updated_at` inchangé, toujours en brouillon.
- Page à cocher : https://claude.ai/artifact/4RgNcVwHUsdXQAjFSWMSEs (6 fiches, 27 exemples ; capacité `db`, base
  `verdicts` vide à la publication). Alerte : homonyme « Puissance d'un produit » de 2de (04b1cc7f, niveau 1) écarté,
  c'est voulu (le nôtre est le niveau 2).

## 35. Lot 7 : relecture et publication (2026-11-01)

- Verdicts lus en base : 6 documents, 6 « OK », aucun commentaire.
- `publier-lot` en simulation (6 passent), lancé par David avec `--publier` : 6/6 publiés ; vérifié au MCP.

## 36. Décisions de David (2026-11-01, « je suis tes recos »)

1. **Sonde des figures** : gardée comme outil → `scripts/questions/sonde-figures.ts` (calquée sur `sonde-courbes.ts`),
   ligne dans la démarche (`couvrir-un-niveau.md` § 5 : lot qui dessine des figures → sonde, 0 problème avant la page à
   cocher) ; petite PR sans revue.
2. **Lot 1** : page à cocher d'abord (jamais relu sur une page : elle n'existait pas au lot 1), puis publication par
   `publier-lot`.
3. **14 bornes 2019/2016 seules** : pas de revue en bloc ; chacune est signalée dans la phase 0 du lot qui s'en sert,
   David tranche alors. Question retirée de « En attente ».
4. Ordre : page à cocher du lot 1, PR de la sonde, phase 0 du lot 8.

## 37. Lot 1 : page à cocher (2026-11-01)

- `page-a-cocher.ts --dir scripts/questions/4-lot-1` (base prod, lecture seule) : 7 fiches, toutes `draft`, toutes
  appariées. Une alerte : homonyme 93998734 (niveau 3) écarté pour « Problèmes avec des fractions » ; la fiche garde
  05818fa0 (4-014, brouillon de 4e) : c'est le bon modèle.
- Publiée en artefact (capacité `db`) : https://claude.ai/artifact/5HUE7dJZTSixHHZgC85tAN ; collection `verdicts`
  vide à la publication.

## 38. Lot 1 : publication bloquée par un niveau, sonde des figures (2026-11-01)

- Verdicts lus en base : 7 documents, 7 « OK », aucun commentaire.
- `publier-lot` en simulation : 6 passent, a635df43 « Fraction d'une fraction » refusé (niveau 5 de Fractions /
  Calculer / Fraction d'une quantité pris par ece43e92, publié 6e ; niveaux 1 à 6 pris, relevé MCP). Question d'accès
  posée avant le SQL, David : personne. Migration `20261101193000_questions_4_lot1_niveau` (5 → 7, calquée sur
  `20261101190000_questions_1spe_derivation_niveau`), fichier 04 et `lot-4-1.py` au niveau 7 ; test d'intégration
  6/6, rouge sans la migration (update neutralisé), restaurée d'une copie ; `security-auditor` : aucun finding
  bloquant. #2109 mergée (CI verte).
- `db:migrate` : depuis le worktree, `ProjectRefNotLinkedError` (seul le dépôt principal est lié) ; depuis le dépôt
  principal, refusé : `20261101190200_questions_6_lot7_rangement_tags` (f2f01570e, session questions-6) a la même
  version que `questions_5_lot6_rangement_tags`, déjà jouée → `duplicate key schema_migrations_pkey`. Rien de joué
  (MCP : dernière version 20261101190200 = 5_lot6 ; a635df43 encore au niveau 5). Signalé à David.
- Sonde des figures : `scripts/questions/sonde-figures.ts` + ligne au § 5 de `couvrir-un-niveau.md` (#2108, mergée,
  sans revue) ; lot 6 : 0 problème (787 blocs) ; copie cassée : 1 problème, sortie 1.
- Collision réglée par la session questions-6 (#2114, migration renommée `20261101200700`) ; son `db:migrate` a joué
  aussi la nôtre (`20261101193000`). Vérifié au MCP : a635df43 au niveau 7, brouillon, `updated_at` inchangé
  (2026-10-28), les 3 triggers actifs. `publier-lot` en simulation : 7 brouillons passent.
- `publier-lot --publier` lancé par David : 7/7 publiés ; vérifié au MCP (7 `published`, a635df43 au niveau 7).

## 39. Lot 8 (programmes de calcul et fonctions) : phase 0 (proposée le 2026-11-01)

Lot 6 de l'ordre validé au § 5 bis ; numéroté 8 (la géométrie, passée devant, a pris 5 et 6). Prod en v0.59.0 : elle
livre le repère à placer (` ```courbe ` + `placer:`, titres `axes:`, #2096) et ` ```solide ` → les 2 volumes du lot 6
peuvent être publiés.

### 39.1 Relevé (MCP, 2026-11-01)

- Points du lot, tous sans modèle : 060, 081, 061, 062, 063, 064 ; tous sur le nœud Fonctions > Généralités sur les
  fonctions. Aucun nœud à créer.
- Voisins : 5-117 (programme traduit en **une expression numérique**, prévu par la session 5e, lot « Traduire en une
  expression ») ; 5-092 à 5-098, 5-142, 5-143 (sans modèle) ; 3-039 (1 modèle : 6ad254b4 « Formule, tableau de
  valeurs, courbe », Fonctions / Généralités / Représentations 1, notation `f(x)`) ; 4-021, 4-075 (Calcul littéral /
  Produire une formule, lot 7 et lot 5).
- Catégories : Fonctions / Généralités / Image et antécédent 1, Représentations 1 (3e), Lecture graphique 1-3 (2de) ;
  aucune « Programmes de calcul », aucune « Dépendance ». Calcul littéral / Écrire / Formules 1-3 (5e).
- Bornes (BO c4 p. 18-19 et décision de David du 2026-10-18, aucune ne repose sur 2019/2016 seuls) : 060 nombre
  « simple » ; 061 programme « simple » ; 062, 063, 064, 081 : notation `A(c)`, `p(t)` permise dans l'énoncé, jamais
  exigée dans la réponse ; **ni « image », ni « antécédent », ni `f : x ↦`** (3e). Double distributivité : 3e →
  aucun programme qui demande de développer `(x + a)(x + b)` ou `(x + a)²`.

### 39.2 Modèles proposés (6, un par point)

| Point | Modèle (catégorie, niveau)                                                              | Variations                                                                                                                                                                                                                                                                                                                                                                                                               | Réponse                                       |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| 060   | Appliquer un programme de calcul (Fonctions / Programmes de calcul / Appliquer, 1)      | 1) 3 étapes (× a, + b, × c) à un entier relatif de −10 à 10 ; 2) avec un carré (+ a, élever au carré, − b), départ de −6 à 6 ; 3) 4 étapes à un décimal simple (2,5 ; −1,5) ; 4) deux programmes A et B au même nombre : « lequel donne le plus grand résultat : A / B / les deux le même »                                                                                                                              | case · case choix                             |
| 081   | Programme de calcul et lettre (Fonctions / Programmes de calcul / Appliquer, 2)         | départ x : 1) (× a, + b, × c) → toute expression égale à `c(ax+b)` ; 2) même programme, « développée et réduite » → `acx+bc` (forme exigée) ; 3) « quelle expression traduit le programme : `c(ax+b)` / `cax+b` / `ax+bc` / `a(x+b)c` » ; 4) (+ a, × b, − le nombre de départ) → `(b−1)x+ab` réduite                                                                                                                     | case (expression) · case choix                |
| 061   | Remonter un programme de calcul (Fonctions / Programmes de calcul / Remonter, 1)        | départ entier relatif tiré d'abord : 1) 2 étapes (× a, + b), résultat donné → départ ; 2) 3 étapes (+ a, × b, − c) ; 3) « pour remonter, la première chose à faire est : soustraire b / diviser par a / ajouter b / multiplier par a » ; 4) « Léa trouve r ; quel nombre a-t-elle choisi ? » (programme avec division : ÷ a puis − b)                                                                                    | case · case choix                             |
| 062   | Produire une formule (Fonctions / Dépendance / Formule, 1)                              | 1) taxi : prise en charge b €, a € par km : `P(d) = ?` → `b+ad` ; 2) rectangle de largeur x, longueur x + a : aire → `x(x+a)` (développée acceptée) ; 3) même forme : périmètre → `4x+2a` ; 4) réservoir de V L qui perd a L par minute : volume après t min → `V−at` ; 5) « quelle formule donne le prix de n places à a € avec b € de frais fixes : `an+b` / `(a+b)n` / `a+bn` / `abn` »                               | case (expression égale acceptée) · case choix |
| 063   | Représenter une grandeur par un graphique (Fonctions / Dépendance / Graphique, 1)       | ` ```courbe ` + `placer:`, titres d'axes : 1) formule `P(n) = an + b` : place les points pour n = 0, 1, 2, 3 ; 2) tableau de valeurs donné (distance, temps) : place les 4 points ; 3) aire d'un carré de côté c : place c = 0..3 (pas une droite) ; 4) « quel graphique représente le prix en fonction de n » : 4 ` ```courbe ` (la bonne, pente et ordonnée à l'origine échangées, droite par l'origine, décroissante) | repère à placer · case choix                  |
| 064   | Formule, tableau, graphique (Fonctions / Dépendance / Formule, tableau et graphique, 1) | même dépendance sous trois formes, contextes concrets : 1) formule → compléter un tableau (2 cases) ; 2) graphique → lire la valeur de la grandeur pour t donné ; 3) tableau → « quelle formule » (case choix) ; 4) formule → « quel tableau » (case choix, 4 tableaux) ; 5) « d'après le graphique, la grandeur augmente-t-elle quand t augmente : oui / non / ça dépend »                                              | case · case choix                             |

- `testSpecs` d'erreurs typiques : 060 → `−3² = −9`, étape oubliée ; 081 → `cax+b` (priorité), `ax+bc` ; 061 →
  opérations remontées dans le mauvais ordre, ou sans inverser ; 062 → `(a+b)d`, `2x+a` ; 063 → abscisse et ordonnée
  échangées (phrase du juge) ; 064 → valeur lue pour la mauvaise grandeur.
- Distinct du 3e 6ad254b4 : pas de `f(x)`, grandeurs concrètes et notation `P(n)` dans l'énoncé seulement ; distinct
  de 5-117 : 081 travaille avec la lettre.
- Sonde des courbes (`sonde-courbes.ts`) avant la page à cocher (063, 064 dessinent des ` ```courbe `).

### 39.3 Question d'accès

Comme les lots précédents : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la
publication, les élèves de 4e voient 6 modèles de plus.

### 39.4 Questions à David

1. Valider les 6 modèles du § 39.2 ?
2. Catégories neuves : Fonctions / Programmes de calcul / Appliquer 1 (060) et 2 (081), Remonter 1 (061) ; Fonctions /
   Dépendance / Formule 1 (062), Graphique 1 (063), Formule, tableau et graphique 1 (064) ?
3. 063 : se servir du repère à placer (en prod depuis v0.59.0) plutôt que d'un seul QCM de graphiques (reco : oui,
   c'est « représenter » pour de vrai) ?
4. Lot 6 : publier les 2 volumes maintenant que ` ```solide ` est en prod (`publier-lot` sur un dossier avec 01 et 02
   seulement), avant d'écrire le lot 8 (reco : oui) ?

**Décisions de David (2026-11-01, « je te suis »)** : les 6 modèles du § 39.2 ; catégories Fonctions / Programmes de
calcul / Appliquer 1 (060) et 2 (081), Remonter 1 (061), Fonctions / Dépendance / Formule 1 (062), Graphique 1 (063),
Formule, tableau et graphique 1 (064) ; 063 au repère à placer (+ une variante à choix de graphiques) ; volumes du lot
6 publiés avant d'écrire le lot 8.

## 40. Lot 6 : publication des volumes (2026-11-01)

- ` ```solide ` en prod (v0.59.0, `solide-parser.ts` sur `origin/production`). `publier-lot --dir
scripts/questions/4-lot-6` en simulation (prod) : 6a770d04 et 35002b15 passent ; les 3 translations, déjà
  publiées, laissées telles quelles (le script les saute : plus besoin de dossier à part).
- `publier-lot --publier` lancé par David : 5/5 publiés ; vérifié au MCP : 6a770d04 (niveau 1) et 35002b15 (niveau 2)
  `published`. **Lot 6 clos.**

## 41. Lot 8 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-8`, #2133)

- Script `docs/wip/questions/lot-4-8.py` → `scripts/questions/4-lot-8/` (6 fichiers). `question:specs` : 64 specs
  vertes, 1 300 tirages réussis ; `sonde-courbes` : 0 problème (344 blocs) ; `create-questions` (simulation, prod) :
  6 « à créer ».
- Base locale : 6 brouillons créés ; aperçu admin du repère à placer joué (`admin@local.test`) : rendu juste, titres
  d'axes, un point faux → « Faux », « Tu as placé D en (3 ; 8). ».
- Piège : `pnpm exec prettier` lancé par `subprocess.run` attendait sur l'entrée standard (script bloqué, sans
  sortie) → `stdin=subprocess.DEVNULL`.
- Écriture : 081 « développée et réduite » = `requiredForm: sum` (`3(2x+5)` → `bad_form`) ; 060 et 064 : le bon
  choix calculé par `{{if:…}}` quand il dépend du tirage (programme A ou B, température qui monte ou descend).

## 42. Lot 8 : en prod, rangé, page à cocher (2026-11-01)

- David a lancé `create-questions --publier` : 6 brouillons en [4], catégories et niveaux justes (MCP). Identifiants :
  edcc194a (4-060), 15dd2a0f (4-081), bd2aa548 (4-061), cb545bd7 (4-062), 46ca97e7 (4-063), e678f1d0 (4-064).
- #2143 : migration de rangement + test d'intégration (rouge sans elle : 2 échecs ; vert : 9/9) ; `security-auditor` :
  aucun finding. CI : job d'intégration tombé (port 54322 déjà pris sur le runner), relancé, vert ; mergée.
- **Collision d'horodatage** : `20261101215000` avait déjà été jouée en prod par `questions_1spe_suites_rangement_tags`
  (même version, mergée juste avant) → `main` rouge pour toutes les sessions (migrations-horodatage-unique, garde
  SECURITY DEFINER). Rien joué. #2154 : renommée `20261101223000` (après la dernière jouée, 220000), Lint d'abord
  rouge sur le journal de questions-6 (corrigé sur `main`), rebase, CI verte, mergée ; sessions questions-1spe, -5, -6
  prévenues (et averties que questions-5 #2146 et questions-6 #2153 prennent toutes deux `20261101220100`).
- `db:migrate` (dépôt principal) : seule `20261101223000` en attente, `db push` sans `--include-all`. Vérifié au
  MCP : 6 modèles sur Fonctions > Généralités sur les fonctions, un tag chacun (son point), `draft`.
- Page à cocher : https://claude.ai/artifact/1PCiWE8CmMGYPAZrBhdELD (6 fiches, 26 exemples, aucune alerte ;
  capacité `db`, `verdicts` vide). La page aplatit les listes à puces des énoncés (« - choisir un nombre ; - … ») :
  dans l'appli (aperçu admin local), la liste est bien rendue (`<ul>`). Ports : 5176 pris par une autre session → 5178.
- **Leçon** : relever la dernière version jouée en prod **et** les migrations de `origin/main` juste avant de
  pousser une migration (une autre session peut merger la même version entre-temps).

## 43. Lot 8 : relecture, publication (2026-11-01)

- Verdicts lus (`ArtifactData list verdicts`) : **6 sur 6, tous « ok »**, aucun commentaire ; ce sont bien les 6 `id`
  du § 42.
- `publier-lot --dir scripts/questions/4-lot-8` (simulation, prod) : 6 brouillons passent le contrôle.
- David a lancé `publier-lot --publier` le 2026-11-01 : **6/6 publiés**, vérifié au MCP (`status = published`).

## 44. Lot 9 (pensée informatique) : phase 0 (proposée le 2026-11-01)

Dernier lot de l'ordre validé au § 5 bis (8 « pensée informatique »). Décision du § 5 bis, point 6 : pseudo-code en
français proche de Scratch, **bloc de code sans langage** (rendu en texte brut, sans coloration :
`code-highlight.ts`), pas de Python.

### 44.1 Relevé (MCP, 2026-11-01)

- Points du lot, tous sans modèle : 065 et 066 sur le nœud de « instruction conditionnelle » (195147df), 067 sur
  celui de « affectation » (151ff8c9). Aucun nœud à créer.
- **Aucun modèle de pensée informatique au collège**, à aucun niveau (6-194 à 6-210, 5-100 à 5-106, 3-047 à 3-051 :
  0 modèle chacun). Lycée : aucun non plus sur ces deux nœuds.
- Précédent technique : `scripts/questions/1spe-suites/06-termes-par-un-algorithme.json` (bloc ` ``` ` sans
  langage, `u ← …`, `{{eval:…}}` remplacés dans le bloc, réponse en case). **Aucun outil neuf.**
- Aucun thème « Algorithmique » dans les catégories (les modèles de lycée sont rangés sous leur thème mathématique :
  Suites / Seuil et algorithmes, Probabilités / Dénombrement / Algorithmique).
- Bornes (cycle4.json, source « Exemples 2026 p. 48 », force accompagnement — **pas de 2019/2016**) : 065, 066 →
  conditions simples avec `<`, `>`, `=` seulement ; 067 → **une seule variable** (ex. accumulation dans une boucle,
  « compter le nombre de 6 obtenus dans 1000 lancers d'un dé »). Boucle « répéter n fois » vue en 5e (5-106) : permise.
  Hors lot : 068, 069 (écrire / modifier un programme : Blockly, catégorie D), boucle conditionnelle et conditions
  composées (3e : 3-048, 3-049).

### 44.2 Modèles proposés (3, un par point)

Pseudo-code commun (mots de Scratch) : `demander un nombre`, `mettre score à 0`, `ajouter 3 à score`,
`mettre x à x × 2`, `répéter 5 fois … fin répéter`, `si … alors … sinon … fin si`, `dire « Bravo »`. Indentation de
4 espaces dans les blocs.

| Point | Modèle (catégorie, niveau)                                                   | Variations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Réponse           |
| ----- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 065   | Représenter une condition (Algorithmique / Conditions / Condition simple, 1) | 1) « la condition `nombre > a` est-elle vraie quand nombre vaut n ? » (n tiré dont n = a) : vraie / fausse ; 2) phrase → condition : « le nombre est plus petit que a » : `nombre < a` / `nombre > a` / `nombre = a` / `a < nombre` ; 3) parmi 4 valeurs, laquelle rend `nombre < a` vraie ; 4) « avoir au moins 18 ans » avec `<`, `>`, `=` seulement : `âge > 17` / `âge > 18` / `âge < 18` / `âge = 18`                                                                                                                                                                               | case choix        |
| 066   | Instruction conditionnelle (Algorithmique / Conditions / Si alors sinon, 1)  | 1) `si nombre > a alors dire « Grand » sinon dire « Petit »`, nombre saisi n : que dit le lutin ? ; 2) `si nombre < a alors mettre nombre à nombre × 2 sinon mettre nombre à nombre − b`, puis `dire nombre` : quel nombre ? ; 3) deux `si` à la suite, sans `sinon` : quel nombre ? ; 4) quel nombre saisi fait dire « Gagné » (4 choix) ; 5) compléter le programme « dire “Six !” quand le dé donne 6 » : `dé = 6` / `dé > 6` / `dé < 6` / `6`                                                                                                                                        | case choix · case |
| 067   | Manipuler une variable (Algorithmique / Variables / Accumulation, 1)         | 1) `mettre score à s0`, `répéter k fois : ajouter a à score`, `dire score` : quelle valeur ? ; 2) `mettre x à a`, `répéter k fois : mettre x à x × 2` (k ≤ 4) ; 3) compteur de 6 : 8 à 10 lancers de dé **donnés** (tableau), `si dé = 6 alors ajouter 1 à compteur` : valeur finale ; 4) « que contient compteur à la fin ? » : le nombre de 6 obtenus / le dernier lancer / la somme des lancers / 6 ; 5) lequel de 4 programmes calcule le total des points de k lancers : bon (`ajouter dé à total`) / `mettre total à dé` / `mettre total à 0` dans la boucle / `ajouter 1 à total` | case · case choix |

- `testSpecs` d'erreurs typiques : 065 → `>` et `<` inversés, `nombre > 18` pour « au moins 18 » ; 066 → branche
  `sinon` exécutée quand nombre = a avec `>` (le cas n = a est tiré exprès), les deux branches appliquées ; 067 →
  valeur initiale oubliée (`k × a` au lieu de `s0 + k × a`), `a × 2k` au lieu de `a × 2^k`, compteur égal au dernier
  lancer.
- Le 1000 lancers de l'exemple du BO est remplacé par des lancers donnés (l'élève ne peut pas exécuter le hasard) ;
  la question « que contient compteur » garde le sens.

### 44.3 Question d'accès

Comme les lots précédents : brouillons, puis migration nœud + tag ; **personne** ne gagne d'accès. À la
publication, les élèves de 4e voient 3 modèles de plus.

### 44.4 Questions à David

1. Valider les 3 modèles du § 44.2 ?
2. Mots du pseudo-code : ceux de Scratch (`mettre score à 0`, `ajouter 3 à score`, `dire`) — **reco** : c'est ce que
   les élèves de 4e manipulent — ou la flèche `score ← 0` du lycée (précédent 1re spé) ?
3. Catégories neuves : thème **Algorithmique** / Conditions / Condition simple 1 (065), Si alors sinon 1 (066) ;
   Algorithmique / Variables / Accumulation 1 (067) ?
4. 065, variation 4 (« au moins 18 ans » → `âge > 17`) : la garder (reco : oui, c'est le piège classique de
   Scratch, qui n'a pas `≥`) ?

**Décisions de David (2026-11-01, « go » après mes recos)** : les 3 modèles du § 44.2 ; mots de Scratch (`mettre … à`,
`ajouter … à`, `dire`) ; thème Algorithmique / Conditions / Condition simple 1 (065), Si alors sinon 1 (066),
Algorithmique / Variables / Accumulation 1 (067) ; variante « au moins 18 ans → `âge > 17` » gardée.

## 45. Lot 9 : écrit (worktree `ubumaths-wt-questions-4`, branche `feat/questions-4-lot-9`)

- Script `docs/wip/questions/lot-4-9.py` → `scripts/questions/4-lot-9/` (3 fichiers). `question:specs` : 33 specs
  vertes, 1 400 tirages réussis ; `create-questions` (simulation, prod) : 3 « à créer ».
- Base locale : 3 brouillons créés ; aperçu admin (`admin@local.test`, port 5178) : bloc de code sans langage rendu en
  monospace, indentation gardée ; code en ligne dans les choix rendu en `<code>` ; bon choix « Juste », mauvais
  « Faux » avec la bonne réponse montrée.
- **Pièges trouvés à l'aperçu** :
  - `\text{nombre} < 7` dans une formule du corrigé sort collé (`nombre< 7`), même avec `\lt` : conditions du
    corrigé écrites en code en ligne (`` `nombre < 7` ``), comme dans l'énoncé ;
  - lancers de dé en formule séparés par des virgules (`1, 5, 2`) : lisibles comme des décimaux (`1,5`) → séparés
    par `;` ;
  - couleur `\textcolor` posée hors de `$…$` dans 3 corrigés (vu dans l'aperçu `question:specs`) → corrigé.
- « deux si à la suite » : contrainte `q != r` (le second test sur le nombre de DÉPART donnerait un autre résultat),
  sinon la variante ne tombait presque jamais sur le piège.

- 3 brouillons créés en prod par David (depuis le worktree, avant le merge) : 6c9c9649 (4-065), 8b6f9e98 (4-066),
  20cb9b55 (4-067), en [4], catégories justes, sans nœud ni tag (MCP). Nœuds : 065, 066 → Algorithmique > Variables
  et instructions > instructions conditionnelles ; 067 → … > variables et affectation.

## 46. Lot 9 : nœud et tags, prêts (branche locale `feat/questions-4-lot9-rangement`, pas encore poussée)

- Migration `20261101990000_questions_4_lot9_rangement_tags.sql` (**horodatage provisoire** : à refaire par
  `pnpm migration:horodatage` dès #2165 mergée), copie adaptée de celle du lot 8 ; 1re résolution par
  **sous-notion** (065, 066 → instructions conditionnelles ; 067 → variables et affectation).
- Test d'intégration `questions-4-lot9-rangement-tags.test.ts` : rouge sans la migration (5 échecs sur 9), vert avec
  (9/9). `check:incremental` 0 erreur ; `types:cliquet` tenu.
- `security-auditor` : aucun finding (diff lot 8 / lot 9 = données seules ; branche sous-notion vérifiée contre la prod,
  index uniques ; rollback complet). Question d'accès tranchée au § 44.3 : personne ne gagne d'accès.
- Au « go » de la pause CI : merger #2166 ; puis renommer la migration (horodatage), pousser la branche, PR, CI verte,
  merge, `db:migrate` (sans `--include-all`), vérifier au MCP ; page à cocher.

## 47. Lot 9 : rangement, course aux horodatages (2026-11-01 → 02)

- #2169 : `20261101223001` → `…223101` → `…224001` → `…224701` → `…224702`, chaque fois dépassé ou PRIS par une
  autre session pendant la CI (CE2, 5e, 6e, 1re spé, Tle spé : toutes calculaient « dernière + 1 s »). La garde
  `check:migrations --pr` a bloqué chaque merge : rien de cassé. Constat transmis à la session coordinatrice.
- David : « attendre un créneau ». Pauses CI et merges des autres sessions (deploy:prod, v0.62.0 en prod) ; #2177
  puis #2181 : `migration:horodatage` = heure réelle UTC, garde réduite aux doublons.
- Renommée `20261102041300` en local, branche à jour de `main`, garde OK, intégration 9/9 ; pas poussée.

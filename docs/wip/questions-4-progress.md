# Chantier « questions-4 » — couvrir la 4e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `4.points`.

## Reprendre ici

_Mis à jour le 2026-10-29, #1955 mergée, migration du lot 2 en PR._

- **État** : lot 1 en prod (rangé, tagué). Lot 2 (proportionnalité et pourcentages) : 7 brouillons créés en prod par
  David (#1955) ; migration nœud + tag `20261029220000` écrite, test rouge sans elle puis vert (9/9) (§ 14).
- **Prochaine action** : CI verte → merge → `db:migrate` depuis le dépôt principal → vérification MCP → page à
  cocher du lot 2.
- **En attente de David** : publication des 7 brouillons du lot 1 (après relecture dans l'admin).
- **Pièges en cours** : 90dca27a et acbd2280 (4-005) partiront en 3e avec un lot de la 3e ; `db:migrate` peut exiger
  `--include-all` : réservé à David ; `Doc-inchangée:` dans un message de commit, corps ≤ 100 caractères par ligne
  (commitlint) ; QCM = case choix ; worktree neuf : `svelte-kit sync` avant `create-questions` (`$lib`).
- **Worktree / branche** : `ubumaths-wt-questions-4` · `feat/questions-4-lot-2-tags`.

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

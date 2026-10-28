# Chantier « questions-4 » — couvrir la 4e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `4.points`.

## Reprendre ici

_Mis à jour le 2026-10-28, après le relevé (aucune PR)._

- **État** : relevé et état des lieux faits (§ 1 à 4) ; rien d'écrit en base ni en code.
- **Prochaine action** : réponses de David aux questions du § 5, puis phase 0 du lot 0 (corrections) ou du
  premier lot de texte, selon son ordre.
- **En attente de David** : questions 1 à 6 du § 5.
- **Pièges en cours** : QCM = **case choix** désormais (0 `multiple_choice` en base depuis le 2026-10-28,
  `figure-et-choix`) ; relire § 9 de `couvrir-un-niveau.md` avant d'écrire un lot ; relever les niveaux
  publiés de chaque catégorie (§ 5) avant de numéroter.
- **Worktree / branche** : aucun.

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

## 5. Questions à David (posées le 2026-10-28)

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

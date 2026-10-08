# Passe « puces et points » sur le cycle 3 (CM1, CM2, 6e — seed en prod) — règles du lycée

> **Statut : VALIDÉ par David le 2026-10-09 (« cycle 3 puis cycle 4 » : doutes = recos,
> retraits compris). Livraison en cours (branche `feat/passe-cycle3`).**
> Même demande et même grille que [passe-cycle2.md](passe-cycle2.md) : scission des puces
> multi-parties (deux gestes réussissables séparément, sur des nœuds différents = deux
> points) et points vagues (spécifier avec les mots du BO ; compétence → pas un point).
> Source : « Programme de mathématiques pour le cycle 3 » (arrêté du 10 avril 2025, BO n° 16
> du 17 avril 2025 — texte en vigueur en 2026 : CM1 et 6e depuis 2025, CM2 en 2026 ; aucun
> texte plus récent), 28 p. ⚠️ Ce BO n'a **pas** de colonne « Exemples de réussite » (ils sont
> publiés à part, l. 271) : un point vague ne peut se spécifier qu'avec les introductions de
> section, les puces voisines et les rubriques Automatismes de la 6e.
> Points relus : les **343 points** (`seed-cm.md` : CM1-001…130, CM2-001…116 ; `seed-6e.md` :
> 6-101…197). Première analyse par un agent (Opus) avec la grille, puis **vérifiée** : chaque
> nœud cible existe dans l'arbre `.15`, chaque citation du BO relue, chaque compte de
> références recompté dans les fixtures. Rien n'est modifié : ce document propose, David
> tranche.

## Bilan

|                           | CM1 | CM2 | 6e  | Total                     |
| ------------------------- | --- | --- | --- | ------------------------- |
| Puces scindées            | 6   | 6   | 4   | **16 puces → +22 points** |
| Points spécifiés (vagues) | 1   | 1   | 7   | **9**                     |
| Retraits                  | 1   | 1   | 0   | **2** (⚠️ suppressions)   |
| Points après la passe     | 138 | 124 | 101 | **363** (343 + 22 − 2)    |

Comme au cycle 2, une scission garde le point d'origine pour la **première partie** (celle
qui porte ses usages) et ajoute les autres avec un code neuf : CM1-131…, CM2-117…, 6-198…
(libres : l'ancien seed 6e occupe 6-001…095).

**Références d'automatismes à compléter (17, toutes des ajouts)** : quand un point scindé est
visé par une ligne d'automatismes qui couvre toutes ses parties, la référence existante reste
sur la première partie et **on en ajoute une vers chaque nouvelle partie**, pour le même grade.

| Point scindé                                                    | Visé par                                                                                | Ajouts                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------- |
| 6-144 (périmètre du carré et du rectangle)                      | 2de, 1re spé, 1re ens. sci., 1re techno, Tle spé, Tle comp.                             | +6 vers 6-199             |
| 6-152 (aire du carré ou du rectangle)                           | 4e, 2de, 1re spé, 1re ens. sci., 1re techno, Tle spé, Tle comp.                         | +7 vers 6-201             |
| 6-114 (additionner et soustraire des décimaux)                  | 5e                                                                                      | +1 vers 6-198             |
| CM2-107 (lire tableau, diagramme en barres, circulaire, courbe) | 6e (« lire un tableau, un diagramme en barres, un diagramme circulaire ou une courbe ») | +3 vers CM2-123, 124, 125 |

Les fixtures et tests de ces seeds seront mis à jour dans la même PR.

---

## 1. Puces scindées

### CM1 (6 puces → +9 points)

| Point       | Puce du BO                                                                                                                                | Parties (libellé → nœud)                                                                                                                                                                                                                                                                                                                               | Pourquoi                                                                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CM1-001** | Comparer et dénombrer des collections en les organisant                                                                                   | CM1-001 « Dénombrer des collections en les organisant » → `Entiers : numération > dénombrer` · **CM1-131** « Comparer des collections en les organisant » → `> comparer`                                                                                                                                                                               | Même décision que CP-001 (cycle 2).                                                                                                                                                        |
| **CM1-034** | Comparer, encadrer, intercaler, ordonner… des nombres décimaux… (notion)                                                                  | CM1-034 « Comparer, ordonner, par ordre croissant ou décroissant, des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et > » → `Décimaux : numération > comparer` · **CM1-132** « Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et > » → `> encadrer` | Pour les décimaux, l'arbre a **les deux** sous-notions (pas pour les entiers : CP-006 et CM1-008 gardés). La 6e sépare déjà ainsi (6-109/110 `comparer`, 6-113 `encadrer`). BO l. 395-396. |
| **CM1-039** | Ajouter ou soustraire un nombre entier inférieur à 10, d'unités, de dizaines… à un nombre décimal, sans retenue (notion)                  | CM1-039 « Ajouter … » → `Décimaux : calculs > additionner` · **CM1-133** « Soustraire … » → `> soustraire` (`fluence`)                                                                                                                                                                                                                                 | Deux opérations, deux sous-notions sœurs. l. 430-431.                                                                                                                                      |
| **CM1-054** | Résoudre des problèmes additifs en une étape des types « parties-tout » et « comparaison » (notion)                                       | CM1-054 « …du type « parties-tout » » → `Problèmes arithmétiques > parties-tout` · **CM1-134** « …du type « comparaison » » → `> comparaison`                                                                                                                                                                                                          | Même décision que CE2-029 (cycle 2). l. 511.                                                                                                                                               |
| **CM1-120** | Recueillir des données et produire un tableau, un diagramme en barres ou un ensemble de points dans un repère pour les présenter (notion) | CM1-120 « …produire un tableau… » → `Représenter des données > tableaux` · **CM1-135** « …un diagramme en barres… » → `> diagrammes en barres` · **CM1-136** « …un ensemble de points dans un repère… » → `> courbes et repères`                                                                                                                       | Trois productions, trois sous-notions (même décision que CE1-081, cycle 2). l. 1575-1576.                                                                                                  |
| **CM1-121** | Lire et interpréter les données d'un tableau à simple ou double entrée, d'un diagramme en barres ou d'une courbe (notion)                 | CM1-121 « …d'un tableau à simple entrée » → `> tableaux` · **CM1-137** « …d'un tableau à double entrée » → `> tableau à double entrée` · **CM1-138** « …d'un diagramme en barres » → `> diagrammes en barres` · **CM1-139** « …d'une courbe » → `> courbes et repères`                                                                                 | Quatre supports, quatre sous-notions (même décision que CE2-075). l. 1577. Doute 3.                                                                                                        |

### CM2 (6 puces → +9 points)

| Point       | Puce du BO                                                                                                                 | Parties (libellé → nœud)                                                                                                                                                                                          | Pourquoi                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **CM2-034** | Comparer, encadrer, intercaler, ordonner… des décimaux (notion)                                                            | comme CM1-034 → **CM2-117** (encadrer, intercaler)                                                                                                                                                                | l. 642-643                                                                                                                    |
| **CM2-040** | Ajouter ou soustraire un nombre entier à un nombre décimal lorsqu'il n'y a pas de retenue (notion)                         | CM2-040 « Ajouter … » → `additionner` · **CM2-118** « Soustraire … » → `soustraire` (`fluence`)                                                                                                                   | La puce suivante, CM2-041 (« Ajouter … lorsqu'il y a une retenue »), est déjà sur `additionner`. l. 674-675.                  |
| **CM2-058** | Résoudre des problèmes additifs en une ou plusieurs étapes (notion)                                                        | CM2-058 « Résoudre des problèmes additifs en une étape » → `Problèmes arithmétiques` (notion) · **CM2-119** « Résoudre des problèmes additifs en plusieurs étapes » → `> en deux étapes ou plus`                  | Le CM1 en fait deux puces (l. 511-512). La partie « une étape » reste sur la notion : le CM2 ne nomme pas les types. Doute 4. |
| **CM2-075** | Déterminer l'aire d'un carré ou d'un rectangle (notion Aires)                                                              | CM2-075 « …d'un carré » → `Aires > carré` · **CM2-120** « …d'un rectangle » → `Aires > rectangle`                                                                                                                 | Deux figures, deux sous-notions. l. 1182.                                                                                     |
| **CM2-106** | Recueillir des données et produire un tableau, un diagramme en barres ou un ensemble de points dans un repère… (notion)    | comme CM1-120 → **CM2-121**, **CM2-122**                                                                                                                                                                          | l. 1629-1630                                                                                                                  |
| **CM2-107** | Lire et interpréter les données d'un tableau, d'un diagramme en barres, d'un diagramme circulaire ou d'une courbe (notion) | CM2-107 « …d'un tableau » → `tableaux` · **CM2-123** « …d'un diagramme en barres » · **CM2-124** « …d'un diagramme circulaire » → `diagrammes circulaires` · **CM2-125** « …d'une courbe » → `courbes et repères` | l. 1631. **1 référence** (6e) → +3 (tableau ci-dessus).                                                                       |

### 6e (4 puces → +4 points)

| Point        | Puce du BO                                                           | Parties (libellé → nœud)                                                                                                                         | Pourquoi                                                                                                                   |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **6-114**    | Additionner et soustraire des nombres décimaux (notion)              | 6-114 « Additionner des nombres décimaux » → `Décimaux : calculs > additionner` · **6-198** « Soustraire des nombres décimaux » → `> soustraire` | l. 862. (Les fractions ont une sous-notion unique « additionner et soustraire » : 6-135 gardé.) **1 référence** (5e) → +1. |
| **6-144** ⚙ | Calculer le périmètre d'un carré et d'un rectangle (notion)          | 6-144 « …d'un carré » → `Périmètres > carré` · **6-199** « …d'un rectangle » → `Périmètres > rectangle` (`fluence`, rubrique `> Automatismes`)   | l. 1239-1240. **6 références** → +6.                                                                                       |
| **6-151**    | Connaître la formule de l'aire d'un carré ou d'un rectangle (notion) | 6-151 « …d'un carré » → `Aires > carré` · **6-200** « …d'un rectangle » → `Aires > rectangle`                                                    | l. 1276.                                                                                                                   |
| **6-152**    | Calculer l'aire d'un carré ou d'un rectangle (notion)                | 6-152 « …d'un carré » → `Aires > carré` · **6-201** « …d'un rectangle » → `Aires > rectangle`                                                    | l. 1277. **7 références** → +7.                                                                                            |

## 2. Points vagues

| Point                    | Libellé actuel                                                                                             | Décision                                                   | Nouveau libellé                                                                                                                                                               | Passage du BO                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CM1-087**, **CM2-072** | Déterminer des aires                                                                                       | spécifier                                                  | Déterminer des aires en utilisant une unité et un quadrillage                                                                                                                 | l. 1074-1076 (introduction des aires au cours moyen)                                                                                                                                                                                                                                                                   |
| **CM1-096**, **CM2-086** | Utiliser le vocabulaire géométrique approprié dans le contexte d'apprentissage des notions correspondantes | ⛔ **retrait** (suppression ; **0 usage en prod**, mesuré) | —                                                                                                                                                                             | l. 1322-1324 et 1391-1393 : le BO ne donne **aucune liste** (contrairement au cycle 2) et dit que « ce vocabulaire prend son sens grâce aux constructions et aux problèmes » ; le libellé lui-même renvoie aux notions concernées. Rien à spécifier sans ajouter au BO ; c'est la compétence « communiquer ». Doute 1. |
| **6-103**                | Connaître des grands nombres entiers                                                                       | spécifier                                                  | Connaître des grands nombres entiers, jusqu'au milliard                                                                                                                       | l. 797-798 (« jusqu'aux centaines de millions. En classe de 6e, le milliard est introduit »)                                                                                                                                                                                                                           |
| **6-116**                | Connaître le lien avec la division par 10, 100 et par 1 000                                                | spécifier (ne se lit pas seul)                             | Connaître le lien entre la multiplication par 0,1, par 0,01 et par 0,001 et la division par 10, 100 et par 1 000                                                              | l. 863-864 (la puce précédente)                                                                                                                                                                                                                                                                                        |
| **6-117**                | Comprendre le sens de la multiplication de deux nombres décimaux                                           | spécifier                                                  | Comprendre le sens de la multiplication de deux nombres décimaux en prenant appui sur le calcul de l'aire d'un rectangle et sur des conversions d'unités                      | l. 808-811. Doute 5.                                                                                                                                                                                                                                                                                                   |
| **6-142**                | Utiliser des modèles pré-algébriques pour résoudre des problèmes algébriques                               | spécifier                                                  | Utiliser des modèles pré-algébriques (schémas en barre) pour résoudre des problèmes algébriques                                                                               | l. 1040-1041 (« motifs évolutifs et schémas en barre » ; les motifs ont leur point, 6-143)                                                                                                                                                                                                                             |
| **6-155**                | Déterminer un volume                                                                                       | spécifier                                                  | Déterminer un volume en lien avec le dénombrement d'assemblages de cubes                                                                                                      | l. 1213-1214                                                                                                                                                                                                                                                                                                           |
| **6-176**                | L'utiliser pour calculer des angles, effectuer des constructions et résoudre des problèmes                 | spécifier (ne se lit pas seul)                             | Utiliser la valeur de la somme des mesures des angles d'un triangle pour calculer des angles, effectuer des constructions et résoudre des problèmes                           | l. 1525-1526 (la puce précédente). 1 référence (5e) : libellé seulement.                                                                                                                                                                                                                                               |
| **6-181**                | Voir dans l'espace des assemblages de cubes                                                                | spécifier                                                  | Voir dans l'espace des assemblages de cubes : passage, dans les deux sens, entre l'objet à trois dimensions et ses diverses représentations à deux dimensions ; dénombrements | l. 1541-1543. 1 référence (5e) : libellé seulement.                                                                                                                                                                                                                                                                    |

## 3. Examinés et gardés (316)

- **Un seul nœud** (règle du lycée) : « Comparer, encadrer, intercaler » des **entiers** et
  des **fractions** (l'arbre n'a que `comparer`) ; « additionner et soustraire » des
  **fractions** (sous-notion unique) ; « placer et repérer » (`repérer`, `droite graduée`) ;
  les conversions dans les deux sens ; « partie entière et arrondi » ; « diviseur ou multiple »
  (CM2-008, `multiples et diviseurs`) ; « encadrer…, intercaler… » des décimaux en 6e
  (6-113, `encadrer`) ; « comparer et mesurer des durées » (`calculer`).
- **Faute de sous-nœud** (le rattachement à la notion est imposé) : `Symétrie axiale`,
  `Préalgorithmique`, les points de « comparer » des `Aires` et des `Volumes`, les lexiques et
  notations des `Angles`, les enquêtes (6-182).
- **Problèmes limités à un objet** : chaque type de problème que le BO répertorie (l. 507-508),
  les problèmes algébriques (l. 521-533), de longueurs, de proportionnalité ; et les
  **problèmes à partir de données** (CM1-122, CM2-108), gardés sur la notion — même décision
  que CE2-076 au cycle 2 (doute 3).
- **Vocabulaire précis** : les notations et codes (CM2-088 ; les codes sont listés dans les
  Automatismes de 6e), les définitions du cercle (6-162), les listes d'unités (6-102).
- **Rattachements déjà tranchés** (discutables du CM 1-6 et de la 6e 1-10, A1-A4, S2-S6) :
  non rouverts.

## 4. Doutes (avec reco)

1. **Retrait de CM1-096 / CM2-086** (« Utiliser le vocabulaire géométrique approprié dans le
   contexte… »). Reco : **retirer** — sans liste dans le BO, le spécifier obligerait à
   inventer. ⚠️ Au cycle 2, la puce sœur est spécifiée (le BO y donne la liste). Alternative :
   le garder tel quel (non questionnable). C'est une **suppression en prod** : la ligne du
   point seulement (0 usage, 0 référence — revérifié juste avant la migration, garde dans la
   migration comme pour 2-332).
2. **6-106** (« Associer et utiliser différentes écritures d'un nombre décimal : écriture à
   virgule, fraction, nombre mixte, pourcentage », notion, 8 références). Reco : **garder** —
   « associer » relie les écritures entre elles (un geste). Alternative : ×3 (`Décimaux :
numération > forme fractionnaire` / `Fractions : sens et écritures > décomposer` /
   `Pourcentages > définition`), qui rouvrirait un discutable tranché et toucherait 8
   références.
3. **CM1-121** : reco ×4 (simple entrée et double entrée ont chacune leur sous-notion).
   Alternative ×3 (« tableau à simple ou double entrée » sur `tableaux`). Et **CM1-122 /
   CM2-108** (problèmes à partir de données) : reco garder sur la notion ; alternative ×4.
4. **CM2-058** : reco scinder (une étape / plusieurs étapes). Alternative : garder sur la notion.
5. **6-117** : la phrase du BO est une démarche (« gagne, dans un premier temps, à prendre
   appui sur… »). Reco : spécifier quand même (rend le point questionnable : aire d'un
   rectangle de côtés décimaux). Alternative : garder « comprendre le sens » tel quel.
6. **CM1-103 / CM2-093** (propriétés des figures usuelles : triangles et quadrilatères).
   Reco : **garder** (un geste sur un catalogue de figures, comme « Reconnaitre et nommer »).
   Alternative : ×2 (`Figures planes > triangles` / `> parallélogrammes`).
7. **6-138** (« Inventer des problèmes mettant en jeu des fractions ») : peu questionnable
   automatiquement, mais objet précis et évaluable par le prof. Reco : **garder**. Alternative :
   retirer (compétence).
8. **CM2-064** (« Résoudre des problèmes préparant à l'utilisation d'algorithmes ») : vague,
   mais sa notion (`Préalgorithmique`) a été créée pour lui et ses contenus sont portés par
   d'autres points. Reco : **garder**. Alternative : retirer.
9. **CM1-006 / CM2-003** (« diverses représentations d'un nombre ») : même reco qu'au cycle 2,
   **garder**.

## Questions

- **Validation d'ensemble** : les 16 scissions, les 17 références ajoutées, les 9
  spécifications, les 2 retraits (accord explicite demandé : suppression), les 9 doutes.

## Après validation (plan de livraison)

Une PR dédiée : migration (`update` des libellés et nœuds, `insert` des 22 parties et des 17
références, `delete` gardé des 2 points retirés), mise à jour de `seed-cm.md`, `seed-6e.md`,
des fixtures et tests du CM, de la 6e et des seeds qui référencent 6-144, 6-152, 6-114 et
CM2-107 ; preuve rouge, suite d'intégration, audit, CI, merge, `db:migrate` (avec le revérif
des usages des 2 points retirés), vérification en prod.

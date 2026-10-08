# Passe « puces et points » sur le cycle 4 (5e, 4e, 3e — seed en prod) — règles du lycée

> **Statut : VALIDÉ par David le 2026-10-09 (« cycle 3 puis cycle 4 » : doutes = recos —
> dont la scission de 5-073 —, retraits compris). Avec 5-073 : 13 puces scindées (+17 points),
> 5e = 114, total = **241**. Livraison en cours (branche `feat/passe-cycle4`).**
> Même demande et même grille que [passe-cycle2.md](passe-cycle2.md) et
> [passe-cycle3.md](passe-cycle3.md). Source : « Annexe 2 — Programme de mathématiques pour le
> cycle 4 » (arrêté du 18 février 2026, BO n° 10 du 5 mars 2026 — **le texte de 2026**), 20 p.,
> relu ligne à ligne. Points relus : les **226 points** (`seed-cycle4.md` : 5-001…106,
> 4-001…069, 3-001…051). Première analyse par un agent (Opus) avec la grille, puis
> **vérifiée** : nœuds cibles présents dans l'arbre `.15`, citations du BO relues, références
> recomptées dans les fixtures, usages des points à retirer mesurés en prod, codes neufs libres
> en prod. Rien n'est modifié : ce document propose, David tranche.

## Bilan

|                                  | 5e  | 4e  | 3e  | Total                     |
| -------------------------------- | --- | --- | --- | ------------------------- |
| Puces scindées                   | 4   | 3   | 5   | **12 puces → +16 points** |
| Points spécifiés (vagues)        | 6   | 4   | 2   | **12**                    |
| Libellés remis au mot près du BO | 0   | 4   | 0   | **4** (écarts du seed)    |
| Retraits                         | 1   | 0   | 1   | **2** (⚠️ suppressions)   |
| Points après la passe            | 113 | 72  | 55  | **240** (226 + 16 − 2)    |

Codes neufs (vérifiés libres en prod) : 5-107…, 4-070…, 3-052…. La partie qui **garde le code
d'origine** est celle que visent les références existantes : ainsi aucune référence n'est
déplacée (ce qui supposerait d'en supprimer).

**Références d'automatismes à compléter (42, toutes des ajouts)** — quand la ligne qui vise le
point couvre aussi la nouvelle partie :

| Point scindé                                                    | Lignes qui le visent                                                                                                                                                                                          | Ajouts                                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 5-050 (volume du cube, pavé / du prisme)                        | 4e « Formules du volume du cube, pavé, prisme, cylindre » ; lycée « volumes (pavé, prisme, cylindre…) »                                                                                                       | +7 vers 5-108                                                                                                                              |
| 5-077 (lire tableaux, diagrammes, graphiques)                   | 2de « Lire et commenter des graphiques usuels (barres, circulaire, courbe, nuage) » ; lycée « Lire un graphique, un histogramme, un diagramme en barres ou circulaire… », « Passer du graphique aux données » | la partie « graphiques » garde 5-077 ; +7 vers 5-110 (barres) et +7 vers 5-111 (circulaires) = **+14** ; aucune ligne ne parle de tableaux |
| 4-022 (distributivité simple : développer / factoriser)         | 3e « Développer et factoriser une expression simple » ; lycée « Développer, factoriser, réduire »                                                                                                             | +8 vers 4-070                                                                                                                              |
| 3-005 (multiplier / diviser des puissances)                     | 2de, Tle techno « Opérations sur les puissances » ; 1re, Tle                                                                                                                                                  | +7 vers 3-052                                                                                                                              |
| 3-029 (quartiles / médiane d'une série en tableau ou diagramme) | 2de « moyenne, médiane, quartiles » ; 1re/Tle « indicateurs statistiques »                                                                                                                                    | +6 vers 3-056                                                                                                                              |
| 4-025, 4-034, 3-008, 3-022                                      | lignes « Résoudre x² = a, ax + b = cx + d… », « Application des théorèmes de Pythagore et de Thalès », « Écrire l'égalité de Pythagore »                                                                      | **aucun ajout** : elles ne visent que la partie qui garde le code                                                                          |

---

## 1. Puces scindées

### 5e (4 puces → +8 points)

| Point     | Puce du BO                                                                                                                                                                                         | Parties (libellé → nœud)                                                                                                                                                                                                                                                                                      | Pourquoi                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5-038** | Exploiter les relations k(a + b) = ka + kb ou k(a − b) = ka − kb pour factoriser, ou développer une expression littérale (notion)                                                                  | 5-038 « …pour factoriser une expression littérale » → `Calcul littéral > factoriser` · **5-107** « …pour développer une expression littérale » → `> développer`                                                                                                                                               | Deux gestes, deux sous-notions (précédent lycée : racines / signe). l. 534                                                                                                                         |
| **5-050** | Calculer le volume du cube, du pavé droit, du prisme droit (notion)                                                                                                                                | 5-050 « Calculer le volume du cube, du pavé droit » → `Volumes > cube et pavé` · **5-108** « Calculer le volume du prisme droit » → `> prisme et cylindre`                                                                                                                                                    | Comme la scission déjà faite de la puce voisine (5-052/5-053). l. 753. +7 références.                                                                                                              |
| **5-077** | Lire et interpréter des informations présentées sous forme de tableaux, de diagrammes et de graphiques (notion)                                                                                    | 5-077 « …sous forme de graphiques » → `Représenter des données > courbes et repères` · **5-109** « …sous forme de tableaux » → `> tableaux` · **5-110** « …sous forme de diagrammes en barres » → `> diagrammes en barres` · **5-111** « …sous forme de diagrammes circulaires » → `> diagrammes circulaires` | Même décision qu'au cycle 3 (CM1-121, CM2-107). « diagrammes » est précisé avec les mots de la puce voisine 5-078 (« diagramme en barres, diagramme circulaire », l. 997). l. 995. +14 références. |
| **5-078** | Représenter, sur papier ou à l'aide d'un tableur-grapheur, des données sous la forme d'un tableau, d'un diagramme (diagramme en barres, diagramme circulaire) ou d'un graphique cartésien (notion) | 5-078 « …sous la forme d'un tableau » → `tableaux` · **5-112** « …d'un diagramme en barres » → `diagrammes en barres` · **5-113** « …d'un diagramme circulaire » → `diagrammes circulaires` · **5-114** « …d'un graphique cartésien » → `courbes et repères`                                                  | Quatre productions réussissables séparément (le circulaire exige les angles proportionnels). « sur papier ou à l'aide d'un tableur-grapheur » est le support, gardé dans chaque partie. l. 996-997 |

### 4e (3 puces → +3 points)

| Point     | Puce du BO                                                                                                              | Parties (libellé → nœud)                                                                                                                                                                                                                                          | Pourquoi                                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **4-022** | Connaitre et utiliser la distributivité simple pour développer et factoriser une expression algébrique (notion)         | 4-022 « …pour développer une expression algébrique » → `Calcul littéral > développer` · **4-070** « …pour factoriser une expression algébrique » → `> factoriser`                                                                                                 | Comme 5-038. l. 618. +8 références.                                                                                                                                                              |
| **4-025** | Mettre en équation un problème et le résoudre à l'aide d'une équation du premier degré du type ax + b = cx + d (notion) | 4-025 « Résoudre une équation du premier degré du type ax + b = cx + d » → `Équations : premier degré > ax + b = cx + d` · **4-071** « Mettre en équation un problème à l'aide d'une équation du premier degré du type ax + b = cx + d » → `> mettre en équation` | Deux gestes, deux sous-notions. **La partie « résoudre » garde le code** : c'est elle que visent les 6 références du lycée. l. 621                                                               |
| **4-034** | Connaitre le théorème de Pythagore, sa réciproque, sa contraposée (notion)                                              | 4-034 « Connaitre le théorème de Pythagore » → `Théorème de Pythagore > calculer une longueur` · **4-072** « Connaitre la réciproque et la contraposée du théorème de Pythagore » → `> réciproque`                                                                | Calculer une longueur / décider qu'un triangle est rectangle : deux gestes. Réciproque et contraposée servent la même décision → ×2, pas ×3. l. 881. Les 7 références visent le théorème direct. |

### 3e (5 puces → +5 points)

| Point     | Puce du BO                                                                                                                                                     | Parties (libellé → nœud)                                                                                                                                                                                                                                | Pourquoi                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **3-005** | Multiplier et diviser des puissances (notion)                                                                                                                  | 3-005 « Multiplier des puissances » → `Puissances : calculs > multiplier` · **3-052** « Diviser des puissances » → `> diviser`                                                                                                                          | l. 646. +7 références.                                                                                                                         |
| **3-008** | Résoudre analytiquement et graphiquement des équations de la forme x² = a                                                                                      | 3-008 « Résoudre analytiquement des équations de la forme x² = a » → `Équations : produit et quotient > x² = a` · **3-053** « Résoudre graphiquement des équations de la forme x² = a » → `Fonction carré > x² = k, x² < k`                             | Deux méthodes réussissables séparément ; la partie graphique a son nœud. l. 660. Les 6 références visent la résolution analytique.             |
| **3-013** | Utiliser la double distributivité pour développer et factoriser des expressions dont le facteur est apparent (notion)                                          | 3-013 « …pour développer des expressions » → `Calcul littéral > développer` · **3-054** « …pour factoriser des expressions dont le facteur est apparent » → `> factoriser`                                                                              | « dont le facteur est apparent » ne qualifie que la factorisation. l. 690                                                                      |
| **3-022** | Connaitre et appliquer le théorème de Thalès, sa réciproque, sa contraposée (configurations des triangles emboités et configuration dite du papillon) (notion) | 3-022 « Connaitre et appliquer le théorème de Thalès (configurations…) » → `Théorème de Thalès > calculer une longueur` · **3-055** « Connaitre et appliquer la réciproque et la contraposée du théorème de Thalès (configurations…) » → `> réciproque` | Comme 4-034. l. 932-933                                                                                                                        |
| **3-029** | Donner les quartiles et la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres                                              | 3-029 « Donner les quartiles… » → `Indicateurs > quartiles` · **3-056** « Donner la médiane d'une série donnée sous forme de tableau d'effectifs ou de diagramme en barres » → `> médiane`                                                              | Deux objets, deux sous-notions ; la médiane sur tableau d'effectifs est neuve en 3e (en 4e : données brutes, l. 1036). l. 1068. +6 références. |

## 2. Points vagues

| Point     | Libellé actuel                                                                                                                             | Décision                                                   | Nouveau libellé                                                                                                                                                                           | Passage du BO                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5-002** | Connaitre le sens et les situations d'emploi de ces opérations.                                                                            | spécifier (ne se lit pas seul)                             | Connaitre le sens et les situations d'emploi de l'addition, de la soustraction, de la multiplication et de la division                                                                    | puce précédente, l. 435-436                                                                                                                                 |
| **5-066** | Utiliser ces propriétés dans le cas de triangles particuliers.                                                                             | spécifier                                                  | Utiliser les propriétés des hauteurs et des médianes dans le cas de triangles particuliers                                                                                                | puces précédentes, l. 799-803                                                                                                                               |
| **5-069** | Connaitre les propriétés caractéristiques des côtés opposés et des diagonales.                                                             | spécifier                                                  | Connaitre les propriétés caractéristiques des côtés opposés et des diagonales d'un parallélogramme                                                                                        | titre de section l. 812 ; l. 819-821                                                                                                                        |
| **5-070** | Utiliser une propriété caractéristique sur les diagonales ou les côtés pour les construire ou donner la nature du quadrilatère.            | spécifier (« les » = parallélogrammes)                     | Utiliser une propriété caractéristique sur les diagonales ou les côtés pour construire des parallélogrammes ou donner la nature du quadrilatère                                           | l. 820-822. 1 référence (4e) : libellé seulement.                                                                                                           |
| **5-072** | Connaitre les propriétés caractéristiques.                                                                                                 | spécifier (ne se lit pas du tout seul)                     | Connaitre les propriétés caractéristiques des parallélogrammes particuliers (rectangle, losange, carré)                                                                                   | puce précédente l. 823 ; l. 824. 1 référence (4e) : libellé seulement.                                                                                      |
| **5-092** | Introduire l'expression : « en fonction de » dans des contextes concrets ou mathématiques.                                                 | spécifier (« introduire » est un verbe du professeur)      | Employer l'expression « en fonction de » dans des contextes concrets ou mathématiques                                                                                                     | l. 1101 (« Dès la cinquième, on emploie l'expression « en fonction de » »)                                                                                  |
| **5-081** | Aborder les questions relatives au hasard à partir de problèmes simples.                                                                   | ⛔ **retrait** (suppression ; **0 usage en prod**, mesuré) | —                                                                                                                                                                                         | l. 1020 : « aborder » est une posture d'enseignement ; ce qui se questionne est porté par 5-082 (vocabulaire), 5-083 (équiprobabilité), 5-084 (fréquences). |
| **4-031** | Faire le lien avec les parallélogrammes, les angles.                                                                                       | spécifier (ne se lit pas seul)                             | Faire le lien entre la translation et les parallélogrammes, les angles                                                                                                                    | titre « Parallélogrammes et translations » l. 856 ; l. 867-868                                                                                              |
| **4-035** | Mener un travail de logique sur la réciproque et la contraposée.                                                                           | spécifier                                                  | Mener un travail de logique sur la réciproque et la contraposée : savoir que si une propriété est vraie alors sa contraposée l'est aussi, sans pour autant que sa réciproque soit vraie   | Principes, « La place du raisonnement », l. 150-152 ; l. 882                                                                                                |
| **4-049** | Exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.). | spécifier (pas de verbe — comme 2-262)                     | Calculer la probabilité d'un évènement dans des exemples simples d'expériences aléatoires à deux épreuves (par exemple, lancer de deux pièces, d'une pièce et d'un dé, de deux dés, etc.) | verbe de la puce précédente, l. 1052 ; l. 1053-1054. Doute 6.                                                                                               |
| **4-064** | Comprendre la dépendance d'une grandeur en fonction d'une autre.                                                                           | spécifier                                                  | Comprendre qu'une formule, un graphique ou un tableau de valeurs traduisent la dépendance d'une grandeur en fonction d'une autre                                                          | l. 1101-1102                                                                                                                                                |
| **3-019** | Définir les grands cercles, le diamètre.                                                                                                   | spécifier (de quoi ?)                                      | Définir les grands cercles et le diamètre d'une sphère                                                                                                                                    | puce précédente l. 910 ; l. 911                                                                                                                             |
| **3-039** | Utiliser les différentes représentations d'une fonction.                                                                                   | spécifier (comme 2-395 : nommer les représentations du BO) | Utiliser les différentes représentations d'une fonction : formule, graphique, tableau de valeurs                                                                                          | l. 1101-1103 ; l. 1188                                                                                                                                      |
| **3-031** | Comprendre et interpréter des données statistiques.                                                                                        | ⛔ **retrait** (suppression ; **0 usage en prod**, mesuré) | —                                                                                                                                                                                         | l. 1070 : « interpréter des données » sans objet (compétence, l. 958-962) ; la part questionnable est portée par 3-029, 3-030.                              |

## 3. Libellés remis au mot près du BO (écarts du seed)

| Point     | Libellé en base                                             | Texte du BO                                                         |
| --------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| **4-001** | …dans le cas où **deux** facteurs sont négatifs             | …dans le cas où **les deux** facteurs sont négatifs (l. 559)        |
| **4-003** | …un enchainement d'opérations avec **les** nombres relatifs | …avec **des** nombres relatifs (l. 561)                             |
| **4-013** | …plusieurs opérations avec **les** fractions                | …avec **des** fractions (l. 582). 8 références : libellé seulement. |
| **4-020** | …par deux entiers consécutifs                               | …par deux **nombres** entiers consécutifs (l. 601)                  |

## 4. Examinés et gardés (196)

- **Un seul nœud** (règle du lycée) : opposé et valeur absolue (5-013), lire / placer
  (5-016), comparer et ranger (5-017), alternes-internes / correspondants (5-057), médiatrices
  et cercle circonscrit (5-060), les trois théorèmes de la droite des milieux (4-033),
  développer et factoriser avec les identités remarquables (3-016, sous-notion unique),
  sections planes (3-020), cosinus / sinus / tangente (3-023 : aucune partie ne vise un nœud
  distinct), équations et inéquations linéaires (3-042).
- **Faute de sous-nœud** : tableau ou graphique de proportionnalité (5-089), représentations
  d'une fonction en 5e (5-098).
- **Problèmes limités à un outil** et **démonstrations ou raisonnements nommés** (C1 tranché).
- **Algorithmique** : verbe et objet de programmation.
- **Doublons voulus par le BO** (deux lignes du texte) : 3-001 / 3-002, 3-038 / 3-041,
  4-045 / 3-032, 4-068 / 3-051 — gardés (une fusion serait une suppression).
- **Rattachements déjà tranchés** (10 discutables, C1-C3) : non rouverts.

## 5. Doutes (avec reco)

1. **5-073** « Savoir calculer l'aire d'un parallélogramme et de figures complexes ». Reco :
   **scinder** — 5-073 « …d'un parallélogramme » → `Aires > parallélogramme` · **5-115**
   « Savoir calculer l'aire de figures complexes » → `Aires` (notion). Alternative : garder.
2. **5-045** « Résoudre des équations du type ax = c ou x + b = c » : pas de sous-notion
   « x + b = c ». Reco : **garder**.
3. **5-051** « Connaitre et convertir des unités usuelles (volume et capacité) » : le contenu
   neuf est le lien volume ↔ capacité (un geste). Reco : **garder**. Alternative : ×2
   (`Volumes > conversions` / `Contenances > unités et conversions`), 7 références.
4. **5-074** (conversions de longueur et d'aire dans un problème d'aire) et **5-084** (répéter
   une expérience et enregistrer les fréquences, une seule ligne du BO) : reco **garder**.
5. **5-085 / 5-086** (« Utiliser des proportions, des pourcentages » / « Calculer, appliquer
   des proportions, des pourcentages ») : 5-085 est la version floue de 5-086. Reco : **garder
   les deux** (deux lignes du BO). Alternative : retirer 5-085 (0 référence).
6. **4-049** : le verbe « Calculer la probabilité… » vient de la puce précédente. Reco :
   **spécifier ainsi**. Alternative : « Décrire une expérience aléatoire à deux épreuves… »
   (l. 1049).
7. **4-045 / 3-032** (« Utiliser le tableur pour calculer une moyenne, une médiane et
   l'étendue ») : le contenu est l'usage du tableur, les indicateurs ont leurs points. Reco :
   **garder**. Alternative : ×3 chacun.
8. **3-014** « Résoudre analytiquement et graphiquement une inéquation du premier degré du
   type ax ⩾ b » : la partie graphique existe déjà (3-042). Reco : **garder** (pas de doublon).
9. **3-012**, **3-025** (définitions des vecteurs), **5-011**, **5-042**, **5-075**,
   **3-047**, **3-050** : reco **garder** (rattachements tranchés, ou rien dans le BO pour
   spécifier sans ajouter).

## Questions

- **Validation d'ensemble** : les 12 scissions, les 42 références ajoutées, les 12
  spécifications, les 4 libellés remis au mot près, les 2 retraits (accord explicite
  demandé : suppressions — la ligne du point seulement, 0 usage mesuré en prod), les doutes.

## Après validation (plan de livraison)

Une PR dédiée : migration (`update` des libellés et nœuds, `insert` des 16 parties et des 42
références, `delete` gardé des 2 points retirés), mise à jour de `seed-cycle4.md`, de la
fixture et du test du cycle 4 et des seeds qui référencent 5-050, 5-077, 4-022, 3-005,
3-029 ; preuve rouge, suite d'intégration, audit, CI, merge, `db:migrate` (avec revérif des
usages), vérification en prod.

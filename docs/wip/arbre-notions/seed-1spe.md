# Seed 1re spécialité — points du programme ET références d'automatismes (architecture points → nœuds)

> **Statut : EN ATTENTE DE VALIDATION. Aucune migration avant.** ⚠️ Niveau à soin
> maximal (classes réelles de lycée). Source : « Programme d'enseignement de spécialité
> de mathématiques de la classe de première de la voie générale » (11 p., refourni par
> David le 2026-10-07), relu **puce par puce** — c'est le texte qui fait foi, pas
> l'ancien seed. Ancien découpage (`docs/wip/referentiel/1re-spe-programme.md`,
> `1SPE-001`…`1SPE-173`, en prod) : repris pour les libellés et la **traçabilité
> « ex- »**, car il porte **342 liens de modèles de questions sur 109 points**
> (transfert C5). Mapping des nœuds : [programmes-ecarts-1re-spe.md](programmes-ecarts-1re-spe.md)
> (U1-U5 tranchées le 2026-10-07). Arbre `2026-10-07.15`, **aucun changement d'arbre**.
> Règles déjà tranchées appliquées sans être redemandées : critère de scission du lycée,
> puces trop larges non retenues (ex-2-099/100), bloc Algorithmique en `algorithme` (L1),
> Approfondissements en savoir-faire `approfondissement` (L3), duplication de la liste
> d'automatismes de 2de (C16).

## Attributs communs

| Attribut               | Valeur                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `1_SPE`                                                                                                                      |
| `code`                 | **`1SPE-201` à `1SPE-368`** (code = 200 + display_order). L'ancien seed occupe `1SPE-001`…`1SPE-173` jusqu'à l'étape 4 de C5 |
| `objective_id`, `rang` | `NULL`                                                                                                                       |
| `rubrique`             | « thème > section » du BO (C11) ; le Vocabulaire ensembliste et logique n'a pas de section → le thème seul                   |
| `kind`                 | conn. (Contenus) / s-f (Capacités) / dém. (Démonstrations) / algo. (bloc Algorithmique + Exemples d'algorithme)              |
| `exigence`             | `attendu` ; **⁺** = Approfondissement possible → `approfondissement` ; Exemples d'algorithme → **question E1**               |
| `regime_acquisition`   | `diversite` partout                                                                                                          |

**168 points** et des **références d'automatismes** (lignes propres de la 1re + reprise
de la liste de 2de, C16). Colonne « ex- » : ancien code `1SPE-xxx` (✂ = issu d'une
scission, `+` = deux anciens points fusionnés, — = sans ancien équivalent).

---

## ⚠️ Les puces multi-parties : scindées ou non, une par une

> Critère (2de, validé) : on scinde quand les parties visent **des notions ou
> sous-notions différentes** OU sont **traitées à des moments différents de l'année** ;
> on ne scinde pas les variantes d'un même geste.

### Scindées (12 puces → 26 points)

| Puce du BO                                                                                                                                 | Décision                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « utiliser les quantificateurs (∀, ∃ non exigibles) et repérer les quantifications implicites… »                                           | **×2** (application de U1 : « les quantifications implicites = simple point ») : utiliser / repérer les implicites, tous deux sous `pour tout, il existe`.                                           |
| « Générer une liste (en extension, par ajouts successifs ou en compréhension) »                                                            | **×2** : extension/ajouts (`Listes > créer une liste`) ≠ compréhension (`> liste en compréhension`) — même raison que les boucles bornée/non bornée de 2de.                                          |
| « Pour une suite arithmétique ou géométrique, calculer le terme général, la somme de termes consécutifs, déterminer le sens de variation » | **×6** (l'ancien seed en faisait 3) : trois gestes × **deux notions** (`Suites arithmétiques` / `Suites géométriques`), traitées dans deux chapitres distincts.                                      |
| [D] « Calcul du terme général d'une suite arithmétique, d'une suite géométrique »                                                          | **×2** : deux démonstrations, deux notions (comme « variations carré, inverse » en 2de).                                                                                                             |
| [Algo] « Calcul de termes d'une suite, de sommes de termes, de seuil »                                                                     | **×2** : termes et sommes (`Suites et modélisation > algorithmes`) ≠ seuil (`> seuil`, famille à part, liée aux limites).                                                                            |
| « Fonction polynôme du second degré donnée sous forme factorisée. Racines, signe, expression de la somme et du produit des racines »       | **×2** : forme factorisée, racines, signe (notion `Second degré`) / somme et produit des racines (`> somme et produit des racines`) — rétablit l'ancien découpage 051/057.                           |
| « Forme canonique… Discriminant. Factorisation éventuelle. Résolution d'une équation du second degré. Signe. »                             | **×3** : **deux notions** — forme canonique (`Fonctions › Second degré > formes`), discriminant et résolution (`Algèbre › Équations : second degré > discriminant`), signe (`Second degré > signe`). |
| « Exploiter les variations d'une fonction pour établir une inégalité. Étudier la position relative de deux courbes représentatives. »      | **×2** : deux sous-notions (`Dérivation > variations` / `> position relative de deux courbes`), deux gestes réussissables séparément.                                                                |
| « Espérance, variance, écart type d'une variable aléatoire »                                                                               | **×2** : `Variables aléatoires > espérance` / `> variance et écart-type` (sous-notions distinctes ; U4 y range déjà linéarité et König-Huygens).                                                     |
| « Calculer une espérance, une variance, un écart type »                                                                                    | **×2** : même critère.                                                                                                                                                                               |

### Examinées et NON scindées (variantes d'un même geste, ou un seul nœud)

| Puce du BO                                                                                                                             | Pourquoi UN point                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, à croissance exponentielle par une géométrique »    | Le geste est le CHOIX du modèle → `Suites et modélisation` (notion), qui couvre les deux.                                                                                                                                                                                                            |
| « Factoriser… en diversifiant les stratégies : racine évidente, somme et produit, identité remarquable, formules générales »           | Un geste (factoriser), stratégies = gradation `level` (comme les formes d'équations de 2de).                                                                                                                                                                                                         |
| « Fonction dérivée des fonctions carré, cube, inverse, racine carrée » ; [D] « dérivée de la fonction carrée, de la fonction inverse » | Une seule sous-notion (`fonctions dérivées`) : la table des dérivées de référence s'apprend d'un bloc.                                                                                                                                                                                               |
| « Étudier les variations d'une fonction. Déterminer les extrémums. »                                                                   | Un geste (étude de fonction) → `Dérivation > étude de fonction`.                                                                                                                                                                                                                                     |
| « Étudier, en lien avec la dérivation, une fonction du second degré : variations, extrémum, allure »                                   | Une étude → `Second degré > variations`.                                                                                                                                                                                                                                                             |
| « Signe, sens de variation et courbe représentative de la fonction exponentielle. Lien avec les suites géométriques. »                 | Non scindée **au-delà de l'ancien découpage** (099 / 100, déjà deux points) : signe-variations-courbe d'un bloc sur la notion.                                                                                                                                                                       |
| « Cosinus et sinus d'un nombre réel. Lien avec le triangle rectangle. Valeurs remarquables. »                                          | Le contenu est cos/sin d'un réel ; le « lien » est un rappel, pas un second contenu.                                                                                                                                                                                                                 |
| « Succession de deux épreuves indépendantes. Représentation par un arbre ou un tableau » (+ la capacité associée)                      | ⚠️ Diffère de 2de (où « arbre ou tableau » a été scindé) : en 2de les sous-notions ÉTAIENT les registres (`arbres pondérés` / `tableaux croisés`) ; ici le contenu est la succession d'épreuves (`épreuves indépendantes successives`), le registre est secondaire — scinder disperserait le filtre. |
| [Algo] « Monte-Carlo : aire sous la parabole, nombre π »                                                                               | Une méthode, deux exemples.                                                                                                                                                                                                                                                                          |

## ⚠️ Puces trop larges (règle 2de : « résous comme tu veux » = évaluation par compétence)

| Puce                                                                                                                                                                                                                | Décision                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| « Utiliser le produit scalaire pour résoudre un problème géométrique » (ex-1SPE-129, 2 liens)                                                                                                                       | ⛔ **non retenue** — jumelle d'ex-2-099 (« la représentation la plus adaptée des vecteurs »). Liens → 1SPE-323. |
| « Utiliser un repère pour étudier une configuration » (ex-1SPE-142, 3 liens)                                                                                                                                        | ⛔ **non retenue** — jumelle d'ex-2-100 (« méthodes diverses »). Liens → 1SPE-332.                              |
| « …utiliser les registres langue naturelle / algébrique / graphique et passer de l'un à l'autre » (suites)                                                                                                          | ✅ gardée : un geste précis sur un objet précis (changer de registre pour une suite), cochable.                 |
| « Passer du registre de la langue naturelle au registre symbolique et inversement » (variables aléatoires)                                                                                                          | ✅ gardée — même choix qu'en 2de (2-395, probabilités conditionnelles).                                         |
| « Choisir une forme adaptée… » · « calculer le produit scalaire en choisissant une méthode adaptée » · « Résoudre un problème d'optimisation » · « Utiliser la notion d'espérance dans une résolution de problème » | ✅ gardées : le problème est circonscrit à UN outil et UN geste (mêmes choix qu'en 2de : 2-275, 2-353).         |

## ⚠️ Points trop vagues : spécifier ou retirer (question V2)

> Règle de David (2026-10-08) : « des points trop vagues mériteraient d'être spécifiés
> pour être questionnables, à moins que ce soit un point relevant de l'évaluation par
> compétence ». Le libellé STOCKÉ devient le libellé spécifié (verbe d'action + objet
> précis, sans rien ajouter au BO). Les Contenus (conn.) gardent le texte du BO : ils
> nomment un savoir, questionnable tel quel (énoncer, appliquer).

### A. Compétence → retiré

| Point                                                                                     | Liens | Pourquoi                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1SPE-223 « Proposer, modéliser une situation permettant de générer une suite de nombres » | 0     | « Modéliser » est une des six compétences ; sa part questionnable est déjà portée par 1SPE-224 (relation pour un motif, un dénombrement) et 1SPE-235 (croissance linéaire / exponentielle). |

### B. Capacités à spécifier

| Point        | Libellé du BO                                                                                                                         | Libellé spécifié proposé                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1SPE-203** | Utiliser les quantificateurs (∀ et ∃ non exigibles)                                                                                   | Écrire une proposition à l'aide de « pour tout » ou « il existe », et déterminer si elle est vraie (les symboles $\forall$ et $\exists$ ne sont pas exigibles)                                                                                                                                                               |
| **1SPE-222** | Dans le cadre de l'étude d'une suite, utiliser le registre de la langue naturelle, algébrique, graphique, et passer de l'un à l'autre | Passer de l'expression d'une suite à sa représentation graphique et inversement : lire des termes sur un nuage de points ou un escalier, associer une formule à un nuage, conjecturer le sens de variation — nœud → `Généralités sur les suites > représentation graphique` (ses **7 modèles liés** sont exactement ceux-là) |
| **1SPE-356** | Passer du registre de la langue naturelle au registre symbolique et inversement                                                       | Traduire un évènement décrit en langage naturel à l'aide de la variable aléatoire ($\{X = a\}$, $\{X \leqslant a\}$, $\{X > a\}$…), et inversement                                                                                                                                                                           |
| **1SPE-357** | Modéliser une situation à l'aide d'une variable aléatoire                                                                             | Définir la variable aléatoire associée à une situation (gain d'un jeu, nombre de succès…) et donner l'ensemble de ses valeurs                                                                                                                                                                                                |
| **1SPE-367** | Étudier sur des exemples la distance entre la moyenne d'un échantillon simulé de taille $n$ et l'espérance                            | Calculer, sur des échantillons simulés de tailles croissantes, l'écart entre la moyenne observée et l'espérance, et constater qu'il tend à diminuer                                                                                                                                                                          |

### C. Approfondissements : un titre de sujet → un geste

| Point        | Libellé du BO                                              | Libellé spécifié proposé                                                                                                   |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **1SPE-242** | Tour de Hanoï                                              | Tour de Hanoï : établir la relation de récurrence du nombre minimal de déplacements et en déduire son expression explicite |
| **1SPE-243** | Somme des $n$ premiers carrés, des $n$ premiers cubes      | Établir ou vérifier les formules de la somme des $n$ premiers carrés et des $n$ premiers cubes                             |
| **1SPE-244** | Remboursement d'un emprunt par annuités constantes         | Calculer l'annuité constante de remboursement d'un emprunt à l'aide d'une suite géométrique                                |
| **1SPE-326** | Loi des sinus                                              | Établir la loi des sinus et l'utiliser pour calculer une longueur ou un angle                                              |
| **1SPE-327** | Concourance des hauteurs d'un triangle                     | Démontrer à l'aide du produit scalaire que les hauteurs d'un triangle sont concourantes                                    |
| **1SPE-328** | Les médianes d'un triangle concourent au centre de gravité | Démontrer que les médianes d'un triangle concourent au centre de gravité                                                   |
| **1SPE-347** | Exemples de succession de plusieurs épreuves indépendantes | Calculer une probabilité dans une succession de plus de deux épreuves indépendantes                                        |
| **1SPE-348** | Exemples de marches aléatoires                             | Marche aléatoire : déterminer la loi de la position après quelques pas                                                     |

### D. Exemples d'algorithme : un sujet → « écrire ou compléter un algorithme qui… »

| Point        | Libellé du BO                                                                          | Libellé spécifié proposé                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **1SPE-238** | Calcul de termes d'une suite, de sommes de termes                                      | Écrire ou compléter un algorithme calculant des termes d'une suite ou des sommes de termes                                                |
| **1SPE-239** | Calcul de seuil                                                                        | Écrire ou compléter un algorithme de recherche de seuil                                                                                   |
| **1SPE-240** | Calcul de factorielle                                                                  | Écrire ou compléter un algorithme calculant $n!$                                                                                          |
| **1SPE-241** | Liste des premiers termes d'une suite : Syracuse, Fibonacci                            | Écrire ou compléter un algorithme listant les premiers termes d'une suite (suites de Syracuse, de Fibonacci)                              |
| **1SPE-290** | Méthode de Newton, en se limitant à des cas favorables                                 | Écrire ou compléter un algorithme approchant une solution de $f(x) = 0$ par la méthode de Newton (cas favorables)                         |
| **1SPE-300** | Construction de l'exponentielle par la méthode d'Euler                                 | Écrire ou compléter un algorithme construisant une approximation de la fonction exponentielle par la méthode d'Euler                      |
| **1SPE-301** | Valeur approchée de $e$ à l'aide de la suite $((1 + 1/n)^n)$                           | Écrire ou compléter un algorithme donnant une valeur approchée de $e$ à l'aide de la suite $\left(\left(1 + \tfrac{1}{n}\right)^n\right)$ |
| **1SPE-311** | Approximation de $\pi$ par la méthode d'Archimède                                      | Écrire ou compléter un algorithme approchant $\pi$ par la méthode d'Archimède                                                             |
| **1SPE-346** | Méthode de Monte-Carlo : aire sous la parabole, nombre $\pi$                           | Écrire ou compléter un algorithme estimant, par la méthode de Monte-Carlo, l'aire sous une parabole ou le nombre $\pi$                    |
| **1SPE-362** | Algorithme renvoyant l'espérance, la variance ou l'écart type d'une variable aléatoire | Écrire ou compléter un algorithme renvoyant l'espérance, la variance ou l'écart type d'une variable aléatoire                             |
| **1SPE-363** | Fréquence d'apparition des lettres d'un texte, en français, en anglais                 | Écrire ou compléter un algorithme calculant la fréquence d'apparition des lettres d'un texte                                              |

Les autres capacités du document ont déjà un verbe d'action et un objet précis
(calculer, déterminer, représenter, résoudre…) : questionnables telles quelles.

⚠️ **La 2de (en prod) n'a pas eu cette passe** (ex. « Modéliser par des fonctions des
situations issues des mathématiques… », les titres d'approfondissements) : à faire en
une PR dédiée après la 1re, si V2 est validée.

## Anciens points absents du texte littéral du BO — S1 TRANCHÉE (David, 2026-10-08)

L'ancien seed contient des libellés ajoutés à la relecture du 2026-08-30, absents du
texte **littéral** du BO. David : « ils existent sûrement car des modèles de questions
les questionnent » — vérifié en prod, ce sont de vrais gestes avec leurs familles de
modèles, et ils sont **dans le BO, noyés dans d'autres puces**. Décision : les garder
comme points (explicitation d'une puce du BO, même principe que les scissions), avec
leur ancien code → transfert des liens **un pour un**.

| Ancien point                                                          | Liens | Devient                                                                                                     | Contenu du BO qui le porte                                                    |
| --------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1SPE-050 « Forme développée… Coefficients »                           | 4     | ✅ **1SPE-245** (`Second degré > formes`)                                                                   | « Choisir une forme adaptée (**développée réduite**, canonique, factorisée) » |
| 1SPE-054 « Sommet d'une parabole. Axe de symétrie »                   | 5     | ✅ **1SPE-249** (`Second degré > parabole`)                                                                 | « …variations, **extrémum**, **allure** » ; forme canonique                   |
| 1SPE-056 « Résolution d'une inéquation du second degré »              | 3     | ✅ **1SPE-252** (`Inéquations : second degré > inéquations du second degré`)                                | « Choisir une forme adaptée… (équation, **inéquation**…) » ; « Signe »        |
| 1SPE-062 « Résoudre ces problèmes à l'aide du discriminant… »         | 1     | ⛔ non repris — son seul modèle (« Résoudre une inéquation du second degré ») est déjà lié à 056 → 1SPE-252 | —                                                                             |
| 1SPE-017 « Génération des listes… en lien avec la notion d'ensemble » | 0     | ⛔ non repris — phrase de présentation, redondante avec 1SPE-207/208                                        | —                                                                             |

------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------- |
| 1SPE-050 « Forme développée… Coefficients » | 4 | 1SPE-256 (choisir une forme adaptée) |
| 1SPE-054 « Calcul des coordonnées du sommet d'une parabole. Axe de symétrie » | 5 | 1SPE-289 (second degré en lien avec la dérivation : variations, extrémum, allure) |
| 1SPE-056 « Résolution d'une inéquation du second degré » | 3 | 1SPE-251 (signe d'une fonction polynôme du second degré) |
| 1SPE-062 « Résoudre ces problèmes à l'aide du discriminant… » | 1 | 1SPE-250 (discriminant, résolution) |
| 1SPE-017 « Génération des listes en extension et en compréhension, en lien avec la notion d'ensemble » | 0 | — (phrase de présentation, redondante avec 1SPE-207/208) |

---

## Les 168 points

### Vocabulaire ensembliste et logique (rubrique = le thème)

> La 1re **reprend mot pour mot** une grande partie du vocabulaire de 2de. Décision U5
> (2026-10-07) : « points de 1re seulement là où la 1re dépasse la 2de, le reste est
> entretien » → 6 points ici ; l'entretien → **question V1**.

| Code     | ex-    | Énoncé                                                                                                                     | kind | nœud                                                                              |
| -------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| 1SPE-201 | 010    | Employer les expressions « condition nécessaire », « condition suffisante »                                                | s-f  | `Logique` Implication et équivalence > condition nécessaire, condition suffisante |
| 1SPE-202 | 011    | Identifier le statut des égalités (identité, équation) et celui des lettres utilisées (variable, inconnue, paramètre)      | s-f  | `Logique` Proposition mathématique > statut des lettres et des égalités           |
| 1SPE-203 | ✂012a | Utiliser les quantificateurs (les symboles $\forall$ et $\exists$ ne sont pas exigibles)                                   | s-f  | `Logique` Quantificateurs et négation > pour tout, il existe                      |
| 1SPE-204 | ✂012b | Repérer les quantifications implicites dans certaines propositions, particulièrement dans les propositions conditionnelles | s-f  | `Logique` Quantificateurs et négation > pour tout, il existe                      |
| 1SPE-205 | 013    | Formuler la négation de propositions quantifiées                                                                           | s-f  | `Logique` Quantificateurs et négation > négation d'une proposition                |
| 1SPE-206 | 016    | Produire un raisonnement par contraposée                                                                                   | s-f  | `Logique` Raisonnements > par contraposée                                         |

### Algorithmique et programmation > Notion de liste (kind `algorithme`, L1)

| Code     | ex-    | Énoncé                                                                         | kind  | nœud                                            |
| -------- | ------ | ------------------------------------------------------------------------------ | ----- | ----------------------------------------------- |
| 1SPE-207 | ✂018a | Générer une liste en extension ou par ajouts successifs                        | algo. | `Algorithmique` Listes > créer une liste        |
| 1SPE-208 | ✂018b | Générer une liste en compréhension                                             | algo. | `Algorithmique` Listes > liste en compréhension |
| 1SPE-209 | 019    | Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices | algo. | `Algorithmique` Listes > éléments et indices    |
| 1SPE-210 | 020    | Parcourir une liste                                                            | algo. | `Algorithmique` Listes > parcourir une liste    |
| 1SPE-211 | 021    | Itérer sur les éléments d'une liste                                            | algo. | `Algorithmique` Listes > parcourir une liste    |

### Algèbre > Suites numériques, modèles discrets (branche `Suites`)

| Code     | ex-    | Énoncé                                                                                                                                                                  | kind  | nœud                                                                       |
| -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| 1SPE-212 | 022    | Exemples de modes de génération d'une suite : explicite $u_n = f(n)$, par une relation de récurrence $u_{n+1} = f(u_n)$, par un algorithme, par des motifs géométriques | conn. | Généralités sur les suites (notion)                                        |
| 1SPE-213 | 023    | Notations : $u(n)$, $u_n$, $(u(n))$, $(u_n)$                                                                                                                            | conn. | Généralités sur les suites (notion)                                        |
| 1SPE-214 | 024    | Suites arithmétiques : exemples, définition, calcul du terme général                                                                                                    | conn. | Suites arithmétiques > terme général                                       |
| 1SPE-215 | 025    | Suites arithmétiques : lien avec l'étude d'évolutions successives à accroissements constants ; lien avec les fonctions affines                                          | conn. | Suites arithmétiques (notion)                                              |
| 1SPE-216 | 026    | Suites arithmétiques : calcul de $1 + 2 + \cdots + n$                                                                                                                   | conn. | Suites arithmétiques > somme des termes                                    |
| 1SPE-217 | 027    | Suites géométriques : exemples, définition, calcul du terme général                                                                                                     | conn. | Suites géométriques > terme général                                        |
| 1SPE-218 | 028    | Suites géométriques : lien avec l'étude d'évolutions successives à taux constant ; lien avec la fonction exponentielle                                                  | conn. | Suites géométriques (notion)                                               |
| 1SPE-219 | 029    | Suites géométriques : calcul de $1 + q + \cdots + q^n$                                                                                                                  | conn. | Suites géométriques > somme des termes                                     |
| 1SPE-220 | 030    | Sens de variation d'une suite                                                                                                                                           | conn. | Généralités sur les suites > sens de variation                             |
| 1SPE-221 | 031    | Sur des exemples, introduction intuitive de la notion de limite, finie ou infinie, ou de l'absence de limite d'une suite                                                | conn. | Limites de suites > définition                                             |
| 1SPE-222 | 032    | Dans le cadre de l'étude d'une suite, utiliser le registre de la langue naturelle, le registre algébrique, le registre graphique, et passer de l'un à l'autre           | s-f   | Généralités sur les suites (notion)                                        |
| 1SPE-223 | 033    | Proposer, modéliser une situation permettant de générer une suite de nombres                                                                                            | s-f   | Suites et modélisation (notion)                                            |
| 1SPE-224 | 034    | Déterminer une relation explicite ou une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement                       | s-f   | Généralités sur les suites > deviner le terme général                      |
| 1SPE-225 | 035    | Calculer des termes d'une suite définie explicitement, par récurrence ou par un algorithme                                                                              | s-f   | Généralités sur les suites > calculer un terme                             |
| 1SPE-226 | ✂036a | Pour une suite arithmétique, calculer le terme général                                                                                                                  | s-f   | Suites arithmétiques > terme général                                       |
| 1SPE-227 | ✂036b | Pour une suite géométrique, calculer le terme général                                                                                                                   | s-f   | Suites géométriques > terme général                                        |
| 1SPE-228 | ✂037a | Pour une suite arithmétique, calculer la somme de termes consécutifs                                                                                                    | s-f   | Suites arithmétiques > somme des termes                                    |
| 1SPE-229 | ✂037b | Pour une suite géométrique, calculer la somme de termes consécutifs                                                                                                     | s-f   | Suites géométriques > somme des termes                                     |
| 1SPE-230 | ✂038a | Pour une suite arithmétique, déterminer le sens de variation                                                                                                            | s-f   | Suites arithmétiques (notion)                                              |
| 1SPE-231 | ✂038b | Pour une suite géométrique, déterminer le sens de variation                                                                                                             | s-f   | Suites géométriques (notion)                                               |
| 1SPE-232 | 039    | Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, un phénomène discret à croissance exponentielle par une suite géométrique              | s-f   | Suites et modélisation (notion)                                            |
| 1SPE-233 | 040    | Conjecturer, dans des cas simples, la limite éventuelle d'une suite                                                                                                     | s-f   | Limites de suites > définition                                             |
| 1SPE-234 | ✂041a | Calcul du terme général d'une suite arithmétique                                                                                                                        | dém.  | Suites arithmétiques > terme général                                       |
| 1SPE-235 | ✂041b | Calcul du terme général d'une suite géométrique                                                                                                                         | dém.  | Suites géométriques > terme général                                        |
| 1SPE-236 | 042    | Calcul de $1 + 2 + \cdots + n$                                                                                                                                          | dém.  | Suites arithmétiques > somme des termes                                    |
| 1SPE-237 | 043    | Calcul de $1 + q + \cdots + q^n$                                                                                                                                        | dém.  | Suites géométriques > somme des termes                                     |
| 1SPE-238 | ✂044a | Calcul de termes d'une suite, de sommes de termes                                                                                                                       | algo. | Suites et modélisation > algorithmes                                       |
| 1SPE-239 | ✂044b | Calcul de seuil                                                                                                                                                         | algo. | Suites et modélisation > seuil                                             |
| 1SPE-240 | 045    | Calcul de factorielle                                                                                                                                                   | algo. | `Dénombrement` Arrangements et permutations > factorielle _(discutable 1)_ |
| 1SPE-241 | 046    | Liste des premiers termes d'une suite : suites de Syracuse, suite de Fibonacci                                                                                          | algo. | Suites et modélisation > algorithmes                                       |
| 1SPE-242 | 047    | Tour de Hanoï                                                                                                                                                           | s-f ⁺ | Généralités sur les suites > explicite ou par récurrence                   |
| 1SPE-243 | 048    | Somme des $n$ premiers carrés, des $n$ premiers cubes                                                                                                                   | s-f ⁺ | Généralités sur les suites (notion)                                        |
| 1SPE-244 | 049    | Remboursement d'un emprunt par annuités constantes                                                                                                                      | s-f ⁺ | Suites et modélisation > placements                                        |

### Algèbre > Équations, fonctions polynômes du second degré (branches `Fonctions` / `Algèbre`)

| Code     | ex-       | Énoncé                                                                                                                                                                                                             | kind  | nœud                                                                  |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------------- |
| 1SPE-245 | 050       | Forme développée d'une fonction polynôme du second degré ; coefficients                                                                                                                                            | conn. | `Fonctions` Second degré > formes                                     |
| 1SPE-246 | ✂051     | Fonction polynôme du second degré donnée sous forme factorisée ; racines, signe                                                                                                                                    | conn. | `Fonctions` Second degré (notion)                                     |
| 1SPE-247 | ✂057     | Expression de la somme et du produit des racines                                                                                                                                                                   | conn. | `Fonctions` Second degré > somme et produit des racines               |
| 1SPE-248 | ✂052     | Forme canonique d'une fonction polynôme du second degré                                                                                                                                                            | conn. | `Fonctions` Second degré > formes                                     |
| 1SPE-249 | 054       | Calcul des coordonnées du sommet d'une parabole ; axe de symétrie                                                                                                                                                  | conn. | `Fonctions` Second degré > parabole                                   |
| 1SPE-250 | ✂053+055 | Discriminant ; factorisation éventuelle ; résolution d'une équation du second degré                                                                                                                                | conn. | `Algèbre` Équations : second degré > discriminant                     |
| 1SPE-251 | ✂—       | Signe d'une fonction polynôme du second degré                                                                                                                                                                      | conn. | `Fonctions` Second degré > signe                                      |
| 1SPE-252 | 056       | Résolution d'une inéquation du second degré                                                                                                                                                                        | conn. | `Algèbre` Inéquations : second degré > inéquations du second degré    |
| 1SPE-253 | 058       | Étudier le signe d'une fonction polynôme du second degré donnée sous forme factorisée                                                                                                                              | s-f   | `Fonctions` Second degré > signe                                      |
| 1SPE-254 | 059       | Déterminer les fonctions polynômes du second degré s'annulant en deux nombres réels distincts                                                                                                                      | s-f   | `Fonctions` Second degré > racines                                    |
| 1SPE-255 | 060       | Factoriser une fonction polynôme du second degré, en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales | s-f   | `Fonctions` Second degré > formes                                     |
| 1SPE-256 | 061       | Choisir une forme adaptée (développée réduite, canonique, factorisée) d'une fonction polynôme du second degré dans le cadre de la résolution d'un problème (équation, inéquation, optimisation, variations)        | s-f   | `Fonctions` Second degré > formes                                     |
| 1SPE-257 | 063       | Résolution de l'équation du second degré                                                                                                                                                                           | dém.  | `Algèbre` Équations : second degré > discriminant                     |
| 1SPE-258 | 064       | Factorisation d'un polynôme du troisième degré admettant une racine et résolution de l'équation associée                                                                                                           | s-f ⁺ | `Nombres complexes` Équations polynomiales > degré 3 et factorisation |
| 1SPE-259 | 065       | Factorisation de $x^n - 1$ par $x - 1$, de $x^n - a^n$ par $x - a$                                                                                                                                                 | s-f ⁺ | `Algèbre` Calcul littéral > factoriser                                |
| 1SPE-260 | 066       | Déterminer deux nombres réels connaissant leur somme $s$ et leur produit $p$ comme racines de la fonction polynôme $x \mapsto x^2 - sx + p$                                                                        | s-f ⁺ | `Fonctions` Second degré > somme et produit des racines               |

### Analyse > Dérivation (branche `Fonctions`)

| Code     | ex- | Énoncé                                                                                                                                     | kind  | nœud                                     |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------------------- |
| 1SPE-261 | 067 | Taux de variation ; sécantes à la courbe représentative d'une fonction en un point donné                                                   | conn. | Dérivation > taux de variation           |
| 1SPE-262 | 068 | Nombre dérivé d'une fonction en un point, comme limite du taux de variation ; notation $f'(a)$                                             | conn. | Dérivation > nombre dérivé               |
| 1SPE-263 | 069 | Tangente à la courbe représentative d'une fonction en un point, comme « limite des sécantes » ; pente ; équation $y = f(a) + f'(a)(x - a)$ | conn. | Dérivation > tangente                    |
| 1SPE-264 | 070 | Approximation linéaire : fonction affine tangente $x \mapsto f(a) + f'(a)(x - a)$ et approximation de $f(a + h)$ par $f(a) + f'(a)h$       | conn. | Dérivation > approximation affine        |
| 1SPE-265 | 071 | Fonction dérivable sur un intervalle ; fonction dérivée                                                                                    | conn. | Dérivation > fonctions dérivées          |
| 1SPE-266 | 072 | Fonction dérivée des fonctions carré, cube, inverse, racine carrée                                                                         | conn. | Dérivation > fonctions dérivées          |
| 1SPE-267 | 073 | Opérations sur les fonctions dérivables : somme, produit, inverse, quotient                                                                | conn. | Dérivation > opérations sur les dérivées |
| 1SPE-268 | 074 | Pour $n$ dans $\mathbb{Z}$, fonction dérivée de la fonction $x \mapsto x^n$                                                                | conn. | Dérivation > fonctions dérivées          |
| 1SPE-269 | 075 | Fonction valeur absolue : étude de la dérivabilité en 0                                                                                    | conn. | Dérivation > dérivabilité en un point    |
| 1SPE-270 | 076 | Calculer un taux de variation, la pente d'une sécante                                                                                      | s-f   | Dérivation > taux de variation           |
| 1SPE-271 | 077 | Interpréter le nombre dérivé en contexte : pente d'une tangente, vitesse instantanée, cout marginal, etc.                                  | s-f   | Dérivation > nombre dérivé               |
| 1SPE-272 | 078 | Déterminer graphiquement un nombre dérivé par la pente de la tangente                                                                      | s-f   | Dérivation > nombre dérivé               |
| 1SPE-273 | 079 | Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé                                                | s-f   | Dérivation > tangente                    |
| 1SPE-274 | 080 | Déterminer l'équation de la tangente en un point à la courbe représentative d'une fonction                                                 | s-f   | Dérivation > tangente                    |
| 1SPE-275 | 081 | Calculer une valeur approchée de $f(a + h)$                                                                                                | s-f   | Dérivation > approximation affine        |
| 1SPE-276 | 082 | Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables                | s-f   | Dérivation > opérations sur les dérivées |
| 1SPE-277 | 083 | Équation de la tangente en un point à une courbe représentative                                                                            | dém.  | Dérivation > tangente                    |
| 1SPE-278 | 084 | La fonction racine carrée n'est pas dérivable en 0                                                                                         | dém.  | Dérivation > dérivabilité en un point    |
| 1SPE-279 | 085 | Fonction dérivée de la fonction carrée, de la fonction inverse                                                                             | dém.  | Dérivation > fonctions dérivées          |
| 1SPE-280 | 086 | Fonction dérivée d'un produit                                                                                                              | dém.  | Dérivation > opérations sur les dérivées |
| 1SPE-281 | 087 | Écrire la liste des coefficients directeurs des sécantes pour un pas donné                                                                 | algo. | Dérivation > taux de variation           |

### Analyse > Variations et courbes représentatives des fonctions (branche `Fonctions`)

| Code     | ex-    | Énoncé                                                                                                                                                   | kind  | nœud                                           |
| -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------- |
| 1SPE-282 | 088    | Représentation algébrique et graphique de fonctions paires, impaires ; traduction géométrique                                                            | conn. | Généralités sur les fonctions > parité         |
| 1SPE-283 | 089    | Lien entre le sens de variation d'une fonction dérivable sur un intervalle et le signe de sa fonction dérivée ; caractérisation des fonctions constantes | conn. | Dérivation > variations                        |
| 1SPE-284 | 090    | Nombre dérivé en un extrémum, tangente à la courbe représentative                                                                                        | conn. | Dérivation > variations                        |
| 1SPE-285 | 091    | Étudier les variations d'une fonction ; déterminer les extrémums                                                                                         | s-f   | Dérivation > étude de fonction                 |
| 1SPE-286 | 092    | Résoudre un problème d'optimisation                                                                                                                      | s-f   | Dérivation > optimisation                      |
| 1SPE-287 | ✂093a | Exploiter les variations d'une fonction pour établir une inégalité                                                                                       | s-f   | Dérivation > variations _(discutable 2)_       |
| 1SPE-288 | ✂093b | Étudier la position relative de deux courbes représentatives                                                                                             | s-f   | Dérivation > position relative de deux courbes |
| 1SPE-289 | 094    | Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations, extrémum, allure selon le signe du coefficient de $x^2$         | s-f   | Second degré > variations                      |
| 1SPE-290 | 095    | Méthode de Newton, en se limitant à des cas favorables                                                                                                   | algo. | Dérivation > tangente _(discutable 3)_         |

### Analyse > Fonction exponentielle (branche `Fonctions`)

| Code     | ex- | Énoncé                                                                                                                                                                        | kind  | nœud                                             |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| 1SPE-291 | 096 | Définition de la fonction exponentielle comme unique fonction dérivable sur $\mathbb{R}$ vérifiant $f' = f$ et $f(0) = 1$ (existence et unicité admises) ; notation $\exp(x)$ | conn. | Fonction exponentielle (notion)                  |
| 1SPE-292 | 097 | Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$ et $\exp(x)\exp(-x) = 1$                                                                                           | conn. | Fonction exponentielle > propriétés algébriques  |
| 1SPE-293 | 098 | Nombre $e$ ; notation $e^x$                                                                                                                                                   | conn. | Fonction exponentielle > propriétés algébriques  |
| 1SPE-294 | 099 | Signe, sens de variation et courbe représentative de la fonction exponentielle                                                                                                | conn. | Fonction exponentielle (notion)                  |
| 1SPE-295 | 100 | Lien avec les suites géométriques                                                                                                                                             | conn. | Fonction exponentielle > suites et modélisation  |
| 1SPE-296 | 101 | Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle                                                                               | s-f   | Fonction exponentielle > propriétés algébriques  |
| 1SPE-297 | 102 | Pour $a$ réel, dérivée de la fonction $t \mapsto e^{at}$                                                                                                                      | s-f   | Fonction exponentielle > dérivée                 |
| 1SPE-298 | 103 | Pour une valeur numérique strictement positive de $k$, représenter graphiquement les fonctions $t \mapsto e^{-kt}$ et $t \mapsto e^{kt}$                                      | s-f   | Fonction exponentielle > courbe                  |
| 1SPE-299 | 104 | Modéliser une situation par une croissance, une décroissance exponentielle (évolution d'un capital à taux fixe, décroissance radioactive)                                     | s-f   | Fonction exponentielle > suites et modélisation  |
| 1SPE-300 | 105 | Construction de l'exponentielle par la méthode d'Euler                                                                                                                        | algo. | Fonction exponentielle (notion) _(discutable 3)_ |
| 1SPE-301 | 106 | Détermination d'une valeur approchée de $e$ à l'aide de la suite $\left(\left(1 + \tfrac{1}{n}\right)^n\right)$                                                               | algo. | Fonction exponentielle (notion)                  |
| 1SPE-302 | 107 | Unicité d'une fonction $f$ dérivable sur $\mathbb{R}$ vérifiant $f' = f$ et $f(0) = 1$                                                                                        | s-f ⁺ | Fonction exponentielle (notion)                  |
| 1SPE-303 | 108 | Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$                                                                                                                    | s-f ⁺ | Fonction exponentielle > propriétés algébriques  |
| 1SPE-304 | 109 | La fonction exponentielle est strictement positive et croissante                                                                                                              | s-f ⁺ | Fonction exponentielle > variations              |

### Analyse > Trigonométrie (branche `Fonctions`)

| Code     | ex- | Énoncé                                                                                                                                               | kind  | nœud                                                    |
| -------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| 1SPE-305 | 110 | Cercle trigonométrique ; longueur d'arc ; radian                                                                                                     | conn. | Fonctions trigonométriques > cercle et radians          |
| 1SPE-306 | 111 | Enroulement de la droite sur le cercle trigonométrique ; image d'un nombre réel                                                                      | conn. | Fonctions trigonométriques > cercle et radians          |
| 1SPE-307 | 112 | Cosinus et sinus d'un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle ; valeurs remarquables                               | conn. | Fonctions trigonométriques > cosinus et sinus d'un réel |
| 1SPE-308 | 113 | Placer un point sur le cercle trigonométrique                                                                                                        | s-f   | Fonctions trigonométriques > cercle et radians          |
| 1SPE-309 | 114 | Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de $x$, les cosinus et sinus d'angles associés à $x$                | s-f   | Fonctions trigonométriques > angles associés            |
| 1SPE-310 | 115 | Calcul de $\cos\left(\tfrac{\pi}{4}\right)$, $\sin\left(\tfrac{\pi}{4}\right)$, $\cos\left(\tfrac{\pi}{3}\right)$, $\sin\left(\tfrac{\pi}{3}\right)$ | dém.  | Fonctions trigonométriques > cosinus et sinus d'un réel |
| 1SPE-311 | 116 | Approximation de $\pi$ par la méthode d'Archimède                                                                                                    | algo. | Fonctions trigonométriques > cercle et radians          |

### Géométrie > Calcul vectoriel et produit scalaire (branche `Géométrie`)

| Code     | ex- | Énoncé                                                                                                                                                                                 | kind  | nœud                                                  |
| -------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| 1SPE-312 | 117 | Produit scalaire à partir de la projection orthogonale et de la formule avec le cosinus                                                                                                | conn. | Produit scalaire > calculer un produit scalaire       |
| 1SPE-313 | 118 | Caractérisation de l'orthogonalité                                                                                                                                                     | conn. | Produit scalaire > propriétés                         |
| 1SPE-314 | 119 | Bilinéarité, symétrie                                                                                                                                                                  | conn. | Produit scalaire > propriétés                         |
| 1SPE-315 | 120 | En base orthonormée, expression du produit scalaire et de la norme, critère d'orthogonalité                                                                                            | conn. | Produit scalaire > calculer un produit scalaire       |
| 1SPE-316 | 121 | Expression des coordonnées dans une base orthonormée en termes de produits scalaires avec les vecteurs de la base                                                                      | conn. | Produit scalaire > calculer un produit scalaire       |
| 1SPE-317 | 122 | Développement de $\lVert\vec{u} + \vec{v}\rVert^2$ et $\lVert\vec{u} - \vec{v}\rVert^2$                                                                                                | conn. | Produit scalaire > angles et longueurs                |
| 1SPE-318 | 123 | Formule d'Al-Kashi                                                                                                                                                                     | conn. | Produit scalaire > angles et longueurs                |
| 1SPE-319 | 124 | Transformation de l'expression $\vec{MA} \cdot \vec{MB}$                                                                                                                               | conn. | Produit scalaire > lieux de points                    |
| 1SPE-320 | 125 | Utiliser le produit scalaire pour démontrer une orthogonalité                                                                                                                          | s-f   | Produit scalaire > propriétés                         |
| 1SPE-321 | 126 | Utiliser le produit scalaire pour calculer un angle                                                                                                                                    | s-f   | Produit scalaire > angles et longueurs                |
| 1SPE-322 | 127 | Utiliser le produit scalaire pour calculer une longueur dans le plan                                                                                                                   | s-f   | Produit scalaire > angles et longueurs                |
| 1SPE-323 | 128 | En vue de la résolution d'un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (projection orthogonale, coordonnées, normes et angle, normes) | s-f   | Produit scalaire > calculer un produit scalaire       |
| 1SPE-324 | 130 | Formule d'Al-Kashi (démonstration avec le produit scalaire)                                                                                                                            | dém.  | Produit scalaire > angles et longueurs                |
| 1SPE-325 | 131 | Ensemble des points $M$ tels que $\vec{MA} \cdot \vec{MB} = 0$ (démonstration avec le produit scalaire)                                                                                | dém.  | Produit scalaire > lieux de points                    |
| 1SPE-326 | 132 | Loi des sinus                                                                                                                                                                          | s-f ⁺ | Produit scalaire > angles et longueurs                |
| 1SPE-327 | 133 | Concourance des hauteurs d'un triangle                                                                                                                                                 | s-f ⁺ | Produit scalaire (notion) _(discutable 4)_            |
| 1SPE-328 | 134 | Les médianes d'un triangle concourent au centre de gravité                                                                                                                             | s-f ⁺ | Vecteurs : sans coordonnées (notion) _(discutable 4)_ |

### Géométrie > Géométrie repérée (branche `Géométrie`)

| Code     | ex- | Énoncé                                                                                                                    | kind  | nœud                                                     |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------- |
| 1SPE-329 | 135 | Vecteur normal à une droite ; le vecteur de coordonnées $(a\,;\,b)$ est normal à la droite d'équation $ax + by + c = 0$   | conn. | Géométrie repérée > vecteur normal et équation de droite |
| 1SPE-330 | 136 | Projection orthogonale d'un point sur une droite                                                                          | conn. | Géométrie repérée > projeté orthogonal                   |
| 1SPE-331 | 137 | Équation de cercle                                                                                                        | conn. | Géométrie repérée > équation de cercle                   |
| 1SPE-332 | 138 | Déterminer une équation cartésienne d'une droite connaissant un point et un vecteur normal                                | s-f   | Géométrie repérée > vecteur normal et équation de droite |
| 1SPE-333 | 139 | Déterminer les coordonnées du projeté orthogonal d'un point sur une droite                                                | s-f   | Géométrie repérée > projeté orthogonal                   |
| 1SPE-334 | 140 | Déterminer et utiliser l'équation d'un cercle donné par son centre et son rayon                                           | s-f   | Géométrie repérée > équation de cercle                   |
| 1SPE-335 | 141 | Reconnaitre une équation de cercle, déterminer centre et rayon                                                            | s-f   | Géométrie repérée > équation de cercle                   |
| 1SPE-336 | 143 | Recherche de l'ensemble des points équidistants de l'axe des abscisses et d'un point donné                                | s-f ⁺ | Géométrie repérée (notion)                               |
| 1SPE-337 | 144 | Déterminer l'intersection d'un cercle ou d'une parabole d'équation $y = ax^2 + bx + c$ avec une droite parallèle à un axe | s-f ⁺ | Géométrie repérée (notion)                               |

### Probabilités et statistiques > Probabilités conditionnelles et indépendance (branches `Probabilités` / `Statistiques`)

| Code     | ex- | Énoncé                                                                                                                                                       | kind  | nœud                                                              |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------- |
| 1SPE-338 | 145 | Indépendance de deux évènements                                                                                                                              | conn. | Probabilités conditionnelles > indépendance                       |
| 1SPE-339 | 146 | Partition de l'univers (systèmes complets d'évènements) ; formule des probabilités totales                                                                   | conn. | Probabilités conditionnelles > probabilités totales               |
| 1SPE-340 | 147 | Succession de deux épreuves indépendantes ; représentation par un arbre ou un tableau                                                                        | conn. | Probabilités conditionnelles > épreuves indépendantes successives |
| 1SPE-341 | 148 | Pour $n \leqslant 4$, répétition de $n$ épreuves de Bernoulli indépendantes et identiques                                                                    | conn. | Probabilités conditionnelles > épreuves indépendantes successives |
| 1SPE-342 | 149 | Dans des cas simples, calculer une probabilité à l'aide de la formule des probabilités totales                                                               | s-f   | Probabilités conditionnelles > probabilités totales               |
| 1SPE-343 | 150 | Savoir utiliser ou justifier l'indépendance de deux évènements                                                                                               | s-f   | Probabilités conditionnelles > indépendance                       |
| 1SPE-344 | 151 | Représenter la succession de deux épreuves indépendantes par un arbre ou un tableau                                                                          | s-f   | Probabilités conditionnelles > épreuves indépendantes successives |
| 1SPE-345 | 152 | Pour $n \leqslant 4$, représenter l'arbre associé à la répétition de $n$ épreuves de Bernoulli indépendantes et identiques afin de calculer des probabilités | s-f   | Probabilités conditionnelles > épreuves indépendantes successives |
| 1SPE-346 | 153 | Méthode de Monte-Carlo : estimation de l'aire sous la parabole, estimation du nombre $\pi$                                                                   | algo. | `Statistiques` Échantillonnage > simulation                       |
| 1SPE-347 | 154 | Exemples de succession de plusieurs épreuves indépendantes                                                                                                   | s-f ⁺ | Probabilités conditionnelles > épreuves indépendantes successives |
| 1SPE-348 | 155 | Exemples de marches aléatoires                                                                                                                               | s-f ⁺ | Probabilités conditionnelles > épreuves indépendantes successives |

### Probabilités et statistiques > Variables aléatoires réelles

| Code     | ex-    | Énoncé                                                                                                                                                              | kind  | nœud                                                                              |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| 1SPE-349 | 156    | Variable aléatoire réelle : modélisation du résultat numérique d'une expérience aléatoire ; formalisation comme fonction définie sur l'univers et à valeurs réelles | conn. | Variables aléatoires (notion)                                                     |
| 1SPE-350 | 157    | Loi d'une variable aléatoire                                                                                                                                        | conn. | Variables aléatoires > loi d'une variable aléatoire                               |
| 1SPE-351 | ✂158a | Espérance d'une variable aléatoire                                                                                                                                  | conn. | Variables aléatoires > espérance                                                  |
| 1SPE-352 | ✂158b | Variance, écart type d'une variable aléatoire                                                                                                                       | conn. | Variables aléatoires > variance et écart-type                                     |
| 1SPE-353 | 159    | Linéarité de l'espérance                                                                                                                                            | conn. | Variables aléatoires > espérance                                                  |
| 1SPE-354 | 160    | Formule de König-Huygens                                                                                                                                            | conn. | Variables aléatoires > variance et écart-type                                     |
| 1SPE-355 | 161    | Interpréter en situation et utiliser les notations $\{X = a\}$, $\{X \leqslant a\}$, $P(X = a)$, $P(X \leqslant a)$                                                 | s-f   | Variables aléatoires > loi d'une variable aléatoire                               |
| 1SPE-356 | 162    | Passer du registre de la langue naturelle au registre symbolique et inversement                                                                                     | s-f   | Variables aléatoires (notion)                                                     |
| 1SPE-357 | 163    | Modéliser une situation à l'aide d'une variable aléatoire                                                                                                           | s-f   | Variables aléatoires (notion)                                                     |
| 1SPE-358 | 164    | Déterminer la loi de probabilité d'une variable aléatoire                                                                                                           | s-f   | Variables aléatoires > loi d'une variable aléatoire                               |
| 1SPE-359 | ✂165a | Calculer une espérance                                                                                                                                              | s-f   | Variables aléatoires > espérance                                                  |
| 1SPE-360 | ✂165b | Calculer une variance, un écart type                                                                                                                                | s-f   | Variables aléatoires > variance et écart-type                                     |
| 1SPE-361 | 166    | Utiliser la notion d'espérance dans une résolution de problème (mise pour un jeu équitable, etc.)                                                                   | s-f   | Variables aléatoires > jeux et gains                                              |
| 1SPE-362 | 167    | Algorithme renvoyant l'espérance, la variance ou l'écart type d'une variable aléatoire                                                                              | algo. | Variables aléatoires (notion)                                                     |
| 1SPE-363 | 168    | Fréquence d'apparition des lettres d'un texte donné, en français, en anglais                                                                                        | algo. | `Statistiques` Représenter des données > effectifs et fréquences _(discutable 5)_ |
| 1SPE-364 | 169    | Pour $X$ variable aléatoire, étude de la fonction du second degré $x \mapsto E\big((X - x)^2\big)$                                                                  | s-f ⁺ | Variables aléatoires > variance et écart-type                                     |

### Probabilités et statistiques > Expérimentations

| Code     | ex- | Énoncé                                                                                                                                                                                                                                                                                                | kind | nœud                                         |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------- |
| 1SPE-365 | 170 | Simuler une variable aléatoire avec Python ou un tableur                                                                                                                                                                                                                                              | s-f  | `Statistiques` Échantillonnage > simulation  |
| 1SPE-366 | 171 | Lire, comprendre et écrire une fonction Python renvoyant la moyenne d'un échantillon de taille $n$ d'une variable aléatoire                                                                                                                                                                           | s-f  | `Statistiques` Échantillonnage > simulation  |
| 1SPE-367 | 172 | Étudier sur des exemples la distance entre la moyenne d'un échantillon simulé de taille $n$ d'une variable aléatoire et l'espérance de cette variable aléatoire                                                                                                                                       | s-f  | `Statistiques` Échantillonnage > fluctuation |
| 1SPE-368 | 173 | Simuler, avec Python ou un tableur, $N$ échantillons de taille $n$ d'une variable aléatoire d'espérance $\mu$ et d'écart type $\sigma$ ; si $m$ désigne la moyenne d'un échantillon, calculer la proportion des cas où l'écart entre $m$ et $\mu$ est inférieur ou égal à $\tfrac{2\sigma}{\sqrt{n}}$ | s-f  | `Statistiques` Échantillonnage > fluctuation |

---

## Les références d'automatismes (`curriculum_point_automatismes`, grade `1_SPE`)

### A. Lignes propres de la 1re (partie « Automatismes » du BO)

| Ligne d'Automatismes de la 1re (résumé fidèle)                                       | Cible(s)                              |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| Appliquer un taux d'évolution pour calculer une valeur finale ou initiale            | 2-377                                 |
| Calculer un taux d'évolution, l'exprimer en pourcentage                              | 2-367 · 2-377                         |
| Calculer le taux d'évolution équivalent à plusieurs évolutions successives           | 2-378                                 |
| Calculer un taux d'évolution réciproque                                              | 2-379                                 |
| Déterminer les solutions d'une équation produit nul                                  | 2-267                                 |
| Signe d'une expression du premier degré, d'une expression factorisée du second degré | 2-328 · 2-330 · 1SPE-253 (auto-réf)   |
| Développer, factoriser, réduire une expression algébrique simple                     | 3-016 · 4-022 · 5-039                 |
| Résoudre graphiquement $f(x) = k$, $f(x) < k$                                        | 2-336                                 |
| Déterminer graphiquement le signe d'une fonction ou son tableau de variations        | 2-329 · 2-349                         |
| Tracer une droite (équation réduite, ou point et coefficient directeur)              | 2-316                                 |
| Lire graphiquement l'équation réduite d'une droite                                   | 2-315                                 |
| Coefficient directeur d'une droite à partir de deux de ses points                    | 2-314                                 |
| Lire un graphique, un histogramme, un diagramme en barres ou circulaire, en boite…   | 5-077 · 2-372 · 3-030                 |
| Passer du graphique aux données et vice-versa                                        | 5-077 · 5-096                         |
| Calculer et interpréter des indicateurs statistiques                                 | 2-382 · 2-370 · 3-029 · 4-039 · 4-040 |
| Probabilités conditionnelles sur tableau croisé d'effectifs ou arbre pondéré         | 2-396 · 2-397                         |
| Distinguer $P(A \cap B)$, $P_A(B)$, $P_B(A)$                                         | 2-399 · 2-400                         |

### B. Reprise de la liste de 2de (C16 : « s'ajoute la liste des automatismes de seconde »)

Les **58 cibles** de la liste de 2de (`seed-2de.md`), reprises **telles quelles** avec le
grade `1_SPE` (dédoublonnées avec A).

### C. Entretien du vocabulaire ensembliste et logique — question V1

Si V1 = oui : 13 références vers les points de 2de que la 1re reprend mot pour mot —
2-201, 2-202, 2-203, 2-204, 2-205, 2-206, 2-207, 2-210, 2-212, 2-213, 2-214, 2-216, 2-217.

---

## Rattachements discutables — TRANCHÉS (David, 2026-10-08 : « ok pour les discutables », recos retenues)

1. **« Calcul de factorielle »** (1SPE-240) → `Dénombrement > Arrangements et permutations >
factorielle`. Le doc d'écarts l'avait classé « [T] simple exemple » ; mais la règle
   2de garde les exemples d'algorithme comme points, et le nœud existe (l'arbre est sans
   niveaux, ADR 0020). Alternative : `Suites et modélisation > algorithmes`.
2. **« Exploiter les variations pour établir une inégalité »** (1SPE-287) → `Dérivation >
variations` (c'est l'usage des variations qui est visé). Alternative : `Algèbre >
Inégalités > comparer et encadrer`.
3. **Méthode de Newton** (1SPE-290) → `Dérivation > tangente` (elle itère des tangentes) ;
   **méthode d'Euler** (1SPE-300) → `Fonction exponentielle` (notion) (elle construit
   exp). Alternative pour Euler : `Dérivation > approximation affine` (son mécanisme).
4. **Concourance des hauteurs** (1SPE-327) → `Produit scalaire` (notion, l'outil de la
   section) ; **médianes et centre de gravité** (1SPE-328) → `Vecteurs : sans coordonnées`
   (notion), comme l'isobarycentre de 2de (2-309). En 2de, « hauteurs concourantes »
   (2-307) est sous `Géométrie repérée` — chaque programme la démontre avec son outil.
5. **Fréquence d'apparition des lettres d'un texte** (1SPE-363) → `Statistiques >
Représenter des données > effectifs et fréquences` (c'est une distribution de
   fréquences). Alternative : `Variables aléatoires` (notion), sa section dans le BO.

## Questions

- **E1 — ⚠️ l'exigence des Exemples d'algorithme (et correction de la 2de).** Le
  **2026-08-29**, tu avais acté (ancien doc 1re spé) : « les Exemples d'algorithmes du BO
  sont des illustrations proposées à l'enseignant, pas des attendus » → conservés comme
  points, en `approfondissement`. En 2de (L2, 2026-10-08), je t'ai présenté ce choix
  comme un simple effet du tag `[SF+]` de l'ancien référentiel — **c'était faux**, c'était
  ta décision ; tu as validé `attendu` sur cette base. Il faut trancher en connaissance de
  cause :
  - **(a) `approfondissement`** (ta décision d'août) — pour les 12 exemples de 1re, ET
    correction des 10 de 2de déjà en prod (simple `UPDATE` de l'exigence, aucune perte) ;
  - (b) `attendu` partout (L2), 1re comprise.
    **Reco : (a)** — le BO dit « exemples », ton raisonnement d'août tient, et le kind
    `algorithme` permet déjà de les filtrer.
- **V1 — l'entretien du vocabulaire de 2de** (13 lignes reprises mot pour mot) : en
  **références** de la liste de 1re (reco : c'est exactement le rôle de la table — un
  contenu d'une année antérieure que ce programme demande d'entretenir ; sans elles, la
  page Programme de 1re ne montre pas ce vocabulaire) ou rien.
- **S1 — TRANCHÉE** : ex-050, ex-054, ex-056 gardés comme points (1SPE-245, 249, 252) ; 062 et 017 non repris.
- **V2 — les points trop vagues** (section dédiée) : 1 retrait (compétence), 5 capacités, 8 approfondissements et 11 exemples d'algorithme reformulés pour être questionnables (reco : oui).
- **Validation d'ensemble** : les 12 scissions (26 points), les non-scissions, les 2 puces
  larges non retenues, les 5 discutables, les références (A + B).

## Après validation (plan de livraison)

1. (si E1 = a) correction des 10 exemples d'algorithme de 2de dans la même migration.
2. Migration additive générée depuis ce document : 168 points (`1SPE-201`…`1SPE-368`),
   références A + B (+ C si V1), auto-référence 1SPE-253 ; bloc DO auto-vérifiant (comptes,
   kinds, 0 sans nœud, anciens `1SPE-001`…`173` INTACTS) ; rollback scopé, mises en
   garde RGPD.
3. Test d'intégration intégral (lecture anonyme), preuve rouge, audit, PR, CI, merge,
   `db:migrate`, vérification prod.

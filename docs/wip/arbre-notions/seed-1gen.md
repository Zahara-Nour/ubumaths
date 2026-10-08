# Seed 1re enseignement scientifique — points du programme ET références (architecture points → nœuds)

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (« je valide tout » : titres non
> retenus, scissions, entretien, références, 4 discutables). EN PROD (PR #971, `db:migrate` le 2026-10-08, vérifié).** ⚠️ Soin maximal (lycée).
> Source : « Annexe — Programme de mathématiques intégré à l'enseignement scientifique en
> classe de première générale » (7 p., `progs-lycee/premiere-ens-sci.pdf`, fourni par David
> le 2026-10-07), relu **puce par puce** — le « module spécifique » des élèves de 1re
> générale sans spécialité mathématiques ; grade **`1_GEN`**. **Pas d'ancien seed** :
> construit directement depuis le BO (ni liens à préserver, ni colonne « ex- »). Mapping :
> [programmes-ecarts-1re-ens-sci.md](programmes-ecarts-1re-ens-sci.md) (W1-W4 tranchées le
> 2026-10-07 : sous-notions « taux d'évolution moyen » et « fonctions x ↦ aˣ », exposant
> 1/n sous aˣ). Arbre `2026-10-07.15`, **aucun changement d'arbre** (les 44 nœuds visés
> existent, vérifié par script). Parcours : `1_GEN` → `2` → … — **jamais de référence vers
> `1_SPE` ni `1_TECHNO`**, programmes parallèles (C14, précision de David du 2026-10-07).
> Règles déjà tranchées, appliquées sans être redemandées : une puce = un point, scission
> si notions différentes ; entretien des contenus repris de la 2de (U5/V1) ; automatismes =
> références, dont reprise de la liste de 2de (C16) ; auto-référence permise (C13) ; un
> contenu laconique reçoit le nom de son objet (titre de sa section) ; « modéliser » avec
> un objet précis = point.

## Attributs communs

| Attribut               | Valeur                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `grade`                | `1_GEN`                                                                                                                                                                                          |
| `code`                 | **`1GEN-001` à `1GEN-044`** (préfixe fabriqué par la base : `1_GEN` → `1GEN` ; aucun ancien seed)                                                                                                |
| `objective_id`, `rang` | `NULL`                                                                                                                                                                                           |
| `rubrique`             | « partie > section » du BO                                                                                                                                                                       |
| `kind`                 | conn. (colonne « Contenus mathématiques ») / s-f (Capacités attendues) — **aucun algorithme** : le BO n'a ni bloc Algorithmique ni Situations algorithmiques (l'outil numérique est transversal) |
| `exigence`             | `attendu` partout (« seuls sont exigibles les contenus de la colonne de droite, mobilisés dans les capacités attendues »)                                                                        |
| `regime_acquisition`   | `diversite` partout                                                                                                                                                                              |

**44 points**, **84 références**. La colonne **« Situations et problèmes »** (mouvement
parabolique, Monty Hall, Malthus, carbone 14, impôt par morceaux…) n'est pas exigible : ni
point, ni nœud. Le préambule et les textes d'introduction des parties sont du cadrage (la
racine $n$-ième, citée comme démarche possible, n'est pas un contenu).

---

## Structure du BO : intitulés traités comme titres

Les lignes « **Analyse statistique de deux caractères qualitatifs.** » et « **… quantitatifs.** »
annoncent les contenus qui les suivent : elles servent de **préfixe** à ces contenus
(« Deux caractères quantitatifs : représentation par un nuage de points ») et ne sont pas des
points — seules, elles ne seraient pas questionnables. De même pour « Suites arithmétiques »,
« Suites géométriques à termes strictement positifs », « Fonctions exponentielles ».

## ⚠️ Puces multi-parties : scindées (4 puces → +4 points)

| Puce du BO                                                                                                                   | Décision                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| « **Ajustement affine, point moyen** »                                                                                       | **×2** (deux sous-notions), comme en 1re techno.                                                               |
| « Réaliser et exploiter la représentation graphique des termes d'une **suite arithmétique ou d'une fonction affine** »       | **×2** : `Généralités sur les suites > représentation graphique` / `Fonctions affines > expression et droite`. |
| « Utiliser la forme factorisée … pour trouver ses **racines et étudier son signe** »                                         | **×2** : `racines` / `signe`, comme en 1re techno ; le second porte l'auto-référence des Automatismes.         |
| « Réaliser et exploiter la représentation graphique des termes d'une **suite géométrique ou d'une fonction exponentielle** » | **×2** : `Généralités sur les suites > représentation graphique` / `fonctions x ↦ aˣ`.                         |

**Gardées en un point** : « Interpolation, extrapolation » (une sous-notion, un geste :
lire un ajustement hors des données ou entre elles) ; « Déterminer et utiliser un ajustement
affine pour interpoler ou extrapoler » (une capacité, une sous-notion) ; « Éléments
caractéristiques de la courbe : allure, axe de symétrie, sommet, tableau de variation » et
« Racines et signe … sous forme factorisée » — **mot pour mot les contenus 1TECHNO-057 et
058**, gardés en un point en 1re techno (validé) : même traitement ici ; « Reconnaitre un
phénomène discret ou continu de croissance linéaire (resp. exponentielle) et savoir le
modéliser » (le geste est le choix du modèle, objet précis → point, comme 1TECHNO-042).

## Entretien : contenus repris mot pour mot de la 2de (U5/V1) — 7 références, aucun point

| Puce du BO du module                                                                                                                                                                              | Entretien → référence |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| « Tableau croisé d'effectifs »                                                                                                                                                                    | 2-383                 |
| « Probabilité conditionnelle »                                                                                                                                                                    | 2-390                 |
| « Calculer des probabilités conditionnelles à l'aide d'un tableau croisé d'effectifs ou d'un arbre pondéré »                                                                                      | 2-396 · 2-397         |
| Fonctions affines : « remobiliser les connaissances abordées en classe de seconde : représentation graphique, sens de variation, lien entre le taux d'accroissement et le coefficient directeur » | 2-352 · 2-348 · 2-347 |

(2-396 et 2-397 sont déjà visées par la ligne d'Automatismes « probabilités conditionnelles » :
84 références distinctes, pas 86.)

## Les références (`curriculum_point_automatismes`, grade `1_GEN`) — 84

### A. Lignes de la partie « Automatismes » du BO

**Mot pour mot les lignes de la 1re spé et de la 1re techno** (cinq rubriques, 17 puces) →
**mêmes cibles**, toutes de 2de ou du cycle 4 — sauf « signe d'une expression factorisée du
second degré », qui vise le point du module (**auto-référence** : 1GEN-027), chacun chez soi.

| Ligne d'Automatismes (résumé fidèle)                                                 | Cible(s)                              |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| Appliquer un taux d'évolution pour calculer une valeur finale ou initiale            | 2-377                                 |
| Calculer un taux d'évolution, l'exprimer en pourcentage                              | 2-367 · 2-377                         |
| Calculer le taux d'évolution équivalent à plusieurs évolutions successives           | 2-378                                 |
| Calculer un taux d'évolution réciproque                                              | 2-379                                 |
| Déterminer les solutions d'une équation produit nul                                  | 2-267                                 |
| Signe d'une expression du premier degré, d'une expression factorisée du second degré | 2-328 · 2-330 · 1GEN-027 (auto-réf)   |
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

### B. Reprise de la liste de 2de (C16 : « À la liste ci-dessous s'ajoute la liste des automatismes travaillés en classe de seconde »)

Les **58 cibles** (60 depuis la passe du cycle 3 : + 6-199, 6-201) de la liste de 2de, reprises telles quelles avec le grade `1_GEN` (comme en
1re spé et en 1re techno).

### E. Entretien (U5/V1) — 7 références (tableau plus haut)

---

## Rattachements discutables

1. **« Exemples d'analyse du croisement de deux caractères par représentation graphique
   (diagrammes en barres, diagrammes circulaires) »** (1GEN-001) → `Tableaux croisés`
   (notion) : l'objet est le **croisement** de deux caractères. Alternative : scinder en
   `Représenter des données > diagrammes en barres` / `diagrammes circulaires` (le support).
2. **« Utiliser un tableur pour représenter des données sous forme de tableau ou de
   diagramme »** (1GEN-006) → `Représenter des données` (notion). Une capacité d'outil, mais
   d'objet précis (pas une compétence) : gardée. Alternative : la retirer comme
   non questionnable dans l'application — reco : la garder, une feuille de tableur peut
   être demandée et vérifiée.
3. **« Reconnaitre un phénomène … de croissance linéaire »** (1GEN-017) → `Suites et
modélisation` (notion, comme 1TECHNO-042) ; **« … exponentielle »** (1GEN-038) →
   `Fonction exponentielle > suites et modélisation` (doc d'écarts validé : « discret ou
   continu » y inclut la fonction $x \mapsto a^x$). Alternative : les deux sous `Suites et
modélisation`, par symétrie.
4. **« Estimer les ordres de grandeur d'une quantité en croissance ou décroissance
   exponentielle »** (1GEN-043) → `Fonction exponentielle > suites et modélisation`.
   Alternative : `fonctions x ↦ aˣ`.

## Questions — TRANCHÉES (David, 2026-10-08 : « je valide tout »)

- **Validation d'ensemble** : les titres non retenus comme points, les 4 scissions,
  l'entretien (7 références), les références A + B (mêmes cibles qu'en 1re techno,
  auto-référence 1GEN-027), les 4 discutables. Aucune question de principe nouvelle : tout
  le reste applique des règles déjà tranchées.

---

## Les 44 points

### Analyse de l'information chiffrée (branche `Statistiques`)

| Code     | Énoncé                                                                                                                                                        | kind  | nœud                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| 1GEN-001 | Deux caractères qualitatifs : exemples d'analyse du croisement de deux caractères par représentation graphique (diagrammes en barres, diagrammes circulaires) | conn. | Tableaux croisés (notion) _(discutable 1)_        |
| 1GEN-002 | Deux caractères quantitatifs : représentation par un nuage de points                                                                                          | conn. | Statistique à deux variables > nuage de points    |
| 1GEN-003 | ✂ Ajustement affine                                                                                                                                          | conn. | Statistique à deux variables > ajustement affine  |
| 1GEN-004 | ✂ Point moyen                                                                                                                                                | conn. | Statistique à deux variables > point moyen        |
| 1GEN-005 | Interpolation, extrapolation                                                                                                                                  | conn. | Statistique à deux variables > ajustement affine  |
| 1GEN-006 | Utiliser un tableur pour représenter des données sous forme de tableau ou de diagramme                                                                        | s-f   | Représenter des données (notion) _(discutable 2)_ |
| 1GEN-007 | Déterminer et utiliser un ajustement affine pour interpoler ou extrapoler des valeurs inconnues                                                               | s-f   | Statistique à deux variables > ajustement affine  |
| 1GEN-008 | Savoir calculer les coordonnées d'un point moyen                                                                                                              | s-f   | Statistique à deux variables > point moyen        |

### Phénomènes aléatoires (branche `Probabilités`)

| Code     | Énoncé                                                                                                                                                                            | kind  | nœud                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 1GEN-009 | Indépendance de deux évènements                                                                                                                                                   | conn. | Probabilités conditionnelles > indépendance                       |
| 1GEN-010 | Probabilité associée à la répétition d'épreuves aléatoires identiques et indépendantes de Bernoulli                                                                               | conn. | Probabilités conditionnelles > épreuves indépendantes successives |
| 1GEN-011 | Représenter par un arbre de probabilités la répétition de $n$ épreuves aléatoires identiques et indépendantes de Bernoulli avec $n \leqslant 4$ afin de calculer des probabilités | s-f   | Probabilités conditionnelles > épreuves indépendantes successives |
| 1GEN-012 | Savoir utiliser ou justifier l'indépendance de deux évènements                                                                                                                    | s-f   | Probabilités conditionnelles > indépendance                       |

### Phénomènes d'évolution, modélisation par des fonctions > Variation linéaire (branches `Suites` / `Fonctions`)

| Code     | Énoncé                                                                                                                        | kind  | nœud                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| 1GEN-013 | Suites arithmétiques : définition par la relation de récurrence                                                               | conn. | Suites arithmétiques > reconnaître                    |
| 1GEN-014 | Suites arithmétiques : explicitation du terme de rang $n$                                                                     | conn. | Suites arithmétiques > terme général                  |
| 1GEN-015 | Suites arithmétiques : sens de variation                                                                                      | conn. | Suites arithmétiques (notion)                         |
| 1GEN-016 | Suites arithmétiques : représentation graphique                                                                               | conn. | Généralités sur les suites > représentation graphique |
| 1GEN-017 | Reconnaitre un phénomène discret ou continu de croissance linéaire et savoir le modéliser                                     | s-f   | Suites et modélisation (notion) _(discutable 3)_      |
| 1GEN-018 | Calculer un terme de rang donné d'une suite arithmétique définie par une relation fonctionnelle ou une relation de récurrence | s-f   | Suites arithmétiques > calculer un terme              |
| 1GEN-019 | ✂ Réaliser et exploiter la représentation graphique des termes d'une suite arithmétique                                      | s-f   | Généralités sur les suites > représentation graphique |
| 1GEN-020 | ✂ Réaliser et exploiter la représentation graphique d'une fonction affine                                                    | s-f   | Fonctions affines > expression et droite              |
| 1GEN-021 | Résoudre un problème de seuil dans le cas d'une croissance linéaire                                                           | s-f   | Suites et modélisation > seuil                        |

### Phénomènes d'évolution, modélisation par des fonctions > Modélisation quadratique (branche `Fonctions`)

| Code     | Énoncé                                                                                                                                                                                              | kind  | nœud                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------- |
| 1GEN-022 | Fonctions polynômes de degré 2 : éléments caractéristiques de la courbe : allure de la courbe, axe de symétrie, coordonnées du sommet en lien avec la symétrie, tableau de variation de la fonction | conn. | Second degré > parabole |
| 1GEN-023 | Racines et signe d'un polynôme de degré 2 donné sous forme factorisée (le calcul des racines à l'aide du discriminant ne figure pas au programme)                                                   | conn. | Second degré (notion)   |
| 1GEN-024 | Associer une parabole à une expression algébrique de degré 2, pour les fonctions de la forme $x \mapsto ax^2$, $x \mapsto ax^2 + c$, $x \mapsto a(x - x_1)(x - x_2)$                                | s-f   | Second degré > parabole |
| 1GEN-025 | Déterminer des éléments caractéristiques de la fonction $x \mapsto ax^2 + bx + c$ (aucune formule n'est attendue ; l'axe de symétrie se détermine par exemple en résolvant $f(x) = c$)              | s-f   | Second degré > parabole |
| 1GEN-026 | ✂ Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour trouver ses racines                                                                         | s-f   | Second degré > racines  |
| 1GEN-027 | ✂ Utiliser la forme factorisée (en produit de facteurs du premier degré) d'un polynôme de degré 2 pour étudier son signe                                                                           | s-f   | Second degré > signe    |

### Phénomènes d'évolution, modélisation par des fonctions > Variation exponentielle (branches `Suites` / `Fonctions` / `Proportionnalité`)

| Code     | Énoncé                                                                                                                                                                             | kind  | nœud                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| 1GEN-028 | Suites géométriques à termes strictement positifs : définition par relation de récurrence                                                                                          | conn. | Suites géométriques > reconnaître                                |
| 1GEN-029 | Suites géométriques : explicitation du terme de rang $n$                                                                                                                           | conn. | Suites géométriques > terme général                              |
| 1GEN-030 | Suites géométriques : sens de variation                                                                                                                                            | conn. | Suites géométriques (notion)                                     |
| 1GEN-031 | Suites géométriques : représentation graphique                                                                                                                                     | conn. | Généralités sur les suites > représentation graphique            |
| 1GEN-032 | Fonction $x \mapsto a^x$ ($a > 0$, $x \geqslant 0$)                                                                                                                                | conn. | Fonction exponentielle > fonctions x ↦ aˣ                        |
| 1GEN-033 | Fonctions $x \mapsto a^x$ : propriétés algébriques (admises, par extension des propriétés des puissances entières)                                                                 | conn. | Fonction exponentielle > fonctions x ↦ aˣ                        |
| 1GEN-034 | Fonctions $x \mapsto a^x$ : variations                                                                                                                                             | conn. | Fonction exponentielle > fonctions x ↦ aˣ                        |
| 1GEN-035 | Fonctions $x \mapsto a^x$ : représentation graphique                                                                                                                               | conn. | Fonction exponentielle > fonctions x ↦ aˣ                        |
| 1GEN-036 | Fonctions $x \mapsto a^x$ : cas particulier de l'exposant $\frac{1}{n}$                                                                                                            | conn. | Fonction exponentielle > fonctions x ↦ aˣ                        |
| 1GEN-037 | Taux d'évolution moyen correspondant à $n$ évolutions successives                                                                                                                  | conn. | `Proportionnalité` Évolutions > taux d'évolution moyen           |
| 1GEN-038 | Reconnaitre un phénomène discret ou continu de croissance ou décroissance exponentielle et savoir le modéliser                                                                     | s-f   | Fonction exponentielle > suites et modélisation _(discutable 3)_ |
| 1GEN-039 | Calculer un terme de rang donné d'une suite géométrique définie par une relation fonctionnelle ou une relation de récurrence                                                       | s-f   | Suites géométriques > calculer un terme                          |
| 1GEN-040 | Calculer un taux d'évolution moyen                                                                                                                                                 | s-f   | `Proportionnalité` Évolutions > taux d'évolution moyen           |
| 1GEN-041 | ✂ Réaliser et exploiter la représentation graphique des termes d'une suite géométrique                                                                                            | s-f   | Généralités sur les suites > représentation graphique            |
| 1GEN-042 | ✂ Réaliser et exploiter la représentation graphique d'une fonction exponentielle                                                                                                  | s-f   | Fonction exponentielle > fonctions x ↦ aˣ                        |
| 1GEN-043 | Estimer les ordres de grandeur d'une quantité en croissance ou décroissance exponentielle                                                                                          | s-f   | Fonction exponentielle > suites et modélisation _(discutable 4)_ |
| 1GEN-044 | Résoudre un problème de seuil dans le cas d'une croissance ou décroissance exponentielle par le calcul, à l'aide d'une représentation graphique ou en utilisant un outil numérique | s-f   | Suites et modélisation > seuil                                   |

## Après validation (plan de livraison)

Migration additive générée depuis ce document : 44 points `1GEN-001`…`044`, 84 références
A + B + E (auto-référence comprise) ; bloc DO auto-vérifiant (comptes, kinds, 0 sans nœud,
références, aucune cible en `1_SPE` / `1_TECHNO`) ; test intégral, preuve rouge, audit, PR,
CI, merge, `db:migrate`, vérification prod.

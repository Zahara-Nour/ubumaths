# Correspondance Terminale maths complémentaires ↔ Terminale spécialité — cartes partageables

- **Date** : 2026-10-04
- **Source** : référentiels en production — `T_COMP` (139 points, `TCOMP-001` → `TCOMP-139`) et `T_SPE` (262 points, `TSPE-001` → `TSPE-262`) ; référentiel de 1re spé (`docs/wip/referentiel/1re-spe-programme.md`) pour les acquis antérieurs.
- **Statut** : **relu par David le 2026-10-04** — les 8 recommandations sont retenues (voir la fin du document).
- **But** : décider quelles cartes de révision espacée porteront `grades: ["T_SPE","T_COMP"]`, rattachées au point TCOMP et au(x) point(s) TSPE de la colonne « TSPE ».

## Légende des catégories

| Catégorie             | Sens                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **identique**         | Même attendu : une carte sert telle quelle aux deux programmes.                                                                                  |
| **socle commun**      | Une carte partagée pour la partie commune ; les variantes plus difficiles sont réservées à un programme (précisé dans la note).                  |
| **proche, à adapter** | Même notion, mais formulation ou outillage différents empêchent une carte commune.                                                               |
| **propre à TCOMP**    | Rien en TSPE (la note dit si la notion est en 1re spé).                                                                                          |
| **non cartable**      | Démonstration, algorithme ou point de méthode qui ne se prête pas à une carte flash. Les codes TSPE indiqués sont les équivalents, pour mémoire. |

Tous les codes TSPE cités ont été vérifiés dans `ref-T_SPE.md`. Les codes `1SPE-xxx` renvoient à la 1re spé.

---

## 1. Analyse

### 1.1 Suites numériques, modèles discrets

| TCOMP     | Point (abrégé)                                          | Correspondance | TSPE                         | Note                                                                                                  |
| --------- | ------------------------------------------------------- | -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| TCOMP-001 | Approche intuitive de la limite d'une suite             | socle commun   | TSPE-106, TSPE-107, TSPE-108 | Lecture de limite partagée ; définition par intervalles « à partir d'un certain rang » réservée TSPE. |
| TCOMP-002 | Approche intuitive des opérations sur les limites       | socle commun   | TSPE-110                     | Tables d'opérations partagées ; levée de formes indéterminées (TSPE-131) réservée TSPE.               |
| TCOMP-003 | Passage à la limite dans les inégalités, gendarmes      | socle commun   | TSPE-109                     | Application des gendarmes partagée ; divergence par minoration (TSPE-118) réservée TSPE.              |
| TCOMP-004 | Limite d'une suite géométrique de raison positive       | socle commun   | TSPE-111                     | TCOMP : $q > 0$ seulement ; TSPE ajoute $q \leqslant -1$ et $-1 < q < 0$.                             |
| TCOMP-005 | Limite de la somme géométrique, $0 < q < 1$             | propre à TCOMP | —                            | Pas de point TSPE ; en spé, déductible de 1SPE-029 + TSPE-111. Cf. question 1.                        |
| TCOMP-006 | Suites arithmético-géométriques                         | propre à TCOMP | —                            | Absent des deux BO de spé ; en spé, exemple-type de TSPE-115. Cf. question 1.                         |
| TCOMP-007 | Modéliser par une suite explicite ou récurrente         | identique      | TSPE-115                     | Traduire un énoncé en $u_{n+1} = au_n + b$ : même geste (déjà 1SPE-033, 1SPE-039).                    |
| TCOMP-008 | Calculer une limite de suite géométrique                | socle commun   | TSPE-111, TSPE-113           | Partagé pour $q > 0$ ; raisons négatives réservées TSPE.                                              |
| TCOMP-009 | Calculer la limite d'une somme géométrique, $0 < q < 1$ | propre à TCOMP | —                            | Même remarque que TCOMP-005 ; partage possible via TSPE-111. Cf. question 1.                          |
| TCOMP-010 | Représenter $u_{n+1} = f(u_n)$ graphiquement            | socle commun   | TSPE-160                     | Construction « en escalier » partagée ; étude de convergence (point fixe, continuité) réservée TSPE.  |
| TCOMP-011 | Conjecturer le comportement de $u_{n+1} = f(u_n)$       | socle commun   | TSPE-160                     | Conjecture partagée ; preuve (récurrence TSPE-114, TSPE-112) réservée TSPE.                           |
| TCOMP-012 | Arithmético-géométrique : solution constante            | propre à TCOMP | —                            | Résoudre $\ell = a\ell + b$ ; en spé, guidé par l'énoncé. Cf. question 1.                             |
| TCOMP-013 | Arithmético-géométrique : toutes les solutions          | propre à TCOMP | —                            | Suite auxiliaire $v_n = u_n - \ell$ géométrique ; absent du BO spé. Cf. question 1.                   |
| TCOMP-014 | Limite de la somme géométrique (démonstration)          | non cartable   | —                            | Démonstration possible, sans équivalent TSPE.                                                         |
| TCOMP-015 | Recherche de seuils (algorithme)                        | non cartable   | TSPE-120                     | Algorithme ; intitulé identique à TSPE-120 si des cartes de programme naissent. Cf. question 8.       |
| TCOMP-016 | Calcul des termes successifs (algorithme)               | non cartable   | —                            | Algorithme ; le calcul à la main relève de 1SPE-035.                                                  |
| TCOMP-017 | Valeurs approchées de $\pi$, $\ln 2$, $\sqrt{2}$        | non cartable   | TSPE-121                     | Algorithme.                                                                                           |

### 1.2 Fonctions : continuité, dérivabilité, limites, représentation graphique

| TCOMP     | Point (abrégé)                                                 | Correspondance | TSPE                         | Note                                                                                            |
| --------- | -------------------------------------------------------------- | -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| TCOMP-018 | Limite d'une fonction, continuité, asymptotes                  | socle commun   | TSPE-126, TSPE-127, TSPE-132 | Lien limite ↔ asymptote partagé ; continuité définie par les limites (TSPE-154) réservée TSPE. |
| TCOMP-019 | Limites des fonctions de référence                             | identique      | TSPE-128, TSPE-170           | Mêmes six fonctions ; croissances comparées hors TCOMP.                                         |
| TCOMP-020 | TVI admis, cas strictement monotone                            | identique      | TSPE-157, TSPE-158           | Énoncé et lecture identiques.                                                                   |
| TCOMP-021 | Réciproque d'une fonction strictement monotone, graphique      | socle commun   | TSPE-171                     | Symétrie par rapport à $y = x$ partagée pour $\ln$/$\exp$ ; cas carré/racine réservé TCOMP.     |
| TCOMP-022 | $\ln$, réciproque de $\exp$                                    | identique      | TSPE-167                     | $e^{\ln x} = x$, $\ln(e^x) = x$.                                                                |
| TCOMP-023 | Limites et courbe de $\ln$                                     | identique      | TSPE-170                     | Limites en $0$ et $+\infty$, allure.                                                            |
| TCOMP-024 | Équation fonctionnelle de $\ln$                                | identique      | TSPE-168                     | $\ln(ab)$, $\ln\frac{a}{b}$, $\ln a^n$ ; $\ln\sqrt{a}$ à vérifier côté TCOMP.                   |
| TCOMP-025 | Dérivée de $\ln$                                               | identique      | TSPE-169                     | $\ln' = \frac{1}{x}$.                                                                           |
| TCOMP-026 | Dérivées de $f(ax+b)$, $e^{u}$, $\ln u$, $u^2$                 | socle commun   | TSPE-137, TSPE-142           | Les quatre formes partagées ; $(v \circ u)'$ général, $\sqrt{u}$, $u^n$ réservés TSPE.          |
| TCOMP-027 | Calculer une fonction dérivée                                  | socle commun   | TSPE-142, TSPE-143           | Partagé hors composées générales et trigonométrie (TSPE seule).                                 |
| TCOMP-028 | Calculer des limites                                           | socle commun   | TSPE-130, TSPE-131, TSPE-144 | Partagé hors croissances comparées (TSPE-133, TSPE-172), réservées TSPE.                        |
| TCOMP-029 | Dresser un tableau de variation                                | socle commun   | TSPE-145                     | Partagé pour polynômes, $\exp$, $\ln$ ; fonctions trigonométriques réservées TSPE.              |
| TCOMP-030 | Utiliser le calcul des limites en problème                     | socle commun   | TSPE-131                     | Carte d'interprétation (« valeur à long terme ») partageable ; problème complet non cartable.   |
| TCOMP-031 | Allure des courbes de référence en problème                    | socle commun   | TSPE-170, TSPE-171           | Partie $\ln$ partagée ; autres courbes = acquis 2de / 1SPE-099.                                 |
| TCOMP-032 | Tableau de variation → nombre de solutions de $f(x) = k$       | identique      | TSPE-159                     | Même lecture ; rédaction TVI exigée identiquement.                                              |
| TCOMP-033 | Tableau de variation → inéquation $f(x) \leqslant k$           | propre à TCOMP | —                            | Aucun point TSPE ; geste de 2de mobilisé en spé. Cf. question 1.                                |
| TCOMP-034 | Valeurs approchées, encadrement d'une solution                 | identique      | TSPE-159                     | Encadrement à la calculatrice ou par tableau de valeurs.                                        |
| TCOMP-035 | Équation fonctionnelle $\exp$/$\ln$ : transformer une écriture | identique      | TSPE-173                     | Intitulé BO identique.                                                                          |
| TCOMP-036 | Équation fonctionnelle : résoudre équation, inéquation         | identique      | TSPE-174                     | Intitulé BO identique.                                                                          |
| TCOMP-037 | $\ln q^n = n\ln q$ pour un seuil                               | identique      | TSPE-174, TSPE-175           | Résoudre $0{,}8^n < 0{,}05$ : même carte ; attention au sens si $\ln q < 0$.                    |
| TCOMP-038 | $\ln(ab) = \ln a + \ln b$ (démonstration)                      | non cartable   | —                            | Démonstration possible ; propriété cartée via TCOMP-024.                                        |
| TCOMP-039 | $\ln\frac{1}{a} = -\ln a$ (démonstration)                      | non cartable   | —                            | Démonstration possible.                                                                         |
| TCOMP-040 | Dérivée de $\ln$ (démonstration)                               | non cartable   | TSPE-176                     | Démonstration ; exigée en TSPE, possible en TCOMP.                                              |
| TCOMP-041 | Dérivée de $\ln u$ (démonstration)                             | non cartable   | —                            | Démonstration possible.                                                                         |
| TCOMP-042 | Dérivée de $\exp u$ (démonstration)                            | non cartable   | —                            | Démonstration possible.                                                                         |
| TCOMP-043 | Balayage                                                       | non cartable   | —                            | Algorithme ; absent du BO TSPE (acquis 2de).                                                    |
| TCOMP-044 | Dichotomie                                                     | non cartable   | TSPE-161                     | Algorithme.                                                                                     |
| TCOMP-045 | Méthode de Newton                                              | non cartable   | TSPE-162, TSPE-124           | Algorithme.                                                                                     |
| TCOMP-046 | Algorithme de Briggs                                           | non cartable   | TSPE-178                     | Algorithme.                                                                                     |

### 1.3 Primitives et équations différentielles

| TCOMP     | Point (abrégé)                                            | Correspondance | TSPE                         | Note                                                                                          |
| --------- | --------------------------------------------------------- | -------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| TCOMP-047 | Notion de solution d'une équation différentielle          | socle commun   | TSPE-189, TSPE-192, TSPE-193 | Partagé ; $y' = ay + f$ (TSPE-196) réservé TSPE.                                              |
| TCOMP-048 | Primitive, lien avec $y' = f$                             | identique      | TSPE-189, TSPE-190           | Même définition.                                                                              |
| TCOMP-049 | Deux primitives diffèrent d'une constante                 | identique      | TSPE-190                     | Énoncé identique.                                                                             |
| TCOMP-050 | $y' = ay + b$, allure des courbes                         | identique      | TSPE-192, TSPE-193           | Allure selon le signe de $a$.                                                                 |
| TCOMP-051 | Vérifier qu'une fonction est solution                     | identique      | TSPE-193, TSPE-196           | Aucun savoir-faire TSPE littéral ; rattacher aux contenus. Cf. question 5.                    |
| TCOMP-052 | Primitives en reconnaissant une dérivée de référence      | socle commun   | TSPE-191                     | Partagé : $x^n$, $\frac{1}{x}$, $e^x$, $\frac{1}{\sqrt{x}}$ ; sinus, cosinus réservés TSPE.   |
| TCOMP-053 | Primitives de $2uu'$, $e^{u}u'$, $\frac{u'}{u}$           | socle commun   | TSPE-194                     | Trois formes partagées ; $(v' \circ u) \times u'$ général ($u'u^n$, $u'\cos u$) réservé TSPE. |
| TCOMP-054 | Résoudre $y' = ay$                                        | identique      | TSPE-192                     | Point TSPE de contenu seulement. Cf. question 5.                                              |
| TCOMP-055 | $y' = ay + b$ : solution particulière constante           | identique      | TSPE-195                     | TSPE-195 non coupé ; une carte vise les deux moitiés. Cf. question 7.                         |
| TCOMP-056 | $y' = ay + b$ : solution générale                         | identique      | TSPE-195                     | Idem ; condition initiale partagée.                                                           |
| TCOMP-057 | Deux primitives diffèrent d'une constante (démonstration) | non cartable   | TSPE-197                     | Démonstration.                                                                                |
| TCOMP-058 | Résolution de $y' = ay$ (démonstration)                   | non cartable   | TSPE-198                     | Démonstration.                                                                                |
| TCOMP-059 | Méthode d'Euler                                           | non cartable   | TSPE-200                     | Algorithme.                                                                                   |

### 1.4 Fonctions convexes

| TCOMP     | Point (abrégé)                                          | Correspondance | TSPE     | Note                                                                                       |
| --------- | ------------------------------------------------------- | -------------- | -------- | ------------------------------------------------------------------------------------------ |
| TCOMP-060 | Dérivée seconde                                         | identique      | TSPE-138 | Calcul de $f''$.                                                                           |
| TCOMP-061 | Convexité : position courbe / sécantes                  | identique      | TSPE-139 | Intitulé BO identique.                                                                     |
| TCOMP-062 | Équivalence avec la position par rapport aux tangentes  | identique      | TSPE-140 | Admise dans les deux.                                                                      |
| TCOMP-063 | Convexité ⟺ $f'$ croissante ⟺ $f'' \geqslant 0$         | identique      | TSPE-140 | Admise dans les deux.                                                                      |
| TCOMP-064 | Point d'inflexion                                       | identique      | TSPE-141 | Changement de signe de $f''$.                                                              |
| TCOMP-065 | Reconnaître graphiquement convexité, inflexion          | socle commun   | TSPE-148 | Lecture sur $f$, $f'$, $f''$ partagée ; esquisse depuis tableaux (TSPE-147) réservée TSPE. |
| TCOMP-066 | Étudier la convexité d'une fonction deux fois dérivable | identique      | TSPE-149 | Signe de $f''$ ; inégalités par convexité (TSPE-146) réservées TSPE.                       |

### 1.5 Intégration

| TCOMP     | Point (abrégé)                                                   | Correspondance | TSPE               | Note                                                                                                   |
| --------- | ---------------------------------------------------------------- | -------------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| TCOMP-067 | Intégrale = aire sous la courbe, notation                        | identique      | TSPE-201           | Même définition, unité d'aire.                                                                         |
| TCOMP-068 | Relation de Chasles                                              | identique      | TSPE-207           | —                                                                                                      |
| TCOMP-069 | Valeur moyenne, approche graphique et numérique                  | identique      | TSPE-208           | $\mu = \frac{1}{b-a}\int_a^b f(x)\,\mathrm{d}x$.                                                       |
| TCOMP-070 | Valeur moyenne entre les bornes de $f$                           | socle commun   | TSPE-206, TSPE-208 | Encadrement $m \leqslant \mu \leqslant M$ partagé ; intégration des inégalités générale réservée TSPE. |
| TCOMP-071 | Méthode des rectangles (contenu)                                 | socle commun   | TSPE-221           | Attendu en TCOMP, approfondissement en TSPE. Cf. question 2.                                           |
| TCOMP-072 | Intégrale de signe quelconque                                    | socle commun   | TSPE-205           | Aire algébrique partagée ; définition par primitives réservée TSPE.                                    |
| TCOMP-073 | $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ a pour dérivée $f$        | identique      | TSPE-202           | TSPE énonce pour $f$ positive puis généralise (TSPE-204).                                              |
| TCOMP-074 | $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$                       | identique      | TSPE-203           | Notation $\left[F(x)\right]_a^b$ explicite en TSPE seulement. Cf. question 6.                          |
| TCOMP-075 | Estimer graphiquement, encadrer intégrale ou moyenne             | identique      | TSPE-210           | Intitulé BO identique.                                                                                 |
| TCOMP-076 | Calculer une intégrale                                           | socle commun   | TSPE-211           | Primitives communes partagées ; intégration par parties (TSPE-212) réservée TSPE.                      |
| TCOMP-077 | Calculer une valeur moyenne                                      | identique      | TSPE-208           | Pas de savoir-faire TSPE littéral ; rattacher au contenu.                                              |
| TCOMP-078 | Calculer l'aire sous une courbe                                  | identique      | TSPE-201, TSPE-211 | Conversion en unités d'aire comprise.                                                                  |
| TCOMP-079 | Calculer l'aire entre deux courbes                               | identique      | TSPE-214           | Intitulé BO identique.                                                                                 |
| TCOMP-080 | Interpréter intégrale, valeur moyenne en contexte                | identique      | TSPE-216           | Ex. $\int v(t)\,\mathrm{d}t$ = distance parcourue.                                                     |
| TCOMP-081 | Dérivée de $\int_a^x f$, $f$ positive croissante (démonstration) | non cartable   | TSPE-217           | Démonstration.                                                                                         |
| TCOMP-082 | Rectangles, trapèzes (algorithme)                                | non cartable   | TSPE-221           | Algorithme.                                                                                            |
| TCOMP-083 | Monte-Carlo pour une aire                                        | non cartable   | TSPE-222           | Algorithme (déjà 1SPE-153).                                                                            |

---

## 2. Probabilités et statistique

### 2.1 Lois discrètes

| TCOMP     | Point (abrégé)                                                              | Correspondance | TSPE                         | Note                                                                                               |
| --------- | --------------------------------------------------------------------------- | -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| TCOMP-084 | Loi uniforme sur $\{1, \ldots, n\}$, espérance                              | propre à TCOMP | —                            | $E = \frac{n+1}{2}$ absent du BO TSPE ; espérance générale en 1SPE-158.                            |
| TCOMP-085 | Loi de Bernoulli : définition, espérance, écart type                        | identique      | TSPE-225                     | $E = p$, $\sigma = \sqrt{p(1-p)}$ ; en spé via 1SPE-165.                                           |
| TCOMP-086 | Schéma de Bernoulli, arbre                                                  | identique      | TSPE-226, TSPE-229           | Même représentation.                                                                               |
| TCOMP-087 | Coefficients binomiaux : chemins, Pascal, symétrie                          | socle commun   | TSPE-037, TSPE-040, TSPE-041 | Chemins, symétrie, Pascal partagés ; formule factorielle (TSPE-038) réservée TSPE. Cf. question 4. |
| TCOMP-088 | $X \sim \mathcal{B}(n, p)$, nombre de succès                                | identique      | TSPE-227, TSPE-231           | Identifier $n$ et $p$.                                                                             |
| TCOMP-089 | Loi binomiale : expression, espérance, écart type                           | identique      | TSPE-227, TSPE-245           | Admis en TCOMP, démontré en TSPE (TSPE-251) ; cartes identiques.                                   |
| TCOMP-090 | Loi binomiale : représentation graphique                                    | propre à TCOMP | —                            | Diagramme en bâtons absent du BO TSPE. Cf. question 1.                                             |
| TCOMP-091 | Loi géométrique : définition, expression, espérance, graphique              | socle commun   | TSPE-239                     | Attendu en TCOMP, approfondissement en TSPE. Cf. question 2.                                       |
| TCOMP-092 | Loi géométrique sans mémoire                                                | socle commun   | TSPE-239                     | Idem : exigence décalée.                                                                           |
| TCOMP-093 | Identifier Bernoulli, binomiale, géométrique                                | socle commun   | TSPE-231, TSPE-239           | Bernoulli/binomiale partagés ; reconnaissance de la géométrique en approfondissement côté TSPE.    |
| TCOMP-094 | Coefficients binomiaux par le triangle de Pascal                            | identique      | TSPE-041                     | Compléter une ligne du triangle.                                                                   |
| TCOMP-095 | $P(X = k)$, $P(X \leqslant k)$ binomiale, calculatrice                      | identique      | TSPE-233                     | Outil de calcul à fixer. Cf. question 3.                                                           |
| TCOMP-096 | Loi géométrique : $P(X = k)$, $P(X \leqslant k)$ explicites                 | socle commun   | TSPE-239                     | Exigence décalée. Cf. question 2.                                                                  |
| TCOMP-097 | Intervalle $I$ avec $P(X \in I) \leqslant \alpha$ ou $\geqslant 1 - \alpha$ | identique      | TSPE-234                     | Intitulé BO identique ; outil à fixer (question 3).                                                |
| TCOMP-098 | Utiliser l'espérance des lois usuelles                                      | socle commun   | TSPE-245, TSPE-249           | $E = np$ partagé ; uniforme et géométrique réservées TCOMP, linéarité générale TSPE.               |
| TCOMP-099 | Utiliser l'absence de mémoire en situation                                  | socle commun   | TSPE-239                     | Exigence décalée. Cf. question 2.                                                                  |
| TCOMP-100 | Probabilités conditionnelles                                                | identique      | TSPE-230                     | Arbre, probabilités totales (déjà 1SPE-149).                                                       |
| TCOMP-101 | Répétitions d'expériences aléatoires                                        | identique      | TSPE-224, TSPE-228           | Produit des probabilités sur un chemin.                                                            |
| TCOMP-102 | Espérance, écart type de Bernoulli (démonstration)                          | non cartable   | —                            | Démonstration possible.                                                                            |
| TCOMP-103 | Espérance de la loi uniforme (démonstration)                                | non cartable   | —                            | Démonstration possible.                                                                            |
| TCOMP-104 | Espérance binomiale, $n \leqslant 3$ (démonstration)                        | non cartable   | TSPE-251                     | Démonstration ; TSPE la fait en général.                                                           |
| TCOMP-105 | Absence de mémoire (démonstration)                                          | non cartable   | —                            | Démonstration possible.                                                                            |

### 2.2 Lois à densité

| TCOMP     | Point (abrégé)                                       | Correspondance | TSPE | Note                                              |
| --------- | ---------------------------------------------------- | -------------- | ---- | ------------------------------------------------- |
| TCOMP-106 | Loi à densité, probabilité = aire                    | propre à TCOMP | —    | Absent de la spé (ni 1re ni terminale).           |
| TCOMP-107 | Fonction de répartition                              | propre à TCOMP | —    | Absent de la spé.                                 |
| TCOMP-108 | Espérance, variance d'une loi à densité (intégrales) | propre à TCOMP | —    | Absent de la spé.                                 |
| TCOMP-109 | Loi uniforme sur $[a, b]$                            | propre à TCOMP | —    | Absent de la spé.                                 |
| TCOMP-110 | Loi exponentielle                                    | propre à TCOMP | —    | Absent de la spé.                                 |
| TCOMP-111 | Reconnaître une densité de probabilité               | propre à TCOMP | —    | Positivité et intégrale égale à $1$.              |
| TCOMP-112 | Probabilités pour une variable à densité             | propre à TCOMP | —    | Absent de la spé.                                 |
| TCOMP-113 | Espérance d'une variable à densité                   | propre à TCOMP | —    | Absent de la spé.                                 |
| TCOMP-114 | Simuler Bernoulli, dé à partir d'une uniforme        | non cartable   | —    | Algorithme ; voisin de TSPE-238, sans même objet. |
| TCOMP-115 | Simuler la somme de $n$ variables i.i.d.             | non cartable   | —    | Algorithme ; voisin de TSPE-259.                  |

### 2.3 Statistique à deux variables quantitatives

| TCOMP     | Point (abrégé)                                | Correspondance | TSPE | Note                                     |
| --------- | --------------------------------------------- | -------------- | ---- | ---------------------------------------- |
| TCOMP-116 | Nuage de points, point moyen                  | propre à TCOMP | —    | Absent de la spé (1re et terminale).     |
| TCOMP-117 | Ajustement affine, moindres carrés            | propre à TCOMP | —    | Absent de la spé.                        |
| TCOMP-118 | Coefficient de corrélation                    | propre à TCOMP | —    | Absent de la spé.                        |
| TCOMP-119 | Ajustement par changement de variable         | propre à TCOMP | —    | Ex. $z = \ln y$ ; absent de la spé.      |
| TCOMP-120 | Interpolation, extrapolation (contenu)        | propre à TCOMP | —    | Absent de la spé.                        |
| TCOMP-121 | Représenter un nuage de points                | propre à TCOMP | —    | Carte de lecture plutôt que de tracé.    |
| TCOMP-122 | Coordonnées du point moyen                    | propre à TCOMP | —    | $(\bar{x}, \bar{y})$.                    |
| TCOMP-123 | Droite de régression (calculatrice ou calcul) | propre à TCOMP | —    | Outil de calcul à fixer. Cf. question 3. |
| TCOMP-124 | Interpoler, extrapoler par un ajustement      | propre à TCOMP | —    | Absent de la spé.                        |
| TCOMP-125 | Droite des moindres carrés (démonstration)    | non cartable   | —    | Démonstration possible.                  |

---

## 3. Vocabulaire ensembliste et logique

### 3.1 Ensembles

| TCOMP     | Point (abrégé)                                                | Correspondance | TSPE     | Note                                                                        |
| --------- | ------------------------------------------------------------- | -------------- | -------- | --------------------------------------------------------------------------- |
| TCOMP-126 | Élément, sous-ensemble, réunion, intersection, complémentaire | identique      | TSPE-001 | TSPE ajoute l'ensemble vide (déjà 1SPE-001).                                |
| TCOMP-127 | Symboles $\in$, $\subset$, $\cap$, $\cup$                     | socle commun   | TSPE-002 | Quatre symboles partagés ; $\varnothing$ et $\{\,\ldots\,\}$ réservés TSPE. |
| TCOMP-128 | Ensembles de nombres, intervalles                             | identique      | TSPE-003 | —                                                                           |
| TCOMP-129 | Notion de couple                                              | socle commun   | TSPE-004 | Couple partagé ; $n$-uplets, produit cartésien réservés TSPE.               |
| TCOMP-130 | Complémentaire : $\bar{A}$ ou $E \setminus A$                 | identique      | TSPE-005 | —                                                                           |
| TCOMP-131 | Symbole $\sum$ pour écrire concisément                        | identique      | TSPE-009 | Lecture et écriture, pas de calcul, dans les deux.                          |

### 3.2 Logique et raisonnement

| TCOMP     | Point (abrégé)                                        | Correspondance | TSPE     | Note                                                             |
| --------- | ----------------------------------------------------- | -------------- | -------- | ---------------------------------------------------------------- |
| TCOMP-132 | Reconnaître une proposition mathématique              | identique      | TSPE-010 | —                                                                |
| TCOMP-133 | Variables dans des propositions                       | identique      | TSPE-011 | —                                                                |
| TCOMP-134 | Connecteurs « et », « ou »                            | identique      | TSPE-012 | —                                                                |
| TCOMP-135 | Négation de propositions simples, sans quantificateur | socle commun   | TSPE-013 | Négation simple partagée ; négations quantifiées réservées TSPE. |
| TCOMP-136 | Contre-exemple                                        | identique      | TSPE-014 | —                                                                |
| TCOMP-137 | Implication, équivalence                              | identique      | TSPE-015 | —                                                                |
| TCOMP-138 | Réciproque d'une implication                          | socle commun   | TSPE-016 | Réciproque partagée ; contraposée réservée TSPE.                 |
| TCOMP-139 | Quantification universelle, existentielle             | identique      | TSPE-017 | Symboles $\forall$, $\exists$ non exigibles dans les deux.       |

---

## Récapitulatif chiffré

Comptés dans les tableaux ci-dessus (139 lignes, une par point, ordre du référentiel vérifié par script).

### Par catégorie

| Catégorie         | Points  | Part |
| ----------------- | ------- | ---- |
| identique         | 54      | 39 % |
| socle commun      | 34      | 24 % |
| proche, à adapter | 0       | 0 %  |
| propre à TCOMP    | 25      | 18 % |
| non cartable      | 26      | 19 % |
| **Total**         | **139** |      |

**88 points sur 139** (identique + socle commun) peuvent recevoir une carte partagée `["T_SPE","T_COMP"]`. Aucun point n'est classé « proche, à adapter » : chaque fois que la notion existe des deux côtés, l'écart tient à une **extension** d'un programme (classée « socle commun »), jamais à une formulation incompatible. Les deux écarts d'outillage réels (calculatrice pour la binomiale, notation des coefficients binomiaux) se règlent par un choix de carte : questions 3 et 4.

### Par objectif TCOMP

| Objectif TCOMP                                    | identique | socle commun | proche | propre | non cartable | Total   |
| ------------------------------------------------- | --------- | ------------ | ------ | ------ | ------------ | ------- |
| 1.1 Suites numériques, modèles discrets           | 1         | 7            | 0      | 5      | 4            | 17      |
| 1.2 Fonctions : continuité, dérivabilité, limites | 11        | 8            | 0      | 1      | 9            | 29      |
| 1.3 Primitives et équations différentielles       | 7         | 3            | 0      | 0      | 3            | 13      |
| 1.4 Fonctions convexes                            | 6         | 1            | 0      | 0      | 0            | 7       |
| 1.5 Intégration                                   | 10        | 4            | 0      | 0      | 3            | 17      |
| **1. Analyse**                                    | **35**    | **23**       | **0**  | **6**  | **19**       | **83**  |
| 2.1 Lois discrètes                                | 9         | 7            | 0      | 2      | 4            | 22      |
| 2.2 Lois à densité                                | 0         | 0            | 0      | 8      | 2            | 10      |
| 2.3 Statistique à deux variables                  | 0         | 0            | 0      | 9      | 1            | 10      |
| **2. Probabilités et statistique**                | **9**     | **7**        | **0**  | **19** | **7**        | **42**  |
| 3.1 Ensembles                                     | 4         | 2            | 0      | 0      | 0            | 6       |
| 3.2 Logique et raisonnement                       | 6         | 2            | 0      | 0      | 0            | 8       |
| **3. Vocabulaire ensembliste et logique**         | **10**    | **4**        | **0**  | **0**  | **0**        | **14**  |
| **Total**                                         | **54**    | **34**       | **0**  | **25** | **26**       | **139** |

Lecture : les 26 « non cartables » sont 14 démonstrations `[D+]` et 12 algorithmes `[SF+]` — toute la partie approfondissement de TCOMP, et rien d'autre. Les 25 « propres » se concentrent sur les lois à densité (8), la statistique à deux variables (9) et les suites (5 : sommes géométriques et suites arithmético-géométriques).

---

## Points TSPE sans aucun équivalent TCOMP

Codes TSPE qui n'apparaissent dans **aucune** colonne « TSPE » ci-dessus : leurs cartes seront `["T_SPE"]` seules. 162 points sur 262 (100 sont rattachés au moins une fois). Calculé par script, par objectif TSPE.

| Objectif TSPE                                           | Nb      | Codes                                                                                    |
| ------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| Ensembles                                               | 3       | TSPE-006, TSPE-007, TSPE-008                                                             |
| Logique et raisonnement                                 | 7       | TSPE-018 → TSPE-024                                                                      |
| Algorithmique — Notion de liste                         | 5       | TSPE-025 → TSPE-029                                                                      |
| Combinatoire et dénombrement                            | 18      | TSPE-030 → TSPE-036, TSPE-038, TSPE-039, TSPE-042 → TSPE-050                             |
| Vecteurs, droites et plans de l'espace                  | 17      | TSPE-051 → TSPE-067                                                                      |
| Orthogonalité et distances dans l'espace                | 23      | TSPE-068 → TSPE-090                                                                      |
| Représentations paramétriques et équations cartésiennes | 15      | TSPE-091 → TSPE-105                                                                      |
| Suites                                                  | 9       | TSPE-112, TSPE-114, TSPE-116, TSPE-117, TSPE-118, TSPE-119, TSPE-122, TSPE-123, TSPE-125 |
| Limites des fonctions                                   | 4       | TSPE-129, TSPE-133, TSPE-134, TSPE-135                                                   |
| Compléments sur la dérivation                           | 7       | TSPE-136, TSPE-146, TSPE-147, TSPE-150, TSPE-151, TSPE-152, TSPE-153                     |
| Continuité des fonctions                                | 7       | TSPE-154, TSPE-155, TSPE-156, TSPE-163, TSPE-164, TSPE-165, TSPE-166                     |
| Fonction logarithme                                     | 4       | TSPE-172, TSPE-177, TSPE-179, TSPE-180                                                   |
| Fonctions sinus et cosinus                              | 8       | TSPE-181 → TSPE-188                                                                      |
| Primitives, équations différentielles                   | 1       | TSPE-199                                                                                 |
| Calcul intégral                                         | 9       | TSPE-204, TSPE-209, TSPE-212, TSPE-213, TSPE-215, TSPE-218, TSPE-219, TSPE-220, TSPE-223 |
| Succession d'épreuves, schéma de Bernoulli              | 6       | TSPE-232, TSPE-235, TSPE-236, TSPE-237, TSPE-238, TSPE-240                               |
| Sommes de variables aléatoires                          | 9       | TSPE-241 → TSPE-244, TSPE-246 → TSPE-248, TSPE-250, TSPE-252                             |
| Concentration, loi des grands nombres                   | 10      | TSPE-253 → TSPE-262                                                                      |
| **Total**                                               | **162** |                                                                                          |

Les plages « → » sont continues (vérifiées). Objectifs TSPE **entièrement** spé seule : liste, dénombrement (hors coefficients binomiaux), toute la géométrie dans l'espace, sinus/cosinus, concentration.

Deux nuances :

- TSPE-232 (utiliser l'expression de la loi binomiale pour un seuil) n'a pas d'équivalent littéral, mais ses cartes simples ($n$ petit) recouvrent TCOMP-095 ; cf. question 3.
- TSPE-238 et TSPE-259 (simulations) sont voisins de TCOMP-114/115, tous non cartables : sans conséquence.

---

## Questions à trancher par David

> **Tranché par David le 2026-10-04 : les 8 recommandations sont retenues telles quelles.**

1. **Gestes TCOMP pratiqués en spé sans point TSPE littéral** — sommes géométriques (TCOMP-005, 009), suites arithmético-géométriques (TCOMP-006, 012, 013), inéquation par tableau de variation (TCOMP-033), diagramme de la binomiale (TCOMP-090). Partager en rattachant au point TSPE le plus proche, ou garder `T_COMP` seul ?
   _Recommandation_ : partager 005/009 → TSPE-111 et 006/012/013 → TSPE-115 (ce sont les exercices-types de spé) ; garder 033 et 090 en `T_COMP` seul (rattachement trop lâche).
2. **Exigence décalée** — loi géométrique (TCOMP-091, 092, 096, 099 : attendu) contre TSPE-239 (approfondissement) ; méthode des rectangles (TCOMP-071 : attendu) contre TSPE-221 (approfondissement). Partager ?
   _Recommandation_ : partager, à condition que la planification respecte l'exigence **du point du programme de l'élève** : carte imposée en TCOMP, optionnelle en TSPE. Sinon, `T_COMP` seul.
3. **Outil de calcul pour la binomiale** (TCOMP-095, 097 « à l'aide d'une calculatrice » ; TSPE-233 « numériquement ») et la droite de régression (TCOMP-123). Une carte flash ne suppose pas de calculatrice.
   _Recommandation_ : cartes partagées avec $n \leqslant 5$ calculables à la main, ou fournissant un extrait de table de $P(X \leqslant k)$ ; pour la régression, donner les sorties de calculatrice et faire interpréter.
4. **Notation des coefficients binomiaux** — TCOMP les définit par les chemins (TCOMP-087), sans factorielle ; TSPE a $\frac{n!}{k!(n-k)!}$ (TSPE-038).
   _Recommandation_ : cartes partagées sur chemins, symétrie, triangle de Pascal, $\binom{n}{0}$, $\binom{n}{1}$, $\binom{n}{n}$ ; formule factorielle et $\binom{n}{2}$ en spé seule.
5. **Rattacher une carte de savoir-faire à un point TSPE de contenu** — TCOMP-051, 054, 077 n'ont en TSPE qu'un `[C]` (TSPE-192, 193, 208). Acceptable ?
   _Recommandation_ : oui ; le point TSPE de contenu est le seul porteur de la notion, et l'alternative est de ne pas partager une carte identique.
6. **Notation $\left[F(x)\right]_a^b$** — explicite en TSPE-203, absente de TCOMP-074.
   _Recommandation_ : l'utiliser dans les corrections des cartes partagées, ne jamais l'exiger dans la réponse.
7. **Grain inégal** — TCOMP-055/056 coupés, TSPE-195 d'un bloc. Faut-il couper TSPE-195 ?
   _Recommandation_ : non ; une carte vise un point TCOMP et TSPE-195, le suivi spé reste au grain actuel.
8. **Algorithmes d'intitulé identique** — TCOMP-015/TSPE-120, 044/161, 045/162, 046/178, 059/200, 082/221, 083/222. Créer des cartes « lire un programme Python » ?
   _Recommandation_ : non pour l'instant (approfondissement des deux côtés) ; si elles naissent, elles se partagent sans adaptation.

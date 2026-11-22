# Relevé « limites de fonctions » de Terminale spécialité (2026-11-22)

Chantier [`idees-tle-limites`](idees-tle-limites-progress.md). 18 exercices de la rubrique TSA2 d'une
autre plateforme, lus dans leur code source (copie locale, sans les `_old`), comparés à nos modèles
publiés en prod (MCP en lecture seule, énoncés des variations lus). Quatre exercices lus directement,
quatorze relevés par deux agents (Sonnet) ; les verdicts sont les miens, posés contre nos variations
en base. Les ids sont ceux de la plateforme.

**Leur forme** : 13 exercices sur 18 se saisissent (une limite, au clavier de limites) ou se cochent
(QCM) ; 4 sont des sujets rédigés sans saisie (TSA2-33, 34, 51, 52), 1 a plusieurs champs (TSA2-12).

## Nos modèles (prod, publiés)

| Id court | Titre                                                                                            | Var. | Point    |
| -------- | ------------------------------------------------------------------------------------------------ | ---- | -------- |
| 6d611634 | Limites usuelles d'une fonction (k·xⁿ, k/xⁿ en 0 et en ±∞, k√x, k·eˣ)                            | 5    | TSPE-403 |
| 806c10f4 | Limite par opérations, sans FI (a + b/x², a·eˣ + b, ax³ + b√x, a + b/x en 0⁺)                    | 4    | TSPE-415 |
| 04ec9518 | Limite en un point, dénominateur → 0 (k/(x − a) à droite, à gauche, k/(x − a)², (x + b)/(x − a)) | 4    | TSPE-415 |
| 7844be9a | Lever une FI par le terme prépondérant (ax³ + bx² + c en −∞, quotients 2/2, 1/2, 2/1)            | 4    | TSPE-583 |
| b97dabe1 | Croissances comparées : eˣ − kxⁿ, kxⁿe⁻ˣ, kxⁿeˣ en −∞                                            | 3    | TSPE-580 |
| ae70373c | Limite par comparaison ou encadrement (inégalités données, g bornée sur x²)                      | 4    | TSPE-582 |
| 5bf5b452 | Comparaison et encadrement (théorèmes, f et g abstraites, QCM)                                   | 3    | TSPE-400 |
| f6415cb9 | Opérations sur les limites : formes indéterminées (QCM)                                          | 3    | TSPE-401 |
| a4d8dc52 | Asymptote parallèle à un axe : équation à partir d'une limite                                    | 4    | TSPE-404 |
| b4f3142b | Asymptote oblique : équation, division, position                                                 | 4    | TSPE-406 |
| 6248e597 | Branches infinies : asymptote ou branche parabolique                                             | 4    | TSPE-584 |
| b4096cd8 | Étude de fonction : où chercher les limites                                                      | 1    | TSPE-416 |
| c8571d78 | Démontrer la croissance comparée de xⁿ et de l'exponentielle                                     | 4    | TSPE-405 |

Points sans modèle propre : TSPE-397, 398, 399, 572 à 575 (des notions du BO, couvertes par les modèles
ci-dessus) et TSPE-581 (limite par opérations, couverte en fait par 806c10f4, tagué TSPE-415).
**Aucun** modèle ne fait lire une limite sur une **courbe**, ni ne calcule une limite **par composition**.

## Relevé

| Id      | Ce qu'on demande                                                                                           | Forme chez eux            | Nos modèles                             | Verdict                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TSA2-10 | Conjecturer les limites en −∞ et +∞ sur une courbe (10 allures, dont oscillation : pas de limite)          | QCM sur un couple         | aucun (849aabbc : suite, 1re)           | ❌ manque la lecture graphique d'une limite de fonction                                             |
| TSA2-11 | Asymptotes horizontale, verticale ou les deux, lues dans un tableau de variations                          | QCM                       | a4d8dc52 (à partir d'une limite écrite) | 🟡 manque le tableau de variations comme source                                                     |
| TSA2-12 | Une limite donnée : y a-t-il une asymptote, laquelle, son équation (dont les cas « non »)                  | 3 champs (menus + saisie) | a4d8dc52 v1, v2 (cas « oui » seulement) | 🟡 manquent les cas sans asymptote (limite infinie en ±∞, finie en un point)                        |
| TSA2-21 | Limites de référence en ±∞ : k·x²ᵖ, k·x²ᵖ⁺¹, k/x, k/x², e^{kx}                                             | saisie                    | 6d611634                                | 🟡 manque e^{kx} (k ≠ ±1, composition simple)                                                       |
| TSA2-22 | Sommes simples sans FI en ±∞ : c + a/x (+ b/x²), ax + b + c/x, ax² + bx + c sans FI, n/(x² + k)            | saisie                    | 806c10f4, 6d611634                      | ✅ même savoir-faire (n/(x² + k) : variation possible, pas nécessaire)                              |
| TSA2-31 | Factoriser par le terme de plus haut degré : polynôme (∞ − ∞), quotient de polynômes (degrés 1 à 3)        | saisie                    | 7844be9a                                | ✅                                                                                                  |
| TSA2-32 | Limites à gauche et à droite en un réel : 1/(ax + b), 1/(ax + b)², (cx + d)/(ax + b), (cx + d)/(x² − a²)   | 2 ou 4 champs             | 04ec9518 (x − a seulement)              | 🟡 manquent la pente négative (ax + b, a < 0 : piège du signe) et x² − a² (deux valeurs interdites) |
| TSA2-33 | Limites aux quatre bornes de b/(cx + d) ou b/(cx + d)², interpréter                                        | rédigée                   | 04ec9518 + a4d8dc52, séparés            | 🟡 manque l'étude d'ensemble : quatre limites et les deux asymptotes d'une même fonction            |
| TSA2-34 | Étude complète de n/(bx + c) ou (ax + b)/(cx + d) : variations, limites, asymptotes, tableau               | rédigée                   | b4096cd8, 04ec9518, a4d8dc52            | 🟡 idem TSA2-33 ; les variations relèvent de la rubrique dérivation                                 |
| TSA2-35 | Limite par composition : √(axⁿ + k), √(e^{kx} + m²), e^{axⁿ + k}, (axⁿ + k)ᵖ, ln(axⁿ + k)                  | saisie                    | aucun                                   | ❌ manque la composition (ln : rubrique logarithme, décision lts-5)                                 |
| TSA2-37 | √(ax + b) ± √(ax + d), √(x² + b) ± √(x² + d) : somme, ou différence par la quantité conjuguée              | saisie                    | aucun                                   | ❌ ; la **quantité conjuguée n'est pas au BO de Tle** (ni nommée, ni exemplifiée)                   |
| TSA2-41 | Une inégalité ax + c ⩽ f(x) donnée : quelle limite peut-on en déduire (−∞, +∞, en x₀, aucune) ?            | QCM                       | 5bf5b452 (f, g abstraites), ae70373c    | 🟡 manque le cas concret où l'inégalité ne permet **rien** (mauvais sens, pente nulle)              |
| TSA2-42 | Croissances comparées : c·xⁿ/eˣ, c·eˣ/xⁿ, c·xⁿeˣ en −∞, eˣ − pxⁿ, et les mêmes avec e^{kx}                 | saisie                    | b97dabe1                                | 🟡 manquent c·eˣ/xⁿ (signe de c) et les formes en e^{kx}                                            |
| TSA2-43 | Comparaison concrète : axᵈ + b + c·cos x → ±∞ ; c·sin x/(ax² + b) → 0 ; c·cos x·e^{−mx} → 0                | saisie                    | ae70373c (inégalités données)           | 🟡 manque de **construire** l'encadrement à partir de −1 ⩽ cos x ⩽ 1                                |
| TSA2-44 | Limite à partir d'une inégalité ou d'un encadrement donnés                                                 | saisie                    | ae70373c v1 à v3                        | ✅                                                                                                  |
| TSA2-45 | Exponentielle : par opérations sans FI (eˣ + kxⁿ, kxⁿ + eˣ en −∞, kxⁿeˣ en +∞, eˣ/xⁿ et xⁿ/eˣ en −∞) ou CC | saisie                    | 806c10f4 v2, b97dabe1                   | 🟡 manque de **distinguer** FI et pas FI : les cas sans FI avec eˣ et xⁿ                            |
| TSA2-51 | (mx² + Bx + C)/(x − p) : limites en p, en ±∞, a, b, c de ax + b + c/(x − p), asymptote oblique             | rédigée                   | b4f3142b, 04ec9518 v4, 7844be9a         | ✅ chaque étape a sa variation                                                                      |
| TSA2-52 | m·eˣ/(eˣ − (ax + b)) : fonction auxiliaire, limites (factoriser par eˣ), asymptotes, variations            | rédigée                   | 7844be9a (polynômes seulement)          | 🟡 manque la factorisation par eˣ dans un quotient ; le reste relève de la rubrique dérivation      |

## Ce que leur format fait et pas le nôtre

Rien de bloquant : un menu « admet / n'admet pas » (TSA2-12) se fait par une case `choix` ; une courbe
affichée par le bloc ```courbe ; un tableau de variations affiché par le bloc ``variation. Leur champ
de limite accepte « +∞ » au clavier comme le nôtre.

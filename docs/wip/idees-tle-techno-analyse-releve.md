# Relevé « analyse » de Terminale technologique (2026-11-26)

Chantier [`idees-tle-techno-analyse`](idees-tle-techno-analyse-progress.md). 12 exercices de la
rubrique TTE d'une autre plateforme (TTE-2, 3, 5 à 14, sans `TTE-7-old`), lus dans leur code source
(copie locale), comparés à nos modèles publiés en prod (MCP en lecture seule, énoncés et variables
des variations lus). Les ids sont ceux de la plateforme.

**Programme** : Tle techno (`T_TECHNO.md`, bornes `docs/systeme/programmes/bornes/lycee/ttechno.md`).
Pas de base e : ni exp ni ln ; seul le logarithme décimal ; équations et inéquations aˣ = b, xᵃ = b,
aˣ < b, xᵃ < b, aⁿ < b seulement ; log(aⁿ) pour n entier naturel (x réel admis dans les résolutions,
décision ltt-1). Les options « ln » de leurs exercices sont donc hors programme ici (la version ln a
été reprise en spé par `idees-tle-ln`).

**Leur forme** : 11 exercices se saisissent (nombre, expression, intervalle, ensemble), TTE-14 se
saisit en texte (« strictement croissante »), TTE-12 associe par numéros de courbe.

## Nos modèles (prod, publiés, Tle techno)

| Id court | Titre                                                      | Var. | Point       |
| -------- | ---------------------------------------------------------- | ---- | ----------- |
| f84e23a3 | Calculer un taux d'évolution moyen                         | 3    | TTECHNO-038 |
| a439df84 | Taux d'évolution moyen de plusieurs évolutions successives | 3    | TTECHNO-035 |
| 5d8a7865 | Sens de variation de x ↦ aˣ sur ℝ                          | 5    | TTECHNO-032 |
| 94b1dbf6 | Courbe de x ↦ aˣ sur ℝ                                     | 4    | TTECHNO-033 |
| 065eea60 | Associer une courbe à sa fonction x ↦ aˣ (sur [0 ; 4])     | 2    | TTECHNO-033 |
| f6805041 | Sens de variation de x ↦ k·aˣ                              | 4    | TTECHNO-036 |
| 069c1a53 | Utiliser le sens de variation de x ↦ k·aˣ                  | 3    | TTECHNO-080 |
| dc269779 | Logarithme décimal : définition                            | 6    | TTECHNO-040 |
| 9834f4cd | Logarithme d'un produit                                    | 5    | TTECHNO-042 |
| ceeba3f8 | Logarithme d'un quotient                                   | 5    | TTECHNO-083 |
| 22bbd82a | Logarithme d'une puissance                                 | 5    | TTECHNO-082 |
| af24839d | Transformer des expressions avec le logarithme décimal     | 5    | TTECHNO-044 |
| 52b884ee | Résoudre une équation aˣ = b ou xᵃ = b avec log            | 6    | TTECHNO-043 |
| 10bd7075 | Résoudre une inéquation aˣ < b ou xᵃ < b avec log          | 4    | TTECHNO-084 |
| becf24bc | Seuil : plus petit entier n tel que aⁿ < b                 | 4    | TTECHNO-085 |

Aussi : e4e65a69, b14f7169 (aˣ, exposant non entier ou négatif), a5b2c4fa, ebefd0a9, e52d93b4,
5e810e16, 60971c9a (propriétés algébriques), 2a9c316a (sens de aˣ, 1re), 4950a32e, 4131bd94,
a37968c5 (indices). Aucun de ces modèles n'est réservé par une autre session (tableau de
répartition, 2026-11-26).

## Relevé

| Id     | Ce qu'on demande                                                                                                                                                 | Forme chez eux              | Nos modèles                             | Verdict                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| TTE-2  | Une quantité (bactéries, température) augmente ou baisse de x % (10 à 80) en n heures (1 à 3) : taux moyen **par minute** (k = 60n), arrondi à 0,1 %             | saisie (nombre, %)          | f84e23a3 (par an, par mois)             | 🟡 manque le changement d'unité (heures → minutes) avant la racine k-ième                                          |
| TTE-3  | Résoudre aˣ ⋚ b (4 sens), intervalle ; couples (a, b) d'une liste fixe (0,25ˣ, 27ˣ, 1 024ˣ…) ; borne entière (2ˣ ≤ 1 024), rationnelle (4ˣ < 8) ou log b / log a | saisie d'un intervalle      | 10bd7075 v1 à v3 (borne log b / log a)  | 🟡 manque la borne **entière ou rationnelle** (a et b puissances d'un même nombre), avec a < 1                     |
| TTE-5  | Résoudre aˣ = b, mêmes couples et mêmes trois cas                                                                                                                | saisie dans S = {…}         | 52b884ee v2 (log b / log a seulement)   | 🟡 même manque : solution entière ou rationnelle (8ˣ = 32 → 5/3 ; 0,25ˣ = 32 → −5/2)                               |
| TTE-6  | Exprimer log(aⁿbᵐ) ou log(aⁿ/bᵐ) en fonction de log a et log b ; a, b ∈ {2, 3, 5}, n, m de 2 à 5 ; écrit en puissances ou en nombre (log 72)                     | saisie                      | af24839d v1 (log(2ᵖ3ᑫ), produit)        | 🟡 manquent le quotient (coefficient négatif) et la base 5                                                         |
| TTE-7  | log(ax + b) = n ou log(ax + b) = log(cx + d) : domaine puis solutions ; option ln                                                                                | 2 champs (domaine, S)       | aucun en techno                         | ⛔ hors programme techno (log d'une expression : seuls aˣ = b, xᵃ = b au BO) ; la version ln est en spé (d3301f2d) |
| TTE-8  | a log(xᵏ) + b log(1/xʲ) + c log(xᵐ) = ? log x, x > 0 ; a, b, c de −5 à 5, exposants ±1 à ±3                                                                      | saisie du coefficient       | af24839d v4 (log(xⁿ) + log(xᵐ))         | 🟡 manquent les coefficients et le terme log(1/xʲ) (= −j log x)                                                    |
| TTE-9  | Résoudre dans ℝ xᵃ = b, a de 3 à 9, b de 1 à 9 ; valeur exacte (ⁿ√b ou b^(1/a), entier si possible) ; a pair → {−r ; r}                                          | saisie d'un ensemble        | 52b884ee v5 (sur ]0 ; +∞[, au centième) | 🟡 manque la valeur **exacte** b^(1/a) ; le cas « dans ℝ, a pair » est à trancher (fiche F6)                       |
| TTE-10 | a log(10ⁿ) ± c log(10ᵐ) ou a log(10ⁿ) × c log(10ᵐ), 10ᵐ écrit en nombre (1 000, 0,01) ; a, c de −5 à 5                                                           | saisie (entier)             | dc269779 v1, v2 (un seul log)           | 🟡 manque l'enchaînement de deux logs avec coefficients                                                            |
| TTE-11 | Ensemble de définition de log(ax + b), log((ax + b)/(cx + d)), log(trinôme)                                                                                      | saisie d'un ensemble        | aucun en techno                         | ⛔ hors programme techno ; la version ln est en spé (TSA5-30, reprise par `idees-tle-ln`)                          |
| TTE-12 | Associer 4 fonctions aˣ (2 croissantes, 2 décroissantes, ou 4 du même sens) à 4 courbes sur [−3,5 ; 3,5]                                                         | numéro de courbe (4 champs) | 94b1dbf6 v1, v2 (3 courbes, associer)   | ✅ par le bloc associer                                                                                            |
| TTE-13 | Courbe de aˣ avec un point A d'abscisse 1, −1, 2 ou −2 marqué ; trouver f(x) (a = n ou 1/n, n de 2 à 5)                                                          | saisie de l'expression      | 069c1a53 v3 (f(0), f(1) donnés)         | ❌ la lecture sur la courbe manque : variation de 94b1dbf6                                                         |
| TTE-14 | Sens de variation de k·aˣ ; a écrit en décimal ou en fraction (3/2, 5/4, 2/3, 1/3), k ∈ ±{0,5 ; 1,5 ; 2 à 6}                                                     | saisie de texte             | f6805041 v1 à v4 (a décimal, k entier)  | 🟡 manquent la base en fraction (3/2 contre 2/3) et k non entier                                                   |

## Décompte

✅ 1 · 🟡 8 · ❌ 1 · ⛔ hors programme 2.

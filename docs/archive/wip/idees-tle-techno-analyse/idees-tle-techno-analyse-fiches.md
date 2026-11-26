# Fiches de phase 0 : analyse de Terminale technologique (2026-11-26)

Chantier [`idees-tle-techno-analyse`](idees-tle-techno-analyse-progress.md) · [relevé](idees-tle-techno-analyse-releve.md).
Chaque fiche donne ma recommandation, son point (un seul, ADR 0020), ses variations, ses plages et sa
forme de réponse, avec le passage « chez eux → chez nous ». Chaque variation aura ses `testSpecs`,
trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse. Tout est en Tle
techno (`grades` : `T_TECHNO`, inchangé).

**En tout** : aucun modèle neuf, 9 variations sur 8 modèles publiés. Le point de chaque modèle ne
change pas. Aucun de ces modèles n'est réservé par une autre session (tableau, 2026-11-26).

**Question d'accès** : personne ne gagne d'accès. On ajoute des variations à des modèles publiés.

**Outils** : aucun ne manque (bloc `courbe` avec `points:` pour F8, bloc `choix` pour F9).

## Variations de modèles publiés

### F1. aˣ = b avec une solution entière ou rationnelle (TTE-5) : 1 variation de 52b884ee

- **Point** : TTECHNO-043 (inchangé).
- **Chez eux → chez nous** : leur liste de couples devient un tirage : a = cᵖ, b = cᑫ, avec c ∈ {2, 3, 5}.
  On garde la saisie de la solution, en valeur exacte simplifiée (la consigne le dit).
- **V7** : c ∈ {2, 3, 5}, p ∈ {−3, −2, −1, 2, 3, 4, 5} (a = 0,25, 0,125, 0,2, 4, 8, 27, 32…),
  q de −3 à 5 sauf 0 et p ; solution q/p (2/3, 5/3, −5/2, 3…). a et b écrits en décimal (0,25ˣ = 32).
- **Erreurs prévues** : p/q (fraction renversée) ; −q/p pour a > 1 (signe) ; b/a.
- **Coup de pouce** : « Écris a et b comme des puissances d'un même nombre. »

### F2. aˣ ⋚ b avec une borne entière ou rationnelle (TTE-3) : 1 variation de 10bd7075

- **Point** : TTECHNO-084 (inchangé).
- **Chez eux → chez nous** : même tirage que F1, les 4 sens (<, ≤, >, ≥), a < 1 une fois sur deux ;
  saisie de l'intervalle (notre case intervalle).
- **V5** : mêmes plages que F1 ; réponse ]−∞ ; q/p[ ou [q/p ; +∞[ selon le sens et a.
- **Erreurs prévues** : sens gardé quand a < 1 (log a < 0) ; crochet fermé pour une inégalité stricte ;
  borne p/q.
- **Coup de pouce** : « Quel est le signe de log(a) ? »

### F3. log(aⁿ/bᵐ) en fonction de log a et log b (TTE-6) : 1 variation de af24839d

- **Point** : TTECHNO-044 (inchangé).
- **Chez eux → chez nous** : même idée, deux cases comme af24839d v1 (? log a + ? log b), la seconde
  négative.
- **V6** : a ≠ b dans {2, 3, 5}, n et m de 2 à 5 ; une fois sur deux en puissances (log(2³/5²)), une
  fois sur deux en nombre (log(8/25), fraction écrite).
- **Erreurs prévues** : +m (signe du quotient oublié) ; n × m ; n − m dans une seule case.
- **Coup de pouce** : « Le logarithme d'un quotient est une différence. »

### F4. Réduire a log(xᵏ) + b log(1/xʲ) + c log(xᵐ) (TTE-8) : 1 variation de af24839d

- **Point** : TTECHNO-044 (inchangé).
- **Chez eux → chez nous** : même idée, une case (? log x).
- **V7** : a, b, c de −5 à 5 sauf 0, exposants k, j, m de 1 à 3 ; réponse ak − bj + cm, jamais 0.
- **Erreurs prévues** : +bj (log(1/xʲ) compté positif) ; a + b + c (exposants oubliés) ;
  ak + bj + cm.
- **Coup de pouce** : « log(1/xʲ) = log(1) − log(xʲ). »

### F5. Deux logarithmes de puissances de 10 (TTE-10) : 1 variation de dc269779

- **Point** : TTECHNO-040 (inchangé).
- **Chez eux → chez nous** : même idée, une case.
- **V7** : a log(10ⁿ) ± c log(10ᵐ), ou produit ; a, c ∈ ±{1 à 5}, n de 1 à 5, m de −3 à 5 sauf 0 ;
  10ᵐ écrit en nombre (1 000, 0,01). Réponse entière.
- **Erreurs prévues** : log(0,01) = 2 (signe) ; nombre de zéros compté pour 0,001 = 10⁻² ;
  a × c sans les exposants.
- **Coup de pouce** : « Écris chaque nombre comme une puissance de 10. »

### F6. xᵃ = b en valeur exacte (TTE-9) : 1 variation de 52b884ee

- **Point** : TTECHNO-043 (inchangé).
- **Chez eux → chez nous** : on garde ]0 ; +∞[ comme notre v5 (la résolution par log demande x > 0,
  et c'est le cas du taux moyen). Valeur exacte b^(1/a), ou l'entier quand b = cᵃ.
- **V8** : a de 3 à 9, b de 2 à 9 sauf a ; une fois sur trois b = cᵃ (x = c entier).
- **Question** : faut-il aussi « dans ℝ, a pair → deux solutions » comme chez eux ? Ma recommandation :
  non (la solution négative ne vient pas du logarithme).
- **Erreurs prévues** : b/a ; bᵃ ; log(b)/a (c'est log x, pas x).
- **Coup de pouce** : « Élève les deux membres à la puissance 1/a. »

### F7. Taux moyen par minute (TTE-2) : 1 variation de f84e23a3

- **Point** : TTECHNO-038 (inchangé).
- **Chez eux → chez nous** : même idée, une case en %.
- **V4** : une population de bactéries (ou la température d'une pièce) augmente ou baisse de x % en
  n heures ; x de 10 à 80, n de 1 à 3 ; taux moyen par minute en %, arrondi au **centième** (au
  dixième, il vaudrait souvent 0,1 %).
- **Erreurs prévues** : x/(60n) (taux divisé) ; racine n-ième (heures pas converties) ;
  (1 + x/100)^(60n) − 1.
- **Coup de pouce** : « Combien de minutes en n heures ? »

### F8. Trouver a sur la courbe de aˣ (TTE-13) : 1 variation de 94b1dbf6

- **Point** : TTECHNO-033 (inchangé).
- **Chez eux → chez nous** : la courbe et le point A sont dessinés par le bloc `courbe` (`points:`) ;
  on demande a (une case, valeur exacte) plutôt que l'expression : c'est ce que l'élève trouve.
- **V5** : A d'abscisse 1, −1, 2 ou −2 ; a = n (x > 0) ou 1/n (x < 0), n de 2 à 5 (2 à 3 pour |x| = 2).
- **Erreurs prévues** : a = y pour x = 2 (racine oubliée) ; a = y pour x = −1 (inverse oublié) ;
  a = 1/y pour x = 1.
- **Coup de pouce** : « Le point A donne f(x_A) = y_A, donc a^(x_A) = y_A. »

### F9. Sens de k·aˣ avec une base en fraction (TTE-14) : 1 variation de f6805041

- **Point** : TTECHNO-036 (inchangé).
- **Chez eux → chez nous** : notre choix « croissante / décroissante / constante » comme les v1 à v4.
- **V5** : a ∈ {3/2, 5/4, 2/3, 1/3, 1/2} (en fraction) ou {1,2 ; 0,25}, k ∈ ±{0,5 ; 1,5 ; 2,5 ; 2 à 6} ;
  les 4 cas (signe de k, a > 1 ou < 1) tirés au hasard.
- **Erreurs prévues** : (choix) décroissante pour k < 0 et a < 1 ; sens lu sur le dénominateur seul.
- **Coup de pouce** : « Compare a à 1, puis regarde le signe de k. »

## Rien à faire

- **TTE-12** (associer 4 courbes) : 94b1dbf6 v1, v2 et 065eea60 le font déjà.
- **TTE-7, TTE-11** (équation log(ax + b) = …, ensemble de définition de log(u)) : hors programme
  techno (le BO ne connaît que aˣ = b, xᵃ = b et leurs inéquations, `T_TECHNO.md` l. 378). La
  version ln est en spé, reprise par `idees-tle-ln`. Ma recommandation : rien (plutôt qu'un modèle
  sans point).

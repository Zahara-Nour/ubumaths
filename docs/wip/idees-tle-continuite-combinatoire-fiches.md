# Fiches de la phase 0 « continuité, dénombrement » de Terminale (2026-11-25)

Chantier [`idees-tle-continuite-combinatoire`](idees-tle-continuite-combinatoire-progress.md), relevé :
[idees-tle-continuite-combinatoire-releve.md](idees-tle-continuite-combinatoire-releve.md). Copie des fiches de la page à cocher https://claude.ai/artifact/SmYJM9k1YCqeck3Qs98W4T. Validées par David le 2026-11-25 (« je valide » : toutes oui, Q1 oui).

Toutes les variations auront leurs `testSpecs` (réponses justes sous plusieurs écritures, erreurs
typiques refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

## Modèles neufs

### N1 — Continuité en a d'une fonction définie par morceaux

- **Recommandation** : Nouveau modèle, 3 variations
- **Chez eux** : TSA4-11 : f affine ou « carré » de chaque côté de a ; continue sur chaque intervalle ouvert ? en a ? sur ℝ ? Sujet rédigé, sans saisie.
- **Chez nous** : On garde seulement la continuité en a, par les limites : le BO exclut de faire justifier la continuité sur un intervalle. L'élève saisit les nombres qui décident (limite à gauche, à droite, f(a)) ou le paramètre qui rend f continue. Aucun de nos modèles ne travaille une fonction par morceaux (ec4fa70f fait le prolongement d'un quotient).
- **Modèle** : Nouveau : « Fonction définie par morceaux : continuité en a »
- **Point** : TSPE-425 (continuité en un point, par les limites), nœud « continuité en un point »
- **Variations** :
  - Affine | affine, a de −2 à 2, valeurs en a de −3 à 3, pentes ±1 ou ±2, côté inclus tiré : trois cases (limite à gauche, limite à droite, f(a)), puis case choix « continue en a » ou « pas continue en a »
  - f(x) = x² + m si x ⩽ a, px + q si x > a : la valeur de m qui rend f continue en a (m = pa + q − a²)
  - f(x) = e^(kx) + m si x < 0, x² + px + c si x ⩾ 0 : la valeur de m (m = c − 1)
- **Réponse** : Nombres ; case choix après les calculs. Erreurs prévues : limite lue dans la mauvaise branche, f(a) pris du côté exclu, e⁰ = 0

### N2 — Théorème des valeurs intermédiaires sur une équation donnée

- **Recommandation** : Nouveau modèle, 4 variations
- **Chez eux** : TSA4-31 : « démontrer que x³ = ax + b (ou eˣ = x + a, x − cos x = k) a au moins une solution sur l'intervalle donné ». TSA4-32 : la même avec « une unique solution », par le signe de h′. Sujets rédigés.
- **Chez nous** : L'élève calcule h aux bornes (une case par borne, valeur exacte), puis choisit la conclusion. Nos modèles TVI sont abstraits (c10096eb, fe7f5218) ou lus sur un tableau (2491dd75) : aucun ne part d'une équation écrite. La valeur approchée à 10⁻² de TSA4-32 n'est pas reprise : d3ae0f61 encadre déjà la solution avec un tableau de valeurs, sans calculatrice.
- **Modèle** : Nouveau : « Théorème des valeurs intermédiaires sur une équation donnée »
- **Point** : TSPE-430 (solutions de f(x) = k : existence, unicité), nœud « valeurs intermédiaires »
- **Variations** :
  - x³ = ax + b sur [m ; m + 1] (triplets tirés dans une liste où h change de signe, a de 2 à 6, b de −4 à 4) : h(m), h(m + 1), puis « au moins une solution »
  - eˣ = x + a sur [−a ; 0], a de 2 à 4 : h(−a) = e^(−a), h(0) = 1 − a
  - x − cos x = k sur [0 ; π/2], k parmi 0,25 ; 0,5 ; 0,75 ; 1 : h(0) = −1 − k, h(π/2) = π/2 − k
  - Unicité : x³ = ax + b sur [m ; m + 1] où h′(x) = 3x² − a garde un signe : sens de variation de h (choix), puis le nombre de solutions
- **Réponse** : Nombres exacts et case choix (leurres : « exactement une » quand la monotonie manque, « aucune », « on ne peut pas savoir »). Erreurs prévues : h(x) écrit à l'envers (signe), e^(−a) confondu avec −eᵃ, cos(π/2) = 1

### N4 — Limite de f(uₙ) quand f est continue

- **Recommandation** : Nouveau modèle, 4 variations
- **Chez eux** : TSA4-41 : suite uₙ₊₁ = f(uₙ), la limite vérifie f(ℓ) = ℓ par continuité. L'idée de la suite est couverte (57063ada, d1aee0b9), mais le point du cours qu'elle utilise n'a aucun modèle chez nous.
- **Chez nous** : Idée voisine, pas reprise d'un exercice : uₙ converge vers ℓ (quotient de deux affines en n), f est continue en ℓ, l'élève donne la limite de f(uₙ). Couvre TSPE-427, seul point de la continuité sans modèle.
- **Modèle** : Nouveau : « Limite de f(uₙ) quand uₙ converge et f est continue »
- **Point** : TSPE-427 (image d'une suite convergente par une fonction continue), nœud « point fixe »
- **Variations** :
  - uₙ = (an + b)/(n + c), a de 1 à 3 : limite de e^(uₙ) → eᵃ
  - uₙ = (p²n + b)/(n + c), p de 2 à 4 : limite de √uₙ → p
  - uₙ = (an + b)/(n + c), a de 2 à 5 : limite de ln(uₙ) → ln a
  - uₙ = πn/(n + 1) ou πn/(2n + 1) : limite de cos(uₙ) → −1 ou 0
- **Réponse** : Nombre exact. Erreurs prévues : f(u₀), la limite de uₙ elle-même, e^(b/c)

### N5 — Probabilité par dénombrement

- **Recommandation** : Nouveau modèle, 4 variations
- **Chez eux** : TSG1-04 : sac de n lettres (v voyelles), tirage simultané de 2 lettres : nombre de tirages, puis probabilité d'avoir une voyelle et une consonne (fraction irréductible).
- **Chez nous** : Une case par probabilité, fraction égale acceptée sous toute écriture. Aucun de nos modèles ne passe d'un dénombrement à une probabilité ; le BO cite les probabilités parmi les situations de TSPE-319.
- **Modèle** : Nouveau : « Probabilité par dénombrement »
- **Point** : TSPE-319 (dénombrements en situation), nœud « Problèmes de dénombrement »
- **Variations** :
  - n lettres dont v voyelles (n de 7 à 10, v de 3 à n − 3), 2 lettres tirées ensemble : P(une voyelle et une consonne) = v(n − v)/C(n, 2)
  - Urne de r rouges et w blanches (r, w de 3 à 6), 3 boules tirées ensemble : P(exactement 2 rouges) = C(r, 2)·w/C(r + w, 3)
  - Main de k cartes (k = 2 ou 3) d'un jeu de 32 : P(au moins un as) = 1 − C(28, k)/C(32, k)
  - Code de k chiffres (k de 2 à 4) tiré au hasard : P(chiffres tous différents) = 10 × 9 × … /10ᵏ
- **Réponse** : Fraction ou décimal exact. Erreurs prévues : ordre compté au numérateur seulement (v(n − v) × 2 / C(n, 2)), complémentaire oublié, n² au dénominateur

## Variations de modèles publiés

### V1 — Nombre de solutions de f(x) = k pour x − a ln x et (x + b)eˣ

- **Recommandation** : 2 variations de 2491dd75
- **Chez eux** : TSA4-40 (dernière question) : nombre de solutions de f(x) = k pour f(x) = (ax + b)e^(mx). Idée en attente de la session ln (TSA5-41) : ax + b + k ln x a deux solutions.
- **Chez nous** : Même forme que 2491dd75 : le tableau de variations est donné avec ses valeurs exactes, l'élève compte les solutions. Nos trois variations ont des valeurs entières ou des limites abstraites ; celles-ci font lire un minimum écrit avec ln ou e.
- **Modèle** : 2491dd75 TVI : nombre de solutions de f(x) = k (3 var.)
- **Point** : TSPE-430 (et TCOMP-233 : ln et exp y sont au programme)
- **Variations** :
  - f(x) = x − a ln x sur ]0 ; +∞[, a de 3 à 6 : minimum a − a ln a < 0 ; k tiré sous le minimum, égal au minimum ou au-dessus → 0, 1 ou 2 solutions
  - f(x) = (x + b)eˣ sur ℝ, b de −2 à 2 : limite 0 en −∞, minimum −e^(−b−1) ; k sous le minimum, entre le minimum et 0, ou positif → 0, 2 ou 1 solution
- **Réponse** : Nombre de solutions. Erreurs prévues : la branche qui tend vers 0 sans l'atteindre comptée, minimum oublié, k = minimum compté deux fois

### V2 — Continuité lue sur une courbe à deux sauts

- **Recommandation** : 2 variations de 10393ff9
- **Chez eux** : TSA4-10 : courbe continue, à point anguleux, à un saut ou à deux sauts ; écrire les intervalles de continuité (bornes fermées du côté du point plein).
- **Chez nous** : 10393ff9 n'a qu'un saut et une question choix. On ajoute deux sauts, et une question qui fait lire le côté du point plein : un intervalle à saisir, borne ouverte ou fermée jugée.
- **Modèle** : 10393ff9 Continuité lue sur une courbe : saut ou point anguleux (2 var.)
- **Point** : TSPE-425 (et TCOMP-220)
- **Variations** :
  - Deux sauts en a et b (a de −2 à −1, b = a + 3) : les abscisses où f n'est pas continue, deux cases, la plus petite d'abord
  - Même courbe : le plus grand intervalle contenant 0 sur lequel f est continue → [a ; b[ (point plein à gauche)
- **Réponse** : Nombres ; saisie d'un intervalle. Erreurs prévues : ]a ; b[ ou [a ; b], une abscisse oubliée, l'ordonnée au lieu de l'abscisse

### V3 — Code : chiffres répétés puis lettres distinctes

- **Recommandation** : Variation de 0965c56c
- **Chez eux** : TSG1-03 : n chiffres (pouvant se répéter) suivis de p lettres distinctes choisies parmi les L premières de l'alphabet.
- **Chez nous** : Saisie d'un nombre. ed01a843 v3 répète tout, 0965c56c v1 ne répète rien : ici les deux se mélangent, réponse 10ⁿ × L(L − 1)…(L − p + 1).
- **Modèle** : 0965c56c k-uplets d'éléments distincts : codes, bureaux, places, anagrammes (4 var.)
- **Point** : TSPE-309
- **Variations** :
  - n de 2 à 4, p de 2 à 3, L de 5 à 8
- **Réponse** : Nombre. Erreurs prévues : 10ⁿ × Lᵖ, chiffres aussi distincts, somme au lieu du produit

## Idées laissées

### R — Ce que je ne reprends pas

- **Recommandation** : Rien
- **Chez eux** : TSG1-01, 02, 05, 06, 07, 09 (urne, rangements, binôme, somme des C(n, k), CA et bureau, vitrine). TSG1-08 (C(n − 1, k − 1) + C(n − 1, k) = C(?, ?)). TSA4-40 hors dernière question (limites, f′, variations, convexité de (ax + b)e^(mx)). TSA4-32 : valeur approchée à la calculatrice.
- **Chez nous** : Déjà couverts : b500b44e, 67b349ab, 0965c56c, 3aca54e9, dfb727cd, dd23bf2d, ed01a843, 2bae040c, 4a1deda8. TSG1-08 : ef3c495c v1 et 185496e9 ; deux cases de binomial refuseraient à tort C(n, n − k). TSA4-40 : rubriques limites et dérivation, publiées. Valeur approchée : d3ae0f61.

## Questions

### Q1 — N4 : couvrir TSPE-427, alors qu'aucun exercice ne le fait ?

- **Recommandation** : Oui
- **Chez nous** : Ce n'est pas une idée reprise : le relevé de TSA4-41 a montré que ce point n'a aucun modèle. Je le range ici parce que c'est la même rubrique (continuité), et que c'est 4 variations courtes.
- **Point** : TSPE-427
- **Réponse** : Oui = je l'écris dans ce lot ; Non = on le laisse à une autre session

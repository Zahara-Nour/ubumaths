# Fiches de la phase 0 « dérivation » de Terminale (2026-11-23)

Chantier [`idees-tle-derivation`](idees-tle-derivation-progress.md). Copie des fiches de la page à cocher
https://claude.ai/artifact/M7SzozkJJarxg9q1xPNDGE. Validées par David le 2026-11-23 (« je te suis », voir le journal).

## Modèles neufs

### F5 — Tangente à la courbe d'une fonction composée

- **Recommandation** : Nouveau modèle, 3 variations
- **Chez eux** : TSA3-31 : f = uⁿ, eᵘ ou √u (u trinôme), équation réduite de la tangente au point d'abscisse a, fractions irréductibles exigées.
- **Chez nous** : Saisie d'une équation de droite (answerKind « equation », forme réduite exigée). En Tle, aucun modèle de tangente ; ceux de 1re (05387201, 15d3aaa0) n'ont pas de composée. Valeurs construites pour que u(a) et u′(a) soient simples.
- **Modèle** : Nouveau : « Équation de la tangente à la courbe d'une composée »
- **Point** : TSPE-413 (dériver une formule avec composition)
- **Variations** :
  - f(x) = (u(x))ⁿ, n de 2 à 4, u(a) = ±1 ou 2, u′(a) de −3 à 3 non nul, a de −3 à 3
  - f(x) = e^(u(x)) avec u(a) = 0 : tangente y = q(x − a) + 1, q de −4 à 4 non nul
  - f(x) = √(u(x)) avec u(a) = m², m de 1 à 3 : pente q/(2m), fraction irréductible
- **Réponse** : Saisie « y = mx + p »

### F6 — Variations de uⁿ, eᵘ ou √u

- **Recommandation** : Nouveau modèle, 3 variations
- **Chez eux** : TSA3-32 : f = uⁿ, eᵘ ou √u avec u(x) = α(x − x₀)² + k sans racine ; f′(x), puis le tableau de variations à compléter (x₀, signes de f′, f(x₀), flèches).
- **Chez nous** : Tableau de variations à compléter (bloc variation : x₀, signes, f(x₀) et flèches en ?). Les bornes en ±∞ restent vides, comme chez eux : aucune limite à cacher, donc pas besoin de l'outil n° 50. La dérivée de ces fonctions est déjà demandée ailleurs (50feeefd, f52b93c4) : ici, on va jusqu'aux variations. 7f13ca89 ne fait que ln, 7026a36a que la trigonométrie.
- **Modèle** : Nouveau : « Variations d'une fonction uⁿ, eᵘ ou √u »
- **Point** : TSPE-416 (variations d'une fonction construite simplement)
- **Variations** :
  - f(x) = ((x − x₀)² + k)ⁿ, n de 2 à 4, k de 1 à 2, x₀ de −3 à 3 → minimum kⁿ en x₀
  - f(x) = e^(α(x − x₀)² + k), α = ±1, k de −2 à 2 → extremum eᵏ (1 si k = 0)
  - f(x) = √((x − x₀)² + k), k ∈ {1, 4, 9} → minimum √k entier
- **Réponse** : Tableau de variations à compléter

### F7 — Fonction auxiliaire eˣ − (ax + b) et fonction homographique

- **Recommandation** : Nouveau modèle, 2 variations
- **Chez eux** : Idées en attente des rubriques suites et limites : TSA2-52 (fonction auxiliaire g(x) = eˣ − (ax + b), son minimum, son signe), TSA2-34 et TSA1-44 (variations de (ax + b)/(cx + d)).
- **Chez nous** : Tableau de variations à compléter, comme F6. Pour g : x₀ = ln a (a de 2 à 5, réponse exacte ln a), minimum a − a ln a − b. Pour l'homographique : double barre en −d/c, seules les flèches sont à compléter (signe de ad − bc). Les limites de l'homographique sont déjà demandées dans d6eaa761.
- **Modèle** : Nouveau : « Variations d'une fonction auxiliaire ou homographique »
- **Point** : TSPE-416
- **Variations** :
  - g(x) = eˣ − ax − b, a de 2 à 5, b de −3 à 3 → x₀ = ln a, minimum a − a ln a − b
  - f(x) = (ax + b)/(cx + d), coefficients de −5 à 5, ad − bc ≠ 0 → flèches des deux intervalles
- **Réponse** : Tableau de variations à compléter

### F11 — Signe de f′(a) et de f″(a) lu sur la courbe de f

- **Recommandation** : Nouveau modèle, 2 variations
- **Chez eux** : TSA3-43 : le signe de f(a), f′(b) ou f″(c) (positif, négatif, nul), lu sur une courbe avec tangentes tracées. TSA3-42 : signes de f, f′, f″ comparés sur un intervalle (sujets de bac).
- **Chez nous** : Un choix « positif / négatif / nul », une seule question par variation. Courbe de degré 3 ou sinusoïdale (bloc courbe), tangente tracée au point demandé. Le signe de f(a) seul est du programme de 2de : je ne le reprends pas.
- **Modèle** : Nouveau : « Signe de f′(a) ou de f″(a) lu sur la courbe de f »
- **Point** : TSPE-419 (lire la convexité sur la courbe de f)
- **Variations** :
  - Signe de f′(b) : b dans une montée, une descente, ou à un sommet (nul)
  - Signe de f″(c) : c dans une partie convexe, concave, ou au point d'inflexion (nul), tangente tracée
- **Réponse** : Case choix (positif, négatif, nul)

### F12 — Reconnaître une courbe parmi quatre : f, f′ ou f″

- **Recommandation** : Nouveau modèle (2 var.) + 1 variation de 37ce7759
- **Chez eux** : TSA3-46 : une courbe donnée (f, f′ ou f″), quatre courbes proposées ; distracteurs : l'opposée, la bonne décalée de 1, la mauvaise dérivée (f′ au lieu de f″), une constante.
- **Chez nous** : Case choix à quatre courbes (bloc courbe dans le choix, comme 21840f6c). f ↔ f′ est de 1re : je ne garde que ce qui touche f″. Un modèle n'a qu'un point : les deux sens « f″ donnée » vont au nouveau modèle (TSPE-590), le sens « f donnée → f″ » devient une variation de 37ce7759 (TSPE-419). Voir Q1.
- **Modèle** : Nouveau : « Reconnaître une courbe à partir de celle de f″ » ; et 37ce7759
- **Point** : TSPE-590 ; TSPE-419 pour la variation de 37ce7759
- **Variations** :
  - f″ affine donnée → laquelle peut être la courbe de f (cubique) ?
  - f″ affine donnée → laquelle peut être la courbe de f′ (parabole) ?
  - (37ce7759) courbe de f (cubique) donnée → laquelle peut être la courbe de f″ ?
- **Réponse** : Case choix à 4 courbes

## Variations de modèles publiés

### F1 — e^(ax² + bx + c) et (ax + b)e^(mx)

- **Recommandation** : 2 variations de 50feeefd
- **Chez eux** : TSA3-26 : e^(ax + b), e^(ax² + bx + c) (a parfois décimal), (ax + b)e^(mx) avec la dérivée sous forme factorisée.
- **Chez nous** : Même saisie. 50feeefd n'a que e^(ax² + b) ; 496f958d (1re) fait (ax + b)eˣ, m = 1 seulement. Forme factorisée exigée par requiredForm, pas par une comparaison de texte.
- **Modèle** : 50feeefd Dérivée de eᵘ, ln u et u² (5 var.)
- **Point** : TSPE-413
- **Variations** :
  - e^(ax² + bx + c), a de −3 à 3 non nul, b de −5 à 5 non nul, c de −5 à 5 → (2ax + b)e^(…)
  - (ax + b)e^(mx), a, b de −5 à 5, m ∈ {−3, −2, −1, 2, 3} → (max + a + mb)e^(mx), factorisée
- **Réponse** : Saisie d'une expression

### F2 — uⁿ et √u avec u de degré 3, ou u exponentielle

- **Recommandation** : 2 variations de f52b93c4
- **Chez eux** : TSA3-30 : uⁿ, eᵘ, √u avec u polynôme de 2 ou 3 monômes jusqu'au degré 6, ou u = αe^(kx) + b ; forme n·u′·uⁿ⁻¹ imposée.
- **Chez nous** : Même saisie, jugée par équivalence (pas de forme imposée : la dérivée développée ou non est juste). Nos variations n'ont que des u affines ou x² + c.
- **Modèle** : f52b93c4 Dérivée d'une composée : √u, uⁿ, cos u, sin u (4 var.)
- **Point** : TSPE-413
- **Variations** :
  - (ax³ + bx)ⁿ, a de 1 à 3, b de −5 à 5 non nul, n de 2 à 4
  - √(αe^(kx) + b), α de 1 à 3, k ∈ {−2, −1, 1, 2}, b de 1 à 5 → αk·e^(kx)/(2√(…))
- **Réponse** : Saisie d'une expression

### F8 — Convexité lue sur une courbe de f′ à deux sommets

- **Recommandation** : Variation de e3e19d28
- **Chez eux** : TSA3-41 et 42 : courbe de f′ cubique (deux tangentes horizontales), trois intervalles ; f convexe là où f′ croît.
- **Chez nous** : Saisie de l'intervalle (answerKind « intervalles »), plutôt que leur QCM. e3e19d28 n'a qu'une parabole (un seul changement).
- **Modèle** : e3e19d28 Convexité : lecture sur la courbe de f′ (1 var.)
- **Point** : TSPE-588
- **Variations** :
  - f′(x) = ±0,5((x − h)³ − 3(x − h)), h de −2 à 2 → f concave (ou convexe) sur [h − 1 ; h + 1]
- **Réponse** : Saisie d'un intervalle

### F9 — Convexité lue sur une parabole f″

- **Recommandation** : Variation de 225c8682
- **Chez eux** : TSA3-41 : f″(x) = ±(x − a)(x − b) ; convexité sur [a ; b] ou à l'extérieur.
- **Chez nous** : Saisie d'un ensemble en intervalles (une réunion quand c'est l'extérieur). 225c8682 n'a qu'une droite.
- **Modèle** : 225c8682 Convexité : lecture sur la courbe de f″ (1 var.)
- **Point** : TSPE-590
- **Variations** :
  - f″(x) = ±0,5(x − a)(x − b), a < b entiers de −3 à 3 → [a ; b] ou ]−∞ ; a] ∪ [b ; +∞[
- **Réponse** : Saisie d'intervalles

### F10 — Convexité lue sur le tableau de variations de f′

- **Recommandation** : Variation de cfd13223
- **Chez eux** : TSA3-42 (sujet de bac) : tableau de variations de f′ sur [−2 ; 2], QCM « f concave sur [−2 ; 0] », etc.
- **Chez nous** : Tableau de variations de f′ affiché (bloc variation), saisie du plus grand intervalle où f est convexe. cfd13223 reste abstrait (« f′ croissante ⇒ … »).
- **Modèle** : cfd13223 Convexité et croissance de la dérivée (3 var.)
- **Point** : TSPE-585
- **Variations** :
  - f′ décroît puis croît (ou l'inverse) sur [c − 3 ; c + 3], changement en c de −2 à 2 → [c ; c + 3] ou [c − 3 ; c]
- **Réponse** : Saisie d'un intervalle

### F13 — Intervalle de concavité sur une courbe à deux points d'inflexion

- **Recommandation** : Variation de 37ce7759
- **Chez eux** : TSA3-47 : courbe sinusoïdale (0, 1 ou 2 inflexions) sur un intervalle borné, tangentes aux inflexions tracées ; donner un intervalle convexe, un concave.
- **Chez nous** : Saisie de l'intervalle (37ce7759 est un QCM sur une cubique). Courbe à deux inflexions entières, donc trois morceaux : l'élève donne celui du milieu.
- **Modèle** : 37ce7759 Convexité : lecture sur la courbe de f (1 var.)
- **Point** : TSPE-419
- **Variations** :
  - f(x) = A sin(π(x − c)/3) + k sur [c − 2 ; c + 5], inflexions en c et c + 3 → f concave (ou convexe) sur [c ; c + 3]
- **Réponse** : Saisie d'un intervalle

### F14 — Combien de points d'inflexion sur la courbe de f ?

- **Recommandation** : Variation de 98f9d4b2
- **Chez eux** : TSA3-47 : nombre de points d'inflexion (0, 1 ou 2) d'une courbe sinusoïdale.
- **Chez nous** : Saisie d'un nombre. 98f9d4b2 donne toujours une cubique (une inflexion) et propose l'abscisse en QCM ; ici, le nombre varie, 0 compris (un arc qui ne change pas de courbure).
- **Modèle** : 98f9d4b2 Point d'inflexion : lecture graphique (1 var.)
- **Point** : TSPE-587
- **Variations** :
  - Arc de cosinus (0), sinus sur une demi-période (1), sinus sur une période (2), fenêtre et décalages tirés
- **Réponse** : Saisie d'un nombre

### F15 — Position de la courbe par rapport à une tangente tracée

- **Recommandation** : 2 variations de eeb72d3a
- **Chez eux** : TSA3-47 : la courbe est au-dessus, en dessous de la tangente en a, ou la traverse. TSA3-48 : 2 à 4 tangentes tracées, « au voisinage de a, f est convexe ou concave ».
- **Chez nous** : Case choix à trois réponses, jamais deux (pas de pile ou face) : « au-dessus », « en dessous », « la traverse ». eeb72d3a pose la propriété sans courbe ; ici on la lit sur une courbe tracée.
- **Modèle** : eeb72d3a Convexité : position par rapport aux tangentes (3 var.)
- **Point** : TSPE-411
- **Variations** :
  - Courbe de f et tangente tracée en a → position (au-dessus, en dessous, la traverse au point d'inflexion)
  - Courbe de f et tangente en a → au voisinage de a, f est convexe, concave, ou a un point d'inflexion en a
- **Réponse** : Case choix (3 propositions)

### F16 — Ordonnée du point d'inflexion d'un polynôme de degré 3

- **Recommandation** : Variation de 08f9ad7b
- **Chez eux** : TSA3-44 : coordonnées du point d'inflexion (deux champs), valeurs entières construites.
- **Chez nous** : Notre format n'a pas de case « point (x ; y) » ; 08f9ad7b demande déjà l'abscisse, la variation demande l'ordonnée (calcul de f(x₀) en plus).
- **Modèle** : 08f9ad7b Abscisse d'un point d'inflexion (3 var.)
- **Point** : TSPE-412
- **Variations** :
  - f(x) = ±(x³ − 3x₀x² + 3(x₀² − e²)x) + d, x₀ de −2 à 2, e de 1 à 2, d de −5 à 5 → f(x₀) entier
- **Réponse** : Saisie d'un nombre

### F17 — Convexité de (x² + bx + c)eˣ

- **Recommandation** : Variation de c4775a3a
- **Chez eux** : TSA3-45 : f(x) = P(x)eˣ, f″ = a(x − r₁)(x − r₂)eˣ, deux points d'inflexion, convexité sur 3 intervalles (sujet rédigé).
- **Chez nous** : Saisie de l'intervalle de concavité [r₁ ; r₂] ; l'élève calcule f″ (c4775a3a v3 la donne, avec un seul changement de signe).
- **Modèle** : c4775a3a Intervalle de convexité ou de concavité par le signe de f″ (4 var.)
- **Point** : TSPE-420
- **Variations** :
  - f(x) = (x² + bx + c)eˣ construit pour f″(x) = (x − r₁)(x − r₂)eˣ, r₁ < r₂ entiers de −3 à 3 → concave sur [r₁ ; r₂]
- **Réponse** : Saisie d'un intervalle

### F18 — Écrire l'inégalité que donne la convexité

- **Recommandation** : 2 variations de e814175b
- **Chez eux** : TSA3-49 : tangente en x₀, convexité (f″ de signe constant), puis f(x) ⩾ tangente pour tout x (sujet rédigé).
- **Chez nous** : Une case : « pour tout réel x, f(x) ⩾ … » (ou ⩽), à compléter par l'expression de la tangente. e814175b propose des inégalités toutes faites (QCM) sur exp, ln, carré, racine. Voir Q2 pour le sens de l'inégalité.
- **Modèle** : e814175b Inégalité déduite de la convexité (4 var.)
- **Point** : TSPE-417
- **Variations** :
  - f(x) = a·eˣ + bx² + cx + d (a, b de même signe) en x₀ = 0 → tangente (a + c)x + a + d
  - f(x) = ax⁴ + bx² + cx + d (a, b de même signe), x₀ ∈ {−2, −1, 1, 2}
- **Réponse** : Saisie d'une expression

## Idées laissées

### F19 — Ce que je ne reprends pas

- **Recommandation** : Rien
- **Chez eux** : TSA3-50 : étude complète de (ax + b)e⁻ˣ + cx + d. TSA3-42, famille 3 : nombre d'inflexions lu sur f″ avec une racine double. TSA3-46 : f ↔ f′. TCA7-30 à 32 : reprises de TSA3-30 à 32.
- **Chez nous** : TSA3-50 est couvert par morceaux (limites, 08f9ad7b v2, c4775a3a). 5ffe398a v1 a déjà la racine double qui piège. f ↔ f′ est du programme de 1re (782bf7f8, 17f64f63). Les TCA7 n'apportent rien de plus.
- **Modèle** : —
- **Point** : —
- **Réponse** : —

## Questions

### Q1 — F12 : un modèle et une variation, ou deux modèles ?

- **Recommandation** : Un modèle + une variation de 37ce7759
- **Chez eux** : TSA3-46 mélange six sens de lecture dans un même exercice.
- **Chez nous** : Un modèle n'a qu'un point. « f″ donnée → f ou f′ » lit sur f″ (TSPE-590) ; « f donnée → f″ » lit sur f (TSPE-419). Je range le second sens dans 37ce7759, qui est déjà sur TSPE-419. Autre choix : un second petit modèle neuf pour ce sens.
- **Modèle** : —
- **Point** : TSPE-590, TSPE-419
- **Réponse** : Oui = un modèle + 37ce7759 ; Autrement = deux modèles

### Q2 — F18 : le sens de l'inégalité est-il donné ?

- **Recommandation** : Donné (⩾ ou ⩽ écrit dans l'énoncé)
- **Chez eux** : TSA3-49 donne l'inégalité à démontrer.
- **Chez nous** : Avec « f(x) ⩾ … » écrit, l'élève sait déjà que f est convexe ; il lui reste la tangente. Pour qu'il trouve le sens lui-même, il faudrait deux cases (le sens, puis la tangente), contre la règle « case unique ». Je recommande le sens donné : la convexité se travaille déjà dans c4775a3a et e814175b.
- **Modèle** : —
- **Point** : TSPE-417
- **Réponse** : Oui = sens donné ; Autrement = deux cases

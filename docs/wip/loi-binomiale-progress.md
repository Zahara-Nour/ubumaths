# Loi binomiale (Terminale, manche 11) — progression

Décisions Q134-Q140 (`outils-statistiques-v2-progress.md`). Programme vérifié sur Éduscol
(spécialité terminale) : P(X = k), P(X ⩽ k), P(k ⩽ X ⩽ k′), intervalle I sans méthode imposée,
seuil (surréservation). Spec PR (a) validée le 2026-10-03.

## PR (a) — `X ~ B(n ; p)` dans le bloc ```loi

- [x] `statistics/binomial.ts` : probabilités EXACTES en entiers (dénominateur commun b^n),
      arrondi exact demi vers le haut (`roundExact`), E / V / σ par les formules
- [x] Parseur : `X ~ B(n ; p)` / `X suit B(n ; p)`, n de 1 à 1 000, p entre 0 et 1 ; `arrondi:`,
      `probabilités:` (bornes entières) ; seule, sans `X =` / `P =` ; avertissement > 30 valeurs
- [x] Scène : tableau arrondi, titre « Loi de X : B(10 ; 0,3) », indicateurs puis probabilités ;
      vertical quand la ligne serait trop large (estimation valeurs × caractères, mesurée sur la
      fiche), pas de tableau au-delà de 30 valeurs ; écran et Typst ; filet anglais
- [x] Fiche compilée et vérifiée à la main (B(10 ; 0,3), B(5 ; 1/2), B(100 ; 0,5))
- [x] Revue : aucune erreur mathématique ; E et V en décimal exact si p est décimal ; notation anglaise B(10, 0.3) ; messages (p à plus de 15 chiffres, bornes inversées, `masquer:` sans tableau) ; pas d’arrondi des cases quand le tableau est caché ; tests (0,513 exact, horizontal, p = 0 / 1, 1/0, 1e3, bornes)
- [x] Revue : pas d’injection possible ; « 30 % » et « 1 / 2 » acceptés ; minuscule et option sans valeur expliquées ; doc de `exampleSetup` (décor vide)
- [ ] PR, CI, merge

## PR (b) — `diagramme:`, `intervalle:`, `seuil:`, simulation

Spec validée le 2026-10-03. ⚠️ Les exemples de la spec ([1 ; 6], k = 6) étaient faux : les
valeurs exactes (Python) pour B(10 ; 0,3) sont I = [0 ; 6] et k = 5.

- [x] `binomialInterval` (α/2 de chaque côté, exact) et `binomialThreshold` (plus petit ou plus
      grand k selon le sens de variation) dans `statistics/binomial.ts`
- [x] Parseur : `intervalle: 0,95 | 95 % | α = 0,05`, `seuil: P(X > k) ⩽ 0,05`, `diagramme: oui` ;
      simulation de B(n ; p) (n ⩽ 30), probabilités exactes passées sans texte
- [x] Scène : lignes intervalle + règle, seuil (ou « aucun k ») ; diagramme en bâtons, I en couleur,
      hors de I en gris ; axe en probabilités (l'axe des barres montait à 1 : vu sur la fiche),
      numéros à plat ; écran, Typst, anglais
- [x] Fiche compilée et regardée
- [x] Revue : aucune erreur mathématique ; niveau décimal exigé ; P(X ∈ I) avec au moins les décimales du niveau ; α du seuil dans ]0 ; 1[ ; avertissement qui cite le diagramme ; simulation n ⩽ 29 ; description « P(X = 3) ≈ 0,267 » ; en-tête Typst en maths en bloc ; tests des 8 combinaisons de seuil, d’autres niveaux, du gris peint
- [x] Revue : pas d’injection possible ; « 30 % » et « 1 / 2 » acceptés ; minuscule et option sans valeur expliquées ; doc de `exampleSetup` (décor vide)
- [ ] PR, CI, merge

## PR (c) — atelier `.binomiale`

Q142 (David, 2026-10-03) : la commande AFFICHE la loi, sans créer de liste (des listes décimales
perdraient l'exactitude : l'action « Loi » refuserait B(20 ; 0,3)).

- [x] `atelier/binomial.ts` : `.binomiale X 10 0,3 [P(X ⩽ 4) ; intervalle 0,95 ; seuil …]` écrit
      le bloc ```loi et en montre la scène (mêmes textes, mêmes valeurs) ; erreurs du bloc sans
      « Ligne N : » ; catalogue (décor vide déclaré, Q79)
- [x] Tests `binomiale.test.ts` (8)
- [x] Revue : pas d’injection possible ; « 30 % » et « 1 / 2 » acceptés ; minuscule et option sans valeur expliquées ; doc de `exampleSetup` (décor vide)
- [ ] PR, CI, merge

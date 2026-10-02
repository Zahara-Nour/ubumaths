# v2 lot 1, PR (c) — `.fréquence` et `.échantillons`

Branche `feat/stats-frequence-echantillons`. Décisions Q74-Q76, Q80-Q83.

- `.fréquence L M n` (n ≤ 10 000) : moyenne des tirages selon n, courbe + droite y = E(X)
  (`MeanScene`, au plus 500 points). `.échantillons L M N n` (N, n ≤ 1 000) : μ, σ, 2σ/√n,
  proportion ; histogramme des moyennes, classes de largeur (2σ/√n)/2 alignées sur μ, celles de
  μ ± 2σ/√n en couleur. Graphique sous la ligne de la vue Calcul (Q80) ; aucune liste créée.
- `StatChart.svelte` accepte une `scene` déjà construite ; `simulation-scene.ts` ; rendu Typst
  `meanTypst` (aucun bloc ne le produit). `.simuler` propose les deux commandes (Q83).
- Garde du catalogue : « dessine un graphique » compte comme montrer ce que fait la commande.
- Revue : moyenne pile sur μ + 2σ/√n grisée alors que comptée par le texte → classes fermées du
  côté de μ ; `.fréquence … 1` produisait des NaN → cadre jusqu'à 2 ; singulier/pluriel, 100 %
  seulement si tous, barres grises opaques (contraste), classes listées dans la description.

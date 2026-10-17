# Plan — « Applications de la loi géométrique » (T_COMP)

Dossier de sortie : `.../scratchpad/geom/applications/`. Catégorie `application`.
Clés en MAJUSCULES. 3 sections, 6 exercices. Valeurs « ≈ » : calculer exactement, arrondir à 10⁻⁴, asserter.
Chaque exercice commence par une phrase de mise en situation ; la version guidée fait justifier
explicitement la loi géométrique (épreuve de Bernoulli, succès, p, répétition identique et indépendante,
X rang du premier succès).
Illustrations : 3 au plus — CLES, TICKETS, AMPOULE — SVG simple, sans réponse.

## s1 « Modéliser et reconnaître » (en « Modelling and recognising »)

**CLES — « Le trousseau de clés »** (en « The bunch of keys ») — guided + autonomous
Le gardien d'un gymnase a un trousseau de 5 clés dont une seule ouvre la porte. Distrait, il essaie une clé au hasard, et s'il échoue il la remet dans le trousseau et recommence au hasard parmi les 5. R = rang de l'essai qui ouvre la porte.

1. Justifier que R suit $\mathcal{G}(1/5)$.
2. P(R = 1) = 0.2 ; P(R = 3) = 0.8² × 0.2 = 0.128 ; P(R ⩽ 3) = 1 − 0.8³ = 61/125 = 0.488.
3. P(R > 5) = 0.8⁵ = 0.32768 ≈ 0.3277 : il a plus de 30 % de risque de devoir faire plus de 5 essais.
4. E(R) = 5.
5. Sa collègue, méthodique, met de côté chaque clé essayée. On admet que son nombre d'essais M suit la loi uniforme sur {1, 2, 3, 4, 5} : E(M) = 3. Comparer : la méthode méthodique fait gagner 2 essais en moyenne, et ne dépasse jamais 5.
   Autonome : mêmes données ; « Combien d'essais le gardien fait-il en moyenne ? Quelle est la probabilité qu'il lui en faille plus de 5 ? Comparer avec la méthode de sa collègue (loi uniforme admise). »

**APPELS — « Le centre d'appels »** (en « The call centre »)
Une téléconseillère appelle des clients ; chaque appel aboutit à une vente avec probabilité 0.3, indépendamment des autres.

1. Elle appelle jusqu'à sa première vente ; X = rang de l'appel. Loi de X : $\mathcal{G}(0.3)$. P(X ⩽ 3) = 1 − 0.7³ = 0.657 ; E(X) = 10/3 ≈ 3.33.
2. Le lendemain, elle passe exactement 20 appels ; Y = nombre de ventes. Loi de Y : $\mathcal{B}(20\,;0.3)$ ; E(Y) = 6 ; P(Y ⩾ 5) = 1 − P(Y ⩽ 4) ≈ 0.7625 (calculatrice).
3. Expliquer en une phrase ce qui distingue les deux situations (nombre d'épreuves fixé et on compte les succès / on attend le premier succès).

## s2 « Attente, coût et seuil » (en « Waiting, cost and threshold »)

**TICKETS — « Le ticket à gratter »** (en « The scratch card ») — guided + autonomous
Un ticket à gratter coûte 2 €. On admet que chaque ticket est gagnant avec probabilité 1/8, indépendamment des autres (très grand nombre de tickets). Léa achète des tickets un par un jusqu'au premier ticket gagnant ; T = nombre de tickets achetés.

1. T suit $\mathcal{G}(1/8)$. P(T = 1) = 0.125 ; P(T > 10) = (7/8)¹⁰ ≈ 0.2631.
2. E(T) = 8 ; dépense moyenne avant le premier gain : 2 × 8 = 16 € (linéarité de 1re : dépense D = 2T).
3. Combien de tickets faut-il acheter (en continuant même après un gain) pour que la probabilité d'avoir au moins un ticket gagnant soit au moins 0.95 ? 1 − (7/8)ⁿ ⩾ 0.95 ⇔ n ⩾ ln 0.05 / ln(7/8) ≈ 22.43 → 23 tickets, soit 46 € (vérifier (7/8)²² ≈ 0.0530 et (7/8)²³ ≈ 0.0464).
   Autonome : « Combien Léa dépense-t-elle en moyenne avant son premier ticket gagnant ? Combien de tickets faut-il pour être sûr à 95 % d'en avoir au moins un gagnant ? »

**JEU — « Le jeu du six »** (en « The six game ») — guided + autonomous
Un joueur paie 1 € pour chaque lancer d'un dé équilibré et lance jusqu'à obtenir un 6 ; il reçoit alors 5 €. N = nombre de lancers, G = gain algébrique = 5 − N.

1. N suit $\mathcal{G}(1/6)$ ; E(N) = 6 ; E(G) = 5 − 6 = −1 : le jeu est défavorable au joueur.
2. Probabilité que le joueur gagne de l'argent : G > 0 ⇔ N ⩽ 4 ; P(N ⩽ 4) = 1 − (5/6)⁴ = 671/1296 ≈ 0.5177 : il gagne plus d'une fois sur deux, et pourtant il perd en moyenne (les rares parties très longues coûtent cher).
3. Quelle somme r faut-il rendre pour que le jeu soit équitable ? E(G) = r − 6 = 0 → r = 6 €.
   Autonome : « Le jeu est-il favorable au joueur ? Le joueur gagne-t-il de l'argent plus souvent qu'il n'en perd ? Quelle somme faudrait-il rendre pour que le jeu soit équitable ? »

## s3 « Une loi sans mémoire » (en « A memoryless distribution »)

**AMPOULE — « La lampe de l'aquarium »** (en « The aquarium lamp ») — guided + autonomous
On admet que, chaque jour, une lampe de type LED tombe en panne avec probabilité 0.01, indépendamment des jours précédents et de son âge. J = numéro du jour de la panne.

1. J suit $\mathcal{G}(0.01)$ ; E(J) = 100 jours.
2. P(J > 30) = 0.99³⁰ ≈ 0.7397.
3. La lampe fonctionne depuis 50 jours. Probabilité qu'elle fonctionne encore au moins 30 jours de plus : $P_{J>50}(J>80)$ = P(J > 30) ≈ 0.7397 (absence de mémoire).
4. À partir de combien de jours la probabilité que la lampe soit déjà tombée en panne dépasse-t-elle 0.5 ? 1 − 0.99ⁿ ⩾ 0.5 ⇔ n ⩾ ln 0.5 / ln 0.99 ≈ 68.97 → 69 jours.
5. Critique du modèle (une phrase) : une ampoule à filament s'use ; ce modèle sans mémoire convient à un composant qui ne vieillit pas.
   Autonome : questions 2, 3, 4 condensées.

**DE6 — « Le 6 se fait attendre »** (en « Waiting for a six »)
Hugo lance un dé équilibré. Après 8 lancers sans 6, il affirme : « Le 6 va forcément sortir bientôt, il est en retard ! » N = rang du premier 6.

1. N suit $\mathcal{G}(1/6)$ ; P(N > 8) = (5/6)⁸ ≈ 0.2326.
2. $P_{N>8}(N=9)$ = P(N = 1) = 1/6 : le 9ᵉ lancer n'a pas plus de chances de donner 6 que le premier.
3. $P_{N>8}(N\leqslant 10)$ = P(N ⩽ 2) = 11/36 ≈ 0.3056.
4. Nombre moyen de lancers supplémentaires à prévoir : toujours 6 (absence de mémoire). Répondre à Hugo.

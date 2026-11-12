Les solutions de ~f(x)=g(x)~ sont les abscisses des points communs aux deux droites ; ~g(x)<f(x)~ pour les abscisses où la droite $\mathcal{D}_g$ est strictement en dessous de la droite $\mathcal{D}_f$. Le calcul confirme la lecture.

1.
   a. Chaque agence demande son forfait, plus le prix des kilomètres parcourus :

      ~~f(x)=0.2x+50~~

      ~~g(x)=0.3x+30~~

   b. ~f(x)~ et ~g(x)~ sont de la forme ~mx+p~ : ~f~ et ~g~ sont affines. Leurs ordonnées à l'origine, ~50~ et ~30~, sont les forfaits : le prix payé avant d'avoir roulé.
2.
   a. Les droites se coupent au point de coordonnées $(200\,;90)$ : pour ~200~ km, les deux agences demandent le même prix, $90$ €.

      ```courbe
      x: 0 ; 400
      y: 0 ; 160
      grille: 50 ; 10
      f(x) = 0.2*x+50 sur [0 ; 400]   bleu   nom=\mathcal{D}_f
      g(x) = 0.3*x+30 sur [0 ; 400]   orange   nom=\mathcal{D}_g
      points: I(200 ; 90)
      axes: x = Distance (km) ; y = Prix (€)
      taille: grande
      description: Les droites D_f (bleue) et D_g (orange) se coupent au point I de coordonnées (200 ; 90) ; à gauche de I, la droite orange est en dessous de la bleue ; à droite de I, elle est au-dessus.
      ```

   b. Pour ~150~ km, $\mathcal{D}_g$ est en dessous de $\mathcal{D}_f$ : l'agence B est la moins chère.

      Pour ~350~ km, $\mathcal{D}_f$ est en dessous de $\mathcal{D}_g$ : l'agence A est la moins chère.

   c. $\mathcal{D}_g$ est strictement en dessous de $\mathcal{D}_f$ à gauche du point commun : l'agence B est strictement moins chère pour les distances de l'intervalle $[0\,;200[$.
3.
   a. On résout ~f(x)=g(x)~ :

      ~~0.2x+50=0.3x+30~~

      ~~20=0.1x~~

      ~~x=200~~

      et ~f(200)=0.2*200+50=40+50=90~. On retrouve le point $(200\,;90)$.

   b. Pour ~150~ km : ~f(150)=30+50=80~ et ~g(150)=45+30=75~. L'agence B est moins chère, de $5$ €.

      Pour ~350~ km : ~f(350)=70+50=120~ et ~g(350)=105+30=135~. L'agence A est moins chère, de $15$ €.

   c. On résout ~g(x)<f(x)~ :

      ~~0.3x+30<0.2x+50~~

      ~~0.1x<20~~

      ~~x<200~~

      Avec $0\leqslant x\leqslant 400$ : $S=[0\,;200[$. On retrouve la lecture graphique.

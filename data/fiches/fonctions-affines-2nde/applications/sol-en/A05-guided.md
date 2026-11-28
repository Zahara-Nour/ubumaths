The solutions of ~f(x)=g(x)~ are the x-coordinates of the points the two lines have in common; ~g(x)<f(x)~ for the x-values where the line $\mathcal{D}_g$ is strictly below the line $\mathcal{D}_f$. Calculation confirms the reading.

1.
   a. Each company charges its fixed charge, plus the price of the kilometres travelled:

      ~~f(x)=0.2x+50~~

      ~~g(x)=0.3x+30~~

   b. ~f(x)~ and ~g(x)~ have the form ~mx+p~: ~f~ and ~g~ are affine. Their y-intercepts, ~50~ and ~30~, are the fixed charges: the price paid before driving at all.
2.
   a. The lines meet at the point with coordinates $(200\,;90)$: for ~200~ km, both companies charge the same price, €$90$.

      ```courbe
      x: 0 ; 400
      y: 0 ; 160
      grille: 50 ; 10
      f(x) = 0.2*x+50 sur [0 ; 400]   bleu   nom=\mathcal{D}_f
      g(x) = 0.3*x+30 sur [0 ; 400]   orange   nom=\mathcal{D}_g
      points: I(200 ; 90)
      axes: x = Distance (km) ; y = Price (€)
      taille: grande
      description: The lines D_f (blue) and D_g (orange) meet at the point I with coordinates (200 ; 90); to the left of I, the orange line is below the blue one; to the right of I, it is above.
      ```

   b. For ~150~ km, $\mathcal{D}_g$ is below $\mathcal{D}_f$: company B is cheaper.

      For ~350~ km, $\mathcal{D}_f$ is below $\mathcal{D}_g$: company A is cheaper.

   c. $\mathcal{D}_g$ is strictly below $\mathcal{D}_f$ to the left of the meeting point: company B is strictly cheaper for distances in the interval $[0\,;200[$.
3.
   a. Solve ~f(x)=g(x)~:

      ~~0.2x+50=0.3x+30~~

      ~~20=0.1x~~

      ~~x=200~~

      and ~f(200)=0.2*200+50=40+50=90~. We find the point $(200\,;90)$ again.

   b. For ~150~ km: ~f(150)=30+50=80~ and ~g(150)=45+30=75~. Company B is cheaper, by €$5$.

      For ~350~ km: ~f(350)=70+50=120~ and ~g(350)=105+30=135~. Company A is cheaper, by €$15$.

   c. Solve ~g(x)<f(x)~:

      ~~0.3x+30<0.2x+50~~

      ~~0.1x<20~~

      ~~x<200~~

      With $0\leqslant x\leqslant 400$: $S=[0\,;200[$. This matches the graphical reading.

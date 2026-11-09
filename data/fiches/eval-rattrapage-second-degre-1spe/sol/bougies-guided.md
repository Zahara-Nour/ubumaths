1. La recette est le prix de vente multiplié par le nombre de bougies vendues : $R(x)=30x$, avec $0\leqslant x\leqslant50$.
   Le bénéfice est la recette moins le coût : $B(x)=30x-\left(0{,}5x^2+6x+160\right)=-0{,}5x^2+24x-160$.
2. $-0{,}5(x-8)(x-40)=-0{,}5\left(x^2-40x-8x+320\right)=-0{,}5\left(x^2-48x+320\right)=-0{,}5x^2+24x-160=B(x)$.
3. Les racines de ~B~ sont ~8~ et ~40~, et le coefficient $-0{,}5$ est négatif : ~B(x)~ est du signe de $-0{,}5$ (négatif) à l'extérieur des racines, et positif entre elles.

   ```variation
   variable: x
   domain: 0, 8, 40, 50

   sign: B(x)
     0,8: -
     8: z
     8,40: +
     40: z
     40,50: -
   ```

   L'artisane réalise un bénéfice lorsque $B(x)>0$, c'est-à-dire pour **plus de 8 et moins de 40 bougies** (de 9 à 39 bougies par jour).
4. Le coefficient $-0{,}5$ est négatif : ~B~ admet un maximum en $\alpha=-\dfrac{24}{2\times(-0{,}5)}=24$, qui appartient bien à $[0~;~50]$ (c'est aussi le milieu des racines 8 et 40).
   $B(24)=-0{,}5\times576+24\times24-160=-288+576-160=128$.
   Le bénéfice est maximal pour **24 bougies** ; il vaut alors **128 €**.

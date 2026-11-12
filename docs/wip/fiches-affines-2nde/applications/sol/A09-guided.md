Une fonction affine ~f(x)=mx+p~ a pour coefficient directeur son taux d'accroissement $m=\dfrac{f(b)-f(a)}{b-a}$. Si ~m<0~, elle est décroissante et ~f(x)~ est positif, puis négatif, de part et d'autre de la valeur qui l'annule.

1.  a. Taux d'accroissement entre ~-1~ et ~2~ :

    ~~m={f(2)-f(-1)}/{2-(-1)}={-3-6}/3={-9}/3=-3~~

    b. ~f(-1)=6~ s'écrit ~-3*(-1)+p=6~, soit ~3+p=6~, donc ~p=3~.

    ~~f(x)=-3x+3~~

    Vérification : ~f(2)=-6+3=-3~.

2.  ~m=-3<0~ : ~f~ est décroissante sur $\mathbb{R}$.
3.  a. On résout ~f(x)=0~ :

    ~~-3x+3=0~~

    ~~-3x=-3~~

    ~~x=1~~

    $S=\{1\}$

    b. ~f~ est décroissante et s'annule en ~1~ : ~f(x)~ est positif avant ~1~, négatif après.

    ```variation
    variable: x
    domain: -inf, 1, +inf

    sign: f(x)
      -inf,1: +
      1: z
      1,+inf: -
    ```

4.  a. On place $A(-1\,;6)$ et $B(2\,;-3)$, puis on trace la droite $(AB)$. Elle passe aussi par $C(1\,;0)$ et par le point $(0\,;3)$ de l'axe des ordonnées.

    ```courbe
    x: -3 ; 4
    y: -7 ; 10
    grille: 1 ; 1
    f(x) = -3*x+3 sur [-2 ; 3]   bleu   nom=\mathcal{D}_f
    points: A(-1 ; 6), B(2 ; -3), C(1 ; 0)
    taille: moyenne
    description: La droite D_f descend de gauche à droite ; elle passe par A(-1 ; 6), coupe l'axe des ordonnées en 3, coupe l'axe des abscisses en C(1 ; 0) et passe par B(2 ; -3).
    ```

    b. $\mathcal{D}_f$ descend quand on la parcourt de gauche à droite : ~f~ est décroissante.

    $\mathcal{D}_f$ coupe l'axe des abscisses au point $C(1\,;0)$. Pour ~x<1~, la droite est au-dessus de l'axe des abscisses : ~f(x)>0~. Pour ~x>1~, elle est en dessous : ~f(x)<0~. On retrouve le tableau de signes.

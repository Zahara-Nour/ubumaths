An expression written in another form may hide an affine function: we expand, simplify, then check whether the result can be written ~mx+p~ (affine) or ~mx~ (linear).

1. We expand using the identity ~(a+b)^2=a^2+2ab+b^2~:

   ~~f_1(x)=x^2+2x+1-x^2=2x+1~~

   ~f_1~ is affine (~m=2~, ~p=1~), not linear.

2. Be careful with the minus sign in front of the bracket:

   ~~f_2(x)=3x-6-4+x=4x-10~~

   ~f_2~ is affine (~m=4~, ~p=-10~), not linear.

3. We expand:

   ~~f_3(x)=x^2+3x-x^2=3x~~

   ~f_3~ is linear (~m=3~).

4. We expand:

   ~~f_4(x)=2x^2+2x-x-1=2x^2+x-1~~

   The ~2x^2~ term does not cancel: ~f_4~ is neither linear nor affine.

5. We expand each square:

   $$\begin{align*}f_5(x)&=(x^2+6x+9)-(x^2-6x+9)\\&=x^2+6x+9-x^2+6x-9\\&=12x\end{align*}$$

   ~f_5~ is linear (~m=12~).

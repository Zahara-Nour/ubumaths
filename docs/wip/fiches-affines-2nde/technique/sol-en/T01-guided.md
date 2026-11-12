A function defined on $\mathbb{R}$ is **affine** (also called a linear function in some books) if there are two real numbers ~m~ and ~p~ such that, for every real number ~x~, ~f(x)=mx+p~. It is **linear** when, in addition, ~p=0~, that is ~f(x)=mx~.

1. We try to write each expression in the form ~mx+p~.
   - ~f_1(x)=3x-5~ is of the form ~mx+p~: ~f_1~ is affine. It is not linear, because ~p=-5~ is not zero.
   - ~f_2(x)=-2x~ is of the form ~mx~: ~f_2~ is linear (so it is also affine).
   - ~f_3~ is neither linear nor affine: the ~x^2~ term prevents us from writing ~f_3(x)~ in the form ~mx+p~. For example, ~f_3(1)-f_3(0)=2-1=1~ but ~f_3(2)-f_3(1)=5-2=3~; for an affine function, these two differences would be equal, to ~m~.
   - ~f_4(x)=7=0x+7~: ~f_4~ is affine (it is a constant function). It is not linear, because ~p=7~.
   - ~f_5(x)={x-4}/3=x/3-4/3~: ~f_5~ is affine, not linear.
   - ~f_6~ is neither linear nor affine: ~1/x~ cannot be written ~mx+p~. Besides, ~f_6~ is not defined at ~0~, whereas an affine function is defined on $\mathbb{R}$.
   - ~f_7(x)=5-x=-x+5~: ~f_7~ is affine, not linear.
   - ~f_8(x)=sqrt(2)x~ is of the form ~mx~: ~f_8~ is linear.

2. We read ~m~ (the number multiplying ~x~) and ~p~ (the constant term) from the form ~mx+p~.

   | Function | Form $mx+p$                  | $m$            | $p$             |
   | -------- | ---------------------------- | -------------- | --------------- |
   | $f_1$    | $3x-5$                       | $3$            | $-5$            |
   | $f_2$    | $-2x+0$                      | $-2$           | $0$             |
   | $f_4$    | $0x+7$                       | $0$            | $7$             |
   | $f_5$    | $\dfrac{1}{3}x-\dfrac{4}{3}$ | $\dfrac{1}{3}$ | $-\dfrac{4}{3}$ |
   | $f_7$    | $-x+5$                       | $-1$           | $5$             |
   | $f_8$    | $\sqrt{2}\,x+0$              | $\sqrt{2}$     | $0$             |

3. Yes. A linear function can be written ~f(x)=mx~, that is ~f(x)=mx+0~: it is affine, with ~p=0~.

   The converse is false: ~f_1~ is affine but not linear.

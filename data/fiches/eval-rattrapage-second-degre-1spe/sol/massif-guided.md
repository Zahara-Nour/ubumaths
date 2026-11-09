1. ~M~ est sur $[AB]$, donc $0\leqslant x\leqslant10$. Pour que les quatre triangles de fleurs existent, il faut ~x>0~ et ~10-x>0~ : on prend $0<x<10$.
2. Le triangle ~AMQ~ est rectangle en ~A~, avec $AM=x$ et $AQ=AD-DQ=10-x$. Son aire est $\dfrac{x(10-x)}{2}$.
   Les quatre triangles des coins ont la même aire (mêmes côtés de l'angle droit). L'aire pavée est donc
   $$\begin{align*} S(x) &= 10^2-4\times\dfrac{x(10-x)}{2}=100-2x(10-x) \\ &= 100-20x+2x^2=2x^2-20x+100 \end{align*}$$
3. Le coefficient de ~x^2~ est ~2>0~ : ~S~ admet un **minimum** en $\alpha=-\dfrac{-20}{2\times2}=5$, qui appartient bien à $]0~;~10[$. $S(5)=2\times25-100+100=50$. L'aire pavée est la plus petite pour **~x=5~ m** : elle vaut alors **$50\ \text{m}^2$** (les points ~M~, ~N~, ~P~, ~Q~ sont les milieux des côtés).
4. L'aire des fleurs est $F(x)=100-S(x)=-2x^2+20x$.
   $F(x)\geqslant42\iff-2x^2+20x-42\geqslant0\iff x^2-10x+21\leqslant0$ (en divisant par ~-2<0~, le sens change).
   $\Delta=(-10)^2-4\times1\times21=100-84=16$, racines $\dfrac{10-4}{2}=3$ et $\dfrac{10+4}{2}=7$.
   Le trinôme $x^2-10x+21$ (coefficient ~1>0~) est négatif ou nul entre ses racines : $3\leqslant x\leqslant7$, ce qui respecte bien $0<x<10$. La mairie peut choisir **~x~ entre 3 m et 7 m**.

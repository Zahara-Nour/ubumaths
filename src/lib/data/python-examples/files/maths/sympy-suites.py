from sympy import symbols, summation, Rational, oo, sqrt, factorial, exp

n = symbols("n", integer=True)

# Sommes finies (formules connues)
print("Sommes finies :")
print(f"  Σ(k=1..n) k = {summation(n, (n, 1, 10))}  (Gauss : n(n+1)/2)")
print(f"  Σ(k=1..n) k² = {summation(n ** 2, (n, 1, 10))}")
print(f"  Σ(k=0..10) 2^k = {summation(2 ** n, (n, 0, 10))}  (suite géométrique)")

# Séries infinies (test de convergence)
print("\nSéries convergentes (somme infinie) :")
print(f"  Σ(n=0..∞) 1/n!  = {summation(1 / factorial(n), (n, 0, oo))}  (= e)")
print(f"  Σ(n=1..∞) 1/n²  = {summation(1 / n ** 2, (n, 1, oo))}  (Bâle, π²/6)")
print(f"  Σ(n=1..∞) 1/n⁴  = {summation(1 / n ** 4, (n, 1, oo))}")

# Série géométrique convergente
r = symbols("r")
print(f"\nSérie géométrique Σ rⁿ = {summation(r ** n, (n, 0, oo))} si |r|<1")

# Vérification numérique de e = Σ 1/n!
val_partielle = sum(1 / float(factorial(k)) for k in range(20))
print(f"\nApproximation de e (20 termes) : {val_partielle:.10f}")
print(f"Valeur exacte                  : {float(exp(1)):.10f}")

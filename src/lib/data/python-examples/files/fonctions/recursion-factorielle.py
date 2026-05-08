# Récursion : une fonction qui s'appelle elle-même
def factorielle(n):
    """n! = n * (n-1) * (n-2) * ... * 1"""
    if n < 0:
        raise ValueError(f"factorielle non définie pour n < 0 (reçu : {n})")
    if n <= 1:
        return 1               # cas de base : 0! = 1! = 1
    return n * factorielle(n - 1)  # cas récursif

for n in range(7):
    print(f"{n}! = {factorielle(n)}")

# Suite de Fibonacci : F(n) = F(n-1) + F(n-2)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print("\nFibonacci :")
for n in range(10):
    print(fibonacci(n), end=" ")
print()

# Somme des chiffres d'un nombre
def somme_chiffres(n):
    if n < 10:
        return n
    return n % 10 + somme_chiffres(n // 10)

print("\nSomme des chiffres de 12345 =", somme_chiffres(12345))

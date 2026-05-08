# Une closure : une fonction qui "capture" des variables de son
# environnement de définition.

def faire_compteur():
    """Retourne une fonction qui incrémente un compteur interne."""
    n = 0

    def incrementer():
        nonlocal n   # pour modifier la variable de l'enclos
        n += 1
        return n

    return incrementer


compteur1 = faire_compteur()
compteur2 = faire_compteur()    # compteurs INDÉPENDANTS

print(compteur1())  # 1
print(compteur1())  # 2
print(compteur1())  # 3
print(compteur2())  # 1 (autre compteur)

# Fabrique de fonctions paramétrées
def faire_multiplicateur(facteur):
    def multiplier(x):
        return x * facteur
    return multiplier


double = faire_multiplicateur(2)
triple = faire_multiplicateur(3)
print(f"\ndouble(7) = {double(7)}")
print(f"triple(7) = {triple(7)}")

# Inspection : les variables capturées sont accessibles
print(f"\ndouble a capturé : {double.__closure__[0].cell_contents}")

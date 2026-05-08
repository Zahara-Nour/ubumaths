# Les annotations de type (type hints) documentent l'intention.
# Python ne les vérifie PAS à l'exécution (sauf avec mypy).
# Mais les éditeurs et IDE les utilisent pour l'autocomplétion + erreurs.

def aire_rectangle(longueur: float, largeur: float) -> float:
    """Aire d'un rectangle."""
    return longueur * largeur


def saluer(prenom: str, fois: int = 1) -> None:
    for _ in range(fois):
        print(f"Bonjour {prenom} !")


print(aire_rectangle(3.0, 4.5))
saluer("Alice", 2)

# Types composés
from typing import Optional

def diviser(a: float, b: float) -> Optional[float]:
    """Retourne None si division impossible."""
    if b == 0:
        return None
    return a / b


print(diviser(10, 3))
print(diviser(10, 0))

# Listes, dicts, tuples typés (Python 3.9+)
def moyennes(notes: list[float]) -> dict[str, float]:
    return {
        "moyenne": sum(notes) / len(notes),
        "min": min(notes),
        "max": max(notes),
    }


resultats = moyennes([12.5, 15.0, 9.5, 18.0])
for cle, valeur in resultats.items():
    print(f"{cle:8s} = {valeur:.2f}")

# Les annotations sont accessibles via __annotations__
print("\nAnnotations de moyennes :", moyennes.__annotations__)

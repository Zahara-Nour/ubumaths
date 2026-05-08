def aire_disque(rayon):
    """Calcule l'aire d'un disque.

    Args:
        rayon: Le rayon du disque (réel positif).

    Returns:
        L'aire du disque, en unités au carré.

    Raises:
        ValueError: Si rayon est négatif.

    Examples:
        >>> aire_disque(1)
        3.141592653589793
        >>> aire_disque(0)
        0.0
    """
    import math
    if rayon < 0:
        raise ValueError(f"rayon doit être positif, reçu : {rayon}")
    return math.pi * rayon ** 2


# La docstring est accessible via __doc__
print(aire_disque.__doc__)

# Et via help()
help(aire_disque)

# Autre exemple : style NumPy/pandas
def moyenne(valeurs):
    """
    Calcule la moyenne arithmétique d'une liste de nombres.

    Parameters
    ----------
    valeurs : list of float
        Les valeurs à moyenner. Doit être non vide.

    Returns
    -------
    float
        La moyenne (somme / longueur).
    """
    if not valeurs:
        raise ValueError("liste vide")
    return sum(valeurs) / len(valeurs)


print(f"\nMoyenne : {moyenne([10, 12, 8, 14])}")

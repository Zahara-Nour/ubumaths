from abc import ABC, abstractmethod
import math

# ABC = Abstract Base Class
# Une classe abstraite force ses sous-classes à implémenter
# certaines méthodes. On ne peut PAS instancier une classe abstraite.


class Forme(ABC):
    """Classe abstraite : chaque forme DOIT savoir calculer son aire et son périmètre."""

    @abstractmethod
    def aire(self):
        """À implémenter dans la sous-classe."""
        ...

    @abstractmethod
    def perimetre(self):
        ...

    def decrire(self):
        """Méthode CONCRÈTE qui utilise les méthodes abstraites."""
        return f"{type(self).__name__} : aire = {self.aire():.2f}, périmètre = {self.perimetre():.2f}"


class Rectangle(Forme):
    def __init__(self, longueur, largeur):
        self.longueur = longueur
        self.largeur = largeur

    def aire(self):
        return self.longueur * self.largeur

    def perimetre(self):
        return 2 * (self.longueur + self.largeur)


class Cercle(Forme):
    def __init__(self, rayon):
        self.rayon = rayon

    def aire(self):
        return math.pi * self.rayon ** 2

    def perimetre(self):
        return 2 * math.pi * self.rayon


# Polymorphisme : on peut traiter toutes les formes uniformément
formes = [Rectangle(3, 4), Cercle(5), Rectangle(2, 8)]
for f in formes:
    print(f.decrire())

# Tentative d'instancier directement Forme : Python l'interdit
try:
    f = Forme()
except TypeError as e:
    print(f"\nImpossible : {e}")

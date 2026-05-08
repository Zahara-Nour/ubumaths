class Animal:
    def __init__(self, nom, age):
        self.nom = nom
        self.age = age

    def crier(self):
        print(f"{self.nom} fait un bruit indéfini.")

    def presenter(self):
        print(f"Je suis {self.nom}, j'ai {self.age} ans.")


class Chien(Animal):
    def __init__(self, nom, age, race):
        super().__init__(nom, age)
        self.race = race

    def crier(self):  # redéfinition (override)
        print(f"{self.nom} aboie : Wouaf !")


class Chat(Animal):
    def crier(self):
        print(f"{self.nom} miaule : Miaou.")


# Polymorphisme : la même méthode appelée sur différentes classes
animaux = [
    Chien("Rex", 4, "Labrador"),
    Chat("Felix", 7),
    Animal("Truc", 1),
]

for a in animaux:
    a.presenter()
    a.crier()

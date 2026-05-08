# Deux façons de réutiliser du code en POO :
# - Héritage : "EST-UN" (Chien EST-UN Animal)
# - Composition : "A-UN" (Voiture A-UN Moteur)
# La composition est souvent plus flexible.


# === Composition (préférée pour relations "A-UN") ===
class Moteur:
    def __init__(self, puissance_cv):
        self.puissance_cv = puissance_cv
        self.allume = False

    def demarrer(self):
        self.allume = True
        return f"Moteur {self.puissance_cv} ch démarré"

    def arreter(self):
        self.allume = False


class Voiture:
    def __init__(self, marque, moteur):
        self.marque = marque
        self.moteur = moteur          # COMPOSITION : la voiture A-UN moteur

    def demarrer(self):
        return f"{self.marque} : {self.moteur.demarrer()}"


renault = Voiture("Renault", Moteur(110))
print(renault.demarrer())

# Avantage : on peut REMPLACER le moteur sans toucher la classe
renault.moteur = Moteur(150)
print(renault.demarrer())


# === Héritage (préférée pour relations "EST-UN") ===
class Vehicule:
    def __init__(self, marque):
        self.marque = marque

    def description(self):
        return f"{type(self).__name__} {self.marque}"


class Voiture2(Vehicule):       # Une Voiture EST-UN Véhicule
    def __init__(self, marque, nb_portes):
        super().__init__(marque)
        self.nb_portes = nb_portes


class Moto(Vehicule):           # Une Moto EST-UN Véhicule aussi
    pass


print()
print(Voiture2("Peugeot", 4).description())
print(Moto("Yamaha").description())

# Règle de pouce : "EST-UN" → héritage. "A-UN" → composition.

class Temperature:
    """Démontre @property : accès "naturel" avec validation derrière."""

    def __init__(self, celsius):
        self.celsius = celsius   # passe par le setter !

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, valeur):
        if valeur < -273.15:
            raise ValueError(f"Température sous 0 K : {valeur}")
        self._celsius = valeur

    @property
    def fahrenheit(self):
        """Calculée à la volée à partir de celsius."""
        return self._celsius * 9 / 5 + 32

    @fahrenheit.setter
    def fahrenheit(self, valeur):
        self.celsius = (valeur - 32) * 5 / 9

    @property
    def kelvin(self):
        """Lecture seule : pas de setter défini."""
        return self._celsius + 273.15


t = Temperature(20)
print(f"{t.celsius}°C = {t.fahrenheit}°F = {t.kelvin} K")

# Modifier celsius met à jour fahrenheit automatiquement
t.celsius = 100
print(f"{t.celsius}°C = {t.fahrenheit}°F")

# On peut aussi définir par fahrenheit
t.fahrenheit = 32
print(f"{t.celsius}°C = {t.fahrenheit}°F (eau gelée)")

# Validation : impossible d'aller sous 0 K
try:
    t.celsius = -300
except ValueError as e:
    print(f"\nErreur : {e}")

# kelvin est en lecture seule
try:
    t.kelvin = 0
except AttributeError as e:
    print(f"Erreur : {e}")

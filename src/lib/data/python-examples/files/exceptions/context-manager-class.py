import time

# Un context manager (avec `with`) garantit l'exécution d'un nettoyage
# même en cas d'exception. On le crée avec __enter__ et __exit__.


class Chronometre:
    """Mesure la durée d'un bloc avec `with`."""

    def __init__(self, nom):
        self.nom = nom

    def __enter__(self):
        self.debut = time.perf_counter()
        print(f"⏱  Début : {self.nom}")
        return self          # ce qui est lié à `as`

    def __exit__(self, exc_type, exc_value, traceback):
        duree = time.perf_counter() - self.debut
        print(f"⏱  Fin   : {self.nom} — {duree * 1000:.2f} ms")
        # return False (ou None) → ne supprime pas l'exception
        return False


with Chronometre("calcul lourd") as chrono:
    s = sum(i ** 2 for i in range(100_000))
print(f"Résultat : {s}")


# Avec gestion d'exception :
class ConnexionFactice:
    def __enter__(self):
        print("→ Connexion ouverte")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        print("→ Connexion fermée (toujours appelé)")

    def envoyer(self, message):
        if "BAD" in message:
            raise ValueError("Message invalide")
        print(f"  Envoyé : {message}")


print()
try:
    with ConnexionFactice() as conn:
        conn.envoyer("Bonjour")
        conn.envoyer("BAD message")    # → exception
        conn.envoyer("Jamais atteint")
except ValueError as e:
    print(f"Capturée : {e}")

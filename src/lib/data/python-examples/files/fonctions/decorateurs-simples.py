import time

# Un décorateur ENRICHIT une fonction sans modifier son code.
# Syntaxe : @nom_du_decorateur au-dessus de la fonction.

def chronometre(fonction):
    """Décorateur qui mesure le temps d'exécution."""
    def wrapper(*args, **kwargs):
        debut = time.perf_counter()
        resultat = fonction(*args, **kwargs)
        duree = time.perf_counter() - debut
        print(f"⏱  {fonction.__name__} a pris {duree * 1000:.3f} ms")
        return resultat
    return wrapper


@chronometre
def somme_lente(n):
    return sum(range(n))


@chronometre
def somme_rapide(n):
    return n * (n - 1) // 2


somme_lente(1_000_000)
somme_rapide(1_000_000)


# Décorateur paramétré : factory de décorateurs
def repeter(n):
    def decorateur(fonction):
        def wrapper(*args, **kwargs):
            for _ in range(n):
                fonction(*args, **kwargs)
        return wrapper
    return decorateur


@repeter(3)
def saluer():
    print("Salut !")


print()
saluer()

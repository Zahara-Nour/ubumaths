def diviser(a, b):
    try:
        resultat = a / b
    except ZeroDivisionError:
        print("Erreur : division par zéro")
        return None
    except TypeError as e:
        print(f"Erreur de type : {e}")
        return None
    else:
        # else : exécuté SI aucun except n'a été déclenché
        print(f"Calcul réussi : {a}/{b} = {resultat}")
        return resultat
    finally:
        # finally : toujours exécuté (même en cas d'exception)
        print("(fin de l'opération)\n")


diviser(10, 2)
diviser(10, 0)
diviser(10, "deux")

# raise : lever une exception
def racine_carree(x):
    if x < 0:
        raise ValueError(f"x doit être positif, reçu : {x}")
    return x ** 0.5

try:
    print(racine_carree(-4))
except ValueError as e:
    print("Capturée :", e)

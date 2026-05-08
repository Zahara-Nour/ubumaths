# Paramètres avec valeurs par défaut
def saluer(prenom, salutation="Bonjour"):
    return f"{salutation}, {prenom} !"

print(saluer("Alice"))
print(saluer("Bob", "Salut"))
print(saluer("Carla", salutation="Hello"))

# *args : nombre variable d'arguments positionnels
def somme(*nombres):
    total = 0
    for n in nombres:
        total += n
    return total

print(somme(1, 2, 3))
print(somme(10, 20, 30, 40, 50))

# **kwargs : nombre variable d'arguments nommés
def afficher_fiche(**infos):
    for cle, valeur in infos.items():
        print(f"  {cle} : {valeur}")

afficher_fiche(nom="Curie", prenom="Marie", age=17)

# Combinaison
def journal(date, *evenements, **meta):
    print(f"[{date}] ({meta.get('lieu', '?')})")
    for e in evenements:
        print(f"  - {e}")

journal("2026-05-08", "réveil", "cours", lieu="Lyon")

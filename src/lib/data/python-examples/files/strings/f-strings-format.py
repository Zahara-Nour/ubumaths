prenom = "Alice"
age = 17
moyenne = 14.3789

# Interpolation simple
print(f"{prenom} a {age} ans")

# Formatage de nombres
print(f"Moyenne : {moyenne:.2f}")        # 2 décimales
print(f"Moyenne : {moyenne:10.2f}")      # largeur 10, alignée à droite
print(f"Moyenne : {moyenne:<10.2f}|")    # alignée à gauche
print(f"Moyenne : {moyenne:^10.2f}|")    # centrée

# Padding numérique (utile pour heures, ID, etc.)
for h in [3, 9, 14, 23]:
    print(f"{h:02d}h00")

# Notation scientifique
c = 299792458
print(f"c = {c:.3e} m/s")

# Tableau aligné
notes = [("Alice", 14.3), ("Bob", 11.0), ("Carla", 17.25)]
print(f"\n{'Élève':<10}{'Note':>8}")
print("-" * 18)
for nom, note in notes:
    print(f"{nom:<10}{note:>8.2f}")

# Expression directement dans la chaîne
n = 42
print(f"{n} au carré vaut {n ** 2}")

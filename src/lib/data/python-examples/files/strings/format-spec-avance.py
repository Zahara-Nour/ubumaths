# Mini-langage de formatage : [[fill]align][sign][#][0][width][,][.precision][type]

valeur = 1234.56789

# Largeur + alignement
print(f"|{valeur:15.2f}|")     # défaut : aligné à droite
print(f"|{valeur:<15.2f}|")    # gauche
print(f"|{valeur:>15.2f}|")    # droite
print(f"|{valeur:^15.2f}|")    # centré

# Caractère de remplissage
print(f"|{valeur:*^15.2f}|")
print(f"|{42:0>5d}|")           # padding de zéros : 00042

# Séparateur de milliers
print(f"\n{1234567.89:,.2f}")   # 1,234,567.89
print(f"{1234567.89:_.2f}")     # 1_234_567.89

# Notation scientifique et pourcentage
print(f"\n{299792458:.3e}")     # 2.998e+08
print(f"{0.875:.1%}")            # 87.5%

# Signe explicite
print(f"\n{42:+d}")              # +42
print(f"{-42:+d}")               # -42

# Bases numériques
print(f"\n255 en binaire : {255:b}")
print(f"255 en octal   : {255:o}")
print(f"255 en hexa    : {255:x}")
print(f"255 avec préfixe : {255:#x}")

# Tableau aligné de notes
notes = [("Alice", 14.3), ("Bob", 9.75), ("Carla", 17.234), ("David", 12.0)]
print(f"\n{'Élève':<10}{'Note':>8}")
print("─" * 18)
for nom, note in notes:
    print(f"{nom:<10}{note:>8.2f}")

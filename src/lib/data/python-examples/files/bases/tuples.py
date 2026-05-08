# Un tuple est une séquence IMMUABLE (non modifiable)
point = (3, 4)
couleur = ("rouge", 255, 0, 0)
solo = (42,)        # virgule obligatoire pour un tuple à un élément

# Accès par index (comme une liste)
print(point[0], point[1])

# Unpacking : déballer un tuple en plusieurs variables
x, y = point
print(f"x = {x}, y = {y}")

nom, r, g, b = couleur
print(f"{nom} → RGB({r}, {g}, {b})")

# Échange (swap) idiomatique
a, b = 1, 2
a, b = b, a
print(f"Après swap : a={a}, b={b}")

# Retour multiple d'une fonction = tuple implicite
def division_entiere(num, den):
    return num // den, num % den

quotient, reste = division_entiere(17, 5)
print(f"17 = 5 × {quotient} + {reste}")

# Immuabilité : on ne peut PAS modifier
# point[0] = 99  # → TypeError !
# Pour modifier, il faut créer un nouveau tuple
nouveau = (99, point[1])
print("Nouveau point :", nouveau)

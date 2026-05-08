# Les strings en Python sont IMMUABLES : on ne peut pas modifier
# une chaîne existante, on en crée toujours une nouvelle.

s = "bonjour"
print(s, "id =", id(s))

# s[0] = 'B'  # → TypeError !

# On crée une nouvelle chaîne
s2 = s.replace("b", "B")
print(s2, "id =", id(s2))   # id différent → nouvel objet

# Conséquences pratiques :
# - Concaténation en boucle = LENT (re-création à chaque fois)
# - Préférer .join() sur une liste

import time

# Mauvais : O(n²)
def concat_lent(parts):
    s = ""
    for p in parts:
        s += p
    return s


# Bon : O(n)
def concat_rapide(parts):
    return "".join(parts)


parts = [str(i) for i in range(10_000)]

t0 = time.perf_counter()
concat_lent(parts)
t1 = time.perf_counter()
concat_rapide(parts)
t2 = time.perf_counter()

print(f"\nConcaténation lente : {(t1 - t0) * 1000:.2f} ms")
print(f"Avec .join()        : {(t2 - t1) * 1000:.2f} ms")

# Pour modifier "en place", utiliser une liste de caractères
chars = list("python")
chars[0] = "P"
print("".join(chars))

# Conversions explicites entre types
n = "42"
print(type(n).__name__, "→", n)

# str → int
i = int(n)
print(type(i).__name__, "→", i, " puis i + 1 =", i + 1)

# str → float
x = float("3.14")
print(type(x).__name__, "→", x)

# int → str
s = str(123)
print(type(s).__name__, "→", repr(s))

# Différentes bases pour int
print(int("ff", 16))   # hexadécimal → 255
print(int("101", 2))   # binaire → 5
print(int("17", 8))    # octal → 15

# bool : ce qui est "faux" en Python
faux = [0, 0.0, "", [], {}, None, False]
for v in faux:
    print(f"  bool({v!r:10}) = {bool(v)}")

# Tout le reste est True
print(f"  bool({-1}) = {bool(-1)}")
print(f"  bool({'salut'!r}) = {bool('salut')}")

# Erreurs de conversion (provoquent ValueError)
try:
    n = int("abc")
except ValueError as e:
    print(f"\nErreur : {e}")

# En Python 3, les strings sont par défaut UNICODE (texte)
# tandis que les bytes sont des octets bruts.

s = "café ☕"
print(f"Type str   : {type(s).__name__}, longueur en caractères = {len(s)}")

# Encodage : str → bytes (avec UTF-8 par défaut)
encoded = s.encode("utf-8")
print(f"Type bytes : {type(encoded).__name__}, longueur en octets = {len(encoded)}")
print(f"Bytes      : {encoded}")
print(f"Hex        : {encoded.hex()}")

# 'é' et '☕' nécessitent plusieurs octets en UTF-8
print(f"\n'é' en UTF-8 : {'é'.encode('utf-8').hex()}  ({len('é'.encode('utf-8'))} octets)")
print(f"'☕' en UTF-8 : {'☕'.encode('utf-8').hex()}  ({len('☕'.encode('utf-8'))} octets)")

# Décodage : bytes → str
brut = b'\xe2\x98\x95'
print(f"\nDécodage de {brut} : {brut.decode('utf-8')}")

# Erreur d'encodage si on utilise un codec incompatible
try:
    "é".encode("ascii")
except UnicodeEncodeError as e:
    print(f"\nErreur ASCII : {e.reason}")

# Stratégies en cas d'erreur
print("É en ASCII (ignore) :", "café".encode("ascii", errors="ignore"))
print("É en ASCII (replace) :", "café".encode("ascii", errors="replace"))

# Code point Unicode
for c in "Aé€☕":
    print(f"  {c} → U+{ord(c):04X}")

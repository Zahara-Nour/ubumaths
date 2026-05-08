# Mode binaire 'b' : on lit/écrit des bytes (bruts, pas du texte)

# Écrire des octets bruts
with open("data.bin", "wb") as f:
    # Header simulé : 4 bytes magic + 4 bytes version
    f.write(b"\x89PNG")
    f.write(int.to_bytes(1, length=4, byteorder="big"))
    # Quelques données
    f.write(bytes(range(0, 32)))

# Lire le fichier
with open("data.bin", "rb") as f:
    contenu = f.read()

print(f"Taille : {len(contenu)} octets")
print(f"Header : {contenu[:4]}")
print(f"Version : {int.from_bytes(contenu[4:8], byteorder='big')}")
print(f"Hex     : {contenu.hex()}")

# Inspection octet par octet
print("\nLes 16 premiers octets :")
for i, octet in enumerate(contenu[:16]):
    print(f"  position {i:2d} : 0x{octet:02x} = {octet}")

# Différence avec le mode texte : pas de décodage automatique
# Le mode 'rb' évite les erreurs Unicode et les conversions de fin de ligne.

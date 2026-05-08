import matplotlib.pyplot as plt

# Répartition des langues parlées en France métropolitaine
labels = ["Français", "Arabe", "Portugais", "Espagnol", "Italien", "Autres"]
parts = [88, 4, 1.5, 1.2, 1, 4.3]
couleurs = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"]
explosion = (0.05, 0, 0, 0, 0, 0)   # met en avant la première part

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 5))

# Camembert classique
ax1.pie(
    parts,
    labels=labels,
    colors=couleurs,
    autopct="%1.1f%%",
    startangle=90,
    explode=explosion,
)
ax1.set_title("Camembert")

# Donut (anneau)
ax2.pie(
    parts,
    labels=labels,
    colors=couleurs,
    autopct="%1.1f%%",
    startangle=90,
    wedgeprops={"width": 0.4, "edgecolor": "white"},
)
ax2.set_title("Donut (anneau)")

plt.suptitle("Langues maternelles en France métropolitaine")
plt.tight_layout()
plt.show()

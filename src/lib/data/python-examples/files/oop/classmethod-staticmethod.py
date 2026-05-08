class Date:
    """Différences entre méthode d'instance, de classe, et statique."""

    def __init__(self, jour, mois, annee):
        self.jour = jour
        self.mois = mois
        self.annee = annee

    # Méthode d'INSTANCE : reçoit self, accède aux attributs de l'objet
    def afficher(self):
        return f"{self.jour:02d}/{self.mois:02d}/{self.annee}"

    # Méthode de CLASSE : reçoit cls (la classe elle-même)
    # Utile pour des constructeurs alternatifs.
    @classmethod
    def depuis_chaine(cls, chaine):
        """Constructeur alternatif depuis 'jj/mm/aaaa'."""
        j, m, a = chaine.split("/")
        return cls(int(j), int(m), int(a))

    @classmethod
    def aujourd_hui(cls):
        """Autre constructeur — exemple sans dépendance datetime."""
        return cls(8, 5, 2026)

    # Méthode STATIQUE : ni self ni cls, c'est juste une fonction "rangée"
    # dans la classe pour des raisons d'organisation.
    @staticmethod
    def est_bissextile(annee):
        return annee % 4 == 0 and (annee % 100 != 0 or annee % 400 == 0)


d1 = Date(15, 3, 2024)
d2 = Date.depuis_chaine("01/01/2026")
d3 = Date.aujourd_hui()

print(d1.afficher())
print(d2.afficher())
print(d3.afficher())

print(f"\n2024 bissextile ? {Date.est_bissextile(2024)}")
print(f"2100 bissextile ? {Date.est_bissextile(2100)}")
print(f"2400 bissextile ? {Date.est_bissextile(2400)}")

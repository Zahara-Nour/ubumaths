class CompteBancaire:
    """Encapsulation : on cache les détails internes derrière une interface."""

    def __init__(self, titulaire, solde_initial=0):
        self.titulaire = titulaire        # public
        self._solde = solde_initial       # convention : "_" = privé (par convention)
        self.__historique = []            # "__" = name mangling (vraiment privé)

    def deposer(self, montant):
        if montant <= 0:
            raise ValueError("Le montant doit être positif")
        self._solde += montant
        self.__historique.append(("dépôt", montant))

    def retirer(self, montant):
        if montant > self._solde:
            raise ValueError("Solde insuffisant")
        self._solde -= montant
        self.__historique.append(("retrait", montant))

    def solde(self):
        return self._solde

    def voir_historique(self):
        return list(self.__historique)   # copie défensive


compte = CompteBancaire("Alice", 100)
compte.deposer(50)
compte.deposer(30)
compte.retirer(40)

print(f"Solde : {compte.solde()}€")
print(f"Historique : {compte.voir_historique()}")

# Convention "_" : on PEUT y accéder mais on ne devrait pas
print(f"\nAccès direct (pas recommandé) : {compte._solde}")

# Name mangling sur "__" : Python renomme l'attribut
# print(compte.__historique)  # AttributeError !
print(f"Mais accessible via : compte._CompteBancaire__historique")
print(compte._CompteBancaire__historique)

class SoldeInsuffisantError(Exception):
    """Levée quand un retrait dépasse le solde disponible."""

    def __init__(self, demande, disponible):
        self.demande = demande
        self.disponible = disponible
        super().__init__(
            f"Retrait de {demande}€ refusé (solde : {disponible}€)"
        )


class CompteBancaire:
    def __init__(self, titulaire, solde=0):
        self.titulaire = titulaire
        self.solde = solde

    def retirer(self, montant):
        if montant > self.solde:
            raise SoldeInsuffisantError(montant, self.solde)
        self.solde -= montant
        return self.solde


compte = CompteBancaire("Alice", 100)

operations = [50, 80]
for montant in operations:
    try:
        nouveau = compte.retirer(montant)
        print(f"Retrait {montant}€ OK → solde : {nouveau}€")
    except SoldeInsuffisantError as e:
        print(f"REFUSÉ : {e}")
        print(f"  Manquant : {e.demande - e.disponible}€")

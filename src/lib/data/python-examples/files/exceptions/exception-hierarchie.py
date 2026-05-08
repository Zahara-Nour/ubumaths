# Définir une hiérarchie d'exceptions métier permet de capturer
# soit toute la famille, soit un cas précis.


class JeuError(Exception):
    """Base pour toutes les erreurs du jeu."""


class NiveauError(JeuError):
    """Problème de niveau."""


class JoueurError(JeuError):
    """Problème de joueur."""


class JoueurInactifError(JoueurError):
    pass


class JoueurBanniError(JoueurError):
    pass


def lancer_partie(joueur):
    if joueur == "inactif":
        raise JoueurInactifError("Joueur inactif depuis 30 jours")
    if joueur == "banni":
        raise JoueurBanniError("Joueur banni pour triche")
    if joueur == "niveau_max":
        raise NiveauError("Joueur a déjà atteint le dernier niveau")
    print(f"Partie démarrée pour {joueur}")


for nom in ["alice", "inactif", "banni", "niveau_max"]:
    print(f"\n--- {nom} ---")
    try:
        lancer_partie(nom)
    except JoueurError as e:
        # Capture toutes les sous-classes de JoueurError
        print(f"Problème joueur ({type(e).__name__}) : {e}")
    except JeuError as e:
        # Capture les autres erreurs du jeu (NiveauError ici)
        print(f"Autre problème jeu : {e}")

# Vérifier la relation d'héritage
print(f"\nJoueurBanniError est-il une JeuError ? {issubclass(JoueurBanniError, JeuError)}")
print(f"JoueurBanniError est-il une JoueurError ? {issubclass(JoueurBanniError, JoueurError)}")

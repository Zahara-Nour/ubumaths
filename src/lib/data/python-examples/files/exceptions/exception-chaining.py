# Chaîner des exceptions : préserver l'origine de l'erreur tout en
# levant une exception plus spécifique au niveau "métier".


class ConfigError(Exception):
    """Erreur de configuration applicative."""


def lire_config(chaine_json):
    import json
    try:
        data = json.loads(chaine_json)
    except json.JSONDecodeError as e:
        # raise ... from e : conserve la cause
        raise ConfigError("Configuration invalide") from e

    if "port" not in data:
        raise ConfigError("Clé 'port' manquante")

    return data


# Cas 1 : JSON malformé
try:
    lire_config('{"port": 8080,')
except ConfigError as e:
    print(f"Erreur métier : {e}")
    print(f"Cause originale : {e.__cause__}")

# Cas 2 : config valide mais incomplète
try:
    lire_config('{"host": "localhost"}')
except ConfigError as e:
    print(f"\nErreur métier : {e}")
    print(f"Cause : {e.__cause__}")  # None ici (pas de chaînage)

# Différence avec "raise ... from None" : supprime la cause
def fonction_polie():
    try:
        raise ValueError("détail interne")
    except ValueError:
        raise RuntimeError("Quelque chose a échoué") from None


try:
    fonction_polie()
except RuntimeError as e:
    print(f"\nException 'propre' : {e}")
    print(f"Cause : {e.__cause__}")     # None
    print(f"Contexte supprimé : {e.__suppress_context__}")

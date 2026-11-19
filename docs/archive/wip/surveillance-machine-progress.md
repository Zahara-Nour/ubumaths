# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-19, après #2906 — chantier clos._

- **État** : livré (#2906) et installé — launchd `local.surveillance-machine` toutes les 5 min, premier passage OK (alertes Chrome et swap envoyées), notification de test envoyée · **Prochaine action** : aucune · **En attente de David** : appli ntfy sur l'iPhone, abonnée au canal de `~/.config/surveillance-machine/ntfy-topic` · **Pièges** : la revue a trouvé qu'on aurait tué le `vite dev` de n'importe quel dépôt git (corrigé : dossier git commun comparé à celui de Chiphre) · **Doc durable** : `docs/pratiques/environnement-de-dev.md` § Ports

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).

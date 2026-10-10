# Alléger les déploiements Vercel — progression

Branche `chore/deploiements-vercel`, worktree `ubumaths-wt-deploiements-vercel`.

## Pourquoi

Alerte Vercel du 2026-10-10 : stockage des déploiements à 100 % des 10 Go du
plan gratuit, quatre jours après un ménage manuel (117 → 11 déploiements).

- Le compteur est en Go-mois : chaque jour, le maximum stocké par projet,
  additionné sur la période. Supprimer arrête l'accumulation, ne rembourse rien.
- Rythme mesuré du 30/09 au 10/10 : 734 pushes sur `main`, dont 451 avec du
  code (~45 par jour). Chaque build de prod pèse ~81 Mo de statique et
  28,5 Mo de fonction.
- Au-delà de la limite, Vercel peut bloquer les nouveaux déploiements.

## Décisions de David

- Point 5 de l'analyse : ne construire que la pointe de `main` (« Oui fais la 5 »).
- `static/game/sounds` : garder seulement le MP3 (choix explicite, contre
  « tout supprimer » ou « sortir de static/ »). Aucun code ne lit ces sons
  aujourd'hui (`getSoundUrl` n'est appelé nulle part) ; ils restent prêts pour
  la réécriture de Navadra, en MP3 pour Safari et les iPad.

## Fait

- `scripts/vercel-ignore-build.sh` + `vercel.json` : trois règles (redéploiement
  toujours construit ; pointe de `main` seule ; doc seule depuis le dernier
  déploiement réussi → sautée, `.md` de la racine compris).
- 12 tests (`scripts/__tests__/vercel-ignore-build.test.ts`). Preuve rouge :
  contre l'ancienne commande, 5 échouent (les comportements nouveaux), 7
  passent (ceux à conserver).
- 79 doublons `.ogg` retirés : −8,9 Mo de statique par déploiement.

## Reste à faire

- Revue `code-reviewer`, PR, CI, merge.
- Après le merge : lire la sortie de l'ignore step dans le journal du premier
  build de prod (`vercel inspect <url> --logs`), qui doit afficher
  « du code a changé depuis … → build ». Vérifier aussi qu'un push de doc
  affiche « rien que de la doc … → build sauté ».

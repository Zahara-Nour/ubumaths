# Alléger les déploiements Vercel — progression

Branche `chore/deploiements-vercel`, worktree `ubumaths-wt-deploiements-vercel`, PR #1003.

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

- `scripts/vercel-ignore-build.sh` + `vercel.json` : redéploiement toujours
  construit ; pointe de `main` seule ; src/ ou static/ modifié → build
  (articles du Shtam) ; doc seule depuis le dernier déploiement réussi →
  sautée, `.md` de la racine compris ; `VERCEL_GIT_PREVIOUS_SHA` vide → build.
- `scripts/vercel-maintenance.sh` : redéploie le dernier déploiement READY.
  Il prenait le premier listé, souvent un push de doc ANNULÉ, que l'ignore step
  sautait : la bascule était muette (défaut antérieur à cette PR).
- 79 doublons `.ogg` retirés : −8,9 Mo de statique par déploiement.
- Tests : 17 sur l'ignore step, 2 sur la maintenance. Preuves rouges contre
  l'ancienne commande (5 échecs), contre la v1 relue (8 échecs, dont 4 par le
  statut) et contre l'ancien script de maintenance (2 échecs).
- Revue `code-reviewer` de la v1 : six constats, tous appliqués.

## Incident pendant la revue (2026-10-10, 07:50)

Le banc d'essai bash de l'agent de revue (dans le scratchpad, hors dépôt) a
réutilisé sa variable de dossier pour un SHA : `mktemp` a échoué, puis
`git -C ""` est resté dans le dossier courant, le dépôt principal. Six
`checkout` l'ont basculé sur des commits de test : 10 649 fichiers suivis
retirés du disque. GitHub, la branche `main`, les remotes et les fichiers non
suivis sont restés intacts. Réparé par `git switch main` dans le dépôt
principal. Les tests de cette PR refusent désormais tout dossier hors du
dossier jetable (`dansLeBac`) et posent `GIT_CEILING_DIRECTORIES`.

## Reste à faire

- CI verte, merge.
- Après le merge : lire la sortie de l'ignore step dans le journal du premier
  build de prod (`vercel inspect <url> --logs`). Elle doit afficher le dernier
  déploiement (preuve que `VERCEL_GIT_PREVIOUS_SHA` arrive), le dépôt
  `https://github.com/Zahara-Nour/ubumaths.git`, puis « src/ ou static/ a
  changé … → build ».

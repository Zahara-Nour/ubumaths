# Alléger les déploiements Vercel — progression

Branche `chore/deploiements-vercel`, worktree `ubumaths-wt-deploiements-vercel`, PR #1003.

## Pourquoi

Alerte Vercel du 2026-10-10 : stockage des déploiements à 100 % des 10 Go du
plan gratuit, quatre jours après un ménage manuel (117 → 11 déploiements).

- La jauge du tableau de bord (Usage → Deployment Storage) est le volume stocké
  du jour, pas un cumul. ⚠️ Une première explication, « compteur en Go-mois,
  le ménage ne rembourse rien », était fausse pour cette jauge : la facturation
  Pro compte en Go-mois, la limite du plan gratuit regarde le stock.
- Courbe relevée le 10/10 : 28 Go au pic du 21-22/09, puis une dent de scie
  entre ~1 et ~10 Go depuis le 23/09, pic proche de 10 Go le 8-9/10 (d'où
  l'alerte), 247 Mo le 10/10 après la purge automatique de Vercel.
- Cause : la rétention du projet était à 30 jours partout (production,
  annulés, en erreur). À ~40 builds par jour, le stock monte d'environ 3 Go
  par jour et touche les 10 Go en trois jours. Vercel supprime alors tout ce
  qui n'est pas protégé. Le ménage du 6/10 a vidé le stock, qui s'est rempli
  de nouveau en trois jours.
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

## Vérifié en prod (2026-10-10)

PR #1003 fusionnée (merge `6b3e5ab3d`). Journal du build de prod :

```
ignoreCommand : commit 6b3e5ab3d, dernier déploiement 72dce506f, dépôt https://github.com/Zahara-Nour/ubumaths.git
ignoreCommand : src/ ou static/ a changé depuis 72dce506f → build
```

`VERCEL_GIT_PREVIOUS_SHA` arrive bien rempli : c'est le dernier déploiement
RÉUSSI, et non le commit de doc annulé qui le suivait. L'URL du dépôt est
correcte. Ce commit de doc sert à vérifier la règle 4 (« rien que de la doc →
build sauté »).

## Reste à faire

- La rétention du projet (Settings → Security → Deployment Retention Policy) :
  à raccourcir, décision de David. À ce rythme, 10 Go ne tiennent que ~3 jours
  de builds. Le plan gratuit garde de toute façon les 3 dernières prod pour un
  retour arrière.

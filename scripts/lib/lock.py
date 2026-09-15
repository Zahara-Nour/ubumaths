#!/usr/bin/env python3
"""Verrou inter-worktree, tenu par le noyau.

Usage : lock.py <nom> <libellé> -- <commande…>

POURQUOI PAS UN VERROU EN SHELL
-------------------------------
Sans primitive noyau, il faut détecter les verrous PÉRIMÉS — ceux d'un processus
tué par l'OOM, qui ne déclenche aucun trap — puis les reprendre. Or cette
reprise est intrinsèquement racée : supprimer un verrou se fait par CHEMIN, sans
pouvoir garantir que le fichier est encore celui qu'on vient de juger périmé.
Deux implémentations shell successives ont été mesurées ici, verrou périmé et
6 concurrents : 2 détenteurs simultanés, y compris avec O_CREAT|O_EXCL puis avec
publication par lien dur et verrou de vol.

flock(2) supprime le problème à la racine plutôt que de le contenir : le verrou
est attaché à la description de fichier ouverte, donc le NOYAU le relâche quand
le processus meurt — SIGKILL et OOM compris. Il n'existe jamais de verrou
périmé, donc jamais de reprise, donc aucune course à protéger.

⚠️ Corollaire : un FICHIER qui traîne dans .locks/ n'est pas un verrou. Le
verrou, c'est l'état noyau ; le fichier n'est qu'un support et le contenu qu'un
message pour l'humain.

Le descripteur survit à exec() (FD_CLOEXEC retiré explicitement — Python le pose
par défaut depuis la PEP 446), donc on REMPLACE ce processus par la commande
demandée : le verrou reste tenu pendant toute sa vie et se relâche tout seul à
sa fin, quelle qu'en soit la cause.
"""

import fcntl
import os
import subprocess
import sys
import time


def refuser(message):
	print(message, file=sys.stderr)
	sys.exit(1)


def repertoire_des_verrous():
	"""Le répertoire git COMMUN : le seul endroit que tous les worktrees partagent.

	⚠️ `--path-format=absolute` est indispensable : `--git-common-dir` rend un
	chemin RELATIF (".git") depuis le dépôt principal et ABSOLU depuis un
	worktree. Sans lui, le verrou atterrirait à deux endroits différents selon
	l'appelant — il paraîtrait fonctionner et ne protègerait rien.
	"""
	try:
		commun = subprocess.run(
			["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
			capture_output=True, text=True, check=True,
		).stdout.strip()
	except (subprocess.CalledProcessError, FileNotFoundError):
		refuser("⛔ Répertoire git commun introuvable : impossible de poser un verrou.\n"
		        "   Lance cette commande depuis le dépôt ou l'un de ses worktrees.")
	if not commun:
		refuser("⛔ Répertoire git commun vide : impossible de poser un verrou.")
	return os.path.join(commun, ".locks")


def processus_vivant(pid):
	try:
		os.kill(int(pid), 0)
	except (ValueError, ProcessLookupError):
		return False
	except PermissionError:
		return True
	return True


def decrire_le_detenteur(fd):
	"""Le détenteur s'est décrit dans le fichier ; absent, on reste vague."""
	try:
		os.lseek(fd, 0, os.SEEK_SET)
		lignes = os.read(fd, 4096).decode("utf-8", "replace").splitlines()
	except OSError:
		lignes = []
	pid = lignes[0] if len(lignes) > 0 else ""
	worktree = lignes[1] if len(lignes) > 1 else ""
	depuis = lignes[2] if len(lignes) > 2 else ""
	return pid, worktree, depuis


def main():
	args = sys.argv[1:]
	if "--" not in args or len(args) < 3:
		refuser("usage : lock.py <nom> <libellé> -- <commande…>")
	coupure = args.index("--")
	nom, libelle = args[0], args[1]
	commande = args[coupure + 1:]
	if not commande:
		refuser("⛔ Aucune commande à exécuter sous le verrou.")

	dossier = repertoire_des_verrous()
	try:
		os.makedirs(dossier, exist_ok=True)
	except OSError as e:
		refuser(f"⛔ Impossible de créer {dossier} ({e}) : on n'exécute rien sans verrou.")

	chemin = os.path.join(dossier, nom)
	try:
		fd = os.open(chemin, os.O_RDWR | os.O_CREAT, 0o644)
	except OSError as e:
		refuser(f"⛔ Impossible d'ouvrir {chemin} ({e}) : on n'exécute rien sans verrou.")

	try:
		fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
	except OSError:
		pid, worktree, depuis = decrire_le_detenteur(fd)
		print(f"⛔ {libelle} tourne déjà" + (f" (PID {pid}, depuis {depuis})." if pid else "."))
		# Nommer le worktree détenteur : c'est LA seule information qui rend le
		# refus actionnable, puisque l'autre session est invisible d'ici.
		if worktree:
			print(f"   Détenu par : {worktree}")
		print("   Cette ressource est partagée par tous les worktrees — attends la fin.")
		if pid and not processus_vivant(pid):
			# flock est attaché à la DESCRIPTION de fichier ouverte, pas au
			# processus : tout enfant forké hérite du descripteur, et le noyau
			# ne relâche qu'à la mort du DERNIER. Conseiller `kill <pid>` ici
			# serait inopérant — le processus déclaré n'existe plus.
			print(f"   ⚠️ Le PID déclaré ({pid}) est MORT : le verrou est tenu par un de ses")
			print("      enfants survivants (vitest, docker, npx…). Pour le trouver :")
			print(f"        lsof {chemin}")
		elif pid:
			print(f"   Pour tuer le détenteur : kill {pid}")
		sys.exit(2)

	# Se décrire, pour que le prochain refusé sache qui attendre. Purement
	# informatif : l'exclusion, elle, est déjà acquise.
	try:
		os.ftruncate(fd, 0)
		os.write(fd, f"{os.getpid()}\n{os.getcwd()}\n{time.strftime('%H:%M:%S')}\n".encode())
		os.fsync(fd)
	except OSError:
		pass

	# Le verrou doit survivre au exec : Python met FD_CLOEXEC par défaut.
	os.set_inheritable(fd, True)
	try:
		os.execvp(commande[0], commande)
	except FileNotFoundError:
		refuser(f"⛔ Commande introuvable : {commande[0]}")
	except OSError as e:
		refuser(f"⛔ Impossible d'exécuter {commande[0]} ({e}).")


if __name__ == "__main__":
	main()

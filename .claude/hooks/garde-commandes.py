#!/usr/bin/env python3
"""Garde-fou PreToolUse (Bash) : les interdits de CLAUDE.md, appliqués avant la commande.

Sortie 2 + explication sur stderr : Claude Code refuse la commande et renvoie
l'explication au modèle. `demander` rend la main à David pour confirmer : il
complète la liste `ask` de .claude/settings.json, qui fait foi pour les commandes
qui perdent du travail mais ne reconnaît qu'un début de commande.
Tout le reste (sortie 0, rien sur stdout) passe sans bruit. Une entrée illisible
ne bloque jamais : le garde-fou ne doit pas casser la session.

Tests : scripts/__tests__/garde-commandes.test.ts.
"""

import json
import re
import sys


def refuser(raison: str) -> None:
    print(f"⛔ Garde-fou CLAUDE.md : {raison}", file=sys.stderr)
    sys.exit(2)


def demander(raison: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": raison,
                }
            },
            ensure_ascii=False,
        )
    )
    sys.exit(0)


try:
    entree = json.load(sys.stdin)
    commande = entree.get("tool_input", {}).get("command", "") or ""
    dossier = entree.get("cwd", "") or ""
except Exception:
    sys.exit(0)

# `git -C ""` : git reste dans le dossier courant, le dépôt principal (incident du 2026-10-10).
if re.search(r"""\bgit\s+-C\s*(""|'')""", commande):
    refuser('`git -C ""` agit dans le dossier courant, souvent le dépôt principal. Vérifier que le dossier n\'est pas vide.')

# Le texte entre guillemets (messages de commit, corps de PR) n'est pas une commande.
sans_texte = re.sub(r'"(?:\\.|[^"\\])*"|\'[^\']*\'', '""', commande)
segments = [s.strip() for s in re.split(r"&&|\|\||;|\||\n", sans_texte) if s.strip()]


def mot(segment: str) -> str:
    """Le segment sans ses affectations de variables en tête (FORCE=1 …)."""
    return re.sub(r"^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*", "", segment)


for brut in segments:
    s = mot(brut)

    if re.match(r"pnpm\s+(?:run\s+)?check:fast\b", s) or re.search(r"\btsc\b.*--noEmit", s):
        refuser("meurt sur le tas V8 (~4 Go) et donne de faux positifs `$lib`. Utiliser `pnpm check:incremental`.")

    # Seule une EXÉCUTION compte : `npm view svelte-check` ou un grep ne lancent rien.
    lance_svelte_check = re.search(
        r"(?:^|\benv\s.*|\bnpx\s+|\bpnpm\s+(?:exec\s+|dlx\s+)?|\.bin/)svelte-check\b", s
    )
    if lance_svelte_check and "--incremental" not in s and "--tsgo" not in s:
        refuser("`svelte-check` sans `--tsgo` ni `--incremental` meurt sur le tas V8. Utiliser `pnpm check:incremental`.")

    if re.match(r"pnpm\s+(?:run\s+)?dev\b", s):
        if re.search(r"\s--\s", s + " "):
            refuser("le « -- » de `pnpm dev -- --port` fait ignorer le port : le serveur démarre sur 5173, celui de David. Écrire `pnpm dev --port 5175 --strictPort`.")
        port = re.search(r"--port[ =](\d+)", s)
        if not port or "--strictPort" not in s:
            refuser("`pnpm dev` sans `--port 5175 --strictPort` dérive en silence vers un autre port. Dépôt principal : 5175 ; worktree : un port libre à partir de 5176.")
        if port.group(1) == "5173":
            refuser("5173 est le port de David. Prendre 5175 (dépôt principal) ou un port libre à partir de 5176 (worktree).")

    if re.match(r"pnpm\s+(?:run\s+)?kill:servers\b", s) and "ubumaths-wt-" in dossier:
        refuser("`pnpm kill:servers` depuis un worktree tue le serveur de David (5173) et Supabase. Tuer seulement son propre port.")

    if re.match(r"(?:npx\s+)?supabase\s", s + " "):
        refuser("la CLI Supabase du projet se lance par `pnpm exec supabase …` (ou les scripts `pnpm db:*`), jamais directement.")

    if re.match(r"git\s+push\b", s) and "--no-verify" in s:
        refuser("`--no-verify` saute aussi `lint:fast` ; le hook pre-push est léger, il n'y a plus de raison de le contourner.")

    if re.match(r"pnpm\s+(?:run\s+)?release(?::\w+)?\b", s) and "--dry-run" not in s:
        refuser("la version se crée avec la mise en prod : `pnpm deploy:prod`, sur demande explicite de David (ADR 0021).")

    # Commandes qui perdent du travail : la liste `ask` de .claude/settings.json fait
    # foi, mais elle ne voit qu'un début de commande (`git push origin main --force`
    # lui échappe). Ici, l'option est cherchée n'importe où dans la commande git.
    commande_git = re.match(r"git\s+(?:-C\s+\S+\s+)?(\w[\w-]*)\b(.*)", s)
    if commande_git:
        verbe, reste = commande_git.group(1), " " + commande_git.group(2) + " "
        if verbe == "push" and re.search(r"\s(?:--force(?:-with-lease)?(?:=\S*)?|-f)\s", reste):
            demander("push forcé : il réécrit l'historique distant (liste `ask` de .claude/settings.json).")
        if verbe == "branch" and (
            re.search(r"\s-D\s", reste) or (re.search(r"\s--delete\s", reste) and re.search(r"\s--force\s", reste))
        ):
            demander("suppression forcée de branche (`-D`) : elle perd les commits non mergés. Préférer `git branch -d`.")

    # `pnpm deploy:prod` n'est plus soumis à confirmation (décision de David,
    # 2026-10-10) : la règle « seulement sur sa demande explicite » reste dans
    # CLAUDE.md, la fenêtre de confirmation faisait doublon avec elle.

sys.exit(0)

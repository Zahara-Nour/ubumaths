#!/usr/bin/env python3
"""Garde-fou PreToolUse (Bash) : les interdits de CLAUDE.md, appliqués avant la commande.

Sortie 2 + explication sur stderr : Claude Code refuse la commande et renvoie
l'explication au modèle. JSON `permissionDecision: ask` : David confirme.
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

    if re.search(r"\bsvelte-check\b", s) and "--incremental" not in s:
        refuser("`svelte-check` sans `--incremental` meurt sur le tas V8. Utiliser `pnpm check:incremental`.")

    if re.match(r"pnpm\s+(?:run\s+)?dev\b", s):
        if re.search(r"\s--\s", s + " "):
            refuser("le « -- » de `pnpm dev -- --port` fait ignorer le port : le serveur démarre sur 5173, celui de David. Écrire `pnpm dev --port 5175 --strictPort`.")
        port = re.search(r"--port[ =](\d+)", s)
        if not port or "--strictPort" not in s:
            refuser("`pnpm dev` sans `--port 5175 --strictPort` dérive en silence vers un autre port (5177 dans un worktree).")
        if port.group(1) == "5173":
            refuser("5173 est le port de David. Prendre 5175 (5177 dans un worktree).")

    if re.match(r"pnpm\s+(?:run\s+)?kill:servers\b", s) and "ubumaths-wt-" in dossier:
        refuser("`pnpm kill:servers` depuis un worktree tue le serveur de David (5173) et Supabase. Tuer seulement son propre port.")

    if re.match(r"(?:npx\s+)?supabase\s", s + " "):
        refuser("la CLI Supabase du projet se lance par `pnpm exec supabase …` (ou les scripts `pnpm db:*`), jamais directement.")

    if re.match(r"git\s+push\b", s) and "--no-verify" in s:
        refuser("`--no-verify` saute aussi `lint:fast` ; le hook pre-push est léger, il n'y a plus de raison de le contourner.")

    if re.match(r"pnpm\s+(?:run\s+)?release(?::\w+)?\b", s):
        refuser("la version se crée avec la mise en prod : `pnpm deploy:prod`, sur demande explicite de David (ADR 0021).")

    if re.match(r"pnpm\s+(?:run\s+)?deploy:prod\b", s) and "--essai" not in s:
        demander("Mise en prod (version + branche production) : seulement sur demande explicite de David (ADR 0021).")

sys.exit(0)

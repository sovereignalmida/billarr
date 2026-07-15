# Billarr — Claude Code instructions

## Second-review gate (standing process, not a one-off ask)

Before treating any security-relevant fix, auth/permission change, or version-tagged release as
done, run an independent review with the Codex CLI in addition to Claude's own `/code-review` —
don't wait to be asked. Codex is installed and authenticated on this host (`codex login status`).

Run one of:

    codex review --commit <sha>     # a specific commit, e.g. the release commit about to be tagged
    codex review --base main        # everything on this branch since it diverged from main
    codex review --uncommitted      # staged/unstaged/untracked changes not yet committed

Read every finding it reports and either fix it or tell the user explicitly why it's being left
as-is — don't silently drop findings. Both reviews stay in the loop; they catch different things.
This gate exists because a Codex review is what caught the `requireAdmin` JWT-trust bug fixed in
v2.2.1 — Claude's own first pass on that code had not flagged it.

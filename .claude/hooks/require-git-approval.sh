#!/bin/bash
# PreToolUse hook: forces an interactive approval prompt for git commit/push in this repo,
# even if a permissions.allow rule (e.g. in .claude/settings.local.json) would otherwise
# auto-approve the same command. "ask" outranks "allow" in Claude Code's decision precedence
# (deny > defer > ask > allow), so this can't be silently bypassed by a local permission rule.
# See .claude/skills/elite-mobile-git-consent/SKILL.md for the policy this enforces.
cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "This repo requires your explicit, in-the-moment approval for every git commit/push — confirm to proceed."
  }
}
EOF
exit 0

#!/bin/zsh
cd "/Users/lorenzodevicienti/Desktop/Lumen 2.0" || exit 1
python3 -I strumenti/controlla_argomenti.py | tail -3
git add -A && git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
H='credential.helper=!f() { echo username=l0renx0; echo "password=$(sed -nE "s/^    oauth_token: (.*)/\1/p" ~/.config/gh/hosts.yml | head -1)"; }; f'
git -c credential.helper= -c "$H" fetch -q origin && git rebase -q origin/main && git -c credential.helper= -c "$H" push -q origin main && git log --oneline -1

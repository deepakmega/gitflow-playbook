# gitflow-playbook

<div align="center">

**🎯 Interactive CLI coach that teaches and enforces a sane Git/PR workflow** 

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node Version](https://img.shields.io/badge/Node-%3E%3D14-brightgreen)
![npm package](https://img.shields.io/npm/v/gitflow-playbook)

[Quickstart](#quickstart) • [Features](#features) • [Examples](#examples) • [Contributing](#contributing) • [License](#license)

![Demo GIF](./docs/demo.gif)

</div>

---

## Why?

Teams without branching discipline face chaos: **failed CI builds, conflicting PRs, lost code changes, and confusing commit histories**. Even experienced developers aren't aligned on what a good PR looks like.

**gitflow-playbook** fixes this by teaching and enforcing a sane Git workflow in an interactive, judgment-free way.

---

## Install

```bash
npm install -g gitflow-playbook
```

**Requirements:** Node ≥14

---

## Quickstart

Get started in 4 commands:

```bash
# Step 1: Onboard and learn best practices
gitflow-playbook onboard

# Step 2: Check your repo and install git hooks
gitflow-playbook preflight

# Step 3: Install PR + commit templates in your repo
gitflow-playbook templates

# Step 4: View adoption metrics and workflow stats
gitflow-playbook dashboard
```

---

## Features

✅ **Interactive Onboarding** — 6-step wizard teaching branch naming, commit messages, PR descriptions, conflict resolution, and code review best practices  
✅ **Git Hooks** — Auto-validate branch names and commit messages before commits land  
✅ **Smart Templates** — Pre-made PR and commit templates enforcing convention  
✅ **Preflight Checks** — Scan your repo for staging issues, missing CHANGELOGs, and branch compliance  
✅ **Badge System** — Gamified milestones (First Commit, Branch Master, PR Author, etc.) to track workflow adoption  
✅ **Adoption Dashboard** — Real-time metrics showing commit patterns, branch compliance %, and hook status  
✅ **Config File Support** — Customize branch validation patterns and dashboard commit types with `.gitflow-playbookrc.json`  

---

## Examples

### Onboarding Wizard

Launch the interactive workflow guide:

```bash
gitflow-playbook onboard
```

Covers:
- **Step 1** — Branch naming: `feature/*`, `bugfix/*`, `hotfix/*`, `release/*`, etc.
- **Step 2** — Commit message format and best practices
- **Step 3** — Writing effective PR descriptions
- **Step 4** — Resolving merge conflicts
- **Step 5** — Code review guidelines
- **Step 6** — Summary and workflow confirmation

Skip specific steps:
```bash
gitflow-playbook onboard --skip-steps 1,2
```

---

### Preflight Checks

Run validation before commits:

```bash
# Full check + install hooks
gitflow-playbook preflight

# Check only (don't install hooks)
gitflow-playbook preflight --check-only

# Validate current branch naming only
gitflow-playbook preflight --validate-branch
```

Validates:
- ✓ Git repository initialized
- ✓ Branch name matches pattern (`feature/`, `bugfix/`, `hotfix/`, `release/`, `main`, `develop`)
- ✓ Files staged for commit
- ✓ CHANGELOG.md exists and is staged
- ✓ Pre-commit and commit-msg hooks installed

---

### Template Installation

Install project-wide templates:

```bash
# Create templates in .github/
gitflow-playbook templates

# Preview without writing files
gitflow-playbook templates --dry-run
```

Creates:
- `.github/pull_request_template.md` — Enforces PR description structure
- `.github/COMMIT_TEMPLATE.txt` — Guides commit message format
- `CHANGELOG.md` — Tracks releases and changes

---

### Badge System

Track your workflow mastery:

```bash
# Show current progress
gitflow-playbook badges --show-progress

# List all available badges
gitflow-playbook badges --list

# Award yourself a badge (e.g., after first PR)
gitflow-playbook badges --award pr-author

# First PR checklist
gitflow-playbook badges --first-pr-checklist
```

**Badges to earn:**
- 🎯 **First Commit** — Made your first commit
- 🌿 **Branch Master** — Created first properly named branch
- 📝 **PR Author** — Opened your first Pull Request
- 👀 **Code Reviewer** — Reviewed your first PR
- 📚 **Changelog Keeper** — Updated changelog 5+ times
- 💬 **Commit Message Pro** — Written 10 well-formatted messages

---

### Dashboard

View adoption metrics:

```bash
gitflow-playbook dashboard
```

Shows:
- **Adoption Score** — 0–100 overall workflow compliance
- **Commits** — Total count, breakdown by type (feat, fix, docs, etc.), recent commits
- **Branches** — Total, naming compliance %, branch list
- **Git Hooks** — Status of pre-commit and commit-msg hooks
- **PR Template** — Whether template exists and PR reference count

---

## How Branch Naming Works

Valid patterns follow **gitflow**:

| Pattern | Use | Example |
|---------|-----|---------|
| `feature/*` | New features | `feature/user-authentication` |
| `bugfix/*` | Bug fixes | `bugfix/login-crash` |
| `hotfix/*` | Critical prod fixes | `hotfix/payment-error` |
| `release/*` | Release prep | `release/1.0.0` |
| `main` | Production-ready | (branch name) |
| `develop` | Integration branch | (branch name) |

**Invalid:** `master`, `my-work`, `wip`, `temp`, etc.

---

## Commit Message Format

Keep commit messages clear and searchable:

```
<type>: <subject>

<optional body explaining why>

Fixes #123
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Rules:**
- Imperative mood: "add" not "added"
- Subject ≤ 50 characters
- No period at end of subject
- Reference issues: `Fixes #123`, `Closes #456`

**Good examples:**
```
feat: add user authentication module
fix: resolve race condition in cache update
docs: update API documentation
test: add unit tests for email validation
```

---

## Git Hooks

Running `gitflow-playbook preflight` installs two hooks:

### `.git/hooks/pre-commit`
Validates branch name before each commit.

Fails if branch doesn't match `feature/`, `bugfix/`, `hotfix/`, `release/`, `main`, or `develop`.

### `.git/hooks/commit-msg`
Validates commit message before finalizing.

Checks:
- Message is not empty
- Message is at least 5 characters
- Message format is reasonable

---

## Roadmap

- 🎯 **Team leaderboards** — See who's earning badges fastest (optional analytics)
- 🎯 **CI/CD integration** — Fail builds that violate branch or commit rules
- 🎯 **Slack/Discord notifications** — Badge achievements and workflow milestones

---

## Configuration

Create `.gitflow-playbookrc.json` in your repository root to override defaults:

```json
{
  "branchPatterns": ["^feature/.+$", "^bugfix/.+$", "^main$"],
  "commitTypes": ["feat", "fix", "docs", "chore", "test"]
}
```

- `branchPatterns`: regex strings used by `preflight` branch checks and installed `pre-commit` hook
- `commitTypes`: prefixes used by `dashboard` commit compliance metrics

---

## Contributing

**Branch naming:** Please follow the same rules you'd teach others!

```bash
git checkout -b feature/your-feature-name
git commit -m "feat: describe what you added"
git push origin feature/your-feature-name
```

**Before submitting a PR:**
1. Run `npm test` locally
2. Update `CHANGELOG.md` under `[Unreleased]`
3. Ensure branch follows naming rules
4. Write a clear PR description explaining the why

**PR template:** See `.github/pull_request_template.md` for the full checklist.

---

## License

MIT © gitflow-playbook contributors

See [LICENSE](./LICENSE) for details.

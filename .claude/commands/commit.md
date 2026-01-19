# Commit Changes

Create a git commit for the current staged and unstaged changes.

## Process

1. **Gather Information** - Run these commands in parallel:
   - `git status` to see all modified and untracked files
   - `git diff` to see unstaged changes
   - `git diff --staged` to see staged changes
   - `git log --oneline -5` to understand the commit message style

2. **Analyze Changes** - Review all changes and understand:
   - What files were modified
   - The nature of the changes (new feature, bug fix, refactor, docs, perf, etc.)
   - The purpose and impact of the changes

3. **Draft Commit Message** - Create a commit message that:
   - Uses conventional commit format: `type: description`
   - Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `chore`
   - Focuses on the "why" rather than the "what"
   - Is concise (1-2 sentences for the main message)
   - Adds a body if the changes are complex

4. **Create the Commit** - Stage and commit the changes:

   ```bash
   git add <relevant files>
   git commit -m "$(cat <<'EOF'
   type: concise description
   EOF
   )"
   ```

5. **Verify** - Run `git status` to confirm the commit was created successfully.

## Arguments

$ARGUMENTS

If arguments are provided, use them to guide the commit (e.g., specific files to include, commit type hints).

## Rules

- Never commit files that likely contain secrets (.env, credentials, etc.)
- Never use `--amend` unless explicitly requested
- Never push unless explicitly requested
- If there are no changes to commit, inform the user

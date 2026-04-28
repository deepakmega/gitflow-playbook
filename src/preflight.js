import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import {
  DEFAULT_PLAYBOOK_CONFIG,
  loadPlaybookConfig,
  toRegexList,
} from './config.js';

function findGitRoot() {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return result;
  } catch (error) {
    return null;
  }
}

function checkGitRepository(gitRoot = null) {
  if (!gitRoot) {
    console.error(chalk.red('✗ Not a git repository'));
    return false;
  }

  const gitDir = path.join(gitRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    console.error(chalk.red('✗ .git directory not found'));
    return false;
  }

  console.log(chalk.green('✓ Git repository detected'));
  return true;
}

function checkBranch(playbookConfig = DEFAULT_PLAYBOOK_CONFIG) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const regexPatterns = toRegexList(playbookConfig.branchPatterns);
    const isValid = regexPatterns.some((pattern) => pattern.test(branch));

    const result = {
      isValid,
      branch,
      pattern: isValid ? 'matches gitflow pattern' : 'does not match gitflow pattern',
    };

    if (isValid) {
      console.log(chalk.green(`✓ Branch '${branch}' is valid`));
    } else {
      console.error(
        chalk.red(
          `✗ Branch '${branch}' does not match gitflow pattern. Valid patterns: ${playbookConfig.branchPatterns.join(', ')}`
        )
      );
    }

    return result;
  } catch (error) {
    console.error(chalk.red('✗ Failed to get current branch'));
    return { isValid: false, branch: null, pattern: 'error' };
  }
}

function checkStagedFiles() {
  try {
    const stagedOutput = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const stagedFiles = stagedOutput ? stagedOutput.split('\n') : [];
    const count = stagedFiles.length;

    if (count === 0) {
      console.error(chalk.red('✗ No files staged for commit'));
      return { count: 0, files: [], hasStaged: false };
    }

    console.log(chalk.green(`✓ ${count} file(s) staged for commit`));
    stagedFiles.forEach((file) => {
      console.log(chalk.blue(`  - ${file}`));
    });

    return { count, files: stagedFiles, hasStaged: true };
  } catch (error) {
    console.error(chalk.red('✗ Failed to get staged files'));
    return { count: 0, files: [], hasStaged: false };
  }
}

function checkChangelog(gitRoot = null) {
  if (!gitRoot) {
    console.error(chalk.red('✗ Failed to determine git root'));
    return { exists: false, isStaged: false, valid: false };
  }

  try {
    const changelogPath = path.join(gitRoot, 'CHANGELOG.md');
    const changelogExists = fs.existsSync(changelogPath);

    if (!changelogExists) {
      console.log(chalk.yellow('⚠ CHANGELOG.md not found'));
      return { exists: false, isStaged: false, valid: true };
    }

    const stagedOutput = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const stagedFiles = stagedOutput ? stagedOutput.split('\n') : [];
    const isStaged = stagedFiles.includes('CHANGELOG.md');

    if (isStaged) {
      console.log(chalk.green('✓ CHANGELOG.md is staged'));
    } else {
      console.error(chalk.red('✗ CHANGELOG.md exists but is not staged'));
    }

    return { exists: true, isStaged, valid: isStaged };
  } catch (error) {
    console.error(chalk.red('✗ Failed to check CHANGELOG.md'));
    return { exists: false, isStaged: false, valid: false };
  }
}

function createPreCommitHook(gitRoot, playbookConfig = DEFAULT_PLAYBOOK_CONFIG) {
  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const validPatterns = playbookConfig.branchPatterns
    .map((pattern) => `  "${pattern}"`)
    .join('\n');

  const hookContent = `#!/bin/bash
# Pre-commit hook: validate branch name
set -e

BRANCH=$(git rev-parse --abbrev-ref HEAD)

VALID_PATTERNS=(
${validPatterns}
)

IS_VALID=false
for pattern in "\${VALID_PATTERNS[@]}"; do
  if [[ $BRANCH =~ $pattern ]]; then
    IS_VALID=true
    break
  fi
done

if [ "$IS_VALID" = false ]; then
  echo "✗ Branch '$BRANCH' does not match gitflow pattern"
  echo "Valid patterns: ${playbookConfig.branchPatterns.join(', ')}"
  exit 1
fi

echo "✓ Branch validation passed"
exit 0
`;

  try {
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    fs.writeFileSync(preCommitPath, hookContent, { mode: 0o755 });
    console.log(chalk.green('✓ Created .git/hooks/pre-commit'));
    return true;
  } catch (error) {
    console.error(
      chalk.red(`✗ Failed to create pre-commit hook: ${error.message}`)
    );
    return false;
  }
}

function createCommitMsgHook(gitRoot) {
  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  const commitMsgPath = path.join(hooksDir, 'commit-msg');

  const hookContent = `#!/bin/bash
# Commit-msg hook: validate message format
set -e

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Check that commit message is not empty
if [ -z "$(echo "$COMMIT_MSG" | grep -v '^#')" ]; then
  echo "✗ Commit message cannot be empty"
  exit 1
fi

# Check minimum length (at least 5 characters, excluding comments)
MSG_LENGTH=$(echo "$COMMIT_MSG" | grep -v '^#' | wc -c)
if [ "$MSG_LENGTH" -lt 5 ]; then
  echo "✗ Commit message must be at least 5 characters"
  exit 1
fi

echo "✓ Commit message validation passed"
exit 0
`;

  try {
    const hooksDir = path.join(GIT_ROOT, '.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    fs.writeFileSync(commitMsgPath, hookContent, { mode: 0o755 });
    console.log(chalk.green('✓ Created .git/hooks/commit-msg'));
    return true;
  } catch (error) {
    console.error(
      chalk.red(`✗ Failed to create commit-msg hook: ${error.message}`)
    );
    return false;
  }
}

async function runPreflight(options = {}) {
  const {
    checkOnly = false,
    validateBranch = false,
  } = options;

  console.log(chalk.cyan('\n🔍 Running preflight checks...\n'));
  const gitRoot = findGitRoot();

  // Check if in git repository
  if (!checkGitRepository(gitRoot)) {
    process.exit(1);
  }

  const { config, path: configPath, error: configError } = loadPlaybookConfig({
    cwd: gitRoot,
    gitRoot,
  });

  if (configPath && !configError) {
    console.log(chalk.green(`✓ Loaded config: ${configPath}`));
  } else if (configError) {
    console.log(chalk.yellow(`⚠ ${configError}`));
  }

  let allChecksValid = true;

  // Check branch
  const branchCheck = checkBranch(config);
  if (!branchCheck.isValid) {
    allChecksValid = false;
  }

  // If only validating branch, stop here
  if (validateBranch) {
    if (allChecksValid) {
      console.log(chalk.green('\n✅ All checks passed\n'));
      process.exit(0);
    } else {
      console.log(chalk.red('\n❌ Checks failed\n'));
      process.exit(1);
    }
  }

  // Check staged files
  const stagedCheck = checkStagedFiles();
  if (!stagedCheck.hasStaged) {
    allChecksValid = false;
  }

  // Check changelog
  const changelogCheck = checkChangelog(gitRoot);
  if (!changelogCheck.valid) {
    allChecksValid = false;
  }

  // Install hooks if not check-only
  if (!checkOnly) {
    console.log(chalk.cyan('\n📦 Installing git hooks...\n'));
    const preCommitSuccess = createPreCommitHook(gitRoot, config);
    const commitMsgSuccess = createCommitMsgHook(gitRoot);

    if (!preCommitSuccess || !commitMsgSuccess) {
      allChecksValid = false;
    }
  } else {
    console.log(chalk.cyan('\n⊘ Skipping hook installation (--check-only)\n'));
  }

  // Final result
  console.log('');
  if (allChecksValid) {
    console.log(chalk.green('✅ All checks passed\n'));
    process.exit(0);
  } else {
    console.log(chalk.red('❌ Some checks failed\n'));
    process.exit(1);
  }
}

export {
  runPreflight,
  checkBranch,
  checkStagedFiles,
  checkChangelog,
  findGitRoot,
};

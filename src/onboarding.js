import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = path.join(homedir(), '.gitflow-playbook-config.json');

const BRANCH_PATTERNS = [
  { name: 'feature/* - For new features', value: 'feature' },
  { name: 'bugfix/* - For bug fixes', value: 'bugfix' },
  { name: 'hotfix/* - For critical production fixes', value: 'hotfix' },
  { name: 'chore/* - For maintenance/refactoring', value: 'chore' },
  { name: 'docs/* - For documentation updates', value: 'docs' },
  { name: 'refactor/* - For code refactoring', value: 'refactor' },
];

const MERGE_CONFLICT_EXAMPLE = `
${chalk.yellow('═══════════════════════════════════════════')}
${chalk.yellow('MERGE CONFLICT EXAMPLE')}
${chalk.yellow('═══════════════════════════════════════════')}

When two branches modify the same lines, Git creates a conflict:

${chalk.red('<<<<<<< HEAD')}
${chalk.red('  const greeting = "Hello from main branch";')}
${chalk.yellow('||||||| merged common ancestors')}
${chalk.yellow('  const greeting = "Hello";')}
${chalk.green('=======')}
${chalk.green('  const greeting = "Hi from feature branch";')}
${chalk.red('>>>>>>> feature/greeting-update')}

${chalk.cyan('How to resolve:')}
1. ${chalk.white('Decide which version to keep (or merge both)')}
2. ${chalk.white('Remove conflict markers (<<<<<<<, =======, >>>>>>>')}
3. ${chalk.white('Stage the resolved file: git add file.js')}
4. ${chalk.white('Complete the merge: git commit -m "Merge feature/greeting-update"')}
5. ${chalk.white('Push the result: git push origin main')}

${chalk.cyan('Prevention tips:')}
${chalk.gray('• Keep branches focused on single features')}
${chalk.gray('• Pull latest changes before starting work')}
${chalk.gray('• Communicate with team on areas being modified')}
${chalk.gray('• Merge small PRs frequently to reduce conflicts')}
`;

const CODE_REVIEW_GUIDELINES = `
${chalk.blue('═══════════════════════════════════════════')}
${chalk.blue('CODE REVIEW BEST PRACTICES')}
${chalk.blue('═══════════════════════════════════════════')}

${chalk.cyan('When Requesting a Review:')}
✓ ${chalk.white('Provide context in PR description')}
✓ ${chalk.white('Keep commits focused and atomic')}
✓ ${chalk.white('Test locally before pushing')}
✓ ${chalk.white('Reference related issues (Closes #123)')}
✓ ${chalk.white('Add screenshots/diffs for UI changes')}

${chalk.cyan('When Reviewing Code:')}
✓ ${chalk.white('Be respectful and constructive')}
✓ ${chalk.white('Focus on logic, not personal style')}
✓ ${chalk.white('Suggest improvements, not demands')}
✓ ${chalk.white('Approve when satisfied (don\'t bike-shed)')}
✓ ${chalk.white('Comment on good patterns too')}

${chalk.cyan('Common Issues to Look For:')}
${chalk.gray('• Logic errors or edge case handling')}
${chalk.gray('• Performance implications')}
${chalk.gray('• Security vulnerabilities')}
${chalk.gray('• Proper error handling')}
${chalk.gray('• Test coverage for new code')}
${chalk.gray('• Documentation and comments')}

${chalk.cyan('Example Review Comment:')}
${chalk.yellow('Instead of:')} "This is wrong"
${chalk.yellow('Try:')} "This handles the happy path, but what if user is null?"
`;

export function validateBranchName(input, pattern) {
  const branchRegex = {
    feature: /^feature\/[a-z0-9\-]+$/,
    bugfix: /^bugfix\/[a-z0-9\-]+$/,
    hotfix: /^hotfix\/[a-z0-9\-]+$/,
    chore: /^chore\/[a-z0-9\-]+$/,
    docs: /^docs\/[a-z0-9\-]+$/,
    refactor: /^refactor\/[a-z0-9\-]+$/,
  };

  if (!input) return 'Branch name is required';
  if (!branchRegex[pattern]?.test(input)) {
    return `Invalid format. Use ${pattern}/<description> (lowercase, hyphens only). Example: ${pattern}/user-auth-fix`;
  }
  return true;
}

export function validateCommitMessage(input) {
  if (!input || input.trim().length === 0) {
    return 'Commit message is required';
  }
  if (input.length < 10) {
    return 'Commit message must be at least 10 characters';
  }
  if (input.length > 72) {
    return 'First line should be 72 characters or less';
  }
  if (!/^[A-Z]/.test(input)) {
    return 'Start with a capital letter';
  }
  if (/\.$/.test(input)) {
    return 'Do not end with a period';
  }
  return true;
}

export function validatePRTitle(input) {
  if (!input || input.trim().length === 0) {
    return 'PR title is required';
  }
  if (input.length < 5) {
    return 'PR title should be at least 5 characters';
  }
  if (input.length > 100) {
    return 'PR title should be 100 characters or less';
  }
  return true;
}

export function validatePRDescription(input) {
  if (!input || input.trim().length === 0) {
    return 'PR description is required';
  }
  if (input.length < 20) {
    return 'Description should be at least 20 characters (explain what & why)';
  }
  return true;
}

async function step1BranchNaming() {
  console.log(chalk.cyan('\n═══════════════════════════════════════════'));
  console.log(chalk.cyan('STEP 1: BRANCH NAMING CONVENTIONS'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.gray('Good branch names make history readable and help organize work.\n'));

  const { branchType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'branchType',
      message: 'What type of work are you doing?',
      choices: BRANCH_PATTERNS,
    },
  ]);

  const { branchName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'branchName',
      message: `Enter your branch name (format: ${branchType}/<description>):`,
      default: `${branchType}/my-feature`,
      validate: (input) => validateBranchName(input, branchType),
    },
  ]);

  console.log(chalk.green(`✓ Valid branch name: ${branchName}\n`));

  return { branchType, branchName };
}

async function step2CommitMessage() {
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.cyan('STEP 2: COMMIT MESSAGES'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.gray('Good commit messages explain what changed and why.\n'));
  console.log(chalk.yellow('Example commits:'));
  console.log(chalk.gray('  ✓ Fix null pointer exception in user service'));
  console.log(chalk.gray('  ✓ Add password validation to signup form'));
  console.log(chalk.gray('  ✗ asdf (too vague)'));
  console.log(chalk.gray('  ✗ Fix stuff (unclear)\n'));

  const { commitMessage } = await inquirer.prompt([
    {
      type: 'input',
      name: 'commitMessage',
      message: 'Enter your commit message:',
      validate: validateCommitMessage,
    },
  ]);

  console.log(chalk.green(`✓ Good commit message: "${commitMessage}"\n`));

  return { commitMessage };
}

async function step3PRDescription() {
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.cyan('STEP 3: PULL REQUEST DESCRIPTIONS'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.gray('PR descriptions help reviewers understand your changes.\n'));
  console.log(chalk.yellow('Good PR description includes:'));
  console.log(chalk.gray('  • What problem does this solve?'));
  console.log(chalk.gray('  • How does your solution work?'));
  console.log(chalk.gray('  • Are there any breaking changes?'));
  console.log(chalk.gray('  • Related issues (Closes #123)\n'));

  const { prTitle } = await inquirer.prompt([
    {
      type: 'input',
      name: 'prTitle',
      message: 'PR Title:',
      default: 'Add user authentication',
      validate: validatePRTitle,
    },
  ]);

  const { prDescription } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'prDescription',
      message: 'PR Description (opens editor):',
      validate: validatePRDescription,
    },
  ]);

  console.log(chalk.green('✓ PR description recorded\n'));

  return { prTitle, prDescription };
}

async function step4ConflictResolution() {
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.cyan('STEP 4: MERGE CONFLICTS'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));

  console.log(MERGE_CONFLICT_EXAMPLE);

  const { understood } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'understood',
      message: 'Do you understand how to resolve merge conflicts?',
      default: true,
    },
  ]);

  if (!understood) {
    console.log(chalk.yellow('\nLet\'s review with a practical example:'));
    console.log(chalk.white('When you git pull and get conflicts:'));
    console.log(chalk.gray('  1. Open conflicted files in your editor'));
    console.log(chalk.gray('  2. Find <<<<<<< HEAD markers'));
    console.log(chalk.gray('  3. Decide which version to keep'));
    console.log(chalk.gray('  4. Delete conflict markers'));
    console.log(chalk.gray('  5. Test and commit your resolution\n'));
  }

  return { conflictResolutionUnderstood: understood };
}

async function step5CodeReview() {
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.cyan('STEP 5: CODE REVIEW GUIDELINES'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));

  console.log(CODE_REVIEW_GUIDELINES);

  const { reviewExperience } = await inquirer.prompt([
    {
      type: 'list',
      name: 'reviewExperience',
      message: 'What is your code review experience level?',
      choices: [
        { name: 'Beginner - First time code reviewing', value: 'beginner' },
        { name: 'Intermediate - Done a few reviews', value: 'intermediate' },
        { name: 'Advanced - Regular code reviewer', value: 'advanced' },
      ],
    },
  ]);

  const { commitToReview } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'commitToReview',
      message: 'Will you commit to reviewing others\' PRs thoroughly?',
      default: true,
    },
  ]);

  return { reviewExperience, commitToReview };
}

async function step6Summary(collectedData) {
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.cyan('STEP 6: SUMMARY AND NEXT STEPS'));
  console.log(chalk.cyan('═══════════════════════════════════════════\n'));

  console.log(chalk.green('✓ ONBOARDING COMPLETE!\n'));

  console.log(chalk.white('Your Git/PR workflow profile:'));
  console.log(chalk.gray('  Branch Strategy:'), collectedData.step1.branchType);
  console.log(chalk.gray('  Preferred Branch:'), collectedData.step1.branchName);
  console.log(chalk.gray('  Review Level:'), collectedData.step5.reviewExperience);

  console.log(chalk.white('\nNext steps:'));
  console.log(chalk.gray('  1. Create your first branch:'));
  console.log(chalk.yellow(`     git checkout -b ${collectedData.step1.branchName}`));
  console.log(chalk.gray('  2. Make your changes and commit:'));
  console.log(chalk.yellow(`     git commit -m "${collectedData.step2.commitMessage}"`));
  console.log(chalk.gray('  3. Push and create a PR on GitHub'));
  console.log(chalk.gray('  4. Ask team members to review'));
  console.log(chalk.gray('  5. Address feedback and merge\n'));

  console.log(chalk.cyan('Resources:'));
  console.log(chalk.gray('  • Git Documentation: https://git-scm.com/doc'));
  console.log(chalk.gray('  • GitHub Flow: https://guides.github.com/introduction/flow'));
  console.log(chalk.gray('  • Conventional Commits: https://www.conventionalcommits.org\n'));

  const { readyToProceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'readyToProceed',
      message: 'Ready to start your Git/PR workflow journey?',
      default: true,
    },
  ]);

  return { readyToProceed, completedAt: new Date().toISOString() };
}

function saveConfig(data) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    console.log(chalk.green(`✓ Configuration saved to ${CONFIG_PATH}\n`));
    return true;
  } catch (error) {
    console.error(chalk.red(`✗ Failed to save config: ${error.message}`));
    return false;
  }
}

function shouldSkipStep(stepNumber, skipSteps) {
  if (!skipSteps) return false;
  const stepsToSkip = skipSteps.split(',').map((s) => s.trim());
  return stepsToSkip.includes(String(stepNumber));
}

export async function runOnboarding(options = {}) {
  const { skipSteps } = options;

  console.log(chalk.bold.blue('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║   Git/PR Workflow Onboarding Wizard                         ║'));
  console.log(chalk.bold.blue('║   Learn best practices for collaborative development        ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════════════════════════╝\n'));

  const collectedData = {
    startedAt: new Date().toISOString(),
    step1: null,
    step2: null,
    step3: null,
    step4: null,
    step5: null,
    step6: null,
  };

  // Step 1: Branch Naming
  if (!shouldSkipStep(1, skipSteps)) {
    collectedData.step1 = await step1BranchNaming();
  } else {
    console.log(chalk.yellow('⊘ Skipped Step 1: Branch Naming'));
    collectedData.step1 = { branchType: 'feature', branchName: 'feature/skipped' };
  }

  // Step 2: Commit Message
  if (!shouldSkipStep(2, skipSteps)) {
    collectedData.step2 = await step2CommitMessage();
  } else {
    console.log(chalk.yellow('⊘ Skipped Step 2: Commit Messages'));
    collectedData.step2 = { commitMessage: 'Example commit message' };
  }

  // Step 3: PR Description
  if (!shouldSkipStep(3, skipSteps)) {
    collectedData.step3 = await step3PRDescription();
  } else {
    console.log(chalk.yellow('⊘ Skipped Step 3: PR Descriptions'));
    collectedData.step3 = { prTitle: 'Example PR', prDescription: 'Example description' };
  }

  // Step 4: Conflict Resolution
  if (!shouldSkipStep(4, skipSteps)) {
    collectedData.step4 = await step4ConflictResolution();
  } else {
    console.log(chalk.yellow('⊘ Skipped Step 4: Merge Conflicts'));
    collectedData.step4 = { conflictResolutionUnderstood: true };
  }

  // Step 5: Code Review
  if (!shouldSkipStep(5, skipSteps)) {
    collectedData.step5 = await step5CodeReview();
  } else {
    console.log(chalk.yellow('⊘ Skipped Step 5: Code Review Guidelines'));
    collectedData.step5 = { reviewExperience: 'intermediate', commitToReview: true };
  }

  // Step 6: Summary
  if (!shouldSkipStep(6, skipSteps)) {
    collectedData.step6 = await step6Summary(collectedData);
  } else {
    console.log(chalk.yellow('⊘ Skipped Step 6: Summary'));
    collectedData.step6 = { readyToProceed: true, completedAt: new Date().toISOString() };
  }

  // Save configuration
  saveConfig(collectedData);

  return {
    success: true,
    message: 'Onboarding completed successfully',
    data: collectedData,
    configPath: CONFIG_PATH,
  };
}

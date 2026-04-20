import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the path to the progress file
 */
function getProgressFile() {
  return path.join(homedir(), '.gitflow-playbook-progress.json');
}

// Define all available badges
const ALL_BADGES = [
  {
    id: 'first-commit',
    name: '🎯 First Commit',
    description: 'Made your first commit',
    emoji: '🎯',
  },
  {
    id: 'branch-master',
    name: '🌿 Branch Master',
    description: 'Created first properly named branch (feature/, bugfix/, etc.)',
    emoji: '🌿',
  },
  {
    id: 'pr-author',
    name: '📝 PR Author',
    description: 'Opened your first Pull Request',
    emoji: '📝',
  },
  {
    id: 'pr-reviewer',
    name: '👀 Code Reviewer',
    description: 'Reviewed your first Pull Request',
    emoji: '👀',
  },
  {
    id: 'changelog-keeper',
    name: '📚 Changelog Keeper',
    description: 'Updated changelog 5+ times',
    emoji: '📚',
  },
  {
    id: 'commit-message-pro',
    name: '💬 Commit Message Pro',
    description: 'Written 10 well-formatted commit messages',
    emoji: '💬',
  },
];

/**
 * Load progress data from file, creating it if necessary
 */
export async function loadProgress() {
  try {
    const data = await fs.readFile(getProgressFile(), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { badges: [], earnedCount: 0, createdAt: new Date().toISOString() };
    }
    throw error;
  }
}

/**
 * Save progress data to file
 */
export async function saveProgress(progress) {
  await fs.writeFile(getProgressFile(), JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Award a badge to the user
 * @param {string} badgeId - The ID of the badge to award
 * @returns {Promise<Object>} The awarded badge object
 */
export async function awardBadge(badgeId) {
  const badge = ALL_BADGES.find((b) => b.id === badgeId);
  if (!badge) {
    throw new Error(`Badge "${badgeId}" not found`);
  }

  const progress = await loadProgress();

  // Check if badge already earned
  const alreadyEarned = progress.badges.some((b) => b.id === badgeId);
  if (alreadyEarned) {
    console.log(chalk.yellow(`⚠️  Badge "${badge.name}" already earned!`));
    return badge;
  }

  // Add badge to progress
  progress.badges.push({
    id: badgeId,
    name: badge.name,
    emoji: badge.emoji,
    earnedAt: new Date().toISOString(),
  });
  progress.earnedCount = progress.badges.length;

  await saveProgress(progress);

  console.log(chalk.green(`✨ Congratulations! You've earned: ${badge.emoji} ${badge.name}`));
  console.log(chalk.dim(badge.description));

  return badge;
}

/**
 * Show current progress and earned badges
 */
export async function showProgress() {
  const progress = await loadProgress();
  const completionPercentage = Math.round((progress.earnedCount / ALL_BADGES.length) * 100);

  console.log(chalk.bold.cyan('\n🏆 Your Progress\n'));

  // Display earned badges
  if (progress.badges.length > 0) {
    console.log(chalk.green.bold('✓ Earned Badges:'));
    progress.badges.forEach((badge) => {
      const earnedDate = new Date(badge.earnedAt).toLocaleDateString();
      console.log(chalk.green(`  ${badge.emoji} ${badge.name} (${earnedDate})`));
    });
    console.log('');
  }

  // Display progress bar
  const filled = Math.round((completionPercentage / 100) * 20);
  const empty = 20 - filled;
  const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
  console.log(
    chalk.cyan(`Progress: [${progressBar}] ${completionPercentage}% (${progress.earnedCount}/${ALL_BADGES.length})`)
  );
  console.log('');

  // Display available badges
  const availableBadges = ALL_BADGES.filter((badge) => !progress.badges.some((b) => b.id === badge.id));
  if (availableBadges.length > 0) {
    console.log(chalk.yellow.bold('🔓 Available Badges:'));
    availableBadges.forEach((badge) => {
      console.log(chalk.dim(`  ${badge.emoji} ${badge.name}`));
      console.log(chalk.dim(`      ${badge.description}`));
    });
  } else {
    console.log(chalk.magenta.bold('🎉 You have earned all badges!'));
  }
  console.log('');
}

/**
 * Show all available badges with earned/not earned status
 */
export async function showBadges() {
  const progress = await loadProgress();
  const earnedIds = new Set(progress.badges.map((b) => b.id));

  console.log(chalk.bold.cyan('\n🎖️  All Available Badges\n'));

  ALL_BADGES.forEach((badge, index) => {
    const isEarned = earnedIds.has(badge.id);
    const status = isEarned ? chalk.green('✓ EARNED') : chalk.gray('◯ LOCKED');
    const nameDisplay = isEarned ? chalk.green(badge.name) : chalk.gray(badge.name);

    console.log(`${index + 1}. ${status} ${badge.emoji} ${nameDisplay}`);
    console.log(chalk.dim(`   ${badge.description}`));

    if (isEarned) {
      const earnedDate = progress.badges.find((b) => b.id === badge.id)?.earnedAt;
      if (earnedDate) {
        console.log(chalk.cyan(`   Earned: ${new Date(earnedDate).toLocaleString()}`));
      }
    }
    console.log('');
  });
}

/**
 * Show first PR checklist
 */
export function firstPRChecklist() {
  const checklist = [
    {
      task: 'Create a feature branch with proper naming',
      details: 'Use format: feature/your-feature-name or bugfix/issue-name',
      completed: false,
    },
    {
      task: 'Make meaningful commits',
      details: 'Each commit should have a clear, descriptive message (50 char summary)',
      completed: false,
    },
    {
      task: 'Add unit tests if applicable',
      details: 'Tests should cover your changes and not break existing tests',
      completed: false,
    },
    {
      task: 'Update documentation',
      details: 'Add/update README or relevant docs to reflect your changes',
      completed: false,
    },
    {
      task: 'Run all tests locally',
      details: 'Ensure no tests fail before pushing',
      completed: false,
    },
    {
      task: 'Rebase or squash commits if needed',
      details: 'Keep commit history clean and logical',
      completed: false,
    },
    {
      task: 'Write a clear PR description',
      details: 'Explain what changed and why; reference any related issues',
      completed: false,
    },
    {
      task: 'Request at least one reviewer',
      details: 'Choose a maintainer or experienced team member',
      completed: false,
    },
  ];

  console.log(chalk.bold.cyan('\n📋 First PR Checklist\n'));
  console.log(chalk.dim('Complete these items before opening your first PR:\n'));

  checklist.forEach((item, index) => {
    const checkbox = item.completed ? chalk.green('✓') : chalk.gray('□');
    console.log(`  ${checkbox} ${chalk.bold(item.task)}`);
    console.log(chalk.dim(`     ${item.details}\n`));
  });

  return checklist;
}



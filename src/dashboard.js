import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

async function showDashboard(cwd) {
  const gitDir = join(cwd, '.git');
  
  // Gracefully handle missing .git directory
  if (!existsSync(gitDir)) {
    console.log(chalk.yellow('⚠️  Not a git repository. Initialize git first.'));
    return {
      isGitRepo: false,
      adoptionScore: 0,
    };
  }

  try {
    const metrics = {
      commits: analyzeCommits(cwd),
      branches: analyzeBranches(cwd),
      hooks: checkGitHooks(cwd),
      prTemplate: checkPRTemplate(cwd),
    };

    displayDashboard(metrics);
    return {
      isGitRepo: true,
      ...metrics,
      adoptionScore: calculateAdoptionScore(metrics),
    };
  } catch (error) {
    console.error(chalk.red('Error analyzing repository:'), error.message);
    return {
      isGitRepo: true,
      error: error.message,
      adoptionScore: 0,
    };
  }
}

function analyzeCommits(cwd) {
  try {
    const log = execSync('git log --oneline --all', { cwd, encoding: 'utf-8' });
    const lines = log.trim().split('\n').filter(Boolean);
    const totalCommits = lines.length;

    const prefixCounts = {};
    const prefixPatterns = ['feature', 'bugfix', 'hotfix', 'docs', 'style', 'refactor', 'test', 'chore'];
    
    // Initialize all prefixes
    prefixPatterns.forEach(p => {
      prefixCounts[p] = 0;
    });
    prefixCounts['other'] = 0;

    // Parse commits by prefix
    lines.forEach(line => {
      const match = line.match(/^\w+\s+(.+?)(\(.+?\))?:\s*/);
      if (match) {
        const prefix = match[1].toLowerCase();
        if (prefixCounts.hasOwnProperty(prefix)) {
          prefixCounts[prefix]++;
        } else {
          prefixCounts['other']++;
        }
      } else {
        prefixCounts['other']++;
      }
    });

    // Get recent commits
    const recentCommits = lines.slice(0, 5).map(line => {
      const parts = line.split(' ');
      const hash = parts[0];
      const message = parts.slice(1).join(' ');
      return { hash: hash.substring(0, 7), message };
    });

    return {
      total: totalCommits,
      byPrefix: prefixCounts,
      recent: recentCommits,
    };
  } catch (error) {
    return {
      total: 0,
      byPrefix: {},
      recent: [],
      error: error.message,
    };
  }
}

function analyzeBranches(cwd) {
  try {
    const branchOutput = execSync('git branch -a', { cwd, encoding: 'utf-8' });
    const branches = branchOutput
      .trim()
      .split('\n')
      .map(b => b.replace(/^\*\s+/, '').trim())
      .filter(Boolean)
      .filter(b => !b.startsWith('remotes/'));

    const validPattern = /^(main|master|develop|feature\/|bugfix\/|hotfix\/|release\/)/;
    let validCount = 0;

    branches.forEach(branch => {
      if (validPattern.test(branch)) {
        validCount++;
      }
    });

    const compliancePercent = branches.length > 0 
      ? Math.round((validCount / branches.length) * 100)
      : 100;

    return {
      total: branches.length,
      compliant: validCount,
      compliancePercent,
      branches: branches.slice(0, 10),
    };
  } catch (error) {
    return {
      total: 0,
      compliant: 0,
      compliancePercent: 0,
      branches: [],
      error: error.message,
    };
  }
}

function checkGitHooks(cwd) {
  const hooksDir = join(cwd, '.git', 'hooks');
  const preCommit = join(hooksDir, 'pre-commit');
  const commitMsg = join(hooksDir, 'commit-msg');

  return {
    preCommitExists: existsSync(preCommit),
    commitMsgExists: existsSync(commitMsg),
    preCommitExecutable: checkExecutable(preCommit),
    commitMsgExecutable: checkExecutable(commitMsg),
  };
}

function checkExecutable(filePath) {
  if (!existsSync(filePath)) return false;
  try {
    const stats = statSync(filePath);
    return (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function checkPRTemplate(cwd) {
  const possiblePaths = [
    join(cwd, '.github', 'pull_request_template.md'),
    join(cwd, '.github', 'PULL_REQUEST_TEMPLATE.md'),
    join(cwd, 'PULL_REQUEST_TEMPLATE.md'),
    join(cwd, '.gitea', 'pull_request_template.md'),
  ];

  let templateExists = false;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      templateExists = true;
      break;
    }
  }

  // Count PR references in recent commits
  let prReferences = 0;
  try {
    const log = execSync('git log --oneline -20', { cwd, encoding: 'utf-8' });
    const matches = log.match(/#\d+/g) || [];
    prReferences = new Set(matches).size;
  } catch {
    // Ignore errors
  }

  return {
    templateExists,
    referencesFound: prReferences,
  };
}

function calculateAdoptionScore(metrics) {
  let score = 0;
  let maxScore = 0;

  // Commits analysis (max 25 points)
  maxScore += 25;
  if (metrics.commits.total > 0) {
    const prefixCompliance = calculatePrefixCompliance(metrics.commits.byPrefix);
    score += Math.round((prefixCompliance / 100) * 25);
  }

  // Branch naming (max 25 points)
  maxScore += 25;
  score += metrics.branches.compliancePercent > 0 
    ? Math.round((metrics.branches.compliancePercent / 100) * 25)
    : 0;

  // Git hooks (max 25 points)
  maxScore += 25;
  const hooksScore = (metrics.hooks.preCommitExists ? 12 : 0) + 
                     (metrics.hooks.commitMsgExists ? 13 : 0);
  score += hooksScore;

  // PR template (max 25 points)
  maxScore += 25;
  let prScore = 0;
  if (metrics.prTemplate.templateExists) prScore += 15;
  if (metrics.prTemplate.referencesFound > 0) prScore += 10;
  score += Math.min(prScore, 25);

  return Math.round((score / maxScore) * 100);
}

function calculatePrefixCompliance(prefixCounts) {
  const total = Object.values(prefixCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  
  const compliantPrefixes = ['feature', 'bugfix', 'hotfix', 'docs', 'style', 'refactor', 'test', 'chore'];
  const compliant = compliantPrefixes.reduce((sum, prefix) => sum + (prefixCounts[prefix] || 0), 0);
  
  return Math.round((compliant / total) * 100);
}

function displayDashboard(metrics) {
  console.log('\n' + chalk.bold('═══════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  📊 GIT WORKFLOW ADOPTION DASHBOARD'));
  console.log(chalk.bold('═══════════════════════════════════════════\n'));

  // Adoption Score
  const score = calculateAdoptionScore(metrics);
  const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
  console.log(chalk.bold('Adoption Score:  ') + scoreColor.bold(`${score}%`));
  console.log(chalk.gray(getScoreBar(score)) + '\n');

  // Commits Section
  console.log(chalk.bold.cyan('📝 COMMITS'));
  console.log(chalk.gray('─'.repeat(45)));
  console.log(`  Total Commits:      ${chalk.bold(metrics.commits.total)}`);
  
  if (metrics.commits.total > 0) {
    const prefixRows = [
      ['Type', 'Count'],
      ...Object.entries(metrics.commits.byPrefix)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => [
          chalk.cyan(type),
          chalk.bold(String(count))
        ])
    ];
    printTable(prefixRows, '  ');

    if (metrics.commits.recent.length > 0) {
      console.log(chalk.gray('\n  Recent Commits:'));
      metrics.commits.recent.forEach(commit => {
        console.log(`    ${chalk.dim(commit.hash)} ${commit.message.substring(0, 40)}`);
      });
    }
  }

  console.log();

  // Branches Section
  console.log(chalk.bold.cyan('🌿 BRANCHES'));
  console.log(chalk.gray('─'.repeat(45)));
  console.log(`  Total Branches:     ${chalk.bold(metrics.branches.total)}`);
  console.log(`  Naming Compliant:   ${chalk.bold(metrics.branches.compliant)}/${metrics.branches.total}`);
  
  const complianceColor = metrics.branches.compliancePercent >= 80 ? chalk.green : 
                         metrics.branches.compliancePercent >= 60 ? chalk.yellow : chalk.red;
  console.log(`  Compliance %:       ${complianceColor.bold(`${metrics.branches.compliancePercent}%`)}`);
  console.log();

  // Hooks Section
  console.log(chalk.bold.cyan('🔧 GIT HOOKS'));
  console.log(chalk.gray('─'.repeat(45)));
  console.log(`  pre-commit:         ${getStatusBadge(metrics.hooks.preCommitExists)}`);
  console.log(`  commit-msg:         ${getStatusBadge(metrics.hooks.commitMsgExists)}`);
  console.log();

  // PR Template Section
  console.log(chalk.bold.cyan('📋 PR TEMPLATE'));
  console.log(chalk.gray('─'.repeat(45)));
  console.log(`  Template Exists:    ${getStatusBadge(metrics.prTemplate.templateExists)}`);
  console.log(`  PR References:      ${chalk.bold(metrics.prTemplate.referencesFound)} found`);
  console.log('\n' + chalk.bold('═══════════════════════════════════════════\n'));
}

function getStatusBadge(value) {
  return value ? chalk.green('✓ Installed') : chalk.red('✗ Missing');
}

function getScoreBar(score) {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  if (score >= 80) {
    return chalk.green(`[${bar}]`);
  } else if (score >= 60) {
    return chalk.yellow(`[${bar}]`);
  } else {
    return chalk.red(`[${bar}]`);
  }
}

function printTable(rows, indent = '') {
  if (rows.length === 0) return;

  // Calculate column widths
  const colWidths = [];
  rows.forEach(row => {
    row.forEach((cell, i) => {
      const cellText = typeof cell === 'string' ? stripColors(cell) : String(cell);
      colWidths[i] = Math.max(colWidths[i] || 0, cellText.length);
    });
  });

  // Print rows
  rows.forEach((row, i) => {
    const cells = row.map((cell, j) => {
      const cellText = typeof cell === 'string' ? cell : String(cell);
      const stripped = stripColors(cellText);
      const padding = ' '.repeat(colWidths[j] - stripped.length);
      return cellText + padding;
    });

    console.log(indent + cells.join('  '));
    
    // Print header separator
    if (i === 0) {
      const sep = colWidths.map(w => '─'.repeat(w)).join('  ');
      console.log(chalk.gray(indent + sep));
    }
  });
}

function stripColors(str) {
  return str.replace(/\u001b\[\d+m/g, '');
}

export { showDashboard };

#!/usr/bin/env node

import { program } from 'commander';
import { runOnboarding } from './onboarding.js';
import { runPreflight } from './preflight.js';
import { installTemplates } from './templates.js';
import { showBadges, showProgress, firstPRChecklist, awardBadge } from './badges.js';
import { showDashboard } from './dashboard.js';

const version = '0.1.0';

program
  .name('gitflow-playbook')
  .description('Interactive CLI coach for Git/PR workflow')
  .version(version);

program
  .command('onboard')
  .description('Start interactive onboarding wizard')
  .option('--skip-steps <steps>', 'Comma-separated step numbers to skip')
  .action(async (options) => {
    await runOnboarding(options);
  });

program
  .command('preflight')
  .description('Run preflight checks and install git hooks')
  .option('--check-only', 'Only check without installing hooks')
  .option('--validate-branch', 'Validate current branch against naming rules')
  .action(async (options) => {
    await runPreflight(options);
  });

program
  .command('templates')
  .description('Install PR and commit templates')
  .option('--dry-run', 'Show what would be created without writing files')
  .action(async (options) => {
    await installTemplates(process.cwd(), options);
  });

program
  .command('badges')
  .description('Manage progress badges and milestones')
  .option('--list', 'Show available badges')
  .option('--award <badge>', 'Award a specific badge')
  .option('--show-progress', 'Display current progress')
  .option('--first-pr-checklist', 'Show first PR checklist')
  .action(async (options) => {
    if (options.list) {
      await showBadges();
    } else if (options.award) {
      await awardBadge(options.award);
    } else if (options.showProgress) {
      await showProgress();
    } else if (options.firstPrChecklist) {
      firstPRChecklist();
    } else {
      await showProgress();
    }
  });

program
  .command('dashboard')
  .description('Show adoption metrics and statistics')
  .action(async () => {
    await showDashboard(process.cwd());
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

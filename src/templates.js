import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

const PR_TEMPLATE = `## Description
Please include a summary of the changes and related context. Explain the why behind this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issue
Closes #(issue number)

## Testing Notes
Please describe the tests that you ran to verify your changes.
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

### Test Coverage
Describe how to reproduce your tests:
\`\`\`
npm test -- --testPathPattern="..."
\`\`\`

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests passed locally with my changes
- [ ] Any dependent changes have been merged and published

## Changelog Entry
Please describe what should be added to the CHANGELOG:

\`\`\`markdown
- [type] Brief description of change
\`\`\`

Where type is one of: Added, Changed, Deprecated, Removed, Fixed, Security
`;

const COMMIT_TEMPLATE = `# Commit message format: <type>: <subject>
# Types: feat, fix, docs, style, refactor, test, chore
# Subject line should be imperative, present tense: "add" not "added" or "adds"
# Subject should not include a period (.) at the end
# Reference issues at the end: Fixes #123, Closes #456

# Example commit messages:
# feat: add user authentication module
# fix: resolve race condition in cache update
# docs: update API documentation
# style: format code according to style guide
# refactor: simplify event handler logic
# test: add unit tests for email validation
# chore: update dependencies to latest versions

# TEMPLATE RULES (remove this section before committing):
# - Keep the subject line to 50 characters or less
# - Capitalize the subject line
# - Do not end the subject line with a period
# - Use the imperative mood in the subject line
# - Wrap the body at 72 characters
# - Use the body to explain what and why, not how
# - Separate subject from body with a blank line
`;

const CHANGELOG_TEMPLATE = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- GitFlow workflow configuration

### Changed
- Core functionality improvements

### Fixed
- Bug fixes and improvements

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Complete GitFlow playbook implementation
- Template system for PR and commit messages
- Documentation and contributing guidelines

[Unreleased]: https://github.com/yourusername/project/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/project/releases/tag/v1.0.0
`;

async function ensureGitHubDir(cwd) {
  const githubDir = path.join(cwd, '.github');
  try {
    await fs.mkdir(githubDir, { recursive: true });
    return githubDir;
  } catch (error) {
    throw new Error(`Failed to create .github directory: ${error.message}`);
  }
}

async function writeTemplate(filePath, content, isDryRun) {
  if (isDryRun) {
    console.log(chalk.cyan(`[DRY RUN] Would create: ${filePath}`));
    return { path: filePath, created: false, isDryRun: true };
  }

  try {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(chalk.green(`✓ Created: ${filePath}`));
    return { path: filePath, created: true };
  } catch (error) {
    throw new Error(`Failed to write ${filePath}: ${error.message}`);
  }
}

async function installTemplates(cwd, options = {}) {
  const isDryRun = options['dry-run'] || options.dryRun || false;
  const results = [];

  try {
    console.log(chalk.blue('\n🚀 Installing GitFlow Templates...\n'));

    if (isDryRun) {
      console.log(chalk.yellow('[DRY RUN MODE] No files will be created\n'));
    }

    // Validate cwd exists
    try {
      await fs.access(cwd);
    } catch {
      throw new Error(`Directory does not exist: ${cwd}`);
    }

    // Create .github directory
    const githubDir = await ensureGitHubDir(cwd);

    // Create PR template
    const prTemplatePath = path.join(githubDir, 'pull_request_template.md');
    const prResult = await writeTemplate(prTemplatePath, PR_TEMPLATE, isDryRun);
    results.push(prResult);

    // Create commit template
    const commitTemplatePath = path.join(githubDir, 'COMMIT_TEMPLATE.txt');
    const commitResult = await writeTemplate(
      commitTemplatePath,
      COMMIT_TEMPLATE,
      isDryRun
    );
    results.push(commitResult);

    // Create or update CHANGELOG.md
    const changelogPath = path.join(cwd, 'CHANGELOG.md');
    let changelogContent = CHANGELOG_TEMPLATE;

    // Check if CHANGELOG exists and preserve it if --dry-run is false
    try {
      if (!isDryRun) {
        await fs.access(changelogPath);
        const existingChangelog = await fs.readFile(changelogPath, 'utf-8');
        if (existingChangelog.trim().length > 0) {
          console.log(
            chalk.yellow(`⚠ CHANGELOG.md already exists, skipping creation`)
          );
          results.push({
            path: changelogPath,
            created: false,
            skipped: true
          });
        } else {
          await writeTemplate(changelogPath, changelogContent, isDryRun);
          results.push({ path: changelogPath, created: true });
        }
      } else {
        const changelogResult = await writeTemplate(
          changelogPath,
          changelogContent,
          isDryRun
        );
        results.push(changelogResult);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        const changelogResult = await writeTemplate(
          changelogPath,
          changelogContent,
          isDryRun
        );
        results.push(changelogResult);
      } else {
        throw error;
      }
    }

    // Summary
    console.log(chalk.blue('\n✨ Template Installation Summary:\n'));
    const createdCount = results.filter(r => r.created).length;
    const dryRunCount = results.filter(r => r.isDryRun).length;
    const skippedCount = results.filter(r => r.skipped).length;

    results.forEach(result => {
      if (result.isDryRun) {
        console.log(chalk.cyan(`  ✓ ${result.path}`));
      } else if (result.skipped) {
        console.log(chalk.yellow(`  ⊘ ${result.path} (already exists)`));
      } else if (result.created) {
        console.log(chalk.green(`  ✓ ${result.path}`));
      }
    });

    console.log(chalk.blue('\nSummary:'));
    if (isDryRun) {
      console.log(
        chalk.cyan(
          `  Would create ${dryRunCount} file(s) in dry-run mode`
        )
      );
    } else {
      console.log(chalk.green(`  Created: ${createdCount} file(s)`));
      if (skippedCount > 0) {
        console.log(chalk.yellow(`  Skipped: ${skippedCount} file(s)`));
      }
    }

    console.log(
      chalk.blue('\n📋 Next steps:')
    );
    console.log(chalk.gray('  1. Customize template files to match your workflow'));
    console.log(chalk.gray('  2. Configure Git to use commit template:'));
    console.log(chalk.gray(`     git config commit.template ${path.join('.github', 'COMMIT_TEMPLATE.txt')}`));
    console.log(chalk.gray('  3. Review PR template for your project needs'));
    console.log(chalk.gray('  4. Update CHANGELOG.md with your project details\n'));

    return {
      success: true,
      results,
      isDryRun,
      message: isDryRun
        ? 'Templates would be installed (dry-run mode)'
        : 'Templates installed successfully'
    };
  } catch (error) {
    console.error(chalk.red(`\n✗ Error installing templates: ${error.message}\n`));
    return {
      success: false,
      error: error.message,
      results
    };
  }
}

export {
  installTemplates
};

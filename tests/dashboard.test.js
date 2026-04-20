import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { showDashboard } from '../src/dashboard.js';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const { execSync } = await import('child_process');

describe('Dashboard', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'dashboard-test-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('showDashboard', () => {
    it('returns { isGitRepo: false, adoptionScore: 0 } when .git directory does not exist', async () => {
      const result = await showDashboard(tempDir);
      
      expect(result).toEqual({
        isGitRepo: false,
        adoptionScore: 0,
      });
      expect(execSync).not.toHaveBeenCalled();
    });

    it('returns metrics with isGitRepo: true and computed adoptionScore when .git exists', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'abc1234 feature: add new dashboard\ndef5678 bugfix: fix calculation\nghi9012 docs: update readme\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n  develop\n  feature/new-feature\n  bugfix/issue-123\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return 'abc1234 feature: add new dashboard (#42)\ndef5678 bugfix: fix calculation (#41)\n';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.adoptionScore).toBeGreaterThanOrEqual(0);
      expect(result.adoptionScore).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('commits');
      expect(result).toHaveProperty('branches');
      expect(result).toHaveProperty('hooks');
      expect(result).toHaveProperty('prTemplate');
      expect(execSync).toHaveBeenCalled();
    });

    it('computes correct adoptionScore with mixed compliance', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });
      writeFileSync(join(tempDir, '.git', 'hooks', 'pre-commit'), '#!/bin/bash\necho "test"', {
        mode: 0o755,
      });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'a feature: one\nb bugfix: two\nc hotfix: three\nd other: four\ne random\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n  develop\n  feature/test\n  invalid-branch\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return 'a feature: one (#10)\n';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.adoptionScore).toBeGreaterThan(0);
      expect(result.adoptionScore).toBeLessThanOrEqual(100);
      expect(result.commits.total).toBe(5);
      expect(result.branches.total).toBe(4);
      expect(result.branches.compliant).toBe(3);
      expect(result.hooks.preCommitExists).toBe(true);
    });

    it('handles execSync errors gracefully', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        throw new Error('Git command failed');
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.error).toBe('Git command failed');
      expect(result.adoptionScore).toBe(0);
    });
  });

  describe('calculateAdoptionScore', () => {
    it('returns 0 for all zeros (no compliance)', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'a1b2c3d random message without proper format\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  bad-branch-name\n  another-invalid\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.adoptionScore).toBeGreaterThanOrEqual(0);
    });

    it('returns high score for full compliance', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });
      writeFileSync(join(tempDir, '.git', 'hooks', 'pre-commit'), '#!/bin/bash', { mode: 0o755 });
      writeFileSync(join(tempDir, '.git', 'hooks', 'commit-msg'), '#!/bin/bash', { mode: 0o755 });
      mkdirSync(join(tempDir, '.github'), { recursive: true });
      writeFileSync(join(tempDir, '.github', 'pull_request_template.md'), '# PR Template');

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return Array(20)
            .fill()
            .map((_, i) => `hash${i} feature: commit ${i}\n`)
            .join('');
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n  develop\n  feature/a\n  feature/b\n  bugfix/c\n  hotfix/d\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return 'a feature: commit (#1)\nb feature: commit (#2)\n';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.adoptionScore).toBeGreaterThan(60);
      expect(result.adoptionScore).toBeLessThanOrEqual(100);
    });

    it('awards partial credit for partial compliance', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });
      writeFileSync(join(tempDir, '.git', 'hooks', 'pre-commit'), '#!/bin/bash', { mode: 0o755 });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'a feature: one\nb feature: two\nc other: three\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n  develop\n  feature/test\n  bad-branch\n  bad-branch2\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return 'a feature: one (#1)\n';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.adoptionScore).toBeGreaterThan(0);
      expect(result.adoptionScore).toBeLessThan(100);
    });

    it('correctly scores commits with proper prefixes', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return (
            'h1 feature: new feature\n' +
            'h2 bugfix: bug fix\n' +
            'h3 hotfix: critical fix\n' +
            'h4 docs: documentation\n' +
            'h5 style: code style\n' +
            'h6 refactor: refactoring\n' +
            'h7 test: add tests\n' +
            'h8 chore: maintenance\n'
          );
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n  develop\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.commits.total).toBe(8);
      expect(result.adoptionScore).toBeGreaterThan(0);
    });

    it('correctly scores branch naming compliance', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n  develop\n  feature/valid\n  bugfix/valid\n  hotfix/valid\n  release/valid\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.branches.total).toBe(6);
      expect(result.branches.compliant).toBe(6);
      expect(result.branches.compliancePercent).toBe(100);
    });

    it('correctly scores hook installations', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });
      writeFileSync(join(tempDir, '.git', 'hooks', 'pre-commit'), '#!/bin/bash', { mode: 0o755 });
      writeFileSync(join(tempDir, '.git', 'hooks', 'commit-msg'), '#!/bin/bash', { mode: 0o755 });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.hooks.preCommitExists).toBe(true);
      expect(result.hooks.commitMsgExists).toBe(true);
    });

    it('correctly scores PR template existence and references', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });
      mkdirSync(join(tempDir, '.github'), { recursive: true });
      writeFileSync(join(tempDir, '.github', 'pull_request_template.md'), '# PR Template');

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return 'a feature: commit (#42)\nb feature: commit (#43)\n';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.prTemplate.templateExists).toBe(true);
      expect(result.prTemplate.referencesFound).toBe(2);
    });

    it('handles missing PR template gracefully', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return 'a feature: commit\n';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.prTemplate.templateExists).toBe(false);
      expect(result.prTemplate.referencesFound).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty git log (no commits)', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return '';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.commits.total).toBe(0);
      expect(result.adoptionScore).toBeGreaterThanOrEqual(0);
    });

    it('handles empty branch list', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return '';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.branches.total).toBe(0);
      expect(result.branches.compliancePercent).toBe(100);
    });

    it('handles hooks directory missing gracefully', async () => {
      mkdirSync(join(tempDir, '.git'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.hooks.preCommitExists).toBe(false);
      expect(result.hooks.commitMsgExists).toBe(false);
    });

    it('parses commits with complex message formats', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return (
            'a feature(auth): implement oauth2\n' +
            'b bugfix(api): handle 404 errors\n' +
            'c docs: update installation guide\n' +
            'd test(utils): add unit tests\n'
          );
        }
        if (cmd.includes('git branch -a')) {
          return '  main\n';
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.commits.total).toBe(4);
      expect(result.adoptionScore).toBeGreaterThan(0);
    });

    it('filters out remote branches in analysis', async () => {
      mkdirSync(join(tempDir, '.git', 'hooks'), { recursive: true });

      execSync.mockImplementation((cmd, options) => {
        if (cmd.includes('git log --oneline --all')) {
          return 'h1 feature: one\n';
        }
        if (cmd.includes('git branch -a')) {
          return (
            '  main\n' +
            '  develop\n' +
            '  remotes/origin/main\n' +
            '  remotes/origin/develop\n'
          );
        }
        if (cmd.includes('git log --oneline -20')) {
          return '';
        }
        return '';
      });

      const result = await showDashboard(tempDir);

      expect(result.branches.total).toBe(2);
    });
  });
});

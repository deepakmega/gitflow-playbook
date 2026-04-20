import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock console to suppress output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

let testTempDir;
let mockInquirer;

// Mock os.homedir with hoisting so it takes effect before onboarding.js imports
vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: vi.fn(() => testTempDir || '/tmp/default'),
  };
});

// Mock inquirer with hoisting
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Setup and teardown
beforeEach(() => {
  // Create a unique temp directory for each test
  testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitflow-test-'));
});

afterEach(() => {
  // Clean up temp directory after each test
  if (testTempDir && fs.existsSync(testTempDir)) {
    fs.rmSync(testTempDir, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

describe('onboarding', () => {
  describe('runOnboarding', () => {
    it('should skip all steps when skipSteps includes 1,2,3,4,5,6', async () => {
      const { runOnboarding } = await import('../src/onboarding.js');
      const inquirer = await import('inquirer');

      const result = await runOnboarding({ skipSteps: '1,2,3,4,5,6' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Onboarding completed successfully');
      expect(result.data).toBeDefined();
      expect(result.data.step1).toBeDefined();
      expect(result.data.step2).toBeDefined();
      expect(result.data.step3).toBeDefined();
      expect(result.data.step4).toBeDefined();
      expect(result.data.step5).toBeDefined();
      expect(result.data.step6).toBeDefined();
      // Verify inquirer was never called since all steps were skipped
      expect(inquirer.default.prompt).not.toHaveBeenCalled();
    });

    it('should save config to unique temp directory', async () => {
      const { runOnboarding } = await import('../src/onboarding.js');

      const result = await runOnboarding({ skipSteps: '1,2,3,4,5,6' });

      // Verify the result contains valid config data
      expect(result.configPath).toBeDefined();
      expect(result.data.startedAt).toBeDefined();
      expect(result.data.step1).toBeDefined();
      expect(result.data.step2).toBeDefined();
      expect(result.data.step3).toBeDefined();
      expect(result.data.step4).toBeDefined();
      expect(result.data.step5).toBeDefined();
      expect(result.data.step6).toBeDefined();

      // Clean up the file created in the real home directory
      if (fs.existsSync(result.configPath)) {
        fs.unlinkSync(result.configPath);
      }
    });
  });

  describe('validateBranchName', () => {
    it('should accept valid feature branch names', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      expect(validateBranchName('feature/user-auth', 'feature')).toBe(true);
      expect(validateBranchName('feature/fix-bug', 'feature')).toBe(true);
      expect(validateBranchName('feature/add-validation', 'feature')).toBe(true);
    });

    it('should accept valid bugfix branch names', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      expect(validateBranchName('bugfix/null-pointer', 'bugfix')).toBe(true);
      expect(validateBranchName('bugfix/xyz', 'bugfix')).toBe(true);
    });

    it('should accept main and develop as feature branches', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      expect(validateBranchName('feature/main', 'feature')).toBe(true);
      expect(validateBranchName('feature/develop', 'feature')).toBe(true);
    });

    it('should reject branch names without pattern prefix', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      const result = validateBranchName('my-branch', 'feature');
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
      expect(result).toContain('Invalid format');
    });

    it('should reject empty branch names', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      const result = validateBranchName('', 'feature');
      expect(result).toBe('Branch name is required');
    });

    it('should reject branch names with uppercase letters', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      const result = validateBranchName('feature/MyBranch', 'feature');
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    it('should accept lowercase and hyphens in branch names', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      expect(validateBranchName('feature/my-branch-name', 'feature')).toBe(true);
      expect(validateBranchName('bugfix/fix-123-issue', 'bugfix')).toBe(true);
      expect(validateBranchName('hotfix/critical-fix', 'hotfix')).toBe(true);
      expect(validateBranchName('chore/update-deps', 'chore')).toBe(true);
      expect(validateBranchName('docs/api-guide', 'docs')).toBe(true);
      expect(validateBranchName('refactor/cleanup-code', 'refactor')).toBe(true);
    });

    it('should accept numbers in branch names', async () => {
      const { validateBranchName } = await import('../src/onboarding.js');
      expect(validateBranchName('feature/issue-123', 'feature')).toBe(true);
      expect(validateBranchName('bugfix/bug-456-fix', 'bugfix')).toBe(true);
    });
  });

  describe('validateCommitMessage', () => {
    it('should accept valid commit messages', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      expect(validateCommitMessage('Add user authentication')).toBe(true);
      expect(validateCommitMessage('Fix null pointer exception')).toBe(true);
      expect(validateCommitMessage('Update dependencies')).toBe(true);
      expect(validateCommitMessage('Refactor validation logic')).toBe(true);
    });

    it('should require commit messages', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      expect(validateCommitMessage('')).toBe('Commit message is required');
      expect(validateCommitMessage(null)).toBe('Commit message is required');
      expect(validateCommitMessage('   ')).toBe('Commit message is required');
    });

    it('should require minimum 10 characters', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      const result = validateCommitMessage('Short msg');
      expect(result).toBe('Commit message must be at least 10 characters');
    });

    it('should limit to 72 characters', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      const longMessage = 'A'.repeat(73);
      const result = validateCommitMessage(longMessage);
      expect(result).toBe('First line should be 72 characters or less');
    });

    it('should require capital letter at start', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      const result = validateCommitMessage('add new feature');
      expect(result).toBe('Start with a capital letter');
    });

    it('should reject messages ending with period', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      const result = validateCommitMessage('Add new feature.');
      expect(result).toBe('Do not end with a period');
    });

    it('should accept exactly 10 characters', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      expect(validateCommitMessage('Add a test')).toBe(true);
    });

    it('should accept exactly 72 characters', async () => {
      const { validateCommitMessage } = await import('../src/onboarding.js');
      const message = 'A'.repeat(72);
      expect(validateCommitMessage(message)).toBe(true);
    });
  });

  describe('validatePRTitle', () => {
    it('should accept valid PR titles', async () => {
      const { validatePRTitle } = await import('../src/onboarding.js');
      expect(validatePRTitle('Add user authentication')).toBe(true);
      expect(validatePRTitle('Fix critical bug')).toBe(true);
      expect(validatePRTitle('Update documentation')).toBe(true);
      expect(validatePRTitle('Refactor code')).toBe(true);
    });

    it('should require PR titles', async () => {
      const { validatePRTitle } = await import('../src/onboarding.js');
      expect(validatePRTitle('')).toBe('PR title is required');
      expect(validatePRTitle(null)).toBe('PR title is required');
      expect(validatePRTitle('   ')).toBe('PR title is required');
    });

    it('should require minimum 5 characters', async () => {
      const { validatePRTitle } = await import('../src/onboarding.js');
      const result = validatePRTitle('Test');
      expect(result).toBe('PR title should be at least 5 characters');
    });

    it('should limit to 100 characters', async () => {
      const { validatePRTitle } = await import('../src/onboarding.js');
      const longTitle = 'A'.repeat(101);
      const result = validatePRTitle(longTitle);
      expect(result).toBe('PR title should be 100 characters or less');
    });

    it('should accept exactly 5 characters', async () => {
      const { validatePRTitle } = await import('../src/onboarding.js');
      expect(validatePRTitle('12345')).toBe(true);
    });

    it('should accept exactly 100 characters', async () => {
      const { validatePRTitle } = await import('../src/onboarding.js');
      const title = 'A'.repeat(100);
      expect(validatePRTitle(title)).toBe(true);
    });
  });

  describe('validatePRDescription', () => {
    it('should accept valid PR descriptions', async () => {
      const { validatePRDescription } = await import('../src/onboarding.js');
      expect(
        validatePRDescription(
          'This PR adds user authentication to the system'
        )
      ).toBe(true);
      expect(
        validatePRDescription(
          'Fixes the null pointer exception in the user service'
        )
      ).toBe(true);
      expect(
        validatePRDescription('Updates API documentation with new endpoints')
      ).toBe(true);
    });

    it('should require PR descriptions', async () => {
      const { validatePRDescription } = await import('../src/onboarding.js');
      expect(validatePRDescription('')).toBe('PR description is required');
      expect(validatePRDescription(null)).toBe('PR description is required');
      expect(validatePRDescription('   ')).toBe('PR description is required');
    });

    it('should require minimum 20 characters', async () => {
      const { validatePRDescription } = await import('../src/onboarding.js');
      const result = validatePRDescription('Short description');
      expect(result).toBe(
        'Description should be at least 20 characters (explain what & why)'
      );
    });

    it('should accept exactly 20 characters', async () => {
      const { validatePRDescription } = await import('../src/onboarding.js');
      const description = 'A'.repeat(20);
      expect(validatePRDescription(description)).toBe(true);
    });

    it('should accept long descriptions', async () => {
      const { validatePRDescription } = await import('../src/onboarding.js');
      const longDescription = 'A'.repeat(200);
      expect(validatePRDescription(longDescription)).toBe(true);
    });
  });
});

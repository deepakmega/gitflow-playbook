import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';

// Mock os module
vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: vi.fn(),
  };
});

// Import after mocking os
import { loadProgress, saveProgress, awardBadge, firstPRChecklist } from '../src/badges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('badges.js', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a unique temp directory for this test
    tempDir = path.join(__dirname, '.test-temp-' + Math.random().toString(36).slice(2));
    await fs.mkdir(tempDir, { recursive: true });
    
    // Mock homedir to return the temp directory
    os.homedir.mockReturnValue(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory after test
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('loadProgress()', () => {
    it('returns default when no file exists', async () => {
      const progress = await loadProgress();
      
      expect(progress).toEqual({
        badges: [],
        earnedCount: 0,
        createdAt: expect.any(String),
      });
      expect(new Date(progress.createdAt)).toBeInstanceOf(Date);
    });

    it('returns existing data when file exists', async () => {
      const existingData = {
        badges: [
          {
            id: 'first-commit',
            name: '🎯 First Commit',
            emoji: '🎯',
            earnedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        earnedCount: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const progressFile = path.join(tempDir, '.gitflow-playbook-progress.json');
      await fs.writeFile(progressFile, JSON.stringify(existingData, null, 2), 'utf-8');

      const progress = await loadProgress();
      expect(progress).toEqual(existingData);
    });
  });

  describe('saveProgress() + loadProgress() roundtrip', () => {
    it('saveProgress + loadProgress roundtrip works', async () => {
      const testData = {
        badges: [
          {
            id: 'first-commit',
            name: '🎯 First Commit',
            emoji: '🎯',
            earnedAt: '2024-01-01T12:00:00.000Z',
          },
          {
            id: 'pr-author',
            name: '📝 PR Author',
            emoji: '📝',
            earnedAt: '2024-01-02T12:00:00.000Z',
          },
        ],
        earnedCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Save
      await saveProgress(testData);

      // Load and verify
      const loaded = await loadProgress();
      expect(loaded).toEqual(testData);
    });
  });

  describe('awardBadge()', () => {
    it('awards a new badge and increments earnedCount', async () => {
      const badgeId = 'first-commit';
      
      // Mock console.log to suppress output
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await awardBadge(badgeId);

      expect(result.id).toBe(badgeId);
      expect(result.name).toBe('🎯 First Commit');
      expect(result.emoji).toBe('🎯');

      // Verify it was saved
      const progress = await loadProgress();
      expect(progress.earnedCount).toBe(1);
      expect(progress.badges).toHaveLength(1);
      expect(progress.badges[0].id).toBe(badgeId);
      expect(progress.badges[0].earnedAt).toBeDefined();

      console.log.mockRestore();
    });

    it('awardBadge is idempotent (calling twice does not duplicate badge)', async () => {
      const badgeId = 'first-commit';
      
      // Mock console.log to suppress output
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // Award badge first time
      await awardBadge(badgeId);
      let progress = await loadProgress();
      expect(progress.earnedCount).toBe(1);

      // Award same badge again
      await awardBadge(badgeId);
      progress = await loadProgress();
      
      // Should still be 1, not 2
      expect(progress.earnedCount).toBe(1);
      expect(progress.badges).toHaveLength(1);
      expect(progress.badges[0].id).toBe(badgeId);

      console.log.mockRestore();
    });

    it('awardBadge throws error on unknown badge id', async () => {
      const unknownBadgeId = 'unknown-badge-xyz';
      
      // Mock console.log to suppress output
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await expect(awardBadge(unknownBadgeId)).rejects.toThrow(
        `Badge "${unknownBadgeId}" not found`
      );

      console.log.mockRestore();
    });

    it('awards multiple different badges correctly', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // Award first badge
      await awardBadge('first-commit');
      
      // Award second badge
      await awardBadge('pr-author');

      const progress = await loadProgress();
      expect(progress.earnedCount).toBe(2);
      expect(progress.badges).toHaveLength(2);
      expect(progress.badges[0].id).toBe('first-commit');
      expect(progress.badges[1].id).toBe('pr-author');

      console.log.mockRestore();
    });

    it('includes earnedAt timestamp when awarding badge', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const beforeTime = new Date();
      await awardBadge('first-commit');
      const afterTime = new Date();

      const progress = await loadProgress();
      const earnedAt = new Date(progress.badges[0].earnedAt);

      expect(earnedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(earnedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());

      console.log.mockRestore();
    });
  });

  describe('firstPRChecklist()', () => {
    it('returns array of 8 items with correct structure', () => {
      // Mock console.log to suppress output
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const checklist = firstPRChecklist();

      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist).toHaveLength(8);

      // Verify structure of each item
      checklist.forEach((item) => {
        expect(item).toHaveProperty('task');
        expect(item).toHaveProperty('details');
        expect(item).toHaveProperty('completed');
        expect(typeof item.task).toBe('string');
        expect(typeof item.details).toBe('string');
        expect(typeof item.completed).toBe('boolean');
        expect(item.task.length).toBeGreaterThan(0);
        expect(item.details.length).toBeGreaterThan(0);
        expect(item.completed).toBe(false);
      });

      console.log.mockRestore();
    });

    it('returns checklist with all items not completed', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const checklist = firstPRChecklist();

      checklist.forEach((item) => {
        expect(item.completed).toBe(false);
      });

      console.log.mockRestore();
    });

    it('returns checklist with meaningful task descriptions', () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const checklist = firstPRChecklist();

      const expectedTasks = [
        'Create a feature branch with proper naming',
        'Make meaningful commits',
        'Add unit tests if applicable',
        'Update documentation',
        'Run all tests locally',
        'Rebase or squash commits if needed',
        'Write a clear PR description',
        'Request at least one reviewer',
      ];

      expect(checklist.map((item) => item.task)).toEqual(expectedTasks);

      console.log.mockRestore();
    });
  });
});

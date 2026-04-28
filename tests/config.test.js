import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  DEFAULT_PLAYBOOK_CONFIG,
  loadPlaybookConfig,
  normalizePlaybookConfig,
  toRegexList,
} from '../src/config.js';

describe('config.js', () => {
  it('normalizes config and falls back to defaults for invalid values', () => {
    const config = normalizePlaybookConfig({
      branchPatterns: ['^feat/.+$', '   ', 123],
      commitTypes: [],
    });

    expect(config.branchPatterns).toEqual(['^feat/.+$']);
    expect(config.commitTypes).toEqual(DEFAULT_PLAYBOOK_CONFIG.commitTypes);
  });

  it('converts valid regex strings and skips invalid ones', () => {
    const regexList = toRegexList(['^feature/.+$', '[']);

    expect(regexList).toHaveLength(1);
    expect(regexList[0].test('feature/new-api')).toBe(true);
  });

  it('loads .gitflow-playbookrc.json from git root when present', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'playbook-config-test-'));

    try {
      const configPath = join(tempDir, '.gitflow-playbookrc.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          branchPatterns: ['^custom/.+$', '^main$'],
          commitTypes: ['feat', 'fix'],
        })
      );

      const result = loadPlaybookConfig({
        cwd: tempDir,
        gitRoot: tempDir,
      });

      expect(result.path).toBe(configPath);
      expect(result.config.branchPatterns).toEqual(['^custom/.+$', '^main$']);
      expect(result.config.commitTypes).toEqual(['feat', 'fix']);
      expect(result.error).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to defaults if config JSON is invalid', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'playbook-config-test-'));

    try {
      const configPath = join(tempDir, '.gitflow-playbookrc.json');
      writeFileSync(configPath, '{ invalid json');

      const result = loadPlaybookConfig({
        cwd: tempDir,
        gitRoot: tempDir,
      });

      expect(result.path).toBe(configPath);
      expect(result.config).toEqual(DEFAULT_PLAYBOOK_CONFIG);
      expect(result.error).toContain('Failed to parse config');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

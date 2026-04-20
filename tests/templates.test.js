import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { installTemplates } from '../src/templates.js';

describe('templates.js', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp('gitflow-test-');
  });

  afterEach(async () => {
    if (tmpDir) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (error) {
        // Silently ignore cleanup errors
      }
    }
  });

  it('dryRun option with dryRun: true returns success without writing files', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await installTemplates(tmpDir, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.isDryRun).toBe(true);
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);

    // Verify no files were actually created
    const githubDir = path.join(tmpDir, '.github');
    const prTemplatePath = path.join(githubDir, 'pull_request_template.md');
    const commitTemplatePath = path.join(githubDir, 'COMMIT_TEMPLATE.txt');
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');

    try {
      await fs.access(prTemplatePath);
      throw new Error('PR template should not exist in dryRun mode');
    } catch (error) {
      if (error.message.includes('should not exist')) throw error;
      // Expected: file does not exist
    }

    try {
      await fs.access(commitTemplatePath);
      throw new Error('Commit template should not exist in dryRun mode');
    } catch (error) {
      if (error.message.includes('should not exist')) throw error;
      // Expected: file does not exist
    }

    try {
      await fs.access(changelogPath);
      throw new Error('CHANGELOG.md should not exist in dryRun mode');
    } catch (error) {
      if (error.message.includes('should not exist')) throw error;
      // Expected: file does not exist
    }

    console.log.mockRestore();
  });

  it('normal mode creates .github/pull_request_template.md and COMMIT_TEMPLATE.txt', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await installTemplates(tmpDir, {});

    expect(result.success).toBe(true);
    expect(result.isDryRun).toBe(false);

    const githubDir = path.join(tmpDir, '.github');
    const prTemplatePath = path.join(githubDir, 'pull_request_template.md');
    const commitTemplatePath = path.join(githubDir, 'COMMIT_TEMPLATE.txt');

    // Verify files were created
    const prTemplateContent = await fs.readFile(prTemplatePath, 'utf-8');
    expect(prTemplateContent).toContain('## Description');
    expect(prTemplateContent).toContain('Type of Change');
    expect(prTemplateContent).toBeTruthy();

    const commitTemplateContent = await fs.readFile(commitTemplatePath, 'utf-8');
    expect(commitTemplateContent).toContain('Commit message format');
    expect(commitTemplateContent).toContain('feat, fix, docs');
    expect(commitTemplateContent).toBeTruthy();

    console.log.mockRestore();
  });

  it('preserves existing non-empty CHANGELOG.md (skipped, not overwritten)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');
    const existingContent = '# My Existing Changelog\n\n## [1.0.0] - 2024-01-01\nInitial release';
    await fs.writeFile(changelogPath, existingContent, 'utf-8');

    const result = await installTemplates(tmpDir, {});

    expect(result.success).toBe(true);

    // Verify CHANGELOG.md was not overwritten
    const fileContent = await fs.readFile(changelogPath, 'utf-8');
    expect(fileContent).toBe(existingContent);

    // Verify the result includes skipped status
    const changelogResult = result.results.find(r => r.path.includes('CHANGELOG.md'));
    expect(changelogResult).toBeDefined();
    expect(changelogResult.skipped).toBe(true);

    console.log.mockRestore();
  });

  it('returns success: false when cwd does not exist', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const nonExistentDir = path.join(tmpDir, 'does-not-exist');
    const result = await installTemplates(nonExistentDir, {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('does not exist');

    console.error.mockRestore();
  });
});

import fs from 'fs';
import path from 'path';

export const DEFAULT_PLAYBOOK_CONFIG = {
  branchPatterns: [
    '^feature/.+',
    '^bugfix/.+',
    '^hotfix/.+',
    '^release/.+',
    '^main$',
    '^develop$',
  ],
  commitTypes: [
    'feature',
    'bugfix',
    'hotfix',
    'docs',
    'style',
    'refactor',
    'test',
    'chore',
  ],
};

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return null;

  const normalized = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : null;
}

export function normalizePlaybookConfig(rawConfig = {}) {
  const branchPatterns =
    normalizeStringArray(rawConfig.branchPatterns) ??
    DEFAULT_PLAYBOOK_CONFIG.branchPatterns;
  const commitTypes =
    normalizeStringArray(rawConfig.commitTypes) ??
    DEFAULT_PLAYBOOK_CONFIG.commitTypes;

  return {
    branchPatterns,
    commitTypes,
  };
}

export function toRegexList(patterns = []) {
  return patterns
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function loadPlaybookConfig(options = {}) {
  const { cwd = process.cwd(), gitRoot = null } = options;
  const searchPaths = [];

  if (gitRoot) {
    searchPaths.push(path.join(gitRoot, '.gitflow-playbookrc.json'));
  }
  if (cwd && cwd !== gitRoot) {
    searchPaths.push(path.join(cwd, '.gitflow-playbookrc.json'));
  }

  for (const configPath of searchPaths) {
    if (!fs.existsSync(configPath)) continue;

    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        config: normalizePlaybookConfig(parsed),
        path: configPath,
      };
    } catch {
      return {
        config: DEFAULT_PLAYBOOK_CONFIG,
        path: configPath,
        error: `Failed to parse config at ${configPath}. Falling back to defaults.`,
      };
    }
  }

  return {
    config: DEFAULT_PLAYBOOK_CONFIG,
    path: null,
  };
}

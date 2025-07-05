/**
 * Git Command
 * 
 * Provides a command line interface to interact with Git repositories
 * using the GitService.
 */

import type { UnifiedCommand, CommandResult, CommandContext } from './types.js';
import { CommandCategory } from './types.js';
import { commandRegistry } from './index.js';
import { logger } from '../utils/logger.js';
import { GitService } from '../services/git-service.js';
import path from 'path';
import { formatErrorForDisplay } from '../errors/formatter.js';

/**
 * Register git command
 */
export function registerGitCommand(): void {
  const command: UnifiedCommand = {
    id: 'git',
    name: 'git',
    description: 'Execute git commands with safety checks',
    category: CommandCategory.DEVELOPMENT,
    aliases: ['g'],
    parameters: [
      {
        name: 'status',
        description: 'Show repository status',
        type: 'boolean',
        required: false,
        shortFlag: 's'
      },
      {
        name: 'branch',
        description: 'Show branch information',
        type: 'boolean',
        required: false,
        shortFlag: 'b'
      },
      {
        name: 'commits',
        description: 'Show recent commits (optionally specify limit)',
        type: 'number',
        required: false,
        shortFlag: 'c'
      },
      {
        name: 'diff',
        description: 'Show diff for a file (requires --path)',
        type: 'boolean',
        required: false,
        shortFlag: 'd'
      },
      {
        name: 'blame',
        description: 'Show blame for a file (requires --path)',
        type: 'boolean',
        required: false
      },
      {
        name: 'snapshot',
        description: 'Create a snapshot of current changes with optional message',
        type: 'string',
        required: false
      },
      {
        name: 'path',
        description: 'File path for diff, blame, or snapshot',
        type: 'string',
        required: false,
        shortFlag: 'p'
      }
    ],
    async handler(context: CommandContext): Promise<CommandResult> {
      try {
        const { status, branch, commits, diff, blame, snapshot, path: filePath } = context.args;
        const baseDir = process.cwd();
        
        // Create a new GitService instance
        const gitService = new GitService(baseDir);
        
        // Check if current directory is in a Git repository
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          context.terminal.error('❌ Current directory is not a Git repository');
          return { success: false, message: 'Not a Git repository' };
        }
        
        // Get repository root
        const repoRoot = await gitService.findRepositoryRoot();
        if (!repoRoot) {
          context.terminal.error('❌ Could not determine Git repository root');
          return { success: false, message: 'Could not find repository root' };
        }
        
        // Display Git status
        if (status) {
          await displayGitStatus(gitService, context);
          return { success: true, message: 'Git status displayed' };
        }
        
        // Display branch information
        if (branch) {
          await displayBranchInfo(gitService, context);
          return { success: true, message: 'Branch info displayed' };
        }
        
        // Display recent commits
        if (commits) {
          const limit = typeof commits === 'number' ? commits : 10;
          await displayRecentCommits(gitService, context, limit);
          return { success: true, message: 'Recent commits displayed' };
        }
        
        // Display file diff
        if (diff && filePath) {
          await displayFileDiff(gitService, context, filePath as string);
          return { success: true, message: 'File diff displayed' };
        }
        
        // Display file blame
        if (blame && filePath) {
          await displayFileBlame(gitService, context, filePath as string);
          return { success: true, message: 'File blame displayed' };
        }
        
        // Create file snapshot
        if (snapshot) {
          const message = typeof snapshot === 'string' ? snapshot : 'VibeX snapshot';
          await createFileSnapshot(gitService, context, message, filePath ? [filePath as string] : undefined);
          return { success: true, message: 'Snapshot created' };
        }
        
        // Default action: Display repository info
        await displayRepoInfo(gitService, context);
        return { success: true, message: 'Repository info displayed' };
        
      } catch (error) {
        logger.error(`Error in git command: ${error instanceof Error ? error.message : String(error)}`);
        context.terminal.error(`❌ Error: ${formatErrorForDisplay(error)}`);
        return { 
          success: false, 
          message: 'Git command failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };
  
  commandRegistry.register(command);
  logger.debug('Registered git command');
}

/**
 * Display repository information
 */
async function displayRepoInfo(gitService: GitService, context: CommandContext): Promise<void> {
  const repoRoot = await gitService.findRepositoryRoot();
  const currentBranch = await gitService.getCurrentBranch();
  const commitHash = await gitService.getCurrentCommitHash();
  
  context.terminal.info('📁 Git Repository Information');
  context.terminal.info('===========================');
  context.terminal.info(`Repository root: ${repoRoot}`);
  context.terminal.info(`Current branch: ${currentBranch || 'unknown'}`);
  context.terminal.info(`Current commit: ${commitHash || 'unknown'}`);
  context.terminal.info('');
  context.terminal.info('Use these flags for more information:');
  context.terminal.info('  --status (-s)   Show repository status');
  context.terminal.info('  --branch (-b)   Show branch information');
  context.terminal.info('  --commits (-c)  Show recent commits');
}

/**
 * Display Git status
 */
async function displayGitStatus(gitService: GitService, context: CommandContext): Promise<void> {
  const files = await gitService.getFileStatus();
  
  context.terminal.info('📝 Git Status');
  context.terminal.info('===========');
  
  if (files.length === 0) {
    context.terminal.info('No changes');
    return;
  }
  
  const untracked = files.filter(f => f.status === 'untracked');
  const modified = files.filter(f => f.status === 'modified');
  const added = files.filter(f => f.status === 'added');
  const deleted = files.filter(f => f.status === 'deleted');
  const renamed = files.filter(f => f.status === 'renamed');
  const unstaged = files.filter(f => f.status === 'unstaged');
  
  if (untracked.length > 0) {
    context.terminal.info('\nUntracked files:');
    untracked.forEach(file => context.terminal.info(`  ${file.path}`));
  }
  
  if (modified.length > 0) {
    context.terminal.info('\nModified files:');
    modified.forEach(file => context.terminal.info(`  ${file.path}`));
  }
  
  if (added.length > 0) {
    context.terminal.info('\nAdded files:');
    added.forEach(file => context.terminal.info(`  ${file.path}`));
  }
  
  if (deleted.length > 0) {
    context.terminal.info('\nDeleted files:');
    deleted.forEach(file => context.terminal.info(`  ${file.path}`));
  }
  
  if (renamed.length > 0) {
    context.terminal.info('\nRenamed files:');
    renamed.forEach(file => context.terminal.info(`  ${file.originalPath} -> ${file.path}`));
  }
  
  if (unstaged.length > 0) {
    context.terminal.info('\nUnstaged changes:');
    unstaged.forEach(file => context.terminal.info(`  ${file.path}`));
  }
}

/**
 * Display branch information
 */
async function displayBranchInfo(gitService: GitService, context: CommandContext): Promise<void> {
  const branches = await gitService.getBranches();
  const currentBranch = branches.find(b => b.current);
  
  context.terminal.info('🌿 Git Branches');
  context.terminal.info('============');
  
  if (currentBranch) {
    context.terminal.info(`Current branch: ${currentBranch.name}`);
    if (currentBranch.upstream) {
      context.terminal.info(`Upstream: ${currentBranch.upstream}`);
      if (currentBranch.ahead) {context.terminal.info(`Ahead by ${currentBranch.ahead} commit(s)`);}
      if (currentBranch.behind) {context.terminal.info(`Behind by ${currentBranch.behind} commit(s)`);}
    } else {
      context.terminal.info('No upstream branch configured');
    }
    context.terminal.info('');
  }
  
  context.terminal.info('All branches:');
  branches.forEach(branch => {
    const marker = branch.current ? '* ' : '  ';
    const upstreamInfo = branch.upstream 
      ? ` [${branch.upstream}${branch.ahead ? ` +${branch.ahead}` : ''}${branch.behind ? ` -${branch.behind}` : ''}]` 
      : '';
    context.terminal.info(`${marker}${branch.name}${upstreamInfo}`);
  });
}

/**
 * Display recent commits
 */
async function displayRecentCommits(gitService: GitService, context: CommandContext, limit = 10): Promise<void> {
  const commits = await gitService.getRecentCommits(limit);
  
  context.terminal.info(`📜 Recent Commits (last ${limit})`);
  context.terminal.info('========================');
  
  if (commits.length === 0) {
    context.terminal.info('No commits found');
    return;
  }
  
  commits.forEach(commit => {
    const date = commit.date.toLocaleDateString();
    const time = commit.date.toLocaleTimeString();
    context.terminal.info(`Commit: ${commit.shortHash}`);
    context.terminal.info(`Author: ${commit.author}`);
    context.terminal.info(`Date: ${date} ${time}`);
    context.terminal.info(`Message: ${commit.message}`);
    context.terminal.info('');
  });
}

/**
 * Display file diff
 */
async function displayFileDiff(gitService: GitService, context: CommandContext, filePath: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const diff = await gitService.getFileDiff(resolvedPath);
  
  context.terminal.info(`📄 Diff for ${filePath}`);
  context.terminal.info('========================');
  
  if (!diff) {
    context.terminal.info('No changes');
    return;
  }
  
  context.terminal.info(diff);
}

/**
 * Display file blame
 */
async function displayFileBlame(gitService: GitService, context: CommandContext, filePath: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const blame = await gitService.getFileBlame(resolvedPath);
  
  context.terminal.info(`📄 Blame for ${filePath}`);
  context.terminal.info('========================');
  
  if (!blame) {
    context.terminal.info('No blame information available');
    return;
  }
  
  context.terminal.info(blame);
}

/**
 * Create file snapshot
 */
async function createFileSnapshot(gitService: GitService, context: CommandContext, message: string, filePaths?: string[]): Promise<void> {
  context.terminal.info('📸 Creating file snapshot...');
  
  if (filePaths) {
    context.terminal.info(`Files: ${filePaths.join(', ')}`);
  } else {
    context.terminal.info('Including all changes');
  }
  
  const commitHash = await gitService.createFileSnapshot(message, filePaths);
  
  if (commitHash) {
    context.terminal.info(`✅ Snapshot created: ${commitHash}`);
    context.terminal.info(`Message: ${message}`);
  } else {
    context.terminal.info('❌ Failed to create snapshot (no changes to commit)');
  }
}
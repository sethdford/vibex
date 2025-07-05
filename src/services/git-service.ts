/**
 * Git Service
 * 
 * Provides a service for interacting with Git repositories, enabling features
 * like repository inspection, file snapshots, and commit management.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

// Promisify exec function
const execAsync = promisify(exec);

/**
 * Represents a Git branch
 */
export interface GitBranch {
  name: string;
  current: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

/**
 * Represents a Git commit
 */
export interface GitCommit {
  hash: string;
  shortHash: string;
  date: Date;
  author: string;
  message: string;
}

/**
 * Represents a Git file status
 */
export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'staged' | 'unstaged';
  originalPath?: string; // For renamed files
}

/**
 * Options for creating a file snapshot
 */
export interface FileSnapshotOptions {
  /** Custom message for the snapshot commit */
  message?: string;
  /** Whether to include untracked files in the snapshot */
  includeUntracked?: boolean;
}

/**
 * Git service for interacting with Git repositories
 */
export class GitService {
  /** Repository root directory */
  private readonly repoDir: string;
  
  /**
   * Create a new GitService
   * 
   * @param dir The directory inside the repository
   */
  constructor(dir: string) {
    this.repoDir = dir;
  }
  
  /**
   * Find repository root directory
   */
  async findRepositoryRoot(): Promise<string | null> {
    try {
      // Use git rev-parse to find the top-level directory of the repository
      const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: this.repoDir });
      return stdout.trim();
    } catch (error) {
      logger.debug(`Error finding git repository root: ${error}`);
      return null;
    }
  }
  
  /**
   * Check if the directory is a Git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: this.repoDir });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git symbolic-ref --short HEAD', { cwd: this.repoDir });
      return stdout.trim();
    } catch (error) {
      // We might be in a detached HEAD state
      try {
        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.repoDir });
        return stdout.trim();
      } catch {
        logger.debug(`Error getting current git branch: ${error}`);
        return null;
      }
    }
  }
  
  /**
   * Get information about all branches
   */
  async getBranches(): Promise<GitBranch[]> {
    try {
      const { stdout } = await execAsync('git branch -vv', { cwd: this.repoDir });
      const branches: GitBranch[] = [];
      
      const branchLines = stdout.trim().split('\n');
      for (const line of branchLines) {
        if (!line.trim()) {continue;}
        
        const current = line.startsWith('*');
        const lineWithoutCurrent = current ? line.substring(1).trim() : line.trim();
        const parts = lineWithoutCurrent.split(/\s+/);
        
        if (parts.length < 2) {continue;}
        
        const name = parts[0];
        const upstream = parts.length > 2 ? extractUpstream(parts.join(' ')) : undefined;
        const { ahead, behind } = extractAheadBehind(parts.join(' '));
        
        branches.push({ name, current, upstream, ahead, behind });
      }
      
      return branches;
    } catch (error) {
      logger.debug(`Error getting git branches: ${error}`);
      return [];
    }
  }
  
  /**
   * Get recent commits
   * 
   * @param limit Maximum number of commits to retrieve
   */
  async getRecentCommits(limit = 10): Promise<GitCommit[]> {
    try {
      const { stdout } = await execAsync(
        `git log --max-count=${limit} --pretty=format:"%H|%h|%an|%ad|%s"`,
        { cwd: this.repoDir }
      );
      
      const commits: GitCommit[] = [];
      const commitLines = stdout.trim().split('\n');
      
      for (const line of commitLines) {
        if (!line.trim()) {continue;}
        
        const parts = line.split('|');
        if (parts.length !== 5) {continue;}
        
        commits.push({
          hash: parts[0],
          shortHash: parts[1],
          author: parts[2],
          date: new Date(parts[3]),
          message: parts[4]
        });
      }
      
      return commits;
    } catch (error) {
      logger.debug(`Error getting git commits: ${error}`);
      return [];
    }
  }
  
  /**
   * Get the status of files in the repository
   */
  async getFileStatus(): Promise<GitFileStatus[]> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.repoDir });
      const files: GitFileStatus[] = [];
      
      const statusLines = stdout.trim().split('\n');
      for (const line of statusLines) {
        if (!line.trim()) {continue;}
        
        const statusCode = line.substring(0, 2);
        let filePath = line.substring(3).trim();
        let originalPath: string | undefined;
        
        if (line.includes(' -> ')) {
          const pathParts = filePath.split(' -> ');
          originalPath = pathParts[0];
          filePath = pathParts[1];
        }
        
        let status: GitFileStatus['status'];
        
        switch (statusCode) {
          case 'M ':
            status = 'modified';
            break;
          case ' M':
            status = 'unstaged';
            break;
          case 'MM':
            status = 'modified';
            break;
          case 'A ':
            status = 'added';
            break;
          case 'D ':
            status = 'deleted';
            break;
          case ' D':
            status = 'unstaged';
            break;
          case 'R ':
            status = 'renamed';
            break;
          case '??':
            status = 'untracked';
            break;
          default:
            status = 'modified';
        }
        
        files.push({ path: filePath, status, originalPath });
      }
      
      return files;
    } catch (error) {
      logger.debug(`Error getting git file status: ${error}`);
      return [];
    }
  }
  
  /**
   * Get the hash of the current commit
   */
  async getCurrentCommitHash(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.repoDir });
      return stdout.trim();
    } catch (error) {
      logger.debug(`Error getting current git commit hash: ${error}`);
      return null;
    }
  }
  
  /**
   * Create a snapshot of a file or files using a temporary commit
   * 
   * @param message Commit message for the snapshot
   * @param filePaths Optional specific file paths to snapshot (defaults to all changes)
   */
  async createFileSnapshot(message = 'VibeX snapshot', filePaths?: string[]): Promise<string | null> {
    try {
      // Check if there are any changes to commit
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: this.repoDir });
      if (!statusOutput.trim()) {
        logger.debug('No changes to commit for snapshot');
        return null;
      }
      
      // If specific files are provided, add only those
      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          await execAsync(`git add "${filePath}"`, { cwd: this.repoDir });
        }
      } else {
        // Otherwise, add all changes
        await execAsync('git add -A', { cwd: this.repoDir });
      }
      
      // Create the commit
      const { stdout } = await execAsync(
        `git commit -m "${message}"`,
        { cwd: this.repoDir }
      );
      
      // Extract the commit hash
      const match = stdout.match(/\[([^ ]+) ([a-f0-9]+)\]/);
      if (match && match[2]) {
        return match[2];
      }
      
      // Try alternative way to get commit hash
      return await this.getCurrentCommitHash();
    } catch (error) {
      logger.debug(`Error creating file snapshot: ${error}`);
      return null;
    }
  }
  
  /**
   * Check if a file is different from the last commit
   * 
   * @param filePath The file path to check
   */
  async isFileDifferentFromCommit(filePath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`git diff --quiet HEAD -- "${filePath}" || echo "different"`, { cwd: this.repoDir });
      return stdout.trim() === 'different';
    } catch (error) {
      // If the file is not in the repository, it's considered different
      return true;
    }
  }
  
  /**
   * Restore a file to its state in a given commit
   * 
   * @param filePath The file path to restore
   * @param commitHash The commit hash to restore from (defaults to HEAD)
   */
  async restoreFile(filePath: string, commitHash = 'HEAD'): Promise<boolean> {
    try {
      await execAsync(`git checkout ${commitHash} -- "${filePath}"`, { cwd: this.repoDir });
      return true;
    } catch (error) {
      logger.debug(`Error restoring file ${filePath} from commit ${commitHash}: ${error}`);
      return false;
    }
  }
  
  /**
   * Get the diff of a file compared to a given commit
   * 
   * @param filePath The file path to get the diff for
   * @param commitHash The commit hash to compare against (defaults to HEAD)
   */
  async getFileDiff(filePath: string, commitHash = 'HEAD'): Promise<string> {
    try {
      const { stdout } = await execAsync(`git diff ${commitHash} -- "${filePath}"`, { cwd: this.repoDir });
      return stdout;
    } catch (error) {
      logger.debug(`Error getting diff for file ${filePath}: ${error}`);
      return '';
    }
  }
  
  /**
   * Get the blame information for a file
   * 
   * @param filePath The file path to get blame for
   */
  async getFileBlame(filePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git blame "${filePath}"`, { cwd: this.repoDir });
      return stdout;
    } catch (error) {
      logger.debug(`Error getting blame for file ${filePath}: ${error}`);
      return '';
    }
  }
}

/**
 * Extract upstream branch information from branch output
 */
function extractUpstream(branchLine: string): string | undefined {
  const match = branchLine.match(/\[([^\]]+)\]/);
  if (match && match[1]) {
    // Extract just the branch name, ignoring ahead/behind info
    const upstreamInfo = match[1].split(':')[0];
    return upstreamInfo.trim();
  }
  return undefined;
}

/**
 * Extract ahead/behind information from branch output
 */
function extractAheadBehind(branchLine: string): { ahead?: number; behind?: number } {
  const result: { ahead?: number; behind?: number } = {};
  
  const aheadMatch = branchLine.match(/ahead (\d+)/);
  if (aheadMatch && aheadMatch[1]) {
    result.ahead = parseInt(aheadMatch[1], 10);
  }
  
  const behindMatch = branchLine.match(/behind (\d+)/);
  if (behindMatch && behindMatch[1]) {
    result.behind = parseInt(behindMatch[1], 10);
  }
  
  return result;
}
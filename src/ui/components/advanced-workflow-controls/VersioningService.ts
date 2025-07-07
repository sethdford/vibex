/**
 * Versioning Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for workflow version management and comparison
 */

import { logger } from '../../../utils/logger.js';
import type { WorkflowVersion } from './types.js';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';

/**
 * Service for managing workflow versions
 */
export class VersioningService {
  /**
   * Create a new workflow version
   */
  static createVersion(
    workflow: WorkflowDefinition,
    version: string,
    description: string,
    changeLog: string[] = [],
    author: string = 'User',
    tags: string[] = []
  ): WorkflowVersion {
    const newVersion: WorkflowVersion = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version,
      name: workflow.name,
      description,
      workflow: { ...workflow },
      createdAt: new Date(),
      author,
      tags,
      changeLog,
    };

    logger.info('Workflow version created', {
      versionId: newVersion.id,
      version,
      description,
      workflowId: workflow.id
    });

    return newVersion;
  }

  /**
   * Add version to collection
   */
  static addVersion(
    versions: Map<string, WorkflowVersion>,
    version: WorkflowVersion
  ): Map<string, WorkflowVersion> {
    const newVersions = new Map(versions);
    newVersions.set(version.id, version);
    return newVersions;
  }

  /**
   * Remove version from collection
   */
  static removeVersion(
    versions: Map<string, WorkflowVersion>,
    versionId: string
  ): Map<string, WorkflowVersion> {
    const newVersions = new Map(versions);
    newVersions.delete(versionId);
    
    logger.info('Workflow version removed', { versionId });
    
    return newVersions;
  }

  /**
   * Get version by ID
   */
  static getVersion(
    versions: Map<string, WorkflowVersion>,
    versionId: string
  ): WorkflowVersion | null {
    return versions.get(versionId) || null;
  }

  /**
   * Get all versions sorted by creation date
   */
  static getSortedVersions(
    versions: Map<string, WorkflowVersion>,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): WorkflowVersion[] {
    const versionList = Array.from(versions.values());
    
    return versionList.sort((a, b) => {
      const timeA = a.createdAt.getTime();
      const timeB = b.createdAt.getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }

  /**
   * Compare two workflow versions
   */
  static compareVersions(
    versionA: WorkflowVersion,
    versionB: WorkflowVersion
  ): {
    summary: {
      tasksAdded: number;
      tasksRemoved: number;
      tasksModified: number;
      nameChanged: boolean;
      descriptionChanged: boolean;
    };
    details: {
      addedTasks: Array<{ id: string; name: string }>;
      removedTasks: Array<{ id: string; name: string }>;
      modifiedTasks: Array<{
        id: string;
        name: string;
        changes: string[];
      }>;
      metadataChanges: string[];
    };
  } {
    const workflowA = versionA.workflow;
    const workflowB = versionB.workflow;

    // Create task maps for easy comparison
    const tasksA = new Map(workflowA.tasks.map(task => [task.id, task]));
    const tasksB = new Map(workflowB.tasks.map(task => [task.id, task]));

    // Find added tasks (in B but not in A)
    const addedTasks = Array.from(tasksB.entries())
      .filter(([id]) => !tasksA.has(id))
      .map(([id, task]) => ({ id, name: task.name }));

    // Find removed tasks (in A but not in B)
    const removedTasks = Array.from(tasksA.entries())
      .filter(([id]) => !tasksB.has(id))
      .map(([id, task]) => ({ id, name: task.name }));

    // Find modified tasks (present in both but different)
    const modifiedTasks: Array<{
      id: string;
      name: string;
      changes: string[];
    }> = [];

    for (const [id, taskA] of tasksA.entries()) {
      const taskB = tasksB.get(id);
      if (taskB) {
        const changes = this.compareTaskDefinitions(taskA, taskB);
        if (changes.length > 0) {
          modifiedTasks.push({
            id,
            name: taskA.name,
            changes,
          });
        }
      }
    }

    // Check metadata changes
    const metadataChanges: string[] = [];
    if (workflowA.name !== workflowB.name) {
      metadataChanges.push(`Name: "${workflowA.name}" → "${workflowB.name}"`);
    }
    if (workflowA.description !== workflowB.description) {
      metadataChanges.push(`Description changed`);
    }

    return {
      summary: {
        tasksAdded: addedTasks.length,
        tasksRemoved: removedTasks.length,
        tasksModified: modifiedTasks.length,
        nameChanged: workflowA.name !== workflowB.name,
        descriptionChanged: workflowA.description !== workflowB.description,
      },
      details: {
        addedTasks,
        removedTasks,
        modifiedTasks,
        metadataChanges,
      },
    };
  }

  /**
   * Compare two task definitions
   */
  private static compareTaskDefinitions(taskA: any, taskB: any): string[] {
    const changes: string[] = [];

    if (taskA.name !== taskB.name) {
      changes.push(`Name: "${taskA.name}" → "${taskB.name}"`);
    }

    if (taskA.description !== taskB.description) {
      changes.push('Description changed');
    }

    if (taskA.status !== taskB.status) {
      changes.push(`Status: ${taskA.status} → ${taskB.status}`);
    }

    if (taskA.priority !== taskB.priority) {
      changes.push(`Priority: ${taskA.priority} → ${taskB.priority}`);
    }

    // Compare dependencies
    const depsA = new Set(taskA.dependencies || []);
    const depsB = new Set(taskB.dependencies || []);
    
    if (depsA.size !== depsB.size || ![...depsA].every(dep => depsB.has(dep))) {
      changes.push('Dependencies changed');
    }

    return changes;
  }

  /**
   * Create automatic version from current workflow
   */
  static createAutoVersion(
    workflow: WorkflowDefinition,
    previousVersions: Map<string, WorkflowVersion>,
    changeDescription?: string
  ): WorkflowVersion {
    const versionCount = previousVersions.size;
    const majorVersion = Math.floor(versionCount / 10) + 1;
    const minorVersion = versionCount % 10;
    
    const version = `${majorVersion}.${minorVersion}.0`;
    const description = changeDescription || `Automatic version ${version}`;
    
    const changeLog = [
      `Version ${version} created automatically`,
      ...(changeDescription ? [changeDescription] : []),
    ];

    return this.createVersion(
      workflow,
      version,
      description,
      changeLog,
      'System',
      ['auto']
    );
  }

  /**
   * Restore workflow to specific version
   */
  static restoreToVersion(
    versions: Map<string, WorkflowVersion>,
    versionId: string
  ): WorkflowDefinition | null {
    const version = versions.get(versionId);
    if (!version) {
      logger.warn('Version not found for restore', { versionId });
      return null;
    }

    logger.info('Workflow restored to version', {
      versionId,
      version: version.version,
      workflowId: version.workflow.id
    });

    return { ...version.workflow };
  }

  /**
   * Get version statistics
   */
  static getVersionStats(
    versions: Map<string, WorkflowVersion>
  ): {
    totalVersions: number;
    latestVersion: WorkflowVersion | null;
    oldestVersion: WorkflowVersion | null;
    averageTimeBetweenVersions: number;
    mostActiveAuthor: string | null;
    authorCounts: Map<string, number>;
  } {
    const versionList = Array.from(versions.values());
    
    if (versionList.length === 0) {
      return {
        totalVersions: 0,
        latestVersion: null,
        oldestVersion: null,
        averageTimeBetweenVersions: 0,
        mostActiveAuthor: null,
        authorCounts: new Map(),
      };
    }

    const sortedVersions = versionList.sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    const latestVersion = sortedVersions[sortedVersions.length - 1];
    const oldestVersion = sortedVersions[0];

    // Calculate average time between versions
    let averageTimeBetweenVersions = 0;
    if (sortedVersions.length > 1) {
      const totalTime = latestVersion.createdAt.getTime() - oldestVersion.createdAt.getTime();
      averageTimeBetweenVersions = totalTime / (sortedVersions.length - 1);
    }

    // Count authors
    const authorCounts = new Map<string, number>();
    for (const version of versionList) {
      authorCounts.set(version.author, (authorCounts.get(version.author) || 0) + 1);
    }

    const mostActiveAuthor = authorCounts.size > 0 
      ? Array.from(authorCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      totalVersions: versionList.length,
      latestVersion,
      oldestVersion,
      averageTimeBetweenVersions,
      mostActiveAuthor,
      authorCounts,
    };
  }

  /**
   * Export version history
   */
  static exportVersionHistory(
    versions: Map<string, WorkflowVersion>
  ): {
    timestamp: number;
    stats: ReturnType<typeof VersioningService.getVersionStats>;
    versions: WorkflowVersion[];
  } {
    return {
      timestamp: Date.now(),
      stats: this.getVersionStats(versions),
      versions: this.getSortedVersions(versions),
    };
  }
} 
/**
 * Sandbox execution environment for vibex
 * 
 * Provides a secure containerized sandbox for executing code and tools,
 * ensuring isolation from the host system.
 */

import type { ChildProcess} from 'child_process';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { logger } from '../../utils/logger.js';
import { createUserError } from '../../errors/formatter.js';
import { ErrorCategory } from '../../errors/types.js';

/**
 * Sandbox profile type
 */
export type SandboxProfile = 'default' | 'restricted' | 'read-only' | 'network' | 'full';

/**
 * Container runtime type
 */
export type ContainerRuntime = 'docker' | 'podman' | 'native';

/**
 * Sandbox configuration options
 */
export interface SandboxOptions {
  /**
   * The sandbox profile to use
   */
  profile?: SandboxProfile;
  
  /**
   * Container runtime to use
   */
  runtime?: ContainerRuntime;
  
  /**
   * Directories to mount in the sandbox
   */
  mounts?: Array<{ source: string; target: string; readOnly?: boolean }>;
  
  /**
   * Environment variables to set in the sandbox
   */
  env?: Record<string, string>;
  
  /**
   * Maximum memory limit in MB
   */
  memoryLimitMb?: number;
  
  /**
   * Maximum CPU limit
   */
  cpuLimit?: number;
  
  /**
   * Working directory inside the sandbox
   */
  workdir?: string;
  
  /**
   * Timeout for commands in milliseconds
   */
  timeout?: number;
  
  /**
   * Container image to use
   */
  image?: string;
  
  /**
   * Network access mode
   */
  network?: 'bridge' | 'host' | 'none';
}

/**
 * Default sandbox options
 */
const DEFAULT_SANDBOX_OPTIONS: SandboxOptions = {
  profile: 'default',
  runtime: 'docker',
  mounts: [],
  env: {},
  memoryLimitMb: 512,
  cpuLimit: 1,
  workdir: '/workspace',
  timeout: 30000,
  image: 'vibex-sandbox:latest',
  network: 'none'
};

/**
 * Result of executing a command in the sandbox
 */
export interface SandboxResult {
  /**
   * The command exit code
   */
  exitCode: number;
  
  /**
   * Standard output from the command
   */
  stdout: string;
  
  /**
   * Standard error from the command
   */
  stderr: string;
  
  /**
   * Error if one occurred
   */
  error?: Error;
}

/**
 * Sandbox execution environment
 */
export class Sandbox {
  private readonly options: SandboxOptions;
  private containerId: string | null = null;
  private readonly containerProcess: ChildProcess | null = null;
  
  /**
   * Create a new sandbox
   */
  constructor(options: SandboxOptions = {}) {
    this.options = { ...DEFAULT_SANDBOX_OPTIONS, ...options };
  }
  
  /**
   * Initialize the sandbox
   */
  async initialize(): Promise<void> {
    // Check if the container runtime is available
    await this.checkRuntimeAvailability();
    
    // Create sandbox container
    await this.createSandboxContainer();
    
    logger.info(`Sandbox initialized with ${this.options.runtime} runtime`);
  }
  
  /**
   * Check if the specified container runtime is available
   */
  private async checkRuntimeAvailability(): Promise<void> {
    try {
      const { runtime } = this.options;
      
      // For native sandboxing, check for platform-specific tools
      if (runtime === 'native') {
        if (os.platform() === 'linux') {
          await this.runHostCommand('which', ['firejail']);
        } else if (os.platform() === 'darwin') {
          await this.runHostCommand('which', ['sandbox-exec']);
        } else if (os.platform() === 'win32') {
          // Check for Windows sandbox capabilities
          const { stdout } = await this.runHostCommand('powershell', [
            '-Command',
            '(Get-WindowsOptionalFeature -FeatureName Containers-DisposableClientVM -Online).State'
          ]);
          if (!stdout.includes('Enabled')) {
            throw new Error('Windows Sandbox feature is not enabled');
          }
        } else {
          throw new Error(`Native sandboxing is not supported on ${os.platform()}`);
        }
      } else {
        // Check for container runtime
        await this.runHostCommand(runtime!, ['--version']);
      }
    } catch (error) {
      throw createUserError(`Failed to verify ${this.options.runtime} availability: ${error}`, {
        category: ErrorCategory.SYSTEM,
        cause: error
      });
    }
  }
  
  /**
   * Create a sandbox container based on the configured options
   */
  private async createSandboxContainer(): Promise<void> {
    const { runtime, image, memoryLimitMb, cpuLimit, mounts, env, workdir, network } = this.options;
    
    try {
      // For container-based sandbox
      if (runtime === 'docker' || runtime === 'podman') {
        // Pull the image if needed
        await this.runHostCommand(runtime, ['pull', image!]);
        
        // Prepare container arguments
        const args = ['run', '--detach', '--rm'];
        
        // Add resource limits
        args.push('--memory', `${memoryLimitMb}m`);
        args.push('--cpus', `${cpuLimit}`);
        
        // Set network mode
        args.push('--network', network!);
        
        // Add environment variables
        Object.entries(env || {}).forEach(([key, value]) => {
          args.push('-e', `${key}=${value}`);
        });
        
        // Add volume mounts
        (mounts || []).forEach(mount => {
          const mountOptions = mount.readOnly ? 'ro' : 'rw';
          args.push('-v', `${mount.source}:${mount.target}:${mountOptions}`);
        });
        
        // Set working directory
        if (workdir) {
          args.push('-w', workdir);
        }
        
        // Add image name
        args.push(image!);
        
        // Keep the container running
        args.push('tail', '-f', '/dev/null');
        
        // Run the container
        const { stdout } = await this.runHostCommand(runtime, args);
        this.containerId = stdout.trim();
        
        logger.info(`Created ${runtime} container: ${this.containerId}`);
      } else if (runtime === 'native') {
        // Native sandboxing setup logic will depend on the platform
        await this.setupNativeSandbox();
      }
    } catch (error) {
      throw createUserError(`Failed to create sandbox environment: ${error}`, {
        category: ErrorCategory.SYSTEM,
        cause: error
      });
    }
  }
  
  /**
   * Set up native sandboxing based on the platform
   */
  private async setupNativeSandbox(): Promise<void> {
    const platform = os.platform();
    
    switch (platform) {
      case 'linux':
        await this.setupLinuxSandbox();
        break;
      case 'darwin':
        await this.setupMacSandbox();
        break;
      case 'win32':
        await this.setupWindowsSandbox();
        break;
      default:
        throw new Error(`Native sandboxing is not supported on ${platform}`);
    }
  }
  
  /**
   * Set up Linux sandbox using Firejail
   */
  private async setupLinuxSandbox(): Promise<void> {
    // Firejail profile path
    const profilePath = path.join(os.tmpdir(), 'vibex-firejail-profile');
    
    // Create a Firejail profile
    const profile = this.generateLinuxSandboxProfile();
    
    await fs.writeFile(profilePath, profile, 'utf8');
    logger.info('Created Linux sandbox profile at', profilePath);
  }
  
  /**
   * Generate Linux sandbox profile for Firejail
   */
  private generateLinuxSandboxProfile(): string {
    // Generate a Firejail profile based on the configured options
    const { profile, mounts, workdir } = this.options;
    
    let firejailProfile = '# Generated Firejail profile for vibex\n';
    
    // Add general security settings
    firejailProfile += 'include /etc/firejail/default.profile\n';
    firejailProfile += 'blacklist /boot\n';
    firejailProfile += 'blacklist /root\n';
    
    // Configure network access based on profile
    if (profile === 'restricted' || profile === 'read-only') {
      firejailProfile += 'net none\n';
    }
    
    // Configure filesystem access
    if (profile === 'read-only') {
      firejailProfile += 'read-only ${HOME}\n';
    }
    
    // Add mounts
    (mounts || []).forEach(mount => {
      if (mount.readOnly) {
        firejailProfile += `read-only-bind ${mount.source} ${mount.target}\n`;
      } else {
        firejailProfile += `bind ${mount.source} ${mount.target}\n`;
      }
    });
    
    // Set working directory
    if (workdir) {
      firejailProfile += `whitelist ${workdir}\n`;
    }
    
    return firejailProfile;
  }
  
  /**
   * Set up macOS sandbox using sandbox-exec
   */
  private async setupMacSandbox(): Promise<void> {
    // sandbox-exec profile path
    const profilePath = path.join(os.tmpdir(), 'vibex-sandbox-profile.sb');
    
    // Create a sandbox-exec profile
    const profile = this.generateMacSandboxProfile();
    
    await fs.writeFile(profilePath, profile, 'utf8');
    logger.info('Created macOS sandbox profile at', profilePath);
  }
  
  /**
   * Generate macOS sandbox profile for sandbox-exec
   */
  private generateMacSandboxProfile(): string {
    // Generate a sandbox-exec profile based on the configured options
    const { profile, mounts } = this.options;
    
    let sandboxProfile = '(version 1)\n';
    
    // Add basic allow rules
    sandboxProfile += '(allow default)\n';
    
    // Configure filesystem access based on profile
    if (profile === 'restricted' || profile === 'read-only') {
      sandboxProfile += '(deny file-write*)\n';
      
      // Allow writes to temporary directories
      sandboxProfile += '(allow file-write* (regex #"^/tmp/"))\n';
      sandboxProfile += '(allow file-write* (regex #"^/var/tmp/"))\n';
      
      // Allow writes to specific mounted directories that aren't read-only
      (mounts || []).forEach(mount => {
        if (!mount.readOnly) {
          sandboxProfile += `(allow file-write* (regex #"^${mount.target}"))\n`;
        }
      });
    }
    
    // Configure network access based on profile
    if (profile === 'restricted' || profile === 'read-only') {
      sandboxProfile += '(deny network*)\n';
    } else if (profile === 'network') {
      sandboxProfile += '(allow network*)\n';
    }
    
    return sandboxProfile;
  }
  
  /**
   * Set up Windows sandbox
   */
  private async setupWindowsSandbox(): Promise<void> {
    // Windows sandbox configuration file
    const configPath = path.join(os.tmpdir(), 'vibex-sandbox-config.wsb');
    
    // Create a Windows sandbox configuration
    const config = this.generateWindowsSandboxConfig();
    
    await fs.writeFile(configPath, config, 'utf8');
    logger.info('Created Windows sandbox configuration at', configPath);
  }
  
  /**
   * Generate Windows sandbox configuration
   */
  private generateWindowsSandboxConfig(): string {
    // Generate a Windows sandbox configuration based on options
    const { mounts, memoryLimitMb, workdir } = this.options;
    
    let config = '<?xml version="1.0" encoding="UTF-8"?>\n';
    config += '<Configuration>\n';
    
    // Memory allocation
    config += `  <MemoryInMB>${memoryLimitMb}</MemoryInMB>\n`;
    
    // Network access
    if (this.options.network === 'none') {
      config += '  <Networking>Disable</Networking>\n';
    }
    
    // Add mapped folders
    config += '  <MappedFolders>\n';
    (mounts || []).forEach(mount => {
      config += '    <MappedFolder>\n';
      config += `      <HostFolder>${mount.source}</HostFolder>\n`;
      config += `      <SandboxFolder>${mount.target}</SandboxFolder>\n`;
      config += `      <ReadOnly>${mount.readOnly ? 'true' : 'false'}</ReadOnly>\n`;
      config += '    </MappedFolder>\n';
    });
    config += '  </MappedFolders>\n';
    
    // Add startup command if workdir is specified
    if (workdir) {
      config += `  <LogonCommand><Command>cd "${workdir}"</Command></LogonCommand>\n`;
    }
    
    config += '</Configuration>\n';
    
    return config;
  }
  
  /**
   * Run a command in the sandbox
   */
  async exec(command: string, args: string[] = []): Promise<SandboxResult> {
    if (!this.containerId && this.options.runtime !== 'native') {
      throw new Error('Sandbox is not initialized');
    }
    
    try {
      if (this.options.runtime === 'docker' || this.options.runtime === 'podman') {
        // Execute in container
        return this.execInContainer(command, args);
      } else {
        // Execute in native sandbox
        return this.execInNativeSandbox(command, args);
      }
    } catch (error) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Execute a command in a container
   */
  private async execInContainer(command: string, args: string[] = []): Promise<SandboxResult> {
    const runtime = this.options.runtime as 'docker' | 'podman';
    const execArgs = ['exec', this.containerId!, command, ...args];
    
    try {
      return await this.runHostCommand(runtime, execArgs, this.options.timeout);
    } catch (error) {
      // Handle timeout or execution error
      if ((error as any).timedOut) {
        return {
          exitCode: 124, // Standard timeout exit code
          stdout: '',
          stderr: `Command timed out after ${this.options.timeout}ms`,
          error: error as Error
        };
      }
      
      return {
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Execute a command in a native sandbox
   */
  private async execInNativeSandbox(command: string, args: string[] = []): Promise<SandboxResult> {
    const platform = os.platform();
    
    switch (platform) {
      case 'linux':
        return this.execInLinuxSandbox(command, args);
      case 'darwin':
        return this.execInMacSandbox(command, args);
      case 'win32':
        return this.execInWindowsSandbox(command, args);
      default:
        throw new Error(`Native sandboxing is not supported on ${platform}`);
    }
  }
  
  /**
   * Execute a command in a Linux sandbox using Firejail
   */
  private async execInLinuxSandbox(command: string, args: string[] = []): Promise<SandboxResult> {
    const profilePath = path.join(os.tmpdir(), 'vibex-firejail-profile');
    const firejailArgs = [`--profile=${profilePath}`, '--quiet', command, ...args];
    
    return this.runHostCommand('firejail', firejailArgs, this.options.timeout);
  }
  
  /**
   * Execute a command in a macOS sandbox using sandbox-exec
   */
  private async execInMacSandbox(command: string, args: string[] = []): Promise<SandboxResult> {
    const profilePath = path.join(os.tmpdir(), 'vibex-sandbox-profile.sb');
    const sandboxArgs = ['-f', profilePath, command, ...args];
    
    return this.runHostCommand('sandbox-exec', sandboxArgs, this.options.timeout);
  }
  
  /**
   * Execute a command in a Windows sandbox
   */
  private async execInWindowsSandbox(command: string, args: string[] = []): Promise<SandboxResult> {
    // Windows sandbox execution is more complex as it requires launching
    // a GUI sandbox and running commands within it. This is a basic implementation.
    const configPath = path.join(os.tmpdir(), 'vibex-sandbox-config.wsb');
    const scriptPath = path.join(os.tmpdir(), 'vibex-sandbox-command.ps1');
    
    // Create a PowerShell script to run the command
    const script = `
      try {
        $output = & "${command}" ${args.map(a => `"${a}"`).join(' ')} 2>&1
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq $null) { $exitCode = 0 }
      } catch {
        $output = $_.Exception.Message
        $exitCode = 1
      }
      
      @{
        ExitCode = $exitCode
        Output = $output | Out-String
      } | ConvertTo-Json > "${path.join(os.tmpdir(), 'vibex-sandbox-output.json')}"
    `;
    
    await fs.writeFile(scriptPath, script, 'utf8');
    
    // Run Windows Sandbox with the configuration
    await this.runHostCommand('WindowsSandbox', [configPath]);
    
    // Wait for output file
    let retries = 10;
    while (retries > 0) {
      try {
        const outputPath = path.join(os.tmpdir(), 'vibex-sandbox-output.json');
        const output = await fs.readFile(outputPath, 'utf8');
        const result = JSON.parse(output);
        
        return {
          exitCode: result.ExitCode || 0,
          stdout: result.Output || '',
          stderr: ''
        };
      } catch (error) {
        retries--;
        if (retries <= 0) {
          throw error;
        }
        
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Failed to get output from Windows Sandbox');
  }
  
  /**
   * Run a command on the host
   */
  private async runHostCommand(
    command: string,
    args: string[] = [],
    timeoutMs?: number
  ): Promise<SandboxResult> {
    return new Promise<SandboxResult>((resolve, reject) => {
      const proc = spawn(command, args);
      let stdout = '';
      let stderr = '';
      
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          proc.kill();
          const error = new Error(`Command timed out after ${timeoutMs}ms`);
          (error as any).timedOut = true;
          reject(error);
        }, timeoutMs);
      }
      
      proc.stdout.on('data', data => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', data => {
        stderr += data.toString();
      });
      
      proc.on('error', error => {
        if (timeoutId) {clearTimeout(timeoutId);}
        reject(error);
      });
      
      proc.on('close', code => {
        if (timeoutId) {clearTimeout(timeoutId);}
        
        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });
    });
  }
  
  /**
   * Clean up sandbox resources
   */
  async cleanup(): Promise<void> {
    try {
      // If we have a container, stop and remove it
      if (this.containerId) {
        const runtime = this.options.runtime as 'docker' | 'podman';
        await this.runHostCommand(runtime, ['stop', this.containerId]);
        logger.info(`Stopped ${runtime} container: ${this.containerId}`);
        this.containerId = null;
      }
      
      // If we have a native sandbox, clean up resources
      if (this.options.runtime === 'native') {
        const platform = os.platform();
        
        if (platform === 'linux') {
          const profilePath = path.join(os.tmpdir(), 'vibex-firejail-profile');
          await fs.unlink(profilePath).catch(() => {});
        } else if (platform === 'darwin') {
          const profilePath = path.join(os.tmpdir(), 'vibex-sandbox-profile.sb');
          await fs.unlink(profilePath).catch(() => {});
        } else if (platform === 'win32') {
          const configPath = path.join(os.tmpdir(), 'vibex-sandbox-config.wsb');
          const scriptPath = path.join(os.tmpdir(), 'vibex-sandbox-command.ps1');
          const outputPath = path.join(os.tmpdir(), 'vibex-sandbox-output.json');
          
          await Promise.all([
            fs.unlink(configPath).catch(() => {}),
            fs.unlink(scriptPath).catch(() => {}),
            fs.unlink(outputPath).catch(() => {})
          ]);
        }
      }
      
      logger.info('Sandbox cleaned up');
    } catch (error) {
      logger.error('Failed to clean up sandbox:', error);
    }
  }
}

// Export singleton instance
export const sandbox = new Sandbox();
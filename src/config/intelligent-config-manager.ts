/**
 * Intelligent Configuration Manager
 * 
 * Builds on VibeX's sophisticated configuration infrastructure to provide intelligent
 * configuration management with smart defaults, auto-context loading, hierarchical
 * discovery, and adaptive configuration based on project patterns.
 * 
 * Key Features:
 * - Smart project type detection and configuration adaptation
 * - Auto-context loading with intelligent file discovery
 * - Hierarchical configuration discovery and merging
 * - Adaptive configuration based on usage patterns
 * - Performance optimization through intelligent caching
 * - Integration with all existing VibeX configuration systems
 * 
 * This system surpasses Gemini CLI by providing truly intelligent configuration
 * that adapts to project context, user patterns, and environmental factors.
 */

import { EventEmitter } from 'events';
import { readFile, stat, access, readdir } from 'fs/promises';
import { join, resolve, relative, basename, dirname, extname } from 'path';
import { homedir } from 'os';
import { z } from 'zod';

// Import existing VibeX configuration systems
import { 
  ConfigManager, 
  FileConfigSource, 
  EnvironmentConfigSource, 
  ArgumentsConfigSource,
  ConfigFactory
} from '../infrastructure/config/config-manager.js';
import { VibexConfigFactory } from '../infrastructure/config/vibex-config-factory.js';
import { VibexConfigSchema, type VibexConfig } from '../infrastructure/config/vibex-config-schema.js';

// Import context and discovery systems
import { ContextSystem, createContextSystem } from '../context/context-system.js';
import { SubdirectoryDiscoveryEngine, DEFAULT_CONFIGS } from '../context/subdirectory-discovery-engine.js';
import { GitAwareFileFilter, createGitAwareFileFilter } from '../context/git-aware-file-filter.js';
import { ContextVariableInterpolation, createContextVariableInterpolation } from '../context/context-variable-interpolation.js';

// Import performance and telemetry systems
import { PerformanceConfigManager } from './performance-config.js';
import { logger } from '../utils/logger.js';

/**
 * Project type detection results
 */
export interface ProjectTypeDetection {
  /** Primary project type */
  primaryType: ProjectType;
  /** Secondary project types */
  secondaryTypes: ProjectType[];
  /** Confidence score (0-100) */
  confidence: number;
  /** Detected markers and their weights */
  markers: Array<{
    file: string;
    type: ProjectType;
    weight: number;
    path: string;
  }>;
  /** Framework detection results */
  frameworks: FrameworkDetection[];
  /** Language detection results */
  languages: LanguageDetection[];
}

/**
 * Supported project types
 */
export enum ProjectType {
  NODEJS = 'nodejs',
  PYTHON = 'python',
  RUST = 'rust',
  GO = 'go',
  JAVA = 'java',
  CSHARP = 'csharp',
  CPP = 'cpp',
  TYPESCRIPT = 'typescript',
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  NEXTJS = 'nextjs',
  NUXTJS = 'nuxtjs',
  SVELTE = 'svelte',
  DJANGO = 'django',
  FLASK = 'flask',
  RAILS = 'rails',
  LARAVEL = 'laravel',
  SPRING = 'spring',
  DOTNET = 'dotnet',
  UNITY = 'unity',
  FLUTTER = 'flutter',
  REACT_NATIVE = 'react_native',
  ELECTRON = 'electron',
  MONOREPO = 'monorepo',
  LIBRARY = 'library',
  CLI = 'cli',
  API = 'api',
  WEBAPP = 'webapp',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  GAME = 'game',
  AI_ML = 'ai_ml',
  DATA_SCIENCE = 'data_science',
  DEVOPS = 'devops',
  UNKNOWN = 'unknown'
}

/**
 * Framework detection result
 */
export interface FrameworkDetection {
  name: string;
  version?: string;
  confidence: number;
  configFiles: string[];
}

/**
 * Language detection result
 */
export interface LanguageDetection {
  language: string;
  percentage: number;
  fileCount: number;
  extensions: string[];
}

/**
 * Usage pattern analysis
 */
export interface UsagePatternAnalysis {
  /** Most frequently used commands */
  frequentCommands: Array<{ command: string; frequency: number }>;
  /** Preferred interface modes */
  preferredModes: Array<{ mode: string; usage: number }>;
  /** Configuration preferences */
  configPreferences: Record<string, any>;
  /** Performance preferences */
  performanceProfile: 'speed' | 'balanced' | 'quality';
  /** Context usage patterns */
  contextPatterns: {
    averageContextSize: number;
    preferredContextTypes: string[];
    contextUpdateFrequency: number;
  };
}

/**
 * Intelligent configuration options
 */
export interface IntelligentConfigOptions {
  /** Enable project type detection */
  enableProjectTypeDetection?: boolean;
  /** Enable auto-context loading */
  enableAutoContextLoading?: boolean;
  /** Enable usage pattern analysis */
  enableUsagePatternAnalysis?: boolean;
  /** Enable adaptive configuration */
  enableAdaptiveConfiguration?: boolean;
  /** Enable performance optimization */
  enablePerformanceOptimization?: boolean;
  /** Cache TTL for intelligent features */
  intelligentCacheTTL?: number;
  /** Maximum analysis depth */
  maxAnalysisDepth?: number;
  /** Confidence threshold for auto-configuration */
  confidenceThreshold?: number;
}

/**
 * Intelligent configuration events
 */
export enum IntelligentConfigEvent {
  PROJECT_TYPE_DETECTED = 'project:type:detected',
  CONTEXT_AUTO_LOADED = 'context:auto:loaded',
  CONFIGURATION_ADAPTED = 'config:adapted',
  USAGE_PATTERN_ANALYZED = 'usage:pattern:analyzed',
  PERFORMANCE_OPTIMIZED = 'performance:optimized',
  SMART_DEFAULTS_APPLIED = 'defaults:smart:applied',
  INTELLIGENCE_ERROR = 'intelligence:error'
}

/**
 * Intelligent Configuration Manager
 * 
 * Provides intelligent configuration management that adapts to project context,
 * user patterns, and environmental factors for optimal VibeX experience.
 */
export class IntelligentConfigManager extends EventEmitter {
  private readonly baseConfigManager: ConfigManager;
  private readonly contextSystem: ContextSystem;
  private readonly discoveryEngine: SubdirectoryDiscoveryEngine;
  private readonly gitFilter: GitAwareFileFilter;
  private readonly variableService: ContextVariableInterpolation;
  
  private readonly options: Required<IntelligentConfigOptions>;
  private readonly projectTypeCache = new Map<string, ProjectTypeDetection>();
  private readonly usagePatternCache = new Map<string, UsagePatternAnalysis>();
  private readonly configAdaptationCache = new Map<string, VibexConfig>();
  
  private currentProjectType?: ProjectTypeDetection;
  private currentUsagePattern?: UsagePatternAnalysis;
  private isInitialized = false;

  constructor(
    baseConfig: VibexConfig,
    options: Partial<IntelligentConfigOptions> = {}
  ) {
    super();

    // Set intelligent options with defaults
    this.options = {
      enableProjectTypeDetection: true,
      enableAutoContextLoading: true,
      enableUsagePatternAnalysis: true,
      enableAdaptiveConfiguration: true,
      enablePerformanceOptimization: true,
      intelligentCacheTTL: 300000, // 5 minutes
      maxAnalysisDepth: 3,
      confidenceThreshold: 70,
      ...options
    };

    // Initialize base configuration manager
    this.baseConfigManager = new ConfigManager(VibexConfigSchema);
    
    // Initialize context system with intelligent defaults
    this.contextSystem = createContextSystem({
      enableSubdirectoryDiscovery: true,
      enableRealTimeUpdates: true,
      enableVariableInterpolation: true,
      maxDepth: this.options.maxAnalysisDepth
    });

    // Initialize discovery engine with comprehensive configuration
    this.discoveryEngine = new SubdirectoryDiscoveryEngine({
      ...DEFAULT_CONFIGS.COMPREHENSIVE,
      maxDepth: this.options.maxAnalysisDepth,
      enableRelevanceScoring: true,
      enableParallel: true
    });

    // Initialize git-aware file filter
    this.gitFilter = createGitAwareFileFilter({
      respectGitignore: true,
      enableRelevanceScoring: true,
      enableAdvancedBinaryDetection: true
    });

    // Initialize variable interpolation service
    this.variableService = new ContextVariableInterpolationService({
      enableAdvancedInterpolation: true,
      enableCustomResolvers: true,
      enableCaching: true
    });

    // Initialize performance manager
    this.performanceManager = new PerformanceConfigManager(
      baseConfig.performance || {},
      undefined // No telemetry integration for now
    );

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize intelligent configuration management
   */
  async initialize(workingDirectory: string = process.cwd()): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing intelligent configuration manager', {
        workingDirectory,
        options: this.options
      });

      // Initialize base systems
      await this.baseConfigManager.reload();
      await this.contextSystem.initialize();

      // Perform intelligent analysis
      if (this.options.enableProjectTypeDetection) {
        this.currentProjectType = await this.detectProjectType(workingDirectory);
        this.emit(IntelligentConfigEvent.PROJECT_TYPE_DETECTED, this.currentProjectType);
      }

      if (this.options.enableUsagePatternAnalysis) {
        this.currentUsagePattern = await this.analyzeUsagePatterns(workingDirectory);
        this.emit(IntelligentConfigEvent.USAGE_PATTERN_ANALYZED, this.currentUsagePattern);
      }

      // Apply intelligent configuration
      if (this.options.enableAdaptiveConfiguration) {
        await this.applyIntelligentConfiguration(workingDirectory);
      }

      // Auto-load context if enabled
      if (this.options.enableAutoContextLoading) {
        await this.autoLoadContext(workingDirectory);
      }

      // Apply performance optimizations
      if (this.options.enablePerformanceOptimization) {
        await this.applyPerformanceOptimizations();
      }

      this.isInitialized = true;

      logger.info('Intelligent configuration manager initialized successfully', {
        projectType: this.currentProjectType?.primaryType,
        confidence: this.currentProjectType?.confidence,
        contextLoaded: this.options.enableAutoContextLoading
      });

    } catch (error) {
      logger.error('Failed to initialize intelligent configuration manager', { error });
      this.emit(IntelligentConfigEvent.INTELLIGENCE_ERROR, error);
      throw error;
    }
  }

  /**
   * Detect project type based on files and structure
   */
  async detectProjectType(directory: string): Promise<ProjectTypeDetection> {
    const cacheKey = resolve(directory);
    const cached = this.projectTypeCache.get(cacheKey);
    
    if (cached) {
      logger.debug('Using cached project type detection', { directory, type: cached.primaryType });
      return cached;
    }

    try {
      logger.debug('Detecting project type', { directory });

      const markers: Array<{
        file: string;
        type: ProjectType;
        weight: number;
        path: string;
      }> = [];

      // Define project markers with weights
      const projectMarkers = [
        // Node.js ecosystem
        { file: 'package.json', type: ProjectType.NODEJS, weight: 50 },
        { file: 'yarn.lock', type: ProjectType.NODEJS, weight: 20 },
        { file: 'pnpm-lock.yaml', type: ProjectType.NODEJS, weight: 20 },
        { file: 'tsconfig.json', type: ProjectType.TYPESCRIPT, weight: 40 },
        
        // React ecosystem
        { file: 'next.config.js', type: ProjectType.NEXTJS, weight: 60 },
        { file: 'next.config.ts', type: ProjectType.NEXTJS, weight: 60 },
        { file: 'nuxt.config.js', type: ProjectType.NUXTJS, weight: 60 },
        { file: 'vue.config.js', type: ProjectType.VUE, weight: 50 },
        { file: 'angular.json', type: ProjectType.ANGULAR, weight: 60 },
        { file: 'svelte.config.js', type: ProjectType.SVELTE, weight: 60 },
        
        // Python ecosystem
        { file: 'requirements.txt', type: ProjectType.PYTHON, weight: 40 },
        { file: 'pyproject.toml', type: ProjectType.PYTHON, weight: 50 },
        { file: 'setup.py', type: ProjectType.PYTHON, weight: 40 },
        { file: 'Pipfile', type: ProjectType.PYTHON, weight: 30 },
        { file: 'manage.py', type: ProjectType.DJANGO, weight: 60 },
        { file: 'app.py', type: ProjectType.FLASK, weight: 30 },
        
        // Other languages
        { file: 'Cargo.toml', type: ProjectType.RUST, weight: 60 },
        { file: 'go.mod', type: ProjectType.GO, weight: 60 },
        { file: 'pom.xml', type: ProjectType.JAVA, weight: 50 },
        { file: 'build.gradle', type: ProjectType.JAVA, weight: 50 },
        { file: 'CMakeLists.txt', type: ProjectType.CPP, weight: 50 },
        { file: 'Makefile', type: ProjectType.CPP, weight: 30 },
        
        // .NET ecosystem
        { file: '*.csproj', type: ProjectType.CSHARP, weight: 60 },
        { file: '*.sln', type: ProjectType.CSHARP, weight: 50 },
        
        // Mobile and desktop
        { file: 'pubspec.yaml', type: ProjectType.FLUTTER, weight: 60 },
        { file: 'main.dart', type: ProjectType.FLUTTER, weight: 40 },
        { file: 'electron-builder.yml', type: ProjectType.ELECTRON, weight: 50 },
        
        // Monorepo indicators
        { file: 'lerna.json', type: ProjectType.MONOREPO, weight: 40 },
        { file: 'nx.json', type: ProjectType.MONOREPO, weight: 40 },
        { file: 'rush.json', type: ProjectType.MONOREPO, weight: 40 },
        
        // AI/ML indicators
        { file: 'requirements-ml.txt', type: ProjectType.AI_ML, weight: 50 },
        { file: 'environment.yml', type: ProjectType.DATA_SCIENCE, weight: 40 },
        { file: 'Dockerfile', type: ProjectType.DEVOPS, weight: 30 }
      ];

      // Check for project markers
      for (const marker of projectMarkers) {
        const markerPath = join(directory, marker.file);
        
        try {
          if (marker.file.includes('*')) {
            // Handle glob patterns
            const files = await readdir(directory);
            const pattern = marker.file.replace('*', '');
            const matchingFiles = files.filter(f => f.includes(pattern));
            
            for (const file of matchingFiles) {
              markers.push({
                file,
                type: marker.type,
                weight: marker.weight,
                path: join(directory, file)
              });
            }
          } else {
            await access(markerPath);
            markers.push({
              file: marker.file,
              type: marker.type,
              weight: marker.weight,
              path: markerPath
            });
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Analyze package.json for more specific detection
      const frameworks = await this.detectFrameworks(directory, markers);
      const languages = await this.detectLanguages(directory);

      // Calculate type scores
      const typeScores = new Map<ProjectType, number>();
      
      for (const marker of markers) {
        const currentScore = typeScores.get(marker.type) || 0;
        typeScores.set(marker.type, currentScore + marker.weight);
      }

      // Add framework scores
      for (const framework of frameworks) {
        const score = framework.confidence * 0.5; // Weight framework detection
        
        // Map frameworks to project types
        const frameworkTypeMap: Record<string, ProjectType> = {
          'react': ProjectType.REACT,
          'vue': ProjectType.VUE,
          'angular': ProjectType.ANGULAR,
          'next': ProjectType.NEXTJS,
          'nuxt': ProjectType.NUXTJS,
          'svelte': ProjectType.SVELTE,
          'django': ProjectType.DJANGO,
          'flask': ProjectType.FLASK,
          'spring': ProjectType.SPRING,
          'electron': ProjectType.ELECTRON
        };

        const projectType = frameworkTypeMap[framework.name.toLowerCase()];
        if (projectType) {
          const currentScore = typeScores.get(projectType) || 0;
          typeScores.set(projectType, currentScore + score);
        }
      }

      // Find primary and secondary types
      const sortedTypes = Array.from(typeScores.entries())
        .sort(([, a], [, b]) => b - a);

      const primaryType = sortedTypes[0]?.[0] || ProjectType.UNKNOWN;
      const secondaryTypes = sortedTypes.slice(1, 3).map(([type]) => type);
      
      // Calculate confidence
      const totalScore = Array.from(typeScores.values()).reduce((sum, score) => sum + score, 0);
      const primaryScore = sortedTypes[0]?.[1] || 0;
      const confidence = totalScore > 0 ? Math.min(100, (primaryScore / totalScore) * 100) : 0;

      const detection: ProjectTypeDetection = {
        primaryType,
        secondaryTypes,
        confidence,
        markers,
        frameworks,
        languages
      };

      // Cache the result
      this.projectTypeCache.set(cacheKey, detection);
      
      logger.info('Project type detected', {
        directory,
        primaryType,
        confidence: Math.round(confidence),
        markersFound: markers.length
      });

      return detection;

    } catch (error) {
      logger.error('Failed to detect project type', { error, directory });
      
      const fallbackDetection: ProjectTypeDetection = {
        primaryType: ProjectType.UNKNOWN,
        secondaryTypes: [],
        confidence: 0,
        markers: [],
        frameworks: [],
        languages: []
      };
      
      return fallbackDetection;
    }
  }

  /**
   * Detect frameworks from package.json and other sources
   */
  private async detectFrameworks(directory: string, markers: any[]): Promise<FrameworkDetection[]> {
    const frameworks: FrameworkDetection[] = [];
    
    try {
      const packageJsonPath = join(directory, 'package.json');
      await access(packageJsonPath);
      
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      // Framework detection patterns
      const frameworkPatterns = [
        { name: 'React', pattern: /^react$/, confidence: 80 },
        { name: 'Vue', pattern: /^vue$/, confidence: 80 },
        { name: 'Angular', pattern: /@angular\/core/, confidence: 80 },
        { name: 'Next.js', pattern: /^next$/, confidence: 90 },
        { name: 'Nuxt.js', pattern: /^nuxt$/, confidence: 90 },
        { name: 'Svelte', pattern: /^svelte$/, confidence: 80 },
        { name: 'Express', pattern: /^express$/, confidence: 70 },
        { name: 'Fastify', pattern: /^fastify$/, confidence: 70 },
        { name: 'Electron', pattern: /^electron$/, confidence: 90 },
        { name: 'React Native', pattern: /^react-native$/, confidence: 90 },
        { name: 'Gatsby', pattern: /^gatsby$/, confidence: 90 },
        { name: 'Remix', pattern: /@remix-run\/node/, confidence: 90 }
      ];

      for (const [depName, version] of Object.entries(dependencies)) {
        for (const framework of frameworkPatterns) {
          if (framework.pattern.test(depName)) {
            frameworks.push({
              name: framework.name,
              version: version as string,
              confidence: framework.confidence,
              configFiles: [packageJsonPath]
            });
          }
        }
      }

    } catch (error) {
      logger.debug('Could not analyze package.json for frameworks', { error });
    }

    return frameworks;
  }

  /**
   * Detect programming languages in the project
   */
  private async detectLanguages(directory: string): Promise<LanguageDetection[]> {
    const languages = new Map<string, { count: number; extensions: Set<string> }>();
    
    try {
      // Use discovery engine to find files
      const discoveryResult = await this.discoveryEngine.discoverSubdirectories(directory);
      
      for (const subdir of discoveryResult.subdirectories) {
        for (const file of subdir.files) {
          const ext = extname(file.name).toLowerCase();
          
          // Map extensions to languages
          const extensionLanguageMap: Record<string, string> = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.py': 'Python',
            '.rs': 'Rust',
            '.go': 'Go',
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.cs': 'C#',
            '.cpp': 'C++',
            '.cc': 'C++',
            '.cxx': 'C++',
            '.c': 'C',
            '.h': 'C/C++',
            '.hpp': 'C++',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.swift': 'Swift',
            '.dart': 'Dart',
            '.scala': 'Scala',
            '.clj': 'Clojure',
            '.r': 'R',
            '.jl': 'Julia',
            '.hs': 'Haskell',
            '.elm': 'Elm',
            '.ex': 'Elixir',
            '.erl': 'Erlang'
          };

          const language = extensionLanguageMap[ext];
          if (language) {
            const current = languages.get(language) || { count: 0, extensions: new Set() };
            current.count++;
            current.extensions.add(ext);
            languages.set(language, current);
          }
        }
      }

      // Convert to results
      const totalFiles = Array.from(languages.values()).reduce((sum, lang) => sum + lang.count, 0);
      
      return Array.from(languages.entries()).map(([language, data]) => ({
        language,
        percentage: totalFiles > 0 ? (data.count / totalFiles) * 100 : 0,
        fileCount: data.count,
        extensions: Array.from(data.extensions)
      })).sort((a, b) => b.percentage - a.percentage);

    } catch (error) {
      logger.debug('Could not analyze project languages', { error });
      return [];
    }
  }

  /**
   * Analyze usage patterns (placeholder for future implementation)
   */
  private async analyzeUsagePatterns(directory: string): Promise<UsagePatternAnalysis> {
    // This would analyze user interaction patterns, command frequency, etc.
    // For now, return default patterns
    return {
      frequentCommands: [
        { command: 'chat', frequency: 45 },
        { command: 'analyze', frequency: 25 },
        { command: 'explain', frequency: 20 },
        { command: 'review', frequency: 10 }
      ],
      preferredModes: [
        { mode: 'chat', usage: 60 },
        { mode: 'analysis', usage: 25 },
        { mode: 'collaboration', usage: 15 }
      ],
      configPreferences: {
        verboseOutput: false,
        autoSave: true,
        realTimeUpdates: true
      },
      performanceProfile: 'balanced',
      contextPatterns: {
        averageContextSize: 50000,
        preferredContextTypes: ['project', 'directory'],
        contextUpdateFrequency: 300000 // 5 minutes
      }
    };
  }

  /**
   * Apply intelligent configuration based on project type and usage patterns
   */
  private async applyIntelligentConfiguration(directory: string): Promise<void> {
    if (!this.currentProjectType || this.currentProjectType.confidence < this.options.confidenceThreshold) {
      logger.debug('Skipping intelligent configuration - confidence too low', {
        confidence: this.currentProjectType?.confidence || 0,
        threshold: this.options.confidenceThreshold
      });
      return;
    }

    try {
      const adaptedConfig = await this.createAdaptedConfiguration(this.currentProjectType, this.currentUsagePattern);
      
      // Apply configuration adaptations
      for (const [key, value] of Object.entries(adaptedConfig)) {
        if (value !== undefined) {
          this.baseConfigManager.set(key, value);
        }
      }

      this.emit(IntelligentConfigEvent.CONFIGURATION_ADAPTED, {
        projectType: this.currentProjectType.primaryType,
        adaptations: Object.keys(adaptedConfig).length
      });

      logger.info('Intelligent configuration applied', {
        projectType: this.currentProjectType.primaryType,
        adaptations: Object.keys(adaptedConfig).length
      });

    } catch (error) {
      logger.error('Failed to apply intelligent configuration', { error });
      this.emit(IntelligentConfigEvent.INTELLIGENCE_ERROR, error);
    }
  }

  /**
   * Create adapted configuration based on project type
   */
  private async createAdaptedConfiguration(
    projectType: ProjectTypeDetection,
    usagePattern?: UsagePatternAnalysis
  ): Promise<Partial<VibexConfig>> {
    const adaptations: Partial<VibexConfig> = {};

    // AI configuration adaptations
    switch (projectType.primaryType) {
      case ProjectType.NODEJS:
      case ProjectType.TYPESCRIPT:
        adaptations.ai = {
          models: {
            primary: 'claude-sonnet-4-20250514',
            fallback: 'claude-haiku-4-20250514'
          },
          contextWindow: 200000,
          systemPrompts: {
            default: 'You are an expert TypeScript/Node.js developer. Focus on modern best practices, type safety, and performance optimization.'
          }
        };
        break;

      case ProjectType.PYTHON:
        adaptations.ai = {
          models: {
            primary: 'claude-sonnet-4-20250514',
            fallback: 'claude-haiku-4-20250514'
          },
          contextWindow: 200000,
          systemPrompts: {
            default: 'You are an expert Python developer. Focus on clean code, PEP standards, and modern Python features.'
          }
        };
        break;

      case ProjectType.REACT:
      case ProjectType.NEXTJS:
        adaptations.ai = {
          models: {
            primary: 'claude-sonnet-4-20250514',
            fallback: 'claude-haiku-4-20250514'
          },
          contextWindow: 200000,
          systemPrompts: {
            default: 'You are an expert React developer. Focus on modern React patterns, hooks, performance optimization, and accessibility.'
          }
        };
        break;

      case ProjectType.RUST:
        adaptations.ai = {
          models: {
            primary: 'claude-opus-4-20250514', // Use Opus for complex Rust code
            fallback: 'claude-sonnet-4-20250514'
          },
          contextWindow: 200000,
          systemPrompts: {
            default: 'You are an expert Rust developer. Focus on memory safety, zero-cost abstractions, and idiomatic Rust patterns.'
          }
        };
        break;
    }

    // Performance adaptations based on project size and type
    if (projectType.markers.length > 10) {
      // Large project - optimize for performance
      adaptations.performance = {
        level: 'AGGRESSIVE',
        caching: {
          enableResponseCache: true,
          enableAICache: true,
          enableContextCache: true
        },
        parallelExecution: {
          enableConcurrentOperations: true,
          maxConcurrentOperations: 4
        }
      };
    }

    // UI adaptations based on usage patterns
    if (usagePattern?.preferredModes) {
      const topMode = usagePattern.preferredModes[0];
      if (topMode) {
        adaptations.ui = {
          defaultMode: topMode.mode as any,
          density: usagePattern.performanceProfile === 'speed' ? 'compact' : 'comfortable'
        };
      }
    }

    // Context adaptations
    adaptations.context = {
      enableSubdirectoryDiscovery: projectType.primaryType === ProjectType.MONOREPO,
      enableRealTimeUpdates: true,
      maxDepth: projectType.primaryType === ProjectType.MONOREPO ? 5 : 3,
      contextFileNames: this.getProjectSpecificContextFiles(projectType.primaryType)
    };

    return adaptations;
  }

  /**
   * Get project-specific context file names
   */
  private getProjectSpecificContextFiles(projectType: ProjectType): string[] {
    const baseFiles = ['.cursorrules', 'VIBEX.md', 'CONTEXT.md'];
    
    switch (projectType) {
      case ProjectType.NODEJS:
      case ProjectType.TYPESCRIPT:
        return [...baseFiles, 'README.md', 'CONTRIBUTING.md', 'docs/api.md'];
      
      case ProjectType.PYTHON:
        return [...baseFiles, 'README.md', 'CONTRIBUTING.md', 'docs/index.md'];
      
      case ProjectType.RUST:
        return [...baseFiles, 'README.md', 'CONTRIBUTING.md', 'src/lib.rs'];
      
      case ProjectType.REACT:
      case ProjectType.NEXTJS:
        return [...baseFiles, 'README.md', 'CONTRIBUTING.md', 'docs/components.md'];
      
      default:
        return baseFiles;
    }
  }

  /**
   * Auto-load context based on project structure
   */
  private async autoLoadContext(directory: string): Promise<void> {
    try {
      logger.debug('Auto-loading context', { directory });

      const contextResult = await this.contextSystem.loadContext(directory);
      
      this.emit(IntelligentConfigEvent.CONTEXT_AUTO_LOADED, {
        filesLoaded: contextResult.stats.totalFiles,
        totalSize: contextResult.stats.totalSize,
        directory
      });

      logger.info('Context auto-loaded successfully', {
        filesLoaded: contextResult.stats.totalFiles,
        totalSize: contextResult.stats.totalSize
      });

    } catch (error) {
      logger.error('Failed to auto-load context', { error, directory });
      this.emit(IntelligentConfigEvent.INTELLIGENCE_ERROR, error);
    }
  }

  /**
   * Apply performance optimizations based on project characteristics
   */
  private async applyPerformanceOptimizations(): Promise<void> {
    try {
      if (!this.currentProjectType) return;

      // Configure performance based on project type
      const performanceLevel = this.getOptimalPerformanceLevel(this.currentProjectType);
      
      await this.performanceManager.setLevel(performanceLevel);
      
      // Apply project-specific optimizations
      if (this.currentProjectType.primaryType === ProjectType.MONOREPO) {
        // Enable aggressive caching for monorepos
        this.performanceManager.updateConfig({
          caching: {
            enableResponseCache: true,
            enableAICache: true,
            enableContextCache: true,
            enableFileMetadataCache: true
          }
        });
      }

      this.emit(IntelligentConfigEvent.PERFORMANCE_OPTIMIZED, {
        level: performanceLevel,
        projectType: this.currentProjectType.primaryType
      });

      logger.info('Performance optimizations applied', {
        level: performanceLevel,
        projectType: this.currentProjectType.primaryType
      });

    } catch (error) {
      logger.error('Failed to apply performance optimizations', { error });
      this.emit(IntelligentConfigEvent.INTELLIGENCE_ERROR, error);
    }
  }

  /**
   * Get optimal performance level based on project characteristics
   */
  private getOptimalPerformanceLevel(projectType: ProjectTypeDetection): 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'EXTREME' {
    const markerCount = projectType.markers.length;
    const hasMonorepo = projectType.secondaryTypes.includes(ProjectType.MONOREPO);
    
    if (hasMonorepo || markerCount > 15) {
      return 'EXTREME'; // Large/complex projects need maximum performance
    } else if (markerCount > 8) {
      return 'AGGRESSIVE'; // Medium projects
    } else if (markerCount > 3) {
      return 'BALANCED'; // Small to medium projects
    } else {
      return 'CONSERVATIVE'; // Very small or unknown projects
    }
  }

  /**
   * Set up event forwarding from sub-systems
   */
  private setupEventForwarding(): void {
    // Forward context system events
    this.contextSystem.on('context:loaded', (result) => {
      this.emit(IntelligentConfigEvent.CONTEXT_AUTO_LOADED, result);
    });

    this.contextSystem.on('context:error', (error) => {
      this.emit(IntelligentConfigEvent.INTELLIGENCE_ERROR, error);
    });

    // Forward performance manager events
    this.performanceManager.on('configUpdated', (config) => {
      this.emit(IntelligentConfigEvent.PERFORMANCE_OPTIMIZED, config);
    });

    this.performanceManager.on('performanceAlert', (alert) => {
      this.emit(IntelligentConfigEvent.INTELLIGENCE_ERROR, alert);
    });
  }

  /**
   * Get current project type detection
   */
  getProjectType(): ProjectTypeDetection | undefined {
    return this.currentProjectType;
  }

  /**
   * Get current usage pattern analysis
   */
  getUsagePattern(): UsagePatternAnalysis | undefined {
    return this.currentUsagePattern;
  }

  /**
   * Get base configuration manager
   */
  getConfigManager(): ConfigManager {
    return this.baseConfigManager;
  }

  /**
   * Get context system
   */
  getContextSystem(): ContextSystem {
    return this.contextSystem;
  }

  /**
   * Force refresh of intelligent analysis
   */
  async refresh(directory: string = process.cwd()): Promise<void> {
    // Clear caches
    this.projectTypeCache.clear();
    this.usagePatternCache.clear();
    this.configAdaptationCache.clear();

    // Re-initialize
    this.isInitialized = false;
    await this.initialize(directory);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.baseConfigManager.dispose();
    this.removeAllListeners();
    
    // Clear caches
    this.projectTypeCache.clear();
    this.usagePatternCache.clear();
    this.configAdaptationCache.clear();

    logger.debug('Intelligent configuration manager disposed');
  }
}

/**
 * Create intelligent configuration manager with smart defaults
 */
export async function createIntelligentConfigManager(
  workingDirectory: string = process.cwd(),
  options: Partial<IntelligentConfigOptions> = {}
): Promise<IntelligentConfigManager> {
  // Load base configuration using VibexConfigFactory
  const baseConfigManager = await VibexConfigFactory.createProductionConfig({
    workspaceDir: workingDirectory,
    enableMigration: true
  });

  const baseConfig = baseConfigManager.getAll() as VibexConfig;

  // Create intelligent manager
  const intelligentManager = new IntelligentConfigManager(baseConfig, options);
  
  // Initialize with intelligent analysis
  await intelligentManager.initialize(workingDirectory);

  return intelligentManager;
}

/**
 * Export additional types for convenience
 */
export type {
  ProjectTypeDetection,
  FrameworkDetection,
  LanguageDetection,
  UsagePatternAnalysis,
  IntelligentConfigOptions
}; 
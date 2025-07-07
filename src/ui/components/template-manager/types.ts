/**
 * Template Manager Types - Clean Architecture like Gemini CLI
 * 
 * Centralized type definitions for template management system
 */

/**
 * Template metadata interface
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  downloadCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Workflow template interface
 */
export interface WorkflowTemplate {
  metadata: TemplateMetadata;
  definition: any;
  validation: TemplateValidation;
}

/**
 * Template validation result
 */
export interface TemplateValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Template search and filter state
 */
export interface TemplateSearchState {
  searchQuery: string;
  selectedCategory: string;
  availableCategories: string[];
  filteredTemplates: WorkflowTemplate[];
}

/**
 * Template manager view modes
 */
export type TemplateViewMode = 'browse' | 'create' | 'edit' | 'details';

/**
 * Template manager state
 */
export interface TemplateManagerState {
  templates: WorkflowTemplate[];
  selectedTemplate: WorkflowTemplate | null;
  activeView: TemplateViewMode;
  isLoading: boolean;
  error: string | null;
  searchState: TemplateSearchState;
}

/**
 * Template creation form data
 */
export interface TemplateCreationData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  definition: any;
}

/**
 * Template manager configuration
 */
export interface TemplateManagerConfig {
  enableTemplateCreation: boolean;
  enableTemplateExport: boolean;
  maxTemplatesPerPage: number;
  defaultCategory: string;
  allowedCategories: string[];
}

/**
 * Template manager callbacks
 */
export interface TemplateManagerCallbacks {
  onTemplateSelect?: (template: WorkflowTemplate) => void;
  onWorkflowCreate?: (workflow: any) => void;
  onTemplateCreate?: (templateData: TemplateCreationData) => Promise<void>;
  onTemplateUpdate?: (template: WorkflowTemplate) => Promise<void>;
  onTemplateDelete?: (templateId: string) => Promise<void>;
  onTemplateExport?: (templates: WorkflowTemplate[]) => void;
}

/**
 * Theme adapter interface for backward compatibility
 */
export interface AdaptedTheme {
  mode: 'dark' | 'light';
  colors: {
    background: {
      primary: string;
      elevated: string;
      secondary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    border: {
      primary: string;
      secondary: string;
      focus: string;
    };
    primary: {
      100: string;
      500: string;
      700: string;
    };
    secondary: {
      500: string;
    };
    success: {
      500: string;
    };
    error: {
      500: string;
    };
  };
  borderRadius: {
    lg: string;
  };
  spacing: {
    3: string;
    4: string;
    6: string;
  };
}

/**
 * Template manager props interface
 */
export interface TemplateManagerProps {
  onTemplateSelect?: (template: WorkflowTemplate) => void;
  onWorkflowCreate?: (workflow: any) => void;
  className?: string;
  config?: Partial<TemplateManagerConfig>;
}

/**
 * Template data service interface
 */
export interface ITemplateDataService {
  getTemplates(): Promise<WorkflowTemplate[]>;
  getTemplate(id: string): Promise<WorkflowTemplate | null>;
  createTemplate(data: TemplateCreationData): Promise<WorkflowTemplate>;
  updateTemplate(template: WorkflowTemplate): Promise<WorkflowTemplate>;
  deleteTemplate(id: string): Promise<void>;
  validateTemplate(template: WorkflowTemplate): TemplateValidation;
}

/**
 * Search filter service interface
 */
export interface ISearchFilterService {
  filterTemplates(templates: WorkflowTemplate[], query: string, category: string): WorkflowTemplate[];
  getAvailableCategories(templates: WorkflowTemplate[]): string[];
  searchTemplates(templates: WorkflowTemplate[], query: string): WorkflowTemplate[];
  filterByCategory(templates: WorkflowTemplate[], category: string): WorkflowTemplate[];
}

/**
 * Theme adapter service interface
 */
export interface IThemeAdapterService {
  adaptTheme(theme: any, isDarkTheme: boolean): AdaptedTheme;
  getThemeColors(adaptedTheme: AdaptedTheme): Record<string, string>;
  getThemeStyles(adaptedTheme: AdaptedTheme): Record<string, any>;
} 
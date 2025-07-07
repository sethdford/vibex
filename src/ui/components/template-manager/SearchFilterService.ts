/**
 * Search Filter Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for template search and filtering operations
 */

import { WorkflowTemplate, ISearchFilterService } from './types.js';

/**
 * Service for handling template search and filtering
 */
export class SearchFilterService implements ISearchFilterService {
  
  /**
   * Filter templates by search query and category
   */
  filterTemplates(templates: WorkflowTemplate[], query: string, category: string): WorkflowTemplate[] {
    let filtered = templates;

    // Apply search filter
    if (query.trim()) {
      filtered = this.searchTemplates(filtered, query);
    }

    // Apply category filter
    if (category && category !== 'All') {
      filtered = this.filterByCategory(filtered, category);
    }

    return filtered;
  }

  /**
   * Get available categories from templates
   */
  getAvailableCategories(templates: WorkflowTemplate[]): string[] {
    const categories = new Set<string>();
    
    templates.forEach(template => {
      if (template.metadata.category) {
        categories.add(template.metadata.category);
      }
    });

    const sortedCategories = Array.from(categories).sort();
    return ['All', ...sortedCategories];
  }

  /**
   * Search templates by query
   */
  searchTemplates(templates: WorkflowTemplate[], query: string): WorkflowTemplate[] {
    if (!query.trim()) {
      return templates;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return templates.filter(template => {
      // Search in name
      const nameMatch = template.metadata.name.toLowerCase().includes(searchTerm);
      
      // Search in description
      const descriptionMatch = template.metadata.description.toLowerCase().includes(searchTerm);
      
      // Search in tags
      const tagMatch = template.metadata.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      
      // Search in author
      const authorMatch = template.metadata.author.toLowerCase().includes(searchTerm);
      
      // Search in category
      const categoryMatch = template.metadata.category.toLowerCase().includes(searchTerm);

      return nameMatch || descriptionMatch || tagMatch || authorMatch || categoryMatch;
    });
  }

  /**
   * Filter templates by category
   */
  filterByCategory(templates: WorkflowTemplate[], category: string): WorkflowTemplate[] {
    if (!category || category === 'All') {
      return templates;
    }

    return templates.filter(template => template.metadata.category === category);
  }

  /**
   * Sort templates by various criteria
   */
  sortTemplates(templates: WorkflowTemplate[], sortBy: 'name' | 'downloads' | 'date' | 'category', order: 'asc' | 'desc' = 'asc'): WorkflowTemplate[] {
    const sorted = [...templates].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.metadata.name.localeCompare(b.metadata.name);
          break;
        case 'downloads':
          comparison = a.metadata.downloadCount - b.metadata.downloadCount;
          break;
        case 'date':
          const aDate = a.metadata.updatedAt || a.metadata.createdAt || new Date(0);
          const bDate = b.metadata.updatedAt || b.metadata.createdAt || new Date(0);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case 'category':
          comparison = a.metadata.category.localeCompare(b.metadata.category);
          break;
        default:
          return 0;
      }

      return order === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Get search suggestions based on templates
   */
  getSearchSuggestions(templates: WorkflowTemplate[], query: string, maxSuggestions = 5): string[] {
    if (!query.trim()) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    const suggestions = new Set<string>();

    templates.forEach(template => {
      // Add matching tags
      template.metadata.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchTerm) && suggestions.size < maxSuggestions) {
          suggestions.add(tag);
        }
      });

      // Add matching category
      if (template.metadata.category.toLowerCase().includes(searchTerm) && suggestions.size < maxSuggestions) {
        suggestions.add(template.metadata.category);
      }

      // Add matching author
      if (template.metadata.author.toLowerCase().includes(searchTerm) && suggestions.size < maxSuggestions) {
        suggestions.add(template.metadata.author);
      }
    });

    return Array.from(suggestions).slice(0, maxSuggestions);
  }

  /**
   * Get popular tags from templates
   */
  getPopularTags(templates: WorkflowTemplate[], maxTags = 10): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();

    templates.forEach(template => {
      template.metadata.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTags);
  }

  /**
   * Get category statistics
   */
  getCategoryStats(templates: WorkflowTemplate[]): Array<{ category: string; count: number; downloadTotal: number }> {
    const stats = new Map<string, { count: number; downloadTotal: number }>();

    templates.forEach(template => {
      const category = template.metadata.category;
      const current = stats.get(category) || { count: 0, downloadTotal: 0 };
      
      stats.set(category, {
        count: current.count + 1,
        downloadTotal: current.downloadTotal + template.metadata.downloadCount
      });
    });

    return Array.from(stats.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * Factory function for creating search filter service
 */
export function createSearchFilterService(): SearchFilterService {
  return new SearchFilterService();
} 
/**
 * Content State Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for managing content state, filtering, and selection
 */

import { 
  MultimodalContentItem, 
  ContentFilterOptions, 
  MultimodalState, 
  ContentType, 
  ProcessingStatus 
} from './types.js';

/**
 * Service for managing multimodal content state
 */
export class ContentStateService {
  private state: MultimodalState;
  private listeners: Array<(state: MultimodalState) => void> = [];

  constructor() {
    this.state = {
      selectedItems: new Set<string>(),
      processingFiles: new Set<string>(),
      showFileInput: false,
      filePathInput: '',
      showAnalysis: false,
      filterOptions: {
        sortBy: 'uploadedAt',
        sortOrder: 'desc'
      },
      viewMode: 'list'
    };
  }

  /**
   * Get current state
   */
  getState(): MultimodalState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: MultimodalState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Update state
   */
  private updateState(updates: Partial<MultimodalState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Toggle item selection
   */
  toggleItemSelection(itemId: string): void {
    const selectedItems = new Set(this.state.selectedItems);
    
    if (selectedItems.has(itemId)) {
      selectedItems.delete(itemId);
    } else {
      selectedItems.add(itemId);
    }
    
    this.updateState({ selectedItems });
  }

  /**
   * Select all items
   */
  selectAllItems(contentItems: MultimodalContentItem[]): void {
    const selectedItems = new Set(contentItems.map(item => item.id));
    this.updateState({ selectedItems });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.updateState({ selectedItems: new Set() });
  }

  /**
   * Set selected items
   */
  setSelectedItems(itemIds: string[]): void {
    this.updateState({ selectedItems: new Set(itemIds) });
  }

  /**
   * Get selected items
   */
  getSelectedItems(): string[] {
    return Array.from(this.state.selectedItems);
  }

  /**
   * Add processing file
   */
  addProcessingFile(filePath: string): void {
    const processingFiles = new Set(this.state.processingFiles);
    processingFiles.add(filePath);
    this.updateState({ processingFiles });
  }

  /**
   * Remove processing file
   */
  removeProcessingFile(filePath: string): void {
    const processingFiles = new Set(this.state.processingFiles);
    processingFiles.delete(filePath);
    this.updateState({ processingFiles });
  }

  /**
   * Clear processing files
   */
  clearProcessingFiles(): void {
    this.updateState({ processingFiles: new Set() });
  }

  /**
   * Toggle file input
   */
  toggleFileInput(): void {
    this.updateState({ 
      showFileInput: !this.state.showFileInput,
      filePathInput: this.state.showFileInput ? '' : this.state.filePathInput
    });
  }

  /**
   * Set file path input
   */
  setFilePathInput(input: string): void {
    this.updateState({ filePathInput: input });
  }

  /**
   * Clear file path input
   */
  clearFilePathInput(): void {
    this.updateState({ filePathInput: '', showFileInput: false });
  }

  /**
   * Toggle analysis view
   */
  toggleAnalysisView(): void {
    this.updateState({ showAnalysis: !this.state.showAnalysis });
  }

  /**
   * Set view mode
   */
  setViewMode(viewMode: 'list' | 'grid' | 'details'): void {
    this.updateState({ viewMode });
  }

  /**
   * Update filter options
   */
  updateFilterOptions(options: Partial<ContentFilterOptions>): void {
    this.updateState({
      filterOptions: { ...this.state.filterOptions, ...options }
    });
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.updateState({
      filterOptions: {
        sortBy: 'uploadedAt',
        sortOrder: 'desc'
      }
    });
  }

  /**
   * Filter and sort content items
   */
  filterAndSortItems(contentItems: MultimodalContentItem[]): MultimodalContentItem[] {
    let filtered = [...contentItems];
    const { filterOptions } = this.state;

    // Apply type filter
    if (filterOptions.type) {
      filtered = filtered.filter(item => item.type === filterOptions.type);
    }

    // Apply status filter
    if (filterOptions.status) {
      filtered = filtered.filter(item => item.status === filterOptions.status);
    }

    // Apply search filter
    if (filterOptions.searchTerm) {
      const searchTerm = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.type.toLowerCase().includes(searchTerm) ||
        (item.analysis?.summary?.toLowerCase().includes(searchTerm)) ||
        (item.analysis?.keyPoints?.some(point => 
          point.toLowerCase().includes(searchTerm)
        ))
      );
    }

    // Apply sorting
    if (filterOptions.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (filterOptions.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'size':
            aValue = a.size;
            bValue = b.size;
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'uploadedAt':
            aValue = a.uploadedAt;
            bValue = b.uploadedAt;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = a.uploadedAt;
            bValue = b.uploadedAt;
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return filterOptions.sortOrder === 'desc' ? -result : result;
        }

        // Handle numeric comparison
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return filterOptions.sortOrder === 'desc' ? -result : result;
      });
    }

    return filtered;
  }

  /**
   * Get content statistics
   */
  getContentStats(contentItems: MultimodalContentItem[]): {
    total: number;
    selected: number;
    processing: number;
    byType: Record<ContentType, number>;
    byStatus: Record<ProcessingStatus, number>;
    totalSize: number;
  } {
    const stats = {
      total: contentItems.length,
      selected: this.state.selectedItems.size,
      processing: this.state.processingFiles.size,
      byType: {} as Record<ContentType, number>,
      byStatus: {} as Record<ProcessingStatus, number>,
      totalSize: 0
    };

    // Initialize counters
    Object.values(ContentType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ProcessingStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });

    // Count items
    contentItems.forEach(item => {
      stats.byType[item.type]++;
      stats.byStatus[item.status]++;
      stats.totalSize += item.size;
    });

    return stats;
  }

  /**
   * Get filtered content count
   */
  getFilteredCount(contentItems: MultimodalContentItem[]): number {
    return this.filterAndSortItems(contentItems).length;
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    const { filterOptions } = this.state;
    return !!(
      filterOptions.type ||
      filterOptions.status ||
      filterOptions.searchTerm
    );
  }

  /**
   * Get available filter options from content
   */
  getAvailableFilterOptions(contentItems: MultimodalContentItem[]): {
    types: ContentType[];
    statuses: ProcessingStatus[];
  } {
    const types = new Set<ContentType>();
    const statuses = new Set<ProcessingStatus>();

    contentItems.forEach(item => {
      types.add(item.type);
      statuses.add(item.status);
    });

    return {
      types: Array.from(types),
      statuses: Array.from(statuses)
    };
  }

  /**
   * Navigate selection (for keyboard navigation)
   */
  navigateSelection(contentItems: MultimodalContentItem[], direction: 'up' | 'down'): void {
    const filteredItems = this.filterAndSortItems(contentItems);
    
    if (filteredItems.length === 0) return;

    const selectedItems = Array.from(this.state.selectedItems);
    
    if (selectedItems.length === 0) {
      // Select first item
      this.setSelectedItems([filteredItems[0].id]);
      return;
    }

    // Find current selection index
    const currentId = selectedItems[selectedItems.length - 1];
    const currentIndex = filteredItems.findIndex(item => item.id === currentId);
    
    if (currentIndex === -1) {
      // Current selection not in filtered items, select first
      this.setSelectedItems([filteredItems[0].id]);
      return;
    }

    // Calculate new index
    let newIndex: number;
    if (direction === 'up') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
    } else {
      newIndex = currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
    }

    // Update selection
    this.setSelectedItems([filteredItems[newIndex].id]);
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      selectedItems: new Set<string>(),
      processingFiles: new Set<string>(),
      showFileInput: false,
      filePathInput: '',
      showAnalysis: false,
      filterOptions: {
        sortBy: 'uploadedAt',
        sortOrder: 'desc'
      },
      viewMode: 'list'
    };
    this.notifyListeners();
  }
} 
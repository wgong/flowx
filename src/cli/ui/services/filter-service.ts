import { EventEmitter } from 'events';

export interface FilterCriteria {
  search?: string;
  fields?: string[];
  type?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  customFilters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  fuzzy?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  threshold?: number; // For fuzzy search
  highlightMatches?: boolean;
}

export interface FilterResult<T> {
  items: T[];
  totalCount: number;
  filteredCount: number;
  matches: SearchMatch[];
  facets: Record<string, FacetResult>;
  suggestions: string[];
}

export interface SearchMatch {
  item: any;
  field: string;
  value: string;
  score: number;
  highlights: HighlightRange[];
}

export interface HighlightRange {
  start: number;
  end: number;
  type: 'exact' | 'fuzzy' | 'partial';
}

export interface FacetResult {
  name: string;
  values: Array<{
    value: string;
    count: number;
    selected: boolean;
  }>;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  criteria: FilterCriteria;
  options: SearchOptions;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
  tags: string[];
}

/**
 * Advanced filtering and search service for UI components
 */
export class FilterService extends EventEmitter {
  private savedFilters = new Map<string, SavedFilter>();
  private searchHistory: string[] = [];
  private maxHistorySize = 100;
  private defaultOptions: SearchOptions = {
    fuzzy: true,
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    threshold: 0.6,
    highlightMatches: true
  };

  constructor() {
    super();
    this.loadSavedFilters();
  }

  /**
   * Apply filters and search to a dataset
   */
  filter<T>(
    data: T[],
    criteria: FilterCriteria,
    options: SearchOptions = {}
  ): FilterResult<T> {
    const opts = { ...this.defaultOptions, ...options };
    let filteredData = [...data];
    const matches: SearchMatch[] = [];
    const facets: Record<string, FacetResult> = {};

    // Apply search if provided
    if (criteria.search) {
      const searchResult = this.performSearch(filteredData, criteria.search, criteria.fields, opts);
      filteredData = searchResult.items;
      matches.push(...searchResult.matches);
      
      // Add to search history
      this.addToSearchHistory(criteria.search);
    }

    // Apply field-based filters
    if (criteria.type) {
      filteredData = filteredData.filter(item => 
        this.matchesValue(this.getFieldValue(item, 'type'), criteria.type!)
      );
    }

    if (criteria.status) {
      filteredData = filteredData.filter(item => 
        this.matchesValue(this.getFieldValue(item, 'status'), criteria.status!)
      );
    }

    // Apply date range filter
    if (criteria.dateRange) {
      filteredData = filteredData.filter(item => {
        const dateField = this.getDateField(item);
        if (!dateField) return true;
        
        const itemDate = new Date(dateField);
        return itemDate >= criteria.dateRange!.start && itemDate <= criteria.dateRange!.end;
      });
    }

    // Apply tag filters
    if (criteria.tags && criteria.tags.length > 0) {
      filteredData = filteredData.filter(item => {
        const itemTags = this.getFieldValue(item, 'tags') || [];
        return criteria.tags!.some(tag => itemTags.includes(tag));
      });
    }

    // Apply custom filters
    if (criteria.customFilters) {
      for (const [field, value] of Object.entries(criteria.customFilters)) {
        filteredData = filteredData.filter(item => 
          this.matchesCustomFilter(item, field, value)
        );
      }
    }

    // Generate facets
    const facetFields = ['type', 'status', 'tags'];
    for (const field of facetFields) {
      facets[field] = this.generateFacet(data, filteredData, field);
    }

    // Apply sorting
    if (criteria.sortBy) {
      filteredData = this.sortData(filteredData, criteria.sortBy, criteria.sortOrder || 'asc');
    }

    // Apply pagination
    const totalCount = data.length;
    const filteredCount = filteredData.length;
    
    if (criteria.limit) {
      const offset = criteria.offset || 0;
      filteredData = filteredData.slice(offset, offset + criteria.limit);
    }

    // Generate search suggestions
    const suggestions = this.generateSuggestions(criteria.search || '', data);

    return {
      items: filteredData,
      totalCount,
      filteredCount,
      matches,
      facets,
      suggestions
    };
  }

  /**
   * Perform full-text search across specified fields
   */
  private performSearch<T>(
    data: T[],
    searchTerm: string,
    fields?: string[],
    options: SearchOptions = {}
  ): { items: T[]; matches: SearchMatch[] } {
    const matches: SearchMatch[] = [];
    const scoredItems: Array<{ item: T; score: number }> = [];

    for (const item of data) {
      const searchFields = fields || this.getSearchableFields(item);
      let maxScore = 0;
      const itemMatches: SearchMatch[] = [];

      for (const field of searchFields) {
        const value = String(this.getFieldValue(item, field) || '');
        const match = this.searchInField(searchTerm, value, field, options);
        
        if (match && match.score > 0) {
          maxScore = Math.max(maxScore, match.score);
          itemMatches.push({ ...match, item });
        }
      }

      if (maxScore > 0) {
        scoredItems.push({ item, score: maxScore });
        matches.push(...itemMatches);
      }
    }

    // Sort by relevance score
    scoredItems.sort((a, b) => b.score - a.score);

    return {
      items: scoredItems.map(si => si.item),
      matches
    };
  }

  /**
   * Search within a specific field
   */
  private searchInField(
    searchTerm: string,
    fieldValue: string,
    fieldName: string,
    options: SearchOptions
  ): SearchMatch | null {
    if (!fieldValue || !searchTerm) return null;

    const searchValue = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const targetValue = options.caseSensitive ? fieldValue : fieldValue.toLowerCase();

    let score = 0;
    const highlights: HighlightRange[] = [];

    if (options.regex) {
      try {
        const regex = new RegExp(searchValue, options.caseSensitive ? 'g' : 'gi');
        const matches = Array.from(targetValue.matchAll(regex));
        
        if (matches.length > 0) {
          score = 1.0;
          highlights.push(...matches.map(match => ({
            start: match.index!,
            end: match.index! + match[0].length,
            type: 'exact' as const
          })));
        }
      } catch {
        // Invalid regex, fall back to exact search
        return this.exactSearch(searchValue, targetValue, fieldName, highlights);
      }
    } else if (options.fuzzy) {
      const fuzzyResult = this.fuzzySearch(searchValue, targetValue, options.threshold || 0.6);
      if (fuzzyResult.score > 0) {
        score = fuzzyResult.score;
        highlights.push(...fuzzyResult.highlights);
      }
    } else {
      return this.exactSearch(searchValue, targetValue, fieldName, highlights);
    }

    if (score > 0) {
      return {
        item: null, // Will be set by caller
        field: fieldName,
        value: fieldValue,
        score,
        highlights
      };
    }

    return null;
  }

  /**
   * Exact string search
   */
  private exactSearch(
    searchTerm: string,
    targetValue: string,
    fieldName: string,
    highlights: HighlightRange[]
  ): SearchMatch | null {
    const index = targetValue.indexOf(searchTerm);
    if (index !== -1) {
      highlights.push({
        start: index,
        end: index + searchTerm.length,
        type: 'exact'
      });

      // Calculate score based on match position and length
      const score = (searchTerm.length / targetValue.length) * 
                   (index === 0 ? 1.0 : 0.8); // Boost for matches at start

      return {
        item: null,
        field: fieldName,
        value: targetValue,
        score,
        highlights
      };
    }

    return null;
  }

  /**
   * Fuzzy string search using Levenshtein distance
   */
  private fuzzySearch(
    searchTerm: string,
    targetValue: string,
    threshold: number
  ): { score: number; highlights: HighlightRange[] } {
    const highlights: HighlightRange[] = [];

    // For short search terms, use substring matching
    if (searchTerm.length <= 3) {
      if (targetValue.includes(searchTerm)) {
        const index = targetValue.indexOf(searchTerm);
        highlights.push({
          start: index,
          end: index + searchTerm.length,
          type: 'exact'
        });
        return { score: 0.9, highlights };
      }
      return { score: 0, highlights };
    }

    // Calculate similarity using Levenshtein distance
    const distance = this.levenshteinDistance(searchTerm, targetValue);
    const maxLength = Math.max(searchTerm.length, targetValue.length);
    const similarity = 1 - (distance / maxLength);

    if (similarity >= threshold) {
      // Find approximate match positions for highlighting
      const matchStart = this.findBestMatchPosition(searchTerm, targetValue);
      if (matchStart >= 0) {
        highlights.push({
          start: matchStart,
          end: Math.min(matchStart + searchTerm.length, targetValue.length),
          type: 'fuzzy'
        });
      }

      return { score: similarity, highlights };
    }

    return { score: 0, highlights };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find the best match position for fuzzy highlighting
   */
  private findBestMatchPosition(searchTerm: string, targetValue: string): number {
    let bestPosition = -1;
    let bestScore = 0;

    for (let i = 0; i <= targetValue.length - searchTerm.length; i++) {
      const substring = targetValue.substring(i, i + searchTerm.length);
      const distance = this.levenshteinDistance(searchTerm, substring);
      const score = 1 - (distance / searchTerm.length);

      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }

    return bestScore > 0.5 ? bestPosition : -1;
  }

  /**
   * Generate facets for filtering
   */
  private generateFacet<T>(
    allData: T[],
    filteredData: T[],
    field: string
  ): FacetResult {
    const allValues = new Map<string, number>();
    const filteredValues = new Map<string, number>();

    // Count all values
    for (const item of allData) {
      const value = this.getFieldValue(item, field);
      if (value !== null && value !== undefined) {
        const strValue = String(value);
        allValues.set(strValue, (allValues.get(strValue) || 0) + 1);
      }
    }

    // Count filtered values
    for (const item of filteredData) {
      const value = this.getFieldValue(item, field);
      if (value !== null && value !== undefined) {
        const strValue = String(value);
        filteredValues.set(strValue, (filteredValues.get(strValue) || 0) + 1);
      }
    }

    const values = Array.from(allValues.entries())
      .map(([value, count]) => ({
        value,
        count: filteredValues.get(value) || 0,
        selected: false
      }))
      .sort((a, b) => b.count - a.count);

    return {
      name: field,
      values
    };
  }

  /**
   * Sort data by specified field
   */
  private sortData<T>(data: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
    return [...data].sort((a, b) => {
      const aValue = this.getFieldValue(a, sortBy);
      const bValue = this.getFieldValue(b, sortBy);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let result = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }

      return sortOrder === 'desc' ? -result : result;
    });
  }

  /**
   * Generate search suggestions based on data and search history
   */
  private generateSuggestions(searchTerm: string, data: any[]): string[] {
    const suggestions = new Set<string>();

    // Add from search history
    for (const historyItem of this.searchHistory) {
      if (historyItem.toLowerCase().includes(searchTerm.toLowerCase()) && 
          historyItem !== searchTerm) {
        suggestions.add(historyItem);
      }
    }

    // Add field values that match
    for (const item of data.slice(0, 100)) { // Limit for performance
      const searchableFields = this.getSearchableFields(item);
      for (const field of searchableFields) {
        const value = String(this.getFieldValue(item, field) || '');
        if (value.toLowerCase().includes(searchTerm.toLowerCase()) && 
            value !== searchTerm) {
          suggestions.add(value);
        }
      }
    }

    return Array.from(suggestions).slice(0, 10); // Limit suggestions
  }

  /**
   * Get searchable fields from an object
   */
  private getSearchableFields(obj: any): string[] {
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'timestamp'];
    return Object.keys(obj).filter(key => 
      !excludeFields.includes(key) && 
      typeof obj[key] !== 'object'
    );
  }

  /**
   * Get field value from object using dot notation
   */
  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get date field from object
   */
  private getDateField(obj: any): any {
    const dateFields = ['createdAt', 'updatedAt', 'timestamp', 'date', 'lastActivity'];
    for (const field of dateFields) {
      const value = this.getFieldValue(obj, field);
      if (value) return value;
    }
    return null;
  }

  /**
   * Check if value matches filter criteria
   */
  private matchesValue(value: any, criteria: any): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(criteria)) {
      return criteria.includes(value);
    }
    return String(value).toLowerCase().includes(String(criteria).toLowerCase());
  }

  /**
   * Check custom filter match
   */
  private matchesCustomFilter(item: any, field: string, filterValue: any): boolean {
    const itemValue = this.getFieldValue(item, field);
    
    if (typeof filterValue === 'function') {
      return filterValue(itemValue, item);
    }
    
    if (typeof filterValue === 'object' && filterValue.operator) {
      return this.evaluateOperator(itemValue, filterValue.operator, filterValue.value);
    }
    
    return this.matchesValue(itemValue, filterValue);
  }

  /**
   * Evaluate filter operators
   */
  private evaluateOperator(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'eq': return value === filterValue;
      case 'ne': return value !== filterValue;
      case 'gt': return value > filterValue;
      case 'gte': return value >= filterValue;
      case 'lt': return value < filterValue;
      case 'lte': return value <= filterValue;
      case 'contains': return String(value).includes(String(filterValue));
      case 'startsWith': return String(value).startsWith(String(filterValue));
      case 'endsWith': return String(value).endsWith(String(filterValue));
      case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
      case 'notIn': return Array.isArray(filterValue) && !filterValue.includes(value);
      default: return false;
    }
  }

  /**
   * Add search term to history
   */
  private addToSearchHistory(searchTerm: string): void {
    if (!searchTerm.trim()) return;
    
    // Remove if already exists
    const index = this.searchHistory.indexOf(searchTerm);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }
    
    // Add to beginning
    this.searchHistory.unshift(searchTerm);
    
    // Limit size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
    
    this.emit('searchHistoryUpdated', this.searchHistory);
  }

  /**
   * Save a filter for later use
   */
  saveFilter(name: string, criteria: FilterCriteria, options: SearchOptions, description?: string): string {
    const id = `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const savedFilter: SavedFilter = {
      id,
      name,
      description,
      criteria,
      options,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 0,
      tags: []
    };
    
    this.savedFilters.set(id, savedFilter);
    this.persistSavedFilters();
    this.emit('filterSaved', savedFilter);
    
    return id;
  }

  /**
   * Load a saved filter
   */
  loadFilter(id: string): SavedFilter | null {
    const filter = this.savedFilters.get(id);
    if (filter) {
      filter.lastUsed = new Date();
      filter.useCount++;
      this.persistSavedFilters();
      this.emit('filterLoaded', filter);
    }
    return filter || null;
  }

  /**
   * Delete a saved filter
   */
  deleteFilter(id: string): boolean {
    const deleted = this.savedFilters.delete(id);
    if (deleted) {
      this.persistSavedFilters();
      this.emit('filterDeleted', id);
    }
    return deleted;
  }

  /**
   * Get all saved filters
   */
  getSavedFilters(): SavedFilter[] {
    return Array.from(this.savedFilters.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.emit('searchHistoryCleared');
  }

  /**
   * Get filter statistics
   */
  getFilterStats(): {
    savedFilters: number;
    searchHistory: number;
    mostUsedFilters: SavedFilter[];
    recentSearches: string[];
  } {
    const filters = this.getSavedFilters();
    
    return {
      savedFilters: filters.length,
      searchHistory: this.searchHistory.length,
      mostUsedFilters: filters
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, 5),
      recentSearches: this.searchHistory.slice(0, 10)
    };
  }

  /**
   * Load saved filters from storage
   */
  private loadSavedFilters(): void {
    try {
      // In a real implementation, this would load from file or database
      // For now, just initialize empty
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
  }

  /**
   * Persist saved filters to storage
   */
  private persistSavedFilters(): void {
    try {
      // In a real implementation, this would save to file or database
      // For now, just emit event
      this.emit('filtersPersisted', Array.from(this.savedFilters.values()));
    } catch (error) {
      console.warn('Failed to persist saved filters:', error);
    }
  }
}

// Global filter service instance
let filterServiceInstance: FilterService | null = null;

export function getFilterService(): FilterService {
  if (!filterServiceInstance) {
    filterServiceInstance = new FilterService();
  }
  return filterServiceInstance;
} 
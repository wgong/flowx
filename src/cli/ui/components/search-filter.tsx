import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { getFilterService, FilterCriteria, SearchOptions, FilterResult } from '../services/filter-service.js';

export interface SearchFilterProps<T> {
  data: T[];
  onFilteredData: (result: FilterResult<T>) => void;
  placeholder?: string;
  searchFields?: string[];
  enableFacets?: boolean;
  enableSavedFilters?: boolean;
  defaultCriteria?: FilterCriteria;
  defaultOptions?: SearchOptions;
  visible?: boolean;
  onClose?: () => void;
}

export interface FilterPanelState {
  mode: 'search' | 'filters' | 'saved' | 'facets';
  searchTerm: string;
  selectedFilters: Record<string, any>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showAdvanced: boolean;
}

export function SearchFilter<T>({
  data,
  onFilteredData,
  placeholder = 'Search...',
  searchFields,
  enableFacets = true,
  enableSavedFilters = true,
  defaultCriteria = {},
  defaultOptions = {},
  visible = true,
  onClose
}: SearchFilterProps<T>) {
  const [state, setState] = useState<FilterPanelState>({
    mode: 'search',
    searchTerm: '',
    selectedFilters: {},
    sortBy: '',
    sortOrder: 'asc',
    showAdvanced: false
  });

  const [filterResult, setFilterResult] = useState<FilterResult<T>>({
    items: data,
    totalCount: data.length,
    filteredCount: data.length,
    matches: [],
    facets: {},
    suggestions: []
  });

  const filterService = getFilterService();

  // Apply filters when data or criteria change
  useEffect(() => {
    const criteria: FilterCriteria = {
      search: state.searchTerm,
      fields: searchFields,
      sortBy: state.sortBy || undefined,
      sortOrder: state.sortOrder,
      ...state.selectedFilters,
      ...defaultCriteria
    };

    const result = filterService.filter(data, criteria, defaultOptions);
    setFilterResult(result);
    onFilteredData(result);
  }, [data, state, searchFields, defaultCriteria, defaultOptions, onFilteredData]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!visible) return;

    if (key.escape) {
      onClose?.();
    } else if (key.tab) {
      // Cycle through modes
      const modes: FilterPanelState['mode'][] = ['search', 'filters', 'facets', 'saved'];
      const currentIndex = modes.indexOf(state.mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setState(prev => ({ ...prev, mode: modes[nextIndex] }));
    } else if (input === 'a' && state.mode === 'search') {
      setState(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }));
    } else if (input === 's' && state.mode === 'filters') {
      // Save current filter
      saveCurrentFilter();
    } else if (input === 'c' && state.mode === 'search') {
      // Clear search
      setState(prev => ({ ...prev, searchTerm: '' }));
    }
  });

  const saveCurrentFilter = () => {
    if (state.searchTerm || Object.keys(state.selectedFilters).length > 0) {
      const criteria: FilterCriteria = {
        search: state.searchTerm,
        fields: searchFields,
        sortBy: state.sortBy || undefined,
        sortOrder: state.sortOrder,
        ...state.selectedFilters
      };

      const filterId = filterService.saveFilter(
        `Filter ${new Date().toLocaleTimeString()}`,
        criteria,
        defaultOptions,
        'Auto-saved filter'
      );

      // Could show a notification here
    }
  };

  if (!visible) return null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="cyan" bold>🔍 Search & Filter</Text>
        <Text color="gray">
          {state.mode.toUpperCase()} | Tab: Switch | Esc: Close
        </Text>
      </Box>

      {/* Mode Content */}
      {state.mode === 'search' && (
        <SearchPanel
          searchTerm={state.searchTerm}
          onSearchChange={(term) => setState(prev => ({ ...prev, searchTerm: term }))}
          suggestions={filterResult.suggestions}
          showAdvanced={state.showAdvanced}
          placeholder={placeholder}
        />
      )}

      {state.mode === 'filters' && (
        <FiltersPanel
          selectedFilters={state.selectedFilters}
          onFiltersChange={(filters) => setState(prev => ({ ...prev, selectedFilters: filters }))}
          sortBy={state.sortBy}
          sortOrder={state.sortOrder}
          onSortChange={(sortBy, sortOrder) => 
            setState(prev => ({ ...prev, sortBy, sortOrder }))
          }
        />
      )}

      {state.mode === 'facets' && enableFacets && (
        <FacetsPanel
          facets={filterResult.facets}
          selectedFilters={state.selectedFilters}
          onFiltersChange={(filters) => setState(prev => ({ ...prev, selectedFilters: filters }))}
        />
      )}

      {state.mode === 'saved' && enableSavedFilters && (
        <SavedFiltersPanel
          onLoadFilter={(criteria) => {
            setState(prev => ({
              ...prev,
              searchTerm: criteria.search || '',
              selectedFilters: {
                type: criteria.type,
                status: criteria.status,
                tags: criteria.tags,
                ...criteria.customFilters
              },
              sortBy: criteria.sortBy || '',
              sortOrder: criteria.sortOrder || 'asc'
            }));
          }}
        />
      )}

      {/* Results Summary */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text>
          📊 Results: {filterResult.filteredCount} of {filterResult.totalCount}
          {filterResult.matches.length > 0 && (
            <Text color="yellow"> | {filterResult.matches.length} matches</Text>
          )}
        </Text>
      </Box>

      {/* Quick Actions */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Actions: [A]dvanced • [C]lear • [S]ave Filter • [Tab] Switch Mode
        </Text>
      </Box>
    </Box>
  );
}

// Search Panel Component
interface SearchPanelProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  suggestions: string[];
  showAdvanced: boolean;
  placeholder: string;
}

function SearchPanel({ 
  searchTerm, 
  onSearchChange, 
  suggestions, 
  showAdvanced, 
  placeholder 
}: SearchPanelProps) {
  const [inputFocused, setInputFocused] = useState(true);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="white" bold>Search: </Text>
        <Box width="100%">
          <TextInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder={placeholder}
            focus={inputFocused}
            onSubmit={() => setInputFocused(false)}
          />
        </Box>
      </Box>

      {showAdvanced && (
        <Box flexDirection="column" marginLeft={2} borderStyle="single" borderColor="gray" padding={1}>
          <Text color="yellow" bold>Advanced Search Options:</Text>
          <Text color="gray">• Use quotes for exact phrases: "exact phrase"</Text>
          <Text color="gray">• Use wildcards: agent* or *task</Text>
          <Text color="gray">• Use regex: /pattern/flags</Text>
          <Text color="gray">• Field search: name:agent OR status:running</Text>
        </Box>
      )}

      {suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">💡 Suggestions:</Text>
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <Text key={index} color="cyan" dimColor>
              • {suggestion}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

// Filters Panel Component
interface FiltersPanelProps {
  selectedFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

function FiltersPanel({ 
  selectedFilters, 
  onFiltersChange, 
  sortBy, 
  sortOrder, 
  onSortChange 
}: FiltersPanelProps) {
  const [selectedField, setSelectedField] = useState('type');

  const filterFields = [
    { label: 'Type', value: 'type' },
    { label: 'Status', value: 'status' },
    { label: 'Tags', value: 'tags' },
    { label: 'Date Range', value: 'dateRange' }
  ];

  const sortFields = [
    { label: 'Name', value: 'name' },
    { label: 'Created Date', value: 'createdAt' },
    { label: 'Updated Date', value: 'updatedAt' },
    { label: 'Status', value: 'status' }
  ];

  return (
    <Box flexDirection="column">
      <Text color="white" bold>Active Filters:</Text>
      
      {Object.keys(selectedFilters).length === 0 ? (
        <Text color="gray" dimColor>No active filters</Text>
      ) : (
        <Box flexDirection="column" marginLeft={2}>
          {Object.entries(selectedFilters).map(([key, value]) => (
            <Text key={key} color="cyan">
              • {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
            </Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="white" bold>Sort By: </Text>
        <Text color="cyan">{sortBy || 'None'} ({sortOrder})</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use facets panel to add filters or type field:value in search
        </Text>
      </Box>
    </Box>
  );
}

// Facets Panel Component
interface FacetsPanelProps {
  facets: Record<string, any>;
  selectedFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
}

function FacetsPanel({ facets, selectedFilters, onFiltersChange }: FacetsPanelProps) {
  const facetEntries = Object.entries(facets);

  if (facetEntries.length === 0) {
    return (
      <Box>
        <Text color="gray" dimColor>No facets available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="white" bold>Filter by Categories:</Text>
      
      {facetEntries.map(([facetName, facet]) => (
        <Box key={facetName} flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color="yellow" bold>{facetName.toUpperCase()}:</Text>
          {facet.values.slice(0, 5).map((item: any, index: number) => (
            <Text key={index} color="cyan">
              • {item.value} ({item.count})
            </Text>
          ))}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Click values to filter (interactive mode coming soon)
        </Text>
      </Box>
    </Box>
  );
}

// Saved Filters Panel Component
interface SavedFiltersPanelProps {
  onLoadFilter: (criteria: FilterCriteria) => void;
}

function SavedFiltersPanel({ onLoadFilter }: SavedFiltersPanelProps) {
  const filterService = getFilterService();
  const savedFilters = useMemo(() => filterService.getSavedFilters(), []);
  const stats = useMemo(() => filterService.getFilterStats(), []);

  if (savedFilters.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray" dimColor>No saved filters</Text>
        <Text color="gray" dimColor>Create filters and press 'S' to save them</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="white" bold>Saved Filters ({savedFilters.length}):</Text>
      
      {savedFilters.slice(0, 5).map((filter, index) => (
        <Box key={filter.id} flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color="cyan" bold>{filter.name}</Text>
          <Text color="gray" dimColor>
            Used {filter.useCount} times • Last: {filter.lastUsed.toLocaleDateString()}
          </Text>
          {filter.description && (
            <Text color="gray">{filter.description}</Text>
          )}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="yellow">💡 Recent Searches:</Text>
        {stats.recentSearches.slice(0, 3).map((search, index) => (
          <Text key={index} color="cyan" dimColor>
            • "{search}"
          </Text>
        ))}
      </Box>
    </Box>
  );
}

export default SearchFilter; 
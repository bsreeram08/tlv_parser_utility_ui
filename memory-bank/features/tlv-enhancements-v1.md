# Feature Request: Enhanced TLV Parsing with Custom Tag Definition & Comparison

## Ticket Number

EMV-123

## Priority

High

## Components

- EMV
- TLV Parser
- UI/UX

## Summary

Enhance the TLV parser to support custom tag definitions, display unknown tags without raising errors, and add functionality to compare two sets of TLV data with visual differencing.

## User Stories

**As a payment technology professional:**

1. I want to define and save custom EMV tags that aren't in the standard dictionary
2. I want the system to display unknown tags without errors instead of hiding them
3. I want to compare two TLV data streams side-by-side to identify differences
4. I want to select saved TLV data for comparison or input new data directly

## Detailed Requirements

### 1. Custom Tag Definitions

#### Functionality

- Create a user interface to define new EMV tags not included in the default dictionary
- Allow users to specify:
  - Tag ID (e.g., "9F1A")
  - Tag name (e.g., "Terminal Country Code")
  - Tag description
  - Data format/type (binary, numeric, alphanumeric, etc.)
  - Length rules (fixed or variable)
  - Display format for parsed data (hex, ASCII, decimal, etc.)
- Persist custom tag definitions in local storage
- Allow editing and deletion of custom tags
- Provide a management interface to view all custom tags

#### UI Elements

- "Add Custom Tag" button in the TLV parser interface
- Custom tag definition form with appropriate input validations
- Custom tag library management view
- Visual indicator showing when a displayed tag is custom vs. standard

### 2. Unknown Tag Handling

#### Functionality

- Modify the TLV parser to display unknown tags by default
- Show unknown tags with their raw hex values
- Provide visual distinction between known and unknown tags
- Allow filtering to show/hide unknown tags

#### UI Elements

- Visual styling to distinguish unknown tags
- Toggle to show/hide unknown tags
- Indicator showing total count of unknown tags found

### 3. TLV Comparison Tool

#### Functionality

- Create a side-by-side comparison view for two TLV data sets
- Normalize both TLV sets to contain all tags from either set
- Show clear visual indicators for:
  - Tags present in both sets with identical values
  - Tags present in both sets with different values
  - Tags present in only one set
- Highlight specific differences within tag values
- Calculate and display a similarity score/percentage

#### UI Elements

- Dual input interface with options to:
  - Enter raw TLV data
  - Select from saved TLV data
  - Upload TLV files
- Color-coded differences (added, removed, changed)
- Summary statistics of comparison results
- Options to export comparison results

### 4. TLV Storage & Retrieval

#### Functionality

- Save TLV data samples with names and descriptions
- Categorize saved TLV data (e.g., by card type, transaction type)
- Search and filter saved TLV data
- Export/import TLV data libraries

#### UI Elements

- Save interface with metadata fields
- Library browser with search, filter, and preview capabilities
- Import/export controls

## Technical Approach

### Data Storage

- Use browser localStorage for persistent storage of:
  - Custom tag definitions
  - Saved TLV data samples
- Consider IndexedDB for larger datasets if needed
- Implement data versioning to handle future schema changes

### Comparison Algorithm

- Parse both TLV streams into structured objects
- Create a unified tag set from both streams
- For each tag in the unified set:
  - Check presence in each TLV set
  - Compare values if present in both
  - Mark as added/removed if only in one set
- Apply efficient diffing algorithm to minimize processing time
- Implement pagination for large TLV sets

### UI Components Needed

- Custom tag definition form
- Tag library management interface
- TLV comparison view
- Saved TLV library browser
- Difference visualization components

## Acceptance Criteria

1. Users can create, edit, and delete custom tag definitions
2. Unknown tags are displayed by default with appropriate visual indicators
3. Two TLV data sets can be compared with clear visualization of differences
4. TLV data can be saved and retrieved for future use
5. The application maintains acceptable performance when processing large TLV sets (50+ tags)
6. The UI is responsive and works on desktop and tablet devices

## Development Phases

### Phase 1: Custom Tag Definition System

- Create data model for custom tags
- Implement storage and retrieval
- Build UI for tag management
- Integrate with existing TLV parser

### Phase 2: Unknown Tag Handling

- Modify parser to display unknown tags
- Add appropriate styling and indicators
- Implement filtering options

### Phase 3: TLV Storage System

- Create data model for saved TLV samples
- Implement storage and retrieval mechanism
- Build UI for saved TLV management

### Phase 4: Comparison Tool

- Implement comparison algorithm
- Build side-by-side visualization UI
- Add difference highlighting and navigation
- Integrate with saved TLV system

## Related Documentation

- EMV Book 3 (Application Specification)
- EMV Tag Dictionary
- Project Code Standards (.windsurfrules)

## Estimated Development Effort

- Total: 3-4 sprints
- Custom Tags: 1 sprint
- Unknown Tag Handling: 0.5 sprint
- TLV Storage: 0.5 sprint
- Comparison Tool: 1-2 sprints

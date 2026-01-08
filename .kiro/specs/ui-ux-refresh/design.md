# Design Document: UI/UX Refresh

## Overview

This design document outlines the technical approach for refreshing the Church Member Management frontend using Tailus UI React components. The implementation will integrate Tailwind CSS with custom Kharis branding, implement a light/dark theme system, and ensure full responsiveness across all device sizes. All changes will be validated in the demo path before production deployment.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  ThemeProvider                      │    │
│  │  - Manages light/dark mode state                    │    │
│  │  - Persists to localStorage                         │    │
│  │  - Applies 'dark' class to document                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Layout Layer                      │    │
│  │  ┌─────────────┐  ┌─────────────┐                   │    │
│  │  │ MainLayout  │  │ DemoLayout  │                   │    │
│  │  │ (Production)│  │ (Testing)   │                   │    │
│  │  └─────────────┘  └─────────────┘                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Tailus UI Components                   │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │    │
│  │  │ Button │ │  Card  │ │ Table  │ │ Input  │ ...    │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Tailwind CSS + Theme                   │    │
│  │  - Custom color palette (Kharis branding)           │    │
│  │  - Dark mode variants                               │    │
│  │  - Responsive breakpoints                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Theme System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ThemeContext                             │
├─────────────────────────────────────────────────────────────┤
│  State:                                                     │
│  - theme: 'light' | 'dark'                                  │
│                                                             │
│  Actions:                                                   │
│  - toggleTheme(): void                                      │
│  - setTheme(theme): void                                    │
│                                                             │
│  Effects:                                                   │
│  - On mount: Load from localStorage or system preference    │
│  - On change: Save to localStorage, update document class   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### ThemeProvider Component

```typescript
// src/contexts/ThemeContext.tsx

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Provider wraps the entire application
// Manages theme state and document class
```

### ThemeToggle Component

```typescript
// src/components/common/ThemeToggle.tsx

interface ThemeToggleProps {
  className?: string;
}

// Renders a button with sun/moon icon
// Calls toggleTheme from context on click
```

### Responsive Layout Components

```typescript
// src/layouts/MainLayout.tsx (updated)

// Uses Tailwind responsive classes:
// - Container: max-w-7xl mx-auto w-full
// - Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
// - Navigation: responsive with mobile menu
```

### Tailus UI Component Wrappers

```typescript
// src/components/tailus-ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
}

// src/components/tailus-ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

// src/components/tailus-ui/Table.tsx
interface TableProps {
  children: React.ReactNode;
  className?: string;
}

// src/components/tailus-ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
```

## Data Models

### Theme State Model

```typescript
interface ThemeState {
  theme: 'light' | 'dark';
  systemPreference: 'light' | 'dark' | null;
}

// localStorage key: 'kharis-theme'
// Value: 'light' | 'dark'
```

### Color Palette Configuration

```typescript
// tailwind.config.js theme extension

const colors = {
  primary: {
    DEFAULT: '#1e3a5f',  // Navy blue (light mode)
    light: '#2d5a8a',
    dark: '#3b82f6',     // Brighter blue (dark mode)
  },
  accent: {
    DEFAULT: '#c9a227',  // Gold (light mode)
    light: '#e6c84a',
    dark: '#fbbf24',     // Brighter gold (dark mode)
  },
  surface: {
    light: '#ffffff',
    dark: '#1e293b',
  },
  background: {
    light: '#f8fafc',
    dark: '#0f172a',
  },
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme State Consistency

*For any* sequence of theme toggle operations, the theme state SHALL always be either 'light' or 'dark', and the document root class SHALL match the current theme state.

**Validates: Requirements 3.1, 3.2, 3.6**

### Property 2: Theme Persistence Round-Trip

*For any* theme value set by the user, saving to localStorage and then reloading the application SHALL restore the exact same theme value.

**Validates: Requirements 3.3, 3.4**

### Property 3: Responsive Grid Layout

*For any* viewport width, the grid layout SHALL display:
- 1 column when width < 768px
- 2 columns when 768px ≤ width < 1024px  
- Up to 4 columns when width ≥ 1024px

**Validates: Requirements 4.6, 4.7, 4.8**

### Property 4: Theme-Aware Component Styling

*For any* theme-aware component (Card, Table, EmptyState, Logo), the component's background/foreground colors SHALL match the current theme's color palette.

**Validates: Requirements 7.2, 9.2, 10.4, 11.4, 11.5**

### Property 5: Navigation Active State

*For any* route in the application, the navigation tab corresponding to that route SHALL have the active visual indicator applied, and no other tabs SHALL have the active indicator.

**Validates: Requirements 6.2**

### Property 6: Container Width Constraint

*For any* viewport width, the main content container SHALL have:
- width = 100% when viewport < 1280px
- width = 1280px (max-width) when viewport ≥ 1280px

**Validates: Requirements 4.1, 4.2**

## Error Handling

### Theme Loading Errors

```typescript
// If localStorage is unavailable or corrupted:
// 1. Catch the error
// 2. Fall back to system preference (prefers-color-scheme)
// 3. If system preference unavailable, default to 'light'
// 4. Log warning to console for debugging

try {
  const stored = localStorage.getItem('kharis-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
} catch (error) {
  console.warn('Failed to load theme from localStorage:', error);
}

// Fallback to system preference
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  return 'dark';
}
return 'light';
```

### Component Rendering Errors

```typescript
// Wrap Tailus UI components in error boundaries
// If a component fails to render:
// 1. Catch the error
// 2. Display a fallback UI
// 3. Log error for debugging

<ErrorBoundary fallback={<div className="p-4 text-red-500">Component failed to load</div>}>
  <TailusComponent />
</ErrorBoundary>
```

### Responsive Layout Fallbacks

```typescript
// If CSS Grid is not supported (very old browsers):
// 1. Detect support using @supports
// 2. Fall back to flexbox layout
// 3. Maintain single-column layout as minimum viable experience

@supports not (display: grid) {
  .grid-container {
    display: flex;
    flex-direction: column;
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific component behaviors and edge cases:

1. **ThemeProvider Tests**
   - Initial state defaults to system preference when no localStorage
   - Toggle switches between light and dark
   - setTheme updates state correctly
   - Invalid theme values are rejected

2. **ThemeToggle Tests**
   - Renders correct icon for current theme
   - Calls toggleTheme on click
   - Accessible (has aria-label)

3. **Component Tests**
   - Card renders with correct theme classes
   - Button variants apply correct styles
   - Table handles empty data gracefully
   - Input shows error state correctly

### Property-Based Tests

Property-based tests will validate universal properties across many inputs using fast-check:

1. **Theme State Property Test**
   - Generate random sequences of toggle/setTheme operations
   - Verify state is always valid ('light' or 'dark')
   - Verify document class matches state

2. **Theme Persistence Property Test**
   - Generate random theme values
   - Save, clear context, reload
   - Verify restored value matches saved value

3. **Responsive Layout Property Test**
   - Generate random viewport widths
   - Verify grid columns match breakpoint rules

4. **Theme-Aware Styling Property Test**
   - For each theme-aware component
   - Toggle theme
   - Verify CSS classes/styles match theme

5. **Navigation Active State Property Test**
   - Generate random valid routes
   - Navigate to route
   - Verify exactly one tab is active

### Integration Tests

1. **Demo Path Validation**
   - All demo routes are accessible without auth
   - Demo components render correctly
   - Theme toggle works in demo layout

2. **Production Path Validation**
   - Components match demo path behavior
   - No visual regressions
   - Performance metrics within acceptable range

### Test Configuration

```typescript
// Property tests should run minimum 100 iterations
// Tag format: Feature: ui-ux-refresh, Property {number}: {property_text}

// Example:
// Feature: ui-ux-refresh, Property 1: Theme State Consistency
```

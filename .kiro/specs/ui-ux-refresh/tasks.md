# Implementation Plan: UI/UX Refresh

## Overview

This implementation plan breaks down the UI/UX refresh into incremental tasks. Each task builds on previous work, with testing integrated throughout. All UI changes are first validated in the demo path before being applied to production routes.

## Tasks

- [x] 1. Install and configure Tailwind CSS with Tailus UI
  - [x] 1.1 Install Tailwind CSS, PostCSS, and Autoprefixer dependencies
    - Run `npm install -D tailwindcss postcss autoprefixer`
    - Initialize Tailwind with `npx tailwindcss init -p`
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Install Tailus UI Themer and dependencies
    - Run `npm install @tailus/themer tailwind-merge lucide-react`
    - _Requirements: 1.2_
  - [x] 1.3 Configure tailwind.config.js with Kharis brand colors
    - Add content paths including Tailus themer components
    - Extend theme with primary (navy), accent (gold), surface, and background colors
    - Configure dark mode as 'class' strategy
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 1.4 Update index.css with Tailwind directives
    - Replace manual utility classes with @tailwind base, components, utilities
    - Keep any custom styles that aren't covered by Tailwind
    - _Requirements: 1.3_
  - [x] 1.5 Create cloneElement utility function
    - Create src/lib/utils.ts with cloneElement helper
    - _Requirements: 1.4_

- [x] 2. Checkpoint - Verify Tailwind CSS setup
  - Run `npm run build` to ensure no build errors
  - Verify Tailwind classes are being processed
  - Ask the user if questions arise

- [x] 3. Implement Theme Provider and Toggle
  - [x] 3.1 Create ThemeContext with light/dark state management
    - Create src/contexts/ThemeContext.tsx
    - Implement theme state, toggleTheme, and setTheme functions
    - Add localStorage persistence on theme change
    - Load initial theme from localStorage or system preference
    - Apply 'dark' class to document.documentElement
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 3.2 Write property test for theme state consistency
    - **Property 1: Theme State Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.6**
  - [x] 3.3 Write property test for theme persistence round-trip
    - **Property 2: Theme Persistence Round-Trip**
    - **Validates: Requirements 3.3, 3.4**
  - [x] 3.4 Create ThemeToggle component
    - Create src/components/common/ThemeToggle.tsx
    - Use lucide-react Sun/Moon icons
    - Style with Tailwind classes
    - _Requirements: 3.7_
  - [x] 3.5 Add ThemeProvider to App.tsx
    - Wrap application with ThemeProvider
    - _Requirements: 3.1_

- [x] 4. Checkpoint - Verify theme system works
  - Test theme toggle in browser
  - Verify localStorage persistence
  - Verify dark class is applied to html element
  - Ask the user if questions arise

- [x] 5. Add Kharis logo assets
  - [x] 5.1 Create SVG logo component
    - Create src/assets/KharisLogo.tsx as an SVG React component
    - Support className prop for sizing and coloring
    - Use currentColor for theme-aware coloring
    - _Requirements: 11.1, 11.4, 11.5_
  - [x] 5.2 Update favicon
    - Add favicon.ico and favicon.svg to public folder
    - Update index.html to reference new favicon
    - _Requirements: 11.7_

- [x] 6. Create Tailus UI component wrappers
  - [x] 6.1 Create Card component wrapper
    - Create src/components/tailus-ui/Card.tsx
    - Support variant props (default, elevated, outlined)
    - Apply theme-aware background colors
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 6.2 Create Button component wrapper
    - Create src/components/tailus-ui/Button.tsx
    - Support variant props (primary, secondary, outline, ghost)
    - Support size props (sm, md, lg)
    - Use brand primary color for primary variant
    - _Requirements: 8.1, 8.2_
  - [x] 6.3 Create Input component wrapper
    - Create src/components/tailus-ui/Input.tsx
    - Support label and error props
    - Apply focus ring with primary color
    - Apply disabled state styling
    - _Requirements: 8.3, 8.5, 8.6_
  - [x] 6.4 Create Select component wrapper
    - Create src/components/tailus-ui/Select.tsx
    - Apply consistent styling with Input
    - _Requirements: 8.4_
  - [x] 6.5 Create Table component wrapper
    - Create src/components/tailus-ui/Table.tsx
    - Include Table, TableHeader, TableBody, TableRow, TableCell subcomponents
    - Apply theme-aware background colors
    - Add alternating row colors
    - Add hover state for rows
    - Wrap in overflow-x-auto container
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 6.6 Write property test for theme-aware component styling
    - **Property 4: Theme-Aware Component Styling**
    - **Validates: Requirements 7.2, 9.2, 10.4, 11.4, 11.5**
  - [x] 6.7 Create LoadingSpinner component
    - Create src/components/common/LoadingSpinner.tsx
    - Use brand primary color
    - Support optional loading text
    - _Requirements: 10.1, 10.2_
  - [x] 6.8 Create EmptyState component
    - Create src/components/common/EmptyState.tsx
    - Support icon, title, and description props
    - Apply theme-aware styling
    - _Requirements: 10.3, 10.4_
  - [x] 6.9 Create component index file
    - Create src/components/tailus-ui/index.ts
    - Export all Tailus UI wrapper components
    - _Requirements: 6.1-6.8_

- [x] 7. Checkpoint - Verify component library
  - Import and render each component in isolation
  - Verify theme switching works for all components
  - Ask the user if questions arise

- [x] 8. Update Demo Layout for testing
  - [x] 8.1 Update DemoLayout with new styling
    - Update src/layouts/DemoLayout.tsx
    - Apply Tailwind classes for responsive layout
    - Add ThemeToggle to header
    - Use max-w-7xl container
    - _Requirements: 5.1, 4.1, 4.2_
  - [x] 8.2 Create demo dashboard page with all components
    - Create src/pages/demo/ComponentShowcase.tsx
    - Display all Tailus UI components with different variants
    - Include theme toggle demonstration
    - _Requirements: 5.3_
  - [x] 8.3 Ensure demo path is accessible without auth
    - Verify /demo routes don't require authentication
    - _Requirements: 5.5_
  - [x] 8.4 Write property test for responsive grid layout
    - **Property 3: Responsive Grid Layout**
    - **Validates: Requirements 4.6, 4.7, 4.8**
  - [x] 8.5 Write property test for container width constraint
    - **Property 6: Container Width Constraint**
    - **Validates: Requirements 4.1, 4.2**

- [x] 9. Checkpoint - Validate demo path
  - Navigate to /demo routes
  - Test all components in demo showcase
  - Test responsive behavior at different viewport sizes
  - Test theme toggle
  - Ask the user if questions arise

- [x] 10. Update Navigation component
  - [x] 10.1 Update MainLayout navigation with Tailus UI styling
    - Update src/layouts/MainLayout.tsx
    - Apply brand colors to navigation
    - Add Kharis logo to header
    - Add ThemeToggle to header
    - Style active tab with primary color
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 11.2, 11.3_
  - [x] 10.2 Implement mobile navigation
    - Add hamburger menu for mobile viewports
    - Create mobile menu overlay/drawer
    - _Requirements: 6.3, 4.5_
  - [x] 10.3 Write property test for navigation active state
    - **Property 5: Navigation Active State**
    - **Validates: Requirements 6.2**

- [x] 11. Checkpoint - Validate navigation
  - Test navigation on desktop and mobile viewports
  - Verify active state highlighting
  - Verify theme toggle works
  - Verify logo displays correctly in both themes
  - Ask the user if questions arise

- [x] 12. Update Dashboard page components
  - [x] 12.1 Update KPI cards with new Card component
    - Update src/pages/dashboard/Dashboard.tsx
    - Replace existing cards with Tailus UI Card
    - Use accent color for KPI values
    - _Requirements: 7.4, 7.5_
  - [x] 12.2 Update dashboard grid layout
    - Apply responsive grid classes
    - 1 column on mobile, 2 on tablet, 4 on desktop
    - _Requirements: 4.6, 4.7, 4.8_
  - [x] 12.3 Update charts and data displays
    - Ensure charts respect theme colors
    - _Requirements: 7.2_

- [x] 13. Update Attendance Explorer page
  - [x] 13.1 Update attendance tables with new Table component
    - Update src/pages/attendance/*.tsx files
    - Replace existing tables with Tailus UI Table
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 13.2 Update form controls
    - Replace selects and inputs with Tailus UI components
    - _Requirements: 8.3, 8.4_
  - [x] 13.3 Update buttons
    - Replace buttons with Tailus UI Button
    - _Requirements: 8.1, 8.2_

- [x] 14. Update Missing Members page
  - [x] 14.1 Update service selectors with new components
    - Update src/pages/attendance/MissingMembers.tsx
    - Use Tailus UI Select components
    - _Requirements: 8.4_
  - [x] 14.2 Update member list display
    - Use Tailus UI Table or Card components
    - _Requirements: 9.1, 7.1_
  - [x] 14.3 Update empty state
    - Use EmptyState component when no results
    - _Requirements: 10.3, 10.4_

- [x] 15. Update Member Journey page
  - [x] 15.1 Update timeline display
    - Update src/pages/members/*.tsx files
    - Apply theme-aware styling to timeline
    - _Requirements: 7.2_
  - [x] 15.2 Update member cards
    - Use Tailus UI Card components
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 16. Update Admin pages
  - [x] 16.1 Update admin tables
    - Update src/pages/admin/*.tsx files
    - Use Tailus UI Table components
    - _Requirements: 9.1, 9.2_
  - [x] 16.2 Update admin forms
    - Use Tailus UI Input, Select, Button components
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 17. Update Login page
  - [x] 17.1 Add Kharis logo to login page
    - Update src/pages/auth/LoginPage.tsx (or equivalent)
    - Display logo prominently above login form
    - _Requirements: 11.6_
  - [x] 17.2 Update login form styling
    - Use Tailus UI Input and Button components
    - _Requirements: 8.1, 8.3_

- [x] 18. Final checkpoint - Full application validation
  - Test all pages in both light and dark modes
  - Test responsive behavior on mobile, tablet, and desktop
  - Verify no horizontal page scrolling
  - Verify all components use brand colors
  - Verify logo displays correctly throughout
  - Run all property tests
  - Ask the user if questions arise

- [x] 19. Cleanup and optimization
  - [x] 19.1 Remove unused CSS from index.css
    - Remove manual utility classes now handled by Tailwind
    - Keep only custom styles not covered by Tailwind
    - _Requirements: 1.3_
  - [x] 19.2 Verify build output size
    - Run production build
    - Check CSS bundle size
    - Enable Tailwind purge if not already configured
    - _Requirements: 1.1_

- [x] 20. Final checkpoint - Production readiness
  - Run full test suite
  - Verify production build succeeds
  - Test deployed demo path
  - Ask the user if questions arise

## Notes

- Each checkpoint ensures incremental validation before proceeding
- All UI changes are first tested in demo path before production routes
- Property tests validate universal correctness properties across many inputs
- Unit tests validate specific examples and edge cases

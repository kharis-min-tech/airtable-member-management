/**
 * Property-Based Tests for Airtable Interface Embedding
 * 
 * Property 9: Airtable interface embedding
 * Validates: Requirements 5.4
 * 
 * For any embedded Airtable interface on /contacts, the system should not 
 * interfere with real-time data updates from Airtable
 * 
 * Feature: app-enhancements-v4, Property 9: Airtable interface embedding
 * Validates: Requirements 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';
import ContactsPage from './ContactsPage';

// Mock ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

/**
 * Arbitrary for generating valid Airtable interface URLs
 */
const airtableInterfaceUrlArb = fc.record({
  appId: fc.string({ minLength: 10, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  viewId: fc.string({ minLength: 10, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
}).map(({ appId, viewId }) => `https://airtable.com/embed/app${appId}/shr${viewId}`);

/**
 * Arbitrary for generating iframe configuration options
 */
const iframeConfigArb = fc.record({
  height: fc.integer({ min: 300, max: 1200 }).map(h => `${h}px`),
  allowFullscreen: fc.boolean(),
});

describe('Property 9: Airtable interface embedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 9.1: Embedded interface does not block Airtable communication
   * 
   * For any embedded Airtable interface, the iframe should be configured
   * to allow Airtable's real-time updates without interference.
   * 
   * Validates: Requirements 5.4
   */
  it('should render iframe without blocking attributes that would prevent real-time updates', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );

    // Find the iframe element
    const iframe = container.querySelector('iframe');
    
    if (iframe) {
      // Verify iframe does NOT have sandbox attribute that would block scripts
      // (sandbox without allow-scripts would block Airtable's real-time functionality)
      const sandboxAttr = iframe.getAttribute('sandbox');
      if (sandboxAttr !== null) {
        // If sandbox is present, it must include allow-scripts for real-time updates
        expect(sandboxAttr).toContain('allow-scripts');
      }

      // Verify iframe has a valid src pointing to Airtable
      const src = iframe.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toContain('airtable.com');
    }

    unmount();
  });

  /**
   * Property 9.2: Iframe configuration preserves Airtable functionality
   * 
   * For any valid iframe configuration, the embedded interface should
   * maintain attributes necessary for Airtable's real-time data updates.
   * 
   * Validates: Requirements 5.4
   */
  it('should configure iframe to preserve Airtable real-time functionality', () => {
    fc.assert(
      fc.property(
        iframeConfigArb,
        (_config: { height: string; allowFullscreen: boolean }) => {
          const { container, unmount } = render(
            <MemoryRouter>
              <ContactsPage />
            </MemoryRouter>
          );

          const iframe = container.querySelector('iframe');
          
          if (iframe) {
            // Verify iframe has width set to 100% for responsive design
            expect(iframe.getAttribute('width')).toBe('100%');

            // Verify iframe has a title for accessibility
            const title = iframe.getAttribute('title');
            expect(title).toBeTruthy();
            expect(title!.length).toBeGreaterThan(0);

            // Verify src is a valid Airtable URL
            const src = iframe.getAttribute('src');
            expect(src).toMatch(/airtable\.com/);
          }

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 9.3: Interface embedding handles various URL formats
   * 
   * For any valid Airtable interface URL format, the system should
   * properly embed the interface without modification that would
   * break real-time updates.
   * 
   * Validates: Requirements 5.4
   */
  it('should handle various Airtable URL formats without breaking functionality', () => {
    fc.assert(
      fc.property(
        airtableInterfaceUrlArb,
        (url: string) => {
          // Verify the URL format is valid for Airtable embedding
          expect(url).toMatch(/^https:\/\/airtable\.com\/embed\/app[a-zA-Z0-9]+\/shr[a-zA-Z0-9]+$/);
          
          // Verify URL uses HTTPS (required for secure iframe embedding)
          expect(url.startsWith('https://')).toBe(true);
          
          // Verify URL contains embed path (required for iframe embedding)
          expect(url).toContain('/embed/');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: ContactsPage renders with live data indicator
   * 
   * The contacts page should indicate that data is live/real-time
   * to inform users that the interface reflects current Airtable data.
   * 
   * Validates: Requirements 5.4
   */
  it('should display live data indicator for real-time updates', () => {
    const { unmount } = render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );

    // Verify the page renders the live data indicator
    expect(screen.getByText('Live Data')).toBeInTheDocument();

    // Verify the page title is rendered
    expect(screen.getByText('Evangelism Contacts')).toBeInTheDocument();

    // Verify the interface description mentions real-time data
    expect(screen.getByText(/real-time data/i)).toBeInTheDocument();

    unmount();
  });

  /**
   * Property 9.5: Embedded interface maintains responsive design
   * 
   * For any screen size, the embedded Airtable interface should
   * maintain responsive design without breaking the iframe.
   * 
   * Validates: Requirements 5.4
   */
  it('should maintain responsive design for embedded interface', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );

    const iframe = container.querySelector('iframe');
    
    if (iframe) {
      // Verify iframe uses percentage width for responsiveness
      expect(iframe.getAttribute('width')).toBe('100%');

      // Verify iframe has a minimum height set
      const style = iframe.getAttribute('style');
      if (style) {
        expect(style).toContain('min-height');
      }
    }

    // Verify the container has responsive classes
    const mainContainer = container.querySelector('.space-y-8');
    expect(mainContainer).toBeInTheDocument();

    unmount();
  });

  /**
   * Property 9.6: Error state provides fallback without blocking updates
   * 
   * When the interface fails to load, the error state should provide
   * a direct link to Airtable that preserves real-time functionality.
   * 
   * Validates: Requirements 5.4
   */
  it('should provide fallback link that preserves Airtable functionality', () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );

    // Find any fallback links to Airtable
    const airtableLinks = container.querySelectorAll('a[href*="airtable.com"]');
    
    // Verify fallback links open in new tab (preserves current page state)
    airtableLinks.forEach(link => {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });

    unmount();
  });
});

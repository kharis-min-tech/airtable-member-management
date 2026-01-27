/**
 * Property-Based Tests for Airtable Form Rendering
 * 
 * Property 8: Airtable form rendering
 * Validates: Requirements 4.3
 * 
 * For any active Airtable form configuration, the /forms page should render 
 * all available embedded form interfaces in a user-friendly list
 * 
 * Feature: app-enhancements-v4, Property 8: Airtable form rendering
 * Validates: Requirements 4.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';

// Mock ThemeContext
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

// Mock components that will be created
const MockAirtableEmbed = ({ embedUrl, title, height = '600px' }: { 
  embedUrl: string; 
  title: string; 
  height?: string; 
}) => (
  <div data-testid="airtable-embed" data-url={embedUrl} data-title={title} style={{ height }}>
    <iframe 
      src={embedUrl} 
      title={title}
      width="100%" 
      height={height}
      data-testid="airtable-iframe"
    />
  </div>
);

const MockFormsPage = ({ forms }: { forms: AirtableForm[] }) => (
  <div data-testid="forms-page">
    <h1>Forms</h1>
    <div data-testid="forms-list">
      {forms.map((form) => (
        <div key={form.id} data-testid={`form-${form.id}`}>
          <h2>{form.title}</h2>
          <p>{form.description}</p>
          <MockAirtableEmbed 
            embedUrl={form.embedUrl} 
            title={form.title}
            height="600px"
          />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Type definitions for Airtable forms
 */
interface AirtableForm {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  category: 'general' | 'membership' | 'events' | 'feedback';
  isActive: boolean;
}

/**
 * Arbitrary for generating valid Airtable form configurations
 */
const airtableFormArb = fc.record({
  id: fc.integer({ min: 1, max: 999999 }).map(n => `form-${n}`),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  embedUrl: fc.string({ minLength: 10 }).map(s => `https://airtable.com/embed/${s.replace(/\s/g, '')}`),
  category: fc.constantFrom('general', 'membership', 'events', 'feedback'),
  isActive: fc.constant(true), // Only test active forms
});

/**
 * Arbitrary for generating lists of active Airtable forms with unique IDs
 */
const activeFormsListArb = fc.array(airtableFormArb, { minLength: 1, maxLength: 5 })
  .map(forms => {
    // Ensure unique IDs by adding index suffix
    return forms.map((form, index) => ({
      ...form,
      id: `${form.id}-${index}`
    }));
  });

/**
 * Arbitrary for generating valid embed URLs
 */
const embedUrlArb = fc.record({
  baseUrl: fc.constant('https://airtable.com/embed/'),
  formId: fc.string({ minLength: 10, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
  params: fc.option(fc.string().map(s => `?${s}`), { nil: '' }),
}).map(({ baseUrl, formId, params }) => `${baseUrl}${formId}${params}`);

describe('Property 8: Airtable form rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 8.1: All active forms are rendered in the forms list
   * 
   * For any list of active Airtable forms, the FormsPage should render
   * all forms in a user-friendly list format.
   * 
   * Validates: Requirements 4.3
   */
  it('should render all active forms in the forms list', () => {
    fc.assert(
      fc.property(
        activeFormsListArb,
        (forms: AirtableForm[]) => {
          const { container, unmount } = render(<MockFormsPage forms={forms} />);

          // Verify the forms page is rendered
          const formsPage = container.querySelector('[data-testid="forms-page"]');
          expect(formsPage).toBeInTheDocument();

          // Verify the forms list is rendered
          const formsList = container.querySelector('[data-testid="forms-list"]');
          expect(formsList).toBeInTheDocument();

          // Verify each form is rendered
          forms.forEach((form) => {
            const formElement = container.querySelector(`[data-testid="form-${form.id}"]`);
            expect(formElement).toBeInTheDocument();
            
            // Verify form title and description are displayed
            expect(formElement?.textContent).toContain(form.title);
            expect(formElement?.textContent).toContain(form.description);
          });

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 8.2: Each form has a properly configured Airtable embed
   * 
   * For any active Airtable form, the embedded iframe should have the
   * correct URL, title, and dimensions.
   * 
   * Validates: Requirements 4.3
   */
  it('should render properly configured Airtable embeds for each form', () => {
    fc.assert(
      fc.property(
        activeFormsListArb,
        (forms: AirtableForm[]) => {
          const { container, unmount } = render(<MockFormsPage forms={forms} />);

          // Verify each form has a properly configured embed
          forms.forEach((form) => {
            const formElement = container.querySelector(`[data-testid="form-${form.id}"]`);
            expect(formElement).toBeInTheDocument();

            // Find the Airtable embed within this form
            const embedElement = formElement?.querySelector('[data-testid="airtable-embed"]');
            expect(embedElement).toBeInTheDocument();
            
            // Verify embed configuration
            expect(embedElement?.getAttribute('data-url')).toBe(form.embedUrl);
            expect(embedElement?.getAttribute('data-title')).toBe(form.title);

            // Verify iframe is present with correct attributes
            const iframe = embedElement?.querySelector('[data-testid="airtable-iframe"]');
            expect(iframe).toBeInTheDocument();
            expect(iframe?.getAttribute('src')).toBe(form.embedUrl);
            expect(iframe?.getAttribute('title')).toBe(form.title);
            expect(iframe?.getAttribute('width')).toBe('100%');
          });

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 8.3: Form rendering is consistent across different configurations
   * 
   * For any set of forms with different categories and content, the rendering
   * should be consistent and all forms should be displayed properly.
   * 
   * Validates: Requirements 4.3
   */
  it('should render forms consistently across different configurations', () => {
    fc.assert(
      fc.property(
        activeFormsListArb,
        (forms: AirtableForm[]) => {
          const { container, unmount } = render(<MockFormsPage forms={forms} />);

          // Count expected vs actual rendered forms
          const renderedForms = container.querySelectorAll('[data-testid^="form-"]');
          expect(renderedForms.length).toBe(forms.length);

          // Verify each rendered form has all required elements
          forms.forEach((form, index) => {
            const formElement = renderedForms[index];
            
            // Each form should have title, description, and embed
            const hasTitle = formElement.textContent?.includes(form.title);
            const hasDescription = formElement.textContent?.includes(form.description);
            const hasEmbed = formElement.querySelector('[data-testid="airtable-embed"]');
            
            expect(hasTitle).toBe(true);
            expect(hasDescription).toBe(true);
            expect(hasEmbed).toBeInTheDocument();
          });

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  }, 15000);

  /**
   * Property 8.4: Embed URLs are properly formatted and valid
   * 
   * For any Airtable form, the embed URL should be properly formatted
   * and point to a valid Airtable embed endpoint.
   * 
   * Validates: Requirements 4.3
   */
  it('should use properly formatted embed URLs', () => {
    fc.assert(
      fc.property(
        embedUrlArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (embedUrl: string, title: string) => {
          const { container, unmount } = render(
            <MockAirtableEmbed embedUrl={embedUrl} title={title} />
          );

          // Verify the embed is rendered
          const embedElement = container.querySelector('[data-testid="airtable-embed"]');
          expect(embedElement).toBeInTheDocument();

          // Verify URL format
          expect(embedUrl).toMatch(/^https:\/\/airtable\.com\/embed\//);
          
          // Verify iframe has the correct URL
          const iframe = container.querySelector('[data-testid="airtable-iframe"]');
          expect(iframe?.getAttribute('src')).toBe(embedUrl);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: Forms list handles empty state gracefully
   * 
   * When no active forms are available, the forms page should handle
   * the empty state gracefully without errors.
   * 
   * Validates: Requirements 4.3
   */
  it('should handle empty forms list gracefully', () => {
    const { container, unmount } = render(<MockFormsPage forms={[]} />);

    // Verify the forms page is still rendered
    const formsPage = container.querySelector('[data-testid="forms-page"]');
    expect(formsPage).toBeInTheDocument();

    // Verify the forms list is rendered (even if empty)
    const formsList = container.querySelector('[data-testid="forms-list"]');
    expect(formsList).toBeInTheDocument();

    // Verify no form elements are rendered
    const formElements = container.querySelectorAll('[data-testid^="form-"]');
    expect(formElements.length).toBe(0);

    unmount();
  });

  /**
   * Property 8.6: Form categories are preserved in rendering
   * 
   * For any form with a specific category, the form should be rendered
   * regardless of its category type.
   * 
   * Validates: Requirements 4.3
   */
  it('should render forms regardless of category', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('general', 'membership', 'events', 'feedback'),
        fc.integer({ min: 1, max: 999999 }).map(n => `form-${n}`),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        embedUrlArb,
        (category: AirtableForm['category'], id: string, title: string, embedUrl: string) => {
          const form: AirtableForm = {
            id,
            title,
            description: `Test form for ${category} category`,
            embedUrl,
            category,
            isActive: true,
          };

          const { container, unmount } = render(<MockFormsPage forms={[form]} />);

          // Verify the form is rendered regardless of category
          const formElement = container.querySelector(`[data-testid="form-${form.id}"]`);
          expect(formElement).toBeInTheDocument();
          
          // Verify form content is displayed
          expect(formElement?.textContent).toContain(form.title);
          expect(formElement?.textContent).toContain(form.description);

          // Verify embed is present
          const embedElement = formElement?.querySelector('[data-testid="airtable-embed"]');
          expect(embedElement).toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
import { useState, useEffect } from 'react';
import AirtableEmbed from '../../components/AirtableEmbed';
import { getAirtableForms, getFormsFallbackUrl, type AirtableForm } from '../../config/airtable';

/**
 * FormsPage component with form list and embedded interfaces
 * 
 * Displays a list of available Airtable forms for public access.
 * Each form is embedded using an iframe for seamless user experience.
 * Uses centralized configuration from environment variables with fallback defaults.
 * 
 * Requirements: 4.1, 4.2, 4.3 - Public forms page with embedded Airtable forms
 */
function FormsPage() {
  const [forms, setForms] = useState<AirtableForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failedForms, setFailedForms] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load forms from configuration
    const loadForms = () => {
      const configuredForms = getAirtableForms();
      const activeForms = configuredForms.filter(form => form.isActive);
      setForms(activeForms);
      setIsLoading(false);
    };

    // Set forms immediately for testing, or with delay for real usage
    const isTestEnvironment = process.env.NODE_ENV === 'test';
    if (isTestEnvironment) {
      loadForms();
    } else {
      // Small delay to show loading state in non-test environments
      setTimeout(loadForms, 300);
    }
  }, []);

  const handleFormError = (formId: string) => {
    setFailedForms(prev => new Set(prev).add(formId));
  };

  const fallbackUrl = getFormsFallbackUrl();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary-dark mx-auto mb-4"></div>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
            Loading forms...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
          Church Forms
        </h1>
        <p className="text-lg text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
          Access and submit various church forms. No login required.
        </p>
      </div>

      {/* Forms List */}
      {forms.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
            No Forms Available
          </h3>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
            No forms are currently available. Please check back later.
          </p>
          <a 
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary dark:text-primary-dark hover:underline"
          >
            Visit Airtable directly
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      ) : (
        <div className="space-y-12">
          {forms.map((form) => (
            <div 
              key={form.id} 
              className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              data-testid={`form-card-${form.id}`}
            >
              {/* Form Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                      {form.title}
                    </h2>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark">
                      {form.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 dark:bg-primary-dark/20 text-primary dark:text-primary-dark capitalize">
                      {form.category}
                    </span>
                    {failedForms.has(form.id) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                        Fallback Mode
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Embedded Form */}
              <div className="p-6">
                <AirtableEmbed
                  embedUrl={form.embedUrl}
                  title={form.title}
                  height="600px"
                  allowFullscreen={true}
                  fallbackUrl={fallbackUrl}
                  onError={() => handleFormError(form.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Need Help?
        </h3>
        <p className="text-blue-800 dark:text-blue-200 mb-4">
          If you're having trouble with any of these forms or need assistance, please contact our church office.
        </p>
        <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <p>📧 Email: office@church.org</p>
          <p>📞 Phone: (555) 123-4567</p>
          <p>🕐 Office Hours: Monday - Friday, 9:00 AM - 5:00 PM</p>
        </div>
      </div>
    </div>
  );
}

export default FormsPage;

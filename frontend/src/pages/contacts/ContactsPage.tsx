import { useState } from 'react';
import AirtableEmbed from '../../components/AirtableEmbed';
import { getContactsConfig } from '../../config/airtable';

/**
 * ContactsPage component with embedded Airtable interface
 * 
 * Displays evangelism contacts through an embedded Airtable interface.
 * Allows church leaders to view souls won through evangelism efforts.
 * Uses centralized configuration from environment variables with fallback defaults.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4 - Public contacts page with Airtable interface
 */
function ContactsPage() {
  const [hasError, setHasError] = useState(false);
  
  // Get configuration from centralized config
  const contactsConfig = getContactsConfig();

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
          Evangelism Contacts
        </h1>
        <p className="text-lg text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
          View and track souls won through evangelism efforts. This interface shows real-time data from our evangelism outreach programs.
        </p>
      </div>

      {/* Embedded Airtable Interface */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Interface Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                Evangelism Contact Database
              </h2>
              <p className="text-text-secondary-light dark:text-text-secondary-dark">
                {contactsConfig.description}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {hasError ? (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Fallback Mode
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Live Data
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Embedded Interface */}
        <div className="p-6">
          <AirtableEmbed
            embedUrl={contactsConfig.embedUrl}
            title={contactsConfig.title}
            height="700px"
            allowFullscreen={true}
            fallbackUrl={contactsConfig.fallbackUrl}
            onError={handleError}
          />
        </div>
      </div>

      {/* Information Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* About This Interface */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
            About This Interface
          </h3>
          <ul className="space-y-2 text-green-800 dark:text-green-200 text-sm">
            <li>• View all evangelism contacts and their status</li>
            <li>• Track follow-up progress and assignments</li>
            <li>• Monitor conversion and discipleship journey</li>
            <li>• Real-time updates from evangelism teams</li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Evangelism Team Contact
          </h3>
          <div className="space-y-2 text-blue-800 dark:text-blue-200 text-sm">
            <p>📧 evangelism@church.org</p>
            <p>📞 (555) 123-4567 ext. 205</p>
            <p>👥 Team Leader: Pastor John Smith</p>
            <p>🕐 Team Meetings: Saturdays, 10:00 AM</p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Privacy Notice
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              This interface contains sensitive personal information. Access is logged and monitored. Please handle all contact information with care and in accordance with our privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactsPage;

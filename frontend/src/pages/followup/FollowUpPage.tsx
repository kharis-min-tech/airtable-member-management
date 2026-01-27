import { useState } from 'react';
import AirtableEmbed from '../../components/AirtableEmbed';
import { getFollowUpConfig } from '../../config/airtable';

/**
 * FollowUpPage component with embedded Airtable interface
 * 
 * Displays follow-up tracking through an embedded Airtable interface.
 * Allows church leaders to view and track member/souls follow-up progress.
 * Public page - no authentication required.
 */
function FollowUpPage() {
  const [hasError, setHasError] = useState(false);
  
  // Get configuration from centralized config
  const followUpConfig = getFollowUpConfig();

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
          Follow Up Tracking
        </h1>
        <p className="text-lg text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
          Track and monitor follow-up progress for members and souls. This interface shows real-time data from our follow-up programs.
        </p>
      </div>

      {/* Embedded Airtable Interface */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Interface Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                Follow Up Database
              </h2>
              <p className="text-text-secondary-light dark:text-text-secondary-dark">
                {followUpConfig.description}
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
            embedUrl={followUpConfig.embedUrl}
            title={followUpConfig.title}
            height="700px"
            allowFullscreen={true}
            fallbackUrl={followUpConfig.fallbackUrl}
            onError={handleError}
          />
        </div>
      </div>

      {/* Information Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* About This Interface */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
            About This Interface
          </h3>
          <ul className="space-y-2 text-purple-800 dark:text-purple-200 text-sm">
            <li>• View all follow-up assignments and their status</li>
            <li>• Track progress of member engagement</li>
            <li>• Monitor discipleship journey milestones</li>
            <li>• Real-time updates from follow-up teams</li>
          </ul>
        </div>

        {/* Follow Up Team Contact */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
          <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
            Follow Up Team Contact
          </h3>
          <div className="space-y-2 text-indigo-800 dark:text-indigo-200 text-sm">
            <p>📧 followup@church.org</p>
            <p>📞 (555) 123-4567 ext. 206</p>
            <p>👥 Team Coordinator: Available</p>
            <p>🕐 Weekly Check-ins: Wednesdays</p>
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

export default FollowUpPage;

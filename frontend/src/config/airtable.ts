/**
 * Airtable Configuration Management
 * 
 * Provides centralized configuration for Airtable embeds used in public pages.
 * Supports environment variable configuration with fallback defaults.
 * 
 * Requirements: 4.3, 5.3 - Airtable form and interface URL configuration
 */

/**
 * Form category types for organizing forms
 */
export type FormCategory = 'general' | 'membership' | 'events' | 'feedback';

/**
 * Airtable form configuration interface
 */
export interface AirtableForm {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  category: FormCategory;
  isActive: boolean;
}

/**
 * Airtable interface configuration for contacts page
 */
export interface AirtableInterfaceConfig {
  embedUrl: string;
  fallbackUrl: string;
  title: string;
  description: string;
}

/**
 * Default forms configuration when environment variables are not set
 */
const DEFAULT_FORMS: AirtableForm[] = [
  {
    id: 'membership-form',
    title: 'Membership Application',
    description: 'Apply to become a member of our church community.',
    embedUrl: 'https://airtable.com/embed/appXXXXXXXXXXXXXX/shrXXXXXXXXXXXXXX',
    category: 'membership',
    isActive: true,
  },
  {
    id: 'event-registration',
    title: 'Event Registration',
    description: 'Register for upcoming church events and activities.',
    embedUrl: 'https://airtable.com/embed/appYYYYYYYYYYYYYY/shrYYYYYYYYYYYYYY',
    category: 'events',
    isActive: true,
  },
  {
    id: 'feedback-form',
    title: 'Feedback & Suggestions',
    description: 'Share your feedback and suggestions with church leadership.',
    embedUrl: 'https://airtable.com/embed/appZZZZZZZZZZZZZZ/shrZZZZZZZZZZZZZZ',
    category: 'feedback',
    isActive: true,
  },
];

/**
 * Default contacts interface configuration
 */
const DEFAULT_CONTACTS_CONFIG: AirtableInterfaceConfig = {
  embedUrl: 'https://airtable.com/embed/appEVANGELISM123/shrCONTACTS456',
  fallbackUrl: 'https://airtable.com/appEVANGELISM123/shrCONTACTS456',
  title: 'Evangelism Contacts Interface',
  description: 'Live view of evangelism contacts and follow-up status',
};

/**
 * Default follow-up interface configuration
 */
const DEFAULT_FOLLOWUP_CONFIG: AirtableInterfaceConfig = {
  embedUrl: 'https://airtable.com/embed/appFOLLOWUP123/shrFOLLOWUP456',
  fallbackUrl: 'https://airtable.com/appFOLLOWUP123/shrFOLLOWUP456',
  title: 'Follow Up Tracking Interface',
  description: 'Live view of member/souls follow-up progress and assignments',
};

/**
 * Parses form configuration from environment variable string
 * Format: id|title|description|embedUrl|category (comma-separated for multiple)
 */
function parseFormsFromEnv(envValue: string | undefined): AirtableForm[] {
  if (!envValue || envValue.trim() === '') {
    return DEFAULT_FORMS;
  }

  try {
    const formStrings = envValue.split(',');
    const forms: AirtableForm[] = [];

    for (const formStr of formStrings) {
      const parts = formStr.trim().split('|');
      if (parts.length >= 4) {
        const category = (parts[4] || 'general') as FormCategory;
        forms.push({
          id: parts[0].trim(),
          title: parts[1].trim(),
          description: parts[2].trim(),
          embedUrl: parts[3].trim(),
          category: ['general', 'membership', 'events', 'feedback'].includes(category) 
            ? category 
            : 'general',
          isActive: true,
        });
      }
    }

    return forms.length > 0 ? forms : DEFAULT_FORMS;
  } catch {
    console.warn('Failed to parse VITE_AIRTABLE_FORMS, using defaults');
    return DEFAULT_FORMS;
  }
}

/**
 * Gets the configured Airtable forms from environment variables
 * Falls back to default forms if not configured
 */
export function getAirtableForms(): AirtableForm[] {
  const envForms = import.meta.env.VITE_AIRTABLE_FORMS;
  return parseFormsFromEnv(envForms);
}

/**
 * Gets the contacts interface configuration from environment variables
 * Falls back to default configuration if not set
 */
export function getContactsConfig(): AirtableInterfaceConfig {
  const embedUrl = import.meta.env.VITE_AIRTABLE_CONTACTS_URL;
  const fallbackUrl = import.meta.env.VITE_AIRTABLE_CONTACTS_FALLBACK_URL;

  return {
    embedUrl: embedUrl || DEFAULT_CONTACTS_CONFIG.embedUrl,
    fallbackUrl: fallbackUrl || embedUrl || DEFAULT_CONTACTS_CONFIG.fallbackUrl,
    title: DEFAULT_CONTACTS_CONFIG.title,
    description: DEFAULT_CONTACTS_CONFIG.description,
  };
}

/**
 * Gets the forms fallback URL for when embeds fail
 */
export function getFormsFallbackUrl(): string {
  return import.meta.env.VITE_AIRTABLE_FORMS_FALLBACK_URL || 'https://airtable.com';
}

/**
 * Gets the follow-up interface configuration from environment variables
 * Falls back to default configuration if not set
 */
export function getFollowUpConfig(): AirtableInterfaceConfig {
  const embedUrl = import.meta.env.VITE_AIRTABLE_FOLLOWUP_URL;
  const fallbackUrl = import.meta.env.VITE_AIRTABLE_FOLLOWUP_FALLBACK_URL;

  return {
    embedUrl: embedUrl || DEFAULT_FOLLOWUP_CONFIG.embedUrl,
    fallbackUrl: fallbackUrl || embedUrl || DEFAULT_FOLLOWUP_CONFIG.fallbackUrl,
    title: DEFAULT_FOLLOWUP_CONFIG.title,
    description: DEFAULT_FOLLOWUP_CONFIG.description,
  };
}

/**
 * Validates if an Airtable embed URL is properly formatted
 */
export function isValidAirtableUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Check for valid Airtable embed URL patterns
  // Supports: 
  // - Share links: /shr... 
  // - View links: /viw...
  // - Page/Form links: /pag.../form
  const airtablePattern = /^https:\/\/airtable\.com\/(embed\/)?app[a-zA-Z0-9]+\/(shr|viw|pag)[a-zA-Z0-9]+(\/form)?/;
  return airtablePattern.test(url);
}

/**
 * Configuration object for easy access to all Airtable settings
 */
export const airtableConfig = {
  getForms: getAirtableForms,
  getContactsConfig,
  getFormsFallbackUrl,
  isValidUrl: isValidAirtableUrl,
};

export default airtableConfig;

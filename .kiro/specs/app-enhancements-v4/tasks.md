# Implementation Plan

- [x] 1. Set up custom domain infrastructure
  - Extend CDK stack to support custom domain configuration with Cloudflare
  - Add Certificate Manager and Route 53 integration
  - Configure CloudFront distribution with custom domain aliases
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Write property test for custom domain HTTPS accessibility
  - **Property 1: Custom domain HTTPS accessibility**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 1.2 Write property test for DNS resolution correctness
  - **Property 2: DNS resolution correctness**
  - **Validates: Requirements 1.4**

- [ ] 2. Implement member terminology unification
  - Update all API responses to use Member terminology instead of Volunteer
  - Modify frontend components to remove volunteer references
  - Update type definitions and interfaces
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2.1 Write property test for member terminology consistency
  - **Property 3: Member terminology consistency**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 2.2 Write property test for data preservation during migration
  - **Property 4: Data preservation during migration**
  - **Validates: Requirements 2.4**

- [ ] 3. Fix attendance by service API parameter bug
  - Identify and fix the missing Service_ID parameter in AttendanceByServiceView component
  - Update church-api service method to properly pass serviceId parameter
  - Implement proper error handling for API parameter validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3.1 Write property test for service ID parameter inclusion
  - **Property 5: Service ID parameter inclusion**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 3.2 Write property test for meaningful error messages
  - **Property 6: Meaningful error messages**
  - **Validates: Requirements 3.4**

- [ ] 4. Create public forms page infrastructure
  - Create new PublicLayout component for unauthenticated pages
  - Implement AirtableEmbed component for iframe integration
  - Create FormsPage component with form list and embedded interfaces
  - Update router configuration to add public /forms route
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4.1 Write property test for public route accessibility
  - **Property 7: Public route accessibility**
  - **Validates: Requirements 4.2, 5.2**

- [ ] 4.2 Write property test for Airtable form rendering
  - **Property 8: Airtable form rendering**
  - **Validates: Requirements 4.3**

- [ ] 5. Create public contacts page infrastructure
  - Create ContactsPage component with embedded Airtable interface
  - Configure Airtable interface URL for evangelism contacts
  - Update router configuration to add public /contacts route
  - Ensure responsive design for mobile access
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5.1 Write property test for Airtable interface embedding
  - **Property 9: Airtable interface embedding**
  - **Validates: Requirements 5.4**

- [ ] 6. Update routing configuration
  - Modify router to support public routes without authentication
  - Ensure /forms and /contacts bypass Cognito authentication
  - Update navigation components to handle public/private route distinction
  - Test route accessibility and authentication bypass
  - _Requirements: 4.2, 5.2_

- [ ] 7. Configure Airtable embed URLs
  - Set up environment variables for Airtable form and interface URLs
  - Create configuration management for public page content
  - Implement fallback handling for unavailable embeds
  - _Requirements: 4.3, 5.3_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Update deployment configuration
  - Modify CDK deployment to include domain configuration
  - Update environment variables for production deployment
  - Configure DNS settings and certificate validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 10. Final integration and testing
  - Test complete application with custom domain
  - Verify public routes work without authentication
  - Validate embedded Airtable forms and interfaces
  - Confirm member terminology consistency across all interfaces
  - _Requirements: All_

- [ ] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
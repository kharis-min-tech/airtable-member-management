# Implementation Plan: First Timer Age Bracket and Visitor Fields

## Overview

This implementation adds Age Bracket and Visitor fields to the first-timer registration flow. The changes are localized to type definitions, the first-timer handler, and the member service. Property-based tests will verify the correctness properties defined in the design.

## Tasks

- [x] 1. Update type definitions
  - [x] 1.1 Add "Visitor" to MemberStatus type in `src/types/index.ts`
    - Add "Visitor" to the union type
    - _Requirements: 6.1_
  
  - [x] 1.2 Add ageBracket field to CreateMemberInput interface
    - Add optional `ageBracket?: string` field
    - _Requirements: 6.3_

- [x] 2. Update FirstTimerEvent interface and webhook parsing
  - [x] 2.1 Extend FirstTimerEvent interface in `src/handlers/first-timer.ts`
    - Add `ageBracket?: string | null` field
    - Add `visitor?: boolean | null` field
    - _Requirements: 6.2_
  
  - [x] 2.2 Extend FirstTimerWebhookPayload fields type
    - Add `"Age Bracket"?: string` field
    - Add `"Visitor?"?: boolean` field
    - _Requirements: 1.1, 2.1_
  
  - [x] 2.3 Update parseFirstTimerWebhook function to extract new fields
    - Extract Age Bracket from `fields["Age Bracket"]`
    - Extract Visitor from `fields["Visitor?"]`
    - Handle null/undefined gracefully
    - _Requirements: 1.1, 1.3, 2.1_
  
  - [x] 2.4 Write property test for webhook parsing of new fields
    - **Property 1: Webhook Parsing Extracts New Fields**
    - **Validates: Requirements 1.1, 1.3, 2.1**

- [x] 3. Update validation logic in first-timer handler
  - [x] 3.1 Modify processFirstTimerEvent validation to check for child/visitor
    - Add helper function `isContactInfoRequired(event: FirstTimerEvent): boolean`
    - Return false if `ageBracket === 'Child'` (case-insensitive) OR `visitor === true`
    - Update validation to skip phone/email check when not required
    - _Requirements: 3.1, 4.1, 5.1, 5.2_
  
  - [x] 3.2 Write property test for validation relaxation
    - **Property 3: Validation Relaxed for Children and Visitors**
    - **Validates: Requirements 3.1, 4.1, 5.1**
  
  - [x] 3.3 Write property test for validation requirement
    - **Property 4: Validation Requires Contact for Non-Children Non-Visitors**
    - **Validates: Requirements 3.3, 4.3, 5.2**

- [x] 4. Update member creation logic
  - [x] 4.1 Update MemberService.createMember to accept and store ageBracket
    - Add ageBracket to fields mapping: `fields['Age Bracket'] = input.ageBracket`
    - Update validation to allow missing phone/email when ageBracket is "Child"
    - _Requirements: 1.2, 3.2_
  
  - [x] 4.2 Update processFirstTimerEvent to determine status based on visitor flag
    - Set status to "Visitor" when `event.visitor === true`
    - Set status to "First Timer" when visitor is false/null
    - Pass ageBracket to createMember
    - _Requirements: 2.2, 2.3_
  
  - [x] 4.3 Update merge logic for existing Evangelism Contact
    - When merging and visitor is true, set status to "Visitor" instead of "First Timer"
    - _Requirements: 2.4_
  
  - [x] 4.4 Write property test for status determination
    - **Property 2: Status Determination Based on Visitor Flag**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [x] 4.5 Write property test for Age Bracket flow
    - **Property 5: Age Bracket Flows to Linked Member**
    - **Validates: Requirements 1.2**
  
  - [x] 4.6 Write property test for member creation without contact
    - **Property 6: Member Creation Succeeds Without Contact for Children/Visitors**
    - **Validates: Requirements 3.2, 4.2**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm test -- --runInBand` to verify

- [x] 6. Integration verification
  - [x] 6.1 Verify backward compatibility with existing webhooks
    - Ensure webhooks without Age Bracket/Visitor fields still work
    - Ensure existing validation rules apply when new fields are absent
    - _Requirements: 5.2_
  
  - [x] 6.2 Write integration test for complete flow
    - Test child registration without contact info
    - Test visitor registration without contact info
    - Test normal registration requiring contact info
    - _Requirements: 3.1, 4.1, 5.1, 5.2_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm test -- --runInBand` to verify all property and unit tests pass

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- The existing test file `test/first-timer-handler.property.test.ts` should be extended with new property tests
- Use `npm test -- --runInBand` to avoid memory issues during testing

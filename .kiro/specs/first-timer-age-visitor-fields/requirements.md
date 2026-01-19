# Requirements Document

## Introduction

This feature enhances the first-timer registration flow by adding two new fields: Age Bracket and Visitor. These fields modify how member records are created and validated, with special handling for children and visitors that relaxes contact information requirements.

## Glossary

- **First_Timer_Handler**: The webhook handler that processes first-timer registration events from Airtable
- **Member_Service**: The service responsible for creating and managing member records
- **Age_Bracket**: A field indicating the age category of the registrant (e.g., "Child", "Adult", "Senior")
- **Visitor**: A boolean field indicating whether the registrant is a visitor rather than a first-timer
- **Linked_Member**: The member record created or associated with a first-timer registration
- **Contact_Information**: Phone number, email address, and physical address fields

## Requirements

### Requirement 1: Age Bracket Field Support

**User Story:** As a church administrator, I want to capture the age bracket of first-timers, so that I can categorize members appropriately and apply age-specific processing rules.

#### Acceptance Criteria

1. WHEN a first-timer registration includes an Age Bracket value, THE First_Timer_Handler SHALL parse and include the Age Bracket in the FirstTimerEvent
2. WHEN a linked member is created from a first-timer registration, THE Member_Service SHALL copy the Age Bracket value to the linked member record
3. WHEN a first-timer registration does not include an Age Bracket value, THE First_Timer_Handler SHALL treat the Age Bracket as null without causing errors

### Requirement 2: Visitor Field Support

**User Story:** As a church administrator, I want to identify visitors separately from first-timers, so that their member status reflects their relationship with the church.

#### Acceptance Criteria

1. WHEN a first-timer registration includes a Visitor field set to true, THE First_Timer_Handler SHALL parse and include the Visitor flag in the FirstTimerEvent
2. WHEN a linked member is created and the Visitor field is true, THE Member_Service SHALL set the member Status to "Visitor" instead of "First Timer"
3. WHEN a linked member is created and the Visitor field is false or not provided, THE Member_Service SHALL set the member Status to "First Timer"
4. WHEN an existing Evangelism Contact is found and the Visitor field is true, THE Member_Service SHALL update the member Status to "Visitor" instead of "First Timer"

### Requirement 3: Relaxed Validation for Children

**User Story:** As a church administrator, I want children to be registered without requiring contact information, so that families can register their children easily.

#### Acceptance Criteria

1. WHEN a first-timer registration has Age Bracket set to "Child", THE First_Timer_Handler SHALL NOT require phone, email, or address to create a linked member
2. WHEN a first-timer registration has Age Bracket set to "Child" and no contact information is provided, THE Member_Service SHALL create the member record with empty contact fields
3. WHEN a first-timer registration has Age Bracket NOT set to "Child", THE First_Timer_Handler SHALL require at least phone or email as before

### Requirement 4: Relaxed Validation for Visitors

**User Story:** As a church administrator, I want visitors to be registered without requiring contact information, so that casual visitors can be tracked without friction.

#### Acceptance Criteria

1. WHEN a first-timer registration has Visitor set to true, THE First_Timer_Handler SHALL NOT require phone, email, or address to create a linked member
2. WHEN a first-timer registration has Visitor set to true and no contact information is provided, THE Member_Service SHALL create the member record with empty contact fields
3. WHEN a first-timer registration has Visitor set to false or not provided, THE First_Timer_Handler SHALL require at least phone or email as before

### Requirement 5: Combined Validation Rules

**User Story:** As a church administrator, I want the validation rules to work correctly when both Age Bracket and Visitor fields are used together.

#### Acceptance Criteria

1. WHEN a first-timer registration has either Age Bracket set to "Child" OR Visitor set to true, THE First_Timer_Handler SHALL NOT require contact information
2. WHEN a first-timer registration has Age Bracket NOT set to "Child" AND Visitor is false or not provided, THE First_Timer_Handler SHALL require at least phone or email

### Requirement 6: Type System Updates

**User Story:** As a developer, I want the type system to include the new Visitor status, so that the codebase correctly represents all possible member states.

#### Acceptance Criteria

1. THE MemberStatus type SHALL include "Visitor" as a valid status value
2. THE FirstTimerEvent interface SHALL include optional ageBracket and visitor fields
3. THE CreateMemberInput interface SHALL include an optional ageBracket field

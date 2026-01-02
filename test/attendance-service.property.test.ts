/**
 * Property-Based Tests for Attendance Service
 * 
 * Property 8: Attendance Marking Idempotency
 * Validates: Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 * 
 * For any First Timer or Returner registration with a linked Service:
 * - An Attendance record SHALL exist linking the Member to the Service with Present? = true
 * - The Source Form SHALL match the registration type ("First Timer" or "Returner")
 * - Processing the same registration multiple times SHALL NOT create duplicate Attendance records
 * - If an Attendance record already exists for that Member+Service, it SHALL be updated rather than duplicated
 */

import * as fc from 'fast-check';
import { AttendanceService, AttendanceError } from '../src/services/attendance-service';
import { AirtableClient } from '../src/services/airtable-client';
import { AirtableRecord, SourceForm } from '../src/types';

/**
 * Arbitraries for generating test data
 */
const airtableIdArb = fc.stringMatching(/^rec[a-zA-Z0-9]{14}$/);

const sourceFormArb = fc.constantFrom('First Timer', 'Returner', 'Evangelism', 'Manual') as fc.Arbitrary<SourceForm>;

const attendanceRecordArb = fc.record({
  id: airtableIdArb,
  fields: fc.record({
    'Member': fc.array(airtableIdArb, { minLength: 1, maxLength: 1 }),
    'Service': fc.array(airtableIdArb, { minLength: 1, maxLength: 1 }),
    'Present?': fc.boolean(),
    'Group Tag': fc.option(fc.string(), { nil: undefined }),
    'Source Form': sourceFormArb,
  }),
  createdTime: fc.date().map(d => d.toISOString()),
});

describe('Property 8: Attendance Marking Idempotency', () => {
  let mockAirtableClient: jest.Mocked<AirtableClient>;
  let attendanceService: AttendanceService;

  beforeEach(() => {
    mockAirtableClient = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      getRecord: jest.fn(),
      findRecords: jest.fn(),
      batchCreate: jest.fn(),
      batchUpdate: jest.fn(),
    } as unknown as jest.Mocked<AirtableClient>;

    attendanceService = new AttendanceService(mockAirtableClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 8.1: For any valid member and service IDs, markPresent should
   * create an attendance record with Present? = true when no existing record exists
   * 
   * Validates: Requirements 6.1, 6.2, 7.1, 7.2
   */
  it('should create attendance record with Present? = true when no existing record', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        sourceFormArb,
        attendanceRecordArb,
        async (memberId, serviceId, sourceForm, mockRecord) => {
          // No existing attendance record
          mockAirtableClient.findRecords.mockResolvedValue([]);
          
          // Mock the created record
          const createdRecord: AirtableRecord = {
            ...mockRecord,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
              'Source Form': sourceForm,
            },
          };
          mockAirtableClient.createRecord.mockResolvedValue(createdRecord);

          const result = await attendanceService.markPresent(memberId, serviceId, sourceForm);

          // Should have created a new record
          expect(result.created).toBe(true);
          expect(result.updated).toBe(false);
          
          // Should have called createRecord with correct parameters
          expect(mockAirtableClient.createRecord).toHaveBeenCalledWith(
            'Attendance',
            expect.objectContaining({
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
              'Source Form': sourceForm,
            })
          );

          // Result should have Present? = true
          expect(result.attendance.present).toBe(true);
          expect(result.attendance.sourceForm).toBe(sourceForm);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: For any existing attendance record, markPresent should
   * update the record rather than create a duplicate
   * 
   * Validates: Requirements 6.3, 7.3
   */
  it('should update existing attendance record rather than create duplicate', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        sourceFormArb,
        fc.boolean(),
        async (memberId, serviceId, existingRecordId, sourceForm, existingPresentValue) => {
          // Existing attendance record (may have Present? = false)
          const existingRecord: AirtableRecord = {
            id: existingRecordId,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': existingPresentValue,
              'Source Form': 'Manual',
            },
            createdTime: new Date().toISOString(),
          };
          mockAirtableClient.findRecords.mockResolvedValue([existingRecord]);

          // Mock the updated record
          const updatedRecord: AirtableRecord = {
            id: existingRecordId,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
              'Source Form': sourceForm,
            },
            createdTime: new Date().toISOString(),
          };
          mockAirtableClient.updateRecord.mockResolvedValue(updatedRecord);

          const result = await attendanceService.markPresent(memberId, serviceId, sourceForm);

          // Should have updated, not created
          expect(result.created).toBe(false);
          expect(result.updated).toBe(true);

          // Should NOT have called createRecord
          expect(mockAirtableClient.createRecord).not.toHaveBeenCalled();

          // Should have called updateRecord with correct parameters
          expect(mockAirtableClient.updateRecord).toHaveBeenCalledWith(
            'Attendance',
            existingRecordId,
            expect.objectContaining({
              'Present?': true,
              'Source Form': sourceForm,
            })
          );

          // Result should have Present? = true
          expect(result.attendance.present).toBe(true);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Processing the same registration multiple times should
   * always result in exactly one attendance record (idempotency)
   * 
   * Validates: Requirements 6.3, 7.3
   */
  it('should be idempotent - multiple calls result in single record', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        sourceFormArb,
        fc.integer({ min: 2, max: 5 }),
        async (memberId, serviceId, recordId, sourceForm, numCalls) => {
          let callCount = 0;
          
          // First call: no existing record, subsequent calls: record exists
          mockAirtableClient.findRecords.mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return []; // No existing record on first call
            }
            // Record exists on subsequent calls
            return [{
              id: recordId,
              fields: {
                'Member': [memberId],
                'Service': [serviceId],
                'Present?': true,
                'Source Form': sourceForm,
              },
              createdTime: new Date().toISOString(),
            }] as AirtableRecord[];
          });

          const createdRecord: AirtableRecord = {
            id: recordId,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
              'Source Form': sourceForm,
            },
            createdTime: new Date().toISOString(),
          };
          mockAirtableClient.createRecord.mockResolvedValue(createdRecord);
          mockAirtableClient.updateRecord.mockResolvedValue(createdRecord);

          // Make multiple calls
          const results = [];
          for (let i = 0; i < numCalls; i++) {
            const result = await attendanceService.markPresent(memberId, serviceId, sourceForm);
            results.push(result);
          }

          // First call should create
          expect(results[0]!.created).toBe(true);
          expect(results[0]!.updated).toBe(false);

          // Subsequent calls should update
          for (let i = 1; i < numCalls; i++) {
            expect(results[i]!.created).toBe(false);
            expect(results[i]!.updated).toBe(true);
          }

          // createRecord should only be called once
          expect(mockAirtableClient.createRecord).toHaveBeenCalledTimes(1);

          // updateRecord should be called for subsequent calls
          expect(mockAirtableClient.updateRecord).toHaveBeenCalledTimes(numCalls - 1);

          // All results should have the same record ID
          const allSameId = results.every(r => r.attendance.id === recordId);
          expect(allSameId).toBe(true);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.4: Source Form should match the registration type
   * 
   * Validates: Requirements 6.2, 7.2
   */
  it('should set Source Form to match registration type', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        fc.constantFrom('First Timer', 'Returner') as fc.Arbitrary<SourceForm>,
        attendanceRecordArb,
        async (memberId, serviceId, registrationType, mockRecord) => {
          mockAirtableClient.findRecords.mockResolvedValue([]);
          
          const createdRecord: AirtableRecord = {
            ...mockRecord,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
              'Source Form': registrationType,
            },
          };
          mockAirtableClient.createRecord.mockResolvedValue(createdRecord);

          const result = await attendanceService.markPresent(memberId, serviceId, registrationType);

          // Source Form should match the registration type
          expect(result.attendance.sourceForm).toBe(registrationType);

          // Verify the correct source form was passed to createRecord
          expect(mockAirtableClient.createRecord).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              'Source Form': registrationType,
            })
          );

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.5: findAttendance should return the correct record when it exists
   * 
   * Validates: Idempotency check for Requirements 6.3, 7.3
   */
  it('should find existing attendance record by member and service', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        sourceFormArb,
        fc.boolean(),
        async (memberId, serviceId, recordId, sourceForm, presentValue) => {
          const existingRecord: AirtableRecord = {
            id: recordId,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': presentValue,
              'Source Form': sourceForm,
            },
            createdTime: new Date().toISOString(),
          };
          mockAirtableClient.findRecords.mockResolvedValue([existingRecord]);

          const result = await attendanceService.findAttendance(memberId, serviceId);

          expect(result).not.toBeNull();
          expect(result!.id).toBe(recordId);
          expect(result!.memberId).toBe(memberId);
          expect(result!.serviceId).toBe(serviceId);
          expect(result!.present).toBe(presentValue);
          expect(result!.sourceForm).toBe(sourceForm);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.6: findAttendance should return null when no record exists
   * 
   * Validates: Idempotency check for Requirements 6.3, 7.3
   */
  it('should return null when no attendance record exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        async (memberId, serviceId) => {
          mockAirtableClient.findRecords.mockResolvedValue([]);

          const result = await attendanceService.findAttendance(memberId, serviceId);

          expect(result).toBeNull();

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.7: Input validation should reject empty IDs
   * 
   * Validates: Input validation for Requirements 6.1, 7.1
   */
  it('should reject empty member or service IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', ' ', '  '),
        airtableIdArb,
        sourceFormArb,
        async (emptyMemberId, serviceId, sourceForm) => {
          await expect(
            attendanceService.markPresent(emptyMemberId.trim() || '', serviceId, sourceForm)
          ).rejects.toThrow(AttendanceError);
        }
      ),
      { numRuns: 10 }
    );

    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        fc.constantFrom('', ' ', '  '),
        sourceFormArb,
        async (memberId, emptyServiceId, sourceForm) => {
          await expect(
            attendanceService.markPresent(memberId, emptyServiceId.trim() || '', sourceForm)
          ).rejects.toThrow(AttendanceError);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 8.8: markPresent should always result in Present? = true
   * regardless of the previous state
   * 
   * Validates: Requirements 6.2, 6.3, 7.2, 7.3
   */
  it('should always set Present? to true regardless of previous state', async () => {
    await fc.assert(
      fc.asyncProperty(
        airtableIdArb,
        airtableIdArb,
        airtableIdArb,
        sourceFormArb,
        fc.boolean(), // Previous Present? value (could be true or false)
        async (memberId, serviceId, recordId, sourceForm, previousPresentValue) => {
          // Existing record with any Present? value
          const existingRecord: AirtableRecord = {
            id: recordId,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': previousPresentValue,
              'Source Form': 'Manual',
            },
            createdTime: new Date().toISOString(),
          };
          mockAirtableClient.findRecords.mockResolvedValue([existingRecord]);

          const updatedRecord: AirtableRecord = {
            id: recordId,
            fields: {
              'Member': [memberId],
              'Service': [serviceId],
              'Present?': true,
              'Source Form': sourceForm,
            },
            createdTime: new Date().toISOString(),
          };
          mockAirtableClient.updateRecord.mockResolvedValue(updatedRecord);

          const result = await attendanceService.markPresent(memberId, serviceId, sourceForm);

          // Result should always have Present? = true
          expect(result.attendance.present).toBe(true);

          // updateRecord should be called with Present? = true
          expect(mockAirtableClient.updateRecord).toHaveBeenCalledWith(
            expect.any(String),
            recordId,
            expect.objectContaining({
              'Present?': true,
            })
          );

          jest.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });
});

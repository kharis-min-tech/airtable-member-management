# Design Document: API Performance Optimization

## Overview

This design document outlines the technical approach for optimizing API performance in a church management system from ~5 seconds to <2 seconds response time. The optimization strategy focuses on zero-cost improvements through parallel execution, intelligent caching, and request deduplication across both frontend (React/TypeScript) and backend (AWS Lambda/Node.js) layers.

The system architecture consists of:
- **Frontend**: React with TypeScript, Vite build tool, Cognito authentication
- **Backend**: AWS Lambda (Node.js 18), API Gateway, DynamoDB cache (15min TTL)
- **Data Source**: Airtable API (5 req/s rate limit)

Key optimization strategies:
1. **Parallel Execution**: Replace sequential API calls with Promise.all() patterns
2. **Request Deduplication**: Global singleton preventing duplicate in-flight requests
3. **Stale-While-Revalidate**: Instant cache responses with background refresh
4. **Backend Parallelization**: Concurrent Airtable queries for independent data
5. **Resource Optimization**: Lambda memory increase for better CPU allocation
6. **UX Enhancement**: Debounced auto-loading for date filter changes
7. **Developer Experience**: Comprehensive API documentation and testing tools

## Architecture

### Current Architecture

```
User Browser
    ↓
React App (Sequential API calls)
    ↓
API Gateway
    ↓
Lambda (256MB) → DynamoDB Cache (15min TTL)
    ↓
Airtable API (Sequential queries)
```

**Current Performance Bottlenecks:**
1. Frontend loads 4-5 endpoints sequentially (waterfall pattern)
2. Multiple components make duplicate simultaneous requests
3. Cache misses show loading state even when stale data available
4. Backend queries Airtable sequentially for independent data
5. Lambda CPU-constrained at 256MB memory allocation

### Optimized Architecture

```
User Browser
    ↓
React App (Parallel API calls via Promise.all())
    ↓
Request Deduplicator (Global singleton, 1s window)
    ↓
Stale-While-Revalidate Cache (5min staleness threshold)
    ↓
API Gateway
    ↓
Lambda (512MB) → DynamoDB Cache (15min TTL)
    ↓
Parallel Airtable Queries (Promise.all() with rate limiting)
```

**Performance Improvements:**
1. Frontend parallel loading: 50-70% reduction in total load time
2. Request deduplication: Eliminates redundant API calls
3. Stale-while-revalidate: Instant perceived load time for cached data
4. Backend parallelization: 40-60% reduction in Airtable query time
5. Lambda memory increase: Faster execution with more CPU

## Components and Interfaces

### 1. Request Deduplicator (Frontend)

**Purpose**: Prevent duplicate simultaneous API requests across all components.

**Implementation**: Global singleton with in-flight request tracking.

```typescript
interface RequestKey {
  endpoint: string;
  params: Record<string, any>;
}

interface InFlightRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private inFlightRequests: Map<string, InFlightRequest>;
  private deduplicationWindow: number; // 1000ms
  
  async fetch(endpoint: string, params: Record<string, any>): Promise<any>;
  private generateKey(endpoint: string, params: Record<string, any>): string;
  private cleanupExpired(): void;
}
```

**Key Methods:**
- `fetch(endpoint, params)`: Execute or deduplicate request
- `generateKey(endpoint, params)`: Create unique key from endpoint + params
- `cleanupExpired()`: Remove requests older than deduplication window

**Deduplication Logic:**
1. Generate unique key from endpoint + serialized params
2. Check if key exists in in-flight requests map
3. If exists and within 1-second window: return existing promise
4. If not exists or expired: create new request, store promise, return promise
5. On completion: keep in map for deduplication window, then cleanup

### 2. Stale-While-Revalidate Cache (Frontend)

**Purpose**: Provide instant responses from cache while refreshing in background.

**Implementation**: Enhanced cache wrapper with staleness tracking.

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl: number;           // 15 minutes (900000ms)
  staleThreshold: number; // 5 minutes (300000ms)
}

class StaleWhileRevalidateCache {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>
  ): Promise<T>;
  
  private isStale(entry: CacheEntry<any>): boolean;
  private isExpired(entry: CacheEntry<any>): boolean;
  private backgroundRefresh<T>(key: string, fetcher: () => Promise<T>): void;
}
```

**Cache States:**
- **Fresh** (0-5 min): Return immediately, no refresh
- **Stale** (5-15 min): Return immediately, trigger background refresh
- **Expired** (>15 min): Show loading, fetch fresh data
- **Missing**: Show loading, fetch fresh data

**Refresh Logic:**
1. Check cache for key
2. If missing or expired: fetch with loading state
3. If stale: return cached data immediately, start background fetch
4. If fresh: return cached data immediately
5. Background fetch: update cache on completion, trigger UI update

### 3. Parallel API Loader (Frontend)

**Purpose**: Load multiple API endpoints simultaneously.

**Implementation**: Promise.all() wrapper with error handling.

```typescript
interface DashboardData {
  services: Service[];
  serviceKPIs: ServiceKPI[];
  evangelismStats: EvangelismStats;
  soulsAssigned: SoulAssignment[];
  followUpInteractions: FollowUpInteraction[];
}

class ParallelAPILoader {
  async loadDashboardData(serviceId?: string): Promise<DashboardData>;
  private handlePartialFailure<T>(results: PromiseSettledResult<T>[]): T[];
}
```

**Loading Pattern:**
```typescript
const [services, kpis, evangelism, souls, followUps] = await Promise.all([
  api.getServices(),
  serviceId ? api.getServiceKPIs(serviceId) : null,
  api.getEvangelismStats(),
  api.getSoulsAssigned(),
  api.getFollowUpInteractions()
]);
```

**Error Handling:**
- Use `Promise.allSettled()` to capture all results
- Extract successful results
- Log failed requests
- Return partial data rather than failing completely

### 4. Debounced Date Selector (Frontend)

**Purpose**: Auto-load data when user changes date filters with debouncing.

**Implementation**: React hook with debounce and cache invalidation.

```typescript
interface UseDebouncedDateFilterOptions {
  debounceMs: number; // 500ms
  onDateChange: (startDate: Date, endDate: Date) => Promise<void>;
}

function useDebouncedDateFilter(options: UseDebouncedDateFilterOptions) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounced effect that triggers data load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (startDate && endDate) {
        setIsLoading(true);
        cache.invalidateByDateRange(startDate, endDate);
        onDateChange(startDate, endDate).finally(() => setIsLoading(false));
      }
    }, options.debounceMs);
    
    return () => clearTimeout(timer);
  }, [startDate, endDate]);
  
  return { startDate, setStartDate, endDate, setEndDate, isLoading };
}
```

**Behavior:**
1. User changes date filter → cancel previous timer
2. Start new 500ms timer
3. Timer expires → invalidate cache for date range
4. Show loading state
5. Fetch data with new date filter
6. Hide loading state on completion

### 5. Parallel Airtable Query Executor (Backend)

**Purpose**: Execute independent Airtable queries in parallel with rate limiting.

**Implementation**: Promise.all() with rate limiter.

```typescript
interface AirtableRateLimiter {
  maxRequestsPerSecond: number; // 5
  requestQueue: Array<() => Promise<any>>;
  
  async execute<T>(query: () => Promise<T>): Promise<T>;
  private processQueue(): void;
}

class ParallelAirtableExecutor {
  private rateLimiter: AirtableRateLimiter;
  
  async executeServiceKPIQueries(serviceId: string): Promise<ServiceKPIData>;
  async executeDashboardQueries(): Promise<DashboardData>;
  async executeMemberJourneyQueries(memberId: string): Promise<MemberJourneyData>;
}
```

**Service KPI Query Pattern:**
```typescript
async executeServiceKPIQueries(serviceId: string) {
  const [attendance, members, departments] = await Promise.all([
    rateLimiter.execute(() => airtable.getAttendanceRecords(serviceId)),
    rateLimiter.execute(() => airtable.getMemberLookups(serviceId)),
    rateLimiter.execute(() => airtable.getDepartmentData(serviceId))
  ]);
  
  return { attendance, members, departments };
}
```

**Rate Limiting Strategy:**
1. Queue all parallel requests
2. Process queue at max 5 requests/second
3. Use token bucket algorithm for smooth rate limiting
4. Handle 429 errors with exponential backoff (1s, 2s, 4s)

### 6. Lambda Configuration (Infrastructure)

**Purpose**: Increase Lambda memory for better CPU allocation.

**Implementation**: CDK stack configuration update.

```typescript
// CDK Stack
const queryHandler = new lambda.Function(this, 'QueryHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  memorySize: 512, // Increased from 256MB
  timeout: Duration.seconds(30),
  environment: {
    DYNAMODB_TABLE: cacheTable.tableName,
    AIRTABLE_API_KEY: airtableApiKey.secretValue,
  }
});
```

**Memory-to-CPU Mapping:**
- 256MB: ~0.4 vCPU
- 512MB: ~0.8 vCPU (2x CPU power)

**Expected Impact:**
- Faster JavaScript execution
- Faster JSON parsing/serialization
- Reduced cold start time
- Better parallel processing performance

### 7. OpenAPI Documentation Generator

**Purpose**: Generate comprehensive API documentation.

**Implementation**: OpenAPI 3.0 specification with API Gateway integration.

```yaml
openapi: 3.0.0
info:
  title: Church Management API
  version: 1.0.0
  description: API for church management system with performance optimizations

servers:
  - url: https://api.example.com/prod
    description: Production
  - url: https://api.example.com/staging
    description: Staging
  - url: https://api.example.com/dev
    description: Development

components:
  securitySchemes:
    CognitoAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Service:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        date: { type: string, format: date-time }
        
    ServiceKPI:
      type: object
      properties:
        serviceId: { type: string }
        attendance: { type: integer }
        newVisitors: { type: integer }

paths:
  /query/services:
    get:
      summary: Get all services
      security:
        - CognitoAuth: []
      parameters:
        - name: startDate
          in: query
          schema: { type: string, format: date }
        - name: endDate
          in: query
          schema: { type: string, format: date }
      responses:
        200:
          description: List of services
          headers:
            Cache-Control:
              schema: { type: string }
              description: "max-age=900"
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Service'
        401:
          description: Unauthorized
        500:
          description: Internal server error
```

**Documentation Sections:**
- Authentication (Cognito JWT)
- All /query/* endpoints
- Request parameters (query, path, body)
- Response schemas
- Error responses (400, 401, 403, 404, 500)
- Cache headers
- Rate limiting info
- Example requests/responses

### 8. Postman Collection Builder

**Purpose**: Create comprehensive Postman collection with automated tests.

**Implementation**: Postman MCP integration for collection management.

```typescript
interface PostmanCollection {
  info: {
    name: string;
    description: string;
    schema: string;
  };
  item: PostmanFolder[];
  auth: PostmanAuth;
  event: PostmanEvent[];
}

interface PostmanFolder {
  name: string;
  item: PostmanRequest[];
}

interface PostmanRequest {
  name: string;
  request: {
    method: string;
    url: string;
    header: PostmanHeader[];
    body?: PostmanBody;
  };
  event: PostmanEvent[];
}
```

**Collection Structure:**
```
Church Management API - Performance Tests
├── Authentication
│   └── Get Cognito Token
├── Dashboard
│   ├── Get Services
│   ├── Get Service KPIs
│   ├── Get Evangelism Stats
│   ├── Get Souls Assigned
│   └── Get Follow-up Interactions
├── Attendance
│   ├── Get Attendance Records
│   └── Get Attendance by Member
├── Members
│   ├── Get All Members
│   ├── Get Member Details
│   └── Get Member Journey
├── Follow-up
│   ├── Get Follow-up Tasks
│   └── Get Follow-up Interactions
└── Admin
    ├── Get System Stats
    └── Get Cache Status
```

**Pre-request Script (Authentication):**
```javascript
// Get Cognito token
const tokenRequest = {
  url: pm.environment.get('COGNITO_TOKEN_URL'),
  method: 'POST',
  header: { 'Content-Type': 'application/x-amz-json-1.1' },
  body: {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: pm.environment.get('CLIENT_ID'),
    AuthParameters: {
      USERNAME: pm.environment.get('TEST_USER_EMAIL'),
      PASSWORD: pm.environment.get('TEST_USER_PASSWORD')
    }
  }
};

pm.sendRequest(tokenRequest, (err, response) => {
  const token = response.json().AuthenticationResult.IdToken;
  pm.environment.set('AUTH_TOKEN', token);
});
```

**Test Script (Performance Validation):**
```javascript
// Validate response time < 2s
pm.test('Response time is less than 2000ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});

// Validate status code
pm.test('Status code is 200', () => {
  pm.response.to.have.status(200);
});

// Validate response schema
const schema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'name', 'date'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      date: { type: 'string' }
    }
  }
};

pm.test('Response matches schema', () => {
  pm.response.to.have.jsonSchema(schema);
});

// Validate data integrity
pm.test('All records have valid IDs', () => {
  const data = pm.response.json();
  data.forEach(item => {
    pm.expect(item.id).to.be.a('string').and.not.empty;
  });
});
```

**Environment Variables:**
```json
{
  "dev": {
    "API_URL": "https://dev-api.example.com",
    "USER_POOL_ID": "us-east-1_xxxxx",
    "CLIENT_ID": "xxxxx",
    "TEST_USER_EMAIL": "test@example.com",
    "TEST_USER_PASSWORD": "{{vault:dev-password}}"
  },
  "staging": {
    "API_URL": "https://staging-api.example.com",
    "USER_POOL_ID": "us-east-1_yyyyy",
    "CLIENT_ID": "yyyyy",
    "TEST_USER_EMAIL": "test@example.com",
    "TEST_USER_PASSWORD": "{{vault:staging-password}}"
  },
  "prod": {
    "API_URL": "https://api.example.com",
    "USER_POOL_ID": "us-east-1_zzzzz",
    "CLIENT_ID": "zzzzz",
    "TEST_USER_EMAIL": "test@example.com",
    "TEST_USER_PASSWORD": "{{vault:prod-password}}"
  }
}
```

## Data Models

### Cache Entry Model

```typescript
interface CacheEntry<T> {
  key: string;           // Unique cache key
  data: T;               // Cached data
  timestamp: number;     // Creation timestamp (ms)
  expiresAt: number;     // Expiration timestamp (ms)
  version: string;       // Cache version for invalidation
}
```

### Request Deduplication Model

```typescript
interface RequestKey {
  endpoint: string;                    // API endpoint path
  params: Record<string, any>;         // Query/body parameters
}

interface InFlightRequest {
  promise: Promise<any>;               // Shared promise
  timestamp: number;                   // Request start time
  subscribers: number;                 // Number of waiting callers
}

interface DeduplicationMetrics {
  totalRequests: number;               // Total requests received
  deduplicatedRequests: number;        // Requests deduplicated
  savingsPercent: number;              // Percentage saved
}
```

### Airtable Query Model

```typescript
interface AirtableQuery {
  table: string;                       // Airtable table name
  filterByFormula?: string;            // Airtable filter formula
  fields?: string[];                   // Fields to retrieve
  sort?: Array<{field: string, direction: 'asc' | 'desc'}>;
  maxRecords?: number;
}

interface AirtableQueryResult<T> {
  records: T[];
  offset?: string;                     // Pagination offset
}

interface RateLimitState {
  requestsInWindow: number;            // Requests in current second
  windowStart: number;                 // Window start timestamp
  queuedRequests: number;              // Requests waiting in queue
}
```

### Performance Metrics Model

```typescript
interface PerformanceMetrics {
  endpoint: string;
  responseTime: number;                // Response time in ms
  cacheHit: boolean;                   // Whether cache was hit
  deduplicationSaved: boolean;         // Whether request was deduplicated
  airtableQueriesCount: number;        // Number of Airtable queries
  airtableQueriesParallel: boolean;    // Whether queries ran in parallel
  timestamp: number;
}

interface AggregatedMetrics {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  deduplicationRate: number;
  totalRequests: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

**Redundant Properties Eliminated:**
- **1.2** (parallel execution without waiting) is redundant with **1.1** (parallel execution using Promise.all)
- **2.5** (correct response delivery) is redundant with **2.2** (result sharing)
- **10.2** (preserve formats) and **10.3** (frontend compatibility) are redundant with **10.1** (maintain API contracts)
- **10.5** (no frontend changes) is redundant with **10.1** (maintain API contracts)
- **11.2** (rate limiting with parallel queries) is redundant with **11.1** (rate limit compliance)
- **9.5** (performance within free tier) is redundant with **9.1** (p95 response time)

**Properties Combined:**
- **8.3, 8.4, 8.5, 8.6** (various test script validations) can be combined into a single comprehensive property about test script completeness

The remaining properties provide unique validation value and will be implemented as property-based tests.

### Property 1: Parallel API Execution Timing

*For any* set of independent API calls, when executed in parallel using Promise.all(), all calls should start within 50 milliseconds of each other, demonstrating true concurrent execution rather than sequential processing.

**Validates: Requirements 1.1**

### Property 2: Parallel Execution Performance Gain

*For any* set of API calls with known response times, parallel execution should complete in at most 60% of the time required for sequential execution (at least 40% faster), demonstrating the performance benefit of parallelization.

**Validates: Requirements 1.3**

### Property 3: Partial Failure Resilience

*For any* set of parallel API calls where some succeed and some fail, the system should return all successful results without being blocked by failures, ensuring partial availability.

**Validates: Requirements 1.4, 4.5**

### Property 4: Request Deduplication Effectiveness

*For any* endpoint and parameter combination, when multiple identical requests are made within a 1-second window, only one actual API call should be executed, with all callers receiving the same result.

**Validates: Requirements 2.1, 2.2**

### Property 5: Deduplication Window Expiration

*For any* endpoint and parameter combination, when identical requests are made more than 1 second apart, each request should result in a separate API call, demonstrating that deduplication expires correctly.

**Validates: Requirements 2.3**

### Property 6: Fresh Cache Immediate Return

*For any* cached data with timestamp less than 5 minutes old, the cache should return the data immediately without initiating a fetch request, demonstrating fresh cache hit behavior.

**Validates: Requirements 3.1**

### Property 7: Stale Cache Background Refresh

*For any* cached data with timestamp between 5 and 15 minutes old, the cache should return the stale data immediately AND initiate a background refresh request, demonstrating stale-while-revalidate behavior.

**Validates: Requirements 3.2**

### Property 8: Expired Cache Fresh Fetch

*For any* cached data with timestamp greater than 15 minutes old, the cache should treat it as expired and initiate a fresh fetch rather than returning stale data, demonstrating cache expiration behavior.

**Validates: Requirements 3.4**

### Property 9: Backend Parallel Query Performance

*For any* set of independent Airtable queries, parallel execution should complete in at most 70% of the time required for sequential execution (at least 30% faster), demonstrating backend parallelization benefits.

**Validates: Requirements 4.4**

### Property 10: Debounce Timing Accuracy

*For any* sequence of date filter changes, the system should wait exactly 500 milliseconds after the last change before initiating a data fetch, demonstrating correct debounce timing.

**Validates: Requirements 6.1**

### Property 11: Debounce Cancellation

*For any* sequence of rapid date filter changes within 500ms, only one fetch should occur for the final value, with all intermediate pending requests cancelled, demonstrating debounce cancellation behavior.

**Validates: Requirements 6.2**

### Property 12: Cache Invalidation on Date Change

*For any* date filter change, the system should invalidate all cached data associated with the previous date selection before fetching new data, ensuring fresh data for new date ranges.

**Validates: Requirements 6.4**

### Property 13: OpenAPI Endpoint Coverage

*For all* actual API endpoints matching the pattern /query/*, the OpenAPI specification should contain a corresponding path definition with request parameters and response schemas, demonstrating complete documentation coverage.

**Validates: Requirements 7.2**

### Property 14: OpenAPI Error Response Completeness

*For all* endpoints in the OpenAPI specification, each endpoint should document error responses for status codes 400, 401, 403, 404, and 500, demonstrating comprehensive error documentation.

**Validates: Requirements 7.4**

### Property 15: OpenAPI Example Completeness

*For all* endpoints in the OpenAPI specification, each endpoint should include at least one example request and one example response, demonstrating complete example coverage.

**Validates: Requirements 7.7**

### Property 16: Postman Test Script Completeness

*For all* requests in the Postman collection, each request should include test scripts that validate: (1) response time < 2s, (2) HTTP status code, (3) response schema, and (4) data integrity, demonstrating comprehensive test coverage.

**Validates: Requirements 8.3, 8.4, 8.5, 8.6**

### Property 17: Postman Environment Variable Usage

*For all* requests in the Postman collection, each request URL and authentication header should reference environment variables rather than hardcoded values, demonstrating proper environment configuration.

**Validates: Requirements 8.8**

### Property 18: Postman Example Schema Accuracy

*For all* example responses in the Postman collection, each example should match the actual Airtable schema structure for the corresponding resource, demonstrating accurate documentation.

**Validates: Requirements 8.9**

### Property 19: P95 Response Time Target

*For any* load test with 500 concurrent users making requests to /query/* endpoints, the 95th percentile response time should be less than 2000 milliseconds, demonstrating performance target achievement.

**Validates: Requirements 9.1, 9.2**

### Property 20: Cache Hit Performance

*For any* request that results in a cache hit, the response time should be less than 200 milliseconds, demonstrating fast cache performance.

**Validates: Requirements 9.3**

### Property 21: Cache Miss Performance

*For any* request that results in a cache miss requiring Airtable queries, the response time should be less than 2000 milliseconds, demonstrating acceptable performance even without cache.

**Validates: Requirements 9.4**

### Property 22: API Contract Stability

*For all* API endpoints, the request schema (parameters, body structure) and response schema (field names, types, structure) should remain identical before and after optimization, demonstrating backward compatibility.

**Validates: Requirements 10.1**

### Property 23: Airtable Rate Limit Compliance

*For any* sequence of Airtable API calls over a 10-second period, the average rate should not exceed 5 requests per second, demonstrating rate limit compliance.

**Validates: Requirements 11.1**

### Property 24: Request Queueing Under Load

*For any* burst of Airtable requests exceeding 5 per second, requests should be queued rather than rejected, with all requests eventually completing successfully, demonstrating queue-based rate limiting.

**Validates: Requirements 11.3**

### Property 25: Exponential Backoff Retry

*For any* Airtable API call that receives a 429 rate limit error, the system should retry with exponentially increasing delays (1s, 2s, 4s, 8s), demonstrating proper retry logic.

**Validates: Requirements 11.4**

## Error Handling

### Frontend Error Handling

**Request Deduplication Errors:**
- If the original request fails, all waiting callers receive the same error
- Error is cached for the deduplication window to prevent retry storms
- After window expires, new requests can retry

**Cache Errors:**
- If background refresh fails, stale data remains in cache
- User sees stale data with no error (graceful degradation)
- Next request will retry the refresh
- If cache read fails, fall back to direct API call

**Parallel Loading Errors:**
- Use Promise.allSettled() to capture all results
- Extract successful results and display partial data
- Log failed requests for monitoring
- Show error indicators for failed sections only
- Don't block entire dashboard on single endpoint failure

**Debounce Errors:**
- If debounced fetch fails, show error message
- Clear loading state
- Allow user to retry manually
- Don't invalidate cache on error (keep previous data)

### Backend Error Handling

**Airtable Query Errors:**
- Catch individual query failures in parallel execution
- Return partial results for successful queries
- Include error details in response for failed queries
- Log errors with context (query, parameters, error message)

**Rate Limit Errors (429):**
- Implement exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 retries before failing
- Queue requests when approaching rate limit
- Return 503 Service Unavailable if queue is full

**DynamoDB Cache Errors:**
- If cache read fails, fall back to Airtable query
- If cache write fails, log error but return data to client
- Don't fail request due to cache issues (cache is optimization, not requirement)

**Lambda Timeout:**
- Set 30-second timeout
- If approaching timeout, return partial results
- Log timeout warnings for monitoring

**Authentication Errors:**
- Return 401 Unauthorized for invalid/expired tokens
- Include error message indicating token refresh needed
- Don't cache 401 responses

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Error code (e.g., "RATE_LIMIT_EXCEEDED")
    message: string;        // Human-readable error message
    details?: any;          // Additional error context
    retryAfter?: number;    // Seconds to wait before retry (for 429)
  };
  partial?: any;            // Partial results if available
  timestamp: number;        // Error timestamp
}
```

## Testing Strategy

### Dual Testing Approach

This project requires both **unit tests** and **property-based tests** for comprehensive coverage:

- **Unit tests**: Validate specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs through randomization

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide input space.

### Property-Based Testing Configuration

**Library Selection:**
- **Frontend (TypeScript)**: Use `fast-check` library for property-based testing
- **Backend (Node.js)**: Use `fast-check` library for property-based testing

**Test Configuration:**
- Each property test MUST run minimum 100 iterations (due to randomization)
- Each test MUST include a comment tag referencing the design property
- Tag format: `// Feature: api-performance-optimization, Property {number}: {property_text}`

**Example Property Test:**

```typescript
import fc from 'fast-check';

// Feature: api-performance-optimization, Property 1: Parallel API Execution Timing
test('parallel API calls start within 50ms of each other', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.string(), { minLength: 2, maxLength: 10 }), // Random API endpoints
      async (endpoints) => {
        const startTimes: number[] = [];
        
        const calls = endpoints.map(endpoint => {
          return async () => {
            startTimes.push(Date.now());
            return mockApiCall(endpoint);
          };
        });
        
        await Promise.all(calls.map(call => call()));
        
        const minStart = Math.min(...startTimes);
        const maxStart = Math.max(...startTimes);
        const timeDiff = maxStart - minStart;
        
        expect(timeDiff).toBeLessThan(50);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus Areas

**Specific Examples:**
- Dashboard loads with 5 specific endpoints
- Service KPI query with known service ID
- Date filter change from 2024-01-01 to 2024-01-31

**Edge Cases:**
- Empty cache (cache miss scenario)
- Single API call (no parallelization needed)
- All parallel requests fail
- Airtable returns empty results
- Date filter with same start and end date

**Error Conditions:**
- Network timeout during API call
- Airtable returns 429 rate limit error
- Invalid authentication token
- Malformed response from Airtable
- DynamoDB cache unavailable

**Integration Points:**
- Request deduplicator integrates with cache layer
- Cache layer integrates with API client
- Debounce hook integrates with cache invalidation
- Rate limiter integrates with Airtable client

### Testing Tools and Frameworks

**Frontend Testing:**
- **Framework**: Vitest
- **Property Testing**: fast-check
- **React Testing**: @testing-library/react
- **Mocking**: vi.mock() for API calls
- **Performance**: performance.now() for timing measurements

**Backend Testing:**
- **Framework**: Jest (with --runInBand flag to reduce memory usage)
- **Property Testing**: fast-check
- **Mocking**: Mock Airtable API responses
- **AWS Mocking**: aws-sdk-mock for DynamoDB
- **Load Testing**: Artillery or k6 for 500 concurrent user tests
- **Test Command**: `npm test -- --runInBand` for all backend tests

**API Testing:**
- **Postman**: Collection with automated test scripts
- **Load Testing**: Postman Collection Runner for concurrent execution
- **Monitoring**: CloudWatch metrics for production validation

### Test Coverage Goals

- **Unit Test Coverage**: >80% line coverage for core logic
- **Property Test Coverage**: All 25 correctness properties implemented
- **Integration Test Coverage**: All critical paths (dashboard load, date filter, cache flow)
- **Performance Test Coverage**: All /query/* endpoints under load
- **Error Scenario Coverage**: All error handling paths tested

### Continuous Testing

**Pre-commit:**
- Run unit tests
- Run property tests (100 iterations each)
- Lint and type check

**CI/CD Pipeline:**
- Run full test suite
- Run property tests with 1000 iterations
- Run integration tests against staging
- Run load tests (500 concurrent users)
- Validate OpenAPI spec
- Validate Postman collection

**Production Monitoring:**
- CloudWatch metrics for response times
- Alarm for p95 > 2 seconds
- Alarm for error rate > 1%
- Dashboard for cache hit rate
- Dashboard for deduplication rate

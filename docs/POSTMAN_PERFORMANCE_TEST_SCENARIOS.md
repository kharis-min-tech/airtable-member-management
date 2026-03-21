# Postman Performance Test Scenarios

## Overview

This document provides comprehensive instructions for running performance tests on the Church Management API using Postman's Collection Runner. The tests are designed to validate that the API meets the performance target of <2 seconds response time at the 95th percentile while supporting 500 concurrent users.

## Performance Test Configuration

### Collection Runner Settings

The Postman collection includes pre-configured performance test scenarios that can be executed using the Collection Runner with the following settings:

**Target Performance Metrics:**
- **Response Time**: <2 seconds at p95 (95th percentile)
- **Concurrent Users**: 500 users
- **Success Rate**: >99% (error rate <1%)
- **Cache Hit Performance**: <200ms
- **Cache Miss Performance**: <2000ms

## Test Scenarios

### Scenario 1: Dashboard Load Test (Recommended Starting Point)

**Purpose**: Validate parallel loading performance for the main dashboard with all data endpoints.

**Configuration:**
- **Iterations**: 100 per virtual user
- **Delay**: 0ms between requests (maximum load)
- **Virtual Users**: Start with 10, scale to 500
- **Duration**: 5 minutes per test run
- **Requests Included**:
  - Get Services
  - Get Evangelism Stats
  - Get Follow-up Assignments
  - Get Follow-up Interactions

**How to Run:**
1. Open Postman and navigate to "Church Management API" workspace
2. Select "Church Management API - Performance Tests" collection
3. Click "Run" button to open Collection Runner
4. Select "Dashboard" folder
5. Configure settings:
   - Iterations: `100`
   - Delay: `0` ms
   - Data: None (uses environment variables)
6. Select environment: "Development" or "Staging" (NOT Production for load testing)
7. Click "Run Church Management API - Performance Tests"
8. Monitor results in real-time

**Expected Results:**
- Average response time: <1500ms
- p95 response time: <2000ms
- p99 response time: <2500ms
- Success rate: >99%

**Scaling Instructions:**
To simulate 500 concurrent users, use Postman CLI (Newman) with parallel execution:
```bash
# Install Newman if not already installed
npm install -g newman

# Run with 500 parallel workers (requires Newman 6.0+)
newman run collection.json \
  -e environment.json \
  --iteration-count 100 \
  --delay-request 0 \
  --reporters cli,json \
  --reporter-json-export results.json \
  --parallel 500
```

### Scenario 2: Member Journey Load Test

**Purpose**: Test performance of member-specific queries with parallel Airtable execution.

**Configuration:**
- **Iterations**: 50 per virtual user
- **Delay**: 100ms between requests (realistic user behavior)
- **Virtual Users**: 100
- **Duration**: 3 minutes
- **Requests Included**:
  - Search Members
  - Get Member Details
  - Get Member Journey

**How to Run:**
1. Open Collection Runner
2. Select "Members" folder
3. Configure settings:
   - Iterations: `50`
   - Delay: `100` ms
4. Select environment: "Development" or "Staging"
5. Click "Run"

**Expected Results:**
- Average response time: <1200ms
- p95 response time: <2000ms
- Cache hit rate: >60% (after warm-up)
- Success rate: >99%

### Scenario 3: Mixed Workload Test

**Purpose**: Simulate realistic production traffic with mixed request types.

**Configuration:**
- **Iterations**: 200 per virtual user
- **Delay**: 50ms between requests
- **Virtual Users**: 250
- **Duration**: 10 minutes
- **Requests Included**: All folders (Dashboard, Attendance, Members, Follow-up, Admin)

**How to Run:**
1. Open Collection Runner
2. Select entire collection (all folders)
3. Configure settings:
   - Iterations: `200`
   - Delay: `50` ms
4. Select environment: "Development" or "Staging"
5. Click "Run"

**Expected Results:**
- Average response time: <1500ms
- p95 response time: <2000ms
- Cache hit rate: >70% (after warm-up)
- Success rate: >99%
- Request deduplication rate: >20%

### Scenario 4: Cache Performance Test

**Purpose**: Validate cache hit and miss performance targets.

**Configuration:**
- **Phase 1 - Cache Warm-up**:
  - Iterations: 10
  - Delay: 0ms
  - Virtual Users: 1
  
- **Phase 2 - Cache Hit Test**:
  - Iterations: 100
  - Delay: 0ms
  - Virtual Users: 50
  - Expected: <200ms response time

- **Phase 3 - Cache Miss Test** (after 15 min wait):
  - Iterations: 50
  - Delay: 0ms
  - Virtual Users: 50
  - Expected: <2000ms response time

**How to Run:**
1. **Phase 1**: Run Dashboard folder with 10 iterations, 1 user
2. Wait 1 minute for cache to stabilize
3. **Phase 2**: Run Dashboard folder with 100 iterations, 50 users immediately
4. Verify average response time <200ms (cache hits)
5. Wait 16 minutes for cache to expire
6. **Phase 3**: Run Dashboard folder with 50 iterations, 50 users
7. Verify average response time <2000ms (cache misses)

**Expected Results:**
- Phase 2 (Cache Hits): <200ms average, <250ms p95
- Phase 3 (Cache Misses): <1800ms average, <2000ms p95

### Scenario 5: Stress Test (Maximum Capacity)

**Purpose**: Determine system breaking point and validate graceful degradation.

**Configuration:**
- **Iterations**: 500 per virtual user
- **Delay**: 0ms (maximum stress)
- **Virtual Users**: Gradually increase from 100 to 1000
- **Duration**: 15 minutes
- **Requests Included**: Dashboard folder (highest load)

**How to Run:**
Using Newman CLI for high concurrency:
```bash
# Start with 100 users
newman run collection.json -e environment.json \
  --iteration-count 500 --delay-request 0 --parallel 100

# Increase to 250 users
newman run collection.json -e environment.json \
  --iteration-count 500 --delay-request 0 --parallel 250

# Increase to 500 users (target)
newman run collection.json -e environment.json \
  --iteration-count 500 --delay-request 0 --parallel 500

# Increase to 750 users (stress)
newman run collection.json -e environment.json \
  --iteration-count 500 --delay-request 0 --parallel 750

# Increase to 1000 users (breaking point)
newman run collection.json -e environment.json \
  --iteration-count 500 --delay-request 0 --parallel 1000
```

**Expected Results:**
- 100 users: <1500ms p95, >99% success
- 250 users: <1800ms p95, >99% success
- 500 users: <2000ms p95, >99% success (target met)
- 750 users: <2500ms p95, >98% success (graceful degradation)
- 1000 users: <3000ms p95, >95% success (system limit)

## Performance Assertions

All requests in the collection include the following test scripts:

### 1. Response Time Validation
```javascript
pm.test('Response time is less than 2000ms', () => {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

### 2. Status Code Validation
```javascript
pm.test('Status code is 200', () => {
  pm.response.to.have.status(200);
});
```

### 3. Response Schema Validation
```javascript
pm.test('Response matches schema', () => {
  const schema = {
    type: 'object',
    required: ['success', 'data', 'timestamp'],
    properties: {
      success: { type: 'boolean' },
      data: { type: ['object', 'array'] },
      timestamp: { type: 'string' }
    }
  };
  pm.response.to.have.jsonSchema(schema);
});
```

### 4. Data Integrity Validation
```javascript
pm.test('Response data is valid', () => {
  const response = pm.response.json();
  pm.expect(response.success).to.be.true;
  pm.expect(response.data).to.exist;
});
```

## Running Tests with Newman CLI

### Installation

```bash
# Install Newman globally
npm install -g newman

# Install HTML reporter (optional)
npm install -g newman-reporter-html
```

### Export Collection and Environment

1. In Postman, open the collection
2. Click "..." → "Export" → Save as `collection.json`
3. Open environment → "..." → "Export" → Save as `environment.json`

### Basic Test Run

```bash
newman run collection.json \
  -e environment.json \
  --iteration-count 100 \
  --delay-request 0 \
  --reporters cli,json,html \
  --reporter-json-export results.json \
  --reporter-html-export report.html
```

### Parallel Execution (500 Concurrent Users)

```bash
# Requires Newman 6.0+ with parallel support
newman run collection.json \
  -e environment.json \
  --iteration-count 100 \
  --delay-request 0 \
  --parallel 500 \
  --reporters cli,json,html \
  --reporter-json-export results-500users.json \
  --reporter-html-export report-500users.html
```

### Continuous Performance Testing

```bash
# Run performance test every hour
while true; do
  echo "Starting performance test at $(date)"
  newman run collection.json \
    -e environment.json \
    --iteration-count 50 \
    --delay-request 100 \
    --parallel 100 \
    --reporters json \
    --reporter-json-export "results-$(date +%Y%m%d-%H%M%S).json"
  
  echo "Test complete. Waiting 1 hour..."
  sleep 3600
done
```

## Analyzing Results

### Key Metrics to Monitor

1. **Response Time Statistics**:
   - Average (mean)
   - Median (p50)
   - 95th percentile (p95) - PRIMARY TARGET
   - 99th percentile (p99)
   - Maximum

2. **Success Rate**:
   - Total requests
   - Successful requests (2xx status)
   - Failed requests (4xx, 5xx status)
   - Error rate percentage

3. **Performance Breakdown**:
   - DNS lookup time
   - TCP connection time
   - TLS handshake time
   - Time to first byte (TTFB)
   - Content download time

### Newman JSON Report Analysis

```javascript
// Example: Parse Newman JSON report
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('results.json'));

// Calculate p95 response time
const responseTimes = results.run.executions
  .map(e => e.response.responseTime)
  .sort((a, b) => a - b);
const p95Index = Math.floor(responseTimes.length * 0.95);
const p95ResponseTime = responseTimes[p95Index];

console.log(`P95 Response Time: ${p95ResponseTime}ms`);
console.log(`Target Met: ${p95ResponseTime < 2000 ? 'YES' : 'NO'}`);

// Calculate success rate
const totalRequests = results.run.stats.requests.total;
const failedRequests = results.run.stats.requests.failed;
const successRate = ((totalRequests - failedRequests) / totalRequests) * 100;

console.log(`Success Rate: ${successRate.toFixed(2)}%`);
console.log(`Target Met: ${successRate > 99 ? 'YES' : 'NO'}`);
```

### HTML Report

The HTML report provides:
- Visual charts of response times
- Request/response details
- Test pass/fail summary
- Timeline view of execution
- Error details and stack traces

Open `report.html` in a browser to view the interactive report.

## Performance Test Checklist

Before running performance tests:

- [ ] Verify environment variables are configured correctly
- [ ] Ensure test user credentials are valid
- [ ] Confirm API endpoints are accessible
- [ ] Check that you're using Development or Staging environment (NOT Production)
- [ ] Verify sufficient system resources (CPU, memory, network)
- [ ] Clear any local caches or cookies
- [ ] Close unnecessary applications to free resources

During performance tests:

- [ ] Monitor response times in real-time
- [ ] Watch for error rate increases
- [ ] Check system resource utilization
- [ ] Observe cache hit rates
- [ ] Note any timeout errors
- [ ] Monitor backend logs (CloudWatch)

After performance tests:

- [ ] Analyze Newman JSON report
- [ ] Review HTML report for failures
- [ ] Calculate p95 response time
- [ ] Verify success rate >99%
- [ ] Compare results against baseline
- [ ] Document any performance regressions
- [ ] Create tickets for issues found

## Troubleshooting

### High Response Times

**Symptoms**: Response times >2000ms at p95

**Possible Causes**:
- Cache not warming up properly
- Airtable rate limiting (429 errors)
- Lambda cold starts
- Network latency
- Insufficient Lambda memory

**Solutions**:
1. Run cache warm-up phase first (10 iterations, 1 user)
2. Check for 429 errors in responses
3. Increase Lambda memory to 512MB (already done in Task 9)
4. Reduce concurrent users to stay within rate limits
5. Add delay between requests (50-100ms)

### High Error Rate

**Symptoms**: Success rate <99%

**Possible Causes**:
- Authentication token expiration
- Rate limiting
- Invalid request parameters
- Backend service errors

**Solutions**:
1. Verify pre-request script is obtaining fresh tokens
2. Check environment variables are correct
3. Review error responses in Newman report
4. Reduce load to identify breaking point
5. Check backend logs for errors

### Newman Parallel Execution Issues

**Symptoms**: Newman parallel flag not working

**Possible Causes**:
- Newman version <6.0
- Insufficient system resources
- OS limitations on concurrent connections

**Solutions**:
1. Update Newman: `npm install -g newman@latest`
2. Reduce parallel workers: `--parallel 250` instead of 500
3. Use multiple Newman instances instead of single parallel run
4. Run tests on more powerful machine or cloud instance

### Collection Runner Limitations

**Symptoms**: Cannot simulate 500 concurrent users in Postman UI

**Explanation**: Postman Collection Runner is limited to sequential execution with configurable delays. True concurrent load testing requires Newman CLI with parallel execution or dedicated load testing tools.

**Solution**: Use Newman CLI with `--parallel` flag as documented above.

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: API Performance Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Run every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  performance-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Newman
        run: |
          npm install -g newman
          npm install -g newman-reporter-html
      
      - name: Run Performance Tests
        run: |
          newman run collection.json \
            -e environment.json \
            --iteration-count 100 \
            --delay-request 0 \
            --parallel 500 \
            --reporters cli,json,html \
            --reporter-json-export results.json \
            --reporter-html-export report.html
        env:
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      
      - name: Analyze Results
        run: |
          node analyze-results.js results.json
      
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: |
            results.json
            report.html
      
      - name: Check Performance Targets
        run: |
          # Fail if p95 > 2000ms or success rate < 99%
          node check-performance-targets.js results.json
```

## Best Practices

1. **Start Small**: Begin with 10-50 users, then scale up gradually
2. **Warm Up Cache**: Run initial requests to populate cache before measuring
3. **Use Realistic Delays**: Add 50-100ms delays to simulate real user behavior
4. **Test Off-Peak**: Run load tests during low-traffic periods
5. **Monitor Backend**: Watch CloudWatch metrics during tests
6. **Document Baseline**: Record initial performance for comparison
7. **Test Incrementally**: Test after each optimization to measure impact
8. **Use Staging**: Never run load tests against production
9. **Analyze Failures**: Investigate all errors, not just response times
10. **Automate Testing**: Integrate performance tests into CI/CD pipeline

## Performance Target Summary

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| P95 Response Time | <2000ms | Newman JSON report analysis |
| Concurrent Users | 500 | Newman parallel execution |
| Success Rate | >99% | (Total - Failed) / Total |
| Cache Hit Performance | <200ms | Requests within 5 min of cache |
| Cache Miss Performance | <2000ms | Requests after 15 min cache expiry |
| Error Rate | <1% | Failed / Total requests |

## Additional Resources

- [Postman Collection Runner Documentation](https://learning.postman.com/docs/running-collections/intro-to-collection-runs/)
- [Newman CLI Documentation](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/)
- [Newman Parallel Execution](https://github.com/postmanlabs/newman#parallel-collection-runs)
- [Performance Testing Best Practices](https://learning.postman.com/docs/running-collections/performance-testing/)

## Support

For issues or questions about performance testing:
1. Review this documentation
2. Check Newman CLI output for errors
3. Analyze HTML report for failure details
4. Review backend CloudWatch logs
5. Contact the development team with results.json attached

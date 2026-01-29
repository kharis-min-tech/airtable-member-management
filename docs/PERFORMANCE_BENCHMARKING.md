# Performance Benchmarking Guide

This document explains how to run performance benchmarks for the API Performance Optimization project.

## Overview

Performance benchmarks must be run against **deployed infrastructure** to get accurate measurements. Mock tests with simulated delays don't provide real performance data.

## Prerequisites

1. **Deployed Environment**: Deploy the optimized code to a test environment (dev or staging)
2. **Postman Collection**: Use the Postman collection created in tasks 13-18
3. **Newman CLI**: Install Newman for command-line test execution
   ```bash
   npm install -g newman
   ```

## Running Performance Benchmarks

### Option 1: Postman Collection Runner (GUI)

1. Open Postman
2. Import the collection: `Church Management API - Performance Tests`
3. Select the collection and click "Run"
4. Configure:
   - **Iterations**: 1 (for single user test)
   - **Delay**: 0ms
   - **Environment**: Select `dev`, `staging`, or `prod`
5. Click "Run Church Management API - Performance Tests"
6. Review results:
   - Response times for each endpoint
   - Test pass/fail status
   - Performance assertions (<2s response time)

### Option 2: Newman CLI (Automated)

#### Single User Test
```bash
newman run postman-collection.json \
  -e postman-environment-dev.json \
  --reporters cli,json \
  --reporter-json-export results-single-user.json
```

#### Load Test (500 Concurrent Users)
```bash
# Run 500 iterations with 10 parallel workers
newman run postman-collection.json \
  -e postman-environment-dev.json \
  -n 500 \
  --parallel 10 \
  --reporters cli,json,htmlextra \
  --reporter-json-export results-load-test.json \
  --reporter-htmlextra-export results-load-test.html
```

**Note**: Newman doesn't natively support true concurrent users. For real load testing, use Artillery or k6 (see Option 3).

### Option 3: Artillery Load Testing (Recommended)

Artillery provides true concurrent user simulation.

#### Install Artillery
```bash
npm install -g artillery
```

#### Create Artillery Config (`artillery-config.yml`)
```yaml
config:
  target: "https://your-api-gateway-url.amazonaws.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up to 500 concurrent users"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load - 500 concurrent users"
  processor: "./artillery-auth.js"
  
scenarios:
  - name: "Dashboard Load Test"
    flow:
      - function: "getCognitoToken"
      - get:
          url: "/query/dashboard?type=services"
          headers:
            Authorization: "Bearer {{ token }}"
          expect:
            - statusCode: 200
            - contentType: json
      - get:
          url: "/query/dashboard?type=kpis&serviceId={{ serviceId }}"
          headers:
            Authorization: "Bearer {{ token }}"
          expect:
            - statusCode: 200
      - get:
          url: "/query/dashboard?type=evangelism&period=week"
          headers:
            Authorization: "Bearer {{ token }}"
          expect:
            - statusCode: 200
```

#### Run Artillery Test
```bash
artillery run artillery-config.yml --output results-artillery.json
artillery report results-artillery.json --output results-artillery.html
```

### Option 4: k6 Load Testing

k6 is another excellent load testing tool with better scripting capabilities.

#### Install k6
```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Create k6 Script (`k6-load-test.js`)
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests must complete below 2s
    'errors': ['rate<0.01'],             // Error rate must be below 1%
  },
};

const API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com';
const TOKEN = 'your-cognito-token'; // Get from Cognito

export default function () {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test dashboard endpoints
  const responses = http.batch([
    ['GET', `${API_BASE_URL}/query/dashboard?type=services`, null, { headers }],
    ['GET', `${API_BASE_URL}/query/dashboard?type=evangelism&period=week`, null, { headers }],
    ['GET', `${API_BASE_URL}/query/follow-up?type=souls-by-member`, null, { headers }],
  ]);

  responses.forEach((res) => {
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!success);
  });

  sleep(1);
}
```

#### Run k6 Test
```bash
k6 run k6-load-test.js
```

## Performance Metrics to Collect

### Response Time Metrics
- **Average Response Time**: Mean response time across all requests
- **P50 (Median)**: 50th percentile response time
- **P95**: 95th percentile response time (target: <2000ms)
- **P99**: 99th percentile response time
- **Max Response Time**: Slowest request

### Throughput Metrics
- **Requests per Second**: Total requests handled per second
- **Concurrent Users**: Number of simultaneous users supported
- **Error Rate**: Percentage of failed requests (target: <1%)

### Cache Metrics
- **Cache Hit Rate**: Percentage of requests served from cache
- **Cache Hit Response Time**: Average response time for cache hits (target: <200ms)
- **Cache Miss Response Time**: Average response time for cache misses (target: <2000ms)

### Infrastructure Metrics (CloudWatch)
- **Lambda Duration**: Execution time for Lambda functions
- **Lambda Concurrent Executions**: Number of concurrent Lambda invocations
- **DynamoDB Read/Write Capacity**: Cache table utilization
- **API Gateway Latency**: Time spent in API Gateway
- **4XX/5XX Errors**: Client and server error rates

## Baseline vs Optimized Comparison

### Before Optimization (Baseline)
Run benchmarks **before** deploying optimizations:
```bash
# Tag baseline results
newman run postman-collection.json -e env.json --reporters json \
  --reporter-json-export baseline-results.json
```

### After Optimization
Run benchmarks **after** deploying optimizations:
```bash
# Tag optimized results
newman run postman-collection.json -e env.json --reporters json \
  --reporter-json-export optimized-results.json
```

### Compare Results
```bash
# Use a comparison script or manually compare:
# - Average response time reduction
# - P95 response time improvement
# - Error rate changes
# - Throughput improvements
```

## Success Criteria

Task 21 is complete when:

✅ **P95 Response Time**: <2000ms for all `/query/*` endpoints under 500 concurrent users  
✅ **Cache Hit Performance**: <200ms average response time  
✅ **Cache Miss Performance**: <2000ms average response time  
✅ **Error Rate**: <1% under load  
✅ **Concurrent User Support**: 500 users without degradation  

## CloudWatch Monitoring

After deployment, monitor these CloudWatch metrics:

1. **Create CloudWatch Dashboard**:
   - API Gateway latency
   - Lambda duration (p50, p95, p99)
   - DynamoDB cache hit rate
   - Error rates (4XX, 5XX)

2. **Set Up Alarms**:
   ```bash
   # P95 response time alarm
   aws cloudwatch put-metric-alarm \
     --alarm-name api-p95-response-time \
     --metric-name Duration \
     --namespace AWS/Lambda \
     --statistic p95 \
     --period 300 \
     --threshold 2000 \
     --comparison-operator GreaterThanThreshold
   
   # Error rate alarm
   aws cloudwatch put-metric-alarm \
     --alarm-name api-error-rate \
     --metric-name 5XXError \
     --namespace AWS/ApiGateway \
     --statistic Sum \
     --period 300 \
     --threshold 10 \
     --comparison-operator GreaterThanThreshold
   ```

## Documenting Results

Create a performance report with:

1. **Test Configuration**:
   - Environment (dev/staging/prod)
   - Number of concurrent users
   - Test duration
   - Endpoints tested

2. **Results Summary**:
   - Response time metrics (avg, p50, p95, p99)
   - Throughput (requests/sec)
   - Error rate
   - Cache hit rate

3. **Comparison**:
   - Baseline vs optimized metrics
   - Percentage improvements
   - Performance gains achieved

4. **Recommendations**:
   - Further optimization opportunities
   - Scaling considerations
   - Cost implications

## Example Performance Report

```markdown
# Performance Benchmark Results

**Date**: 2024-01-29
**Environment**: Staging
**Test Duration**: 10 minutes
**Concurrent Users**: 500

## Results

### Response Times
| Metric | Baseline | Optimized | Improvement |
|--------|----------|-----------|-------------|
| Average | 5200ms | 850ms | 83.7% ↓ |
| P50 | 4800ms | 650ms | 86.5% ↓ |
| P95 | 8500ms | 1450ms | 82.9% ↓ |
| P99 | 12000ms | 1850ms | 84.6% ↓ |

### Cache Performance
| Metric | Value |
|--------|-------|
| Cache Hit Rate | 78% |
| Cache Hit Response Time | 145ms |
| Cache Miss Response Time | 1650ms |

### Throughput
| Metric | Baseline | Optimized | Improvement |
|--------|----------|-----------|-------------|
| Requests/sec | 45 | 285 | 533% ↑ |
| Error Rate | 2.3% | 0.4% | 82.6% ↓ |

## Conclusion

✅ All performance targets met:
- P95 < 2000ms ✓
- Cache hits < 200ms ✓
- Cache misses < 2000ms ✓
- 500 concurrent users supported ✓

**Recommendation**: Deploy to production
```

## Notes

- **Real Infrastructure Required**: These benchmarks must be run against deployed AWS infrastructure
- **Cognito Authentication**: Ensure test users have valid credentials
- **Rate Limiting**: Airtable rate limits (5 req/s) are enforced - monitor for 429 errors
- **Cost Considerations**: Load testing can incur AWS costs - use dev/staging environments
- **Baseline First**: Always capture baseline metrics before deploying optimizations

## Related Tasks

- Task 13-18: Postman collection setup
- Task 23: Deploy and monitor
- Task 24: Final checkpoint

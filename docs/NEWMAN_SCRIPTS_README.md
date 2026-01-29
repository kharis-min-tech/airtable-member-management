# Newman Performance Testing Scripts

This directory contains helper scripts for analyzing Newman performance test results and validating performance targets.

## Scripts

### 1. analyze-newman-results.js

Comprehensive analysis tool that provides detailed performance metrics and validation against targets.

**Features:**
- Calculates response time statistics (avg, min, max, p50, p95, p99)
- Validates against performance targets (p95 <2000ms, success rate >99%)
- Analyzes cache performance (hit/miss rates and response times)
- Provides failure analysis with status code breakdown
- Color-coded terminal output for easy reading
- Actionable recommendations when targets not met

**Usage:**
```bash
node analyze-newman-results.js results.json
```

**Exit Codes:**
- `0` - All performance targets met
- `1` - One or more targets not met
- `2` - Error reading or parsing results file

**Example Output:**
```
================================================================================
Newman Performance Test Results Analysis
================================================================================

================================================================================
Overall Statistics
================================================================================
ℹ Total Requests:       500
ℹ Successful Requests:  497
ℹ Failed Requests:      3
ℹ Success Rate:         99.40%

================================================================================
Response Time Statistics (milliseconds)
================================================================================
ℹ Average (Mean):       1245.67ms
ℹ Minimum:              156.23ms
ℹ Maximum:              2345.89ms
ℹ Median (P50):         1189.45ms
ℹ 95th Percentile:      1876.34ms
ℹ 99th Percentile:      2123.56ms

================================================================================
Performance Target Validation
================================================================================
✓ P95 Response Time: 1876.34ms < 2000ms (TARGET MET)
✓ Success Rate: 99.40% > 99% (TARGET MET)

================================================================================
Summary
================================================================================
✓ ALL PERFORMANCE TARGETS MET! 🎉
✓ P95 Response Time: 1876.34ms < 2000ms
✓ Success Rate: 99.40% > 99%
```

### 2. check-performance-targets.js

Lightweight script for CI/CD integration that quickly validates performance targets.

**Features:**
- Fast validation of p95 response time and success rate
- Simple pass/fail output
- Designed for CI/CD pipeline integration
- Minimal dependencies

**Usage:**
```bash
node check-performance-targets.js results.json
```

**Exit Codes:**
- `0` - All targets met (CI/CD pipeline continues)
- `1` - Targets not met (CI/CD pipeline fails)
- `2` - Error reading results

**Example Output:**
```
P95 Response Time: 1876.34ms (Target: <2000ms) - PASS
Success Rate: 99.40% (Target: >99%) - PASS

✓ All performance targets met
```

## Integration Examples

### GitHub Actions

```yaml
- name: Run Performance Tests
  run: |
    newman run collection.json \
      -e environment.json \
      --iteration-count 100 \
      --parallel 500 \
      --reporters json \
      --reporter-json-export results.json

- name: Analyze Results
  run: node docs/analyze-newman-results.js results.json

- name: Check Targets (Fail if not met)
  run: node docs/check-performance-targets.js results.json
```

### GitLab CI

```yaml
performance_test:
  script:
    - npm install -g newman
    - newman run collection.json -e environment.json --iteration-count 100 --parallel 500 --reporters json --reporter-json-export results.json
    - node docs/analyze-newman-results.js results.json
    - node docs/check-performance-targets.js results.json
  artifacts:
    paths:
      - results.json
    when: always
```

### Jenkins

```groovy
stage('Performance Test') {
  steps {
    sh 'npm install -g newman'
    sh 'newman run collection.json -e environment.json --iteration-count 100 --parallel 500 --reporters json --reporter-json-export results.json'
    sh 'node docs/analyze-newman-results.js results.json'
    sh 'node docs/check-performance-targets.js results.json'
  }
  post {
    always {
      archiveArtifacts artifacts: 'results.json', fingerprint: true
    }
  }
}
```

### Local Development

```bash
# Run performance test
newman run collection.json \
  -e environment.json \
  --iteration-count 100 \
  --parallel 500 \
  --reporters cli,json,html \
  --reporter-json-export results.json \
  --reporter-html-export report.html

# Analyze results with detailed output
node docs/analyze-newman-results.js results.json

# Quick check (for scripting)
node docs/check-performance-targets.js results.json
if [ $? -eq 0 ]; then
  echo "Performance targets met, deploying..."
else
  echo "Performance targets not met, aborting deployment"
  exit 1
fi
```

## Performance Targets

Both scripts validate against these targets:

| Metric | Target | Description |
|--------|--------|-------------|
| P95 Response Time | <2000ms | 95th percentile of all response times must be under 2 seconds |
| Success Rate | >99% | More than 99% of requests must succeed (status 2xx) |

Additional metrics analyzed by `analyze-newman-results.js`:

| Metric | Target | Description |
|--------|--------|-------------|
| Cache Hit Performance | <200ms | Average response time for cache hits |
| Cache Miss Performance | <2000ms | Average response time for cache misses |

## Troubleshooting

### Script Not Found Error

```bash
# Make scripts executable (Unix/Linux/Mac)
chmod +x docs/analyze-newman-results.js
chmod +x docs/check-performance-targets.js

# Run with node explicitly
node docs/analyze-newman-results.js results.json
```

### Results File Not Found

Ensure Newman is exporting JSON results:
```bash
newman run collection.json \
  --reporters json \
  --reporter-json-export results.json
```

### Permission Denied (Windows)

Run scripts with node explicitly:
```cmd
node docs\analyze-newman-results.js results.json
```

### No Response Times in Results

Verify that:
1. Newman ran successfully
2. Requests actually executed
3. JSON export is complete (not truncated)

## Requirements

- Node.js 14+ (for script execution)
- Newman 5.0+ (for running tests)
- Valid Newman JSON results file

## Output Files

When running Newman with these reporters:
```bash
newman run collection.json \
  --reporters cli,json,html \
  --reporter-json-export results.json \
  --reporter-html-export report.html
```

You'll get:
- `results.json` - Machine-readable results (for scripts)
- `report.html` - Human-readable HTML report (for viewing)
- Console output - Real-time progress

## Best Practices

1. **Always analyze results**: Don't just check exit codes, review the detailed analysis
2. **Archive results**: Keep historical results for trend analysis
3. **Set up alerts**: Configure CI/CD to notify team when targets not met
4. **Review failures**: Use detailed failure analysis to identify root causes
5. **Track trends**: Monitor performance over time, not just pass/fail

## Support

For issues with these scripts:
1. Verify Node.js version: `node --version` (should be 14+)
2. Check results file format: `cat results.json | head -20`
3. Run with verbose output: Add `console.log()` statements for debugging
4. Review Newman documentation: https://learning.postman.com/docs/running-collections/using-newman-cli/

## License

These scripts are part of the Church Management API Performance Optimization project.

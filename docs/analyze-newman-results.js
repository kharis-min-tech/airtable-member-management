#!/usr/bin/env node

/**
 * Newman Performance Results Analyzer
 * 
 * Analyzes Newman JSON output to validate performance targets:
 * - P95 Response Time: <2000ms
 * - Success Rate: >99%
 * - Cache Hit Performance: <200ms (when applicable)
 * - Cache Miss Performance: <2000ms (when applicable)
 * 
 * Usage:
 *   node analyze-newman-results.js results.json
 * 
 * Exit codes:
 *   0 - All performance targets met
 *   1 - One or more performance targets not met
 *   2 - Error reading or parsing results file
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Performance targets
const TARGETS = {
  p95ResponseTime: 2000,      // milliseconds
  successRate: 99,            // percentage
  cacheHitPerformance: 200,   // milliseconds
  cacheMissPerformance: 2000  // milliseconds
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(80), 'cyan');
  log(message, 'bright');
  log('='.repeat(80), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logFailure(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function analyzeResults(resultsPath) {
  // Read and parse results file
  let results;
  try {
    const fileContent = fs.readFileSync(resultsPath, 'utf8');
    results = JSON.parse(fileContent);
  } catch (error) {
    log(`Error reading results file: ${error.message}`, 'red');
    process.exit(2);
  }

  logHeader('Newman Performance Test Results Analysis');

  // Extract execution data
  const executions = results.run?.executions || [];
  if (executions.length === 0) {
    logWarning('No executions found in results file');
    process.exit(2);
  }

  // Collect response times
  const responseTimes = executions
    .filter(e => e.response)
    .map(e => e.response.responseTime);

  // Calculate statistics
  const stats = {
    totalRequests: results.run?.stats?.requests?.total || 0,
    failedRequests: results.run?.stats?.requests?.failed || 0,
    successfulRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    p50ResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0
  };

  stats.successfulRequests = stats.totalRequests - stats.failedRequests;
  stats.successRate = stats.totalRequests > 0 
    ? (stats.successfulRequests / stats.totalRequests) * 100 
    : 0;

  if (responseTimes.length > 0) {
    stats.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    stats.minResponseTime = Math.min(...responseTimes);
    stats.maxResponseTime = Math.max(...responseTimes);
    stats.p50ResponseTime = calculatePercentile(responseTimes, 50);
    stats.p95ResponseTime = calculatePercentile(responseTimes, 95);
    stats.p99ResponseTime = calculatePercentile(responseTimes, 99);
  }

  // Display overall statistics
  logHeader('Overall Statistics');
  logInfo(`Total Requests:       ${stats.totalRequests}`);
  logInfo(`Successful Requests:  ${stats.successfulRequests}`);
  logInfo(`Failed Requests:      ${stats.failedRequests}`);
  logInfo(`Success Rate:         ${stats.successRate.toFixed(2)}%`);
  
  logHeader('Response Time Statistics (milliseconds)');
  logInfo(`Average (Mean):       ${stats.avgResponseTime.toFixed(2)}ms`);
  logInfo(`Minimum:              ${stats.minResponseTime.toFixed(2)}ms`);
  logInfo(`Maximum:              ${stats.maxResponseTime.toFixed(2)}ms`);
  logInfo(`Median (P50):         ${stats.p50ResponseTime.toFixed(2)}ms`);
  logInfo(`95th Percentile:      ${stats.p95ResponseTime.toFixed(2)}ms`);
  logInfo(`99th Percentile:      ${stats.p99ResponseTime.toFixed(2)}ms`);

  // Validate against targets
  logHeader('Performance Target Validation');
  
  let allTargetsMet = true;

  // Check P95 response time
  if (stats.p95ResponseTime < TARGETS.p95ResponseTime) {
    logSuccess(`P95 Response Time: ${stats.p95ResponseTime.toFixed(2)}ms < ${TARGETS.p95ResponseTime}ms (TARGET MET)`);
  } else {
    logFailure(`P95 Response Time: ${stats.p95ResponseTime.toFixed(2)}ms >= ${TARGETS.p95ResponseTime}ms (TARGET NOT MET)`);
    allTargetsMet = false;
  }

  // Check success rate
  if (stats.successRate > TARGETS.successRate) {
    logSuccess(`Success Rate: ${stats.successRate.toFixed(2)}% > ${TARGETS.successRate}% (TARGET MET)`);
  } else {
    logFailure(`Success Rate: ${stats.successRate.toFixed(2)}% <= ${TARGETS.successRate}% (TARGET NOT MET)`);
    allTargetsMet = false;
  }

  // Analyze cache performance (if cache headers present)
  const cacheHits = executions.filter(e => {
    const cacheControl = e.response?.headers?.find(h => 
      h.key.toLowerCase() === 'x-cache' || h.key.toLowerCase() === 'cache-control'
    );
    return cacheControl && cacheControl.value.toLowerCase().includes('hit');
  });

  const cacheMisses = executions.filter(e => {
    const cacheControl = e.response?.headers?.find(h => 
      h.key.toLowerCase() === 'x-cache' || h.key.toLowerCase() === 'cache-control'
    );
    return cacheControl && cacheControl.value.toLowerCase().includes('miss');
  });

  if (cacheHits.length > 0 || cacheMisses.length > 0) {
    logHeader('Cache Performance Analysis');
    
    if (cacheHits.length > 0) {
      const cacheHitTimes = cacheHits.map(e => e.response.responseTime);
      const avgCacheHitTime = cacheHitTimes.reduce((a, b) => a + b, 0) / cacheHitTimes.length;
      
      logInfo(`Cache Hits: ${cacheHits.length} (${((cacheHits.length / executions.length) * 100).toFixed(2)}%)`);
      logInfo(`Avg Cache Hit Time: ${avgCacheHitTime.toFixed(2)}ms`);
      
      if (avgCacheHitTime < TARGETS.cacheHitPerformance) {
        logSuccess(`Cache Hit Performance: ${avgCacheHitTime.toFixed(2)}ms < ${TARGETS.cacheHitPerformance}ms (TARGET MET)`);
      } else {
        logWarning(`Cache Hit Performance: ${avgCacheHitTime.toFixed(2)}ms >= ${TARGETS.cacheHitPerformance}ms (TARGET NOT MET)`);
      }
    }

    if (cacheMisses.length > 0) {
      const cacheMissTimes = cacheMisses.map(e => e.response.responseTime);
      const avgCacheMissTime = cacheMissTimes.reduce((a, b) => a + b, 0) / cacheMissTimes.length;
      
      logInfo(`Cache Misses: ${cacheMisses.length} (${((cacheMisses.length / executions.length) * 100).toFixed(2)}%)`);
      logInfo(`Avg Cache Miss Time: ${avgCacheMissTime.toFixed(2)}ms`);
      
      if (avgCacheMissTime < TARGETS.cacheMissPerformance) {
        logSuccess(`Cache Miss Performance: ${avgCacheMissTime.toFixed(2)}ms < ${TARGETS.cacheMissPerformance}ms (TARGET MET)`);
      } else {
        logWarning(`Cache Miss Performance: ${avgCacheMissTime.toFixed(2)}ms >= ${TARGETS.cacheMissPerformance}ms (TARGET NOT MET)`);
      }
    }
  }

  // Analyze failures
  if (stats.failedRequests > 0) {
    logHeader('Failure Analysis');
    
    const failures = executions.filter(e => 
      !e.response || e.response.code >= 400 || e.assertions?.some(a => a.error)
    );

    const failuresByStatus = {};
    failures.forEach(f => {
      const status = f.response?.code || 'No Response';
      failuresByStatus[status] = (failuresByStatus[status] || 0) + 1;
    });

    logInfo('Failures by Status Code:');
    Object.entries(failuresByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        logInfo(`  ${status}: ${count} (${((count / stats.failedRequests) * 100).toFixed(2)}%)`);
      });

    // Show first 5 failure details
    logInfo('\nFirst 5 Failure Details:');
    failures.slice(0, 5).forEach((f, i) => {
      const request = f.request;
      const response = f.response;
      logInfo(`\n  ${i + 1}. ${request?.method} ${request?.url?.path?.join('/')}`);
      logInfo(`     Status: ${response?.code || 'No Response'}`);
      logInfo(`     Response Time: ${response?.responseTime || 'N/A'}ms`);
      
      const failedAssertions = f.assertions?.filter(a => a.error);
      if (failedAssertions?.length > 0) {
        logInfo(`     Failed Assertions:`);
        failedAssertions.forEach(a => {
          logInfo(`       - ${a.assertion}: ${a.error.message}`);
        });
      }
    });
  }

  // Final summary
  logHeader('Summary');
  
  if (allTargetsMet) {
    logSuccess('ALL PERFORMANCE TARGETS MET! 🎉');
    logSuccess(`✓ P95 Response Time: ${stats.p95ResponseTime.toFixed(2)}ms < ${TARGETS.p95ResponseTime}ms`);
    logSuccess(`✓ Success Rate: ${stats.successRate.toFixed(2)}% > ${TARGETS.successRate}%`);
    log('');
    process.exit(0);
  } else {
    logFailure('SOME PERFORMANCE TARGETS NOT MET');
    
    if (stats.p95ResponseTime >= TARGETS.p95ResponseTime) {
      logFailure(`✗ P95 Response Time: ${stats.p95ResponseTime.toFixed(2)}ms >= ${TARGETS.p95ResponseTime}ms`);
      logInfo('  Recommendations:');
      logInfo('  - Check if cache is warming up properly');
      logInfo('  - Verify Lambda memory is set to 512MB');
      logInfo('  - Review CloudWatch logs for slow queries');
      logInfo('  - Check for Airtable rate limiting (429 errors)');
    }
    
    if (stats.successRate <= TARGETS.successRate) {
      logFailure(`✗ Success Rate: ${stats.successRate.toFixed(2)}% <= ${TARGETS.successRate}%`);
      logInfo('  Recommendations:');
      logInfo('  - Review failure analysis above');
      logInfo('  - Check authentication token expiration');
      logInfo('  - Verify environment variables are correct');
      logInfo('  - Reduce concurrent load to identify breaking point');
    }
    
    log('');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage: node analyze-newman-results.js <results.json>', 'yellow');
    log('');
    log('Example:', 'cyan');
    log('  node analyze-newman-results.js results.json', 'cyan');
    log('');
    process.exit(2);
  }

  const resultsPath = path.resolve(args[0]);
  
  if (!fs.existsSync(resultsPath)) {
    log(`Error: Results file not found: ${resultsPath}`, 'red');
    process.exit(2);
  }

  analyzeResults(resultsPath);
}

module.exports = { analyzeResults, calculatePercentile };

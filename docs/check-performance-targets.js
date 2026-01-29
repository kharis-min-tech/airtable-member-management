#!/usr/bin/env node

/**
 * Performance Target Checker for CI/CD
 * 
 * Simple script that checks if performance targets are met and exits with
 * appropriate code for CI/CD pipeline integration.
 * 
 * Usage:
 *   node check-performance-targets.js results.json
 * 
 * Exit codes:
 *   0 - All targets met
 *   1 - Targets not met
 *   2 - Error
 */

const fs = require('fs');
const path = require('path');

const TARGETS = {
  p95ResponseTime: 2000,  // milliseconds
  successRate: 99         // percentage
};

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function checkTargets(resultsPath) {
  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    const executions = results.run?.executions || [];
    const responseTimes = executions
      .filter(e => e.response)
      .map(e => e.response.responseTime);
    
    const totalRequests = results.run?.stats?.requests?.total || 0;
    const failedRequests = results.run?.stats?.requests?.failed || 0;
    const successRate = totalRequests > 0 
      ? ((totalRequests - failedRequests) / totalRequests) * 100 
      : 0;
    
    const p95ResponseTime = calculatePercentile(responseTimes, 95);
    
    const p95Met = p95ResponseTime < TARGETS.p95ResponseTime;
    const successRateMet = successRate > TARGETS.successRate;
    
    console.log(`P95 Response Time: ${p95ResponseTime.toFixed(2)}ms (Target: <${TARGETS.p95ResponseTime}ms) - ${p95Met ? 'PASS' : 'FAIL'}`);
    console.log(`Success Rate: ${successRate.toFixed(2)}% (Target: >${TARGETS.successRate}%) - ${successRateMet ? 'PASS' : 'FAIL'}`);
    
    if (p95Met && successRateMet) {
      console.log('\n✓ All performance targets met');
      process.exit(0);
    } else {
      console.log('\n✗ Performance targets not met');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(2);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node check-performance-targets.js <results.json>');
    process.exit(2);
  }
  checkTargets(path.resolve(args[0]));
}

module.exports = { checkTargets };

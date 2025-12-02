# Load Testing Guide

## Overview

The load testing script (`scripts/loadTest.ts`) simulates concurrent workout parsing requests to evaluate system performance under load. It helps identify bottlenecks, resource constraints, and failure modes.

## Quick Start

```bash
# Test with 50 concurrent requests (100 total)
npm run test:load -- --concurrent 50 --total 100

# Test with gradual ramp-up (recommended)
npm run test:load -- --concurrent 50 --total 100 --rampup 10000

# Small test (10 concurrent, 20 total)
npm run test:load -- --concurrent 10 --total 20

# Verbose output
npm run test:load -- --concurrent 50 --total 100 --verbose
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--concurrent` | `-c` | Number of simultaneous requests | 50 |
| `--total` | `-t` | Total number of requests to make | 100 |
| `--rampup` | `-r` | Ramp-up time in milliseconds | 0 |
| `--timeout` | | Request timeout in milliseconds | 120000 (2 min) |
| `--verbose` | `-v` | Print detailed request logs | false |

## What It Tests

### 1. **Concurrent Request Handling**
- Sends multiple workout parsing requests simultaneously
- Measures how the system handles concurrent load
- Identifies connection pool exhaustion

### 2. **Response Time Metrics**
- **p50 (median)**: Typical user experience
- **p95**: 95% of users see this or better
- **p99**: Worst-case for most users
- **Max**: Absolute worst-case

### 3. **Error Rates**
- **Network errors**: Connection pool exhaustion, socket errors
- **Timeout errors**: Requests exceeding time limit
- **Server errors**: 5xx responses
- **Validation errors**: 4xx responses

### 4. **Resource Usage**
- Memory consumption during test
- Peak memory usage
- Memory leaks (increasing memory over time)

## Understanding Results

### Success Rate

```
✓ EXCELLENT (≥95% success, <60s avg):  System handles load gracefully
⚠ ACCEPTABLE (≥80% success, <90s avg): System handles load but shows degradation
✗ POOR (≥50% success):                  Significant failures under load
✗✗ CRITICAL (<50% success):             System unable to handle load
```

### Response Times

**Acceptable thresholds:**
- **p50**: < 45 seconds (typical workout parsing time)
- **p95**: < 60 seconds (allows for complex workouts)
- **p99**: < 90 seconds (edge cases with many new exercises)

**Warning signs:**
- **p50 > 60s**: Consistent slowdown, bottleneck present
- **p95 > 90s**: Many requests timing out
- **Large gap between p50 and p99**: Inconsistent performance

### Error Types

**Network Errors (`ECONNRESET`, `ECONNREFUSED`):**
- **Cause**: Database connection pool exhausted
- **Fix**: Increase pool size or implement request queueing

**Timeout Errors:**
- **Cause**: Requests taking too long (>2 minutes)
- **Fix**: Optimize parsing pipeline or increase timeout

**Server Errors (5xx):**
- **Cause**: Application crashes, OOM, uncaught exceptions
- **Fix**: Debug error logs, add error handling

**Validation Errors (4xx):**
- **Cause**: Invalid input data (should be rare in load test)
- **Fix**: Check sample workout data

## Expected Performance

### Current System (Synchronous)

**Low Load (10 concurrent, 20 total):**
- ✓ Success rate: ~90-100%
- ✓ p50: 30-45s
- ✓ p95: 50-70s
- ⚠ Some timeouts possible

**Medium Load (25 concurrent, 50 total):**
- ⚠ Success rate: ~60-80%
- ⚠ p50: 45-60s
- ⚠ p95: 80-120s
- ✗ Connection pool exhaustion likely

**High Load (50 concurrent, 100 total):**
- ✗ Success rate: ~20-40%
- ✗ p50: 60-90s (for successful requests)
- ✗ p95: 100-120s+
- ✗ Many timeouts and connection errors
- ✗ Possible server crash

**Very High Load (100+ concurrent):**
- ✗✗ Success rate: <10%
- ✗✗ Server likely crashes
- ✗✗ API rate limits hit

### Bottlenecks Identified

1. **Database Connection Pool (20 connections)**
   - Exhausted at ~25-30 concurrent requests
   - Causes: `ECONNRESET`, connection timeout errors

2. **External API Rate Limits**
   - Anthropic API: ~5,000-10,000 req/min (tier-dependent)
   - OpenAI API: ~3,000-5,000 req/min
   - Hit at ~50+ concurrent requests

3. **Node.js Memory (4 GB heap)**
   - Each request uses ~50-100 MB
   - OOM crash at ~50-80 concurrent requests

4. **Processing Time (30-60s per workout)**
   - Synchronous blocking
   - No request queuing

## Recommendations by Load Level

### If Testing <20 Concurrent
```bash
npm run test:load -- --concurrent 10 --total 20
```
**Expected:** Should handle gracefully
**Action:** If failures occur, check:
- Database connection pool configuration
- API credentials and quotas
- Redis cache availability

### If Testing 20-50 Concurrent
```bash
npm run test:load -- --concurrent 25 --total 50 --rampup 5000
```
**Expected:** Degraded performance, some failures
**Action:** Monitor for:
- Connection pool exhaustion (increase max connections)
- API rate limit warnings
- Memory usage trends

### If Testing 50+ Concurrent
```bash
npm run test:load -- --concurrent 50 --total 100 --rampup 10000
```
**Expected:** Significant failures
**Action:** This demonstrates the need for:
- Asynchronous job queue (BullMQ)
- Worker processes
- Rate limiting
- Request queuing

## Interpreting the Report

### Example Output

```
LOAD TEST RESULTS
================================================================================

Overall Statistics:
--------------------------------------------------------------------------------
  Total Requests:       100
  Successful:           45 (45.0%)
  Failed:               30 (30.0%)
  Timed Out:            25 (25.0%)
  Total Duration:       180.50s
  Throughput:           0.55 req/s

Response Time Statistics (Successful Requests):
--------------------------------------------------------------------------------
  Min:                  25.32s
  Average:              48.76s
  Median (p50):         45.21s
  p95:                  72.88s
  p99:                  89.34s
  Max:                  95.12s

Error Breakdown:
--------------------------------------------------------------------------------
  network              : 25 (25.0%)
  timeout              : 20 (20.0%)
  server               : 5 (5.0%)
```

### What This Tells Us

1. **45% success rate**: System struggling under load
2. **25% network errors**: Connection pool exhausted
3. **25% timeouts**: Requests taking too long
4. **p95 at 72s**: Most successful requests complete in reasonable time
5. **0.55 req/s throughput**: Very low, indicates bottleneck

### Action Items from This Report

1. ✅ **Immediate**: Increase DB connection pool from 20 to 50
2. ✅ **Short-term**: Implement request rate limiting
3. ✅ **Medium-term**: Add job queue (BullMQ) for async processing
4. ✅ **Long-term**: Horizontal scaling with worker processes

## Best Practices

### 1. Start Small
```bash
# Always start with low concurrency
npm run test:load -- --concurrent 5 --total 10
```

### 2. Use Ramp-Up
```bash
# Gradual ramp prevents sudden spikes
npm run test:load -- --concurrent 50 --total 100 --rampup 20000
```

### 3. Run Multiple Times
```bash
# Results can vary, run 3 times and average
for i in {1..3}; do
  npm run test:load -- --concurrent 25 --total 50
  sleep 60  # Cool-down between tests
done
```

### 4. Monitor System Resources
```bash
# In separate terminal, monitor during test
watch -n 1 'ps aux | grep node'  # CPU/Memory
watch -n 1 'netstat -an | grep ESTABLISHED | wc -l'  # Connections
```

### 5. Check Database
```bash
# Monitor active DB connections during test
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

## Safety Notes

⚠️ **API Costs**: Load tests make real API calls to Anthropic and OpenAI. Each request costs $0.01-0.03.
- 100 requests = ~$1-3 in API costs
- 1,000 requests = ~$10-30 in API costs

⚠️ **Rate Limits**: Hitting rate limits may temporarily block your API keys.

⚠️ **Server Crashes**: High concurrency tests may crash the server. Only run in development.

⚠️ **Database Load**: Tests create real database records. Run on test database only.

## Next Steps

After running load tests:

1. **Review results** and identify bottlenecks
2. **Compare** against expected performance
3. **Implement fixes** (connection pooling, caching, etc.)
4. **Re-test** to verify improvements
5. **Document** findings and thresholds

For production readiness, you should:
- ✅ Handle 50+ concurrent requests with <10% error rate
- ✅ Maintain p95 response time <60s
- ✅ Gracefully handle API rate limits
- ✅ Monitor and alert on performance degradation

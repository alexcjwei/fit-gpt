# Load Test Predictions: What Will Actually Happen

## TL;DR

**50 concurrent requests:** System will handle ~40-60% successfully with degraded performance. You'll see connection pool exhaustion and some timeouts, but the server should survive.

**Async processing needed?** Not critical for 50 concurrent, but **highly recommended** for any production use or >100 requests/hour sustained load.

---

## Detailed Predictions by Concurrency Level

### 10 Concurrent Requests (Safe Zone ✓)

**What happens:**
```
✓ 95-100% success rate
✓ p50: 30-40 seconds
✓ p95: 50-65 seconds
✓ Minimal errors
```

**Resource usage:**
- DB connections: 10/20 used (50%)
- Memory: +500-750 MB
- API rate: Well within limits

**Conclusion:** System handles gracefully. This is your baseline.

---

### 25 Concurrent Requests (Warning Zone ⚠)

**What happens:**
```
⚠ 70-85% success rate
⚠ p50: 40-55 seconds
⚠ p95: 70-90 seconds
⚠ Some connection errors (~5-10%)
```

**Resource usage:**
- DB connections: 20/20 used (100% - pool exhausted)
- Memory: +1.2-1.8 GB
- API rate: Approaching limits but manageable

**Errors you'll see:**
```
Error: connect ECONNREFUSED
Error: timeout of 120000ms exceeded
PostgresError: connection timeout
```

**Conclusion:** System stressed but functional. Connection pool is the bottleneck.

---

### 50 Concurrent Requests (Failure Zone ✗)

**What happens:**
```
✗ 40-60% success rate
✗ p50: 50-70 seconds (successful only)
✗ p95: 90-120 seconds
✗ Many timeouts and connection errors (~30-40%)
```

**Resource usage:**
- DB connections: 20/20 (exhausted, queue building)
- Memory: +2.5-3.5 GB
- API rate: Near/at rate limits

**Timeline of events:**
```
T+0s:    50 requests arrive
T+0.1s:  First 20 acquire DB connections
T+0.5s:  Remaining 30 waiting in connection queue
T+2s:    Connection timeouts start (2s timeout configured)
T+10s:   Memory usage peaks at ~3.5 GB
T+30s:   First successful responses return
T+60s:   ~20-25 requests completed successfully
T+90s:   ~10-15 more complete
T+120s:  Express timeouts trigger for slowest requests
```

**Errors you'll see:**
```
[25 requests] Error: connect ECONNREFUSED (connection pool exhausted)
[15 requests] Error: timeout of 120000ms exceeded (too slow)
[5 requests]  Error: 429 Too Many Requests (API rate limit)
[5 requests]  Error: 500 Internal Server Error (uncaught exceptions)
```

**Conclusion:** System survives but degraded. **This is where you need async processing.**

---

### 100 Concurrent Requests (Critical Zone ✗✗)

**What happens:**
```
✗✗ 10-25% success rate
✗✗ Most requests fail or timeout
✗✗ Possible server crash (OOM)
✗✗ API rate limits definitely hit
```

**Resource usage:**
- DB connections: Completely exhausted
- Memory: 4+ GB (OOM risk)
- API rate: Over limits, 429 errors

**Conclusion:** **System will fail catastrophically.** Do not test in production.

---

## What You'll Actually See (50 Concurrent Test)

### Terminal Output
```bash
$ npm run test:load -- --concurrent 50 --total 100

WORKOUT PARSER LOAD TEST
================================================================================

Configuration:
  Total Requests:       100
  Concurrent Requests:  50
  Ramp-up Time:         0ms
  Request Timeout:      120000ms

Running 2 batch(es) with 0ms delay between batches...

[Batch 1/2] Starting 50 concurrent requests...
[Request 1] ✓ Completed in 35241ms (200)
[Request 2] ✓ Completed in 38562ms (200)
[Request 3] ✗ Failed: network - connect ECONNREFUSED
[Request 4] ✓ Completed in 42183ms (200)
...
[Request 20] ✓ Completed in 55902ms (200)
[Request 21] ✗ Failed: network - connect ECONNREFUSED
[Request 22] ✗ Failed: timeout - Request timeout of 120000ms exceeded
...
[Batch 1/2] Complete: 28 success, 15 errors, 7 timeouts

[Batch 2/2] Starting 50 concurrent requests...
[Batch 2/2] Complete: 30 success, 12 errors, 8 timeouts

================================================================================
LOAD TEST RESULTS
================================================================================

Overall Statistics:
--------------------------------------------------------------------------------
  Total Requests:       100
  Successful:           58 (58.0%)
  Failed:               27 (27.0%)
  Timed Out:            15 (15.0%)
  Total Duration:       125.45s
  Throughput:           0.80 req/s

Response Time Statistics (Successful Requests):
--------------------------------------------------------------------------------
  Min:                  28.12s
  Average:              45.67s
  Median (p50):         43.21s
  p95:                  68.92s
  p99:                  85.34s
  Max:                  92.15s

Error Breakdown:
--------------------------------------------------------------------------------
  network               : 22 (22.0%)
  timeout               : 15 (15.0%)
  server                : 5 (5.0%)

Resource Usage:
--------------------------------------------------------------------------------
  Start Memory:         125.34 MB
  Peak Memory:          3,421.78 MB
  End Memory:           2,156.92 MB
  Memory Increase:      2,031.58 MB

================================================================================
PERFORMANCE ASSESSMENT
================================================================================

⚠ ACCEPTABLE: System handles load but shows degradation

Observations:
  • High failure rate suggests resource constraints
  • 15 requests exceeded 120s timeout
  • Network errors suggest connection pool exhaustion
  • High memory increase (2031MB) suggests potential memory issues

Recommendations:
  1. Implement asynchronous processing with job queue (BullMQ)
  2. Add rate limiting to prevent API quota exhaustion
  3. Increase database connection pool size
  4. Consider horizontal scaling with worker processes
```

---

## Do You Need Async Processing?

### Decision Matrix

| Scenario | Async Needed? | Reason |
|----------|---------------|--------|
| **<10 concurrent requests** | ❌ No | Current system handles fine |
| **10-25 concurrent requests** | ⚠ Nice to have | Better UX, prevents occasional timeouts |
| **25-50 concurrent requests** | ✅ Yes | Prevents frequent failures |
| **50+ concurrent requests** | ✅✅ Critical | System will fail without it |
| **Sustained load (>100 req/hour)** | ✅ Yes | Cost control, graceful degradation |
| **Production use** | ✅ Yes | Reliability, monitoring, retries |

### Simple Test: Do You Need It?

Run this test:
```bash
npm run test:load -- --concurrent 25 --total 50
```

**If success rate <90%:** You need async processing
**If success rate >90%:** You can defer (but still recommended)

---

## Async Processing Benefits (Even at 50 Concurrent)

### Without Async Queue:
```
User sends workout → Server blocks for 45s → Response or timeout
- If server busy: Immediate failure
- No retry on transient errors
- No visibility into progress
- No cost controls
```

### With Async Queue:
```
User sends workout → Job queued (instant) → Job ID returned
                  ↓
            Worker processes in background
                  ↓
            WebSocket update when complete
```

**Benefits:**
1. **Always responsive** - API returns immediately
2. **Graceful degradation** - Queue grows, doesn't crash
3. **Retry logic** - Transient failures auto-retry
4. **Progress updates** - User sees "Stage 3/5: Resolving exercises..."
5. **Rate limiting** - Control API costs automatically
6. **Monitoring** - See queue depth, processing times
7. **Scalability** - Add workers without code changes

---

## Minimal Async Implementation

If you want async processing without full infrastructure:

### Quick Win #1: Increase Connection Pool
```typescript
// backend/src/db/connection.ts
max: 50,  // Was 20
```

**Result:** Handle 40-50 concurrent instead of 20-25

### Quick Win #2: Add Request Queue (Simple)
```typescript
// Use p-queue (lightweight)
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 20 });

app.post('/api/workouts/parse', async (req, res) => {
  const result = await queue.add(() => parseWorkout(req.body));
  res.json(result);
});
```

**Result:** Requests queue instead of failing

### Full Solution: BullMQ + Workers
```typescript
// Full async architecture
- API returns job ID instantly
- Workers process in background
- WebSocket updates client
- Can handle unlimited concurrent requests
```

**Result:** Production-ready scalability

---

## Bottom Line

### For 50 concurrent requests:
- ⚠ **Current system:** Will handle ~50-60% successfully
- ✅ **With connection pool increase:** ~70-80% success
- ✅ **With simple queue:** ~90-95% success
- ✅ **With full async (BullMQ):** ~99%+ success

### Recommendation:
1. **Test first** with the load script (see what breaks)
2. **Quick fix** if needed: Increase connection pool to 50
3. **Production-ready** solution: Implement BullMQ + workers

**You probably don't need the full async infrastructure yet**, but you'll want it before going to production or if you expect >100 requests/hour.

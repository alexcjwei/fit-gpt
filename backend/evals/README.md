# Parser Evaluation System

Systematic testing framework for validating workout parser correctness and tracking performance at scale.

## Quick Start

```bash
# Run evaluations with default dataset
npm run eval:parser

# Results saved to evals/results/ with timestamp
```

## Structure

```
evals/
├── datasets/           # Test cases in JSONL format
├── assertions/         # Structural comparison logic
├── runners/           # Eval orchestration
├── results/           # Timestamped result files
└── runParserEvals.ts  # CLI entry point
```

## Test Case Format

Test cases are stored in `datasets/workout-parsing.jsonl` as newline-delimited JSON:

```json
{
  "id": "simple-workout",
  "input": "Bench Press\n3x8 @ 185 lbs\n\nSquat\n5x5 @ 225 lbs",
  "expected": {
    "blockCount": 1,
    "blocks": [{
      "exerciseCount": 2,
      "exercises": [
        { "exerciseSlug": "bench-press", "setCount": 3 },
        { "exerciseSlug": "barbell-squat", "setCount": 5 }
      ]
    }]
  }
}
```

**Key fields:**
- `id`: Unique test identifier
- `input`: Raw workout text (as user would input)
- `expected`: Structural expectations (block count, exercise slugs, set counts)

**Best practices:**
- Vary set counts per exercise to catch structural errors
- Use existing exercise slugs from seeded fixtures
- Use descriptive IDs (e.g., `multi-block-superset`)

## What Gets Measured

**Correctness:**
- Block count
- Exercise count per block
- Exercise identification (via slug)
- Set count per exercise

**Performance:**
- Latency (total, average, p95)
- Token usage (input/output)
- Pass/fail/error rates

## Results

Console output shows summary statistics and failed cases:

```
============================================================
EVALUATION RESULTS
============================================================
Total Tests:     50
Passed:          48 (96.0%)
Failed:          1 (2.0%)
Errors:          1 (2.0%)

Total Latency:   125,432ms
Avg Latency:     2,509ms
P95 Latency:     3,120ms

Input Tokens:    15,234 (avg: 305)
Output Tokens:   8,456 (avg: 169)
Total Tokens:    23,690

Wall Time:       130.5s
============================================================

Failed Cases:
  - complex-superset
    • Block 0, Exercise 1: Expected slug "pull-up", got "pullups"
```

Detailed results saved to `results/parser-eval-<timestamp>.json` with full metadata and individual test results.

## Fixture Versioning

Exercise fixtures are versioned (`tests/fixtures/001_exercises_seed.sql`, etc.) to ensure reproducibility. The `exercises_seed.sql` symlink points to the latest version.

To regenerate after exercise data changes:

```bash
cd tests/fixtures
./regenerate_fixtures.sh  # Auto-increments version (001 → 002)
```

## Design Decisions

**Sequential execution:** Tests run one at a time to avoid rate limits and ensure consistent latency measurements.

**Structural assertions:** Focus on counts and slugs rather than deep object comparison for clarity and stability.

**JSONL format:** Easy version control (line-by-line diffs), simple appending, clear test separation.

**Versioned fixtures:** Reproducibility across runs and ability to compare performance over time.

## Common Issues

**"Expected slug X, got Y"** - Parser identified different exercise. Check fixture's exercise list or update test case.

**High failure rate after fixture update** - Exercise slugs may have changed. Update test cases accordingly.

**Token usage is 0** - Test errored before reaching parser. Check error message in results.

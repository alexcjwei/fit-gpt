# Parser Evaluation System

## Overview

The parser evaluation system provides a framework for testing the workout parser at scale, enabling systematic correctness validation and performance tracking across hundreds of test cases.

### Goals

- **Easy test case management**: Simple JSONL format for adding inputs and expected outputs
- **Scale testing**: Run hundreds of diverse parsing scenarios
- **Comprehensive metrics**: Track latency, token usage, and correctness
- **Reproducibility**: Version-controlled fixtures ensure consistent test environments

## Architecture

### Components

1. **Test Cases** (`evals/datasets/*.jsonl`)
   - JSONL format (one test case per line)
   - Contains raw workout input and expected structural output
   - Easy to version control and diff

2. **Assertions** (`evals/assertions/workoutAssertions.ts`)
   - Structural comparison logic
   - Validates block count, exercise count, set count, and exercise slugs
   - Returns detailed error messages for debugging

3. **Eval Runner** (`evals/runners/parseEvalRunner.ts`)
   - Orchestrates test execution
   - Manages isolated test database
   - Collects metrics (latency, tokens, pass/fail/error)
   - Returns aggregated statistics

4. **CLI Script** (`evals/runParserEvals.ts`)
   - Entry point for running evals
   - Loads dataset, runs tests, saves results
   - Prints summary statistics

5. **Fixture Versioning** (`tests/fixtures/NNN_exercises_seed.sql`)
   - Migration-style versioning (001, 002, etc.)
   - Auto-incremented by `regenerate_fixtures.sh`
   - Ensures reproducible test environments

## Usage

### Running Evals

```bash
# Run with default dataset
npm run eval:parser

# Run with custom dataset
npm run eval:parser -- --dataset=custom-cases.jsonl

# Run with specific fixture version
npm run eval:parser -- --fixture=002
```

### Adding Test Cases

Test cases are stored in `evals/datasets/workout-parsing.jsonl` as newline-delimited JSON.

#### Test Case Format

```json
{
  "id": "unique-test-identifier",
  "input": "Raw workout text here...",
  "expected": {
    "blockCount": 2,
    "blocks": [
      {
        "exerciseCount": 2,
        "exercises": [
          {
            "exerciseSlug": "bench-press",
            "setCount": 3
          },
          {
            "exerciseSlug": "barbell-squat",
            "setCount": 5
          }
        ]
      },
      {
        "exerciseCount": 1,
        "exercises": [
          {
            "exerciseSlug": "pull-up",
            "setCount": 4
          }
        ]
      }
    ]
  }
}
```

**Important**: Each line must be a single valid JSON object (no pretty-printing in the JSONL file).

#### Field Descriptions

- `id`: Unique identifier for the test case (used in results)
- `input`: Raw workout text to parse (exactly as a user would input it)
- `expected`: Expected structural output
  - `blockCount`: Number of workout blocks
  - `blocks`: Array of expected blocks
    - `exerciseCount`: Number of exercises in the block
    - `exercises`: Array of expected exercises
      - `exerciseSlug`: Exercise slug (from database, e.g., "bench-press")
      - `setCount`: Number of sets for this exercise

#### Tips for Writing Test Cases

1. **Vary set counts**: Ensure each exercise has a different number of sets to catch structural errors
2. **Use existing exercises**: Reference exercises in the seeded fixture (see `tests/fixtures/regenerate_fixtures.sh` for the list)
3. **Test edge cases**: Empty blocks, single sets, unusual formats
4. **Document intent**: Use descriptive IDs (e.g., `multi-block-superset`, `single-set-max-effort`)

### Interpreting Results

#### Console Output

```
🏋️  Parser Evaluation Runner

Dataset: workout-parsing.jsonl
Fixture: 001_exercises_seed.sql

✓ Loaded 50 test cases

Running evaluations...

============================================================
EVALUATION RESULTS
============================================================
Total Tests:     50
Passed:          45 (90.0%)
Failed:          3 (6.0%)
Errors:          2 (4.0%)

Total Latency:   125,432ms
Avg Latency:     2,509ms

Input Tokens:    15,234
Output Tokens:   8,456
Total Tokens:    23,690

Wall Time:       130.5s
============================================================

Failed Cases:
  - complex-superset
    • Block 0, Exercise 1: Expected slug "pull-up", got "pullups"

Error Cases:
  - malformed-input: Validation failed: Invalid date format

✓ Results saved to: evals/results/parser-eval-2024-12-02T10-30-45.json
```

#### Result Files

Detailed results are saved to `evals/results/parser-eval-<timestamp>.json`:

```json
{
  "metadata": {
    "timestamp": "2024-12-02T10:30:45.123Z",
    "dataset": "workout-parsing.jsonl",
    "fixtureVersion": "001",
    "totalCases": 50
  },
  "stats": {
    "totalTests": 50,
    "passed": 45,
    "failed": 3,
    "errors": 2,
    "totalLatencyMs": 125432,
    "avgLatencyMs": 2508.64,
    "totalInputTokens": 15234,
    "totalOutputTokens": 8456,
    "results": [
      {
        "testId": "simple-workout",
        "status": "pass",
        "latencyMs": 2345,
        "tokenUsage": {
          "inputTokens": 234,
          "outputTokens": 156
        },
        "assertionResult": {
          "pass": true,
          "errors": []
        },
        "workout": { /* full parsed workout */ }
      },
      // ... more results
    ]
  }
}
```

### Fixture Versioning

Exercise fixtures are versioned like database migrations to ensure reproducibility.

#### Current Version

Check `tests/fixtures/` for the latest version:

```bash
ls -1 tests/fixtures/[0-9]*.sql | tail -1
# Output: tests/fixtures/001_exercises_seed.sql
```

#### Regenerating Fixtures

When exercise data changes, regenerate the fixture:

```bash
cd tests/fixtures
./regenerate_fixtures.sh
```

This will:
1. Query the database for exercises needed by tests
2. Dump only the required exercises
3. Auto-increment the version number (e.g., 001 → 002)
4. Update the symlink `exercises_seed.sql` to point to the new version

#### Using Specific Versions

By default, evals use the latest fixture (via the symlink). To run against a specific version:

```bash
npm run eval:parser -- --fixture=001
```

## Design Decisions

### Why Structural Assertions?

Instead of deep JSON comparison, we compare:
- **Block count**: Catches missing or extra blocks
- **Exercise count per block**: Catches grouping errors
- **Exercise slug**: Validates exercise identification (more stable than IDs)
- **Set count per exercise**: Catches set parsing errors

This approach:
- Is simple and fast
- Provides clear error messages
- Avoids brittleness from deep object comparison
- Focuses on the most important structural elements

Test cases should be designed such that each exercise has a different number of sets, ensuring the structural comparison catches errors.

### Why Sequential Execution?

Tests run sequentially (concurrency = 1) to:
- Avoid API rate limits
- Ensure consistent latency measurements
- Simplify debugging (clear error attribution)

### Why JSONL Format?

JSONL (newline-delimited JSON) provides:
- Easy version control (line-by-line diffs)
- Simple appending (no need to parse entire file)
- Clear separation of test cases
- Standard format with good tooling support

### Why Versioned Fixtures?

Fixture versioning ensures:
- **Reproducibility**: Re-run old eval results against the same data
- **Change tracking**: See when and why exercises were updated
- **Comparison**: Compare eval performance across fixture versions
- **Safety**: Confidence that tests run in consistent environments

## Extending the System

### Adding New Assertion Types

To add more sophisticated assertions:

1. Extend `ExpectedWorkout` interface in `evals/assertions/workoutAssertions.ts`
2. Update `assertWorkoutStructure` function with new checks
3. Update test case format documentation

Example: Adding reps validation:

```typescript
export interface ExpectedExercise {
  exerciseSlug: string;
  setCount: number;
  repsRange?: [number, number]; // NEW: min/max reps
}
```

### Adding New Datasets

Create additional JSONL files in `evals/datasets/`:

```bash
# Different workout styles
evals/datasets/bodybuilding.jsonl
evals/datasets/powerlifting.jsonl
evals/datasets/crossfit.jsonl

# Edge cases
evals/datasets/edge-cases.jsonl
evals/datasets/malformed-inputs.jsonl
```

Run with:

```bash
npm run eval:parser -- --dataset=bodybuilding.jsonl
```

### Tracking Progress Over Time

Compare results across runs:

```bash
# Run baseline
npm run eval:parser
# Output: evals/results/parser-eval-2024-12-01T10-00-00.json

# Make changes to parser...

# Run again
npm run eval:parser
# Output: evals/results/parser-eval-2024-12-02T15-30-00.json

# Compare
diff evals/results/parser-eval-2024-12-01T10-00-00.json \
     evals/results/parser-eval-2024-12-02T15-30-00.json
```

## Troubleshooting

### "No exercises found in database"

The test database wasn't seeded properly. Ensure:
- `tests/fixtures/exercises_seed.sql` symlink exists
- Symlink points to a valid versioned fixture
- Docker container is running

### "Expected slug X, got Y"

The parser identified a different exercise than expected. This could mean:
- The exercise matching logic changed
- The input is ambiguous
- The test case uses the wrong slug

Check `tests/fixtures/regenerate_fixtures.sh` for the list of seeded exercise names.

### Token usage is 0

The test errored before reaching the parser. Check the error message in the results.

### High failure rate after fixture update

If you regenerated fixtures and many tests fail:
- Exercise slugs may have changed
- Exercises may have been removed
- Update test cases to use new slugs

## Summary

The parser eval system provides:
- ✅ Easy test case management (JSONL format)
- ✅ Scale testing (hundreds of cases)
- ✅ Comprehensive metrics (latency, tokens, correctness)
- ✅ Reproducibility (versioned fixtures)
- ✅ Clear results (detailed pass/fail/error reporting)

Use it to:
- Validate parser correctness at scale
- Track performance over time
- Catch regressions before deployment
- Build confidence in parser changes

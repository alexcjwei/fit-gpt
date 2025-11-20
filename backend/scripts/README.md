# Parser Performance Test Script

## Overview

`testParserPerformance.ts` measures the latency of each stage in the workout parser pipeline.

## Usage

```bash
cd backend
npm run test:parser:performance
```

## What It Measures

The script breaks down the parsing process into 6 stages and times each one:

1. **Pre-Validation** - Validates input is workout content (Haiku LLM)
2. **ID Extraction** - Extracts exercise names and maps to slugs (Multiple Haiku calls + DB)
3. **Structured Parsing** - Parses workout structure (Sonnet LLM)
4. **Semantic Fixing** - Validates/fixes semantic issues (Haiku + Sonnet)
5. **Syntax Fixing** - Validates/fixes schema issues (Sonnet)
6. **Database Formatting** - Converts slugs to IDs and adds UUIDs (DB queries)

## Output

The script provides:
- Duration for each stage (milliseconds and seconds)
- Percentage breakdown of total time
- Visual bar chart of stage durations
- Bottleneck identification (3 slowest stages)
- Final parsed workout JSON

## Sample Workout

The script uses a sample strength training workout with 4 exercises:
- Barbell Bench Press
- Barbell Squat
- Deadlift
- Pull-ups

## Requirements

- PostgreSQL database running
- `.env` file configured with `DATABASE_URL` or PostgreSQL credentials
- `ANTHROPIC_API_KEY` set in environment

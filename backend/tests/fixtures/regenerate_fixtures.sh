#!/bin/bash
# Regenerate exercises_seed.sql with only the exercises needed for tests

set -e

cd "$(dirname "$0")"

echo "Querying database for needed exercises..."

# First, get the exercise IDs we need
EXERCISE_IDS=$(docker exec fit-gpt-postgres psql -U postgres -d fit_gpt_dev -t -A -c "
SELECT array_to_string(array_agg(id), ',')
FROM exercises
WHERE name IN (
  'Barbell Bench Press - Medium Grip',
  'Decline Barbell Bench Press',
  'Barbell Deadlift',
  'Axle Deadlift',
  'Pull-Up',
  'Pullups',
  'Weighted Pull Uns',
  'Dumbbell Bench Press',
  'Barbell Squat',
  'Barbell Back Squat',
  'Jogging-Treadmill',
  'Side Plank',
  'Dead Bug',
  'Incline Bench Press',
  'Bench Press',
  'Romanian Deadlift',
  'Band Assisted Pull-Up',
  'Weighted Pull Ups'
);
")

echo "Found exercise IDs: $EXERCISE_IDS"

if [ -z "$EXERCISE_IDS" ]; then
  echo "Error: No exercises found in database"
  exit 1
fi

# Dump the full tables
echo "Generating full dump..."
docker exec fit-gpt-postgres pg_dump \
  -U postgres \
  -d fit_gpt_dev \
  --data-only \
  --inserts \
  --no-owner \
  --no-privileges \
  -t exercises \
  -t exercise_tags \
  > exercises_seed_full.sql

# Filter to keep only needed exercises
echo "Filtering to keep only needed exercises..."
python3 << EOF
import re

exercise_ids = set('$EXERCISE_IDS'.split(','))
print(f"Filtering for exercise IDs: {exercise_ids}")

with open('exercises_seed_full.sql', 'r') as f:
    lines = f.readlines()

kept_lines = []
for line in lines:
    # Keep headers and comments
    if line.startswith('--') or line.startswith('SET ') or line.startswith('SELECT ') or line.strip() == '':
        kept_lines.append(line)
        continue

    # For exercise inserts, keep only if ID matches
    if 'INSERT INTO public.exercises' in line:
        match = re.search(r'VALUES \((\d+),', line)
        if match and match.group(1) in exercise_ids:
            kept_lines.append(line)
        continue

    # For tag inserts, keep only if exercise_id matches
    if 'INSERT INTO public.exercise_tags' in line:
        match = re.search(r'VALUES \(\d+, (\d+),', line)
        if match and match.group(1) in exercise_ids:
            kept_lines.append(line)
        continue

with open('exercises_seed_new.sql', 'w') as f:
    f.writelines(kept_lines)

print(f"Kept {len(exercise_ids)} exercises")
EOF

# Cleanup
rm exercises_seed_full.sql

echo ""
echo "Comparison:"
echo "Old file: $(wc -l exercises_seed.sql | awk '{print $1}') lines"
echo "New file: $(wc -l exercises_seed_new.sql | awk '{print $1}') lines"
echo ""
echo "Preview of new file (first 30 lines):"
head -30 exercises_seed_new.sql
echo ""
echo "Preview of new file (sample exercises):"
grep "INSERT INTO public.exercises" exercises_seed_new.sql | head -3
echo ""
echo "New fixture generated: exercises_seed_new.sql"
echo "Review the file, then run: mv exercises_seed_new.sql exercises_seed.sql"

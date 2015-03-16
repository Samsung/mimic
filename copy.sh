#!/bin/bash

# scp pinkman01:/scratch/sheule/dev/mimic/tests/out/2015-03-16_10-37-46_short_2/result.json out/result0.json
# scp pinkman01:/scratch/sheule/dev/mimic/tests/out/2015-03-16_11-30-58_short_2/result.json out/result1.json
# scp pinkman02:/scratch/sheule/dev/model-synthesis/tests/out/2015-03-16_10-37-20_short_1/result.json out/result2.json
# scp pinkman02:/scratch/sheule/dev/model-synthesis/tests/out/2015-03-16_11-30-49_short_1/result.json out/result3.json

# scp pinkman01:/scratch/sheule/dev/mimic/tests/out/2015-03-16_02-35-43_longrunning/result.json out/result4.json

./scripts/process.py --exp_backoff out

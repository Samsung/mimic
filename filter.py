#!/usr/bin/python

import sys

for line in sys.stdin:
  if not "prober.ts(6,14): error TS2095: Could not find symbol 'reflect'" in line:
    if not "prober.ts(8,12): error TS2095: Could not find symbol 'Proxy'" in line:
      sys.stderr.write(line)

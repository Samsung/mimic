#!/usr/bin/python

import sys

for line in sys.stdin:
  ignored = [
    "Could not find symbol 'harmonyrefl'.",
    "util/Util.ts",
  ]
  output = True
  for i in ignored:
    if i in line:
      output = False
  if output:
    sys.stderr.write(line)

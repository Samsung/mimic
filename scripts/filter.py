#!/usr/bin/python

import sys

for line in sys.stdin:
  ignored = [
    "Could not find symbol 'harmonyrefl'.",
    "util/Util.ts",
    "Could not find symbol 'describe'.",
    "Could not find symbol 'it'.",
    "Could not find symbol 'ass'.",
    "Module cannot be aliased to a non-module type.",
    "Unable to resolve external module ''assert''."
  ]
  output = True
  for i in ignored:
    if i in line:
      output = False
  if output:
    sys.stderr.write(line)

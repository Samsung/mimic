#!/usr/bin/python

import sys

for line in sys.stdin:
  if not "Could not find symbol 'harmonyrefl'." in line:
    sys.stderr.write(line)

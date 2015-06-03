#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Run an example
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import sys
import os
import time
import argparse
import json
import re
import status
import colors
import multiprocessing
from multiprocessing import Pool
from multiprocessing import Queue
from random import shuffle
import common
import experiment

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  fncs = experiment.parse_functions(os.path.abspath(os.path.dirname(__file__) + "/../tests"))

  if len(sys.argv) == 1:
    print "example - Run an example from the mimic experiment suite with mimic"
    print ""
    print "usage: example <name-of-experiment> [other arguments for mimic]"
    print ""
    print "Examples: " + ", ".join(map(lambda x: x.shortname, fncs))
    sys.exit(1)

  name = sys.argv[1]
  matches = []
  for f in fncs:
    if name == f.shortname:
      matches.append(f)
  if len(matches) == 0:
    print "No example with name '%s' found." % name
    sys.exit(1)
  elif len(matches) > 1:
    print "Found more than one possible match:"
    print "  " + (", ".join(map(lambda x: x.shortname, matches)))
    sys.exit(1)

  f = matches[0]
  command = os.path.abspath(os.path.dirname(__file__) + '/../mimic') + " "
  command += (" ".join(map(lambda x: x if " " not in x else '"' + x + '"', sys.argv[2:]))) + " "
  command += f.get_noncore_command_args()
  sys.exit(os.system(command))

if __name__ == '__main__':
  main()

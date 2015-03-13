#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Collect and process the information from the experiment
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import sys
import os
import time
import argparse
import json
import subprocess
import re
import status
import colors
import multiprocessing
from multiprocessing import Pool
from multiprocessing import Queue

line = "-" * 80
argv = None # the arguments
out = None # the output folder

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Process the data from the synthesize experiment.')
  parser.add_argument('--folder', type=str, help='The folder to process', default="<latest>")

  global argv
  argv = parser.parse_args()

  workdir = os.path.abspath(os.path.dirname(__file__) + "/../tests/out")

  folder = argv.folder
  if folder == "<latest>":
    folders = sorted([workdir + "/" + f for f in os.listdir(workdir) if os.path.isdir(workdir + "/" + f)])
    folder = folders[-1]

  try:
    data = json.loads(open(folder + "/result.json").read())
    print line
    print "Function\tSuccess rate (normal metric)\tSuccess rate (naive metric)"
    print line
    for ex in data:
      results = data[ex]['results']
      print "%s\t\t%s\t\t%s" % (ex, success_rate(results, 0), success_rate(results, 1))
    print line
  except ValueError as ex:
    print "Failed to parse configuration: " + str(ex)
    sys.exit(1)

def success_rate(results, metric=0):
  results = filter(lambda x: x['metric'] == metric, results)
  total = len(results)
  if total == 0:
    return "N/A"
  succ = len(filter(lambda x: x['exitstatus'] == 0, results))
  return "%d / %d (%.2f%%)" % (succ, total, percent(succ, total))

def percent(a, b):
  return 100.0 * float(a) / float(b)

# print a string to a file
def fprint(f, s):
  f = open(f, 'w')
  f.write(s)
  f.close()

# print a string to a file
def fprinta(f, s):
  f = open(f, 'a')
  f.write(s)
  f.close()

def flatten(l):
  return [item for sublist in l for item in sublist]

def execute(cmd, timeout=100000000):
  try:
    out = subprocess.check_output("timeout " + str(timeout) + "s " + cmd, shell=True, stderr=subprocess.STDOUT)
    return (0, out)
  except subprocess.CalledProcessError as ex:
    return (ex.returncode, ex.output)

if __name__ == '__main__':
  main()

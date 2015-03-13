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
    header = ["Function","Success rate (normal)","Success rate (naive)","Time (normal)","Time (naive)"]
    cols = map(lambda x: [], header)
    for ex in data:
      results = data[ex]['results']
      name = ex[ex.rfind(".")+1:]
      cols[0].append(name)
      cols[1].append(success_rate_str(results, 0))
      cols[2].append(success_rate_str(results, 1))
      cols[3].append(succ_time_str(results, 0))
      cols[4].append(succ_time_str(results, 1))
    print_table(header, cols)
  except ValueError as ex:
    print "Failed to parse configuration: " + str(ex)
    sys.exit(1)


def filter_succ(results):
  return filter(lambda x: x['exitstatus'] == 0, results)

def filter_metric(results, metric):
  return filter(lambda x: x['metric'] == metric, results)

def success_rate_str(results, metric=0):
  results = filter_metric(results, metric)
  total = len(results)
  if total == 0:
    return "n/a"
  succ = len(filter_succ(results))
  return "% 4d / %d (%.2f%%)" % (succ, total, percent(succ, total))

def succ_time_str(results, metric):
  succ = filter_metric(filter_succ(results), metric)
  return avg_stats(map(lambda x: x['time'], succ))

def avg(l):
  assert len(l) > 0
  return float(sum(l)) / float(len(l))

def _ss(data):
    """Return sum of square deviations of sequence data."""
    c = avg(data)
    ss = sum((x-c)**2 for x in data)
    return ss

def pstdev(data):
    """Calculates the population standard deviation."""
    n = len(data)
    if n < 2:
        raise ValueError('variance requires at least two data points')
    ss = _ss(data)
    pvar = ss/n # the population variance
    return pvar**0.5

def avg_stats(l):
  if len(l) == 0:
    return "n/a"
  if len(l) == 1:
    return "%.2f" % avg(l)
  return "%.2f ± %.2f" % (avg(l), pstdev(l))


def percent(a, b):
  return 100.0 * float(a) / float(b)

def print_table(header, cols):
  n = len(cols)
  m = len(cols[0])

  def print_row(row):
    for i in range(n):
      sys.stdout.write(row[i] + ((maxwidth[i] + 3 - len(row[i])) * " "))
    print

  maxwidth = map(lambda i: max(map(lambda s: len(s), cols[i] + [header[i]])), range(n))
  print line
  print_row(header)
  print line
  for i in range(m):
    print_row(map(lambda j: cols[j][i], range(n)))
  print line

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

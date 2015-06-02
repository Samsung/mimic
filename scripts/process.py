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
import cPickle
import status
import colors
import multiprocessing
from multiprocessing import Pool
from multiprocessing import Queue
import random

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
    data = cPickle.loads(open(folder + "/result.pickle").read())
    """:type : list[common.MimicResult] """

    functions = {}
    metrics = {}
    for res in data:
      functions[res.f.title] = True
      metrics[res.metric] = True
    print functions.keys()
    print metrics.keys()
    # nummetric = 1
    # header = ["Function"] + [s + " (" + str(i) + ")" for s in ["Success rate", "Time"] for i in range(nummetric)]
    # if nummetric == 2:
    #   diff = []
    #   header.append("Succ Prob Lower By")
    # cols = map(lambda x: [], header)
    # for ex in data:
    #   results = filter_bug(data[ex]['results'])
    #   name = ex[ex.rfind(".")+1:]
    #   cols[0].append(name)
    #   c = 1
    #   if fulltable:
    #     full[ex]['succprob'] = success_rate(results)
    #   for i in range(nummetric):
    #     cols[c].append(success_rate_str(results, i))
    #     c += 1
    #   for i in range(nummetric):
    #     cols[c].append(succ_time_str(results, i))
    #     c += 1
    #   if nummetric == 2:
    #     # calculate difference
    #     a = success_rate(results, 0)
    #     b = success_rate(results, 1)
    #     diff.append(100.0*(a-b)/b)
    #     cols[c].append("%.2f" % (100.0*(a-b)/b))
    # if not fulltable:
    #   print_table(header, cols)
    # if nummetric == 2:
    #   print "Average increase of success probability: %s" % avg_stats(diff)
  except ValueError as ex:
    print "Failed to parse configuration: " + str(ex)
    sys.exit(1)


  # if fulltable:
  #   print "% this is automatically generated content, do not modify"
  #   keys = sorted(full.keys())
  #   keys = keys[3:] + keys[0:3]
  #   header = [
  #     ["Function", "Time to synthesize",
  #      "Success", "Loop"],
  #     ["", "(in seconds)",
  #      "rate", "rank"]
  #   ]
  #   print "\\begin{tabular}{llll}"
  #   space = " & "
  #   endline = "\\\\"
  #   print "\\toprule"
  #   for hr in header:
  #     for h in hr[:-1]:
  #       print "\\textbf{%s} & " % h
  #     print "\\textbf{%s} %s" % (hr[-1], endline)
  #   print "\\midrule"
  #   for k in keys:
  #     nm = full[k]['name']
  #     nm = nm[nm.rfind(".")+1:]
  #     # if nm in ["max", "min", "sum", "shift"]:
  #     #   nm += "$^*$"
  #     print nm
  #     print space
  #     print full[k]['time']
  #     print space
  #     print "%.2f \\%%" % (full[k]['succprob'])
  #     print space
  #     print full[k]['loop']
  #     # print space
  #     # print "%.1f \\%%" % (full[k]['correction'])
  #     print endline
  #   print "\\bottomrule"
  #   print "\\end{tabular}"

def succ_time_str(results, metric):
  return avg_stats(map(lambda x: x['time'], []))

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
  line = (sum(maxwidth) + (len(maxwidth) -1)*3) * "-"
  print line
  print_row(header)
  print line
  for i in range(m):
    print_row(map(lambda j: cols[j][i], range(n)))
  print line

if __name__ == '__main__':
  main()

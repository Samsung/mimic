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
import random

line = "-" * 80
argv = None # the arguments
out = None # the output folder

# ------------------------------------------
# main entry point
# ------------------------------------------

def simulate(all, full_table = None):
  threads = 28
  backoff = 2
  initial_timeout = 3.0
  maxround = 40
  repetitions = 100
  header = ["Function", "Time", "Rounds", "nth loop", "Loop Probability"]
  cols = map(lambda x: [], header)
  avgtimes = []
  for ex in all:
    data = all[ex]
    loop = all[ex][5]['loop']
    cols[0].append(ex)
    cols[3].append(str(loop+1))
    cols[4].append("%.1f%%" % (100.0*loop_correction(loop)))
    if full_table is not None:
      full_table[ex]['correction'] = (100.0*loop_correction(loop))
      full_table[ex]['loop'] = str(loop+1)

    total_rounds = 0.0
    total_time = 0.0
    total_reps = 0
    all_times = []
    for rep in range(repetitions):
      timeout = initial_timeout
      time = 0.0
      for r in range(maxround):
        if timeout < 5.0:
          d = data[5]['times']
        elif timeout < 30.0:
          d = data[30]['times']
        elif timeout < 1200:
          d = data[1200]['times']
        else:
          # not enough data
          print "Did not have enough data for simulation"
          sys.exit(1)
        times = filter(lambda x: x >= 0, choose_k(d, threads, loop))
        if len(times) > 0:
          time += min(times)
          total_rounds += r+1
          total_time += time
          total_reps += 1
          all_times.append(time)
          break
        time += timeout
        timeout *= backoff
    avgtime = float(total_time) / float(total_reps)
    avgtimes.append(avgtime)
    cols[1].append(all_times)
    if full_table is not None:
      full_table[ex]['time'] = avg_stats(all_times)
    cols[2].append(float(total_rounds) / float(total_reps))
  avg = avg_stats(avgtimes)
  cols[1] = map(lambda x: avg_stats(x), cols[1])
  cols[2] = map(lambda x: "%.1f" % x, cols[2])
  if full_table is None:
    print_table(header, cols)
    print "Overall average: %s" % avg

# chooses k samples (and adds timeouts to adjust for loop probabilities)
def choose_k(arr, k, loop):
  res = []
  for i in range(k):
    if random.random() < loop_correction(loop):
      rand = -1
    else:
      rand = random.randint(0, len(arr)-1)
    res.append(arr[rand])
  return res

def main():
  parser = argparse.ArgumentParser(description='Process the data from the synthesize experiment.')
  parser.add_argument('--folder', type=str, help='The folder to process', default="<latest>")
  parser.add_argument('--all', type=str, help='Create the full table', default="")
  parser.add_argument('--metrics', type=int, help='The number of metrics', default=1)
  parser.add_argument('--exp_backoff', type=str, help='The folder with all the data for the exponential backoff strategy', default="")

  global argv
  argv = parser.parse_args()

  workdir = os.path.abspath(os.path.dirname(__file__) + "/../tests/out")

  fulltable = False
  if argv.all != "":
    fulltable = True
    argv.folder = argv.all
    argv.exp_backoff = argv.all

  full = None
  if fulltable:
    random.seed(10)
    full = {}
    for ex in json.loads(open(argv.folder + "/result.json").read()):
      name = ex
      if "handwritten" in ex:
        name = ex[len("Array.handwritten."):]
      full[ex] = {
        'name': name
      }

  all = {}
  if argv.exp_backoff != "":
    for f in [argv.exp_backoff + "/" +f for f in os.listdir(argv.exp_backoff) if os.path.isfile(argv.exp_backoff + "/" + f)]:
      data = json.loads(open(f).read())
      timeout = None
      for ex in data:
        if timeout is None:
          timeouts = filter(lambda x: x['exitstatus'] == 124, data[ex]['results'])
          if len(timeouts) == 0:
            continue
          timeout = int(round(timeouts[0]['time']))
        assert(timeout == 30 or timeout == 5 or timeout == 1200)
        times = map(lambda x: x['time'] if x['exitstatus'] == 0 else -1, filter(lambda x: x['exitstatus'] == 0 or x['exitstatus'] == 124, data[ex]['results']))
        if (ex not in all):
          all[ex] = {}
        if (timeout not in all[ex]):
          all[ex][timeout] = {
            'times': [],
            'loop': data[ex]['results'][0]['loop'],
          }
        all[ex][timeout]['times'] += times
    simulate(all, full)
    if not fulltable:
      sys.exit(0)

  folder = argv.folder
  if folder == "<latest>":
    folders = sorted([workdir + "/" + f for f in os.listdir(workdir) if os.path.isdir(workdir + "/" + f)])
    folder = folders[-1]

  try:
    data = json.loads(open(folder + "/result.json").read())
    nummetric = argv.metrics
    header = ["Function"] + [s + " (" + str(i) + ")" for s in ["Success rate", "Time"] for i in range(nummetric)]
    cols = map(lambda x: [], header)
    for ex in data:
      results = filter_bug(data[ex]['results'])
      name = ex[ex.rfind(".")+1:]
      cols[0].append(name)
      c = 1
      if fulltable:
        full[ex]['succprob'] = success_rate(results)
      for i in range(nummetric):
        cols[c].append(success_rate_str(results, i))
        c += 1
      for i in range(nummetric):
        cols[c].append(succ_time_str(results, i))
        c += 1
    if not fulltable:
      print_table(header, cols)
  except ValueError as ex:
    print "Failed to parse configuration: " + str(ex)
    sys.exit(1)


  if fulltable:
    print "% this is automatically generated content, do not modify"
    keys = sorted(full.keys())
    keys = keys[3:] + keys[0:3]
    header = [
      ["Function", "Time to synthesize",
       "Success", "Loop"],
      ["", "(in seconds)",
       "rate", "rank"]
    ]
    print "\\begin{tabular}{llll}"
    space = " & "
    endline = "\\\\"
    print "\\toprule"
    for hr in header:
      for h in hr[:-1]:
        print "\\textbf{%s} & " % h
      print "\\textbf{%s} %s" % (hr[-1], endline)
    print "\\midrule"
    for k in keys:
      nm = full[k]['name']
      if nm in ["max", "min", "sum"]:
        nm += "$^*$"
      print nm[nm.rfind(".")+1:]
      print space
      print full[k]['time']
      print space
      print "%.2f \\%%" % (full[k]['succprob'])
      print space
      print full[k]['loop']
      # print space
      # print "%.1f \\%%" % (full[k]['correction'])
      print endline
    print "\\bottomrule"
    print "\\end{tabular}"

def filter_succ(results):
  return filter(lambda x: x['exitstatus'] == 0, results)

def filter_bug(results):
  return filter(lambda x: x['exitstatus'] == 0 or x['exitstatus'] == 124, results)

def filter_metric(results, metric):
  return filter(lambda x: x['metric'] == metric, results)

def loop_correction(loop):
  aloop = 0.9
  a = 0.7
  correction = aloop * a * pow(1 - a, loop)
  return correction

def success_rate_str(results, metric=0):
  results = filter_metric(results, metric)
  total = len(results)
  if total == 0:
    return "n/a"
  loop = results[0]['loop']
  succ = len(filter_succ(results))
  # adjust success rate
  correction = loop_correction(loop)
  p = correction * percent(succ, total)
  return "% 4d / %d (%.2f%%)" % (succ, total, p)

def success_rate(results, metric=0):
  results = filter_metric(results, metric)
  total = len(results)
  if total == 0:
    return "n/a"
  loop = results[0]['loop']
  succ = len(filter_succ(results))
  # adjust success rate
  correction = loop_correction(loop)
  p = correction * percent(succ, total)
  return p

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
  line = (sum(maxwidth) + (len(maxwidth) -1)*3) * "-"
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

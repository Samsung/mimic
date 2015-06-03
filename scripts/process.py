#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Collect and process the information from the experiment
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------
import codecs

import sys
import os
import argparse
import cPickle
import common

line = "-" * 80
argv = None # the arguments
out = None # the output folder

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Process the data from the synthesize experiment.')
  parser.add_argument('--folder', type=str, help='The folder to process', default="<latest>")
  parser.add_argument('--out', type=str, help='The file to store the LaTeX table', default="../paper/table.tex")

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
  except ValueError as ex:
    print "Failed to parse configuration: " + str(ex)
    sys.exit(1)

  lookup = {}
  metrics = {}
  for res in data:
    lookup[res.f.title] = res
    metrics[res.metric] = True
  functions = sorted(lookup.keys())
  functions = functions[3:] + functions[0:3]
  metrics = sorted(metrics.keys())

  slowdowns = []
  averages = []
  header = ["Function"]
  for m in metrics:
    time = "Time"
    if len(metrics) > 1:
      if m == 0:
        time += " (normal metric)"
      else:
        time += " (naive metric)"
    header.append(time)
  if len(metrics) > 1:
    for i in range(len(metrics)-1):
      header.append("Slowdown")
  header.append("Loop rank")
  cols = map(lambda x: [], header)
  for f in functions:
    fdata = filter_data(data, f)
    cols[0].append(fdata[0].f.shortname)
    c = 1
    raw = range(len(metrics))
    for m in metrics:
      fmdata = filter_data(data, f, m)
      times = map(lambda x: x.total_time, fmdata)
      raw[m] = avg(times) if len(times) > 0 else None
      if m == 0 and raw[m] is not None:
        averages.append(raw[m])
      cols[c].append(avg_stats(times))
      c += 1
    if len(metrics) > 1:
      base = raw[0]
      for i in range(len(metrics)-1):
        alt = raw[i+1]
        if base is None or alt is None:
          cols[c].append("n/a")
        else:
          sd = (alt - base) / base * 100
          cols[c].append("%.2f%%" % (sd))
          slowdowns.append(sd)
        c += 1
    cols[c].append(str(fdata[0].loop_index))

  print_table(header, cols)
  print ""
  print "Overall average: %s seconds" % (avg_stats(averages))
  print "Overall minimum: %.2f seconds" % (min(averages))
  print "Overall maximum: %.2f seconds" % (max(averages))
  print ""
  print "Slowdown average: %s percent" % (avg_stats(slowdowns))
  print "Slowdown minimum: %.2f%%" % (min(slowdowns))
  print "Slowdown maximum: %.2f%%" % (max(slowdowns))

  s = "% this is automatically generated content, do not modify"
  header = [
    ["Function", "Time to synthesize", "Loop"],
    ["", "(in seconds)", "rank"]
  ]
  s += "\n" + "\\begin{tabular}{lll}"
  space = " & "
  endline = "\\\\"
  s += "\n" + "\\toprule"
  for hr in header:
    for h in hr[:-1]:
      s += "\n" + "\\textbf{%s} & " % h
    s += "\n" + "\\textbf{%s} %s" % (hr[-1], endline)
  s += "\n" + "\\midrule"
  for k in functions:
    fdata = filter_data(data, k, 0)
    nm = fdata[0].f.shortname
    # if nm in ["max", "min", "sum", "shift"]:
    #   nm += "$^*$"
    s += "\n" + nm
    s += "\n" + space
    times = map(lambda x: x.total_time, fdata)
    s += "\n" + avg_stats(times)
    s += "\n" + space
    s += "\n" + str(fdata[0].loop_index)
    s += "\n" + endline
  s += "\n" + "\\bottomrule"
  s += "\n" + "\\end{tabular}"

  file = codecs.open(argv.out, "w", "utf-8")
  file.write(s)
  file.close()

def filter_data(data, f, m=None):
  """
  :type data: list[common.MimicResult]
  :type f: str
  :type m: int
  :rtype: list[common.MimicResult]
  """
  res = []
  for d in data:
    if d.f.title != f: continue
    if m is not None and m != d.metric: continue
    res.append(d)
  return res


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
    return u"n/a"
  if len(l) == 1:
    return u"%.2f" % avg(l)
  return u"%.2f ± %.2f" % (avg(l), pstdev(l))


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

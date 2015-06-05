#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Run experiment
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import sys
import os
import argparse
import json
import re
import status
from random import shuffle
import common
import run
import cPickle

line = "-" * 80
q = None # the queue used for communication
argv = None # the arguments
out = None # the output folder
base_command = './mimic synth --iterations 100000000'

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Run synthesis experiment.')
  parser.add_argument('-n', type=int, help='Number of repetitions', default=10)
  parser.add_argument('--filter', type=str, help='Filter which experiments to run', default="")
  parser.add_argument('--exclude', type=str, help='Exclude some experiments', default="")
  parser.add_argument('--exp_name', type=str, help='Name of this experiment', default="")
  parser.add_argument('--args', type=str, help='Arguments to be passed to mimic', default="")
  parser.add_argument('--metric', type=str, help='Which metric should be used during search?  Comma-separated list', default="0")

  global argv
  argv = parser.parse_args()

  workdir = os.path.abspath(os.path.dirname(__file__) + "/../tests")
  n = argv.n

  metrics = map(lambda x: int(x), argv.metric.split(","))

  global base_command
  if argv.args != "":
    base_command = base_command + " " + argv.args

  fncs = parse_functions(workdir, argv.filter, argv.exclude)

  # create a directory to store information
  global out
  out = workdir + "/out"
  if not os.path.exists(out):
    os.mkdir(out)
  timefordir = common.get_time(True)
  out = out + "/" + timefordir
  if argv.exp_name != "":
    out = out + "_" + argv.exp_name
  if os.path.exists(out):
    print "ERROR, out directory exists already: " + out
    sys.exit(1)
  os.mkdir(out)
  logfile = out + "/readme.txt"

  # run the experiment
  tasks = []
  c = 0
  print ""
  for f, i, m in [(f, i, m) for f in fncs for i in range(n) for m in metrics]:
    tasks.append((c, f, i, m))
    c += 1
  shuffle(tasks) # shuffle tasks
  results = []
  print "Running experiment..."
  def get_details():
    s = ""
    s += "  function(s):        %d" % len(fncs)
    s += "\n  repetitions:        %d" % n
    s += "\n  output directory:   %s" % out[out.find("/tests/")+1:]
    return s
  print get_details()
  common.fprint(logfile, "Arguments: " + " ".join(sys.argv) + "\n")
  common.fprinta(logfile, "Time: " + common.get_time() + "\n")
  common.fprinta(logfile, get_details() + "\n" + line + "\n")
  print line
  stat = status.get_status()
  stat.set_message("Running experiment...")
  stat.init_progress(len(tasks))
  for c, f, i, m in tasks:
    stat.writeln("Running mimic for %s..." % (f.shortname))
    res = run.mimic(f, metric=m, cleanup=0)
    stat.writeln("  done in %.2f seconds and %d searches" % (res.total_time, res.total_searches))
    stat.inc_progress(force_update=True)
    results.append(res)
    jn = cPickle.dumps(results)
    common.fprint(out + "/result.pickle", jn)
  stat.end_progress()
  print line
  print "Finished experiment:"
  print get_details()
  common.fprinta(logfile, "Time: " + common.get_time() + "\n")


def send_msg(id, msg, color=False):
  global q
  q.put((2 if color else 1, id, msg))

def send_result(id, f, o):
  global q
  q.put((3, id, f, o))

def send_done(id):
  global q
  q.put((0, id, "done"))

def parse_functions(workdir, filter="", exclude=""):
  """
  :rtype : list[common.Function]
  """
  result = []
  categories = []
  for f in os.listdir(workdir):
    if os.path.isfile(workdir + "/" + f):
      categories.append(f)

  for e in categories:
    category = e[0:-5].replace("/", "-")
    try:
      examples = json.loads(open(workdir + "/" + e).read())
    except ValueError as ex:
      print "Failed to parse configuration: " + str(ex)
      sys.exit(1)
    for example in examples:
      if filter != "" and re.search(filter, example['name'], re.UNICODE) is None:
        continue
      if exclude != "" and re.search(exclude, example['name'], re.UNICODE) is not None:
        continue
      result.append(common.Function(example, category))
  return result


if __name__ == '__main__':
  main()

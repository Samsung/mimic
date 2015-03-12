#!/usr/bin/python

# ------------------------------------------------------------------------------
#
# Run experiment
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import sys
import os
import time
import argparse
import json
import threading
import subprocess
import shutil
import re
import signal

# ------------------------------------------
# main entry point
# ------------------------------------------

def get_time():
  return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())

def main():
  parser = argparse.ArgumentParser(description='Run synthesis experiment.')
  parser.add_argument('-n', type=int, help='Number of repetitions', default=5)
  parser.add_argument('--filter', type=str, help='Filter which experiments to run', default="")
  parser.add_argument('-r', '--run', help='Only run the first experiment.  Usually used together with --filter', action='store_true')
  parser.add_argument('--verify', help='Verify that all experiments are successful at least some of the time', action='store_true')

  argv = parser.parse_args()

  workdir = os.path.abspath(os.path.dirname(__file__) + "/../tests")
  n = argv.n


  only_run = argv.run
  verify = argv.verify
  if only_run and verify:
    print "Cannot both --run and --verify"
    sys.exit(1)

  # create a directory to store information
  out = ""
  if not only_run:
    out = workdir + "/out"
    if not os.path.exists(out):
      os.mkdir(out)
    out = out + "/" + time.strftime("%Y-%m-%d_%H-%M-%S", time.gmtime())
    if os.path.exists(out):
      print "ERROR, out directory exists already: " + out
      sys.exit(1)
    os.mkdir(out)

  categories = []
  for f in os.listdir(workdir):
    if os.path.isfile(workdir + "/" + f):
      categories.append(f)

  line = "-" * 80
  for e in categories:
    category = e[0:-5].replace("/", "-")
    try:
      examples = json.loads(open(workdir + "/" + e).read())
    except ValueError as ex:
      print "Failed to parse configuration: " + str(ex)
      sys.exit(1)
    for example in examples:
      title = example['name']
      if argv.filter != "" and re.search(argv.filter, title, re.UNICODE) is None:
        continue
      name = title[title.rfind(".")+1:]
      function = "\n".join(example['function'])
      argnames = example['argnames']
      arguments = example['arguments']
      if not only_run:
        print line
        print "Experiment: " + title
      args = '"' + ('" "'.join(arguments)) + '"'
      succ_time = 0.0
      succ_count = 0
      succ_iterations = 0
      for i in range(n):
        more = ""
        if "loop" in example:
          more = " --loop " + str(example['loop'])
        if only_run:
          command = './model-synth synth ' + more + ' --cleanup 1000 --iterations 100000000 "%s" "%s" %s' % (argnames, function, args)
          print command
          os.system(command)
          sys.exit(0)
        sys.stdout.write('  Running try #' + str(i+1))
        sys.stdout.flush()
        t = time.time()
        command = './model-synth synth ' + more + ' --out "%s/%s-%s-%d.js" "%s" "%s" %s' % (out, category, name, i, argnames, function, args)
        val, output = execute(command, 60)
        elapsed_time = time.time() - t
        print ". Exit status %d after %.2f seconds." % (val, elapsed_time)
        if val == 0:
          succ_count += 1
          if verify:
            break
          succ_time += elapsed_time
          iters = int([m.group(1) for m in re.finditer('Found in ([0-9]+) iteration', output)][-1])
          succ_iterations += iters
      if verify:
        if succ_count == 0:
          print "ERROR: didn't succeed :("
      else:
        print "Success rate: %.2f%%" % (float(succ_count) * 100.0/float(n))
        if succ_count > 0:
          print "Average time until success: %.2f seconds" % (succ_time / float(succ_count))
          print "Average iterations until success: %.1f" % (float(succ_iterations) / float(succ_count))
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

def execute(cmd, timeout=100000000):
  try:
    out = subprocess.check_output("timeout " + str(timeout) + "s " + cmd, shell=True, stderr=subprocess.STDOUT)
    return (0, out)
  except subprocess.CalledProcessError as ex:
    return (ex.returncode, ex.output)

if __name__ == '__main__':
  main()

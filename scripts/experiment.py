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
  parser.add_argument('-n', type=int, help='Number of repetitions', default=10)
  parser.add_argument('--timeout', type=int, help='Timeout in seconds', default=60)
  parser.add_argument('--filter', type=str, help='Filter which experiments to run', default="")
  parser.add_argument('-r', '--run', help='Only run the first experiment.  Usually used together with --filter', action='store_true')
  parser.add_argument('--verify', help='Verify that all experiments are successful at least some of the time', action='store_true')

  argv = parser.parse_args()

  workdir = os.path.abspath(os.path.dirname(__file__) + "/../tests")
  n = argv.n

  line = "-" * 80

  only_run = argv.run
  verify = argv.verify
  if only_run and verify:
    print "Cannot both --run and --verify"
    sys.exit(1)

  fncs = parse_functions(workdir, argv.filter)
  if only_run:
    f = fncs[0]
    command = './model-synth synth --cleanup 1000 --iterations 100000000 ' + f.get_command_args()
    print "Running the example: " + f.title
    print command
    print line
    sys.exit(os.system(command))

  # create a directory to store information
  out = workdir + "/out"
  if not os.path.exists(out):
    os.mkdir(out)
  out = out + "/" + time.strftime("%Y-%m-%d_%H-%M-%S", time.gmtime())
  if os.path.exists(out):
    print "ERROR, out directory exists already: " + out
    sys.exit(1)
  os.mkdir(out)

  for f in fncs:
    print line
    print "Experiment: " + f.title
    succ_time = 0.0
    succ_count = 0
    succ_iterations = 0
    for i in range(n):
      sys.stdout.write('  Running try #' + str(i+1))
      sys.stdout.flush()
      t = time.time()
      command = './model-synth synth --iterations 100000000 --out "%s/%s-%s-%d.js" %s' % (out, f.category, f.name, i, f.get_command_args())
      val, output = execute(command, argv.timeout)
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

# a function that we might want to synthesize
class Function(object):
  def __init__(self, data, category):
    self.category = category
    self.title = data['name']
    self.name = self.title[self.title.rfind(".")+1:]
    self.code = "\n".join(data['function'])
    self.argnames = data['argnames']
    self.arguments = data['arguments']
    if "loop" in data:
      self.loop = data['loop']
    else:
      self.loop = None

  def get_command_args(self):
    args = '"' + ('" "'.join(self.arguments)) + '"'
    res = '"%s" "%s" %s' % (self.argnames, self.code, args)
    if self.loop is None:
      return res
    else:
      return "--loop " + str(self.loop) + " " + res

def parse_functions(workdir, filter = None):
  """
  :rtype : list[Function]
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
      if filter != None and filter != "" and re.search(filter, example['name'], re.UNICODE) is None:
        continue
      result.append(Function(example, category))
  return result

def execute(cmd, timeout=100000000):
  try:
    out = subprocess.check_output("timeout " + str(timeout) + "s " + cmd, shell=True, stderr=subprocess.STDOUT)
    return (0, out)
  except subprocess.CalledProcessError as ex:
    return (ex.returncode, ex.output)

if __name__ == '__main__':
  main()

#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Run mimic
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
from random import shuffle
import tempfile
import common

line = "-" * 80
q = None # the queue used for communication
argv = None # the arguments
out = None # the output folder
base_command = os.path.abspath(os.path.dirname(__file__) + '/../mimic') + ' synth --iterations 100000000'

f = None
""":type : common.Function """

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Run Mimic.')
  parser.add_argument('-t', '--threads', type=int, help='Number of threads (-1 = 1/2 of cores available)', default=-1)
  parser.add_argument('--function', type=str, help='The function body of the opaque code', required=True)
  parser.add_argument('--argnames', type=str, help='The name of the arguments', default="self, arg0, arg1, arg2, arg3, arg4, arg5, arg6")
  parser.add_argument('--arguments', nargs='+', type=str, help='A list of arguments (as an array of arrays)', required=True)
  parser.add_argument('--args', type=str, help='Arguments to be passed to single-mimic', default="")
  parser.add_argument('--out', type=str, help='Location where the resulting function should be written to', default="result.js")

  global argv
  argv = parser.parse_args()

  global base_command
  if argv.args != "":
    base_command = base_command + " " + argv.args

  # create a directory to store information
  global out
  out = tempfile.mkdtemp()

  threads = argv.threads
  if threads < 0:
    threads = multiprocessing.cpu_count() / 2

  # the function to run
  global f
  f = common.Function.make(argv.argnames, argv.arguments, argv.function)

  # start the actual run
  tasks = []
  timeout = 2
  for i in range(threads):
    tasks.append((i, timeout))
  results = {}
  global q
  q = Queue()
  pool = Pool(processes=threads, maxtasksperchild=1)
  pool.map_async(run_single_mimic, tasks)
  done = 0
  success = False
  while True:
    data = q.get()
    if data[0] == 0 and data[2] == "done":
      done += 1
      if done == len(tasks):
        break
      continue
    if data[0] == 1:
      # process result
      id = data[1]
      result = data[2]
      if result.success:
        success = True
        # kill all other tasks
        pool.close()
        pool.terminate()
        pool.join()
        # print result
        with open(result.code) as f:
          print "".join(f.readlines())
        # done
        break
      else:
        pass
    else:
      print data
      assert False # unexpected message format
  if not success:
    pool.close()
    pool.join()


def send_result(id, result):
  global q
  q.put((1, id, result))

def send_done(id):
  global q
  q.put((0, id, "done"))

def run_single_mimic(data):
  id, timeout = data
  filename = "%s/result-%d.js" % (out, id)
  t = time.time()
  command = '%s --colors 0 --out "%s" %s' % (base_command, filename, f.get_command_args())
  exitstatus, output = common.execute(command, timeout)
  elapsed_time = time.time() - t
  if exitstatus == 0:
    iters = int([m.group(1) for m in re.finditer('Found in ([0-9]+) iteration', output)][-1])
    # res = "%s: success after %.2f seconds and %d iterations [%.1f iterations/second]" % (f.shortname, elapsed_time, iters, float(iters)/elapsed_time)
    res = Success(output, filename, iters)
  elif exitstatus == 124:
    res = Failure(output, 124)
  else:
    res = Failure(output, exitstatus)
  send_result(id, res)
  send_done(id)

class Result(object):
  def __init__(self, output, success):
    self.output = output
    self.success = success

class Success(Result):
  def __init__(self, output, code, iterations):
    self.code = code
    self.iterations = iterations
    Result.__init__(self, output, True)

  def __repr__(self):
    return "Success()"

class Failure(Result):
  def __init__(self, output, status):
    self.status = status
    Result.__init__(self, output, False)

  def __repr__(self):
    return "Failure(%d)" % self.status


if __name__ == '__main__':
  main()

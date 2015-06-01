#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Run mimic
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import os
import time
import argparse
import re
import colors
import multiprocessing
from multiprocessing import Pool
from multiprocessing import Queue
import tempfile
import common
import sys
import shutil

line = colors.grey("-" * 80)
q = None # the queue used for communication
argv = None # the arguments
out = None # the output folder
base_command = os.path.abspath(os.path.dirname(__file__) + '/../mimic-core') + ' synth --iterations 100000000'

f = None
""":type : common.Function """

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Run Mimic.')
  parser.add_argument('-t', '--threads', type=int, help='Number of threads (-1 = 1/2 of cores available)', default=-1)
  parser.add_argument('--function', type=str, help='The function body of the opaque code', required=True)
  parser.add_argument('--argnames', type=str, help='The name of the arguments', default="arg0, arg1, arg2, arg3, arg4, arg5, arg6")
  parser.add_argument('--arguments', nargs='+', type=str, help='A list of arguments (as an array of arrays)', required=True)
  parser.add_argument('--args', type=str, help='Arguments to be passed to mimic-core', default="")
  parser.add_argument('--out', type=str, help='Location where the resulting function should be written to', default="result.js")
  parser.add_argument('--nocolor', help='Don\'t use any color in the output', action='store_true')
  parser.add_argument('--debug', help='Output debug information, and only do a single run of mimic-core', action='store_true')

  global argv
  argv = parser.parse_args()

  global base_command
  if argv.args != "":
    base_command = base_command + " " + argv.args

  if argv.nocolor:
    colors.no_color = True

  # create a directory to store information
  global out
  out = tempfile.mkdtemp()

  threads = argv.threads
  if threads < 0:
    threads = multiprocessing.cpu_count() / 2

  # the function to run
  global f
  f = common.Function.make(argv.argnames, argv.arguments, argv.function)

  # header
  print "mimic - computing modesl for opaque code"
  print colors.grey(line)
  print colors.grey("Configuration:")
  print colors.grey("  Number of threads: %d" % (threads))
  print line

  if argv.debug:
    print colors.grey("Running in debug mode")
    print colors.grey(line)
    run_mimic_core((0, 1200), debug=True)

  # the main loop
  success = False
  results = {}
  t0 = 3
  factor = 2
  rep = 0
  total_attempts = 0
  start = time.time()
  error_count = 0
  error_out = ""
  while success == False:
    timeout = t0 * pow(factor, rep)
    print colors.grey("Starting phase %d with a timeout of %d seconds..." % (rep+1, timeout))
    tasks = []
    total_attempts += threads
    for i in range(threads):
      tasks.append((i, timeout))
    global q
    q = Queue()
    pool = Pool(processes=threads, maxtasksperchild=1)
    pool.map_async(run_mimic_core, tasks)
    done_count = 0
    while True:
      data = q.get()
      if data[0] == 0 and data[2] == "done":
        done_count += 1
        if done_count == len(tasks):
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
          print colors.grey(line)
          print colors.green(u"Successfully found a model")
          print "  Time required:                              %.2f seconds" % (time.time() - start)
          print "  Attempted searches:                         %d" % total_attempts
          print "  Successful searches:                        1"
          print "  Attempted searches that ended in a timeout: %d" % (total_attempts-1)
          print "  Search iteration of the successful search:  %d" % result.iterations
          print ""
          print "Model (also stored in '%s'):" % argv.out
          with open(result.code) as f:
            print colors.yellow("".join(f.readlines()))
          shutil.move(result.code, argv.out)
          # done
          break
        else:
          if result.status == 2:
            # definitely a user error
            print colors.red("Error in mimic-core:")
            print result.output
            pool.close()
            pool.terminate()
            pool.join()
            exit(1)
          if not result.timeout:
            error_count += 1
            error_out = result.output
      else:
        print data
        print "unexpected message format"
        assert False
    if total_attempts > 5 and float(error_count) / float(total_attempts) >= 0.5:
      print colors.red("Found too many errors recently.  Output from mimic-core:")
      print error_out
      sys.exit(1)
    if not success:
      pool.close()
      pool.join()
    rep += 1


def send_result(id, result):
  global q
  q.put((1, id, result))

def send_done(id):
  global q
  q.put((0, id, "done"))

def run_mimic_core(data, debug=False):
  id, timeout = data
  filename = "%s/result-%d.js" % (out, id)
  t = time.time()
  col = "--colors 0"
  if debug and not argv.nocolor:
    col = "--verbose"
  command = '%s %s --out "%s" %s' % (base_command, col, filename, f.get_command_args())
  if debug:
    print colors.grey("Command to run")
    print command
    print colors.grey("Handing control to a single instance of mimic-core, which may or may not succeed")
    print colors.grey(line)
    sys.exit(os.system(command))
  exitstatus, output = common.execute(command, timeout)
  elapsed_time = time.time() - t
  if exitstatus == 0:
    iters = int([m.group(1) for m in re.finditer('Found in ([0-9]+) iteration', output)][-1])
    # res = "%s: success after %.2f seconds and %d iterations [%.1f iterations/second]" % (f.shortname, elapsed_time, iters, float(iters)/elapsed_time)
    res = Success(output, filename, iters)
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
    self.timeout = status == 124
    Result.__init__(self, output, False)

  def __repr__(self):
    return "Failure(%d)" % self.status


if __name__ == '__main__':
  main()

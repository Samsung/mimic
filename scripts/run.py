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
parallel_t0_default = 3
parallel_f_default = 1.025

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Run Mimic to compute models for opaque code',
                                   formatter_class=argparse.ArgumentDefaultsHelpFormatter)
  parser.add_argument('-t', '--threads', metavar="<n>", type=int,
                      help='Number of threads (-1 = number of cores available)', default=-1)
  parser.add_argument('--function', type=str,
                      metavar="<body>",
                      help='The function body of the opaque code (as JavaScript source code)', required=True)
  parser.add_argument('--arguments', nargs='+', type=str,
                      help='One (or more) initial inputs to the opaque code as a comma-separated list',
                      metavar="<arglist>",
                      required=True)
  parser.add_argument('--argnames', type=str, help='The name of the arguments',
                      metavar="<names>",
                      default="arg0, arg1, arg2, arg3, arg4, arg5, arg6")
  parser.add_argument('--args',
                      metavar='<args>',
                      type=str, help='Arguments to be passed to mimic-core', default="")
  parser.add_argument('--metric', metavar="<m>", type=int, help='The metric to use (0 for default, 1 for naive metric)',
                      default=0)
  parser.add_argument('--out', type=str, help='Location where the resulting function should be written to',
                      default="result.js")
  parser.add_argument('--nocolor', help='Don\'t use any color in the output', action='store_true')
  parser.add_argument('--debug', help='Output debug information, and only do a single run of mimic-core',
                      action='store_true')
  parser.add_argument('--parallel_t0', metavar="<t0>", type=int, help='The timeout to be used in the first phase',
                      default=parallel_t0_default)
  parser.add_argument('--parallel_f', metavar="<f>", type=float,
                      help='The factor with which to increase the timeout (based on a single thread, and scaled appropriately for more threads)',
                      default=parallel_f_default)

  global argv
  argv = parser.parse_args()

  global base_command
  if argv.args != "":
    base_command = base_command + " " + argv.args

  if argv.nocolor:
    colors.no_color = True

  out_file = argv.out

  # the function to run
  f = common.Function.make(argv.argnames, argv.arguments, argv.function)

  # header
  print "mimic - computing models for opaque code"
  print colors.grey(line)
  print colors.grey("Configuration:")
  print colors.grey("  Number of threads: %d" % (argv.threads if argv.threads < 0 else multiprocessing.cpu_count()))
  print line

  if argv.debug:
    print colors.grey("Running in debug mode")
    print colors.grey(line)
    run_mimic_core((0, f, 1200, argv.metric), debug=True, filename=argv.out)
    return

  result = mimic(f, argv.metric, argv.threads, False, argv.parallel_t0, argv.parallel_f)
  print colors.grey(line)
  print "Successfully found a model"
  print result.get_status("  ")
  print ""
  print "Model (also stored in '%s'):" % out_file
  print colors.green(result.result_code)
  shutil.move(result.result_file, out_file)

def mimic(f, metric=0, threads=-1, silent=True, parallel_t0=parallel_t0_default, parallel_f=parallel_f_default):
  if threads < 0:
    threads = multiprocessing.cpu_count()
  t0 = parallel_t0
  factor = pow(parallel_f, threads)
  # create a directory to store information
  global out
  out = tempfile.mkdtemp()
  success = False
  rep = 0
  total_attempts = 0
  total_crashes = 0
  start = time.time()
  error_count = 0
  error_out = ""
  while success == False:
    timeout = round(t0 * pow(factor, rep))
    if not silent:
      print colors.grey("Starting phase %d with a timeout of %d seconds..." % (rep + 1, timeout))
    tasks = []
    total_attempts += threads
    for i in range(threads):
      tasks.append((i, f, timeout, metric))
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
        core_result = data[2]
        if core_result.success:
          success = True
          # kill all other tasks
          pool.close()
          pool.terminate()
          pool.join()
          # return result
          code = ""
          with open(core_result.code) as fl:
            code = "".join(fl.readlines())
          result = common.MimicResult(f, core_result.metric, time.time() - start, core_result.iterations, core_result.core_time,
                                      total_attempts, total_crashes, core_result.loop_index, core_result.code, code)
          return result
        else:
          if not core_result.timeout:
            total_crashes += 1
          if core_result.status == 2:
            # definitely a user error
            print colors.red("Error in mimic-core:")
            print core_result.output
            pool.close()
            pool.terminate()
            pool.join()
            exit(1)
          if not core_result.timeout:
            error_count += 1
            error_out = core_result.output
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
  q.put((1, id, result))

def send_done(id):
  q.put((0, id, "done"))

def run_mimic_core(data, debug=False, filename=None):
  id, f, timeout, metric = data
  fn = "%s/result-%d.js" % (out, id)
  if filename is not None:
    fn = filename
  t = time.time()
  col = "--colors 0"
  if debug:
    col = "--verbose"
  command = '%s %s --metric %d --out "%s" %s' % (base_command, col, metric, fn, f.get_command_args())
  if debug:
    print colors.grey("Command to run")
    print command
    print colors.grey("Handing control to a single instance of mimic-core, which may or may not succeed")
    print colors.grey(line)
    sys.exit(os.system(command))
  exitstatus, output = common.execute(command, timeout)
  elapsed_time = time.time() - t
  if exitstatus == 0:
    iters = int([m.group(1) for m in re.finditer('Found in ([0-9]+) iterations', output)][-1])
    core_time = float([m.group(1) for m in re.finditer('and ([0-9.]+) seconds', output)][-1])
    loop_index = -1
    if "loop-free" not in output:
      loop_index = int(re.search('using the loop template with index: ([0-9]+)', output).group(1))
    # res = "%s: success after %.2f seconds and %d iterations [%.1f iterations/second]" % (f.shortname, elapsed_time, iters, float(iters)/elapsed_time)
    res = CoreSuccess(output, metric, fn, iters, core_time, loop_index)
  else:
    res = CoreFailure(output, metric, exitstatus)
  send_result(id, res)
  send_done(id)

class CoreResult(object):
  def __init__(self, output, success, metric):
    self.output = output
    self.success = success
    self.metric = metric

class CoreSuccess(CoreResult):
  def __init__(self, output, metric, code, iterations, core_time, loop_index):
    CoreResult.__init__(self, output, True, metric)
    self.code = code
    self.iterations = iterations
    self.core_time = core_time
    self.loop_index = loop_index

  def __repr__(self):
    return "Success()"

class CoreFailure(CoreResult):
  def __init__(self, output, metric, status):
    self.status = status
    self.timeout = status == 124
    CoreResult.__init__(self, output, False, metric)

  def __repr__(self):
    return "Failure(%d)" % self.status


if __name__ == '__main__':
  main()

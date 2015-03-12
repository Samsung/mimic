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
base_command = './model-synth synth --iterations 100000000 --colors 0'
q = None # the queue used for communication
argv = None # the arguments
out = None # the output folder

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Run synthesis experiment.')
  parser.add_argument('-n', type=int, help='Number of repetitions', default=10)
  parser.add_argument('-t', '--threads', type=int, help='Number of threads (-1 = 1/2 of cores available)', default=-1)
  parser.add_argument('--timeout', type=int, help='Timeout in seconds', default=60)
  parser.add_argument('--filter', type=str, help='Filter which experiments to run', default="")
  parser.add_argument('-r', '--run', help='Only run the first experiment.  Usually used together with --filter', action='store_true')
  parser.add_argument('--verify', help='Verify that all experiments are successful at least some of the time', action='store_true')

  global argv
  argv = parser.parse_args()

  workdir = os.path.abspath(os.path.dirname(__file__) + "/../tests")
  n = argv.n

  only_run = argv.run
  verify = argv.verify
  if only_run and verify:
    print "Cannot both --run and --verify"
    sys.exit(1)

  fncs = parse_functions(workdir, argv.filter)
  if only_run:
    f = fncs[0]
    command = base_command + ' --cleanup 1000 ' + f.get_command_args()
    print "Running the example: " + f.title
    print command
    print line
    sys.exit(os.system(command))

  # create a directory to store information
  global out
  out = workdir + "/out"
  if not os.path.exists(out):
    os.mkdir(out)
  timefordir = time.strftime("%Y-%m-%d_%H-%M-%S", time.localtime())
  out = out + "/" + timefordir
  if os.path.exists(out):
    print "ERROR, out directory exists already: " + out
    sys.exit(1)
  os.mkdir(out)

  threads = argv.threads
  if threads < 0:
    threads = multiprocessing.cpu_count() / 2

  # run the experiment
  tasks = []
  c = 0
  print
  for f, i in flatten(map(lambda f: map(lambda i: (f, i), range(n)), fncs)):
    tasks.append((c, f, i))
    c += 1
  results = {}
  print "Running experiment..."
  print "  function(s):        %d" % len(fncs)
  print "  repetitions:        %d" % n
  print "  timeout:            %s seconds" % argv.timeout
  print "  number of threads:  %d" % threads
  print "  output directory:   tests/out/%s" % timefordir
  print line
  success = 0
  nosuccess = 0
  stat = status.get_status()
  stat.set_message("Working...")
  stat.init_progress(len(tasks))
  global q
  q = Queue()
  pool = Pool(processes=threads, maxtasksperchild=1)
  pool.map_async(run_experiment, tasks)
  done = 0
  while True:
    data = q.get()
    if data[0] == 0 and data[2] == "done":
      done += 1
      stat.inc_progress(force_update=True)
      if done == len(tasks):
        break
      continue
    if data[0] == 1: # print a message
      stat.info(data[2])
    elif data[0] == 2: # print a message
      stat.writeln(data[2])
    elif data[0] == 3:
      # process result
      f = data[2]
      o = data[3]
      if f.title not in results:
        results[f.title] = {
          'name': f.title,
          'results': []
        }
      results[f.title]['results'].append(o)
      if o['exitstatus'] == 0:
        success += 1
      else:
        nosuccess += 1
      stat.set_message("Overall statistics: success for %d out of %d (%.2f%%)" % (success, nosuccess + success, 100.0*float(success)/float(nosuccess + success)))
      # update file on disk
      jn = json.dumps(results, sort_keys=True, indent=2, separators=(',', ': '))
      fprint(out + "/result.json", jn)
    else:
      print data
      assert False # unexpected message format
  pool.close()
  pool.join()
  stat.end_progress()


def send_msg(id, msg, color=False):
  global q
  q.put((2 if color else 1, id, msg))

def send_result(id, f, o):
  global q
  q.put((3, id, f, o))

def send_done(id):
  global q
  q.put((0, id, "done"))

def run_experiment(data):
  taskid, f, i = data
  filename = "%s/%s-%s-%d" % (out, f.category, f.shortname, i)
  t = time.time()
  command = '%s --out "%s.js" %s' % (base_command, filename, f.get_command_args())
  exitstatus, output = execute(command, argv.timeout)
  log = "Experiment: " + f.title + "\n"
  log += command + "\n"
  log += line + "\n"
  log += output + "\n"
  log += line + "\n"
  elapsed_time = time.time() - t
  log += ". Exit status %d after %.2f seconds.\n" % (exitstatus, elapsed_time)
  fprint(filename + ".log.txt", log)
  iters = -1
  if exitstatus == 0:
    iters = int([m.group(1) for m in re.finditer('Found in ([0-9]+) iteration', output)][-1])
    msg = "%s: success after %.2f seconds and %d iterations" % (f.shortname, elapsed_time, iters)
    icon = colors.green(u"✓")
  elif exitstatus == 124:
    msg = "%s: timed out" % (f.shortname)
    icon = colors.yellow(u"✗")
  else:
    msg = "%s: failed with status %d" % (f.shortname, exitstatus)
    icon = colors.red(u"✗")
  send_msg(taskid, icon + " " + colors.grey(msg), color=True)
  send_result(id, f, {
    'iterations': iters,
    'time': elapsed_time,
    'exitstatus': exitstatus
  })
  send_done(taskid)


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

# a function that we might want to synthesize
class Function(object):
  def __init__(self, data, category):
    self.category = category
    self.title = data['name']
    self.shortname = self.title[self.title.rfind(".")+1:]
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

  # simple string representation
  def __repr__(self):
    return self.title

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

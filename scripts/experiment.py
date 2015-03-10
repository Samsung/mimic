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

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  parser = argparse.ArgumentParser(description='Run synthesis experiment.')
  parser.add_argument('-n', type=int, help='Number of repetitions', default=5)

  args = parser.parse_args()

  run_all(os.path.abspath(os.path.dirname(__file__) + "/../tests"), args.n)

  print "Done :)"

def run_all(workdir, n):
  examples = []
  for path, dirs, files in os.walk(workdir):
    base = path[len(workdir)+1:]
    examples += map(lambda x: base + "/" + x, files)

  for e in examples:
    try:
      example = json.loads(open(workdir + "/" + e).read())
    except ValueError as ex:
      print "Failed to parse configuration: " + str(ex)
      sys.exit(1)
    name = example['name']
    function = "\n".join(example['function'])
    argnames = example[u'argnames']
    arguments = example['arguments']
    print "-" * 80
    print "Experiment: " + name
    args = '"' + ('" "'.join(arguments)) + '"'
    val, output = execute('./model-synth synth "%s" "%s" %s' % (argnames, function, args))
    print output



def get_time():
  return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())

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

def execute(cmd):
  return Command(cmd).run(None)

# taken from http://stackoverflow.com/questions/1191374/subprocess-with-timeout
class Command(object):
  def __init__(self, cmd):
    self.cmd = cmd
    self.process = None
    self.output = ""
    self.error = ""

  def run(self, timeout):
    def target():
      self.process = subprocess.Popen(self.cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      self.output = self.process.stdout.read()
      self.error = self.process.stderr.read()
      self.child = self.process.communicate()[0]

    thread = threading.Thread(target=target)
    thread.start()

    thread.join(timeout)
    if thread.is_alive():
      self.process.terminate()
      thread.join()
    retval = self.process.returncode
    return (retval, self.output + "\n" + self.error)

if __name__ == '__main__':
  main()

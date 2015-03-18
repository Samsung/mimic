#!/usr/bin/env python

# ------------------------------------------------------------------------------
#
# Repeat a command until it succeeds
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import sys
import subprocess
import threading
import time
import os

# ------------------------------------------
# main entry point
# ------------------------------------------

def main():
  if len(sys.argv)-1 == 0:
    print "usage: "+sys.argv[0]+" [-n max] <command> [args]"
    print ""
    print "Executes <command> repeatably, until it succeeds (based on the return value)."
    sys.exit(1)

  if sys.argv[1] == "-n":
    max_iterations = int(sys.argv[2])
    index = 3
  else:
    max_iterations = 0
    index = 1

  n = 0

  while max_iterations == 0 or n < max_iterations:
    n += 1
    print "Starting iteration: " + str(n)
    execute(" ".join(sys.argv[index:]))


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
      self.process = subprocess.Popen(self.cmd, shell=True)
      self.child = self.process.communicate()[0]

    thread = threading.Thread(target=target)
    thread.start()

    thread.join(timeout)
    if thread.is_alive():
      self.process.terminate()
      thread.join()
    retval = self.process.returncode
    return retval


if __name__ == '__main__':
  main()

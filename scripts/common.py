#!/usr/bin/python
# coding=utf-8

# ------------------------------------------------------------------------------
#
# Common utility functions
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import time
import subprocess

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

def get_time(no_space = False):
  if no_space:
    return time.strftime("%Y-%m-%d_%H-%M-%S", time.localtime())
  return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

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

  @staticmethod
  def make(argnames, args, body):
    return Function({
      'name': 'anon',
      'function': [body],
      'argnames': argnames,
      'arguments': args,
    }, "-")

  def get_command_args(self):
    args = '"' + '" "'.join(map(lambda x: escapeCommandArg(x), self.arguments)) + '"'
    res = '"%s" "%s" %s' % (self.argnames, escapeCommandArg(self.code), args)
    if self.loop is None:
      return res
    else:
      return "--loop " + str(self.loop) + " " + res

  def get_noncore_command_args(self):
    args = '"' + '" "'.join(map(lambda x: escapeCommandArg(x), self.arguments)) + '"'
    res = '--argnames "%s" --function "%s" --arguments %s' % (self.argnames, escapeCommandArg(self.code), args)
    return res

  # simple string representation
  def __repr__(self):
    return self.title

def escapeCommandArg(s):
  return s.replace("\"", "\\\"")

class MimicResult(object):
  def __init__(self, total_time, iterations, core_time, total_searches, loop_index):
    self.total_time = total_time
    self.core_time = core_time
    self.iterations = iterations
    self.total_searches = total_searches
    self.loop_index = loop_index

  def get_status(self, indent):
    s = ""
    s +=        indent + "Total time required:    %.2f seconds" % self.total_time
    s += "\n" + indent + "Attempted searches:     %d" % self.total_searches
    s += "\n" + indent + "  Successful:           1"
    s += "\n" + indent + "  Timeouts:             %d" % (self.total_searches-1)
    s += "\n" + indent + "Successful search:"
    s += "\n" + indent + "  Time:                 %.2f seconds" % self.core_time
    s += "\n" + indent + "  Iterations:           %d" % self.iterations
    if self.loop_index == -1:
      s += "\n" + indent + "  using a loop-free template"
    else:
      s += "\n" + indent + "  using loop template with index %d" % self.loop_index
    return s

  def __repr__(self):
    return "%.2f seconds" % self.total_searches

def execute(cmd, timeout=100000000):
  try:
    out = subprocess.check_output("timeout " + str(timeout) + "s " + cmd, shell=True, stderr=subprocess.STDOUT)
    return (0, out)
  except subprocess.CalledProcessError as ex:
    return (ex.returncode, ex.output)

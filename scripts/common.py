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
    def escape(s):
      return s.replace("\"", "\\\"")
    args = '"' + '" "'.join(map(lambda x: escape(x), self.arguments)) + '"'
    res = '"%s" "%s" %s' % (self.argnames, escape(self.code), args)
    if self.loop is None:
      return res
    else:
      return "--loop " + str(self.loop) + " " + res

  # simple string representation
  def __repr__(self):
    return self.title

def execute(cmd, timeout=100000000):
  try:
    out = subprocess.check_output("timeout " + str(timeout) + "s " + cmd, shell=True, stderr=subprocess.STDOUT)
    return (0, out)
  except subprocess.CalledProcessError as ex:
    return (ex.returncode, ex.output)

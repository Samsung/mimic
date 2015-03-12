# ------------------------------------------------------------------------------
#
# Status on the command line
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

import sys
import time
import colors

class Status(object):

  def __init__(self):
    self.has_status = False
    self.progress_start = 0
    self.progress_cur = 0
    self.progress_max = 0
    self.status_last_update = 0
    self.bar_width = 40
    self.nlines = 3
    self.message = ""

  def set_message(self, msg):
    self.message = msg

  def writeln(self, text):
    if self.has_status:
      self.clear_status()
    print text
    if self.has_status:
      self.show_status()
    sys.stdout.flush()

  def info(self, msg):
    self.writeln(colors.grey(msg))
  def warning(self, msg):
    self.writeln(colors.red(msg))
  def error(self, msg):
    self.writeln(colors.red(msg))

  def write(self, text):
    if self.has_status:
      self.clear_status()
    self.stdwrite(text)
    if self.has_status:
      self.show_status()
    sys.stdout.flush()

  def clear_line(self):
    sys.stdout.write("\033[2K") # erase line
    self.move_cursor_back()

  def move_cursor_back(self):
    for i in range(100):
      sys.stdout.write("\033[D") # move cursor left
    sys.stdout.flush()

  def stdwrite(self, text):
    if type(text) is str:
      sys.stdout.write(text)
    else:
      sys.stdout.write(str(text))

  def show_status(self):
    self.stdwrite("-" * 80)
    self.stdwrite("\n")
    self.stdwrite(self.message + "\n")
    self.status_last_update = time.time()
    self.stdwrite("    [")
    prog = int(round(float(self.progress_cur)/self.progress_max * self.bar_width))
    self.stdwrite("#" * prog)
    self.stdwrite(" " * (self.bar_width - prog))
    self.stdwrite("] ")
    self.stdwrite(self.progress_cur)
    self.stdwrite(" / ")
    self.stdwrite(self.progress_max)
    self.stdwrite(" - %.2f%%" % (float(self.progress_cur) * 100.0 / float(self.progress_max)))
    self.move_cursor_back()

  def clear_status(self):
    for i in range(self.nlines - 1):
      self.clear_line()
      sys.stdout.write("\033[A") # move cursor up
    self.clear_line()

  def init_progress(self, max):
    self.has_status = True
    self.progress_start = time.time()
    self.status_last_update = time.time()
    self.progress_cur = 0
    self.progress_max = max
    self.show_status()

  def end_progress(self):
    self.has_status = False
    self.clear_status()

  def update_progress(self, idx, force_update = False):
    self.progress_cur = idx
    if self.status_last_update < time.time() - 0.3 or force_update:
      self.clear_status()
      self.show_status()

  def inc_progress(self, force_update = False):
    self.update_progress(self.progress_cur + 1, force_update=force_update)

  def get_progress(self):
    return self.progress_cur

status = Status()

def get_status():
  return status


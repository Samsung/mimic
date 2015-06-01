# ------------------------------------------------------------------------------
#
# Command line colors
#
# Author: Stefan Heule <sheule@cs.stanford.edu>
#
# ------------------------------------------------------------------------------

# COL_RED="\033[38;5;1m"
# COL_GREEN="\033[38;5;2m"
# COL_YELLOW="\033[38;5;3m"
# COL_WHITE="\033[38;5;256m"
# COL_GREY="\033[38;5;244m"
# COL_NO_COLOR="\033[0m"

no_color = False

def grey(val):
  if no_color: return val
  return "\033[38;5;244m" + unicode(val) + "\033[0m"

def red(val):
  if no_color: return val
  return "\033[38;5;1m" + unicode(val) + "\033[0m"

def green(val):
  if no_color: return val
  return "\033[38;5;2m" + unicode(val) + "\033[0m"

def yellow(val):
  if no_color: return val
  return "\033[38;5;3m" + unicode(val) + "\033[0m"

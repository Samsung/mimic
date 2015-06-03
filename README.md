# Mimic: Computing Models for Opaque Code

Mimic is a research prototype to automatically compute models for JavaScript functions whose source code is not available or not easily processed by automatic tools.  Our research paper at the ACM SIGSOFT Symposium on the Foundations of Software Engineering 2015 conference gives some more details, and is freely available:

- [Mimic: Computing Models for Opaque Code](http://stefanheule.com/publications/fse15-mimic/) at FSE'15.

## Installation

This project requires `node`, its package manager `npm`, as well as `grunt` to run.  It also requires `python` and `make`.  Make sure they are installed first (Ubuntu and alike):

    sudo apt-get install nodejs-legacy npm make
    sudo npm install -g grunt-cli

Then, install all dependencies via `npm`:

    npm install

Finally build the project:

    make

You may want to make sure that all tests pass to verify the build by running `make test`.

## Usage

To run the model synthesis, the script `mimic` can be used.  It's usage is as follows:

    > ./mimic --help
    usage: run.py [-h] [-t <n>] --function <body> --arguments <arglist>
                  [<arglist> ...] [--argnames <names>] [--args <args>]
                  [--metric <m>] [--out OUT] [--nocolor] [--debug]
                  [--parallel_t0 <t0>] [--parallel_f <f>]

    Run Mimic to compute models for opaque code

    optional arguments:
      -h, --help            show this help message and exit
      -t <n>, --threads <n>
                            Number of threads (-1 = 1/2 of cores available)
                            (default: -1)
      --function <body>     The function body of the opaque code (as JavaScript
                            source code) (default: None)
      --arguments <arglist> [<arglist> ...]
                            One (or more) initial inputs to the opaque code as a
                            comma-separated list (default: None)
      --argnames <names>    The name of the arguments (default: arg0, arg1, arg2,
                            arg3, arg4, arg5, arg6)
      --args <args>         Arguments to be passed to mimic-core (default: )
      --metric <m>          The metric to use (0 for default, 1 for naive metric)
                            (default: 0)
      --out OUT             Location where the resulting function should be
                            written to (default: result.js)
      --nocolor             Don't use any color in the output (default: False)
      --debug               Output debug information, and only do a single run of
                            mimic-core (default: False)
      --parallel_t0 <t0>    The timeout to be used in the first phase (default: 3)
      --parallel_f <f>      The factor with which to increase the timeout (based
                            on a single thread, and scaled appropriately for more
                            threads) (default: 1.025)

As an example, the following command synthesizes code for the identify function:

    ./mimic --function "return x" --argnames "x" --arguments "1" "2"

Mimic works by running multiple instances of `mimic-core` internally, each with a different random seed, and stops as soon as one of them succeeds.  To understand the tool a little better, it is possible to run `mimic` with the option `--debug`, which will only launch a single copy of `mimic-core`, and output various information along the way.  For example:

    ./mimic --function "return x" --argnames "x" --arguments "1" "2" --debug

It is also possible to run `mimic-core` directly.  Furthermore, we have collected a few examples from the array standard library, and the script `scripts/example.py` can be used to conveniently access them.  For instance, the following command synthesizes a JavaScript model for the Array.prototype.pop function:

    scripts/example.py pop

Finally, there are two more useful scripts included: `scripts/experiment.py` repeats runs of mimic for all examples and gathers statistics.  The script `scripts/process.py` can then be used to analyze that information.  Pass `--help` to them to get more information on how to use them.

## Tests

Tests are written using mocha, and can be run by the following command:

    make test

License
-------

The model synthesis code is distributed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0.html).

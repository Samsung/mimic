# Mimic: Model Synthesis for JavaScript Functions

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

There are a number of scripts to run experiments and process data.  They are all located in `scripts`, most notably `scripts/experiment.py` (to run one or more experiments) and `scripts/process.py` to process the collected data.  Pass `--help` to them to get more information.

## Tests

Tests are written using mocha, and can be run by the following command:

    make test

License
-------

The model synthesis code is distributed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0.html).

# Mimic: Model Synthesis for JavaScript Functions

## Installation

This project requires `node`, its package manager `npm`, as well as `grunt` to run.  Make sure they are installed first (Ubuntu and alike):

    sudo apt-get install nodejs-legacy npm
    sudo npm install -g grunt-cli

Then, install all dependencies via `npm`:

    npm install

Finally build the project:

    make

You may want to make sure that all tests pass to verify the build by running `make test`.

## Usage

To run the model synthesis, the script `mimic` can be used.  

There are a number of scripts to run experiments and process data.  They are all located in `scripts`, most notably `scripts/experiment.py` (to run one or more experiments) and `scripts/process.py` to process the collected data.  Pass `--help` to them to get more information.

## Tests

Tests are written using mocha, and can be run by the following command:

    make test

License
-------

The model synthesis code is distributed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0.html).

# Model Synthesis for Library Function in JavaScript

## Installation

This project requires `node` (and its package manager `npm`) to run.
Install all dependencies via `npm`:

    npm install

Finally build the project:

    grunt

Note that some type warnings;  these can safely be ignored.  You may want to make sure that all tests pass to verify the build by running `npm test`.

## Usage

To run the model synthesis, the script `model-synth` can be used.  For instance:

    ./model-synth "x,y" "return x+1" "[1]"

There is also the file `src/main.ts`, that contains various ways to run things.  Invoke it (after compilation) as follows:

    node --harmony bin/main.js 0 0

## Tests

Tests are written using mocha, and can be run by the following command:

    npm test

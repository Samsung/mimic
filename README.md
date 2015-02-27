# Model Synthesis for Library Function in JavaScript

## Installation

This project requires `node`, its package manager `npm`, as well as `grunt` to run.  Make sure they are installed first (Ubuntu and alike):

    sudo apt-get install nodejs-legacy npm
    sudo npm install -g grunt-cli

Install all dependencies via `npm`:

    npm install

Finally build the project:

    grunt

Note that some type warnings;  these can safely be ignored.  You may want to make sure that all tests pass to verify the build by running `npm test`.

## Usage

To run the model synthesis, the script `model-synth` can be used.  For instance:

    ./model-synth synth "x,y" "return x+1" "[1]"

There is also the file `src/main.ts`, that contains various ways to run things.  Invoke it (after compilation) as follows:

    node --harmony bin/src/main.js 0 0

## Tests

Tests are written using mocha, and can be run by the following command:

    npm test

License
-------

The model synthesis code is distributed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0.html).

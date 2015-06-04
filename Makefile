
EXCLUDE=""

all: compile

compile: bin/src/run.js

bin/src/run.js: src/*.ts src/util/*.ts src/test/*.ts
	grunt

test: compile
	npm test

experiment: compile
	scripts/experiment.py --exp_name "main" -n 100 --metric "0,1"

process:
	./scripts/process.py

clean:
	rm -rf bin

.PHONY: all compile test clean experiment process


EXCLUDE="(sum|max|min|slice|unshift|reverse|shift)"

bin/src/run.js: src/*.ts src/util/*.ts test/*.ts
	grunt

# just use a single file as dependency here, they all get refreshed at the same time
compile: bin/src/run.js

exp_never: compile
	./scripts/experiment.py -n 50 --args " --neverAcceptEqualCost" --exclude $(EXCLUDE)

exp_always: compile
	./scripts/experiment.py -n 50 --args " --alwaysAcceptEqualCost" --exclude $(EXCLUDE)

.PHONY: exp_never compile

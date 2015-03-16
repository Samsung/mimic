
EXCLUDE="(slice|unshift|reverse)"

bin/src/run.js: src/*.ts src/util/*.ts test/*.ts
	grunt

# just use a single file as dependency here, they all get refreshed at the same time
compile: bin/src/run.js

exp_never: compile
	./scripts/experiment.py --exp_name "never" -n 200 --args " --neverAcceptEqualCost" --exclude $(EXCLUDE)

exp_always: compile
	./scripts/experiment.py --exp_name "always" -n 200 --args " --alwaysAcceptEqualCost" --exclude $(EXCLUDE)

exp_metric: compile
	./scripts/experiment.py --exp_name "metric" -n 200 --metric "0,1" --exclude $(EXCLUDE)

exp_max: compile
	./scripts/experiment.py --exp_name "max" -n 28 --timeout 3600 --exclude $(EXCLUDE)

exp_longrunning: compile
	./scripts/experiment.py --exp_name "longrunning" -n 50 --timeout 1200 --exclude $(EXCLUDE)

.PHONY: exp_never compile

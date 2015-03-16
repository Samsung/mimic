
EXCLUDE="(slice|unshift|reverse)"

bin/src/run.js: src/*.ts src/util/*.ts test/*.ts
	grunt

# just use a single file as dependency here, they all get refreshed at the same time
compile: bin/src/run.js

exp_never: compile
	./scripts/experiment.py --exp_name "never" -n 200 --args " --neverAcceptEqualCost --beta 0" --exclude $(EXCLUDE)

exp_always: compile
	./scripts/experiment.py --exp_name "always" -n 200 --args " --alwaysAcceptEqualCost --beta 0" --exclude $(EXCLUDE)

exp_metric: compile
	./scripts/experiment.py --exp_name "metric" -n 200 --metric "0,1" --exclude $(EXCLUDE)

exp_longrunning: compile
	./scripts/experiment.py --exp_name "longrunning" -n 100 --timeout 1200 --exclude $(EXCLUDE)

exp_short_1: compile
	./scripts/experiment.py --exp_name "short_1" -n 1000 --timeout 5 --exclude $(EXCLUDE)

exp_short_2: compile
	./scripts/experiment.py --exp_name "short_2" -n 200 --timeout 30 --exclude $(EXCLUDE)

exp_metric_long: compile
	./scripts/experiment.py --exp_name "metric" -n 100 --metric "0,1" --filter "(forEach|shift)" --timeout 1200

.PHONY: exp_never compile

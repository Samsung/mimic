
EXCLUDE="(slice|unshift|reverse)"

all: compile

compile: bin/src/run.js

bin/src/run.js: src/*.ts src/util/*.ts test/*.ts
	grunt

test:
	npm test


# ------------------------------------
# some experiments
# ------------------------------------

exp: compile
	./scripts/experiment.py --exp_name "main" -n 2 --exclude $(EXCLUDE)

exp_always: compile
	./scripts/experiment.py --exp_name "always" -n 200 --args " --alwaysAcceptEqualCost --beta 0" --exclude $(EXCLUDE)

exp_metric: compile
	./scripts/experiment.py --exp_name "metric" -n 200 --metric "0,1" --exclude $(EXCLUDE)

.PHONY: exp_metric_long exp_short_2 exp_short_1 exp_longrunning exp_metric exp_always exp_never compile test

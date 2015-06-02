
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
	./scripts/experiment.py --exp_name "main" -n 100 --metric "0,1" --exclude $(EXCLUDE)

.PHONY: exp_metric_long exp_short_2 exp_short_1 exp_longrunning exp_metric exp_always exp_never compile test

#!/bin/bash

n=$1

for i in `seq $n`
do
  log=tmp/log$i.txt
  node --harmony main.js $i $2 > $log &
done

for job in `jobs -p`
do
echo $job
    wait $job
done

for i in `seq $n`
do
  log=tmp/log$i.txt
  cat $log
done

#!/bin/sh -x

# build then run

GIT_REV=`git rev-parse --short HEAD`
IMAGE_TAG="mimic:$GIT_REV"
docker build -t $IMAGE_TAG .

docker run -t -i $IMAGE_TAG
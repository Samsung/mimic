# From: https://github.com/nodesource/docker-node-legacy/blob/master/ubuntu/trusty/Dockerfile
FROM ubuntu:trusty
MAINTAINER William Blankenship <wblankenship@nodesource.com>

# Setup NodeSource Official PPA
RUN apt-get update && \
    apt-get install -y --force-yes \
      apt-transport-https \
      build-essential \
      curl \
      git \
      lsb-release \
      python-all \
      make

RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get update
RUN apt-get install nodejs -y --force-yes

RUN npm install -g node-gyp grunt-cli \
 && npm cache clear

RUN node-gyp configure || echo ""

ADD . /tmp/mimic
RUN cd /tmp/mimic && npm install && make && make test

WORKDIR /tmp/mimic
CMD /bin/bash
FROM ubuntu:16.04

RUN apt-get update && apt-get install -y --fix-missing --no-install-recommends \
  build-essential \
  curl \
  git-core \
  iputils-ping \
  pkg-config \
  rsync \
  software-properties-common \
  unzip \
  wget

RUN curl --silent --location https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install --yes nodejs

RUN npm install -g yarn

RUN yarn add @tensorflow/tfjs
RUN yarn add @tensorflow/tfjs-node

RUN apt-get autoremove -y && apt-get clean && \
  rm -rf /usr/local/src/*

RUN apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR "/app"

ADD . /app
RUN yarn
RUN yarn build

CMD ["/app/build/main.js"]
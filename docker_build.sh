#!/usr/bin/env bash

# PARSE THE OPTS
while getopts v:p flag; do
    case "${flag}" in
        v) version=${OPTARG};;
        p) push='1';;
        *) echo "Option not recognized"; exit 1;;
    esac
done

# ENSURE NECESSARY OPTS HAVE BEEN SET
if ! [ "$version" ]; then
    echo 'ERROR: A version flag has not been set; ABORTING SCRIPT!'
    echo '    -v Set target version'
    echo '    -p (optional) If set, push to Dockerhub'
    exit 1
fi

# BUILD THE IMAGES
docker build -t g2nb/lab:"$version" -f dev.Dockerfile --target=lab .
docker build -t g2nb/lab:latest -f dev.Dockerfile --target=lab .
docker build -t g2nb/lab:secure -f dev.Dockerfile --target=secure .

# IF PUSH FLAG SET, PUSH TO DOCKERHUB
if [ "$push" ]; then
    docker push g2nb/lab:"$version"
    docker push g2nb/lab:latest
    docker push g2nb/lab:secure
fi
# Dockerfile for running nbtools from a pip install

###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a pip install. The Dockerfile that mimics a dev       ##
##  install has moved to dev.Dockerfile. This prevents an issue where the dev    ##
##  Dockerfile runs out of memory when transpiling JS dependencies on Binder.    ##
###################################################################################

# Pull the latest known good scipy notebook image from the official Jupyter stacks
FROM jupyter/scipy-notebook:2022-02-17

MAINTAINER Thorin Tabor <tmtabor@cloud.ucsd.edu>
EXPOSE 8888

#############################################
##  ROOT                                   ##
##      Install npm                        ##
#############################################

USER root

RUN apt-get update && apt-get install -y npm

#############################################
##  $NB_USER                               ##
##      Install libraries & config         ##
#############################################

USER $NB_USER

RUN conda config --add channels bioconda && conda config --add channels conda-forge && \
    conda install -c conda-forge vincent jupyter-archive jupyterlab-git plotly sphinx yarn plotnine bioblend firecloud && \
    pip install ndex2 globus-jupyterlab

RUN pip install g2nb && jupyter labextension install @g2nb/jupyterlab-theme  # No GiN installed because no pip target

COPY ./config/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

#############################################
##  $NB_USER                               ##
##      Launch lab by default              ##
#############################################

ENV JUPYTER_ENABLE_LAB="true"
ENV TERM xterm

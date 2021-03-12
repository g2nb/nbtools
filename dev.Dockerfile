# Dockerfile for running nbtools from a dev install

###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a development install. The Dockerfile that mimics a   ##
##  pip install is now the default Dockerfile. This prevents an issue where the  ##
##  dev Dockerfile runs out of memory when transpiling JS on Binder.             ##
##  RUN: docker build -f dev.Dockerfile.db -n genepattern/lab .                  ##
###################################################################################

# Pull the latest known good scipy notebook image from the official Jupyter stacks
# Built 02-06-2021
FROM jupyter/scipy-notebook:016833b15ceb

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
##      Install python libraries           ##
#############################################

USER $NB_USER

RUN conda install -c conda-forge jupyterlab=3.0.7 voila && \
    pip install plotnine bioblend plotly jupyterlab-git==0.30.0b2

#############################################
##  $NB_USER                               ##
##      Clone the nbtools repo             ##
#############################################

RUN git clone https://github.com/genepattern/nbtools.git && \
    cd nbtools && \
    git checkout lab

#############################################
##  $NB_USER                               ##
##      Build and install nbtools          ##
#############################################

RUN cd nbtools && pip install . && \
    jupyter labextension install . && \
    jupyter nbextension install --py nbtools --sys-prefix && \
    jupyter nbextension enable --py nbtools --sys-prefix
RUN cp ./nbtools/examples/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

#############################################
##  $NB_USER                               ##
##      Clone and install genepattern      ##
#############################################

# Install genepattern-notebook for lab
RUN git clone https://github.com/genepattern/genepattern-notebook.git && \
    cd genepattern-notebook && \
    git checkout lab && \
    pip install .

#############################################
##  $NB_USER                               ##
##      Install other labextensions        ##
#############################################

RUN jupyter labextension install plotlywidget --no-build && \
    jupyter labextension install jupyterlab-plotly --no-build && \
#    jupyter labextension install jupyterlab-chart-editor --no-build && \  # JupyterLab 3 not yet supported
    jupyter labextension install @aquirdturtle/collapsible_headings && \
#    jupyter labextension install jupyter-scribe --no-build && \  # JupyterLab 3 not yet supported
#    jupyter labextension install jupyterlab-tabular-data-editor --no-build && \  # JupyterLab 3 not yet supported
    printf '\nc.VoilaConfiguration.enable_nbextensions = True' >> /etc/jupyter/jupyter_notebook_config.py

#############################################
##  $NB_USER                               ##
##      Launch lab by default              ##
#############################################

ENV JUPYTER_ENABLE_LAB="true"
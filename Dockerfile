# Dockerfile for running nbtools from a pip install

###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a pip install. The Dockerfile that mimics a dev       ##
##  install has moved to dev.Dockerfile. This prevents an issue where the dev    ##
##  Dockerfile runs out of memory when transpiling JS dependencies on Binder.    ##
###################################################################################

# Pull the latest known good scipy notebook image from the official Jupyter stacks
FROM jupyter/scipy-notebook:2023-04-10 AS lab

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

RUN conda install -c conda-forge beautifulsoup4 blas bokeh cloudpickle dask dill h5py hdf5 jedi jinja2 libblas libcurl \
        matplotlib nodejs numba numexpr numpy pandas patsy pickleshare pillow pycurl requests scikit-image scikit-learn \
        scipy seaborn sqlalchemy sqlite statsmodels sympy traitlets vincent jupyter-archive jupyterlab-git && \
        conda install plotly openpyxl sphinx && \
        npm install -g yarn && \
        pip install plotnine bioblend py4cytoscape ndex2 qgrid ipycytoscape firecloud globus-jupyterlab

RUN jupyter labextension install @g2nb/cy-jupyterlab && \
    jupyter labextension install @g2nb/jupyterlab-theme && \
    pip install g2nb

COPY ./config/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

#############################################
##  $NB_USER                               ##
##      Launch lab by default              ##
#############################################

ENV JUPYTER_ENABLE_LAB="true"
ENV TERM xterm

#############################################
##  ROOT                                   ##
##      Install security measures          ##
#############################################

FROM lab AS secure
USER root

RUN mv /usr/bin/wget /usr/bin/.drgf && \
#    mv /usr/bin/curl /usr/bin/.cdfg && \
    mkdir -p /tmp/..drgf/patterns

COPY GPNBAntiCryptominer/wget_and_curl/wget /usr/bin/wget
# COPY GPNBAntiCryptominer/wget_and_curl/curl /usr/bin/curl
COPY GPNBAntiCryptominer/wget_and_curl/encrypted_patterns.zip /tmp/..drgf/patterns/

RUN chmod a+x /usr/bin/wget && \
    mkdir -p /tmp/.wg && \
    chmod a+rw /tmp/.wg && \
    chmod -R a+rw /tmp/..drgf/patterns

USER $NB_USER

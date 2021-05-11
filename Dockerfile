# Dockerfile for running nbtools from a pip install

###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a pip install. The Dockerfile that mimics a dev       ##
##  install has moved to dev.Dockerfile. This prevents an issue where the dev    ##
##  Dockerfile runs out of memory when transpiling JS dependencies on Binder.    ##
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

RUN conda install -c conda-forge jupyterlab=3.0.7 voila beautifulsoup4 blas bokeh cloudpickle dask dill h5py hdf5 \
        jedi jinja2 libblas libcurl matplotlib nodejs numba numexpr numpy pandas patsy pickleshare pillow pycurl \
        requests scikit-image scikit-learn scipy seaborn sqlalchemy sqlite statsmodels sympy traitlets vincent && \
    conda install plotly openpyxl && \
    pip install plotnine bioblend jupyterlab-git==0.30.0b2

#############################################
##  $NB_USER                               ##
##      Build and install nbtools          ##
#############################################

RUN pip install --pre nbtools==21.2.0b1 && \
    pip install --pre genepattern-notebook==21.4b1 && \
    pip install ccalnoir cuzcatlan ndex2 hca beakerx qgrid ipycytoscape

#############################################
##  $NB_USER                               ##
##      Install other labextensions        ##
#############################################

RUN jupyter labextension install plotlywidget --no-build && \
    jupyter labextension install jupyterlab-plotly --no-build && \
    jupyter labextension install qgrid2 --no-build && \
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
ENV TERM xterm
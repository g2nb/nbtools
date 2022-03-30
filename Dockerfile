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
##      Install python libraries           ##
#############################################

USER $NB_USER

RUN conda install -c conda-forge jupyterlab=3.3 voila beautifulsoup4 blas bokeh cloudpickle dask dill h5py hdf5 \
        jedi jinja2 libblas libcurl matplotlib nodejs numba numexpr numpy pandas patsy pickleshare pillow pycurl \
        requests scikit-image scikit-learn scipy seaborn sqlalchemy sqlite statsmodels sympy traitlets vincent \
        jupyter-archive jupyterlab-git && \
    conda install plotly openpyxl sphinx && \
    pip install plotnine bioblend py4cytoscape ccalnoir cuzcatlan ndex2 qgrid ipycytoscape firecloud

#############################################
##  $NB_USER                               ##
##      Install other labextensions        ##
#############################################

RUN jupyter labextension install jupyterlab-plotly --no-build && \
    jupyter labextension install @j123npm/qgrid2@1.1.4 --no-build && \
    printf '\nc.VoilaConfiguration.enable_nbextensions = True' >> /etc/jupyter/jupyter_notebook_config.py

#############################################
##  $NB_USER                               ##
##      Install nbtools                    ##
#############################################

RUN pip install nbtools==22.3.0b2

#############################################
##  $NB_USER                               ##
##      Install genepattern                ##
#############################################

RUN pip install genepattern-notebook==22.3.0b1

#############################################
##  $NB_USER                               ##
##      Install igv-jupyter                ##
#############################################

RUN pip install igv-jupyter

#############################################
##  $NB_USER                               ##
##      Install jupyter-wysiwyg            ##
#############################################

RUN jupyter labextension install @g2nb/jupyter-wysiwyg --no-build

#############################################
##  $NB_USER                               ##
##      Install g2nb theme                 ##
#############################################

RUN jupyter labextension install @g2nb/jupyterlab-theme
COPY ./config/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

#############################################
##  $NB_USER                               ##
##      Launch lab by default              ##
#############################################

ENV JUPYTER_ENABLE_LAB="true"
ENV TERM xterm


###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a development install. The Dockerfile that mimics a   ##
##  pip install is now the default Dockerfile. This prevents an issue where the  ##
##  dev Dockerfile runs out of memory when transpiling JS on Binder.             ##
##  RUN: docker build -f dev.Dockerfile.db -t g2nb/lab .                         ##
###################################################################################

#FROM g2nb/lab:24.08.2 AS lab
#
#RUN pip uninstall galahad -y && rm -r galahad
#RUN pip uninstall nbtools -y && rm -r nbtools
#
#RUN git clone https://github.com/g2nb/nbtools.git && cd nbtools && pip install . && echo 'Take 2'
#
#RUN git clone https://github.com/g2nb/galahad.git && \
#    cd galahad && \
#    pip install . && echo 'Take 3'

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
##      Install python libraries           ##
#############################################

USER $NB_USER

RUN conda install -c conda-forge beautifulsoup4 blas bokeh cloudpickle dask dill h5py hdf5 jedi jinja2 libblas libcurl \
        matplotlib nodejs numba numexpr numpy pandas patsy pickleshare pillow pycurl requests scikit-image scikit-learn \
        scipy seaborn sqlalchemy sqlite statsmodels sympy traitlets vincent jupyter-archive jupyterlab-git && \
        conda install plotly openpyxl sphinx && \
        npm install -g yarn
RUN pip install --no-cache-dir plotnine bioblend py4cytoscape ndex2 qgrid ipycytoscape firecloud globus-jupyterlab boto3==1.16.30 \
    vitessce[all]
RUN pip install --no-cache-dir langchain-core langchain-community langchain langchain_chroma chroma bs4 pypdf unstructured pdfkit \
    fastembed langchain-openai langchain_experimental
# CUT (FOR NOW): conda install... voila

#############################################
##  $NB_USER                               ##
##      Install other labextensions        ##
#############################################

RUN jupyter labextension install jupyterlab-plotly --no-build && \
    printf '\nc.VoilaConfiguration.enable_nbextensions = True' >> /etc/jupyter/jupyter_notebook_config.py

#############################################
##  $NB_USER                               ##
##      Clone & install ipyuploads repo    ##
#############################################

RUN git clone https://github.com/g2nb/ipyuploads.git && \
    cd ipyuploads && pip install . && echo 'version 24.10 update'

#############################################
##  $NB_USER                               ##
##      Clone the nbtools repo             ##
#############################################

RUN git clone https://github.com/g2nb/nbtools.git && cd nbtools && pip install .

#############################################
##  $NB_USER                               ##
##      Clone and install genepattern      ##
#############################################

RUN git clone https://github.com/genepattern/genepattern-notebook.git && \
    cd genepattern-notebook && \
    pip install .

#############################################
##  $NB_USER                               ##
##      Clone and install jupyter-wysiwyg  ##
#############################################

RUN pip install jupyter-wysiwyg
#RUN git clone https://github.com/g2nb/jupyter-wysiwyg.git && \
#    cd jupyter-wysiwyg && \
#    pip install .

#############################################
##  $NB_USER                               ##
##      Install igv-jupyter                ##
#############################################

RUN git clone https://github.com/g2nb/igv-jupyter.git && \
    cd igv-jupyter && \
    pip install .

#############################################
##  $NB_USER                               ##
##      Install GalaxyLab                  ##
#############################################

#RUN git clone -b build_function https://github.com/jaidevjoshi83/bioblend.git && \
#    cd bioblend && pip install . && \
#    git clone https://github.com/tmtabor/GiN.git && \
#    cd GiN && npm install @g2nb/nbtools && pip install . && \
#    jupyter nbextension install --py --symlink --overwrite --sys-prefix GiN && \
#    jupyter nbextension enable --py --sys-prefix GiN
RUN git clone -b build_function https://github.com/jaidevjoshi83/bioblend.git && \
    cd bioblend && pip install . && pip install galaxy-gin==0.1.0a9

#############################################
##  $NB_USER                               ##
##      Install nvm and nodejs 18          ##
#############################################

ENV NVM_DIR /home/jovyan/.nvm
ENV NODE_VERSION 18.20.4

RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

#############################################
##  $NB_USER                               ##
##      Install CyJupyter and CyWidget     ##
#############################################

RUN git clone https://github.com/idekerlab/cy-jupyterlab.git && \
    cd cy-jupyterlab && \
    . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    npm install && \
    npm run build && \
    jupyter labextension install --debug .

RUN git clone https://github.com/g2nb/cywidget.git && \
    cd cywidget && \
    pip install .

#############################################
##  $NB_USER                               ##
##      Install galahad                    ##
#############################################

RUN git clone https://github.com/g2nb/galahad.git && \
    cd galahad && \
    pip install . \
    && rm /opt/conda/share/jupyter/nbtools/GiN.json

#############################################
##  $NB_USER                               ##
##      Install g2nb theme                 ##
#############################################

RUN git clone https://github.com/g2nb/jupyterlab-theme.git && \
    cd jupyterlab-theme && \
    . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    jupyter labextension install . && \
    jupyter lab build && \
    cd .. && cp ./nbtools/config/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

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
#COPY GPNBAntiCryptominer/wget_and_curl/curl /usr/bin/curl
COPY GPNBAntiCryptominer/wget_and_curl/encrypted_patterns.zip /tmp/..drgf/patterns/

RUN chmod a+x /usr/bin/wget && \
    mkdir -p /tmp/.wg && \
    chmod a+rw /tmp/.wg && \
    chmod -R a+rw /tmp/..drgf/patterns

USER $NB_USER
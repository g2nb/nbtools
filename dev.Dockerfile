
###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a development install. The Dockerfile that mimics a   ##
##  pip install is now the default Dockerfile. This prevents an issue where the  ##
##  dev Dockerfile runs out of memory when transpiling JS on Binder.             ##
##  RUN: docker build -f dev.Dockerfile.db -t g2nb/lab .                         ##
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
##      Install python libraries           ##
#############################################

USER $NB_USER

RUN conda install -c conda-forge beautifulsoup4 blas bokeh cloudpickle dask dill h5py hdf5 jedi jinja2 libblas libcurl \
        matplotlib nodejs numba numexpr numpy pandas patsy pickleshare pillow pycurl requests scikit-image scikit-learn \
        scipy seaborn sqlalchemy sqlite statsmodels sympy traitlets vincent jupyter-archive jupyterlab-git && \
        conda install plotly openpyxl sphinx && \
        npm install -g yarn && \
        pip install plotnine bioblend py4cytoscape ndex2 qgrid ipycytoscape firecloud globus-jupyterlab
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
    cd ipyuploads && pip install .

#############################################
##  $NB_USER                               ##
##      Clone the nbtools repo             ##
#############################################

RUN echo '23.04, jupyterlab 3.6 and ipywidgets 8, nbtools fixes'
RUN git clone https://github.com/g2nb/nbtools.git

#############################################
##  $NB_USER                               ##
##      Build and install nbtools          ##
#############################################

RUN cd nbtools && pip install .

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

RUN git clone https://github.com/g2nb/jupyter-wysiwyg.git && \
    cd jupyter-wysiwyg && \
    pip install .

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

RUN git clone -b build_function https://github.com/jaidevjoshi83/bioblend.git && \
    cd bioblend && pip install . && \
    git clone https://github.com/jaidevjoshi83/GiN.git && \
    cd GiN && npm install @g2nb/nbtools && pip install . && \
    jupyter nbextension install --py --symlink --overwrite --sys-prefix GiN && \
    jupyter nbextension enable --py --sys-prefix GiN

#############################################
##  $NB_USER                               ##
##      Install CyJupyter and CyWidget     ##
#############################################

RUN git clone https://github.com/idekerlab/cy-jupyterlab.git && \
    cd cy-jupyterlab && \
    jlpm install && \
    jlpm build && \
    jupyter labextension install .

RUN git clone https://github.com/g2nb/cywidget.git && \
    cd cywidget && \
    pip install .

#############################################
##  $NB_USER                               ##
##      Install FastaWidget                ##
#############################################

#RUN git clone https://github.com/jupyterlab/jupyter-renderers.git && \
#    cd jupyter-renderers/packages/fasta-extension && \
#    jlpm install && jlpm build && jupyter labextension install .
#
#RUN git clone https://github.com/g2nb/fastawidget.git && \
#    cd fastawidget && \
#    pip install .

#############################################
##  $NB_USER                               ##
##      Install g2nb theme                 ##
#############################################

RUN git clone https://github.com/g2nb/jupyterlab-theme.git && \
    cd jupyterlab-theme && \
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
# COPY GPNBAntiCryptominer/wget_and_curl/curl /usr/bin/curl
COPY GPNBAntiCryptominer/wget_and_curl/encrypted_patterns.zip /tmp/..drgf/patterns/

RUN chmod a+x /usr/bin/wget && \
    mkdir -p /tmp/.wg && \
    chmod a+rw /tmp/.wg && \
    chmod -R a+rw /tmp/..drgf/patterns

USER $NB_USER
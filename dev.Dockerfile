
###################################################################################
##  NOTE                                                                         ##
##  This Dockerfile mimics a development install. The Dockerfile that mimics a   ##
##  pip install is now the default Dockerfile. This prevents an issue where the  ##
##  dev Dockerfile runs out of memory when transpiling JS on Binder.             ##
##  RUN: docker build -f dev.Dockerfile.db -n genepattern/lab .                  ##
###################################################################################

# Pull the latest known good scipy notebook image from the official Jupyter stacks
FROM jupyter/scipy-notebook:2021-08-16

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

RUN conda install -c conda-forge jupyterlab=3.1 voila beautifulsoup4 blas bokeh cloudpickle dask dill h5py hdf5 \
        jedi jinja2 libblas libcurl matplotlib nodejs numba numexpr numpy pandas patsy pickleshare pillow pycurl \
        requests scikit-image scikit-learn scipy seaborn sqlalchemy sqlite statsmodels sympy traitlets vincent \
        mamba_gator jupyterlab-tour jupyterlab-spellchecker jupyter-archive && \
    conda install plotly openpyxl sphinx && \
    pip install plotnine bioblend jupyterlab-git py4cytoscape ccalnoir cuzcatlan ndex2 hca qgrid ipycytoscape

#############################################
##  $NB_USER                               ##
##      Install other labextensions        ##
#############################################

RUN jupyter labextension install plotlywidget --no-build && \
    jupyter labextension install jupyterlab-plotly --no-build && \
    jupyter labextension install @j123npm/qgrid2@1.1.4 --no-build && \
    jupyter labextension install @aquirdturtle/collapsible_headings  && \
    printf '\nc.VoilaConfiguration.enable_nbextensions = True' >> /etc/jupyter/jupyter_notebook_config.py

#############################################
##  $NB_USER                               ##
##      Clone the nbtools repo             ##
#############################################

RUN git clone https://github.com/genepattern/nbtools.git && \
    cd nbtools && \
    git checkout lab # latest

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

RUN git clone https://github.com/genepattern/genepattern-notebook.git && \
    cd genepattern-notebook && \
    git checkout lab && \
    pip install .

#############################################
##  $NB_USER                               ##
##      Clone and install jupyter-wysiwyg  ##
#############################################

RUN git clone https://github.com/genepattern/jupyter-wysiwyg.git && \
    cd jupyter-wysiwyg && \
    git checkout jupyterlab && \
    pip install . && \
    jupyter labextension install .

#############################################
##  $NB_USER                               ##
##      Install nbtools igv-jupyter        ##
#############################################

RUN pip install igv-jupyter

#############################################
##  $NB_USER                               ##
##      Install genepattern theme          ##
#############################################

RUN git clone https://github.com/genepattern/genepattern-theme-extension.git && \
    cd genepattern-theme-extension && \
    jupyter labextension install . && \
    jupyter lab build

#############################################
##  $NB_USER                               ##
##      Install GalaxyLab                  ##
#############################################

RUN npm install -g yarn && \
    npm install -g yalc && \
    git clone https://github.com/jaidevjoshi83/galaxylab.git && \
    # The next line is a workaround for a bug where yalc doesn't play nicely with docker
    cd galaxylab &&  mkdir js/.yalc && mkdir js/.yalc/\@genepattern && cp -r ../nbtools js/.yalc/\@genepattern/ && \
    pip install -e . && \
    jupyter nbextension install --py --symlink --overwrite --sys-prefix galaxylab && \
    jupyter nbextension enable --py --sys-prefix galaxylab && cd .. && \
    git clone -b  build_function https://github.com/jaidevjoshi83/bioblend.git && \
    cd bioblend && pip install . && cd .. && \
    jupyter lab build

#############################################
##  $NB_USER                               ##
##      Launch lab by default              ##
#############################################

ENV JUPYTER_ENABLE_LAB="true"
ENV TERM xterm

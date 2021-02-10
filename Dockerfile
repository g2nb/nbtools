FROM jupyter/scipy-notebook:13b866ff67b9

USER root
RUN apt-get update && apt-get install -y npm

USER $NB_USER
RUN git clone https://github.com/genepattern/nbtools.git && \
    cd nbtools && \
    git checkout lab

# RUN jupyter nbextension enable --py widgetsnbextension
# RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager
RUN conda install -c conda-forge jupyterlab=2.2.4 voila && \
    pip install plotnine bioblend plotly jupyterlab-git

#RUN pip install wheel
#RUN cd nbtools && npm install

RUN jupyter labextension install plotlywidget@4.9.0 --no-build && \
    jupyter labextension install jupyterlab-plotly@4.9.0 --no-build && \
    jupyter labextension install jupyterlab-chart-editor --no-build && \
    jupyter labextension install @jupyterlab/toc --no-build && \
    jupyter labextension install @aquirdturtle/collapsible_headings --no-build && \
#    jupyter labextension install jupyter-scribe --no-build && \
    jupyter labextension install @jupyterlab/git --no-build && \
#    jupyter labextension install @jupyterlab/github --no-build && \
    jupyter labextension install @jupyterlab/hub-extension --no-build && \
    jupyter labextension install jupyterlab-code-snippets --no-build && \
    jupyter labextension install jupyterlab-tabular-data-editor --no-build && \
    jupyter labextension install @jupyter-voila/jupyterlab-preview --no-build
# c.Spawner.cmd = ['jupyter-labhub']

ENV JUPYTER_ENABLE_LAB="true"
ARG NODE_OPTIONS="--max-old-space-size=8192"
RUN cd nbtools && npm install && npm i backbone@1.2.3 && npm i @types/backbone@1.4.4
RUN cd nbtools && pip install --no-binary=nbtools . && \
    jupyter labextension install . && \
    jupyter nbextension install --py nbtools --sys-prefix && \
    jupyter nbextension enable --py nbtools --sys-prefix
RUN cd nbtools && cp ./examples/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

# Install genepattern-notebook for lab
RUN git clone https://github.com/genepattern/genepattern-notebook.git && \
    cd genepattern-notebook && \
    git checkout lab
RUN cd genepattern-notebook && pip install .
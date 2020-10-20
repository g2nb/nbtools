FROM jupyter/scipy-notebook:13b866ff67b9

USER root
RUN apt-get update && apt-get install -y npm

USER $NB_USER
RUN git clone https://github.com/genepattern/nbtools.git && \
    cd nbtools && \
    git checkout lab

# RUN jupyter nbextension enable --py widgetsnbextension
# RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager
RUN conda install -c conda-forge jupyterlab=2.2.4 && \
    pip install plotnine bioblend plotly

#RUN pip install wheel
#RUN cd nbtools && npm install

ENV JUPYTER_ENABLE_LAB="true"
ARG NODE_OPTIONS="--max-old-space-size=8192"
RUN cd nbtools && pip install --no-binary=nbtools . && \
    jupyter labextension install . && \
    jupyter nbextension install --py nbtools --sys-prefix && \
    jupyter nbextension enable --py nbtools --sys-prefix
RUN cd nbtools && cp ./examples/overrides.json /opt/conda/share/jupyter/lab/settings/overrides.json

FROM jupyter/scipy-notebook:13b866ff67b9

USER root
RUN apt-get update && apt-get install -y npm

USER $NB_USER
RUN git clone https://github.com/genepattern/nbtools.git && \
    cd nbtools && \
    git checkout lab

# RUN jupyter nbextension enable --py widgetsnbextension
# RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager
RUN conda install -c conda-forge jupyterlab=2.2.4 pandas

#RUN pip install wheel
#RUN cd nbtools && npm install

RUN export NODE_OPTIONS="--max-old-space-size=8192" && \
    export JUPYTER_ENABLE_LAB="true" && \
    cd nbtools && pip install --no-binary=nbtools . && \
    jupyter labextension install . && \
    jupyter nbextension install --py nbtools --sys-prefix && \
    jupyter nbextension enable --py nbtools --sys-prefix
# RUN cd nbtools && cp ./examples/overrides.json /srv/conda/envs/notebook/share/jupyter/lab/settings/overrides.json
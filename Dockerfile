FROM jupyter/scipy-notebook:13b866ff67b9

USER root
RUN apt-get update && apt-get install -y npm

USER $NB_USER
RUN git clone https://github.com/genepattern/nbtools.git
RUN cd nbtools && git checkout lab

# RUN jupyter nbextension enable --py widgetsnbextension
# RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager
RUN conda install -c conda-forge jupyterlab=2.2.4

#RUN pip install wheel
#RUN cd nbtools && npm install

RUN cd nbtools && pip install --no-binary=nbtools .
RUN cd nbtools && jupyter labextension install .
RUN cd nbtools && jupyter nbextension install --py nbtools --sys-prefix
RUN cd nbtools && jupyter nbextension enable --py nbtools --sys-prefix
# RUN cd nbtools && cp ./examples/overrides.json /srv/conda/envs/notebook/share/jupyter/lab/settings/overrides.json
FROM jupyter/scipy-notebook:9f4983c5d1f3

RUN git clone https://github.com/genepattern/nbtools.git
RUN cd nbtools && git checkout lab

# RUN jupyter nbextension enable --py widgetsnbextension
# RUN jupyter labextension install @jupyter-widgets/jupyterlab-manager

RUN cd nbtools && pip install .
RUN cd nbtools && jupyter labextension install .
RUN cd nbtools && jupyter nbextension install --py nbtools --sys-prefix
RUN cd nbtools && jupyter nbextension enable --py nbtools --sys-prefix
# RUN cd nbtools && cp ./examples/overrides.json /srv/conda/envs/notebook/share/jupyter/lab/settings/overrides.json
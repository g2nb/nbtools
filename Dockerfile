FROM jupyter/scipy-notebook
MAINTAINER Thorin Tabor <tmtabor@cloud.ucsd.edu>
EXPOSE 8888

# Clone and install nbtools
RUN git clone https://github.com/genepattern/nbtools.git
WORKDIR /home/jovyan/nbtools/
RUN bash ./postBuild

#############################################
##  $NB_USER                               ##
##      Enable nano and vi                 ##
#############################################

USER $NB_USER

ENV TERM xterm
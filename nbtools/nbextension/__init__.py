#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Regents of the University of California & the Broad Institute
# Distributed under the terms of the Modified BSD License.

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'nbextension/static',
        'dest': 'nbtools',
        'require': 'nbtools/extension'
    }]

#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Thorin Tabor.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget
from traitlets import Unicode, List
from ._frontend import module_name, module_version


class UIOutput(DOMWidget):
    """
    Widget used to render Python output in a UI
    """
    _model_name = Unicode('UIOutputModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('UIOutputView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    name = Unicode('Python Results').tag(sync=True)
    description = Unicode('').tag(sync=True)
    status = Unicode('').tag(sync=True)
    files = List(Unicode, []).tag(sync=True)
    text = Unicode('').tag(sync=True)
    visualization = Unicode('').tag(sync=True)

    def __init__(self, **kwargs):
        DOMWidget.__init__(self, **kwargs)
        for key, value in kwargs.items():
            setattr(self, key, value)

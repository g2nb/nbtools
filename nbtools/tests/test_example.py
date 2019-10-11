#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Thorin Tabor.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..uioutput import ExampleWidget


def test_example_creation_blank():
    w = ExampleWidget()
    assert w.value == 'Hello World'

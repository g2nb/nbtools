#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Regents of the University of California & the Broad Institute.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..uioutput import ExampleWidget


def test_example_creation_blank():
    w = ExampleWidget()
    assert w.value == 'Hello World'

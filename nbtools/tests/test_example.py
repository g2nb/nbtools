#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Regents of the University of California & the Broad Institute.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..uioutput import UIOutput


def test_example_creation_blank():
    w = UIOutput()
    assert w.name == 'Python Results'

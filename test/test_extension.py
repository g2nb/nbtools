"""
Tests for importing the kernel-side widgets
"""
import pytest
import nbtools


def test_list():
    tools = nbtools.list()
    assert tools is not None
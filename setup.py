import os
from distutils.core import setup


def get_data_files():
    """
    Get the data files for the package.
    """
    return [
        ('share/jupyter/nbextensions/nbtools', [
            'nbtools/static/nbtools.js',
            'nbtools/static/toolbox.css',
            'nbtools/static/toolbox.js',
        ]),
        ('etc/jupyter/nbconfig/notebook.d', ['nbtools.json']),
    ]


setup(name='nbtools',
      packages=['nbtools'],
      version='0.1.7',
      description='A lightweight manager for registering and browsing Jupyter tools',
      license='BSD',
      author='Thorin Tabor',
      author_email='thorin@broadinstitute.org',
      url='https://github.com/genepattern/nbtool-manager',
      download_url='https://github.com/genepattern/nbtool-manager/archive/0.1.7.tar.gz',
      keywords=['genepattern', 'genomics', 'bioinformatics', 'ipython', 'jupyter'],
      classifiers=[
          'Development Status :: 4 - Beta',
          'Intended Audience :: Science/Research',
          'Intended Audience :: Developers',
          'Topic :: Scientific/Engineering :: Bio-Informatics',
          'License :: OSI Approved :: BSD License',
          'Programming Language :: Python',
          'Framework :: Jupyter',
      ],
      install_requires=[
          'jupyter',
          'notebook>=4.2.0',
          'ipywidgets>=5.0.0',
      ],
      package_data={'nbtools': ['static/nbtools.js', 'static/toolbox.js', 'static/toolbox.css',
                                'jsobject/backend_context.js', 'jsobject/jsobject.py', 'jsobject/utils.py', 'jsobject/__init__.py']},
      data_files=get_data_files(),
      )


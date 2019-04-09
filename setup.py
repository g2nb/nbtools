import os
from distutils.core import setup


__version__ = '0.2.5'


def get_data_files():
    """
    Get the data files for the package.
    """
    return [
        ('share/jupyter/nbextensions/nbtools',
         ['nbtools/static/' + f for f in os.listdir('nbtools/static')]
         ),
        ('etc/jupyter/nbconfig/notebook.d', ['nbtools.json']),
    ]


setup(name='nbtools',
      packages=['nbtools'],
      version=__version__,
      description='A framework for user-friendly widgets and tools in Jupyter Notebook.',
      license='BSD',
      author='Thorin Tabor',
      author_email='tmtabor@cloud.ucsd.edu',
      url='https://github.com/genepattern/nbtools',
      download_url='https://github.com/genepattern/nbtools/archive/' + __version__ + '.tar.gz',
      keywords=['genepattern', 'ipython', 'jupyter', 'nbextensions'],
      classifiers=[
          'Development Status :: 4 - Beta',
          'Intended Audience :: Science/Research',
          'Intended Audience :: Developers',
          'License :: OSI Approved :: BSD License',
          'Programming Language :: Python :: 3.5',
          'Programming Language :: Python :: 3.6',
          'Programming Language :: Python :: 3.7',
          'Framework :: Jupyter',
      ],
      install_requires=[
          'IPython>=5.0.0',
          'notebook>=5.3.0',
          'ipywidgets>=7.0.0',
      ],
      package_data={'nbtools': ['static/*',
                                'jsobject/backend_context.js', 'jsobject/jsobject.py', 'jsobject/utils.py', 'jsobject/__init__.py']},
      data_files=get_data_files(),
      )


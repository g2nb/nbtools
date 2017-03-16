from distutils.core import setup
from setuptools.command.install import install as _install
from setuptools.command.develop import develop as _develop


def _post_install():
    import subprocess
    from distutils import log
    log.set_verbosity(log.DEBUG)

    try:
        # Enable the required nbextension for ipywidgets
        subprocess.call(["jupyter", "nbextension", "enable", "--py", "widgetsnbextension"])

        # Enable the GenePattern Notebook extension
        subprocess.call(["jupyter", "nbextension", "install", "--py", "nbtools"])
        subprocess.call(["jupyter", "nbextension", "enable", "--py", "nbtools"])
        subprocess.call(["jupyter", "serverextension", "enable", "--py", "nbtools"])
    except:
        log.warn("Unable to automatically enable Notebook Tool Manager extension for Jupyter.\n" +
                 "Please manually enable the extension by running the following commands:\n" +
                 "jupyter nbextension enable --py widgetsnbextension\n" +
                 "jupyter nbextension install --py nbtools\n" +
                 "jupyter nbextension enable --py nbtools\n" +
                 "jupyter serverextension enable --py nbtools\n")


class NBInstall(_install):
    def run(self):
        _install.run(self)
        self.execute(_post_install, [], msg="Running post install task")


class NBDevelop(_develop):
    def run(self):
        _develop.run(self)
        self.execute(_post_install, [], msg="Running post develop task")


setup(name='nbtools',
      packages=['nbtools'],
      version='0.1.0 RC2',
      description='A lightweight manager for registering and browsing Jupyter tools',
      license='BSD',
      author='Thorin Tabor',
      author_email='thorin@broadinstitute.org',
      url='https://github.com/genepattern/nbtool-manager',
      download_url='https://github.com/genepattern/nbtool-manager/archive/0.1.0.tar.gz',
      keywords=['genepattern', 'genomics', 'bioinformatics', 'ipython', 'jupyter'],
      classifiers=[
          'Development Status :: 4 - Beta',
          'Intended Audience :: Science/Research',
          'Intended Audience :: Developers',
          'Topic :: Scientific/Engineering :: Bio-Informatics',
          'License :: OSI Approved :: BSD License',
          'Programming Language :: Python',
          'Framework :: IPython',
      ],
      install_requires=[
          'jupyter',
          'notebook>=4.2.0',
          'ipywidgets>=5.0.0',
      ],
      cmdclass={'install': NBInstall, 'develop': NBDevelop},
      package_data={'nbtools': ['static/nbtools.js']},
      )

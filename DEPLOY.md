# How to Deploy to PyPi Test

1. Make sure setup.py and nbtools.__version__ are updated.
2. Navigate to the correct directory:
> cd nbtool-manager
3. Upload the files by running:
> python setup.py sdist upload -r pypitest
4. If the upload fails go to [https://testpypi.python.org/pypi](https://testpypi.python.org/pypi) and manually upload dist/nbtools-*.tar.gz.
5. Test the deploy by uninstalling and reinstalling the package: 
> sudo pip uninstall nbtools;
> sudo pip install -i https://testpypi.python.org/pypi nbtools

# How to Deploy to Production PyPi

1. First deploy to test and ensure everything is working correctly (see above).
2. Navigate to the correct directory:
> cd nbtool-manager
3. Upload the files by running:
> python setup.py sdist upload
4. If the upload fails go to [https://pypi.python.org/pypi](https://pypi.python.org/pypi) and manually upload dist/nbtools-*.tar.gz.
5. Test the deploy by uninstalling and reinstalling the package: 
> sudo pip uninstall nbtools;
> sudo pip install nbtools

# How to Deploy to Conda

1. Deploy to Production PyPi
2. Navigate to Anaconda directory
> cd anaconda
3. Run the following, removing the existing directory if necessary:
> conda skeleton pypi nbtools --version XXX
4. Build the package:
> conda build nbtools
5. Upload the newly built package:
> anaconda upload /Users/tabor/anaconda/conda-bld/osx-64/nbtools-XXX-py35_0.tar.bz2 -u genepattern
6. Converting this package to builds for other operating systems can be done as shown below. You will need to upload each 
built version using a separate upload command.
> conda convert --platform all /Users/tabor/anaconda/conda-bld/osx-64/nbtools-XXX-py35_0.tar.bz2 -o conda-bld/
7. Log into the [Anaconda website](https://anaconda.org/) to make sure everything is good.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  // Add any needed widget imports here (or from controls)
} from '@jupyter-widgets/base';

import {
  createTestModel
} from './utils.spec';

import {
  UIOutputModel
} from '../../src/'


describe('UIOutput', () => {

  describe('UIOutputModel', () => {

    it('should be createable', () => {
      let model = createTestModel(UIOutputModel);
      expect(model).to.be.an(UIOutputModel);
      expect(model.get('name')).to.be('Python Results');
    });

    it('should be createable with a value', () => {
      let state = { name: 'Foo Bar!' };
      let model = createTestModel(UIOutputModel, state);
      expect(model).to.be.an(UIOutputModel);
      expect(model.get('name')).to.be('Foo Bar!');
    });

  });

});

'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Model = require('../models/model');

const models = module.context.collection('models');
const keySchema = joi.string().required()
.description('The key of the model');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('model');


router.get(function (req, res) {
  res.send(models.all());
}, 'list')
.response([Model], 'A list of models.')
.summary('List all models')
.description(dd`
  Retrieves a list of all models.
`);


router.post(function (req, res) {
  const model = req.body;
  let meta;
  try {
    meta = models.save(model);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(model, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: model._key})
  ));
  res.send(model);
}, 'create')
.body(Model, 'The model to create.')
.response(201, Model, 'The created model.')
.error(HTTP_CONFLICT, 'The model already exists.')
.summary('Create a new model')
.description(dd`
  Creates a new model from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let model
  try {
    model = models.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(model);
}, 'detail')
.pathParam('key', keySchema)
.response(Model, 'The model.')
.summary('Fetch a model')
.description(dd`
  Retrieves a model by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const model = req.body;
  let meta;
  try {
    meta = models.replace(key, model);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(model, meta);
  res.send(model);
}, 'replace')
.pathParam('key', keySchema)
.body(Model, 'The data to replace the model with.')
.response(Model, 'The new model.')
.summary('Replace a model')
.description(dd`
  Replaces an existing model with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let model;
  try {
    models.update(key, patchData);
    model = models.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(model);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the model with.'))
.response(Model, 'The updated model.')
.summary('Update a model')
.description(dd`
  Patches a model with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    models.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a model')
.description(dd`
  Deletes a model from the database.
`);

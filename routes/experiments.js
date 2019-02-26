'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Experiment = require('../models/experiment');

const experiments = module.context.collection('experiments');
const keySchema = joi.string().required()
.description('The key of the experiment');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('experiment');


router.get(function (req, res) {
  res.send(experiments.all());
}, 'list')
.response([Experiment], 'A list of experiments.')
.summary('List all experiments')
.description(dd`
  Retrieves a list of all experiments.
`);


router.post(function (req, res) {
  const experiment = req.body;
  let meta;
  try {
    meta = experiments.save(experiment);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(experiment, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: experiment._key})
  ));
  res.send(experiment);
}, 'create')
.body(Experiment, 'The experiment to create.')
.response(201, Experiment, 'The created experiment.')
.error(HTTP_CONFLICT, 'The experiment already exists.')
.summary('Create a new experiment')
.description(dd`
  Creates a new experiment from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let experiment
  try {
    experiment = experiments.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(experiment);
}, 'detail')
.pathParam('key', keySchema)
.response(Experiment, 'The experiment.')
.summary('Fetch a experiment')
.description(dd`
  Retrieves a experiment by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const experiment = req.body;
  let meta;
  try {
    meta = experiments.replace(key, experiment);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(experiment, meta);
  res.send(experiment);
}, 'replace')
.pathParam('key', keySchema)
.body(Experiment, 'The data to replace the experiment with.')
.response(Experiment, 'The new experiment.')
.summary('Replace a experiment')
.description(dd`
  Replaces an existing experiment with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let experiment;
  try {
    experiments.update(key, patchData);
    experiment = experiments.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(experiment);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the experiment with.'))
.response(Experiment, 'The updated experiment.')
.summary('Update a experiment')
.description(dd`
  Patches a experiment with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    experiments.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a experiment')
.description(dd`
  Deletes a experiment from the database.
`);

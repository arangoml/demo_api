'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Notebook = require('../models/notebook');

const notebooks = module.context.collection('notebooks');
const keySchema = joi.string().required()
.description('The key of the notebook');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('notebook');


router.get(function (req, res) {
  res.send(notebooks.all());
}, 'list')
.response([Notebook], 'A list of notebooks.')
.summary('List all notebooks')
.description(dd`
  Retrieves a list of all notebooks.
`);


router.post(function (req, res) {
  const notebook = req.body;
  let meta;
  try {
    meta = notebooks.save(notebook);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(notebook, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: notebook._key})
  ));
  res.send(notebook);
}, 'create')
.body(Notebook, 'The notebook to create.')
.response(201, Notebook, 'The created notebook.')
.error(HTTP_CONFLICT, 'The notebook already exists.')
.summary('Create a new notebook')
.description(dd`
  Creates a new notebook from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let notebook
  try {
    notebook = notebooks.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(notebook);
}, 'detail')
.pathParam('key', keySchema)
.response(Notebook, 'The notebook.')
.summary('Fetch a notebook')
.description(dd`
  Retrieves a notebook by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const notebook = req.body;
  let meta;
  try {
    meta = notebooks.replace(key, notebook);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(notebook, meta);
  res.send(notebook);
}, 'replace')
.pathParam('key', keySchema)
.body(Notebook, 'The data to replace the notebook with.')
.response(Notebook, 'The new notebook.')
.summary('Replace a notebook')
.description(dd`
  Replaces an existing notebook with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let notebook;
  try {
    notebooks.update(key, patchData);
    notebook = notebooks.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(notebook);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the notebook with.'))
.response(Notebook, 'The updated notebook.')
.summary('Update a notebook')
.description(dd`
  Patches a notebook with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    notebooks.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a notebook')
.description(dd`
  Deletes a notebook from the database.
`);

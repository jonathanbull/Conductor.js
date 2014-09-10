/**
 * indexed-db.js
 *
 * The indexedDB implementation of the database
 *
 * Usage:
 *
 *   context.indexedDb(
 *       config,
 *       models,
 *       context.mixin
 *   ).then(function (db) {
 *      db.insert('studio', studios).then(function () {
 *           var query = {
 *               studio : 5671,
 *               date : {
 *                   greaterThanOrEqual : '2014-08-14',
 *                   lessThanOrEqual : '2014-08-18'
 *               }
 *           };
 *           db.findBy('event', query).then(function (events) {
 *               alert(events);
 *           });
 *    });
 *
 * Dependencies:
 *  - namespace : The namespace to apply the kernel object to, e.g 'window.myapp;'
 *  - models/base.js
 *  - jQuery
 *  - promise.js
 */
(function ($, context) {

    "use strict";

    /**
     * Constructor for the IndexedDB object.
     *
     * @public
     * @constructor
     * @param {{
     *      dbName: string
     *      dbDescription: string
     *      dbVersion: int
     * }} config : The configuration object for the database
     * @param {array} models : The models the database must support
     * @param {function} mixin : The mixin function that applies helper functions
     * to the database object
     * @return {object} The Promise of a IndexedDB object.
     */
    context.indexedDb = function (config, models, mixin) {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        /**
         * Apply the mixin function to the base object
         */
        mixin(base);

        /**
         * A reference to the models array
         * @type {array}
         */
        base.models = models;

        /**
         * Opens the database, and creates indexes for the models if an upgrade
         * is required.
         *
         * @param {function(object)} callback : The callback which is called when the db
         * is open
         */
        base.open = function (callback) {
            var request = indexedDB.open(config.dbName, config.dbVersion);

            /**
             * Called when an upgrade is required (when the DB version number
             * has incremented)
             *
             * @param {function(object)} e : The on upgrade needed event.
             */
            request.onupgradeneeded = function (e) {
                var db = e.target.result;

                e.target.transaction.onerror = function (error) {
                    base.onError(error);
                };

                /**
                 * Creates a new object store for a specified model. If an object
                 * store by that name already exists, it is deleted
                 *
                 * @param {object} model : The model to create the store for
                 */
                var createObjectStore = function (model) {
                    if (db.objectStoreNames.contains(base.models[model].modelName())) {
                        db.deleteObjectStore(base.models[model].modelName());
                    }

                    var keys = base.getKeysFromObject(base.models[model]);
                    var store = null;

                    if (typeof keys.id === 'undefined') {
                        store = db.createObjectStore(
                            models[model].modelName(),
                            { keyPath: "id", autoIncrement:true }
                        );
                    } else {
                        store = db.createObjectStore(
                            models[model].modelName(),
                            { keyPath: "id" }
                        );
                    }

                    if (context.indexes[model]) {
                        $.each(context.indexes[model], function (i, modelIndex) {
                            if (modelIndex !== 'id') {
                                if ($.isArray(modelIndex)) {
                                    store.createIndex(
                                        modelIndex.toString(),
                                        modelIndex,
                                        { unique: false }
                                    );
                                } else {
                                    store.createIndex(
                                        modelIndex,
                                        modelIndex,
                                        { unique: false }
                                    );
                                }
                            }
                        });
                    }

                    store.createIndex('id', 'id', { unique: true });
                };

                if (base.models) {
                    for (var model in base.models) {
                        createObjectStore(model);
                    }
                }
            };

            request.onsuccess = function (e) {
                if (typeof callback !== 'undefined') {
                    callback(e.target.result, false);
                }
            };

            request.onerror = function (error) {
                if (typeof callback !== 'undefined') {
                    callback(null, true);
                }
            };
        };

        /**
         * Insert a single model into its object store.
         *
         * @param {string} modelName : The name of the model
         * @param {object} entity : The model to insert into the store, can be a
         * 'rich' model, or a normal object that shares the same data attributes
         * @return {promise} : A promise, which is fulfilled when the model is
         * inserted
         */
        base.insertObject = function (modelName, entity) {
            return new Promise(function (fulfill, reject) {
                base.open(function (db) {
                    var model = base.models[modelName].createFromObject(entity);
                    var trans = db.transaction([model.modelName()], "readwrite");
                    var store = trans.objectStore(model.modelName());
                    var request = store.put(model.clone());

                    request.onsuccess = fulfill;
                    request.onerror = reject;
                });
            });
        };

        /**
         * Insert a single or multiple models into the corresponding object store.
         *
         * @param {string} modelName : The name of the model
         * @param {object|array} entity :  The model(s) to insert into the store,
         * can be a 'rich' model, or a normal object that shares the same data
         * attributes
         * @return {promise} : A promise, which is fulfilled when the model(s) are
         * inserted
         */
        base.insert = function (modelName, entity) {
            if ($.isArray(entity)) {
                return Promise.all(entity.map(function (entity) {
                    return base.insertObject(modelName, entity);
                }));
            }

            return base.insertObject(modelName, entity);
        };

        /**
         * Find a single model.
         *
         * @param {string} modelName : The name of the model
         * @param {object|null} attributes : The attributes to find the model
         * by, if null is equivalent of performing a 'Select *' in SQL
         * @return {promise} : A promise, which fulfilled what the model(s) are
         * found
         */
        base.findOneBy = function (modelName, attributes, orderBy) {
            var keys = base.getKeysFromObject(attributes);

            if (keys.length === 1 && keys[0] === 'id') {
                return base.findObjectById(modelName, attributes.id);
            }

            return new Promise(function (fulfill, reject) {
                base.findBy(modelName, attributes, orderBy).then(
                    function (returnedObject) {
                        if (returnedObject && returnedObject[0]) {
                            fulfill(returnedObject[0]);
                        } else {
                            fulfill(null);
                        }
                    },
                    reject
                );
            });
        };

        /**
         * Find a single model by its ID. In a seperate function to a normal
         * search as this is performed differently in indexedDB.
         *
         * @param {string} modelName : The name of the model
         * @param {object} id : The id of the object
         * @return {promise} : A promise, which fulfilled when the model is
         * found
         */
        base.findObjectById = function (modelName, id) {
            return new Promise(function (fulfill, reject) {

                var model = base.models[modelName];

                if (typeof model === 'undefined') {
                    reject();
                } else {
                    base.open(function (db) {
                        var transaction = db.transaction([model.modelName()]);
                        var objectStore = transaction.objectStore(model.modelName());
                        var req = objectStore.get(id);

                        req.onsuccess = function () {
                            if (req.result) {
                                fulfill(model.createFromObject(req.result));
                            } else {
                                fulfill(null);
                            }
                        };

                        req.onerror = reject;
                    });
                }
            });
        };

        /**
         * Delete model(s) by supplied attributes. If no attributes are supplied
         * all models in the object store will be deleted.
         *
         * @param {string} modelName : The name of the model
         * @param {object} attributes : The attributes to delete by
         * @return {promise} : A promise, which is fulfilled when the model(s) are
         * deleted
         */
        base.deleteBy = function (modelName, attributes) {
            return new Promise(function (fulfill, reject) {
                base.findBy(modelName, attributes)
                    .then(
                        function (itemsToDelete) {
                            //Nothing to delete, fulfill promise.
                            if (itemsToDelete.length === 0) {
                                fulfill();
                            } else {
                                Promise.all(itemsToDelete.map(base.deleteItem)).then(fulfill, reject);
                            }
                        },
                        reject
                    );
            });
        };

        /**
         * Delete a single model by supplied attributes.
         *
         * @param {string} modelName : The name of the model
         * @param {object} attributes : The attributes to delete by
         * @return {promise} : A promise, which is fulfilled when the model is
         * deleted
         */
        base.deleteItem = function (item) {
            return new Promise(function (fulfill, reject) {
                base.open(function (db) {
                    var transaction = db.transaction([item.modelName()], "readwrite");
                    var objectStore = transaction.objectStore(item.modelName());
                    var request = objectStore.delete(item.id);
                    request.onsuccess = fulfill;
                    request.onerror = reject;
                });
            });
        };

        /**
         * Manually reduce a result set based on the supplied attributes.
         *
         * @param {array} results : The initial results
         * @param {object} attributes : The attributes to reduce by
         * @return {array} : The reduced results
         */
        base.reduce = function (results, attributes, orderBy) {
            var reducedResults = [];
            var keys = base.getKeysFromObject(attributes);
            var values = base.getValuesFromObject(attributes);

            $.map(results, function (result, index) {
                var isValid = true;

                $.each(keys, function (index, key) {
                    if (typeof attributes[key] === 'object') {
                        var ruleToCheck = attributes[key];
                        for (var rule in ruleToCheck) {
                            var valueToBe = ruleToCheck[rule];
                            var actualValue = result[key];
                            isValid = base.reduceOperators[rule](actualValue, valueToBe);
                            if (!isValid) {
                                break;
                            }
                        }
                    } else {
                        isValid = result[key] === attributes[key];
                        if (!isValid) {
                            return false;
                        }
                    }
                });

                if (isValid) {
                    reducedResults.push(result);
                }
            });

            if (orderBy) {
                var sortAttribute = Object.keys(orderBy)[0];
                var direction = orderBy[sortAttribute];

                reducedResults.sort(function (a, b) {
                    if (a[sortAttribute] < b[sortAttribute]) {
                        return direction === 'asc' ? -1 : 1;
                    }

                    if (a[sortAttribute] > b[sortAttribute]) {
                        return direction === 'asc' ? 1 : -1;
                    }

                    return 0;
                });
            }

            return reducedResults;
        };

        base.reduceOperators = {
            greaterThan: function (a, b) {
                return a > b;
            },
            greaterThanOrEqual: function (a, b) {
                return a >= b;
            },
            lessThan:  function (a, b) {
                return a < b;
            },
            lessThanOrEqual:  function (a, b) {
                return a <= b;
            }
        };

        /**
         * Find a multiple models by their attributes, by retrieving all items
         * in the object store and manually reducing them.
         *
         * @param {string} modelName : The name of the model
         * @param {object|null} attributes : The attributes to find the model
         * by, if null is equivalent of performing a 'Select *' in SQL
         * @return {promise} : A promise, which fulfilled what the model(s) are
         * found
         */
        base.findObjectsByAttributeNoIndex = function (modelName, attributes, orderBy) {
            var model = base.models[modelName];

            if (typeof model === 'undefined') {
                return Promise.reject();
            }

            return new Promise(function (fulfill, reject) {
                base.open(function (db) {
                    var transaction = db.transaction([model.modelName()]);
                    var objectStore = transaction.objectStore(model.modelName());
                    var req = objectStore.openCursor();
                    var results = [];

                    req.onsuccess = function () {
                        var cursor = req.result;

                        if(cursor) {
                            var item = cursor.value;
                            results.push(model.createFromObject(item));
                            cursor.continue();
                        } else {
                            if (attributes || orderBy) {
                                results = base.reduce(results, attributes, orderBy);
                            }

                            fulfill(results);
                        }
                    };

                    req.onerror = reject;
                });
            });
        };

        /**
         * Find a multiple models by their attributes, using an indexed query.
         *
         * @param {string} modelName : The name of the model
         * @param {object|null} attributes : The attributes to find the model
         * by, if null is equivalent of performing a 'Select *' in SQL
         * @return {promise} : A promise, which fulfilled what the model(s) are
         * found
         */
        base.findObjectsByAttributeWithIndex = function (modelName, attributes, orderBy) {
            var model = base.models[modelName];

            if (typeof model === 'undefined') {
                return Promise.reject();
            }

            return new Promise(function (fulfill, reject) {
                base.open(function (db) {
                    var transaction = db.transaction([model.modelName()]);
                    var objectStore = transaction.objectStore(model.modelName());
                    var keys = base.getKeysFromObject(attributes);
                    var queryKeys = keys;

                    var req = objectStore.index(queryKeys.toString()).openCursor(
                        base.generateIDBKeyRange(attributes, orderBy),
                        base.getDirection(orderBy)
                    );

                    var results = [];

                    req.onsuccess = function () {
                        var cursor = req.result;

                        if(cursor) {
                            var item = cursor.value;
                            results.push(model.createFromObject(item));
                            cursor.continue();
                        } else {
                            fulfill(results);
                        }
                    };

                    req.onerror = reject;
                });
            });
        };

        /**
         * Determine the 'direction' or order of a query.
         *
         * @param {object|null} orderBy : The attributes to order the query by
         * @return {string} : The direction constant to use
         */
        base.getDirection = function (orderBy) {
            if (typeof orderBy === 'undefined' ||
                orderBy[Object.keys(orderBy)[0]] === 'asc') {
                return 'next';
            } else {
                return 'prev';
            }
        };

        /**
         * Find a multiple models by their attributes.
         *
         * @param {string} modelName : The name of the model
         * @param {object|null} attributes : The attributes to find the model
         * by, if null is equivalent of performing a 'Select *' in SQL
         * @return {promise} : A promise, which fulfilled what the model(s) are
         * found
         */
        base.findBy = function (modelName, attributes, orderBy) {

            var model = base.models[modelName];

            if (typeof model === 'undefined') {
                return Promise.reject();
            }

            var queryKeys = base.getKeysFromObject(attributes);

            if (!context.indexes[model.modelName()] || !base.isValidQuery(attributes)) {
                return base.findObjectsByAttributeNoIndex(modelName, attributes, orderBy);
            }

            for (var i = 0; i < context.indexes[model.modelName()].length; i++) {
                if (queryKeys.toString() === context.indexes[model.modelName()][i].toString()) {
                    return base.findObjectsByAttributeWithIndex(modelName, attributes, orderBy);
                }
            }

            return base.findObjectsByAttributeNoIndex(modelName, attributes, orderBy);
        };

        base.indexOperators = {
            greaterThan: function (value) {
                return IDBKeyRange.lowerBound(value, true);
            },
            greaterThanOrEqual: function (value) {
                return IDBKeyRange.lowerBound(value);
            },
            lessThan:  function (value) {
                return IDBKeyRange.upperBound(value, true);
            },
            lessThanOrEqual:  function (value) {
                return IDBKeyRange.upperBound(value);
            }
        };

        /**
         * Determine if a query is 'valid', as in it can expressed using the
         * IndexedDB 'bound', 'lowerbound' or 'upperbound' API.
         *
         * @param {object|null} attributes : The attributes for the query to be
         * checked
         * @return {boolean}
         */
        base.isValidQuery = function (attributes) {
            var keys = base.getKeysFromObject(attributes);
            var values = base.getValuesFromObject(attributes);

            if (values.length === 1) {
                return true;
            }

            var lowerboundCount = 0;
            var upperBoundCount = 0;

            $.each(values, function (index, query) {
                if (typeof query !== 'object') {
                    lowerboundCount = lowerboundCount + 1;
                    upperBoundCount = upperBoundCount + 1;
                } else {
                    var queryKeys = Object.keys(query);

                    if (queryKeys.indexOf('greaterThanOrEqual') > -1 ||
                        queryKeys.indexOf('greaterThan') > -1) {
                            lowerboundCount = lowerboundCount + 1;
                    }

                    if (queryKeys.indexOf('lessThanOrEqual') > -1 ||
                        queryKeys.indexOf('lessThan') > -1) {
                        upperBoundCount = upperBoundCount + 1;
                    }
                }
            });

            if (upperBoundCount.length === lowerboundCount.length) {
                return true;
            }

            if (lowerboundCount.length !== upperBoundCount.length &&
                (lowerboundCount.length > 0 && upperBoundCount.length > 0)) {
                return false;
            } else if (lowerboundCount.length !== upperBoundCount.length) {
                return true;
            }

            return true;
        };

        /**
         * Returns a IDBKeyRange object, which is used to query IndexedDB that
         * matches the supplied query.
         *
         * @param {object} query : The query
         * @return {object} : IDBKeyRange
         */
        base.generateIDBKeyRange = function (attributes, orderBy) {
            var keys = base.getKeysFromObject(attributes);
            var values = base.getValuesFromObject(attributes);

            var lowerOpen = false;
            var upperOpen = false;

            var lowerbound = [];
            var upperBound = [];

            //generate lower bound array
            $.each(values, function (index, query) {
                if (typeof query !== 'object') {
                    lowerbound.push(query);
                } else {
                    var queryKeys = Object.keys(query);

                    if (queryKeys.indexOf('greaterThanOrEqual') > -1) {
                        lowerbound.push(query.greaterThanOrEqual);
                    } else if (queryKeys.indexOf('greaterThan') > -1) {
                        lowerbound.push(query.greaterThan);
                        lowerOpen = true;
                    }
                }
            });

            //generate higher bound array
            $.each(values, function (index, query) {
                if (typeof query !== 'object') {
                    upperBound.push(query);
                } else {
                    var queryKeys = Object.keys(query);

                    if (queryKeys.indexOf('lessThanOrEqual') > -1) {
                        upperBound.push(query.lessThanOrEqual);
                    } else if (queryKeys.indexOf('lessThan') > -1) {
                        upperBound.push(query.lessThan);
                        upperOpen = true;
                    }
                }
            });

            if (lowerbound.length !== upperBound.length && lowerbound) {
                lowerbound = lowerbound.length === 1 ? lowerbound[0] : lowerbound;

                return IDBKeyRange.lowerBound(
                    lowerbound,
                    lowerOpen
                );
            } else if (lowerbound.length !== upperBound.length && upperBound) {
                upperBound = upperBound.length === 1 ? upperBound[0] : upperBound;

                return IDBKeyRange.upperBound(
                    upperBound,
                    upperOpen
                );
            }

            lowerbound = lowerbound.length === 1 ? lowerbound[0] : lowerbound;
            upperBound = upperBound.length === 1 ? upperBound[0] : upperBound;

            return IDBKeyRange.bound(
                lowerbound,
                upperBound,
                lowerOpen,
                upperOpen
            );
        };

        return new Promise(function (fulfill, reject) {
            base.open(function (indexedDb, error) {
                if (!error) {
                    var db = {
                        type : 'IndexedDb',
                        insert : base.insert,
                        findOneBy: base.findOneBy,
                        findBy : base.findBy,
                        deleteBy : base.deleteBy
                    };

                    fulfill(db);
                } else {
                    reject();
                }
            });
        });
    };

}(jQuery, conductorContext));

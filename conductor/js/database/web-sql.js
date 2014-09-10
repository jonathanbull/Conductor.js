/**
 * web-sql.js
 *
 * The WebSQL implementation of the database
 *
 * Usage:
 *
 *   context.WebSQL(
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
     * Constructor for the WebSQL object.
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
     * @return {object} The Promise of a WebSQL object.
     */
    context.WebSQL = function (config, models, mixin) {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        base.operators = {
            greaterThan: '>',
            greaterThanOrEqual: '>=',
            lessThan: '<',
            lessThanOrEqual: '<='
        };

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
         * Will generate a 'WHERE' clause for SQL statements, based on the
         * attributes passed in.
         * @param {object} attributes : The attributes to generate the statement
         * by
         * @return {string} : The where clause
         */
        base.generateWhereClause = function (attributes) {
            var sql = '';
            var keys = base.getKeysFromObject(attributes);

            $.each(keys, function (index, key) {
                if (attributes[key] !== null && typeof attributes[key] === 'object') {
                    var operatorKeys = base.getKeysFromObject(attributes[key]);

                    $.each(operatorKeys, function (operatorIndex, operatorKey) {
                        sql = sql + (base.isFirst(operatorIndex) ? ' WHERE ' : '') +
                            key + ' ' + base.operators[operatorKey] + ' ? ' +
                            (!base.isLast(operatorIndex, operatorKeys.length) ? 'AND ' : '');
                    });
                } else {
                    sql = sql + (base.isFirst(index) ? ' WHERE ' : '') +
                        key + ' = ? ' + (!base.isLast(index, keys.length) ? 'AND ' : '');
                }
            });

            return sql;
        };

        /**
         * Will generate a 'ORDER BY' clause for SQL statements, based on the
         * attributes passed in.
         * @param {object} attributes : The attributes to generate the statement
         * by
         * @return {string} : The order by clause
         */
        base.generateOrderByClause = function (attributes) {
            var sql = '';
            var keys = base.getKeysFromObject(attributes);

            $.each(keys, function (index, key) {
                sql = sql + (base.isFirst(index) ? ' ORDER BY ' : '') +
                    key + ' ' + attributes[key] + ' ' + (!base.isLast(index, keys.length) ? ', ' : '');
            });

            return sql;
        };

        /**
         * Will generate a 'SELECT' query for a model, based on the attributes
         * passed in.
         * @param {object|null} attributes : The attributes to select the model
         * by, if null no where clause will be added.
         * @return {string} : The SQL statement
         */
        base.generateSelectQuery = function (model, attributes, orderBy) {
            var sql = 'SELECT * FROM ' + model.modelName();

            if (attributes) {
                sql = sql + base.generateWhereClause(attributes);
            }

            if (orderBy) {
                sql = sql + base.generateOrderByClause(orderBy);
            }

            return sql;
        };

        /**
         * Will generate a 'DELETE' query for a model, based on the attributes
         * passed in.
         * @param {object|null} attributes : The attributes to delete the model
         * by, if null no where clause will be added.
         * @return {string} : The SQL statement
         */
        base.generateDeleteQuery = function (model, attributes) {
            var sql = 'DELETE FROM ' + model.modelName();

            if (attributes) {
                sql = sql + base.generateWhereClause(attributes);
            }

            return sql;
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
         * Find multiple models.
         *
         * @param {string} modelName : The name of the model
         * @param {object|null} attributes : The attributes to find the model
         * by, if null is equivalent of performing a 'Select *' in SQL
         * @return {promise} : A promise, which fulfilled what the model(s) are
         * found
         */
        base.findBy = function (modelName, attributes, orderBy) {
            return new Promise(function (fulfill, reject) {
                var values = [];
                var model = base.models[modelName];
                var sql = base.generateSelectQuery(model, attributes, orderBy);

                if (attributes) {
                    values = base.getValuesFromObject(attributes, true);
                }

                var convertRowsToArray = function (tx, result) {
                    var results = [];

                    for (var i = 0; i < result.rows.length; i++) {
                        var row = result.rows.item(i);
                        var returnedObject = model.createFromObject(row);
                        results.push(returnedObject);
                    }

                    fulfill(results);
                };

                base.db.transaction(
                    function (tx) {
                        tx.executeSql(sql, values, convertRowsToArray);
                    },
                    reject
                );
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
                var values = [];
                var model = base.models[modelName];
                var sql = base.generateDeleteQuery(model, attributes);

                if (attributes) {
                    values = base.getValuesFromObject(attributes);
                }

                base.db.transaction(
                    function(tx) {
                        tx.executeSql(sql, values, fulfill, reject);
                    },
                    reject
                );
            });
        };

        /**
         * Insert a single model into its table
         *
         * @param {string} modelName : The name of the model
         * @param {object} entity : The model to insert into the table, can be a
         * 'rich' model, or a normal object that shares the same data attributes
         * @return {promise} : A promise, which is fulfilled when the model is
         * inserted
         */
        base.insertObject = function (modelName, entity) {
            return new Promise(function (fulfill, reject) {
                var model = base.models[modelName].createFromObject(entity);
                var keys = base.getKeysFromObject(model);
                var values = base.getValuesFromObject(model);
                var sql = 'INSERT OR REPLACE INTO ' + model.modelName() + ' (';

                $.each(keys, function (index, key) {
                   sql = sql + key + (base.isLast(index, keys.length) ? '': ',');
                });

                sql = sql + ') VALUES (';

                $.each(keys, function (index, key) {
                   sql = sql + '?' + (base.isLast(index, keys.length) ? '': ',');
                });

                sql = sql + ');';

                base.db.transaction(
                    function (tx) {
                        tx.executeSql(sql, values);
                    },
                    reject,
                    fulfill
                );
            });
        };

        /**
         * Insert a single or multiple models into the corresponding table.
         *
         * @param {string} modelName : The name of the model
         * @param {object|array} entity :  The model(s) to insert into the table,
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
            } else {
                return base.insertObject(modelName, entity);
            }
        };

        /**
         * Will create a table for a model, creating columns based on the
         * models attributes
         *
         * @param {object} model :  The model to create the table for
         * @return {promise} : A promise, which is fulfilled when the table has
         * been created
         */
        base.createTable = function (model) {
            return new Promise(function (fulfill, reject) {
                var keys = base.getKeysFromObject(model);
                var sql = 'CREATE TABLE IF NOT EXISTS ' + model.modelName() + ' (';

                $.each(keys, function (index, key) {
                    if (key === 'id') {
                        sql = sql + key + ' PRIMARY KEY' + (base.isLast(index, keys.length) ? '': ',');
                    } else {
                        sql = sql + key + (base.isLast(index, keys.length) ? '': ',');
                    }
                });

                sql = sql + ');';

                base.db.transaction(function (tx) {
                   tx.executeSql(sql, [], fulfill, reject);
                });
            });
        };

        /**
         * Will drop a models table
         *
         * @param {object} model :  The model to drop the table of
         * @return {promise} : A promise, which is fulfilled when the table has
         * been dropped
         */
        base.dropTable = function (model) {
            return new Promise(function (fulfill, reject) {
                var keys = base.getKeysFromObject(model);
                var sql = 'DROP TABLE IF EXISTS ' + model.modelName();

                base.db.transaction(function (tx) {
                   tx.executeSql(sql, [], fulfill, reject);
                });
            });
        };

        return new Promise(function (fulfill, reject) {
            base.db = openDatabase(
                config.dbName,
                '',
                config.dbDescription,
                2 * 1024 * 1024
            );

            var db = {
                type : 'WebSQL',
                insert : base.insert,
                findOneBy : base.findOneBy,
                findBy : base.findBy,
                deleteBy : base.deleteBy
            };

            if (base.db.version != config.dbVersion) {
                var count = 0;

                /**
                 * Check the number of models processed. If all models have been
                 * processed, increment the DB version and fulfill the promise.
                 */
                var incrementAndCheckProgress = function () {
                    count = count + 1;
                    if (Object.keys(base.models).length === count) {
                        base.db.changeVersion(base.db.version, config.dbVersion);
                        fulfill(db);
                    }
                };

                /**
                 * Will drop and then re-create the table for a given model.
                 *
                 * @param {object} model :  The model re-create the table for
                 */
                var dropAndCreateModels = function (model) {
                    base.dropTable(model).then(function () {
                        base.createTable(model).then(incrementAndCheckProgress);
                    });
                };

                /**
                 * If the DB version has incremented, re-create all tables.
                 */
                if (base.models) {
                    for (var model in base.models) {
                        dropAndCreateModels(models[model]);
                    }
                }
            } else {
                fulfill(db);
            }
        });
    };
}(jQuery, conductorContext));

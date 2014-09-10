/**
 * db-factory.js
 *
 * Factory object that returns a promise of either a IndexedDB or WebSQL based
 * DB, based on the browsers support.
 *
 * For both WebSQL and IndexedDB the following interface is returned:
 *   insert : Inserts a single or an array of objects
 *   findOneBy: finds a single object
 *   findBy : finds an array of objects
 *   deleteBy : deletes objects, based on supplied attributes
 *
 * Usage:
 *
 *   var dbConfig = {
 *       dbName: 'db_name',
 *       dbDescription: 'DB Description',
 *       dbVersion: 1
 *   };
 *
 *   var dbFactory = new context.dbFactory();
 *
 *   dbFactory.getDatabase(dbConfig).then(function (db) {
 *       var myDb = db;
 *   },
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
     * Constructor for the DB Factory.
     *
     * @public
     * @constructor
     * @return {
     *      {
     *          getDatabase : function ({object}, {string})
     *      }
     *  } The DB Factory.
     */
    context.dbFactory = function () {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        /**
         * Merges all the models defined in context.models with the 'Base'
         * model class, which includes additional helper functions that the DB's
         * use.
         *
         * @return {array} The transformed models.
         */
        base.transformModels = function () {
            var models = [];

            var tranformModel = function (modelName) {
                var baseM = new context.baseModel(modelName);
                var keys = baseM.getKeysFromObject(new context.models[modelName]());
                var obj = {};

                for (var i = 0, l = keys.length; i < l; i++) {
                    obj[keys[i]] = '';
                }

                var model = $.extend({}, obj, baseM);
                models[model.modelName()] = model;
            };

            for (var modelName in context.models) {
                tranformModel(modelName);
            }

            return models;
        };

        return {
            /**
             * Factory method that returns a promise of either a IndexedDB or
             * WebSQL based DB based on the browsers support or the optional
             * over-ride.
             *
             * @param {object} config : The database configuration.
             * @param {string|null} overRide : If required, a string can be
             * passed in to over-ride the default choice of database. Allowed
             * values are 'WebSql' or 'IndexedDb'
             *
             * @return {object} The Promise of the Database.
             */
            getDatabase : function (config, overRide) {
                var promiseOfDb = null;

                if (overRide === 'WebSql') {
                    promiseOfDb = new context.WebSQL(
                        config,
                        base.transformModels(),
                        context.mixin
                    );
                } else if (overRide === 'IndexedDb') {
                    promiseOfDb = new context.indexedDb(
                        config,
                        base.transformModels(),
                        context.mixin
                    );
                } else if (window.indexedDB) {
                    promiseOfDb = new context.indexedDb(
                        config,
                        base.transformModels(),
                        context.mixin
                    );
                } else {
                    promiseOfDb = new context.WebSQL(
                        config,
                        base.transformModels(),
                        context.mixin
                    );
                }

                return promiseOfDb;
            }
        };
    };

    /**
     * Helper function that applies common functions to both supported databases.
     *
     * @param {object} base : The database object to apply the functions to.
     */
    context.mixin = function (base) {

        /**
         * Helper function that checks if a callback is defined before calling
         * it. To be used for success events.
         *
         * @param {function|null} callback : The callback.
         */
        base.onSuccess = function (callback) {
            if (typeof callback !== 'undefined') {
                callback();
            }
        };

        /**
         * Helper function that checks if a callback is defined before calling
         * it, passing an error object to it. To be used when an error occurs.
         *
         * @param {object|null} error : The error
         * @param {function|null} callback : The callback
         */
        base.onError = function (error, callback) {
            if (typeof callback !== 'undefined') {
                callback(false, error.message);
            }
        };

        /**
         * Returns the keys of all the attributes of a JavaScript Object,
         * excluding functions
         *
         * @param {object} object : The object to retreive the keys from
         * @return {array} : An array of all the keys the object contained
         */
        base.getKeysFromObject = function (object) {
            var keys = [];

            for (var key in object) {
                if (!$.isFunction(object[key])) {
                    keys.push(key);
                }
            }

            return keys;
        };

        /**
         * Returns the values of all the attributs of a JavaScript Object,
         * excluding functions
         *
         * @param {object} object : The object to retreive the keys from
         * @param {boolean} deep : If set to true, will include all the values
         * of any sub-objects catained in the object passed
         * @return {array} : An array of all the values the object contained
         */
        base.getValuesFromObject = function (object, deep) {
            var values = [];

            for (var key in object) {
                if (deep && object[key] !== null &&
                    typeof object[key] === 'object') {
                    $.merge(values, base.getValuesFromObject(object[key], true));
                } else if (!$.isFunction(object[key])) {
                   values.push(object[key]);
                }
            }

            return values;
        };

        /**
         * Determine if an index is at the end of an array.
         *
         * @param {index} int : The current index
         * @param {length} int : The length of the array
         * @return {boolean}
         */
        base.isLast = function (index, length) {
            return (index + 1) === length;
        };

        /**
         * Determine if an index is at the start of an array.
         *
         * @param {index} int : The current index
         * @return {boolean}
         */
        base.isFirst = function (index) {
            return index === 0;
        };
    };

}(jQuery, conductorContext));

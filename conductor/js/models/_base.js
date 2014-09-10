/**
 * base.js
 *
 * The base model object, which is merged with all user defined models.
 * Contains various helper methods which are used by the database.
 *
 * Dependencies:
 *  - namespace : The namespace to apply the kernel object to, e.g 'window.myapp;'
 *  - jQuery
 */
(function ($, context) {

    "use strict";


    /**
     * Define the models object
     */
    context.models = {};

    /**
     * Define the models index object
     */
    context.indexes = {};


    /**
     * Constructor for the base model
     *
     * @public
     * @constructor
     * @return {
     *      {
            modelName : function,
            createFromObject: function ({object}),
            clone: function,
            getKeysFromObject: function ({object})
     *      }
     *  } The base model
     */
    context.baseModel = function (modelName, entity) {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

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
         * @return {array} : An array of all the values the object contained
         */
        base.getValuesFromObject = function (object) {
            var values = [];

            for (var key in object) {
                if (!$.isFunction(object[key])) {
                   values.push(object[key]);
                }
            }

            return values;
        };

        return {
            /**
             * Returns the name of the model - this will be the name of the
             * model the base model was merged with
             *
             * @return {string}
             */
            modelName : function () {
                return modelName;
            },
            /**
             * Creates a model object from the raw object returned from the
             * database
             *
             * @return {object} The model
             */
            createFromObject: function (object) {
                var baseM = new context.baseModel(modelName);
                var model = new context.models[modelName]();
                model = $.extend({}, object, baseM, model);
                return model;
            },
            /**
             * Creates a clone of the current object to inser tinto the database.
             * The clone will be same object, but with attributes that cannot be
             * stored in the database, such as functions, removed.
             *
             * @return {object} The clone
             */
            clone: function () {
                var keys = base.getKeysFromObject(this);
                var values = base.getValuesFromObject(this);
                var obj = {};

                for (var i = 0, l = values.length; i < l; i++) {
                    obj[keys[i]] = values[i];
                }

                return obj;
            },
            getKeysFromObject: base.getKeysFromObject
        };
    };
}(jQuery, conductorContext));

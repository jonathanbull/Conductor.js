/**
 * kernel.js
 *
 * The kernel for the application. Provides the interface to register models and
 * routes, access the database and initialise the routing.
 *
 *
 * Usage:
 *  var controller = new namespace.controller(controllerConfig);
 *
 *  var app = new namespace.Kernel();
 *
 *  app.on('#/hello/{name}', function(parameters) {
 *      controller.nameAction(parameters);
 *  });
 *
 *  var dbConfig = {
 *      dbName: 'hello_db',
 *      dbDescription: 'The Hello World DB',
 *      dbVersion: 1
 *  };
 *
 *  app.createDatabase(dbConfig).then(function () {
 *      app.start();
 *  });
 *
 * Dependencies:
 *  - namespace: The namespace to apply the kernel object to, e.g 'window.myapp;'
 *  - jQuery
 *  - Optional: baseModel & dbFactory - Classes required for database access are
 *              optional if a database is not required.
 */
(function ($, context) {

    "use strict";

    /**
     * Constructor for the Kernel object.
     *
     * @public
     * @constructor
     * @return {
     *      {
     *          start:function(object),
     *          getModels:function,
     *          getDb:function,
     *          on:function(string, function)
     *      }
     *  } The Kernel object.
     */
    context.Kernel = function () {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        /**
         * The model objects that have been registered with the kernel.
         *
         * @type {array}
         */
        var models = [];

        /**
         * The associative array of routes and their functions.
         *
         * @type {array}
         */
        base.routes = [];

        /**
         * Register a route with the application.
         *
         * @param {string} path : The hash URL the route is to match to.
         * @param {function} action : The function to be executed when the path
         *                            is matched.
         */
        base.registerRoute = function (path, action) {
            base.routes[path] = action;
        };

        /**
         * The database collection.
         *
         * @type {object}
         */
        base.databases = {};

        /**
         * Initialise the application database.
         *
         * @param {object} config : The database configuration, must include the
         *                          dbName, dbDescription and dbVersion.
         */
        base.initialiseDatabase = function (config) {

            return new Promise(function (fulfill, reject) {
                if (typeof context.dbFactory !== 'undefined') {
                    var dbFactory = new context.dbFactory();

                    dbFactory.getDatabase(config).then(function (db) {
                        base.databases[config.dbName] = db;
                        fulfill();
                    },
                    reject);
                } else {
                    reject();
                }
            });
        };

        return {
            /**
             * Will initialise the database if a database
             * configuration is provided.
             *
             * @param {object} config : The database configuration, must include the
             *                          dbName, dbDescription and dbVersion.
             */
            createDatabase: base.initialiseDatabase,
            /**
             * Starts the router, which in turn starts the application
             */
            start : function () {
                var router = new context.router(base.routes);
                window.onhashchange = router;
                router();
            },
            /**
             * Returns the database.
             *
             * @return {object|null} The database object or null if the database
             * was not initialised.
             */
            getDb: function (database) {
                // If there is only one Database, make it optional to
                // specify the name
                if (typeof database === 'undefined' &&
                    Object.keys(base.databases).length === 1) {
                    return base.databases[Object.keys(base.databases)[0]];
                }

                return base.databases[database];
            },
            on: base.registerRoute
        };
    };

}(jQuery, conductorContext));

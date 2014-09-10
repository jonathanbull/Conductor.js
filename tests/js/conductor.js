/**
 * Define the Conductor namespace, if not already defined.
 */
if (!conductorContext) {
    window.conductor = {};
    var conductorContext = window.conductor;
}

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

/**
 * router.js
 *
 * Provides hashbang routing functionality.
 *
 * Accepts an associative array of functions that are mapped to a route
 * (which may be parameterised). Returns a function that may be applied to the
 * 'window.onhashchange' object.
 *
 * When the hash URL matches the route, the function is executed and any
 * paramters are passed to the function in an associative array.
 *
 * Usage:
 *      var routes = [];
 *      routes['#/hello/{name}'] = function(parameters) {
 *          alert('Hello ' + paramters['name']);
 *      };
 *      var router = new context.router(base.routes);
 *      window.onhashchange = router;
 *
 * Dependencies:
 *  - namespace: The namespace to apply the router object to, e.g window.myapp;
 *
 */
(function (context) {

    "use strict";

    /**
     * Constructor for the router function.
     *
     * @public
     * @constructor
     * @param {array} routes The associative array of routes and functions.
     * @return {function} The router function.
     */
    context.router = function (routes) {

        /**
         * A reference to 'this' that can be used in other functions.
         *
         * @type {object}
         */
        var base = this;

        /**
         * The associative array of routes and functions.
         *
         * @type {array}
         */
        base.routes = routes;

        /**
         * A regex that is used to convert parameter names into regular expressions
         * to capture the paramters.
         *
         * @type {RegExp}
         */
        base.paramToRegex = /\{[a-zA-Z0-9\-]+\}/g;

        /**
         * A regex that is used to capture the parameter names.
         *
         * @type {RegExp}
         */
        base.captureParamNames = /\{([a-zA-Z0-9\-]+)\}/g;

        /**
         * Test if a route has parameters that should be captured.
         *
         * @param {string} route : The route to test
         * @return {boolean} : true if the route is parameterised.
         */
        base.isParameterisedRoute = function (route) {
            return route.indexOf('{') > -1 && route.indexOf('}') > -1;
        };


        /**
         * Get the parameters defined in the route from the current hashbang
         * URL.
         *
         * @param {string} route : The route to test
         * @param {string} location : The the current hashbang URL
         * @return {array|null} : If the route matches the current URL, return
         * an array with the matched parameters, if there was no match, return
         * null.
         */
        base.getParametersFromRoute = function (route, location) {
            var routeRegexString = route.replace(base.paramToRegex, "([a-zA-Z0-9\\-]+)")
                .replace(/\//g, "\\/");
            var routeRegex = new RegExp(routeRegexString, 'g');
            var params = routeRegex.exec(location);

            return params;
        };

        /**
         * Creates an associative array mapping the paramter name to the
         * captured value, to be passed to a controller or function mapped to
         * the route.
         *
         * @param {string} route : The route that matched the current location.
         * @param {array} params : The captured parameters.
         * @return {array} : An associative array that maps the paramter names
         * to the captured values
         */
        base.createParamtersArray = function (route, params) {
            var matchedRouteParams = route.match(base.captureParamNames);
            var routeParams = [];
            params = params.slice(1, params.length);

            for (var i = 0, l = matchedRouteParams.length; i < l; i++) {
                routeParams[matchedRouteParams[i].replace(/{|}/g, '')] = params[i];
            }

            return routeParams;
        };

        /**
         * Test current hash location against the previously defined routes. If
         * a route matches the current location, execute the function mapped to
         * it, passing the routes parameters (if any). This function is intended
         * to be applied to the 'window.onhashchange' object.
         */
        var router = function () {
            var location = window.location.hash;
            if (!location) {
                return;
            }

            for (var route in base.routes) {
                if (base.isParameterisedRoute(route)) {
                    var params = base.getParametersFromRoute(route, location);
                    if (!!params) {
                        base.routes[route](base.createParamtersArray(route, params));
                        break;
                    }
                } else if (route === location) {
                    base.routes[route](location);
                    break;
                }
            }
        };

        return router;
    };

}(conductorContext));

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

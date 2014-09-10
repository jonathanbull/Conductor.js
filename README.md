#Conductor.js

Conductor.js is a small, lightweight framework made to help create offline web applications.

It makes routing easy, wraps WebSQL and IndexedDB access behind an easy to use
interface and it allows you to use Models to represent your data.

It is used by the Royal Opera House for our Offline Hybrid App.

This project was supported by the [Digital R&D Fund for the Arts.](http://artsdigitalrnd.org.uk/projects/royal-opera-house/)

##Table of Contents

- [Examples](#examples)
- [Getting Started](#getting-started)
    - [Namespacing](#namespacing)
    - [The Kernel](#the-kernel)
        - [Creation](#creation)
        - [Creating a Database](#creating-a-database)
        - [Accessing a Database](#accessing-a-database)
            - [Inserting and Updating](#inserting-and-updating)
            - [Querying](#querying)
            - [Deleting](#deleting)
        - [Registering a route](#registering-a-route)
        - [Starting the application](#starting-the-application)
- [Databases](#databases)
- [Bringing it all together](#bringing-it-all-together)
- [Recommended Project Layout](#recommended-project-layout)
- [Limitations](#limitations)

##Examples

Please view the example project to see Conductor.js in use or the
[bringing it all together](#bringing-it-all-together) section for a more basic example.

##Getting started

###Dependencies

Conductor.js requires jQuery and makes extensive use of Promises.

###Namespacing

To prevent polluting the global namespace, all Conductor.js objects are namespaced.

The default namespace is 'window.conductor'.

To override the default namespace, simply declare a variable called 'conductorContext'
before including the conductor.js file.

    window.myNameSpace = {};
    var conductorContext = window.myNameSpace;

All the Conductor.js files will then be accessible via your chosen namespace,
'window.myNameSpace' in this example.

###The Kernel

The Kernel binds all the other objects in the system together.
It will be your main interface to setting up your app and accessing your databases.

####Creation

To create a new Kernel, call the Kernel constructor.

    var app = new window.conductor.Kernel();

####Creating a Database

To create a database for your application, call the createDatabase method on the
Kernel object, passing your Database Configuration object - see [Databases](#databases)
for more information of the configuration object. This returns a
[Promise](https://www.promisejs.org/) object. The promise is fulfilled when the
database is created, or rejected if an error occurs. You can create multiple databases
for your project.

    app.createDatabase(dbConfig).then(
        function () {
            console.log('Created local database');
            //More setup logic.
        },
        function () {
            console.log('Could not create local database');
        }
    )

####Accessing a Database

To get a reference to a database call the getDb method. If you have created more than
one database for your application, you will need to pass the name of the database as the
parameter to this call. This name is the name specified in the configuration object
used to create the database.

    var db = app.getDb('content_db');

####Registering a route

To register a route for you application to use, call the 'on' method. All routes
must start with '#/' as they are hashbang URLs. The method takes two paramters,
the route and a function to be executed when the route is matched.

    app.on('#/hello', function() {
        alert('Hello World');
    });

Routes can also be parameterised - to parameterise a route, simply surround the
parameter name with curly braces where it occurs in the URL. When the route is
matched, the parameters will be passed to your function as part of a parameters
object.

    app.on('#/hello/{name}', function(paramters) {
        alert('Hello ' + parameters.name);
    });

Routes are checked in the order that they are declared, so ensure you declare your
most specific routes first, and your most generic routes last.

####Starting the application

Once you have finished configuring your application, you will want to call the
'start' method. This initilizes the routing, starting the application.

    app.start();

###Databases

When initializing a database, Conductor creates a WebSQL or IndexedDB implementation,
based on the browsers capabilities. To create a database, you need to declare a
configuration object and call the 'createDatabase' method on the Kernel.

    var dbConfig = {
        dbName: 'content_db',
        dbDescription: 'offline content',
        dbVersion: 2
    };

Conductor supports multiple client side databases.

If you are creating multiple databases, you will need to use the 'dbName' parameter
when calling the 'getDB' method on the Kernel. When updating your models, you will
need to increment the version number to force the tables/object stores on the client
to be recreated. Beware that this is a destructive process.

The version number is an unsigned long long number, which means that it can be a
very big integer. It also means that you can't use a float, otherwise it will be
converted to the closest lower integer and the upgrade may not be triggered.

###Models

Models are objects used to represent your data in the application.

Any Models declared in you application will automatically have a table/object store
created for it in the database. Any attributes, excluding functions, will the saved in
the database.

Models can have functions, and any Model returned from the database will have any
function declared in the original model.

To declare a model, simple create a constructor in the models object of your
chosen namespace:

    window.conductor.models.article = function (id, title, text) {
        return {
            id: id,
            title: title
            text: text,
            upperCaseTitle: function () {
                return this.title.toUpperCase();
            }
        };
    };

    window.conductor.indexes.article = [
        'id',
        'title',
        ['id', 'title']
    ];

You also need to declare the attributes for your model to be indexed by (this is
due to how IndexedDB is implemented).

This is done by adding an attribute to the 'indexes' of the same name as your Model -
see the above example. This should be an array, containing all the attributes you wish
the model to be indexed by, this can include sub-array for compound indexes.

If you want to query a Model by an attribute named 'title', you would need to add
'title' to the indexes array, as in the example above.

To query a model by multiple attribute, you will need to declare a compound index.
In the example above, a compound index is declared for the 'id' and 'title' indexes.
This is done by adding a sub-array:

    ['id', 'title']

This allows us to efficiently query by the id and title attributes.

If no indexes are declared for a Model, or you query by an un-indexed attribute,
Conductor will get all records for that Model and then manually reduce them down
to match the query - this will result in worse performance but may be sufficient
for small datasets or for prototyping.

###Queries

####Inserting and Updating

To insert an object or a collection objects, call the 'insert' method on the database
object. This method takes 2 parameters, the name of the model that the data is for and
either an individual object or array of objects to insert. This method returns a
promise, which is fulfilled when the oporation is completed, or rejected if an error occurs.

    db.insert(
        'article',
        articles
    ).then(
        function () {
            console.log('Articles inserted!');
        },
        function () {
            console.log('Error inserting Articles!');
        }
    )

The insert method treats all calls as an [upsert](http://en.wiktionary.org/wiki/upsert) -
if there is already an existing Model with the same id for example, the existing
record will be updated.

####Querying

There are two methods available for querying data, 'findOneBy' and 'findBy'.
They take the same parameters, however findOneBy will only return the first
matching result or null, while findBy returns an array of matching Models or an
empty array.

To query data, you will need to pass the name of the Model you wish to query,
the attributes you wish to query by and how you wish the data to be ordered.

#####Attributes

The Attributes for the query is a regular Javascript object. Each attribute in the
object should match an attribute of the model.

To query by an exact value, the object only needs the name of the attribute and
the value you wish it to be.

    var articleQuery = {
        id : 1
    };

    db.findOneBy('article', articleQuery).then(
        function (article) {
            console.log(article);
        }
    );

You can also perform 'greater than' and 'greater than or equal to' or 'less than'
and 'less than or equal to' queries. The syntax for these is as follows:

    var articleQuery = id : {
        greaterThan : 1,
        lessThan : 3
    };

    db.findBy('article', articleQuery).then(
        function (articles) {
            console.log(articles);
        }
    );

#####Ordering

To order the results returned by your query, you can pass an 'orderBy' object as
the third parameter to the find methods.

The syntax of this object is as follows:

    var idDescending = { id : 'desc' };

    var idAscending = { id : 'asc' };

    db.findBy('article', null, idDescending).then(
        function (articles) {
            console.log(articles);
        }
    );

The above example will find all the articles and returned them ordered by their
id descending.

####Deleting

To delete a Model use the 'deleteBy' method. This method accepts the model name
and attributes to delete by. Calling the method without any attributes will
delete everything in the table/object store.

The attributes object is the same as outlined for [querying](#attributes).

The deleteBy method returns a promise.

    var articleDeleteQuery = {
        id : {
            greaterThanOrEqual : 10,
            lessThanOrEqual : 15
        }
    };

    db.deleteBy('article', articleQuery).then(
        function () {
            console.log('Articles with IDs between 10 and 15 Deleted!');
        }
    );

    db.deleteBy('article').then(
        function () {
            console.log('All Articles Deleted!');
        }
    );

###Bringing it all together

Now that we know how the individual parts work we can create a basic application.

The below example creates a fully functioning, if extremely basic, todo list application.

    window.conductor.models.todo = function (id, title, text) {
        return {
            id: id,
            title: title,
            text: text,
            upperCaseTitle: function () {
                return this.title.toUpperCase();
            }
        };
    };

    var app = new window.conductor.Kernel();

    var dbConfig = {
        dbName: 'example_db',
        dbDescription: 'An Example Database',
        dbVersion: 2
    };

    app.createDatabase(dbConfig).then(
        function () {

            app.on('#/todo/new/{id}/{title}/{text}', function (parameters) {
                var todo = {
                    id: parseInt(parameters.id, 10),
                    title: parameters.title,
                    text: parameters.text
                };

                app.getDb().insert('todo', todo).then(
                    function () {
                        console.log('Todo ' + todo.title + ' created!');
                    }
                );
            });

            app.on('#/todo/all', function () {
                app.getDb().findBy('todo').then(
                    function (todoItems) {
                        for (var i = 0; i < todoItems.length; i++) {
                            console.log('ID: ' + todoItems[i].id);
                            console.log(todoItems[i].upperCaseTitle());
                            console.log(todoItems[i].text);
                            console.log('-------');
                        }
                    }
                );
            });

            app.on('#/todo/{id}/delete', function (parameters) {
                var todoDeleteQuery = {
                    id: parseInt(parameters.id, 10)
                };

                app.getDb().deleteBy('todo', todoDeleteQuery).then(
                    function () {
                        console.log('Todo ' + parameters.id + ' deleted');
                    }
                );
            });

            app.on('#/todo/{id}', function (parameters) {
                var todoQuery = {
                    id: parseInt(parameters.id, 10)
                };

                app.getDb().findOneBy('todo', todoQuery).then(
                    function (todoItem) {
                        console.log(todoItem);
                    }
                );
            });

            app.start();

            if (!window.location.hash) {
                window.location.hash = '#/todo/all';
            }
        }
    );

This is all you would need to create an extremely basic todo application. It allows
you to create, view and delete todo items.

While this a somewhat contrived example that you wouldn't use in the real world
(all the interaction is via the console, not the DOM and data in entered purely
via the URL), this could be expanded into a more fully featured application.

##Recommended Project Layout

When using Conductor we follow the following project layout.

    project
    │   config.js // All config objects
    │   app.js // Bootstrap code - initialising the Kernel, setting up routes etc
    │
    └───Controllers // As in MVC - application logic
    |
    └───External // Any external libraries used
    |
    └───Models // All your applications models
    |
    └───Services // Any application logic that me be re-used in your controllers

You can see this structure in the Example app.

##Limitations

Currently updating the structure of the offline data stored is a destructive process.

Due to limitations of the IndexedDB API, certain queries are currently not possible.
When using bound (queries that use greater that and less than) queries over multiple indexes, you must ensure
that there are the same number of 'less thans' as there are 'greater thans'.

For example the following are valid:

    {
        foo : {
            greaterThanOrEqual : 10,
            lessThanOrEqual : 15
        },
        bar : {
            greaterThanOrEqual : 1,
            lessThanOrEqual : 10
        }
    }

    {
        foo : {
            lessThanOrEqual : 15
        },
        bar : {
            lessThanOrEqual : 10
        }
    }

    {
        foo : {
            greaterThanOrEqual : 15
        },
        bar : {
            greaterThanOrEqual : 10
        }
    }

But the following are not:

    {
        foo : {
            lessThanOrEqual : 15
        },
        bar : {
            greaterThanOrEqual : 1,
            lessThanOrEqual : 10
        }
    }

    {
        foo : {
            greaterThanOrEqual : 10,
            lessThanOrEqual : 15
        },
        bar : {
            lessThanOrEqual : 10
        }
    }

The invalid queries will execute and return data, but will be selecting all the data
for the model and reducing the results in javascript, which will be slower. Depending on your
use case, this might not be a problem.

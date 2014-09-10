QUnit.module( "Indexed DB" , {
    setup: function (assert) {
        window.location.hash = '';

        window.conductor.indexedDbConfig = {
            dbName: 'indexedDB_test',
            dbDescription: 'kernel test',
            dbVersion: 3
        };

        window.conductor.models = {};

        window.conductor.models.article = function (id, title) {
            return {
                id: id,
                title: title
            };
        };

        window.conductor.models.dummyModel = function (id, a, b, c) {
            return {
                id: id,
                a: a,
                b: b,
                c: c
            };
        };

        window.conductor.indexes.dummyModel = ['id'];
    },
    teardown: function (assert) {

    }
});

QUnit.asyncTest("Initialization Test", function (assert) {
    expect(2);

    var dbFactory = new window.conductor.dbFactory();

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(
        function (indexedDB) {
            assert.ok(
                indexedDB !== null && (typeof indexedDB !== 'undefined'),
                "DB is not null."
            );

            assert.ok(
                indexedDB.type === 'IndexedDb',
                "DB is correct type 'IndexedDb'"
            );

            QUnit.start();
        }
    );

});

QUnit.asyncTest("Create Index and Insert Data Test", function (assert) {
    expect(1);

    var dbFactory = new window.conductor.dbFactory();
    var indexedDB = null;

    var dummyArticle = new window.conductor.models.article(1, 'Test Article');

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(
        function (db) {
            indexedDB = db;
            return indexedDB.insert('article', dummyArticle);
        }
    ).then(function () {
        assert.ok(true, "Data sucessfully inserted.");
        QUnit.start();
    });
});

QUnit.asyncTest("Insert and Retreive Data Test", function (assert) {
    expect(2);

    var dbFactory = new window.conductor.dbFactory();
    var indexedDB = null;

    var dummyArticle = new window.conductor.models.article( 1, 'Test Article');

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(
        function (db) {
            indexedDB = db;
            return indexedDB.insert('article', dummyArticle);
        }
    ).then(function () {
        return indexedDB.findOneBy('article', { id: 1 });
    }).then(function (returnedArticle) {
        assert.ok(
            returnedArticle.id === dummyArticle.id,
            "Correct id returned."
        );

        assert.ok(
            returnedArticle.title === dummyArticle.title,
            "Correct title returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Insert and Retreive Data By Non-Id Attribute Test", function (assert) {
    expect( 2 );

    var dbFactory = new window.conductor.dbFactory();
    var indexedDB = null;

    var dummyArticle = new window.conductor.models.article(1, 'Test Article');

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        indexedDB = db;
        return indexedDB.insert('article', dummyArticle);
    }).then(function () {
        return indexedDB.findOneBy('article', { title: 'Test Article' });
    }).then(function (returnedArticle) {
        assert.ok(
            returnedArticle.id === dummyArticle.id,
            "Correct id returned."
        );

        assert.ok(
            returnedArticle.title === dummyArticle.title,
            "Correct title returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Insert and Retreive Data By Multiple Non-Id Attribute Test", function (assert) {
    expect(2);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var indexedDB = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        indexedDB = db;
        return indexedDB.insert('dummyModel', dummyModels);
    }).then(function () {
        return indexedDB.findOneBy(
            'dummyModel',
            { b: dummyModelC.b, c: dummyModelC.c }
        );
    }).then(function (returnedDummyModel) {
        assert.ok(
            returnedDummyModel.id === dummyModelC.id,
            "Correct id returned."
        );

        assert.ok(
            returnedDummyModel.c === dummyModelC.c,
            "Correct text returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Insert and Retreive Multiple Data By Multiple Non-Id Attribute Test", function (assert) {
    expect(4);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var indexedDB = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        indexedDB = db;
        return indexedDB.insert('dummyModel', dummyModels);
    }).then(function () {
        return indexedDB.findBy('dummyModel', { b: 'bar1' });
    }).then(function (returnedDummyModels) {
        assert.ok(
            returnedDummyModels.length === 2,
            "Correct quantity returned."
        );

        assert.ok(
            returnedDummyModels[0].b === 'bar1',
            "Correct text returned."
        );

        assert.ok(
            returnedDummyModels[1].b === 'bar1',
            "Correct text returned."
        );

        assert.ok(
            returnedDummyModels[0].id !== returnedDummyModels[1].id,
            "Models are not the same."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Retreive Data By Greater Than Test", function (assert) {
    expect(3);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.insert('dummyModel', dummyModels);
    }).then(function () {
        var query = {
            id : {
                greaterThan : 1
            }
        };
        return IndexedDb.findBy('dummyModel', query);
    }).then(function (returnedDummyModels) {
        assert.ok(
            returnedDummyModels.length === 2,
            "Correct number of models returned."
        );

        assert.ok(
            returnedDummyModels[0].b === 'bar1',
            "Correct text returned."
        );

        assert.ok(
            returnedDummyModels[1].b === 'bar1',
            "Correct text returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Retreive Data and Order By Test", function( assert ) {
    expect(3);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.insert('dummyModel', dummyModels);
    }).then(function () {
        return IndexedDb.findBy('dummyModel', null, { id : 'desc' });
    }).then(function (returnedDummyModels) {
        assert.ok(
            returnedDummyModels.length === 3,
            "Correct number of models returned."
        );

        assert.ok(
            returnedDummyModels[0].id === 3,
            "ID in correct order."
        );

        assert.ok(
            returnedDummyModels[2].id === 1,
            "ID in correct order."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Retreive Data By Greater Than and Less Than Test", function( assert ) {
    expect(2);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.insert('dummyModel', dummyModels);
    }).then(function () {
        var query = {
            id : {
                greaterThan : 1,
                lessThan : 3
            }
        };
        return IndexedDb.findBy('dummyModel', query);
    }).then(function (returnedDummyModels) {

        assert.ok(
            returnedDummyModels.length === 1,
            "Correct number of models returned."
        );

        assert.ok(
            returnedDummyModels[0].id === 2,
            "Correct id returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Query Non-Existant Model Rejects Promise", function( assert ) {
    expect(1);

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.findBy('notAModel');
    }).then(
        function (returnedDummyModels) {

        },
        function () {
            assert.ok(true, "Invalid query rejected");
            QUnit.start();
        }
    );
});

QUnit.asyncTest("Delete All Models Test", function (assert) {
    expect(1);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.insert('dummyModel', dummyModels);
    }).then(function () {
        return IndexedDb.deleteBy('dummyModel');
    }).then(function () {
        return IndexedDb.findBy('dummyModel');
    }).then(function (returnedDummyModels) {
        assert.ok(
            returnedDummyModels.length === 0,
            "Correct number of models returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Delete Single Model Test", function (assert) {
    expect(1);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.insert('dummyModel', dummyModels);
    }).then(function () {
        return IndexedDb.deleteBy('dummyModel', { id: 2 });
    }).then(function () {
        return IndexedDb.findBy('dummyModel');
    }).then(function (returnedDummyModels) {
        assert.ok(
            returnedDummyModels.length === 2,
            "Correct number of models returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Update Single Model Test", function (assert) {
    expect(2);

    var dummyModelA = new window.conductor.models.dummyModel( 1, 'foo', 'bar', 'baz');
    var dummyModelB = new window.conductor.models.dummyModel( 2, 'foo', 'bar1', 'baz');
    var dummyModelC = new window.conductor.models.dummyModel( 3, 'foo', 'bar1', 'baz1');

    var dummyModels = [
        dummyModelA,
        dummyModelB,
        dummyModelC
    ];

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.insert('dummyModel', dummyModels);
    }).then(function () {
        dummyModelB.a = 'test';
        return IndexedDb.insert('dummyModel', dummyModelB);
    }).then(function () {
        return IndexedDb.findOneBy('dummyModel', { id: 2 });
    }).then(function (returnedDummyModel) {
        assert.ok(
            returnedDummyModel.id === 2,
            "Correct id returned."
        );

        assert.ok(
            returnedDummyModel.a === 'test',
            "Correct attribute returned."
        );

        QUnit.start();
    });
});

QUnit.asyncTest("FindOneBy Query With No Results Returns Null", function( assert ) {
    expect(1);

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;
        return IndexedDb.findOneBy('dummyModel', { id: 999 });
    }).then(function (returnedDummyModel) {
        assert.ok(
            returnedDummyModel === null,
            "Null was returned"
        );

        QUnit.start();
    });
});

QUnit.asyncTest("FindBy Query With No Results Returns Empty Array", function( assert ) {
    expect(2);

    var dbFactory = new window.conductor.dbFactory();
    var IndexedDb = null;

    dbFactory.getDatabase(window.conductor.indexedDbConfig, 'IndexedDb').then(function (db) {
        IndexedDb = db;

        var query = {
            id : {
                greaterThan : 999
            }
        };

        return IndexedDb.findBy('dummyModel', query);
    }).then(function (returnedDummyModels) {

        assert.ok(
            $.isArray(returnedDummyModels),
            "Array was returned"
        );

        assert.ok(
            returnedDummyModels.length === 0,
            "Empty Array was returned"
        );

        QUnit.start();
    });
});

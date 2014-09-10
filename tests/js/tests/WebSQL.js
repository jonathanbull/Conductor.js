QUnit.module("WebSQL", {
    setup: function (assert) {
        window.location.hash = '';

        window.conductor.webSqlConfig = {
            dbName: 'websql_test',
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
    },
    teardown: function (assert) {

    }
});

QUnit.asyncTest("Initialization Test", function (assert) {
    expect(2);

    var dbFactory = new window.conductor.dbFactory();

    dbFactory.getDatabase(
        window.conductor.webSqlConfig,
        'WebSql'
    ).then(function (webSqlDB) {
        assert.ok(
            webSqlDB !== null && (typeof webSqlDB !== 'undefined'),
            "DB is not null."
        );

        assert.ok(
            webSqlDB.type === 'WebSQL',
            "DB is correct type 'WebSQL'"
        );

        QUnit.start();
    });
});

QUnit.asyncTest("Create Table and Insert Data Test", function (assert) {
    expect(1);

    var dbFactory = new window.conductor.dbFactory();

    var dummyArticle = new window.conductor.models.article(1, 'Test Article');

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        return db.insert('article', dummyArticle);
    }).then(function () {
        assert.ok(true, "Data sucessfully inserted.");
        QUnit.start();
    });
});

QUnit.asyncTest("Insert and Retreive Data Test", function (assert) {
    expect(2);

    var dummyArticle = new window.conductor.models.article( 1, 'Test Article');
    var dbFactory = new window.conductor.dbFactory();
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('article', dummyArticle);
    }).then(function () {
        return webSqlDB.findOneBy('article', { id: 1 });
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

QUnit.asyncTest("Insert and Retreive Multiple Data Test", function (assert) {
    expect(3);

    var dummyArticles = [
        new window.conductor.models.article( 2, 'Test'),
        new window.conductor.models.article( 3, 'Test')
    ];

    var dbFactory = new window.conductor.dbFactory();
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('article', dummyArticles);
    }).then(function () {
        return webSqlDB.findBy('article', { title: 'Test' });
    }).then(function (articles) {
        assert.ok(
            articles.length === 2,
            "Correct number of articles returned."
        );

        assert.ok(articles[0].title === 'Test', "Correct title returned.");
        assert.ok(articles[1].title === 'Test', "Correct title returned.");
        QUnit.start();
    });
});

QUnit.asyncTest("Insert and Retreive Data By Multiple Attribute Test", function( assert ) {
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('dummyModel', dummyModels);
    }).then(function () {
        return webSqlDB.findOneBy('dummyModel', { b: 'bar1', c: 'baz1' });
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

QUnit.asyncTest("Retreive Data By Greater Than Test", function( assert ) {
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('dummyModel', dummyModels);
    }).then(function () {
        var query = {
            id : {
                greaterThan : 1
            }
        };
        return webSqlDB.findBy('dummyModel', query);
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('dummyModel', dummyModels);
    }).then(function () {
        return webSqlDB.findBy('dummyModel', null, { id : 'desc' });
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('dummyModel', dummyModels);
    }).then(function () {
        var query = {
            id : {
                greaterThan : 1,
                lessThan : 3
            }
        };
        return webSqlDB.findBy('dummyModel', query);
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.findBy('notAModel');
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('dummyModel', dummyModels);
    }).then(function () {
        return webSqlDB.deleteBy('dummyModel');
    }).then(function () {
        return webSqlDB.findBy('dummyModel');
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.insert('dummyModel', dummyModels);
    }).then(function () {
        return webSqlDB.deleteBy('dummyModel', { id: 2 });
    }).then(function () {
        return webSqlDB.findBy('dummyModel');
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

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;
        return webSqlDB.findOneBy('dummyModel', { id: 999 });
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
    var webSqlDB = null;

    dbFactory.getDatabase(window.conductor.webSqlConfig, 'WebSql').then(function (db) {
        webSqlDB = db;

        var query = {
            id : {
                greaterThan : 999
            }
        };

        return webSqlDB.findBy('dummyModel', query);
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

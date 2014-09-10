QUnit.module("Kernel: Data Access", {
    setup: function (assert) {
        window.location.hash = '';
    },
    teardown: function (assert) {
        window.location.hash = '';
    }
});

QUnit.asyncTest("Register Single Database Test", function (assert) {

    expect(1);

    var app = new window.conductor.Kernel();

    var dbConfig = {
        dbName: 'kernel_data_test',
        dbDescription: 'kernel test',
        dbVersion: 1
    };

    app.createDatabase(dbConfig).then(function () {

        var db = app.getDb();

        assert.ok(
            db !== null && (typeof db !== 'undefined'),
            "Database is Set."
        );

        QUnit.start();

    });
});

QUnit.asyncTest("Register Two Databases Test", function (assert) {

    expect(2);

    var app = new window.conductor.Kernel();

    var dbAConfig = {
        dbName: 'db_a',
        dbDescription: 'kernel test',
        dbVersion: 1
    };

    var dbBConfig = {
        dbName: 'db_b',
        dbDescription: 'kernel test',
        dbVersion: 1
    };

    app.createDatabase(dbAConfig).then(function () {
        return app.createDatabase(dbBConfig);
    }).then(function () {
        var dbA = app.getDb('db_a');

        assert.ok(
            dbA !== null && (typeof dbA !== 'undefined'),
            "Database A is Set."
        );

        var dbB = app.getDb('db_b');

        assert.ok(
            dbB !== null && (typeof dbB !== 'undefined'),
            "Database B is Set."
        );

        QUnit.start();

    });
});

QUnit.asyncTest("Create, Populate and Retreive Data", function (assert) {

    expect(3);

    window.conductor.models = {};

    window.conductor.models.article = function (id, title) {
        return {
            id: id,
            title: title
        };
    };

    var app = new window.conductor.Kernel();

    var dbConfig = {
        dbName: 'kernel_data_test_2',
        dbDescription: 'kernel test',
        dbVersion: 3
    };

    app.createDatabase(dbConfig).then(function () {
        app.start();

        var articleToSave = new window.conductor.models.article(1, 'Test');
        var db = app.getDb('kernel_data_test_2');

        db.insert('article', articleToSave).then(function () {
            return db.findOneBy('article', { id: 1 });
        }).then(function (articleFromDB) {

            assert.ok(
                articleToSave.id === articleFromDB.id,
                "Correct Model Id is Set."
            );

            assert.ok(
                articleToSave.title === articleFromDB.title,
                "Correct Model Title is Set."
            );

            assert.ok(
                articleFromDB.modelName() === 'article',
                "Correct Model Name is Set."
            );

            QUnit.start();
        });
    });
});

QUnit.module("Kernel: Routing");

QUnit.test("Initialize Router Test", function (assert) {

    var app = new window.conductor.Kernel();

    app.start();

    assert.ok(window.onhashchange !== null, "Router has been set.");
});

QUnit.asyncTest("Register Route Test", function (assert) {

    expect(1);

    var app = new window.conductor.Kernel();

    var testAction = function () {
        assert.ok(true, "testAction Called.");
        QUnit.start();
    };

    app.on('#/', testAction);

    app.start();

    window.location.hash = '#/';
});

QUnit.asyncTest("Register Regex Route Test", function (assert) {

    expect(1);

    var app = new window.conductor.Kernel();

    var testAction = function(paramters) {
        var matchedParameter = paramters.test;

        assert.ok(
            matchedParameter === 'royaloperahouse',
            "Correct Parameter Returned."
        );

        QUnit.start();
    };

    app.on('#/{test}', testAction);

    app.start();

    window.location.hash = '#/royaloperahouse';
});

QUnit.asyncTest("Register Multiple Regex Routes Test", function (assert) {

    expect(1);

    var app = new window.conductor.Kernel();

    var testAction = function (paramters) {
        var matchedParameter = paramters.b;

        assert.ok(
            matchedParameter === 'royaloperahouse',
            "Correct Parameter Returned."
        );

        QUnit.start();
    };

    app.on('#/foo/{a}', testAction);

    app.on('#/bar/{b}', testAction);

    app.start();

    window.location.hash = '#/bar/royaloperahouse';
});

QUnit.asyncTest("Register Regex Route With Multiple Params Test", function (assert) {

    expect(3);

    var app = new window.conductor.Kernel();

    var testAction = function(paramters) {

        assert.ok(
            paramters.a === 'foo',
            "Correct Parameter Returned."
        );

        assert.ok(
            paramters.b === 'bar',
            "Correct Parameter Returned."
        );

        assert.ok(
            paramters.c === 'baz',
            "Correct Parameter Returned."
        );

        QUnit.start();
    };

    app.on('#/{a}/{b}/{c}', testAction);

    app.start();

    window.location.hash = '#/foo/bar/baz';
});

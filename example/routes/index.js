var express = require('express');
var router = express.Router();

var request = require('request');

/* GET home page. */
router.get('/', function (req, res) {
    request('http://localhost:3000/javascripts/data.json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);

            var publications = data.publications;
            var articles = data.articles;

            res.render('index', {
                title: 'Express',
                publications: publications,
                articles: articles
            });
        }
    });
});

/* GET offline iframe. */
router.get('/offline-iframe', function (req, res) {
    res.render('offline-iframe', {
        layout: false
    });
});

/* GET offline page. */
router.get('/offline', function (req, res) {
    res.render('offline', {});
});

module.exports = router;

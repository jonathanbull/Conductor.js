var gulp = require('gulp'),
   uglify = require('gulp-uglify'),
   jshint = require('gulp-jshint'),
   concat = require('gulp-concat');

gulp.task('build-minified', function () {
   return gulp.src('js/**/*.js')
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(uglify())
      .pipe(concat('conductor.min.js'))
      .pipe(gulp.dest('build'));
});

gulp.task('build', function () {
   return gulp.src('js/**/*.js')
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(concat('conductor.js'))
      .pipe(gulp.dest('build'));
});

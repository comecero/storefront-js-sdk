const gulp = require("gulp");
const concat = require("gulp-concat");
const sourcemaps = require("gulp-sourcemaps");
const rename = require("gulp-rename");
const header = require('gulp-header');
const terser = require('gulp-terser');
const wrapJS = require("gulp-wrap-js");
const fs = require("fs");

gulp.task("concat", function () {
  let wrapper = fs.readFileSync('./src/sdk.js', {encoding:'utf8'});
  wrapper = wrapper.replace('//%= body %', '%= body %');

  return gulp.src(["./src/*.js", "!./src/sdk.js"])
    .pipe(concat("storefront-sdk.js"))
    .pipe(wrapJS(wrapper))
    .pipe(gulp.dest("./dist/"));
});

gulp.task("compress", function () {
  return gulp.src(["./dist/storefront-sdk.js"])
    .pipe(rename({extname: ".min.js"}))
    .pipe(sourcemaps.init())
    .pipe(terser())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest("./dist/"));
});

gulp.task("header",function() {
  var json = JSON.parse(fs.readFileSync('./package.json'));
  var md = fs.readFileSync('./README.md', 'utf8');
  md = md.replace(/Version:\s+\d+(\.\d+)+/, 'Version: ' + json.version);
  fs.writeFileSync('./README.md', md);

  // Add headers with the release number to each of the distribution files.
  return gulp.src(['./dist/*.js']).pipe(
    header(
      "/*\n  Comecero Data Export version: " + json.version +
      "\n  https://comecero.com\n  https://github.com/comecero/data-export\n" +
      "  Copyright Comecero and other contributors. Released under MIT license. See LICENSE for details.\n*/\n\n"
    )).pipe(gulp.dest('./dist/'));
});

gulp.task('dist', gulp.series('concat', 'compress', 'header'));

gulp.task('default', gulp.series('dist'));

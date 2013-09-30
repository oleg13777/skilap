#! /bin/sh
npm install

#BUILD_FOLDER="build_$(date +%m%d_%H%M)"
BUILD_FOLDER="build"

rm -rf $BUILD_FOLDER

mkdir $BUILD_FOLDER

mkdir $BUILD_FOLDER/modules
cp -r modules/* $BUILD_FOLDER/modules

mkdir $BUILD_FOLDER/data
cp -r -L data/* $BUILD_FOLDER/data

mkdir $BUILD_FOLDER/node_modules
cp -r node_modules/* $BUILD_FOLDER/node_modules

mkdir $BUILD_FOLDER/public
cp -r -L public/* $BUILD_FOLDER/public

mkdir $BUILD_FOLDER/test
cp -r -L test/* $BUILD_FOLDER/test

mkdir $BUILD_FOLDER/res
cp -r -L res/* $BUILD_FOLDER/res

mkdir $BUILD_FOLDER/logs

cp * $BUILD_FOLDER/

cd $BUILD_FOLDER

mv grun.js Gruntfile.js

../node_modules/.bin/grunt

rm Gruntfile.js
rm compile.sh

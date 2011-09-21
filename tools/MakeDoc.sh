#!/usr/bin/env bash
filelist=""
for FOLDERS in `ls ../modules`; do
    mfiles="`cat ../modules/$FOLDERS/docufiles.txt`"
    for FILE in `cat ../modules/$FOLDERS/docufiles.txt`; do
	FNAME=$FOLDERS$FILE
	FNAME=${FNAME//\//_}
	FNAME=${FNAME//./}
	jsdog -s ../modules/$FOLDERS/$FILE > ../docs/$FNAME.html
	filelist="$filelist ../modules/$FOLDERS/$FILE"
    done
done
dox --title "Skilap" $filelist > ../docs/index.html




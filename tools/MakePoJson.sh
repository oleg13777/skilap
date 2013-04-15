#!/usr/bin/env bash
filelist=""
for FOLDERS in `ls ../modules`; do
    if [ -d "../modules/$FOLDERS/public/locale" ]; then
        if [ -d "../modules/$FOLDERS/locale" ]; then	   
	    ./po2json "../modules/$FOLDERS/locale/$FOLDERS.pot" > ../modules/$FOLDERS/public/locale/$FOLDERS.en_US.json	   
	    for FILE in `ls ../modules/$FOLDERS/locale/*.po`; do
		filename=$(basename "$FILE")
		filename="${filename%.*}"
		./po2json $FILE > ../modules/$FOLDERS/public/locale/$filename.json
	    done
	fi
    fi
done




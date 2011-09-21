#!/usr/bin/env bash
for FOLDERS in `ls ../modules`; do
    nodejs ./getstache.js ../modules/$FOLDERS/views/ > ../modules/$FOLDERS/lib/viewStrings.js
    xgettext -o ../modules/$FOLDERS/locale/$FOLDERS.pot --language=Python --keyword=i18n:3 --keyword=_N:1,2 $(find ../modules/$FOLDERS -name "*.js" -and \( -path "../modules/$FOLDERS/lib*" -or -path "../modules/$FOLDERS/pages" \))
done



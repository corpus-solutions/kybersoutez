#!/bin/bash

rm -rf ./repackaged*.apk 

apktool b -o repackagedApp.apk ./extractedApp/

zipalign 4 repackagedApp.apk repackagedAlignedApp.apk

apksigner sign --ks signing.keystore --ks-pass pass:mojeheslo repackagedAlignedApp.apk

adb install -r ./repackagedAlignedApp.apk


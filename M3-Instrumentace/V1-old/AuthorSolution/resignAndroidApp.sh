# pokud nemáte keystore, takhle si jej vytvoříte (zapamatujte si heslo)
$ keytool -genkey -v -keystore signing.keystore -alias mujklic -keyalg RSA -keysize 2048 -validity 10000

# podepište APK
$ jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore signing.keystore -storepass mojeheslo repackagedApp.apk mujklic

# ověřte podpis, který jste právě vytvořili
$ jarsigner -verify repackagedApp.apk

# proveďte nezbytný zipalign
$ zipalign 4 repackagedApp.apk repackagedFinalApp.apk
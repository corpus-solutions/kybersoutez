# Autorské řešení (příprava)

Celé řešení trvalo téměř 3 hodiny. Plynou z toho doporučení, jaké si předinstalovat nástroje:

* Oracle VirtualBox
* Ubuntu nebo Kali VM
* Android Studio (SDK dle verze OS v telefonu)
* Python
* Objection (@leonjza)
* Frida
* Telefon Android ve vývojářském režimu se zapnutým USB debuggingem.

Zadání by mělo znít: 

> Do dodaného APK aplikace (nebo do kterékoliv jiné) injektujte knihovnu `frida-gadget`, aplikaci spustte a připojte se k ní z počítače pomocí nástroje Frida.

Pro splnění úlohy je třeba dokázat, že:

* `frida-gadget` injektovaný do aplikace v ní skutečně naběhne – řádkem z logu zařízení `adb logcat`
* K testovací aplikaci se povedlo připojit – snímek obrazovky nebo výpis promptu po spuštění `frida-ps -U "Test Application"`

### Původní RAW postup

Zpracováno na základě tutorialů https://koz.io/using-frida-on-android-without-root/

#### 1. Rozbalení aplikace

Pomocí nástroje [apktool](https://bitbucket.org/iBotPeaches/apktool/downloads/) rozbalíme archiv aplikace:

	$ apktool d TestApp.apk -o extractedApp
	
	I: Using Apktool 2.6.1 on TestApp.apk
	I: Loading resource table...
	I: Decoding AndroidManifest.xml with resources...
	I: Loading resource table from file: /Users/sychram/Library/apktool/framework/1.apk
	I: Regular manifest package...
	I: Decoding file-resources...
	I: Decoding values */* XMLs...
	I: Baksmaling classes.dex...
	I: Copying assets and libs...
	I: Copying unknown files...
	I: Copying original files...
	I: Copying META-INF/services directory

#### 2. frida-gadget

Do složky `/lib` uvnitř rozbaleného APK přidáme příslušnou nativní knihovnu `frida-gadget` [ke stažení zde](https://github.com/frida/frida/releases/). V tomto případě jde o 64bit ARM (pro zařízení Android).

	wget https://github.com/frida/frida/releases/download/16.0.2/frida-gadget-16.0.2-android-arm64.so.xz
	
	...
	
	frida-gadget-16.0.2-android-arm 100%[====================================================>]   6,30M  6,15MB/s    in 1,0s    

	2022-11-03 15:09:49 (6,15 MB/s) - ‘frida-gadget-16.0.2-android-arm64.so.xz’ saved [6605384/6605384]
	
Rozbalíme gadget:

	unxz frida-gadget-16.0.2-android-arm64.so.xz
	
Zkopírujeme do aplikace (opět zde ARM64 pro fyzické Android zařízení):

	cp frida-gadget-16.0.2-android-arm64.so ./extractedApp/lib/arm64-v8a/libfrida-garget.so

#### 3. Injekce

Do bytecode aplikace je nyní třeba vložit volání systémové funkce `System.loadLibrary("frida-gadget")`, ideálně hned na začátek kódu aplikace, ještě než se spouští jakýkoliv bytecode nebo načítá nativní kód. 
Vhodným místem je obvykle statický inicializátor vstupního bodu aplikace, například hlavní aplikační Aktivita, která se nachází v manifestu (v tomto případě `cz.corpus.dva.ui.login.LoginActivity`).

Do vhodné funkce pak stačí vložit následující smali kód:

	const-string v0, "frida-gadget"
	invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V

Příslušné místo je tedy někde v souboru `./extractedApp/smali/cz/corpus/dva/ui/login/LoginActivity.smali`, zkusíme volání vložit za první label `.locals 1` do funkce `.method public constructor <INIT>()V`, ale konstantu necháme na první úrovni, od řádku 149:

```
const-string v0, "frida-gadget"

.method public constructor <init>()V
    .locals 1
    
    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V

    .line 48
    invoke-direct {p0}, Landroidx/appcompat/app/AppCompatActivity;-><init>()V
```

#### 4. Přepodepsání

Aplikaci znovu zabalíme (následující proces je vhodnější mít jako jeden skript, může se vícekrát opakovat, než se najde správné místo pro injekci).

```
$ apktool b -o repackagedApp.apk ./extractedApp/

I: Using Apktool 2.6.1
I: Checking whether sources has changed...
I: Smaling smali folder into classes.dex...
I: Checking whether resources has changed...
I: Building resources...
W: /Volumes/Jobz/2022/2022-10-Gordic/Repo/M3-Instrumentace/AuthorSolution/./extractedApp/AndroidManifest.xml:2: Tag <uses-permission> attribute name has invalid character ' '.
I: Copying libs... (/lib)
I: Copying libs... (/kotlin)
I: Copying libs... (/META-INF/services)
I: Building apk file...
I: Copying unknown files/dir...
I: Built apk...

```
Aplikaci podepíšeme vlastním klíčem a provedeme nezbytný `zipalign`:

```
# pokud nemáte keystore, takhle si jej vytvoříte (zapamatujte si heslo)
$ keytool -genkey -v -keystore signing.keystore -alias mujklic -keyalg RSA -keysize 2048 -validity 10000

# podepište APK
$ jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore signing.keystore -storepass mojeheslo repackagedApp.apk mujklic

# ověřte podpis, který jste právě vytvořili
$ jarsigner -verify repackagedApp.apk

# proveďte nezbytný zipalign
$ zipalign 4 repackagedApp.apk repackagedFinalApp.apk
```

Aplikaci můžeme nyní nainstalovat do zařízení a vyzkoušet, zda se povede ji spustit:

	adb install ./repackagedFinalApp.apk 

#### 4. Troubleshooting

Zařízení Android musí být ve vývojářském režimu. Ten se obvykle zapíná vícenásobným poklepáním na číslo sestavení v informacích o verzi systému.  Po zapnutí je potřeba v System > Developer Options zapnout USB Debugging.

Pak už by zařízení mělo být po připojení "vidět":

```
$ adb devices
List of devices attached
04VAY1WKFG	device
```

Verifikace vypsala nějaké chyby (otázka je, zda jsou významné nebo ne):

```
jar verified.

Warning: 
This jar contains entries whose certificate chain is invalid. Reason: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target
This jar contains entries whose signer certificate is self-signed.
The SHA1 digest algorithm is considered a security risk. This algorithm will be disabled in a future update.
The SHA1withRSA signature algorithm is considered a security risk. This algorithm will be disabled in a future update.
This jar contains signatures that do not include a timestamp. Without a timestamp, users may not be able to validate this jar after any of the signer certificates expire (as early as 2050-03-21).

Re-run with the -verbose and -certs options for more details.
```

První pokus o instalaci se nezdařil.

```
$ adb install ./repackagedFinalApp.apkPerforming Streamed Install
adb: failed to install ./repackagedFinalApp.apk: Failure [INSTALL_FAILED_INVALID_APK: Failed to extract native libraries, res=-2]
```

Změníme tedy v `AndroidManifest.xml` atribut extractNativeLibs na `android:extractNativeLibs="true"`

a znovu kolečko kompilace, podpisu a instalace:

```
$ rm -rf ./repackaged*.apk 

$ apktool b -o repackagedApp.apk ./extractedApp/

$ jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore signing.keystore -storepass mojeheslo repackagedApp.apk mujklic

$ jarsigner -verify repackagedApp.apk

$ zipalign 4 repackagedApp.apk repackagedFinalApp.apk

```

Po sepsání příkazu do skriptu se ukazují nějaké chybky:

```
$ ./resign.sh 
I: Using Apktool 2.6.1
I: Checking whether sources has changed...
I: Smaling smali folder into classes.dex...
extractedApp/smali/cz/corpus/dva/ui/login/LoginActivity.smali[149,0] missing EOF at 'const-string'
Could not smali file: cz/corpus/dva/ui/login/LoginActivity.smali
jarsigner: unable to open jar file: repackagedApp.apk
jarsigner: java.nio.file.NoSuchFileException: repackagedApp.apk
Unable to open 'repackagedApp.apk' as zip archive
```

Opravuji tedy injekci v LoginActivity.smali:

```
.method public constructor <init>()V
    .locals 1

    const-string v0, "frida-gadget"
    
    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V
```

Další problém nás vrací k verifikaci podpisu:

```
$ adb install ./repackagedFinalApp.apk 
Performing Streamed Install
adb: failed to install ./repackagedFinalApp.apk: Failure [INSTALL_PARSE_FAILED_NO_CERTIFICATES: Scanning Failed.: No signature found in package of version 2 or newer for package cz.corpus.dva]
```

Ukazuje se, že od Android 11 je potřeba podpis v2, který je podporovaný nástrojem `apksigner` (ten je součástí `build-tools` v Android (Studio) SDK.

Finální postup úspěšného zabalení, podepsání a instalace (`resign.sh`):

```
#!/bin/bash

rm -rf ./repackaged*.apk 

apktool b -o repackagedApp.apk ./extractedApp/

zipalign 4 repackagedApp.apk repackagedAlignedApp.apk

apksigner sign --ks signing.keystore --ks-pass pass:mojeheslo repackagedAlignedApp.apk

adb install -r ./repackagedAlignedApp.apk
```

Aplikace nám po startu nějak padá:

```
$ adb logcat

11-03 16:02:08.397 27706 27706 E AndroidRuntime: FATAL EXCEPTION: main
11-03 16:02:08.397 27706 27706 E AndroidRuntime: Process: cz.corpus.dva, PID: 27706
11-03 16:02:08.397 27706 27706 E AndroidRuntime: java.lang.UnsatisfiedLinkError: dlopen failed: library "libfrida-gadget.so" not found
```

Zkusíme tedy dát správný gadget i do `armeabi-v7a` (i když Pixel 3a má 64bitový procesor Snapdragon)? Což nás přivádí k použití nástroje `objection`.

	$ source ./activate
	(virtual-python3) sychram@vertical:~/virtual-python3/bin$ 

Naučili jsme se zjištovat architekturu zařízení:

```
	adb shell getprop ro.product.cpu.abi
```

Použití nástroje [Objection](https://github.com/sensepost/objection) pro celou tuhle anabázi je tzv. "one-liner":

```
objection patchapk --source /Volumes/Jobz/2022/2022-10-Gordic/Repo/M3-Instrumentace/AuthorSolution/TestApp.apk
```

Navíc ve výstupu uvidíme, jaké změny přesně a na kterém řádku smali kódu proběhly (např. počítadlo konstant).

Aplikaci musíme smazat, protože bude mít jiný podpis. Poté proběhne instalace úspěšně:

```
adb install /Volumes/Jobz/2022/2022-10-Gordic/Repo/M3-Instrumentace/AuthorSolution/TestApp.objection.apk
Performing Streamed Install
Success
```

Instalace po startu již neselže, ale appka se zasekne a `objection explore` nefunguje.

```
$ objection explore
Using USB device `Pixel 3a`
Unable to connect to the frida server: unable to communicate with remote frida-server; please ensure that major versions match and that the remote Frida has the feature you are trying to use
```

Nicméně podle `adb logcat` se povedlo úspěšně spustit nalinkovaný `frida-gadget`:

```
11-03 16:19:41.060 30941 30967 I Frida   : Listening on 127.0.0.1 TCP port 27042
```

Problém už bude tedy patrně jen v prostředí (moje instalace fridy je asi dlouho neaktualizovaná).

```
sudo pip install -U --ignore-installed frida-tools
```

Po aktualizaci `frida-tools` vše začíná fungovat. 

Ověříme si, že Frida funguje:

```
$ frida-ps -U
  PID  Name
-----  -------------------------------------------------------
...
```

Zjistíme aktuální verzi Frida a patchneme správný Gadget:

```
$ frida --version
15.0.8

$ objection patchapk --gadget-version 15.0.8 --source /Volumes/Jobz/2022/2022-10-Gordic/Repo/M3-Instrumentace/AuthorSolution/TestApp.apk

$ adb install -r ./TestApp.objection.apk

$ frida -U "Test Application"
     ____
    / _  |   Frida 15.0.8 - A world-class dynamic instrumentation toolkit
   | (_| |
    > _  |   Commands:
   /_/ |_|       help      -> Displays the help system
   . . . .       object?   -> Display information about 'object'
   . . . .       exit/quit -> Exit
   . . . .
   . . . .   More info at https://frida.re/docs/home/
                                                                                

[Pixel 3a::Test Application]-> MÁME VLAJKU!!!

```


Můžeme ještě zkusit rozchodit Objection:

```
$ objection -g "Test Application" explore
Using USB device `Pixel 3a`
Agent injected and responds ok!
Traceback (most recent call last):
  File "/Users/sychram/virtual-python3/bin/objection", line 8, in <module>
    sys.exit(cli())
  File "/Library/Frameworks/Python.framework/Versions/3.7/lib/python3.7/site-packages/click-6.7-py3.7.egg/click/core.py", line 722, in __call__
    return self.main(*args, **kwargs)
  File "/Library/Frameworks/Python.framework/Versions/3.7/lib/python3.7/site-packages/click-6.7-py3.7.egg/click/core.py", line 697, in main
    rv = self.invoke(ctx)
  File "/Library/Frameworks/Python.framework/Versions/3.7/lib/python3.7/site-packages/click-6.7-py3.7.egg/click/core.py", line 1066, in invoke
    return _process_result(sub_ctx.command.invoke(sub_ctx))
  File "/Library/Frameworks/Python.framework/Versions/3.7/lib/python3.7/site-packages/click-6.7-py3.7.egg/click/core.py", line 895, in invoke
    return ctx.invoke(self.callback, **ctx.params)
  File "/Library/Frameworks/Python.framework/Versions/3.7/lib/python3.7/site-packages/click-6.7-py3.7.egg/click/core.py", line 535, in invoke
    return callback(*args, **kwargs)
  File "/Users/sychram/Library/Python/3.7/lib/python/site-packages/objection/console/cli.py", line 156, in explore
    device_info = get_device_info()
  File "/Users/sychram/Library/Python/3.7/lib/python/site-packages/objection/commands/device.py", line 22, in get_device_info
    environment = api.env_runtime()
  File "/Users/sychram/Library/Python/3.7/lib/python/site-packages/frida/core.py", line 468, in method
    return script._rpc_request('call', js_name, args, **kwargs)
  File "/Users/sychram/Library/Python/3.7/lib/python/site-packages/frida/core.py", line 26, in wrapper
    return f(*args, **kwargs)
  File "/Users/sychram/Library/Python/3.7/lib/python/site-packages/frida/core.py", line 400, in _rpc_request
    raise result[2]
frida.core.RPCException: Error: Java API only partially available; please file a bug. Missing: _ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv
    at Ie (frida/node_modules/frida-java-bridge/lib/android.js:177)
    at Ce (frida/node_modules/frida-java-bridge/lib/android.js:16)
    at _tryInitialize (frida/node_modules/frida-java-bridge/index.js:17)
    at g (frida/node_modules/frida-java-bridge/index.js:9)
    at <anonymous> (frida/node_modules/frida-java-bridge/index.js:317)
    at call (native)
    at o (/_java.js)
    at <anonymous> (/_java.js)
    at <anonymous> (frida/runtime/java.js:1)
    at call (native)
    at o (/_java.js)
    at r (/_java.js)
    at <eval> (frida/runtime/java.js:3)
    at _loadJava (native)
    at get (frida/runtime/core.js:114)
    at <anonymous> (/script1.js:19754)
    at envRuntime (/script1.js:22652)
    at apply (native)
    at <anonymous> (frida/runtime/message-dispatcher.js:13)
    at c (frida/runtime/message-dispatcher.js:23)
Asking jobs to stop...
Unloading objection agent...
```

Problém patrně spočívá ve verzi Java, která je v prostředí.

Viz https://www.ayrx.me/frida-hotspot-jvm/

Správná verze by měla být Adopt OpenJDK 11 Hotspot (já mám teď coretto-11.0.13). Ta je ale zastaralá, takže [OpenJDK 11](https://adoptium.net/en-GB/temurin/releases/?version=11) od Eclipse Temurin?

JVM je teď sice se symboly, ale nedošlo nám, že JVM je v Androidu... aplikace tedy patrně nemá debug symboly, protože se jedná o produkční build.

Nejvhodnější prostředí bude tedy Ubuntu.

-- 17:00 -- 

Pokračování příště.

Ještě z posledního adb logcat:

```
11-03 16:58:58.072  1478  1478 D re.frida.helper: Time zone APEX ICU file found: /apex/com.android.tzdata/etc/icu/icu_tzdata.dat
11-03 16:58:58.072  1478  1478 D re.frida.helper: I18n APEX ICU file found: /apex/com.android.i18n/etc/icu/icudt68l.dat
11-03 16:58:58.083  1478  1478 W re.frida.helper: Mismatch between instruction set variant of device (ISA: Arm64 Feature string: -a53,crc,lse,fp16,dotprod,-sve) and features returned by the hardware (ISA: Arm64 Feature string: -a53,crc,lse,fp16,-dotprod,-sve)
11-03 16:58:58.087  1478  1478 W ziparchive: Unable to open '/data/local/tmp/frida-helper-9c9f356c3b684c0b876e79164a0d9ca0.dm': No such file or directory

11-03 16:58:58.152  1478  1478 D AndroidRuntime: Calling main entry re.frida.Helper
11-03 16:58:58.165  1478  1478 W libc    : Access denied finding property "qemu.sf.lcd_density"
11-03 16:58:58.165  1478  1478 W libc    : Access denied finding property "qemu.sf.lcd_density"
11-03 16:58:58.160  1478  1478 W main    : type=1400 audit(0.0:691): avc: denied { read } for name="u:object_r:qemu_sf_lcd_density_prop:s0" dev="tmpfs" ino=20887 scontext=u:r:shell:s0 tcontext=u:object_r:qemu_sf_lcd_density_prop:s0 tclass=file permissive=0
11-03 16:58:58.163  1478  1478 W main    : type=1400 audit(0.0:692): avc: denied { read } for name="u:object_r:qemu_sf_lcd_density_prop:s0" dev="tmpfs" ino=20887 scontext=u:r:shell:s0 tcontext=u:object_r:qemu_sf_lcd_density_prop:s0 tclass=file permissive=0
11-03 16:58:58.186  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020G.apk: overlay ignored due to required system property: ro.boot.hardware.sku with value: G020G
11-03 16:58:58.188  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020G_VN.apk: overlay ignored due to required system property: ro.boot.hardware.sku,ro.boot.hardware.coo with value: G020G,VN
11-03 16:58:58.194  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020H.apk: overlay ignored due to required system property: ro.boot.hardware.sku with value: G020H
11-03 16:58:58.200  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020F_VN.apk: overlay ignored due to required system property: ro.boot.hardware.sku,ro.boot.hardware.coo with value: G020F,VN
11-03 16:58:58.202  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020E.apk: overlay ignored due to required system property: ro.boot.hardware.sku with value: G020E
11-03 16:58:58.217  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020E_VN.apk: overlay ignored due to required system property: ro.boot.hardware.sku,ro.boot.hardware.coo with value: G020E,VN
11-03 16:58:58.220  1478  1478 I PackageParsing: Skipping target and overlay pair com.android.settings and /product/overlay/SettingsOverlayG020H_VN.apk: overlay ignored due to required system property: ro.boot.hardware.sku,ro.boot.hardware.coo with value: G020H,VN
11-03 16:58:58.222  1478  1478 W re.frida.helper: unable to execute idmap2: Permission denied
11-03 16:58:58.222  1478  1478 W OverlayConfig: 'idmap2 create-multiple' failed: no mutable="false" overlays targeting "android" will be loaded
11-03 16:58:58.220  1478  1478 W main    : type=1400 audit(0.0:693): avc: denied { execute } for name="idmap2" dev="dm-4" ino=299 scontext=u:r:shell:s0 tcontext=u:object_r:idmap_exec:s0 tclass=file permissive=0
11-03 16:58:58.620  1478  1478 W re.frida.helper: type=1400 audit(0.0:694): avc: denied { getattr } for comm=436F6E6E656374696F6E2048616E64 path="/proc/fb" dev="proc" ino=4026531966 scontext=u:r:shell:s0 tcontext=u:object_r:proc:s0 tclass=file permissive=0
11-03 16:58:58.620  1478  1478 W re.frida.helper: type=1400 audit(0.0:695): avc: denied { getattr } for comm=436F6E6E656374696F6E2048616E64 path="/proc/keys" dev="proc" ino=4026532115 scontext=u:r:shell:s0 tcontext=u:object_r:proc_keys:s0 tclass=file permissive=0
11-03 16:58:58.620  1478  1478 W re.frida.helper: type=1400 audit(0.0:696): avc: denied { getattr } for comm=436F6E6E656374696F6E2048616E64 path="/proc/kmsg" dev="proc" ino=4026532070 scontext=u:r:shell:s0 tcontext=u:object_r:proc_kmsg:s0 tclass=file permissive=0
11-03 16:58:58.620  1478  1478 W re.frida.helper: type=1400 audit(0.0:697): avc: denied { getattr } for comm=436F6E6E656374696F6E2048616E64 path="/proc/misc" dev="proc" ino=4026531967 scontext=u:r:shell:s0 tcontext=u:object_r:proc_misc:s0 tclass=file permissive=0
11-03 16:58:58.620  1478  1478 W re.frida.helper: type=1400 audit(0.0:698): avc: denied { getattr } for comm=436F6E6E656374696F6E2048616E64 path="/proc/iomem" dev="proc" ino=4026532094 scontext=u:r:shell:s0 tcontext=u:object_r:proc_iomem:s0 tclass=file permissive=0
11-03 16:58:58.620  1478  1478 W re.frida.helper: type=1400 audit(0.0:699): avc: denied { getattr } for comm=436F6E6E656374696F6E2048616E64 path="/proc/locks" dev="proc" ino=4026532058 scontext=u:r:shell:s0 tcontext=u:object_r:proc_locks:s0 tclass=file permissive=0
```

### TODO: Čisté a minimalistické řešení

1. Instalace Ubuntu VM, minimální požadavky
2. Instalace Android Studio
3. Instalace Frida.re a Objection
4. Patchnutí APK
5. Zapnutí a nastavení Developer režimu na telefonu (nebo Simulátor?)
6. Instalace APK a jeho spuštění
7. Kontrola funkce frida-gadgetu v logu zařízení, připojení se pomocí frida-trace 

---

8. Body navíc za rozchození `objection -g "Test Application" explore`
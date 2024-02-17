# Autorské řešení (Android)

**Nástroje:**

* VirtualBox + Extensions
* Kali (testováno na verzi 2023.4)
* Burp Suite (+ plugin JSON Web Tokens)
* Objection/Frida

**Výchozí situace:**

Mobilní aplikace se připojuje na neznámý endpoint a posílá neznámé autentizační parametry a hlavičky. Komunikace je chráněna pomocí klientského certifikátu, dynamického SSL pinningu (do komunikace není při nastavení MITM proxy vidět) a aplikace implementuje binární ochranu proti spuštění na rootnutém telefonu. 

**Vrcholový postup je následující:**

- Použít nástroj Objection (nástavba nad Fridu) pro patchnutí a instrumentaci APK

- U mobliní aplikace vypnout SSL Pinning a nasměrovat komunikaci zkrze MITM proxy

- Na rootnutém telefonu nepatchovat APK, ale zamaskovat příkaz `su`, aby jej kontrola nenašla.

- Sledovat komunikaci mezi aplikací a backendem pomocí Burp Suite (MITM proxy) a najít v komunikaci ukryté flagy.

## Příprava prostředí a instalace Objection

1. U poslední verze Kali je ve výchozím stavu vypnuté síťování, které je potřeba zapnout.

		sudo ip link set dev <interface> up

2. Instalace závislostí (python, pip, frida, objection a věci, které bude chtít objection po spuštění) - v Kali je potřeba kvůli systémovému managementu `python3` balíčků navíc použít přepínač `--break-system-packages` a nebo použít venv/virtualenv:

		sudo su
		apt-get update -y
		apt-get install -y python3 python3-pip android-sdk-platform-tools-common aapt apksigner apktool zipalign adb
	
		python3 -m pip install --break-system-packages frida objection

3. Ve VM uvnitř VirtualBoxu je potřeba nainstalovat také Oracle Virtual Box Extensions (pustit `autorun.sh` na připojeném svazku a restartovat) - jinak není možné používat schránku a sdílené složky.

4. Pokud používáme mobilní telefon místo emulátoru, je třeba na něm zapnout Vývojářský režim (poklepáním na číslo verze systému) a následně Ladění USB (a při prvním připojení potvrdit otisk počítače).

### Jak opravit nefunkční instalaci `objection`

Kvůli změně v GitHub API vrací chybu řádek:

		self.gadget_version = self._call(self.GITHUB_LATEST_RELEASE)['tag_name']
		
Obsahem odpovědi je:

		{"message":"API rate limit exceeded for 86.49.237.68. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)","documentation_url":"https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"}
		
![](images/github-error.png)
		
To lze obejít stažením obsahu příslušné URL do souboru pomocí GitHub CLI:

1. Vytvořit si GitHub token na [https://github.com/settings/tokens](https://github.com/settings/tokens):

		Scope: repo, read:org, workflow
		Příklad tokenu: ghp_0fJ37QIlGPD4N2BxKWrVb6ZWgyH9Q23FPyU8
		
		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

2. Nainstalovat GitHub CLI

		$ sudo apt-get install -y gh

3. Přihlásit se pomocí příkazu `gh auth login` a vygenerovaného tokenu:

		$ gh auth login
		? What account do you want to log into? GitHub.com
		? What is your preferred protocol for Git operations on this host? HTTPS
		? Authenticate Git with your GitHub credentials? Yes
		? How would you like to authenticate GitHub CLI? Paste an authentication token
		Tip: you can generate a Personal Access Token here https://github.com/settings/tokens
		The minimum required scopes are 'repo', 'read:org', 'workflow'.
		? Paste your authentication token: ****************************************
		- gh config set -h github.com git_protocol https
		✓ Configured git protocol
		✓ Logged in as user

![](images/gh-auth-login.png)

4. Stáhnout obsah URL `https://api.github.com/repos/frida/frida/releases/latest` do soubru latest.json

		gh api --method GET /repos/frida/frida/releases/latest \
		--header 'Accept: application/vnd.github+json' \
		--header "X-GitHub-Api-Version: 2022-11-28" > /tmp/latest.json && cat /tmp/latest.json

V souboru `../site-packages/objection/utils/patchers/github.py` (jeho přesná cesta je vidět v chybovém výpisu při pokusu o zavolání příkazu `objection patchapk --source ./app-release.apk`) změnit vstup z API na načtení souboru:

Na začátek souboru doplnit import:

		import json
		
Od řádku 35 změnit:

		# get a new response
       results = requests.get(endpoint).json()
       
Na:

		# get response from latest.json
		results = json.load(open('/tmp/latest.json'))		
Při stahování Frida-Gadgetu již Objection nebude vracet chybu způsobenou změnou API, kvůli které nejde stáhnout obsah URL `https://api.github.com/repos/frida/frida/releases/latest` bez autentizace (viz instalace GitHub CLI výše).


### Jak opravit `zipalign`

Pokud ve výchozí instalaci Kali nefunguje nebo chybí nástroj `zipalign`, funkční verzi nainstalujte přímo z repozitáře Debian:

		wget -O /tmp/zipalign.deb http://ftp.de.debian.org/debian/pool/main/a/android-platform-build/zipalign_8.1.0+r23-2_amd64.deb

		sudo dpkg -i /tmp/zipalign.deb 

Výpis:

```
┌──(kali㉿kali)-[/usr/lib/android-sdk/build-tools/29.0.3]
└─$ wget -O /tmp/zipalign.deb http://ftp.de.debian.org/debian/pool/main/a/android-platform-build/zipalign_8.1.0+r23-2_amd64.deb
--2024-02-17 08:15:27--  http://ftp.de.debian.org/debian/pool/main/a/android-platform-build/zipalign_8.1.0+r23-2_amd64.deb
Resolving ftp.de.debian.org (ftp.de.debian.org)... 141.76.2.4
Connecting to ftp.de.debian.org (ftp.de.debian.org)|141.76.2.4|:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 19748 (19K) [application/vnd.debian.binary-package]
Saving to: ‘/tmp/zipalign.deb’

/tmp/zipalign.deb                           100%[==========================================================================================>]  19.29K  --.-KB/s    in 0.05s   

2024-02-17 08:15:27 (390 KB/s) - ‘/tmp/zipalign.deb’ saved [19748/19748]

                                                                                                                                                                               
┌──(kali㉿kali)-[/usr/lib/android-sdk/build-tools/29.0.3]
└─$ sudo dpkg -i /tmp/zipalign.deb 
[sudo] password for kali: 
dpkg: warning: downgrading zipalign from 1:10.0.0+r36-1 to 1:8.1.0+r23-2
(Reading database ... 406371 files and directories currently installed.)
Preparing to unpack /tmp/zipalign.deb ...
Unpacking zipalign (1:8.1.0+r23-2) over (1:10.0.0+r36-1) ...
Setting up zipalign (1:8.1.0+r23-2) ...
Processing triggers for kali-menu (2022.4.1) ...
Processing triggers for man-db (2.11.0-1+b1) ...
                                                                                                                                                                               
┌──(kali㉿kali)-[/usr/lib/android-sdk/build-tools/29.0.3]
└─$ zipalign
Zip alignment utility
Copyright (C) 2009 The Android Open Source Project

Usage: zipalign [-f] [-p] [-v] [-z] <align> infile.zip outfile.zip
       zipalign -c [-p] [-v] <align> infile.zip

  <align>: alignment in bytes, e.g. '4' provides 32-bit alignment
  -c: check alignment only (does not modify file)
  -f: overwrite existing outfile.zip
  -p: memory page alignment for stored shared object files
  -v: verbose output
  -z: recompress using Zopfli

```

## Patchování aplikace

Aby bylo možné použít Objection, je nutné spustit na zařízení/emulátoru `frida-server` nebo injektovat Frida-Gadget přímo do aplikace (např. pokud není rootnuté zařízení k dispozici):

```
┌──(kali㉿kali)-[/mnt/m4]
└─$ objection patchapk --source ./app-release.apk
No architecture specified. Determining it using `adb`...
Detected target device architecture as: arm64-v8a
Using latest Github gadget version: 16.2.1
Patcher will be using Gadget version: 16.2.1
Detected apktool version as: 2.7.0-dirty
Running apktool empty-framework-dir...
Unpacking ./app-release.apk
An error may have occurred while extracting the APK.
Picked up _JAVA_OPTIONS: -Dawt.useSystemAAFontSettings=on -Dswing.aatext=true
                                                                                                                                                                               
App already has android.permission.INTERNET
Target class not specified, searching for launchable activity instead...
Reading smali from: /tmp/tmp6_rzxyyg.apktemp/smali/cz/corpus/sslpinning/MainActivity.smali
Injecting loadLibrary call at line: 14
Attempting to fix the constructors .locals count
Current locals value is 0, updating to 1:
Writing patched smali back to: /tmp/tmp6_rzxyyg.apktemp/smali/cz/corpus/sslpinning/MainActivity.smali
Copying Frida gadget to libs path...
Rebuilding the APK with the frida-gadget loaded...
Rebuilding the APK may have failed. Read the following output to determine if apktool actually had an error: 
                                                                                                                                                                               
Picked up _JAVA_OPTIONS: -Dawt.useSystemAAFontSettings=on -Dswing.aatext=true
                                                                                                                                                                               
Built new APK with injected loadLibrary and frida-gadget
Performing zipalign
Zipalign completed
Signing new APK.
Signing the new APK may have failed.

Picked up _JAVA_OPTIONS: -Dawt.useSystemAAFontSettings=on -Dswing.aatext=true
                                                                                                                                                                               
Signed the new APK
Copying final apk from /tmp/tmp6_rzxyyg.apktemp.aligned.objection.apk to ./app-release.objection.apk in current directory...
Cleaning up temp files...
                                                                                                                                                                               
┌──(kali㉿kali)-[/mnt/m4]
└─$ 
```

## Instalace

Patchnutou aplikaci nainstalujeme na telefon/emulátor pomocí:

	adb install ./app-release.objection.apk

## První spuštaní a obejití detekce root

![](images/rootbeer.png)

Při zavolání `objection -g cz.corpus.sslpinning explore` se může aplikace spustit a ihned ukončit. Ve výpisu `adb logcat` bude vidět zmínka o tom, že knihovna RootBeer detekovala soubor `/usr/bin/su`.

Pokud je Android rootnutý pomocí Magisku, je možné toto obejít umístěním aplikace na **Deny List** v nastavení aplikace Magisk.

![](images/magisk-denylist.png)

![](images/magisk-noshell.png)

## Vypnutí SSL pinningu a sledování komunikace

Nejprve je třeba na svém počítači spustit Burp Suite a poznamenat si IP adresu (v příkladu 192.168.10.10) a port (8080), na kterém proxy poběží. Komunikaci na proxy jde směrovat jak v nastavení WiFi na Androidu, tak (s mnohem menším šumem) přímo pomocí  Objection.

Nastavení proxy:

Zde je vidět přiřazená adresa a port, je potřeba použít IP adresu v síti (ne localhost/127.0.0.1):

![](images/burp-proxy.png)

Nastavení TLS:

- Pokud dojde k chybě TLS a Burp Proxy se nepovede navázat spojení, umí automaticky přidávat do seznamu **TLS pass through** při zaškrtnutí "Automatically add entries on client TLS negotiation failure".

- Pokud chceme vidět do komunikace s backendem, pass through pro daný endpoint musí být vypnutý. 

![](images/burp-tls.png)

Spuštění aplikace, vypnutí SSL pinningu a nastavení proxy (přesměrování komunikace do Burp Suite nebo jiné MITM proxy).

Spuštění aplikace v prostředí objection (následující řádky je lepší mít připravené ve schránce):

		$ objection -g cz.corpus.sslpinning explore
		
Vložením ze schránky hned po "odklepnutí" zajistíme vypnutí SSL Pinningu pokud možno co nejdříve při startu aplikace (pokud by se to nepovedlo, tlačítko Retry v aplikaci zopakuje síťovou transakci):
		
		android root disable # optional
		android sslpinning disable
		android proxy set 192.168.10.10 8080

Výstup:

```
└─$ objection -g cz.corpus.sslpinning explore
Using USB device `Pixel 3a`
Agent injected and responds ok!

     _   _         _   _
 ___| |_|_|___ ___| |_|_|___ ___
| . | . | | -_|  _|  _| | . |   |
|___|___| |___|___|_| |_|___|_|_|
      |___|(object)inject(ion) v1.11.0

     Runtime Mobile Exploration
        by: @leonjza from @sensepost

[tab] for command suggestions
cz.corpus.sslpinning on (google: 11) [usb] # android sslpinning disable
(agent) Custom TrustManager ready, overriding SSLContext.init()
(agent) Found com.android.org.conscrypt.TrustManagerImpl, overriding TrustManagerImpl.verifyChain()
(agent) Found com.android.org.conscrypt.TrustManagerImpl, overriding TrustManagerImpl.checkTrustedRecursive()
(agent) Registering job 158540. Type: android-sslpinning-disable
cz.corpus.sslpinning on (google: 11) [usb] # 

```

## Finální sledování komunikace v Burp Suite a odhalení flagů

Pokud aplikace běží a Objection funguje, můžeme se v Burp Suite podívat na komunikaci:

Flag 1 je přímo v HTML autentizované odpovědi:

![](images/flag-1.png)

Flag 2 lze odhalit při dekódování obsahu JWT tokenu (instalace doplňku JSON Web Tokens usnadní vyhledávání, dekódování a zobrazení obsahu tokenu):

![](images/flag-2.png)

# Hinty

### Jak nainstalovat funkční `apktool`

Je potřeba nainstalovat `apktool`, který není `-dirty` (jak říká zadání).

	wget https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/linux/apktool
	chmod +x ./apktool
	wget https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.6.0.jar
	mv apktool_2.6.0.jar apktool.jar	
	sudo mv ./apktool* /usr/bin

### Frida-Server v emulátoru nebo rootnutém telefonu

Objection se může připojit místo Gadgetu v patchnutém APK k serveru spuštěnému přímo v rámci systému Android.

- Stáhnout `frida-server` z GitHubu (architektura arm664 nebo v mém případě arm64-v8s):

- Nainstalovat `frida-server` do běžícího emulátoru (stejně jako do rootnotého telefonu):

		unxz ./frida-server-16.2.1-android-arm64.xz
		adb push ./frida-server-16.2.1-android-arm64 /tmp/local/data/frida-server
		adb push frida-server /data/local/tmp/
		adb shell "su; chmod 755 /data/local/tmp/frida-server"
		
- Spustit frida-server:
		
		adb shell "su; /data/local/tmp/frida-server &"
		

### Jak rozchodit `adb` ve VirtualBoxu na Macu

Pro připojení USB zařízení do VirtualBoxu na Macu je potřeba:

1. Změnit práva u souborů pro VM tak, aby k nim mohl přistupovat root:
	
		~/VMs-ROOT/kali-linux-2022.4-virtualbox-amd64$ chown root *
		~/VMs-ROOT/kali-linux-2022.4-virtualbox-amd64$ ls -la
		total 39527104
		drwxr-xr-x@ 9 sychram  staff   288B Feb 17 15:09 ./
		drwxr-xr-x  5 sychram  staff   160B Feb 17 13:36 ../
		-rw-r--r--@ 1 sychram  staff   6.0K Nov 23 14:07 .DS_Store
		drwx------  6 root     staff   192B Feb 17 13:37 Logs/
		drwx------  2 root     staff    64B Feb 17 13:06 Snapshots/
		-rw-r--r--  1 root     staff   3.0K Dec  5  2022 kali-linux-2022.4-virtualbox-amd64-1.16.vbox
		-rw-------  1 root     staff   5.4K Feb 17 15:09 kali-linux-2022.4-virtualbox-amd64.vbox
		-rw-------  1 root     staff   6.1K Feb 17 15:09 kali-linux-2022.4-virtualbox-amd64.vbox-prev
		-rw-r--r--@ 1 root     staff    19G Feb 17 15:09 kali-linux-2022.4-virtualbox-amd64.vdi
		
![](images/mac-vbox-chown.png)

2. Spustit VirtualBox jako root.

		$ sudo /Applications/VirtualBox.app/Contents/MacOS/VirtualBox 

3. Pak nebude VirtualBox vracet chybu při připojení USB zařízení k VM.
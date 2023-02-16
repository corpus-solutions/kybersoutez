# M3 - Řešení

1. Ubuntu z osboxes.org má heslo `osboxes.org`. Je třeba vytvořit nový stroj, výchozí networking NAT je dostačující.

2. Instalace závislostí (python, pip, frida, objection a věci, které bude chtít objection po spuštění):

	sudo su
	apt-get update
	apt-get install python3 python3-pip
	pip install frida objection
	apt-get install android-sdk-platform-tools-common aapt apksigner apktool zipalign adb

3. V Ubuntu je potřeba nainstalovat také Virtual Box Extensions (pustit `autorun.sh` na připojeném svazku a restartovat).

4. Je potřeba nainstalovat `apktool`, který není `-dirty` (jak říká zadání).

	wget https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/linux/apktool
	chmod +x ./apktool
	wget https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.6.0.jar
	mv apktool_2.6.0.jar apktool.jar	
	sudo mv ./apktool* /usr/bin

5. Co nejjednodušší injektáž Frida-Gadgetu umí Objection (dle zadání):

		$ objection patchapk --source ./TestApp.apk

6. Instalace aplikace (nejlépe na telefon nebo simulátor, ale pouze pokud máte procesor AMD podporující ve Virtualboxu instrukce VT-x)

		$ adb install -r ./TestApp.objection.apk
		
7. Připojení pomocí Frida (-U znamená USB)

		$ frida -U "Test Application"

Prompt je (nesmí obsahovat chybu "Connection terminated"):

	`[Pixel 3a::Test Application]->`
	
Vlajka je:

	`::Test Application]->`
	

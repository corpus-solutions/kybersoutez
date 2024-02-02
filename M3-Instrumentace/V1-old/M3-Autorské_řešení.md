# M3 - Řešení

1. U poslední verze Kali je ve výchozím stavu vypnuté síťování, které je potřeba zapnout pomocí:

	sudo ip link set dev <interface> up

2. Instalace závislostí (python, pip, frida, objection a věci, které bude chtít objection po spuštění) - v Kali je potřeba navíc použít přepínač `--break-system-packages:

	sudo su
	apt-get update -y
	apt-get install -y python3 python3-pip android-sdk-platform-tools-common aapt apksigner apktool zipalign adb
	
	python3 -m pip install --break-system-packages frida objection

3. V Ubuntu je potřeba nainstalovat také Virtual Box Extensions (pustit `autorun.sh` na připojeném svazku a restartovat).

4. Je potřeba nainstalovat `apktool`, který není `-dirty` (jak říká zadání).

	wget https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/linux/apktool
	chmod +x ./apktool
	wget https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.6.0.jar
	mv apktool_2.6.0.jar apktool.jar	
	sudo mv ./apktool* /usr/bin

5. Co nejjednodušší injektáž Frida-Gadgetu umí Objection (dle zadání), vyžaduje připojený telefon (nebo běžící simulátor):

		$ objection patchapk --source ./TestApp.apk

6. Instalace aplikace (nejlépe na telefon nebo simulátor, ale pouze pokud máte procesor AMD podporující ve Virtualboxu instrukce VT-x)

		$ adb install -r ./TestApp.objection.apk
		
7. Připojení pomocí Frida (-U znamená USB) - na telefonu je potřeba zapnout USB debugging a telefon připojit přes USB (do virtuálního stroje, na kterém běží Kali/Ubuntu, je potřeba zařízení připojit ručně ve VirtualBoxu).

		$ frida -U "Test Application"

8. Instrumentace

		$ frida --codeshare realgam3/alert-on-mainactivity -U "Test Application"

		root@igraczech-ubuntu2204:/mount/m3# frida --codeshare platix/get-android-security-provider-mstg-network-6 -U "Test Application"
			____
			/ _  |   Frida 16.0.10 - A world-class dynamic instrumentation toolkit
		| (_| |
			> _  |   Commands:
		/_/ |_|       help      -> Displays the help system
		. . . .       object?   -> Display information about 'object'
		. . . .       exit/quit -> Exit
		. . . .
		. . . .   More info at https://frida.re/docs/home/
		. . . .
		. . . .   Connected to Pixel 3a (id=04VAY1WKFG)
		Attaching...                                                            
		AndroidNSSP version 1.0,AndroidOpenSSL version 1.0,CertPathProvider version 1.0,AndroidKeyStoreBCWorkaround version 1.0,BC version 1.68,HarmonyJSSE version 1.0,AndroidKeyStore version 1.0
		[Pixel 3a::Test Application ]->

	
Vlajka je (na mém Androidu, může se lišit v detailech!):

	`AndroidNSSP`
	


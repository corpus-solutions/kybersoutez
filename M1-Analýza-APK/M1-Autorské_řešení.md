# M1 – Autorské řešení

1. Instalace prerekvizit: JADX-GUI (https://github.com/skylot/jadx)
2. Otevření APK pomocí JADX-GUI (`jadx-gui ./TestApplication.apk`)
3. Vyhledání autentizačních údajů (Navigation > Text Serch podle klíčového slova `Key()` ve třídě `p004cz.corpus.dva.logindata`) a pomocí manuálního šetření.
4. Vlajka:
	- a) Aplikace obsahuje dva skryté (nepoužité) klíče `"cf32f2f8-592e-11ed-934d-c7a5b9711d27"` a `(99, 102, 51, 50, 102, 50, 102, 56, 45, 53, 57, 50, 101, 45, 49, 49, 101, 100, 45, 57, 51, 52, 100, 45, 99, 55, 97, 53, 98, 57, 55, 49, 49, 100, 50, 55, 10)`. (Při konverzi druhého klíče na sekvenci bajtů lze ověřit, že jde o identické klíče, pouze v různé formě zápisu.)
	- b) Aplikace dále používá DSN klíč pro zasílání statistik na službu Sentry.io v souboru AndroidManifest.xml: `https://fde9407f05b44dd68380af7eefb395a5@o4504018248007680.ingest.sentry.io/4504018249056256`

> Klíč je na Mac/Linux možné z textové do bajtové formy převést pomocí `echo cf32f2f8-592e-11ed-934d-c7a5b9711d27 | od -A n -t x1`

Vlajka je tedy "cf32f2f8-592e-11ed-934d-c7a5b9711d27"
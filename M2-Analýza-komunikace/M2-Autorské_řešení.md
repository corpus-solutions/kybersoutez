# M2 – Autorské řešení

1. Instalace prerekvizit: Wireshark, Android Studio
2. Instalace APK do spuštěného Android simulátoru (`adb install ./TestApplication.apk`)
3. Odsledování komunikace po spuštění aplikace pomocí WireSharku
4. Vlajka:
	Aplikace komunikuje na adresu `http://thinx.cloud:3333/` nezašifrovaně a tam posílá polohu v Cookie:
	
	`http://Location%5Bfused+37.422094%2C-122.083922+hAcc%3D600+et%3D%2B7h1m39s380ms+vAcc%3D%3F%3F%3F+sAcc%3D%3F%3F%3F+bAcc%3D%3F%3F%3F%5D`
	
Protože odpověď musí být jednoznačná, vlajkou je adresa (včetně portu): `http://thinx.cloud:3333/`
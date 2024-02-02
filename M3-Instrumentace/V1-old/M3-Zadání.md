# M3 – Zadání

Do přiložené aplikace přilinkujte knihovnu `frida-gadget` a podepište, aby se aplikace spustila a ke knihovně bylo možné se připojit.

Na Linuxu (Ubuntu, případně Kali) budete potřebovat nástroje Frida, Objection a dále apt balíčky android-sdk-platform-tools-common aapt apksigner apktool=2.6.0 a zipalign.

Vlajkou je prompt po úspěšném připojení k Gadgetu pomocí příkazu `frida -U "<název aplikace>"` bez identifikátoru zařízení (od `::` do posledního viditelného znaku, včetně `::`) – cílem je tedy spustit aplikaci aby nespadla a následně instrumentaci pomocí frida, aby aplikace nevrátila žádnou chybu.

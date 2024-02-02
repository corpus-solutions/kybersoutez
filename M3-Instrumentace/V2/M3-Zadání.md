# M3 – Zadání

Do přiložené aplikace přilinkujte `frida-gadget` tak, aby byla aplikace instrumentovatelná pomocí nástroje Frida. Následně v aplikaci Frida spusťte skript `platix/get-android-security-provider-mstg-network-6`.

- `apktool` instalujte ve verzi 2.6.0 (verze -dirty nefunguje).

- Pokud pip nabízí řešení `--break-system-packages`, nebojte se jej použít (vyhnete se tak složité konfiguraci virtuálního prostředí Python).

- Pokud aplikace padá, ujistěte se, že má Android přístup na Internet

Vlajkou je první slovo výpisu z výše uvedeného skriptu, následující po řádku `Attaching...`.
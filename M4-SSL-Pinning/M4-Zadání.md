# M4 – Zadání

Přilinkujte `frida-gadget` nebo spusťte spusťte `frida-server` tak, aby byla přiložená Android aplikace instrumentovatelná pomocí nástroje Frida/Objection. 

Odsledujte komunikaci s API (bude třeba obejít určité ochrany, aplikace se bude chtít bránit).

Vlajka je zakódována v odpovědi serveru a je ve formátu UUID.

- Protože už nefunguje rozhraní mezi GitHub API a `objection`, je třeba provolat toto API ručně a upravit kód v Pythonu tak, aby se seznam verzí načítal z JSON souboru místo URL.

- Výchozí `apktool` v Kali nemusí fungovat – nainstalujte jej ve verzi 2.6.0 (verze -dirty nefunguje).

- Pokud pip nabízí řešení `--break-system-packages`, nebojte se jej použít (vyhnete se tak složité konfiguraci virtuálního prostředí Python).

- Pro uživatele MacOS: Aby fungoval USB Debugging v Kali uvnitř VirtualBoxu na Macu, je třeba VirtualBox spustit jako `root`.

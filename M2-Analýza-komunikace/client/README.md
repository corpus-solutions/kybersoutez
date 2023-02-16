# Test Application

Vzorová aplikace demonstrující použití nebezpečného protokolu (HTTP namísto HTTPS).

Aplikace slouží jako pomůcka při plnění úkolu spočívajícího ve sledování komunikace a odhalení přenášených dat cestou.

Zdrojový kód této aplikace není součástí zadání úlohy (pouze výsledná binární aplikace pro Android – APK).

Aplikace využívá záměrně přepínač `usesCleartextTraffic`, což se u produkčních aplikací nedoporučuje (a přesto tuto zranitelnost často vídáme, i když je na Android od verze 9 standardně vyžadováno HTTPS).

## Použití

Aplikace si při prvním spuštění vyžádá informace o poloze.

Do přihlašovacího dialogu je možné zadat cokoliv (nezadávejte skutečné heslo).

Během provozu aplikace odešle různé volně dostupné analytické údaje, které se na backendu ukládají do logu.

Po úspěšném přihlášení se aplikace ukončí, nic dalšího se v ní dělat nedá (zatím).



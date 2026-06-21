# Pneumatiky - ochranny checklist

Modul Pneumatiky je hotova cast aplikace. Pri prestavbe na Kaiser Provozni Centrum se nesmi menit jeho vnitrni funkcnost, datovy model, importy, reporty ani vizualni provedeni uvnitr modulu.

## Zakazane zmeny

- Nemenit strukturu `state.tires`.
- Nemenit logiku `renderTires`, `addTire`, importu faktur, reportu pneu ani mapy osazeni.
- Nemenit UI uvnitr sekce `#tires`.
- Nemenit rychle mereni, prirazovani pneu na pozici ani servisni vazby na pneu, pokud to neni nutne pro technicke zasazeni do noveho shellu.
- Nespoustet hromadne obnovy nebo importy, ktere mohou prepsat cloudova data.

## Povolene zmeny

- Presunout Pneumatiky do nove hlavni navigace jako samostatny hotovy modul.
- Upravit pouze vnejsi shell aplikace, header, navigaci nebo breadcrumb.
- Doplnit regression testy a dokumentaci.

## Povinne overeni pred nasazenim

1. Otevrit produkcni/test URL pres `https`, nikdy ne `file://`.
2. Overit viditelny build a nacitane skripty.
3. Otevrit modul Pneumatiky z hlavni navigace.
4. Overit filtr stavu:
   - Vsechny stavy
   - Na vozidle
   - Sklad
   - Oprava
   - Vyrazeno
5. Overit globalni hledani podle ID pneu, SPZ a dodavatele.
6. Otevrit formular Nova pneu a zavrit ho bez ulozeni.
7. Bezpecne zalozit pouze testovaci pneu s prefixem `TEST CODEX`, pokud je potreba zapisovy test.
8. Po ulozeni provest refresh a overit, ze data drzi v cloudu.
9. Otevrit Vozidla a overit mapu osazeni pro znamou SPZ.
10. Otevrit detail pozice a overit prirazeni/sundani jen na testovacich datech.
11. Overit rychle mereni:
    - Jedna pozice
    - Vsechny pozice
    - Validace km proti aktualnimu tachometru
12. Otevrit Import a overit, ze ukazkovy import zustava jen nahled.
13. Otevrit Reporty a overit, ze pneu metriky odpovidaji dashboardu.

## Stop podminky

Nasazeni zastavit, pokud se objevi:

- `Chyba cloudu`, `Chyba ulozeni`, RLS chyba nebo quota chyba.
- Zmena, ktera po refreshi nedrzi v cloudu.
- Ztrata osazenych pozic.
- Zmena poctu vozidel, uzivatelu, pneu nebo osazenych pozic bez jasneho duvodu.
- Vizualni rozpad tabulky Pneumatiky nebo mapy osazeni.

## Vysledek testu

Pred kazdym produkcnim nasazenim uvest:

- testovana URL,
- build,
- cas testu,
- co bylo ulozeno,
- vysledek po refreshi,
- potvrzeni, ze vnitrni modul Pneumatiky zustal beze zmen.

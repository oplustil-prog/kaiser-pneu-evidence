const STORAGE_KEY = "kaiser-pneu-evidence-v5";
const APP_VERSION = {
  number: "v0.9.12",
  build: "20260620-51",
  releaseDate: "20. 6. 2026",
  name: "Ostra cloudova verze",
  notes: [
    "Prehled uzivatelu uz nezobrazuje matouci docasnou poznamku k heslu; prvni prihlaseni je popsane pres e-mailovou obnovu hesla.",
    "Odstraneno nacitani neexistujiciho souboru vehicle-photo-assets.js.",
    "Tabletova navigace uz zobrazuje vsech osm sekci bez orezu.",
    "Odhlasena aplikace je skutecne uzamcena za prihlasovacim dialogem.",
    "Supabase klient se sdili mezi auth a sync modulem, aby nevznikaly duplicitni auth instance.",
    "Servisni karta respektuje zadany pocet pneu vcetne hodnoty 0.",
    "Obnova importovanych dat ma potvrzeni a jasne rika, ceho se netyka.",
    "Mobilni navigace je bez vodorovneho posouvani a zobrazuje vsechny sekce najednou.",
    "Ukazkovy import je jen nahled a neuklada se do cloudu.",
    "Obnova importovanych dat uz nesaha na vozidla, uzivatele, mereni ani osazene pozice.",
    "Automaticke ulozeni s ubytkem dat nejdriv nacita cloud, aby neprepsalo novejsi produkcni stav.",
    "Cloudova ochrana uz neblokuje bezne male zmeny v osazenych pozicich a uzivatelich.",
    "Modul prirazovani pneu uz neprepisuje hlavni build aplikace na starou verzi.",
    "Ukladani do cloudu uz nepridava velkou historii do zaznamu, aby nenarazilo na Supabase limit.",
    "Ochrana proti destruktivnim zapisum blokuje rizikovou zmenu bez dalsiho zapisu do Supabase.",
    "Tlacitko Ulozit znovu uklada bezne zmeny do Supabase cloudu; destruktivni prepisy zustavaji blokovane.",
    "Prihlaseni uz nezustava zasekle v nastaveni noveho hesla po dokoncene nebo zrusene obnove.",
    "Cloud uz se nikdy automaticky neprepisuje a synchronizace blokuje ztratu vozidel, uzivatelu, pneu i osazenych pozic.",
    "Rychle mereni zobrazuje vzdy jen jeden rezim, aby se jedna pozice a vsechny pozice nemichaly dohromady.",
    "Prihlaseni zobrazuje jen jeden formular: prihlaseni nebo nastaveni noveho hesla.",
    "Rychle mereni umi vyplnit vice pozic vybraneho vozidla a ulozit je najednou.",
    "Mereni kontroluje, ze novy stav km neni nizsi nez aktualni tachometr vozidla.",
    "Prihlaseni ma obnovu hesla pres Supabase.",
    "Mereni spolehlive propisuje aktualni stav km do tachometru vozidla.",
    "Vynuceno nove nacteni stylu mapy osazeni.",
    "Mapa osazeni zvyraznuje problemove pozice pulzem a potlacuje neosazene pozice.",
    "Opraveno poradi nacitani odebranych uzivatelu pred inicializaci stavu.",
    "Prehled uzivatelu ma vlastni vyhledavani a skryva odebrane obecne ucty dilny a managementu.",
    "Prehled uzivatelu skryva duplicitni realne pristupy se stejnym jmenem.",
    "Zabraneno duplicitam realnych pristupu pri shodnem jmenu v cloudu a vychozim adresari.",
    "Doplneny realne pristupy Milan Gazi, Tomas Gazi a Martin Konecek do vychoziho adresare.",
    "Vynuceno nove nacteni hlavniho skriptu po cache problemu.",
    "Zkracen horni cloudovy stav, aby se v liste nerezal.",
    "Realne uzivatelske pristupy jsou v seznamu nahore pred automatickymi ridici.",
    "Uzivatele z cloudu se spojuji se zakladnim seznamem ridicu, aby nikdo nezmizel ze seznamu.",
    "V detailu vozidla se zobrazuji koupene pneu z faktur pro vybranou SPZ bez primichani cizich rucnich pozic.",
    "Dashboardova karta je prejmenovana na Koupene pneu.",
    "Zpresneny stav cloudoveho ulozeni v horni liste.",
    "Prehled uzivatelu sjednocuje role Manager a Spravce.",
    "Supabase cloud, verejna GitHub Pages aplikace a zaloha produkcnich dat.",
    "Import ostrych servisnich faktur s rozdelenim na praci, material a pneu.",
    "Automaticke zalozeni kusove evidence pneu z ostrych faktur.",
    "Ochrana proti prazdnemu cloudovemu stavu v evidenci pneumatik.",
    "Plovouci rychle mereni neprekryva tlacitka pri editaci formularu.",
    "Info prihlasovaci box v horni liste aplikace.",
    "Automaticke ukladani zmen do Supabase cloudu po prihlaseni.",
    "Cloudove nacteni a automaticke ukladani jsou v ostrem provozu zamcene.",
    "Produkční Supabase nastaveni je chranene proti prepsani.",
    "Prihlaseny uzivatel ma zamceny nahled e-mailu a maskovaneho hesla.",
    "Kliknuti na logo vraci aplikaci na hlavni dashboard.",
    "Dashboard metriky, upozorneni na 30denni rychle mereni a proklik na mereni.",
    "Mapa osazeni z pudorysu, servisni karta, uzivatele a PDF karta vozidla."
  ]
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const importedInvoiceData = window.kaiserInvoiceData || { services: [], imports: [], summary: {} };

const tireLayouts = {
  van: ["L", "P", "ZL", "ZP"],
  trailerSingleAxle: ["L", "P"],
  trailerThreeAxle: ["L", "P", "VL", "VP", "ZL", "ZP"],
  truckTwoAxle: ["L", "P", "HL vnitrni", "HL vnejsi", "HP vnitrni", "HP vnejsi"],
  truckThreeAxle: [
    "L",
    "P",
    "HL vnitrni",
    "HL vnejsi",
    "HP vnitrni",
    "HP vnejsi",
    "VL vnitrni",
    "VL vnejsi",
    "VP vnitrni",
    "VP vnejsi"
  ],
  truckFourAxle: [
    "L",
    "P",
    "2L",
    "2P",
    "HL vnitrni",
    "HL vnejsi",
    "HP vnitrni",
    "HP vnejsi",
    "VL vnitrni",
    "VL vnejsi",
    "VP vnitrni",
    "VP vnejsi"
  ]
};

const kaiserFleetVehicles = [
  {
    spz: "3BH3767",
    type: "ACTROS 2551 tahač vleku",
    driver: "Martin Pinkava",
    odometer: 134485,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "3BI2007",
    type: "DAF- nosič kontejneru KUHN",
    driver: "Martin Bartoš",
    odometer: 73324,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "2BS 6064",
    type: "DAF_CF 530_s nástavbou IBOS",
    driver: "Jan Gaží",
    odometer: 205129,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "9B4 6276",
    type: "FUSO Canter nosič kontejnerů",
    driver: "bez ridice",
    odometer: 160890,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "8B7 7559",
    type: "Hüffermann_HSA 28.70_2017",
    driver: "bez ridice",
    odometer: 0,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "1BN 0213",
    type: "Hüffermann_přívěs_HKA 18.70_2018",
    driver: "Martin Bartoš",
    odometer: 0,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "1BM 6146",
    type: "Hüffermann_přívěs_HKA 18.70_2019",
    driver: "bez ridice",
    odometer: 0,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "2BE 7462",
    type: "Hüffermann_přívěs_HKA 24.70_2020",
    driver: "bez ridice",
    odometer: 0,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "2BJ 7654",
    type: "Iveco Daily MY 2019 (Rioned)",
    driver: "Petr Kučera",
    odometer: 149881,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.van
  },
  {
    spz: "1BM 3239",
    type: "Iveco Daily_skříň 2017",
    driver: "Martin Bravenec",
    odometer: 265605,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "1BB 2674",
    type: "Iveco popelářské auto",
    driver: "Jakub Kozlíček",
    odometer: 76016,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "6B7 3219",
    type: "Kögel vlek",
    driver: "bez ridice",
    odometer: 0,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "1BI 4520",
    type: "MAN 4x2 cisterna malá 3 m3",
    driver: "bez ridice",
    odometer: 211342,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "8B4 3007",
    type: "MAN Abroll nosič kontejnerů",
    driver: "Martin Bartoš",
    odometer: 604243,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "5B1 4417",
    type: "MAN cisterna 12 m3",
    driver: "Libor Ferbar",
    odometer: 676765,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "5E7 3753",
    type: "MAN cisterna 12 m3",
    driver: "Ondřej Hanzlíček",
    odometer: 330609,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "1BC 3390",
    type: "MAN cisterna 12 m3",
    driver: "Bronislav Ondrášek",
    odometer: 252901,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "8B2 0908",
    type: "MAN cisterna_12 m3",
    driver: "Jan Kovařík",
    odometer: 562987,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "6B9 3840",
    type: "MAN popelářské vozidlo KOBIT",
    driver: "Miroslav Florián",
    odometer: 372249,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "2BR 0904",
    type: "MAN ramenáč s nástavbou PAK 13 - HAMER",
    driver: "Martin Ištvánek",
    odometer: 389232,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "1BM 1150",
    type: "MAN TGL 12.180_malý Abroll",
    driver: "Jan Kozumplík",
    odometer: 382562,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "2BE 2247",
    type: "Mercedes 12t_skříň",
    driver: "bez ridice",
    odometer: 235919,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "3BF1394",
    type: "Mercedes Atego Abroll 12t.",
    driver: "Stanislav Janeček",
    odometer: 72641,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "3BH5548",
    type: "Mercedes Benz- AROCS 2646 LK",
    driver: "Radek Pich",
    odometer: 86314,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "9C83570",
    type: "Mercedes cisterna AROCS /IBOS",
    driver: "Milan Popelár",
    odometer: 135034,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "EL419CT",
    type: "Mercedes eSprinter 420",
    driver: "David Urc",
    odometer: 27254,
    depot: "PIU",
    monthlyCost: 0,
    configuration: tireLayouts.van
  },
  {
    spz: "1BP 8373",
    type: "Mercedes popelářské auto s nástavbou RosRoca",
    driver: "Štefan Brychnáč",
    odometer: 0,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "1BV 6295",
    type: "Mercedes se skříňovou nástavbou Ivacar",
    driver: "Martin Macejka",
    odometer: 482276,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "1BR 6359",
    type: "Mercedes_Abroll nosič kontejnerů Meiller 2017",
    driver: "bez ridice",
    odometer: 413842,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "2BD 8835",
    type: "Mercedes_Abroll nosič kontejnerů Meiller 2019",
    driver: "Roman Drdlík",
    odometer: 317849,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "5B8 0857",
    type: "Mercedes_nosič vanových kontejnerů PAK13",
    driver: "Radek Pich",
    odometer: 279721,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "3BN 3558",
    type: "Mercedes-Benz Actros 5 1836 L nástavba Ros Roca Olympus - popeláři",
    driver: "Miroslav Vašek",
    odometer: 0,
    depot: "PIU",
    monthlyCost: 0,
    configuration: tireLayouts.truckTwoAxle
  },
  {
    spz: "3BP 2836",
    type: "Mercedes-Benz Arocs 2646 LK 6x4_ ramenový nakladač 2026",
    driver: "Lukáš Malánik",
    odometer: 0,
    depot: "PIU",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "3BP 5305",
    type: "Mercedes-Benz Arocs_ Abroll nosič kontejnerů 2025",
    driver: "Roman Drdlík",
    odometer: 0,
    depot: "PIU",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "3BF6557",
    type: "Mercedes-Benz Citan 112 CDI",
    driver: "bez ridice",
    odometer: 127649,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.van
  },
  {
    spz: "8C92714",
    type: "Návěs Milcom",
    driver: "bez ridice",
    odometer: 0,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "2BI 2970",
    type: "Opel Combo Van Enjoy",
    driver: "bez ridice",
    odometer: 0,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.van
  },
  {
    spz: "3BE 2831",
    type: "Popeláři Mercedes s nástavbou Hanes",
    driver: "Jakub Kozlíček",
    odometer: 0,
    depot: "LJE",
    monthlyCost: 0,
    configuration: tireLayouts.truckThreeAxle
  },
  {
    spz: "3BH9041",
    type: "přívěs SVAN",
    driver: "Martin Pinkava",
    odometer: 0,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "8B7 7475",
    type: "vlek Huffermann HKA 24.70",
    driver: "bez ridice",
    odometer: 0,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "8B7 5380",
    type: "vlek Hüffermann HKA 24.70",
    driver: "bez ridice",
    odometer: 0,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "8B7 6637",
    type: "vlek Hüffermann HSA 2470 - roller",
    driver: "bez ridice",
    odometer: 0,
    depot: "ROP",
    monthlyCost: 0,
    configuration: tireLayouts.trailerThreeAxle
  },
  {
    spz: "9AJ4058",
    type: "vozík pod člun-Brenderup",
    driver: "Radim Opluštil",
    odometer: 0,
    depot: "JOL",
    monthlyCost: 0,
    configuration: tireLayouts.trailerSingleAxle
  }
];

const kaiserDriverUsers = [
  {
    id: "RID-001",
    name: "Bronislav Ondrášek",
    email: "bronislav.ondrasek@kaiser.local",
    role: "Ridic",
    depot: "ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-002",
    name: "David Urc",
    email: "david.urc@kaiser.local",
    role: "Ridic",
    depot: "PIU",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-003",
    name: "Jakub Kozlíček",
    email: "jakub.kozlicek@kaiser.local",
    role: "Ridic",
    depot: "LJE",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-004",
    name: "Jan Gaží",
    email: "jan.gazi@kaiser.local",
    role: "Ridic",
    depot: "LJE",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-005",
    name: "Jan Kovařík",
    email: "jan.kovarik@kaiser.local",
    role: "Ridic",
    depot: "ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-006",
    name: "Jan Kozumplík",
    email: "jan.kozumplik@kaiser.local",
    role: "Ridic",
    depot: "LJE",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-007",
    name: "Libor Ferbar",
    email: "libor.ferbar@kaiser.local",
    role: "Ridic",
    depot: "ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-008",
    name: "Lukáš Malánik",
    email: "lukas.malanik@kaiser.local",
    role: "Ridic",
    depot: "PIU",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-009",
    name: "Martin Bartoš",
    email: "martin.bartos@kaiser.local",
    role: "Ridic",
    depot: "JOL, ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-010",
    name: "Martin Bravenec",
    email: "martin.bravenec@kaiser.local",
    role: "Ridic",
    depot: "LJE",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-011",
    name: "Martin Ištvánek",
    email: "martin.istvanek@kaiser.local",
    role: "Ridic",
    depot: "LJE",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-012",
    name: "Martin Macejka",
    email: "martin.macejka@kaiser.local",
    role: "Ridic",
    depot: "ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-013",
    name: "Martin Pinkava",
    email: "martin.pinkava@kaiser.local",
    role: "Ridic",
    depot: "JOL",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-014",
    name: "Milan Popelár",
    email: "milan.popelar@kaiser.local",
    role: "Ridic",
    depot: "JOL",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-015",
    name: "Miroslav Florián",
    email: "miroslav.florian@kaiser.local",
    role: "Ridic",
    depot: "ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-016",
    name: "Miroslav Vašek",
    email: "miroslav.vasek@kaiser.local",
    role: "Ridic",
    depot: "PIU",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-017",
    name: "Ondřej Hanzlíček",
    email: "ondrej.hanzlicek@kaiser.local",
    role: "Ridic",
    depot: "LJE",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-018",
    name: "Petr Kučera",
    email: "petr.kucera@kaiser.local",
    role: "Ridic",
    depot: "JOL",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-019",
    name: "Radek Pich",
    email: "radek.pich@kaiser.local",
    role: "Ridic",
    depot: "JOL, ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-020",
    name: "Roman Drdlík",
    email: "roman.drdlik@kaiser.local",
    role: "Ridic",
    depot: "ROP, PIU",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-021",
    name: "Stanislav Janeček",
    email: "stanislav.janecek@kaiser.local",
    role: "Ridic",
    depot: "JOL",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  },
  {
    id: "RID-022",
    name: "Štefan Brychnáč",
    email: "stefan.brychnac@kaiser.local",
    role: "Ridic",
    depot: "ROP",
    status: "aktivni",
    phone: "",
    lastActive: "2026-06-18"
  }
];

const initialState = {
  tires: buildTiresFromServiceInvoices(importedInvoiceData.services || []),
  vehicles: kaiserFleetVehicles,
  services: importedInvoiceData.services || [],
  measurements: [],
  priceRefs: [],
  imports: importedInvoiceData.imports || [],
  vehicleImports: [],
  users: [
    {
      id: "USR-001",
      name: "Radim Oplustil",
      email: "oplustil@kaiserservis.cz",
      role: "Spravce vozoveho parku",
      depot: "Brno",
      status: "aktivni",
      phone: "",
      lastActive: "2026-06-18"
    },
    {
      id: "USR-004",
      name: "Milan Gaží",
      email: "milan.gazi@kaiserservis.cz",
      role: "Ridic",
      depot: "Kaiser Servis",
      status: "aktivni",
      phone: "",
      lastActive: "2026-06-20"
    },
    {
      id: "USR-005",
      name: "Tomáš Gaží",
      email: "tomas.gazi@kaiserservis.cz",
      role: "Ridic",
      depot: "Kaiser Servis",
      status: "aktivni",
      phone: "",
      lastActive: "2026-06-20"
    },
    {
      id: "USR-006",
      name: "Martin Koneček",
      email: "martin.konecek@kaiserservis.cz",
      role: "Ridic",
      depot: "Kaiser Servis",
      status: "aktivni",
      phone: "",
      lastActive: "2026-06-20"
    },
    ...kaiserDriverUsers
  ],
  settings: {
    companyName: "Kaiser Servis",
    primaryColor: "#75bd25",
    treadWarning: 4.5,
    pressureMin: 8.2,
    dotAgeLimit: 5,
    replacementDays: 30,
    publicDemoMode: false,
    workshopMobileMode: true
  }
};

const removedUserEmails = new Set(["dilna@kaiserservis.cz", "management@kaiserservis.cz"]);

let state = loadState();
saveState();
let activeSection = "dashboard";
let selectedVehicle = state.vehicles[0]?.spz || "";
let selectedPosition = "";
let importSamplePreviewOnly = false;

const titles = {
  dashboard: "Dashboard provozu",
  tires: "Evidence pneumatik",
  vehicles: "Vozidla a pozice",
  service: "Servisni zasahy",
  import: "Import faktur",
  reports: "Reporty a naklady",
  users: "Uzivatele a pristupy",
  settings: "Nastaveni aplikace"
};

const userRoles = [
  "Management",
  "Dilna",
  "Ridic",
  "Spravce vozoveho parku",
  "Externi servis"
];

const userPermissions = {
  Management: "Dashboard, reporty, ceny, exporty",
  Dilna: "Mereni, servisni karta, defekty",
  Ridic: "Vlastni vozidla, mereni a servisni poznamky",
  "Spravce vozoveho parku": "Kompletni evidence, importy, nastaveni",
  "Externi servis": "Servisni zakazky a vlastni zasahy"
};

const userRoleLabels = {
  Management: "Manager",
  Dilna: "Dilna",
  Ridic: "Ridic",
  "Spravce vozoveho parku": "Spravce",
  "Externi servis": "Externi servis"
};

function roleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeUserRole(value) {
  const key = roleKey(value);
  if (!key) return "Ridic";
  if (["manager", "management", "manazer"].includes(key)) return "Management";
  if (key === "spravce" || key.includes("spravce vozoveho parku")) return "Spravce vozoveho parku";
  if (key === "dilna") return "Dilna";
  if (key === "ridic") return "Ridic";
  if (key.includes("externi")) return "Externi servis";
  return String(value || "").trim();
}

function userRoleLabel(value) {
  const role = normalizeUserRole(value);
  return userRoleLabels[role] || role;
}

function availableUserRoles() {
  const roles = new Map();
  [...userRoles, ...(state.users || []).map((user) => user.role)].forEach((role) => {
    const normalized = normalizeUserRole(role);
    roles.set(normalized, userRoleLabel(normalized));
  });
  return [...roles.keys()];
}

function userMergeKey(user) {
  return String(user.email || user.id || user.name || "").trim().toLowerCase();
}

function isRemovedUserRecord(user) {
  return removedUserEmails.has(String(user.email || "").trim().toLowerCase());
}

function userNameMergeKey(user) {
  return String(user.name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function mergeDefaultUsers(existing = []) {
  const existingByName = new Map();
  const existingByKey = new Map();
  (existing || []).filter((user) => !isRemovedUserRecord(user)).forEach((user) => {
    const nameKey = userNameMergeKey(user);
    const key = userMergeKey(user);
    if (nameKey) existingByName.set(nameKey, true);
    if (key) existingByKey.set(key, true);
  });

  const users = new Map();
  (initialState.users || []).forEach((user) => {
    const key = userMergeKey(user);
    const nameKey = userNameMergeKey(user);
    if (nameKey && existingByName.has(nameKey) && !existingByKey.has(key)) return;
    if (key) users.set(key, structuredClone(user));
  });
  (existing || []).filter((user) => !isRemovedUserRecord(user)).forEach((user) => {
    const key = userMergeKey(user);
    if (!key) return;
    users.set(key, {
      ...(users.get(key) || {}),
      ...user,
      role: normalizeUserRole(user.role)
    });
  });
  return [...users.values()];
}

function userDisplayPriority(user) {
  const email = String(user.email || "").toLowerCase();
  if (email && !email.endsWith("@kaiser.local")) return 0;
  return 1;
}

function sortUsersForDisplay(users = []) {
  return [...users].sort((a, b) => {
    const priorityDiff = userDisplayPriority(a) - userDisplayPriority(b);
    if (priorityDiff) return priorityDiff;
    const roleDiff = userRoleLabel(a.role).localeCompare(userRoleLabel(b.role), "cs");
    if (roleDiff) return roleDiff;
    return String(a.name || "").localeCompare(String(b.name || ""), "cs");
  });
}

function userRecordPriority(user) {
  const id = String(user.id || "");
  const email = String(user.email || "").toLowerCase();
  if (/^USR-00[456]$/.test(id)) return 2;
  if (email.endsWith("@kaiser.local")) return 3;
  return 0;
}

function dedupeUsersForDisplay(users = []) {
  const byName = new Map();
  const withoutName = [];
  (users || []).filter((user) => !isRemovedUserRecord(user)).forEach((user) => {
    const nameKey = userNameMergeKey(user);
    if (!nameKey) {
      withoutName.push(user);
      return;
    }
    const current = byName.get(nameKey);
    if (!current || userRecordPriority(user) < userRecordPriority(current)) {
      byName.set(nameKey, user);
    }
  });
  return [...withoutName, ...byName.values()];
}

function userMatchesSearch(user, term) {
  if (!term) return true;
  const haystack = [
    user.name,
    user.email,
    userRoleLabel(user.role),
    user.depot,
    userPermissions[normalizeUserRole(user.role)],
    user.lastActive
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const needle = String(term || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return haystack.includes(needle);
}

const formatCurrency = (value) =>
  new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatNumber = (value, decimals = 0) =>
  new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value) || 0);

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return hydrateProductionData(structuredClone(initialState));
    const parsed = JSON.parse(stored);
    return hydrateProductionData({
      ...structuredClone(initialState),
      ...parsed,
      tires: parsed.tires || [],
      vehicles: parsed.vehicles || [],
      services: parsed.services || [],
      measurements: parsed.measurements || [],
      priceRefs: parsed.priceRefs || [],
      imports: parsed.imports || [],
      vehicleImports: parsed.vehicleImports || [],
      users: parsed.users || structuredClone(initialState.users),
      settings: {
        ...structuredClone(initialState.settings),
        ...(parsed.settings || {})
      }
    });
  } catch {
    return hydrateProductionData(structuredClone(initialState));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureHydratedState() {
  const before = {
    tires: state.tires?.length || 0,
    services: state.services?.length || 0,
    imports: state.imports?.length || 0
  };
  state = hydrateProductionData(state);
  const after = {
    tires: state.tires?.length || 0,
    services: state.services?.length || 0,
    imports: state.imports?.length || 0
  };
  if (before.tires !== after.tires || before.services !== after.services || before.imports !== after.imports) {
    saveState();
  }
}

function hydrateProductionData(nextState) {
  nextState.services = mergeImportedServices(nextState.services);
  nextState.imports = mergeImportedRows(nextState.imports);
  nextState.tires = mergeImportedTires(nextState.tires, nextState.services);
  nextState.users = mergeDefaultUsers(nextState.users);
  return nextState;
}

function mergeImportedServices(existing = []) {
  const imported = importedInvoiceData.services || [];
  if (!imported.length) return existing || [];
  const rows = new Map();
  imported.forEach((service) => rows.set(service.id || service.invoice, structuredClone(service)));
  (existing || []).forEach((service) => {
    const key = service.id || service.invoice;
    rows.set(key, { ...(rows.get(key) || {}), ...service });
  });
  return [...rows.values()];
}

function importRowKey(row) {
  return [row.date, row.invoice, row.item, row.qty, row.price, row.total, row.target].join("|");
}

function mergeImportedRows(existing = []) {
  const imported = importedInvoiceData.imports || [];
  if (!imported.length) return existing || [];
  const rows = new Map();
  imported.forEach((row) => rows.set(importRowKey(row), structuredClone(row)));
  (existing || []).forEach((row) => rows.set(importRowKey(row), { ...(rows.get(importRowKey(row)) || {}), ...row }));
  return [...rows.values()];
}

function mergeImportedTires(existing = [], services = []) {
  const generated = buildTiresFromServiceInvoices(services);
  if (!generated.length) return existing || [];

  const existingRows = existing || [];
  if (existingRows.some((tire) => tire.importedFromInvoice)) {
    const byId = new Map(existingRows.map((tire) => [tire.id, tire]));
    generated.forEach((tire) => {
      if (!byId.has(tire.id)) byId.set(tire.id, tire);
    });
    return [...byId.values()];
  }

  if (!existingRows.length) return generated;
  return [...existingRows, ...generated.filter((tire) => !existingRows.some((existingTire) => existingTire.id === tire.id))];
}

function buildTiresFromServiceInvoices(services = []) {
  const tires = [];
  (services || []).forEach((service, serviceIndex) => {
    const tireTypes = service.tireTypes || [];
    if (!tireTypes.length) return;
    const totalCount = tireTypes.reduce((sum, label) => sum + importedTireCount(label), 0);
    const unitPrice = (Number(service.tireCost) || 0) / Math.max(totalCount, 1);

    tireTypes.forEach((label, typeIndex) => {
      const count = importedTireCount(label);
      const cleanLabel = cleanImportedTireLabel(label);
      const size = extractTireSize(cleanLabel);
      const manufacturer = importedTireManufacturer(cleanLabel);
      const type = importedTireKind(cleanLabel);
      const model = importedTireModel(cleanLabel, manufacturer, size);

      for (let unitIndex = 0; unitIndex < count; unitIndex += 1) {
        tires.push({
          id: importedTireId(service, serviceIndex, typeIndex, unitIndex, size),
          manufacturer,
          model,
          size,
          index: importedTireIndex(cleanLabel),
          dot: "",
          type,
          priceEx: Math.round(unitPrice),
          supplier: service.supplier || "Pneuservis",
          purchaseDate: service.date || "",
          invoice: service.invoice || "",
          state: "sklad",
          vehicle: "",
          sourceVehicle: isKnownVehicle(service.vehicle) ? service.vehicle : "",
          sourcePerson: service.person || "",
          position: "",
          mounted: "",
          mountedOdo: 0,
          currentTread: importedTreadFor(type),
          pressure: 0,
          mileage: 0,
          defects: 0,
          importedFromInvoice: true,
          sourceServiceId: service.id || "",
          sourceLabel: cleanLabel
        });
      }
    });
  });
  return tires.sort((a, b) => String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || "")));
}

function importedTireCount(label) {
  const match = String(label || "").match(/^\s*(\d+)\s*x/i);
  return Math.max(1, Math.round(Number(match?.[1]) || 1));
}

function cleanImportedTireLabel(label) {
  return String(label || "")
    .replace(/^\s*\d+\s*x\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function importedTireManufacturer(label) {
  const text = String(label || "").toUpperCase();
  const knownBrands = [
    "HANKOOK",
    "PIRELLI",
    "SAILUN",
    "LAUFENN",
    "POINTS",
    "BRIDGESTONE",
    "CONTINENTAL",
    "TOURADOR",
    "ADVANCE",
    "GOODRIDE",
    "BARUM",
    "BKT"
  ];
  return knownBrands.find((brand) => text.includes(brand)) || "PNEU";
}

function importedTireKind(label) {
  const text = String(label || "").toLowerCase();
  if (/protektor|retread|obnova/.test(text)) return "protektor";
  if (/pouz|použ|jet[aáeé]/.test(text)) return "pouzita";
  return "nova";
}

function importedTreadFor(type) {
  if (type === "protektor") return 14;
  if (type === "pouzita") return 8;
  return 16;
}

function importedTireModel(label, manufacturer, size) {
  let model = cleanImportedTireLabel(label);
  model = model.replace(new RegExp(`^${manufacturer}\\s*`, "i"), "");
  model = removeLooseSize(model, size)
    .replace(/\b(TL|TT)\b/gi, "")
    .replace(/[;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return model || "bez modelu";
}

function removeLooseSize(value, size) {
  const source = String(value || "");
  const compactSize = String(size || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(",", "[,.]")
    .replace("/", "\\/?");
  if (!compactSize || compactSize === "NEZJISTENYROZMER") return source;
  return source.replace(new RegExp(compactSize, "i"), "");
}

function importedTireIndex(label) {
  const match = String(label || "").match(/\b\d{2,3}\/\d{2,3}[A-Z]\b|\b\d{2,3}[A-Z]\b/i);
  return match ? match[0] : "";
}

function importedTireId(service, serviceIndex, typeIndex, unitIndex, size) {
  const prefix = String(size || "PNE").match(/\d{2,3}/)?.[0] || "PNE";
  const source = String(service.id || service.invoice || `IMPORT${serviceIndex + 1}`)
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(-10);
  return `KS-${prefix}-${source}-${String(typeIndex + 1).padStart(2, "0")}${String(unitIndex + 1).padStart(2, "0")}`;
}

function query(selector, scope = document) {
  return scope.querySelector(selector);
}

function queryAll(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

function renderVersionInfo() {
  const target = query("#appVersionBadge");
  if (!target) return;
  target.innerHTML = `
    <span>Verze aplikace</span>
    <strong>${escapeHtml(APP_VERSION.number)}</strong>
    <small>${escapeHtml(APP_VERSION.name)} / build ${escapeHtml(APP_VERSION.build)}</small>
  `;
}

function renderLoginStatus(user = {}) {
  const target = query("#loginStatusBox");
  if (!target) return;
  const email = String(user.email || "oplustil@kaiserservis.cz").trim();
  const knownUser = state.users.find((item) => item.email === email);
  const name = user.name || knownUser?.name || "Radim Oplustil";
  target.classList.remove("is-logged-out", "is-syncing");
  target.innerHTML = `
    <span class="login-status-dot" aria-hidden="true"></span>
    <span>
      <strong data-login-status-title>Cloud prihlasen</strong>
      <small data-login-status-subtitle>${escapeHtml(name)}</small>
    </span>
  `;
  target.title = email;
  if (typeof window.kaiserApplyCloudHeaderStatus === "function") {
    window.kaiserApplyCloudHeaderStatus();
  }
}

window.kaiserSetLoginUser = renderLoginStatus;

function showToast(message) {
  const toast = query("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function currentSettings() {
  state.settings = {
    ...structuredClone(initialState.settings),
    ...(state.settings || {})
  };
  return state.settings;
}

function applySettings() {
  const settings = currentSettings();
  const color = settings.primaryColor || initialState.settings.primaryColor;
  document.documentElement.style.setProperty("--brand", color);
  document.documentElement.style.setProperty("--green", color);
}

function setSection(section) {
  activeSection = section;
  queryAll(".section").forEach((el) => el.classList.toggle("is-active", el.id === section));
  queryAll(".nav-item").forEach((el) =>
    el.classList.toggle("is-active", el.dataset.section === section)
  );
  query("#pageTitle").textContent = titles[section] || "Evidence pneumatik";
  if (section === "vehicles") renderVehicles();
  if (section === "reports") renderReports();
  if (section === "users") renderUsers();
  if (section === "settings") renderSettings();
}

function getSearchTerm() {
  return query("#globalSearch").value.trim().toLowerCase();
}

function matchesSearch(tire, term) {
  if (!term) return true;
  return [tire.id, tire.manufacturer, tire.model, tire.size, tire.supplier, tire.vehicle, tire.sourceVehicle, tire.invoice, tire.sourceLabel]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function tireCostPerKm(tire) {
  if (!tire.mileage) return 0;
  return tire.priceEx / tire.mileage;
}

function serviceTotal(service) {
  return (Number(service.labor) || 0) + (Number(service.material) || 0) + (Number(service.tireCost) || 0);
}

function rowTotal(row) {
  return Number(row.total ?? ((Number(row.qty) || 0) * (Number(row.price) || 0))) || 0;
}

function latestServicePeriod() {
  const latestDate =
    state.services
      .map((service) => service.date)
      .filter(Boolean)
      .sort()
      .at(-1) || todayIso();
  return {
    date: latestDate,
    month: latestDate.slice(0, 7),
    year: latestDate.slice(0, 4)
  };
}

function formatMonthLabel(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  if (!year || !monthNumber) return "posledni importovany mesic";
  return new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1)
  );
}

function serviceCostForPrefix(prefix) {
  return state.services
    .filter((service) => !prefix || service.date?.startsWith(prefix))
    .reduce((sum, service) => sum + serviceTotal(service), 0);
}

function servicesForPrefix(prefix) {
  return state.services.filter((service) => !prefix || service.date?.startsWith(prefix));
}

function invoiceCount() {
  return (
    importedInvoiceData.summary?.invoiceCount ||
    new Set(state.imports.map((row) => row.invoice).filter(Boolean)).size ||
    new Set(state.services.map((service) => service.invoice).filter(Boolean)).size
  );
}

function isKnownVehicle(value) {
  return Boolean(value && value !== "nezjisteno" && value !== "bez SPZ");
}

function isTireImportRow(row) {
  const text = `${row.category || ""} ${row.item || ""}`.toLowerCase();
  return /(pneumatika|pneu|protektor|hankook|pirelli|sailun|laufenn|points|bridgestone|continental|tourador|advance|goodride|barum|bkt|\d{2,3}\s*\/?\s*\d{0,2}\s*r\d{2})/i.test(text);
}

function extractTireSize(value) {
  const text = String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const match =
    text.match(/\d{3}\/\d{2}R\d{2}(?:[.,]5|[.,]50)?/) ||
    text.match(/\d{2}R\d{2}(?:[.,]5|[.,]50)?/) ||
    text.match(/\d{3}\/\d{2}R\d{2}/) ||
    text.match(/\d{1,2}[.,]\d{2}-\d{2}/);
  if (!match) return "nezjisteny rozmer";
  return match[0]
    .replace(".", ",")
    .replace(/^(\d{3})\/(\d{2})R/, "$1/$2 R")
    .replace(/^(\d{2})R/, "$1 R")
    .replace(/,50$/, ",5");
}

function tireImportRows() {
  return state.imports
    .filter(isTireImportRow)
    .map((row) => {
      const total = rowTotal(row);
      const qty = Number(row.qty) || 1;
      return {
        ...row,
        total,
        qty,
        unitPrice: total / Math.max(qty, 1),
        size: extractTireSize(row.item)
      };
    })
    .filter((row) => row.total > 0);
}

function tireStatus(tire) {
  if (tire.state === "vyrazeno") return "danger";
  if (tire.state === "na vozidle") return tire.currentTread < 4.5 ? "danger" : "on";
  if (tire.state === "oprava") return "warn";
  return "";
}

function dotYear(dot) {
  const text = String(dot || "");
  if (text.length < 4) return null;
  const year = Number(text.slice(-2));
  return Number.isFinite(year) ? 2000 + year : null;
}

function getAlerts() {
  const alerts = [];
  const settings = currentSettings();
  const summary = importedInvoiceData.summary || {};
  const unmatchedInvoiceCount =
    summary.unmatchedInvoiceCount ||
    new Set(
      state.services
        .filter((service) => !isKnownVehicle(service.vehicle))
        .map((service) => service.invoice || service.id)
    ).size;

  if (unmatchedInvoiceCount > 0) {
    alerts.push({
      level: "warning",
      title: "Faktury bez SPZ",
      body: `${unmatchedInvoiceCount} dokladu potrebuje rucne doplnit vozidlo, aby sedely naklady podle SPZ.`
    });
  }

  if (state.tires.length === 0) {
    alerts.push({
      level: "warning",
      title: "Kusova evidence pneu",
      body: "Sklad a osazeni pneu zatim nejsou importovane. Dashboard ted pocita z vozidel a skutecnych faktur."
    });
  }

  state.tires.forEach((tire) => {
    if (tire.state === "na vozidle" && tire.currentTread < settings.treadWarning) {
      alerts.push({
        level: "danger",
        title: `${tire.vehicle} / ${tire.position}`,
        body: `${tire.id} ma dezen ${formatNumber(tire.currentTread, 1)} mm. Pripravit vymenu.`
      });
    }

    if (tire.state === "na vozidle" && tire.pressure > 0 && tire.pressure < settings.pressureMin) {
      alerts.push({
        level: "warning",
        title: `${tire.vehicle} / ${tire.position}`,
        body: `Tlak ${formatNumber(tire.pressure, 1)} bar je pod internim limitem. Zkontrolovat dvojmontaz.`
      });
    }

    const year = dotYear(tire.dot);
    if (year && new Date().getFullYear() - year >= settings.dotAgeLimit && tire.state !== "vyrazeno") {
      alerts.push({
        level: "warning",
        title: `${tire.id} / DOT ${tire.dot}`,
        body: "Pneu je podle DOT starsi nez limit pro kontrolu."
      });
    }

    if (tire.defects >= 2 && tire.state !== "vyrazeno") {
      alerts.push({
        level: "warning",
        title: `${tire.vehicle || "sklad"} / opakovane defekty`,
        body: `${tire.id} ma ${tire.defects} defekty. Proverit trasu, ridice nebo typ pneu.`
      });
    }
  });

  return alerts.slice(0, 8);
}

function calculateKpis() {
  const period = latestServicePeriod();
  const serviceMonth = serviceCostForPrefix(period.month);
  const yearServices = servicesForPrefix(period.year);
  const ytd = serviceCostForPrefix(period.year);
  const vehiclesWithCost = new Set(
    yearServices
      .map((service) => service.vehicle)
      .filter(isKnownVehicle)
  ).size;
  const importedRows = state.imports.length || importedInvoiceData.summary?.importRowCount || 0;
  const unmatched = importedInvoiceData.summary?.unmatchedInvoiceCount || 0;
  const avgVehicleCost = ytd / Math.max(state.vehicles.length, 1);
  const mountedTires = state.tires.filter((tire) => tire.state === "na vozidle" && tire.vehicle).length;
  const vehiclesWithMountedTires = new Set(
    state.tires
      .filter((tire) => tire.state === "na vozidle" && tire.vehicle)
      .map((tire) => tire.vehicle)
  ).size;

  return [
    { label: "Naklad posledni mesic", value: formatCurrency(serviceMonth), hint: formatMonthLabel(period.month) },
    { label: "Naklad YTD", value: formatCurrency(ytd), hint: `${yearServices.length} servisnich karet v roce ${period.year}` },
    { label: "Vozidla v evidenci", value: `${state.vehicles.length} ks`, hint: `${vehiclesWithCost} vozidel s nakladem v importu` },
    { label: "Koupené pneu", value: `${mountedTires} ks`, hint: `${vehiclesWithMountedTires} vozidel s osazenim` },
    { label: "Faktury import", value: `${invoiceCount()} ks`, hint: `${importedRows} radku, ${unmatched} bez SPZ` },
    { label: "Prumer / vozidlo YTD", value: formatCurrency(avgVehicleCost), hint: "naklad z faktur / vozovy park" }
  ];
}

function renderKpis() {
  query("#kpiGrid").innerHTML = calculateKpis()
    .map(
      (kpi) => `
        <article class="kpi-card">
          <span>${kpi.label}</span>
          <strong>${kpi.value}</strong>
          <small>${kpi.hint}</small>
        </article>
      `
    )
    .join("");
}

function renderAlerts() {
  const alerts = getAlerts();
  query("#alertCount").textContent = `${alerts.length} aktivnich`;
  query("#alertList").innerHTML =
    alerts
      .map(
        (alert) => `
          <div class="alert-item ${alert.level === "danger" ? "danger" : ""}">
            <span class="alert-marker" aria-hidden="true"></span>
            <div>
              <strong>${alert.title}</strong>
              <p>${alert.body}</p>
            </div>
            <span class="badge ${alert.level === "danger" ? "badge-danger" : "badge-warning"}">
              ${alert.level === "danger" ? "urgentni" : "kontrola"}
            </span>
          </div>
        `
      )
      .join("") || `<p class="meta">Bez aktivnich upozorneni.</p>`;
}

function vehicleCosts(options = {}) {
  const period = latestServicePeriod();
  const prefix = options.prefix ?? period.year;
  const vehicleMap = new Map(state.vehicles.map((vehicle) => [vehicle.spz, vehicle]));
  const totals = state.services
    .filter((service) => !prefix || service.date?.startsWith(prefix))
    .reduce((acc, service) => {
      const key = service.vehicle || "nezjisteno";
      if (!acc[key]) {
        const vehicle = vehicleMap.get(key);
        acc[key] = {
          label: key,
          driver: vehicle?.driver || service.person || "nezjisteno",
          value: 0
        };
      }
      acc[key].value += serviceTotal(service);
      return acc;
    }, {});

  if (options.includeFleetZeros) {
    state.vehicles.forEach((vehicle) => {
      if (!totals[vehicle.spz]) {
        totals[vehicle.spz] = {
          label: vehicle.spz,
          driver: vehicle.driver,
          value: Number(vehicle.monthlyCost) || 0
        };
      }
    });
  }

  return Object.values(totals).sort((a, b) => b.value - a.value);
}

function driverDefects() {
  const period = latestServicePeriod();
  const vehicleMap = new Map(state.vehicles.map((vehicle) => [vehicle.spz, vehicle]));
  const repairs = state.services
    .filter((service) => service.date?.startsWith(period.year) && ["oprava", "defekt"].includes(service.type));

  return Object.values(
    repairs.reduce((acc, service) => {
      const vehicle = vehicleMap.get(service.vehicle);
      const label = service.person || vehicle?.driver || "nezjisteno";
      if (!acc[label]) acc[label] = { label, value: 0 };
      acc[label].value += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);
}

function sizeCosts() {
  const importedRows = tireImportRows();
  if (importedRows.length) {
    return Object.values(
      importedRows.reduce((acc, row) => {
        if (!acc[row.size]) acc[row.size] = { label: row.size, value: 0, count: 0 };
        acc[row.size].value += row.total;
        acc[row.size].count += row.qty;
        return acc;
      }, {})
    ).sort((a, b) => b.value - a.value);
  }

  return Object.values(
    state.tires.reduce((acc, tire) => {
      if (!acc[tire.size]) acc[tire.size] = { label: tire.size, value: 0, count: 0 };
      acc[tire.size].value += tire.priceEx;
      acc[tire.size].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);
}

function priceReferenceRows() {
  const importedRows = tireImportRows();
  if (!importedRows.length) return [];

  return Object.values(
    importedRows.reduce((acc, row) => {
      if (!acc[row.size]) {
        acc[row.size] = {
          size: row.size,
          totalUnitPrice: 0,
          unitCount: 0,
          last: 0,
          reference: 0,
          supplier: row.supplier || "-",
          lastDate: ""
        };
      }
      acc[row.size].totalUnitPrice += row.unitPrice * row.qty;
      acc[row.size].unitCount += row.qty;
      if (!acc[row.size].lastDate || String(row.date || "").localeCompare(acc[row.size].lastDate) >= 0) {
        acc[row.size].lastDate = row.date || "";
        acc[row.size].last = row.unitPrice;
        acc[row.size].supplier = row.supplier || "-";
      }
      return acc;
    }, {})
  )
    .map((item) => ({
      ...item,
      reference: item.totalUnitPrice / Math.max(item.unitCount, 1)
    }))
    .sort((a, b) => b.last - a.last);
}

function potentialSavings() {
  const refs = state.priceRefs.length ? state.priceRefs : priceReferenceRows();
  return refs.reduce((sum, item) => sum + Math.max(item.last - item.reference, 0), 0);
}

function previewRows(data, formatter = formatCurrency) {
  if (!data.length) return `<p class="meta">Zatim nejsou data k vykresleni.</p>`;
  const max = Math.max(...data.map((item) => item.value), 1);
  return data
    .map(
      (item) => `
        <div class="preview-mini-row">
          <div>
            <strong>${item.label}</strong>
            <span>${formatter(item.value)}</span>
          </div>
          <span class="preview-mini-track" aria-hidden="true">
            <span class="preview-mini-fill" style="width: ${Math.max((item.value / max) * 100, 8)}%"></span>
          </span>
        </div>
      `
    )
    .join("");
}

function renderLiveDashboard() {
  const target = query("#liveDashboard");
  if (!target) return;

  const kpis = calculateKpis();
  const period = latestServicePeriod();
  const avgVehicleCost = serviceCostForPrefix(period.year) / Math.max(state.vehicles.length, 1);
  const needleRotation = Math.min(Math.max(-62 + (avgVehicleCost / 20000) * 120, -62), 58);
  const topSizes = sizeCosts().slice(0, 3);
  const totalSizeCost = topSizes.reduce((sum, item) => sum + item.value, 0) || 1;
  const firstSlice = Math.round((topSizes[0]?.value || 0) / totalSizeCost * 100);
  const secondSlice = Math.round(((topSizes[0]?.value || 0) + (topSizes[1]?.value || 0)) / totalSizeCost * 100);

  target.innerHTML = `
    <div class="preview-main">
      <div class="preview-title">Aktivni Kaiser dashboard</div>
      <button class="preview-gauge-card" type="button" data-section-jump="reports">
        <span class="preview-gauge" style="--needle-rotation: ${needleRotation}deg"><span></span></span>
        <span class="preview-gauge-value">
          <strong>${kpis[4].value}</strong>
          <span>${kpis[4].label}</span>
        </span>
      </button>
      ${kpis
        .map(
          (kpi, index) => `
            <div class="preview-row">
              <span class="preview-icon ${["circle", "wheel", "stack", "calendar", "chart"][index]}"></span>
              <strong>${kpi.label}</strong>
              <b>${kpi.value}</b>
            </div>
          `
        )
        .join("")}
    </div>

    <button class="preview-tile" type="button" data-section-jump="reports">
      <div class="preview-title">top SPZ podle nakladu</div>
      <div class="preview-list">${previewRows(vehicleCosts().slice(0, 4))}</div>
    </button>

    <button class="preview-tile" type="button" data-section-jump="reports">
      <div class="preview-title">ridici podle oprav</div>
      <div class="preview-list">${previewRows(driverDefects().slice(0, 4), (value) => `${value}x`)}</div>
    </button>

    <button class="preview-tile preview-chart" type="button" data-section-jump="reports" style="--slice-one: ${firstSlice}%; --slice-two: ${secondSlice}%">
      <div class="preview-title">rozmery podle faktur</div>
      <span aria-hidden="true"></span>
      <strong>${topSizes[0]?.label || "-"}<small>${formatCurrency(topSizes[0]?.value || 0)}</small></strong>
    </button>

    <button class="preview-tile preview-savings" type="button" data-section-jump="reports">
      <div class="preview-title">uspora proti referenci</div>
      <span aria-hidden="true"></span>
      <strong>${formatCurrency(potentialSavings())}<small>k provereni</small></strong>
    </button>
  `;
}

function renderBarList(target, data, formatter = formatCurrency) {
  if (!data.length) {
    target.innerHTML = `<p class="meta">Zatim nejsou data k vykresleni.</p>`;
    return;
  }
  const max = Math.max(...data.map((item) => item.value), 1);
  target.innerHTML = data
    .map(
      (item) => `
        <div class="bar-row">
          <div class="bar-row-header">
            <strong>${item.label}</strong>
            <span>${formatter(item.value)}</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${Math.max((item.value / max) * 100, 5)}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderTires() {
  const term = getSearchTerm();
  const stateFilter = query("#tireStateFilter")?.value || "all";
  const tires = state.tires.filter(
    (tire) => matchesSearch(tire, term) && (stateFilter === "all" || tire.state === stateFilter)
  );

  query("#tireTableBody").innerHTML =
    tires
      .map(
        (tire) => {
          const vehicleLabel = tire.vehicle || "sklad";
          const positionLabel = tire.position || (tire.sourceVehicle ? `z faktury pro ${tire.sourceVehicle}` : "bez pozice");
          return `
          <tr>
            <td>
              <div class="tire-id">${tire.id}</div>
              <div class="meta">DOT ${tire.dot} / ${tire.type}</div>
            </td>
            <td>
              <strong>${tire.manufacturer} ${tire.model}</strong>
              <div class="meta">${tire.index || "bez indexu"} / faktura ${tire.invoice || "-"}</div>
            </td>
            <td>${tire.size}</td>
            <td><span class="state-pill ${tireStatus(tire)}">${tire.state}</span></td>
            <td>
              <strong>${vehicleLabel}</strong>
              <div class="meta">${positionLabel}</div>
            </td>
            <td>
              <strong>${formatNumber(tire.currentTread, 1)} mm</strong>
              <div class="meta">${tire.pressure ? `${formatNumber(tire.pressure, 1)} bar` : "tlak nezadan"}</div>
            </td>
            <td>${tire.mileage ? `${formatNumber(tireCostPerKm(tire), 2)} Kc` : "-"}</td>
            <td>
              ${tire.supplier}
              <div class="meta">${formatCurrency(tire.priceEx)}</div>
            </td>
          </tr>
        `;
        }
      )
      .join("") || `<tr><td colspan="8">Zadna pneumatika neodpovida filtru.</td></tr>`;
}

function fillSelectOptions() {
  const vehicleOptions = state.vehicles
    .map((vehicle) => `<option value="${vehicle.spz}">${vehicle.spz} - ${vehicle.driver}</option>`)
    .join("");

  queryAll('select[name="vehicle"]').forEach((select) => {
    const current = select.value;
    select.innerHTML = vehicleOptions;
    select.value = current || state.vehicles[0]?.spz || "";
  });

  const vehicleSelect = query("#vehicleSelect");
  vehicleSelect.innerHTML = state.vehicles
    .map((vehicle) => `<option value="${vehicle.spz}">${vehicle.spz} - ${vehicle.type}</option>`)
    .join("");
  vehicleSelect.value = selectedVehicle;

  fillPositionOptions(query('#measurementForm select[name="vehicle"]').value);
  syncMeasurementOdometer(query('#measurementForm select[name="vehicle"]').value);
}

function fillPositionOptions(spz) {
  const vehicle = state.vehicles.find((item) => item.spz === spz) || state.vehicles[0];
  const select = query('#measurementForm select[name="position"]');
  select.innerHTML = (vehicle?.configuration || [])
    .map((position) => `<option value="${position}">${position}</option>`)
    .join("");
}

function syncMeasurementOdometer(spz) {
  const input = query('#measurementForm input[name="odometer"]');
  if (!input) return;
  const vehicle = state.vehicles.find((item) => item.spz === spz);
  input.value = vehicle?.odometer ? Math.round(vehicle.odometer) : "";
}

function renderDashboard() {
  renderLiveDashboard();
  renderKpis();
  renderAlerts();
  renderBarList(query("#vehicleCostBars"), vehicleCosts().slice(0, 5));
}

function tireForPosition(spz, position) {
  return state.tires.find((tire) => tire.vehicle === spz && tire.position === position);
}

function vehicleTireEvidence(spz) {
  const rows = new Map();
  (state.tires || []).forEach((tire) => {
    const belongsToInvoiceVehicle = tire.sourceVehicle === spz;
    const manuallyCreatedOnVehicle = !tire.sourceVehicle && tire.vehicle === spz;
    if (belongsToInvoiceVehicle || manuallyCreatedOnVehicle) rows.set(tire.id, tire);
  });
  return [...rows.values()].sort((a, b) => {
    const dateDiff = String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || ""));
    if (dateDiff) return dateDiff;
    return String(a.id || "").localeCompare(String(b.id || ""), "cs");
  });
}

function groupVehicleTireEvidence(spz) {
  const groups = new Map();
  vehicleTireEvidence(spz).forEach((tire) => {
    const isPositioned = tire.vehicle === spz && tire.position;
    const status = isPositioned ? `pozice ${tire.position}` : "z faktury pro vozidlo";
    const key = [
      tire.invoice || "",
      tire.sourceLabel || "",
      tire.manufacturer || "",
      tire.model || "",
      tire.size || "",
      status
    ].join("|");
    const existing = groups.get(key) || {
      count: 0,
      manufacturer: tire.manufacturer || "",
      model: tire.model || "",
      size: tire.size || "",
      invoice: tire.invoice || "",
      purchaseDate: tire.purchaseDate || "",
      status,
      treadTotal: 0
    };
    existing.count += 1;
    existing.treadTotal += Number(tire.currentTread) || 0;
    if (!existing.purchaseDate && tire.purchaseDate) existing.purchaseDate = tire.purchaseDate;
    groups.set(key, existing);
  });
  return [...groups.values()];
}

function renderVehicleTireEvidence(spz) {
  const groups = groupVehicleTireEvidence(spz);
  const total = groups.reduce((sum, item) => sum + item.count, 0);
  if (!total) {
    return `
      <div class="vehicle-tire-evidence">
        <div class="vehicle-tire-evidence-head">
          <div>
            <p class="eyebrow">Koupené pneu</p>
            <strong>Bez pneumatik v evidenci</strong>
          </div>
          <span class="badge badge-warning">0 ks</span>
        </div>
        <p class="meta">Pro tuto SPZ zatim neni v evidenci zadna pneumatika ani faktura s pneu.</p>
      </div>
    `;
  }

  return `
    <div class="vehicle-tire-evidence">
      <div class="vehicle-tire-evidence-head">
        <div>
          <p class="eyebrow">Koupené pneu</p>
          <strong>${total} ks v evidenci vozidla</strong>
        </div>
        <span class="badge badge-ok">${total} ks</span>
      </div>
      <div class="vehicle-tire-evidence-list">
        ${groups
          .map((item) => {
            const title = `${item.count} ks ${item.manufacturer} ${item.model}`.trim();
            const tread = item.treadTotal ? ` / dezen ${formatNumber(item.treadTotal / item.count, 1)} mm` : "";
            return `
              <div class="vehicle-tire-evidence-row">
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(item.size || "rozmer nezjisten")}${tread}</span>
                <p>${escapeHtml(item.invoice ? `FA ${item.invoice}` : "bez FA")} / ${escapeHtml(item.purchaseDate || "-")} / ${escapeHtml(item.status)}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderVehicles() {
  const vehicle = state.vehicles.find((item) => item.spz === selectedVehicle) || state.vehicles[0];
  if (!vehicle) return;
  selectedVehicle = vehicle.spz;
  query("#vehicleSelect").value = selectedVehicle;

  const vehicleTires = state.tires.filter((tire) => tire.vehicle === vehicle.spz);
  const vehicleEvidenceTires = vehicleTireEvidence(vehicle.spz);
  const avgTread =
    vehicleTires.reduce((sum, tire) => sum + tire.currentTread, 0) / Math.max(vehicleTires.length, 1);
  const vehicleServiceCost = state.services
    .filter((item) => item.vehicle === vehicle.spz)
    .reduce((sum, item) => sum + item.labor + item.material + item.tireCost, 0);
  const recommendation = vehicleTires.length
    ? avgTread < 5
      ? "Zaridit planovanou vymenu pro nejvice sjete pozice."
      : "Pokracovat v tydenni kontrole tlaku a dezenu."
    : vehicleEvidenceTires.length
      ? "Pneu jsou v evidenci z faktur. Doplnte jejich presne pozice na mape vozidla."
      : "Pro vozidlo zatim nejsou v evidenci zadne pneumatiky.";

  query("#vehicleDetail").innerHTML = `
    <div>
      <p class="eyebrow">${vehicle.depot}</p>
      <h2>${vehicle.spz}</h2>
      <p class="meta">${vehicle.type} / ridic ${vehicle.driver}</p>
    </div>
    <div class="vehicle-metric-grid">
      <div class="vehicle-metric"><span>Tachometr</span><strong>${formatNumber(vehicle.odometer)} km</strong></div>
      <div class="vehicle-metric"><span>Osazene pozice</span><strong>${vehicleTires.length}/${vehicle.configuration.length}</strong></div>
      <div class="vehicle-metric"><span>Koupené pneu</span><strong>${vehicleEvidenceTires.length} ks</strong></div>
      <div class="vehicle-metric"><span>Prumerny dezen</span><strong>${formatNumber(avgTread, 1)} mm</strong></div>
      <div class="vehicle-metric"><span>Naklady servis</span><strong>${formatCurrency(vehicleServiceCost)}</strong></div>
    </div>
    ${renderVehicleTireEvidence(vehicle.spz)}
    <div class="alert-item">
      <span class="alert-marker" aria-hidden="true"></span>
      <div>
        <strong>Doporuceni</strong>
        <p>${recommendation}</p>
      </div>
    </div>
  `;

  renderVehicleMap(vehicle);
}

function getPositionSide(position, index) {
  if (/^\d+\s*P/i.test(position) || /^SP/i.test(position)) return "right";
  if (/^\d+\s*L/i.test(position) || /^SL/i.test(position)) return "left";
  if (/^(P|HP|VP|ZP)/.test(position)) return "right";
  if (/^(L|HL|VL|ZL)/.test(position)) return "left";
  return index % 2 === 0 ? "left" : "right";
}

function getPositionRow(position, index, configuration) {
  const numericAxle = String(position).match(/^(\d+)/);
  if (numericAxle) return Math.max(0, Number(numericAxle[1]) - 1);
  if (/^S[LP]/i.test(position)) return 1;

  const hasExplicitSecondAxle = configuration.some((item) => /^([2-9]|S[LP])/i.test(item));
  const hasDriveAxle = configuration.some((item) => /^H/i.test(item));
  const hasMiddleAxle = configuration.some((item) => /^V/i.test(item));

  if (position === "L" || position === "P") return 0;
  if (/^H/i.test(position)) return hasExplicitSecondAxle ? 2 : 1;
  if (/^V/i.test(position)) {
    if (hasDriveAxle) return hasExplicitSecondAxle ? 3 : 2;
    return 1;
  }
  if (/^Z/i.test(position)) {
    if (hasDriveAxle && hasMiddleAxle) return hasExplicitSecondAxle ? 4 : 3;
    if (hasMiddleAxle) return 2;
    if (hasDriveAxle) return hasExplicitSecondAxle ? 3 : 2;
    return 1;
  }
  return Math.floor(index / 2);
}

function getPositionCoordinates(position, index, configuration) {
  const row = getPositionRow(position, index, configuration);
  const side = getPositionSide(position, index);
  const isInner = position.includes("vnitrni");
  const isOuter = position.includes("vnejsi");
  const rowCount = Math.max(2, ...configuration.map((item, itemIndex) => getPositionRow(item, itemIndex, configuration))) + 1;
  const spacing = rowCount > 4 ? 86 : rowCount > 3 ? 94 : 112;
  const top = 118 + row * spacing;

  let left = side === "left" ? "13%" : "calc(87% - var(--wheel-width))";
  if (side === "left" && isInner) left = "22%";
  if (side === "left" && isOuter) left = "8%";
  if (side === "right" && isInner) left = "calc(78% - var(--wheel-width))";
  if (side === "right" && isOuter) left = "calc(92% - var(--wheel-width))";

  return { left, top, row, side, isInner, isOuter };
}

function renderVehicleMap(vehicle) {
  const settings = currentSettings();
  const map = query("#vehicleMap");
  const rowCount = Math.max(
    2,
    ...vehicle.configuration.map((item, itemIndex) => getPositionRow(item, itemIndex, vehicle.configuration))
  ) + 1;
  const spacing = rowCount > 4 ? 86 : rowCount > 3 ? 94 : 112;
  const mapHeight = Math.max(540, 118 + (rowCount - 1) * spacing + 110);
  map.style.setProperty("--map-min-height", `${mapHeight}px`);

  const placements = vehicle.configuration.map((position, index) => ({
    position,
    ...getPositionCoordinates(position, index, vehicle.configuration)
  }));
  const rowTops = [...new Set(placements.map((placement) => placement.top))].sort((a, b) => a - b);
  const axleLines = rowTops
    .map((top, index) => `<div class="axle" style="top: ${top + 42}px"><span>Naprava ${index + 1}</span></div>`)
    .join("");

  const positions = placements
    .map(({ position, top, left, side, isInner, isOuter }) => {
      const tire = tireForPosition(vehicle.spz, position);
      const status = tire
        ? tire.currentTread < settings.treadWarning
          ? "low"
          : tire.currentTread < settings.treadWarning + 1
            ? "warn"
            : ""
        : "empty";
      return `
        <button
          class="position-button ${status} side-${side} ${isInner ? "inner-wheel" : ""} ${isOuter ? "outer-wheel" : ""}"
          type="button"
          style="left: ${left}; top: ${top}px"
          data-position="${position}"
          data-side="${side}"
          aria-label="${position} ${tire ? tire.id : "bez pneu"}"
        >
          <span>${shortPosition(position)}</span>
        </button>
      `;
    })
    .join("");

  map.innerHTML = `
    <div class="truck-sketch plan-view" aria-hidden="true">
      <div class="plan-direction">predni cast</div>
      <div class="vehicle-cabin">
        <i></i>
        <span>kabina</span>
      </div>
      <div class="vehicle-body">
        <span>${vehicle.configuration.length <= 4 ? "dodavka / servis" : "ram / nastavba"}</span>
      </div>
      <div class="truck-frame"></div>
      <div class="truck-bumper"></div>
      <div class="plan-rear-label">zadni cast</div>
    </div>
    ${axleLines}
    ${positions}
  `;

  queryAll(".position-button", map).forEach((button) => {
    button.addEventListener("click", () => {
      selectedPosition = button.dataset.position;
      renderPositionDetail(vehicle.spz, selectedPosition);
    });
  });

  if (!vehicle.configuration.includes(selectedPosition)) {
    selectedPosition = vehicle.configuration[0];
  }
  renderPositionDetail(vehicle.spz, selectedPosition);
}

function shortPosition(position) {
  const normalized = position
    .replace("vnitrni", "V")
    .replace("vnejsi", "X");
  const [main, variant] = normalized.split(/\s+/);
  if (/^\d+[LP]$/i.test(main)) return `${main}${variant || ""}`.toUpperCase().slice(0, 4);
  return `${main || ""}${variant || ""}`
    .replace(/[^0-9A-Z]/gi, "")
    .slice(0, 3)
    .toUpperCase();
}

function renderPositionDetail(spz, position) {
  const tire = tireForPosition(spz, position);
  query("#positionDetail").innerHTML = tire
    ? `
      <strong>${position}: ${tire.id}</strong>
      <p class="meta">${tire.manufacturer} ${tire.model}, ${tire.size}</p>
      <dl>
        <div><dt>Montaz od</dt><dd>${tire.mounted || "-"}</dd></div>
        <div><dt>Najezd pozice</dt><dd>${formatNumber(tire.mileage)} km</dd></div>
        <div><dt>Dezen</dt><dd>${formatNumber(tire.currentTread, 1)} mm</dd></div>
        <div><dt>Tlak</dt><dd>${tire.pressure ? `${formatNumber(tire.pressure, 1)} bar` : "-"}</dd></div>
      </dl>
    `
    : `
      <strong>${position}: pozice bez pneu</strong>
      <p class="meta">Vyberte pneu ze skladu nebo zalozte novou montaz.</p>
    `;
}

function renderServices() {
  query("#serviceList").innerHTML = state.services
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((service) => {
      const total = service.labor + service.material + service.tireCost;
      return `
        <div class="service-item">
          <div>
            <strong>${service.date} / ${service.vehicle} / ${service.type}</strong>
            <p>${service.person}, ${service.supplier}. Prace ${formatCurrency(service.labor)}, material ${formatCurrency(service.material)}, pneu ${formatCurrency(service.tireCost)}.</p>
            <p>${service.note || ""}</p>
          </div>
          <span class="service-total">${formatCurrency(total)}</span>
        </div>
      `;
    })
    .join("");
}

function renderReports() {
  renderBarList(query("#brandCostBars"), sizeCosts().slice(0, 8), formatCurrency);

  const suppliers = Object.values(
    state.services.reduce((acc, service) => {
      if (!acc[service.supplier]) {
        acc[service.supplier] = { supplier: service.supplier, labor: 0, material: 0, tireCost: 0 };
      }
      acc[service.supplier].labor += Number(service.labor) || 0;
      acc[service.supplier].material += Number(service.material) || 0;
      acc[service.supplier].tireCost += Number(service.tireCost) || 0;
      return acc;
    }, {})
  ).sort((a, b) => (b.labor + b.material + b.tireCost) - (a.labor + a.material + a.tireCost));

  query("#supplierCards").innerHTML = suppliers
    .map(
      (item) => `
        <div class="supplier-card">
          <strong>${item.supplier}</strong>
          <p>Prace ${formatCurrency(item.labor)}</p>
          <p>Material ${formatCurrency(item.material)}</p>
          <p>Pneu ${formatCurrency(item.tireCost)}</p>
        </div>
      `
    )
    .join("") || `<p class="meta">Zatim nejsou importovane zadne servisni naklady.</p>`;

  const priceRows = state.priceRefs.length ? state.priceRefs : priceReferenceRows();
  query("#priceTableBody").innerHTML = priceRows
    .map((item) => {
      const diff = item.last - item.reference;
      const isHigh = diff > 0;
      return `
        <tr>
          <td>${item.size}</td>
          <td>${formatCurrency(item.last)}<div class="meta">${item.supplier}</div></td>
          <td>${formatCurrency(item.reference)}</td>
          <td><span class="badge ${isHigh ? "badge-danger" : "badge-ok"}">${isHigh ? "+" : ""}${formatCurrency(diff)}</span></td>
          <td>${isHigh ? "vyzadat porovnani" : "cena v poradku"}</td>
        </tr>
      `;
    })
    .join("") || `<tr><td colspan="5">Zatim nejsou data pro porovnani cen.</td></tr>`;
}

function renderSettings() {
  const settings = currentSettings();
  const form = query("#settingsForm");
  if (form) {
    form.elements.companyName.value = settings.companyName;
    form.elements.primaryColor.value = settings.primaryColor;
    form.elements.treadWarning.value = settings.treadWarning;
    form.elements.pressureMin.value = settings.pressureMin;
    form.elements.dotAgeLimit.value = settings.dotAgeLimit;
    form.elements.replacementDays.value = settings.replacementDays;
    if (form.elements.publicDemoMode) {
      form.elements.publicDemoMode.checked = Boolean(settings.publicDemoMode);
    }
    form.elements.workshopMobileMode.checked = Boolean(settings.workshopMobileMode);
  }

  query("#settingsSummary").innerHTML = `
    <div class="settings-summary-card">
      <span>Provoz</span>
      <strong>${settings.companyName}</strong>
      <p>Barva rozhrani ${settings.primaryColor}</p>
    </div>
    <div class="settings-summary-card">
      <span>Bezpecnostni limity</span>
      <strong>${formatNumber(settings.treadWarning, 1)} mm / ${formatNumber(settings.pressureMin, 1)} bar</strong>
      <p>Upozorneni na dezen, tlak a DOT starsi nez ${settings.dotAgeLimit} let.</p>
    </div>
    <div class="settings-summary-card">
      <span>Rezimy</span>
      <strong>${settings.workshopMobileMode ? "Mobilni rezim pro dilnu" : "Standardni provoz"}</strong>
      <p>${settings.workshopMobileMode ? "Dilna ma prioritu mobilniho zadani." : "Mobilni rezim neni vychozi."}</p>
    </div>
    <div class="settings-summary-card app-version-card">
      <span>Verze aplikace</span>
      <strong>${APP_VERSION.number}</strong>
      <p>${APP_VERSION.name}. Vydano ${APP_VERSION.releaseDate}, build ${APP_VERSION.build}.</p>
      <p>Datovy model ${STORAGE_KEY}.</p>
      <ul class="version-list">
        ${APP_VERSION.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
  );
}

function userInitials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function fillUserControls() {
  const roles = availableUserRoles();
  const roleOptions = roles
    .map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(userRoleLabel(role))}</option>`)
    .join("");
  const roleSelect = query('#userForm select[name="role"]');
  if (roleSelect) {
    const current = normalizeUserRole(roleSelect.value || "Ridic");
    roleSelect.innerHTML = roleOptions;
    roleSelect.value = roles.includes(current) ? current : "Ridic";
  }

  const roleFilter = query("#userRoleFilter");
  if (roleFilter) {
    const current = roleFilter.value || "all";
    roleFilter.innerHTML = `<option value="all">Vsechny role</option>${roleOptions}`;
    const normalizedCurrent = normalizeUserRole(current);
    roleFilter.value = current === "all" || !roles.includes(normalizedCurrent) ? "all" : normalizedCurrent;
  }
}

function renderUsers() {
  const users = dedupeUsersForDisplay(state.users || []);
  fillUserControls();

  const roleFilter = query("#userRoleFilter")?.value || "all";
  const statusFilter = query("#userStatusFilter")?.value || "all";
  const searchTerm = query("#userSearch")?.value || "";
  const filteredUsers = sortUsersForDisplay(users.filter((user) => {
    const matchesRole = roleFilter === "all" || normalizeUserRole(user.role) === normalizeUserRole(roleFilter);
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesSearch = userMatchesSearch(user, searchTerm);
    return matchesRole && matchesStatus && matchesSearch;
  }));

  const activeCount = users.filter((user) => user.status === "aktivni").length;
  const managerCount = users.filter((user) => normalizeUserRole(user.role) === "Management").length;
  const adminCount = users.filter((user) => normalizeUserRole(user.role) === "Spravce vozoveho parku").length;
  const driverCount = users.filter((user) => normalizeUserRole(user.role) === "Ridic").length;
  query("#userCountBadge").textContent = `${activeCount} aktivnich / ${users.length} celkem`;

  query("#userMetrics").innerHTML = `
    <div class="user-metric"><span>Aktivni</span><strong>${activeCount}</strong></div>
    <div class="user-metric"><span>Manageri</span><strong>${managerCount}</strong></div>
    <div class="user-metric"><span>Spravci</span><strong>${adminCount}</strong></div>
    <div class="user-metric"><span>Ridici</span><strong>${driverCount}</strong></div>
    <div class="user-metric"><span>Ve filtru</span><strong>${filteredUsers.length}</strong></div>
  `;

  query("#userList").innerHTML =
    filteredUsers
      .map((user) => {
        const isActive = user.status === "aktivni";
        return `
          <article class="user-card ${isActive ? "" : "is-paused"}">
            <div class="user-avatar" aria-hidden="true">${escapeHtml(userInitials(user.name))}</div>
            <div class="user-main">
              <div class="user-card-header">
                <div>
                  <strong>${escapeHtml(user.name)}</strong>
                  <p>${escapeHtml(user.email)}</p>
                </div>
                <span class="badge ${isActive ? "badge-ok" : "badge-danger"}">${isActive ? "aktivni" : "pozastaveno"}</span>
              </div>
              <dl class="user-detail-grid">
                <div><dt>Role</dt><dd>${escapeHtml(userRoleLabel(user.role))}</dd></div>
                <div><dt>Stredisko</dt><dd>${escapeHtml(user.depot)}</dd></div>
                <div><dt>Prava</dt><dd>${escapeHtml(userPermissions[normalizeUserRole(user.role)] || "Vlastni pristup")}</dd></div>
                <div><dt>Posledni aktivita</dt><dd>${escapeHtml(user.lastActive || "-")}</dd></div>
              </dl>
              <div class="user-access-note">
                <strong>Prihlaseni</strong>
                <span>Uzivatel zada tento e-mail na prihlasovaci obrazovce a klikne na Nastavit / obnovit heslo e-mailem.</span>
              </div>
              <div class="user-actions">
                <button class="button button-soft" type="button" data-user-fill="${escapeHtml(user.id)}">Upravit</button>
                <button class="button ${isActive ? "button-soft" : "button-primary"}" type="button" data-user-toggle="${escapeHtml(user.id)}">
                  ${isActive ? "Pozastavit" : "Aktivovat"}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<div class="empty-state">Zadny uzivatel neodpovida filtru.</div>`;
}

function addUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const email = String(data.email || "").trim().toLowerCase();
  const existing = (state.users || []).find((user) => user.email.toLowerCase() === email);
  const userData = {
    name: String(data.name || "").trim(),
    email,
    role: normalizeUserRole(data.role),
    depot: data.depot,
    status: data.status,
    phone: String(data.phone || "").trim(),
    lastActive: existing?.lastActive || todayIso()
  };

  if (existing) {
    Object.assign(existing, userData);
  } else {
    state.users.unshift({
      id: `USR-${String(Date.now()).slice(-6)}`,
      ...userData
    });
  }

  saveState();
  form.reset();
  renderAll();
  setSection("users");
  showToast(existing ? "Uzivatel je aktualizovany." : "Uzivatel je pridany.");
}

function fillUserForm(userId) {
  const user = (state.users || []).find((item) => item.id === userId);
  const form = query("#userForm");
  if (!user || !form) return;
  form.elements.name.value = user.name;
  form.elements.email.value = user.email;
  form.elements.role.value = normalizeUserRole(user.role);
  form.elements.depot.value = user.depot;
  form.elements.status.value = user.status;
  form.elements.phone.value = user.phone || "";
  showToast("Uzivatel je pripraveny k uprave ve formulari.");
}

function toggleUserStatus(userId) {
  const user = (state.users || []).find((item) => item.id === userId);
  if (!user) return;
  user.status = user.status === "aktivni" ? "pozastaveno" : "aktivni";
  saveState();
  renderUsers();
  showToast(user.status === "aktivni" ? "Uzivatel je aktivni." : "Uzivatel je pozastaveny.");
}

function saveSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.settings = {
    companyName: form.elements.companyName.value.trim() || initialState.settings.companyName,
    primaryColor: form.elements.primaryColor.value || initialState.settings.primaryColor,
    treadWarning: Number(form.elements.treadWarning.value) || initialState.settings.treadWarning,
    pressureMin: Number(form.elements.pressureMin.value) || initialState.settings.pressureMin,
    dotAgeLimit: Number(form.elements.dotAgeLimit.value) || initialState.settings.dotAgeLimit,
    replacementDays: Number(form.elements.replacementDays.value) || initialState.settings.replacementDays,
    publicDemoMode: false,
    workshopMobileMode: form.elements.workshopMobileMode.checked
  };
  applySettings();
  saveState();
  renderAll();
  setSection("settings");
  showToast("Nastaveni aplikace je ulozeno.");
}

function defaultVehicleConfiguration(type = "") {
  const normalized = type
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/(4\s*naprav|ctyr|8\s*x\s*4|8x4)/.test(normalized)) {
    return [...tireLayouts.truckFourAxle];
  }
  if (/(dodavka|daily|citan|combo|esprinter|van|servis|osob)/.test(normalized)) {
    return [...tireLayouts.van];
  }
  if (/(vozik|jednonaprav)/.test(normalized)) return [...tireLayouts.trailerSingleAxle];
  if (/(naves|prives|vlek|trailer)/.test(normalized)) return [...tireLayouts.trailerThreeAxle];
  if (/(4\s*x\s*2|4x2|12t|atego|canter|tgl|1836|skrin|skrinova|mala)/.test(normalized)) {
    return [...tireLayouts.truckTwoAxle];
  }
  return [...tireLayouts.truckThreeAxle];
}

function parseVehicleConfiguration(raw, type) {
  const positions = String(raw || "")
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return positions.length ? positions : defaultVehicleConfiguration(type);
}

function normalizeSpz(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function parseLocalizedNumber(value) {
  return Number(String(value || "0").replace(/\s+/g, "").replace(",", ".")) || 0;
}

function parseOdometerValue(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[\s\u00a0]+/g, "")
    .replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;

  const grouped = /^-?\d{1,3}([,.]\d{3})+$/.test(cleaned);
  const normalized = grouped ? cleaned.replace(/[,.]/g, "") : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function applyVehicleOdometer(vehicle, odometer) {
  if (!vehicle || odometer <= 0) return false;
  const current = Number(vehicle.odometer) || 0;
  if (odometer <= current) return false;
  vehicle.odometer = odometer;
  return true;
}

function parseVehicleImportRows(raw) {
  return raw
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row, index) => {
      const [spzRaw, typeRaw, driverRaw, odometerRaw, depotRaw, monthlyCostRaw, configurationRaw] = row
        .split(";")
        .map((part) => part?.trim());
      const spz = normalizeSpz(spzRaw);
      const type = typeRaw || "Nakladni vozidlo";
      const configuration = parseVehicleConfiguration(configurationRaw, type);
      const existing = state.vehicles.find((vehicle) => vehicle.spz === spz);
      return {
        row: index + 1,
        spz,
        type,
        driver: driverRaw || "nezadan",
        odometer: parseLocalizedNumber(odometerRaw),
        depot: depotRaw || "nezadano",
        monthlyCost: parseLocalizedNumber(monthlyCostRaw),
        configuration,
        status: !spz ? "chyba" : existing ? "aktualizace" : "nove",
        error: spz ? "" : "Chybi SPZ."
      };
    });
}

function renderVehicleImportPreview(rows = state.vehicleImports || []) {
  const validRows = rows.filter((row) => row.status !== "chyba");
  const duplicateSpz = new Set(
    validRows
      .map((row) => row.spz)
      .filter((spz, index, list) => spz && list.indexOf(spz) !== index)
  );

  query("#vehicleImportSummary").textContent = `${validRows.length} vozidel`;
  query("#saveVehicleImport").disabled = validRows.length === 0 || rows.some((row) => row.status === "chyba");
  query("#vehicleImportPreview").innerHTML =
    rows
      .map((row) => {
        const duplicate = duplicateSpz.has(row.spz);
        const badgeClass = row.status === "chyba" || duplicate ? "badge-danger" : row.status === "aktualizace" ? "badge-warning" : "badge-ok";
        const statusText = row.status === "chyba" ? "chyba" : duplicate ? "duplicita v importu" : row.status;
        return `
          <div class="import-item ${row.status === "chyba" || duplicate ? "import-error" : ""}">
            <div>
              <strong>${row.spz || `radek ${row.row}`}: ${row.type}</strong>
              <p>${row.driver}, ${row.depot}. Tachometr ${formatNumber(row.odometer)} km, mesicni naklad ${formatCurrency(row.monthlyCost)}.</p>
              <p>Pozice: ${row.configuration.join(", ")}</p>
              ${row.error ? `<p>${row.error}</p>` : ""}
            </div>
            <span class="badge ${badgeClass}">${statusText}</span>
          </div>
        `;
      })
      .join("") || `<p class="meta">Zatim nejsou rozpoznana zadna vozidla.</p>`;
}

function saveVehicleImport() {
  const rows = (state.vehicleImports || []).filter((row) => row.status !== "chyba");
  if (!rows.length) {
    showToast("Nejdrive rozpoznejte alespon jedno vozidlo.");
    return;
  }

  const seen = new Set();
  const uniqueRows = rows.filter((row) => {
    if (seen.has(row.spz)) return false;
    seen.add(row.spz);
    return true;
  });

  let created = 0;
  let updated = 0;
  uniqueRows.forEach((row) => {
    const existing = state.vehicles.find((vehicle) => vehicle.spz === row.spz);
    const nextVehicle = {
      spz: row.spz,
      type: row.type,
      driver: row.driver,
      odometer: row.odometer,
      depot: row.depot,
      monthlyCost: row.monthlyCost,
      configuration: row.configuration
    };
    if (existing) {
      Object.assign(existing, nextVehicle);
      updated += 1;
    } else {
      state.vehicles.push(nextVehicle);
      created += 1;
    }
  });

  selectedVehicle = state.vehicles.find((vehicle) => vehicle.spz === selectedVehicle)?.spz || state.vehicles[0]?.spz || "";
  saveState();
  renderAll();
  setSection("import");
  showToast(`Import vozidel ulozen: ${created} novych, ${updated} aktualizovanych.`);
}

function parseImportRows(raw) {
  return raw
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [date, supplier, invoice, item, qty, price, target] = row.split(";").map((part) => part?.trim());
      const itemText = (item || "").toLowerCase();
      let category = "ostatni";
      if (/(315|385|265|r22|r19|pneu|hankook|pirelli|sailun|goodride)/.test(itemText)) {
        category = "pneumatika";
      } else if (/(montaz|demontaz|oprava|prezuti|vyjezd)/.test(itemText)) {
        category = "servisni prace";
      } else if (/(ventil|zavazi|material|lepeni)/.test(itemText)) {
        category = "material";
      }
      return {
        date,
        supplier,
        invoice,
        item,
        qty: Number(qty) || 1,
        price: Number(String(price || "0").replace(",", ".")) || 0,
        target,
        category
      };
    });
}

function renderImportPreview(rows = state.imports) {
  const visibleRows = rows.slice(0, 160);
  const hiddenRows = Math.max(rows.length - visibleRows.length, 0);
  query("#importSummary").textContent = hiddenRows
    ? `${rows.length} radku / zobrazeno 160`
    : `${rows.length} radku`;
  query("#importPreview").innerHTML =
    visibleRows
      .map(
        (row) => {
          const category = row.category || (/pneu|r\d|hankook|pirelli|laufenn/i.test(row.item || "") ? "pneumatika" : "servis");
          const rowTotal = Number(row.total ?? (row.qty * row.price)) || 0;
          return `
          <div class="import-item">
            <div>
              <strong>${category}: ${row.item || "-"}</strong>
              <p>${row.date || "-"} / ${row.supplier || "-"} / ${row.invoice || "-"} / ${row.target || "bez SPZ"}</p>
            </div>
            <span class="service-total">${formatCurrency(rowTotal)}</span>
          </div>
        `;
        }
      )
      .join("") + (hiddenRows ? `<p class="meta">Dalsich ${hiddenRows} polozek je ulozeno v importu a v servisnich kartach.</p>` : "") ||
    `<p class="meta">Zatim nejsou rozpoznane zadne polozky.</p>`;
}

function updateServiceTotal() {
  const form = query("#serviceForm");
  const total = ["labor", "material", "tireCost"].reduce(
    (sum, key) => sum + (Number(form.elements[key].value) || 0),
    0
  );
  query("#serviceTotal").textContent = `Celkem ${formatCurrency(total)}`;
}

function addTire(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const nextNumber = String(state.tires.length + 61).padStart(5, "0");
  state.tires.unshift({
    id: data.id?.trim() || `KS-${data.size.slice(0, 3).replace(/\D/g, "") || "PNE"}-${nextNumber}`,
    manufacturer: data.manufacturer.trim(),
    model: data.model.trim(),
    size: data.size,
    index: "",
    dot: data.dot.trim(),
    type: data.type,
    priceEx: Number(data.priceEx) || 0,
    supplier: data.supplier.trim(),
    purchaseDate: todayIso(),
    invoice: data.invoice.trim(),
    state: data.state,
    vehicle: "",
    position: "",
    mounted: "",
    mountedOdo: 0,
    currentTread: data.type === "nova" ? 16 : 8,
    pressure: 0,
    mileage: 0,
    defects: 0
  });
  saveState();
  form.reset();
  query("#tireFormPanel").hidden = true;
  renderAll();
  showToast("Pneumatika je zalozena v evidenci.");
}

function saveMeasurementData(data) {
  const tire = tireForPosition(data.vehicle, data.position);
  const vehicle = state.vehicles.find((item) => item.spz === data.vehicle);
  const odometer = parseOdometerValue(data.odometer);
  if (odometer <= 0) {
    return { ok: false, field: "odometer", message: "Zadejte aktualni stav km." };
  }
  const currentOdometer = Number(vehicle?.odometer) || 0;
  if (vehicle && currentOdometer > 0 && odometer < currentOdometer) {
    return {
      ok: false,
      field: "odometer",
      message: `Stav km nesmi byt nizsi nez aktualni tachometr ${formatNumber(currentOdometer)} km.`
    };
  }
  const measurement = {
    date: todayIso(),
    vehicle: data.vehicle,
    position: data.position,
    odometer,
    tread: parseLocalizedNumber(data.tread),
    pressure: parseLocalizedNumber(data.pressure),
    person: "dilna",
    note: data.note || ""
  };
  state.measurements.unshift(measurement);
  applyVehicleOdometer(vehicle, odometer);
  if (tire) {
    tire.currentTread = measurement.tread;
    tire.pressure = measurement.pressure;
    if (odometer > 0 && tire.mountedOdo > 0) {
      tire.mileage = Math.max(tire.mileage || 0, odometer - tire.mountedOdo);
    }
  }
  selectedVehicle = data.vehicle;
  selectedPosition = data.position;
  return {
    ok: true,
    tire,
    vehicle,
    position: data.position,
    message: tire ? "Mereni ulozeno a pneu aktualizovana." : "Mereni ulozeno, pozice zatim nema prirazene ID pneu."
  };
}

function addMeasurement(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const result = saveMeasurementData(data);
  if (!result.ok) {
    showToast(result.message);
    if (result.field) form.elements[result.field]?.focus();
    return;
  }
  saveState();
  form.reset();
  form.elements.vehicle.value = data.vehicle;
  fillPositionOptions(data.vehicle);
  form.elements.position.value = data.position;
  renderAll();
  form.elements.position.value = data.position;
  syncMeasurementOdometer(data.vehicle);
  showToast(result.message);
}

function addService(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  state.services.unshift({
    id: `S-${Date.now()}`,
    date: data.date,
    vehicle: data.vehicle,
    person: data.person.trim(),
    type: data.type,
    supplier: data.supplier.trim(),
    labor: Number(data.labor) || 0,
    material: Number(data.material) || 0,
    tireCost: Number(data.tireCost) || 0,
    note: data.note.trim()
  });
  saveState();
  form.reset();
  form.elements.date.value = todayIso();
  updateServiceTotal();
  renderAll();
  showToast("Servisni karta je ulozena.");
}

function exportCsv() {
  const header = "datum;SPZ;osoba;typ;dodavatel;prace;material;pneu;celkem;poznamka";
  const rows = state.services.map((item) =>
    [
      item.date,
      item.vehicle,
      item.person,
      item.type,
      item.supplier,
      item.labor,
      item.material,
      item.tireCost,
      item.labor + item.material + item.tireCost,
      item.note
    ].join(";")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kaiser-servisni-karty-${todayIso()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderAll() {
  ensureHydratedState();
  applySettings();
  renderVersionInfo();
  renderLoginStatus();
  fillSelectOptions();
  renderDashboard();
  renderTires();
  renderVehicles();
  renderServices();
  renderImportPreview();
  renderVehicleImportPreview();
  renderReports();
  renderUsers();
  renderSettings();
}

function bindEvents() {
  queryAll("[data-section]").forEach((button) =>
    button.addEventListener("click", () => setSection(button.dataset.section))
  );

  document.addEventListener("click", (event) => {
    const jumpTarget = event.target.closest("[data-section-jump]");
    if (jumpTarget) setSection(jumpTarget.dataset.sectionJump);

    const userFill = event.target.closest("[data-user-fill]");
    if (userFill) fillUserForm(userFill.dataset.userFill);

    const userToggle = event.target.closest("[data-user-toggle]");
    if (userToggle) toggleUserStatus(userToggle.dataset.userToggle);
  });

  query("#globalSearch").addEventListener("input", renderTires);
  query("#qrFocusButton").addEventListener("click", () => {
    query("#globalSearch").focus();
    query("#globalSearch").select();
    showToast("Zadejte nebo naskenujte interni ID pneu do vyhledavani.");
  });

  query("#tireStateFilter").addEventListener("change", renderTires);
  query("#openTireForm").addEventListener("click", () => {
    query("#tireFormPanel").hidden = false;
    query('#tireForm input[name="manufacturer"]').focus();
  });
  query("#closeTireForm").addEventListener("click", () => (query("#tireFormPanel").hidden = true));
  query("#tireForm").addEventListener("submit", addTire);

  query('#measurementForm select[name="vehicle"]').addEventListener("change", (event) => {
    fillPositionOptions(event.target.value);
    syncMeasurementOdometer(event.target.value);
  });
  query("#measurementForm").addEventListener("submit", addMeasurement);

  query("#vehicleSelect").addEventListener("change", (event) => {
    selectedVehicle = event.target.value;
    selectedPosition = "";
    renderVehicles();
  });

  query("#serviceForm").addEventListener("input", updateServiceTotal);
  query("#serviceForm").addEventListener("submit", addService);
  query('#serviceForm input[name="date"]').value = todayIso();
  query("#exportCsv").addEventListener("click", exportCsv);
  query("#userForm").addEventListener("submit", addUser);
  query("#userRoleFilter").addEventListener("change", renderUsers);
  query("#userStatusFilter").addEventListener("change", renderUsers);
  query("#userSearch")?.addEventListener("input", renderUsers);
  query("#settingsForm").addEventListener("submit", saveSettings);

  query("#loadSampleImport").addEventListener("click", () => {
    query("#invoiceImport").value =
      "2026-06-13;Pneuservis A;PA-260613;Hankook AH31 315/80 R22,5;1;9456;2BD 8835\n" +
      "2026-06-13;Pneuservis A;PA-260613;montaz a demontaz;1;1200;2BD 8835\n" +
      "2026-06-13;Pneuservis A;PA-260613;ventil a zavazi;1;300;2BD 8835";
    importSamplePreviewOnly = true;
  });
  query("#invoiceImport").addEventListener("input", () => {
    importSamplePreviewOnly = false;
  });

  query("#loadSampleVehicles").addEventListener("click", () => {
    query("#vehicleImport").value =
      "3BF 4421;Nakladni vozidlo 4 napravy 8x4;Novak;285400;Brno;22500;\n" +
      "7B8 1204;Dodavka servis;Dvorak;98400;Praha;6900;L,P,ZL,ZP\n" +
      "9J3 7780;Naves / prives;Kovar;0;Slapanice;14200;L,P,VL,VP,ZL,ZP";
  });

  query("#parseImport").addEventListener("click", () => {
    const rows = parseImportRows(query("#invoiceImport").value);
    if (importSamplePreviewOnly) {
      renderImportPreview(rows);
      showToast("Ukazka je rozpoznana jen jako nahled. Cloud se nezmenil.");
      return;
    }
    state.imports = rows;
    saveState();
    renderAll();
    showToast("Polozky jsou rozpoznane a pripravene ke kontrole.");
  });

  query("#parseVehicleImport").addEventListener("click", () => {
    state.vehicleImports = parseVehicleImportRows(query("#vehicleImport").value);
    saveState();
    renderVehicleImportPreview();
    showToast("Vozidla jsou rozpoznana a pripravena ke kontrole.");
  });

  query("#saveVehicleImport").addEventListener("click", saveVehicleImport);

  query("#resetDemoData").addEventListener("click", () => {
    const confirmed = window.confirm(
      "Obnovit jen importovane faktury a nahled importu? Vozidla, uzivatele, mereni ani osazene pozice se tim nemení."
    );
    if (!confirmed) return;
    state.imports = structuredClone(initialState.imports || []);
    state.vehicleImports = structuredClone(initialState.vehicleImports || []);
    importSamplePreviewOnly = false;
    saveState();
    renderAll();
    showToast("Importovana data byla obnovena. Vozidla, uzivatele, mereni a osazeni zustaly beze zmen.");
  });
}

bindEvents();
renderAll();

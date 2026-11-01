import { EVENT_LOCATION_ID } from '@/constants/event';
import { normalizeText } from '@/hooks/boxes/boxGrouping';

export type ReferrerContact = {
  name: string;
  dni: string;
  telegram: string;
  phone: string;
  username?: string;
};

export type LocationReferrerInfo = {
  locationId: number;
  city: string;
  code: string;
  address: string;
  payOnDelivery?: boolean;
  referrers: ReferrerContact[];
};

export const AMBA_REFERRER_INFO: LocationReferrerInfo = {
  locationId: EVENT_LOCATION_ID,
  city: 'CABA',
  code: 'CABA',
  address: 'Vía Cargo Villa Devoto: Nueva York 4311, C1419 Cdad. Autónoma de Buenos Aires',
  payOnDelivery: true,
  referrers: [
    {
      name: 'Germán Kijel',
      dni: '',
      telegram: '',
      phone: '',
    },
  ],
};

export const REFERRER_DIRECTORY: LocationReferrerInfo[] = [
  AMBA_REFERRER_INFO,
  {
    locationId: 34,
    city: 'Bahía Blanca',
    code: 'BBL',
    address: 'Luis María Drago 2802, Bahía Blanca, Buenos Aires',
    referrers: [
      {
        name: 'Damian Yazyi',
        dni: '34609942',
        telegram: '@damianyaz',
        phone: '2914377745',
        username: 'damianyaz',
      },
    ],
  },
  {
    locationId: 21,
    city: 'Catamarca',
    code: 'CAT',
    address: 'Paclin 956, dpto 2, San Fernando del Valle de Catamarca, Catamarca',
    referrers: [
      {
        name: 'David Emanuel Sanchez',
        dni: '36355005',
        telegram: '@davaso',
        phone: '3513521855',
        username: 'davaso',
      },
    ],
  },
  {
    locationId: 6,
    city: 'Colón',
    code: 'COL',
    address: '',
    referrers: [
      {
        name: 'Lucas Gregorio',
        dni: '33071031',
        telegram: '@Elpitufo14',
        phone: '3447509333',
        username: 'lucascarp1414',
      },
    ],
  },
  {
    locationId: 24,
    city: 'Comodoro Rivadavia',
    code: 'CRV',
    address: 'Pablo Ortega 2651, Comodoro Rivadavia, Chubut',
    referrers: [
      {
        name: 'Emiliano Morales',
        dni: '38798102',
        telegram: '@eeeeeeeeeemi',
        phone: '2974015642',
        username: 'eeeeeeeeeemi',
      },
    ],
  },
  {
    locationId: 3,
    city: 'Córdoba',
    code: 'CBA',
    address: 'Octavio Pinto 3126, Córdoba, Córdoba',
    referrers: [
      {
        name: 'Manuel Rodríguez',
        dni: '35572158',
        telegram: '@ManuCraky',
        phone: '3546407600',
        username: 'manurodriguez008',
      },
      {
        name: 'Franco de Miguel Sánchez',
        dni: '39174575',
        telegram: '@francodemiguel',
        phone: '3513298297',
        username: 'francodemiguel',
      },
    ],
  },
  {
    locationId: 17,
    city: 'Esperanza',
    code: 'ESP',
    address: 'Brig. López 182, Esperanza, Santa Fe',
    referrers: [
      {
        name: 'Franco Iturraspe',
        dni: '29991906',
        telegram: '@Yturraxpe',
        phone: '3496417360',
        username: 'francoiturraspe',
      },
    ],
  },
  {
    locationId: 25,
    city: 'Gualeguaychú',
    code: 'GUA',
    address: 'Gral. Artigas 2013, Gualeguaychú, Entre Ríos',
    referrers: [
      {
        name: 'Jonathan Gabriel Garcia',
        dni: '37564991',
        telegram: '@YonitoGarcia',
        phone: '3446419994',
        username: 'Jonathan Garcia',
      },
    ],
  },
  {
    locationId: 39,
    city: 'Junín',
    code: 'JUN',
    address: '',
    referrers: [
      {
        name: 'Joaquín Puente',
        dni: '31469358',
        telegram: '@Joa_pu',
        phone: '1141735344',
        username: 'Joaco_puente',
      },
    ],
  },
  {
    locationId: 26,
    city: 'La Plata',
    code: 'LPL',
    address: '',
    referrers: [
      {
        name: 'Bernabé Ibáñez',
        dni: '',
        telegram: '@ib9002',
        phone: '2364568351',
      },
    ],
  },
  {
    locationId: 8,
    city: 'Mar del Plata',
    code: 'MDQ',
    address: 'Av. Constitución 4545, MAR DEL PLATA - CONSTITUCIÓN, Buenos Aires',
    referrers: [
      {
        name: 'Maximiliano Suarez',
        dni: '31958098',
        telegram: '@MadMaxMdq',
        phone: '2236200511',
        username: 'suarezmn',
      },
    ],
  },
  {
    locationId: 2,
    city: 'Mendoza',
    code: 'MEN',
    address: 'Av. Bandera de los Andes 424, Guaymallén, Mendoza',
    referrers: [
      {
        name: 'Fernando Coria',
        dni: '26296234',
        telegram: '@nandofdc',
        phone: '2615099453',
      },
    ],
  },
  {
    locationId: 44,
    city: 'Necochea',
    code: 'NEC',
    address: '',
    referrers: [
      {
        name: 'Carlos Javier García',
        dni: '35412310',
        telegram: '@charles_gee90',
        phone: '2262405874',
        username: 'cjaviigee',
      },
    ],
  },
  {
    locationId: 12,
    city: 'Neuquén',
    code: 'NQN',
    address: 'J J Lastra y Pampa, Neuquén, Neuquén',
    referrers: [
      {
        name: 'Fernando Berdichevsky',
        dni: '26542104',
        telegram: '@fernando_meeplesenaccion',
        phone: '2995094301',
        username: 'fernqn',
      },
    ],
  },
  {
    locationId: 13,
    city: 'Paraná',
    code: 'PAR',
    address: 'Sagastume 946, Paraná, Entre Ríos',
    referrers: [
      {
        name: 'Matias Cepellotti',
        dni: '29620034',
        telegram: '@MatiCepe',
        phone: '3434058464',
        username: 'MatiCepe',
      },
    ],
  },
  {
    locationId: 42,
    city: 'Posadas',
    code: 'POS',
    address: 'Santiago del Estero 1455, Posadas, Misiones',
    referrers: [
      {
        name: 'Franco Matias Sosa Kruger',
        dni: '41017532',
        telegram: '@fmsk98',
        phone: '3764806359',
        username: 'fsosa151998',
      },
    ],
  },
  {
    locationId: 27,
    city: 'Puerto Madryn',
    code: 'PMA',
    address: 'Dr. Avila S/N - Local 13/14 - Terminal, Puerto Madryn, Chubut',
    referrers: [
      {
        name: 'Carlos Pellegrini',
        dni: '29618178',
        telegram: '@Carlospel',
        phone: '2804655341',
        username: 'carlospel25',
      },
    ],
  },
  {
    locationId: 9,
    city: 'Rafaela',
    code: 'RAF',
    address: 'Av. Int. O. Zobboli 716, S2300 Rafaela, Santa Fe',
    referrers: [
      {
        name: 'Pablo Pochettino',
        dni: '33553341',
        telegram: '@pablopoche',
        phone: '3492316146',
        username: 'pablopochettino_prs',
      },
    ],
  },
  {
    locationId: 41,
    city: 'Resistencia',
    code: 'RES',
    address: 'Terminal de Resistencia Local 85 a 89 Av. Mac Lean Nro.2347, Resistencia, Chaco',
    referrers: [
      {
        name: 'Marcos Gustavo Aguirre Acosta',
        dni: '39614621',
        telegram: '@DadosSinSuerte',
        phone: '3624394036',
        username: 'aguirremarcosgustavo.96',
      },
    ],
  },
  {
    locationId: 4,
    city: 'Rosario',
    code: 'ROS',
    address: 'Oroño 3041, Rosario, Santa Fe',
    referrers: [
      {
        name: 'Giuliano Frattini',
        dni: '37102480',
        telegram: '@Giuli_F',
        phone: '3413482640',
      },
    ],
  },
  {
    locationId: 10,
    city: 'Salta',
    code: 'SAL',
    address: 'Av. Hipólito Yrigoyen 651, Salta, Salta',
    referrers: [
      {
        name: 'Francisco Javier Parada',
        dni: '28441332',
        telegram: '@panchoparada',
        phone: '3874027177',
        username: 'panchoparada',
      },
    ],
  },
  {
    locationId: 29,
    city: 'San Carlos de Bariloche',
    code: 'BAR',
    address: 'Bosque lindo 413, Bariloche, Rio Negro',
    referrers: [
      {
        name: 'Santiago Rey',
        dni: '35817570',
        telegram: '@ChantunRey',
        phone: '2944374365',
        username: 'Santiago Rey',
      },
    ],
  },
  {
    locationId: 30,
    city: 'San Juan',
    code: 'SJU',
    address: 'Av. Libertador Gral. San Martin Este 1008, San Juan, San Juan',
    referrers: [
      {
        name: 'Mariano Ariel Amar',
        dni: '30277357',
        telegram: '@YoshiEnVerde',
        phone: '2644456749',
        username: 'yoshienverde',
      },
    ],
  },
  {
    locationId: 49,
    city: 'San Martín de los Andes',
    code: 'SMA',
    address: '',
    referrers: [
      {
        name: 'Maximiliano De Biasi',
        dni: '33302996',
        telegram: '@maxi3088',
        phone: '1158295987',
      },
    ],
  },
  {
    locationId: 7,
    city: 'San Miguel de Tucumán',
    code: 'TUC',
    address: 'Juan Bautista Alberdi 160, San Miguel de Tucumán, Tucumán',
    referrers: [
      {
        name: 'Martin Sebastian Sesma',
        dni: '34285418',
        telegram: '@dulkan77',
        phone: '3814055058',
      },
    ],
  },
  {
    locationId: 16,
    city: 'San Nicolás de los Arroyos',
    code: 'SNI',
    address: 'Av. Savio 914, San Nicolás de los Arroyos, Buenos Aires',
    referrers: [
      {
        name: 'Martín Borda',
        dni: '25328184',
        telegram: '@martinborda',
        phone: '3364249286',
        username: 'martinborda',
      },
    ],
  },
  {
    locationId: 5,
    city: 'San Salvador de Jujuy',
    code: 'JUJ',
    address: 'Cotaiga 2010, San Salvador de Jujuy, Jujuy',
    referrers: [
      {
        name: 'Augusto Pedraza',
        dni: '33817701',
        telegram: '@PukllayClub',
        phone: '3815709003',
        username: 'apedraza',
      },
    ],
  },
  {
    locationId: 33,
    city: 'Santa Fe',
    code: 'SFE',
    address: 'Gdor. Crespo 2250, Ciudad de Santa Fe, Santa Fe',
    referrers: [
      {
        name: 'Agustín José Sanchez Ritvo',
        dni: '40645622',
        telegram: '@NitsuZ',
        phone: '3425125868',
        username: 'sanchoagusritvo',
      },
    ],
  },
  {
    locationId: 35,
    city: 'Santa Rosa',
    code: 'SRO',
    address: 'Av. Ing Santiago Marzo 761, Santa Rosa, La Pampa',
    referrers: [
      {
        name: 'Pablo Matías Decristófano',
        dni: '33998504',
        telegram: '@Chudsta',
        phone: '2954335704',
        username: 'chudstar',
      },
    ],
  },
  {
    locationId: 14,
    city: 'Santiago del Estero',
    code: 'SGO',
    address: 'Independencia 1120, Santiago del Estero, Santiago del Estero',
    referrers: [
      {
        name: 'Lucio Auhad',
        dni: '26585999',
        telegram: '@Lup_io',
        phone: '3855708190',
        username: 'lucio.auhad',
      },
    ],
  },
  {
    locationId: 46,
    city: 'Tandil',
    code: 'TAN',
    address: 'Terminal de Omnibus Av. Buzón 400, Tandil, Buenos Aires',
    referrers: [
      {
        name: 'Marina Petersen',
        dni: '29754521',
        telegram: '@misharpgs',
        phone: '2494675010',
        username: 'Hosenka',
      },
    ],
  },
  {
    locationId: 32,
    city: 'Trelew',
    code: 'TRW',
    address: 'Urquiza 150 Bodega 1 y 2, Trelew, Chubut',
    referrers: [
      {
        name: 'Virginia Esquivel',
        dni: '27516168',
        telegram: '@catuluna',
        phone: '2804324529',
        username: 'vir.esquivel',
      },
    ],
  },
  {
    locationId: 43,
    city: 'Venado Tuerto',
    code: 'VEN',
    address: 'Ayacucho 12, Venado Tuerto, Santa Fe',
    referrers: [
      {
        name: 'Rafael Blancourt',
        dni: '95699476',
        telegram: '@raff_raffff',
        phone: '3462332298',
        username: 'rafaelblancourt',
      },
    ],
  },
  {
    locationId: 47,
    city: 'Viedma',
    code: 'VIE',
    address: 'Boulevard Sussini 152, Viedma, Río Negro',
    referrers: [
      {
        name: 'Matias Ruben Canova',
        dni: '34023429',
        telegram: '@pseudocoso',
        phone: '2920559977',
        username: 'matiasrcanova',
      },
    ],
  },
  {
    locationId: 31,
    city: 'Villa de Merlo',
    code: 'SLU',
    address: 'Juana Azurduy Esq. Ruta 5, Villa de Merlo, San Luis',
    referrers: [
      {
        name: 'Ezequiel Gutierrez',
        dni: '35723159',
        telegram: '@Ezegutiii',
        phone: '2664812452',
      },
    ],
  },
  {
    locationId: 19,
    city: 'Villa María',
    code: 'VMA',
    address: 'Av. Pres. Juan Domingo Perón 2651, Villa Maria, Córdoba',
    referrers: [
      {
        name: 'Martín Oddino',
        dni: '34560324',
        telegram: '@Martin_Oddino',
        phone: '3537487933',
        username: 'martinoddino',
      },
    ],
  },
];

export const INTERIOR_REFERRER_DIRECTORY: LocationReferrerInfo[] = REFERRER_DIRECTORY
  .filter((entry) => entry.locationId !== EVENT_LOCATION_ID)
  .sort((a, b) => a.city.localeCompare(b.city, 'es'));

export function findReferrerInfo(
  locationIdOrName?: number | string | null,
): LocationReferrerInfo | undefined {
  if (locationIdOrName == null) return undefined;
  if (typeof locationIdOrName === 'number') {
    return REFERRER_DIRECTORY.find((entry) => entry.locationId === locationIdOrName);
  }
  const needle = normalizeText(locationIdOrName.replace(/\(.*?\)/g, '').trim());
  if (!needle) return undefined;
  return REFERRER_DIRECTORY.find((entry) => {
    const cityNorm = normalizeText(entry.city);
    return cityNorm === needle || cityNorm.includes(needle) || needle.includes(cityNorm);
  });
}

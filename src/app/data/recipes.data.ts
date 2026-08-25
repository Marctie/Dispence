import { Recipe } from '../models/recipe.model';

export const RECIPES_DATASET: Recipe[] = [
  // ── Pasta ──────────────────────────────────────────────────────────────────
  {
    id: 'pasta-pomodoro', name: 'Pasta al pomodoro', emoji: '🍝',
    ingredients: ['pasta', 'pomodoro', 'aglio', 'basilico', 'olio'],
    description: 'Il classico per eccellenza. Semplice, veloce e sempre buono.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'pasta-carbonara', name: 'Carbonara', emoji: '🍝',
    ingredients: ['pasta', 'guanciale', 'uova', 'pecorino', 'pepe'],
    description: 'La vera carbonara romana: cremosa e saporita.',
    difficulty: 'medium', time: 25,
  },
  {
    id: 'pasta-amatriciana', name: 'Amatriciana', emoji: '🍝',
    ingredients: ['pasta', 'guanciale', 'pomodoro', 'pecorino', 'pepe'],
    description: 'Un grande classico laziale dal sapore deciso.',
    difficulty: 'easy', time: 25,
  },
  {
    id: 'pasta-cacio-pepe', name: 'Cacio e pepe', emoji: '🍝',
    ingredients: ['pasta', 'pecorino', 'pepe', 'parmigiano'],
    description: 'Tre ingredienti, un piatto perfetto.',
    difficulty: 'medium', time: 15,
  },
  {
    id: 'pasta-pesto', name: 'Pasta al pesto', emoji: '🌿',
    ingredients: ['pasta', 'basilico', 'parmigiano', 'pinoli', 'aglio', 'olio'],
    description: 'Fresca e profumata, ideale d\'estate.',
    difficulty: 'easy', time: 15,
  },
  {
    id: 'pasta-vongole', name: 'Pasta alle vongole', emoji: '🦪',
    ingredients: ['pasta', 'vongole', 'aglio', 'prezzemolo', 'olio', 'vino bianco'],
    description: 'Un classico di mare semplice e profumatissimo.',
    difficulty: 'medium', time: 30,
  },
  {
    id: 'pasta-norma', name: 'Pasta alla Norma', emoji: '🍆',
    ingredients: ['pasta', 'melanzane', 'pomodoro', 'ricotta salata', 'basilico'],
    description: 'Un capolavoro siciliano con melanzane fritte.',
    difficulty: 'medium', time: 35,
  },
  {
    id: 'pasta-boscaiola', name: 'Pasta boscaiola', emoji: '🍄',
    ingredients: ['pasta', 'funghi', 'pancetta', 'panna', 'parmigiano'],
    description: 'Ricca e saporita, perfetta per l\'autunno.',
    difficulty: 'easy', time: 25,
  },
  {
    id: 'pasta-tonno', name: 'Pasta al tonno', emoji: '🐟',
    ingredients: ['pasta', 'tonno', 'pomodoro', 'capperi', 'olive', 'aglio'],
    description: 'Un pranzo veloce e gustoso con ingredienti della dispensa.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'pasta-limone', name: 'Pasta al limone', emoji: '🍋',
    ingredients: ['pasta', 'limone', 'panna', 'parmigiano', 'burro'],
    description: 'Fresca, cremosa e pronta in 15 minuti.',
    difficulty: 'easy', time: 15,
  },
  // ── Riso ───────────────────────────────────────────────────────────────────
  {
    id: 'risotto-funghi', name: 'Risotto ai funghi', emoji: '🍄',
    ingredients: ['riso', 'funghi', 'cipolla', 'brodo', 'parmigiano', 'burro', 'vino bianco'],
    description: 'Cremoso e profumato, perfetto per una cena autunnale.',
    difficulty: 'medium', time: 35,
  },
  {
    id: 'risotto-parmigiano', name: 'Risotto al parmigiano', emoji: '🧀',
    ingredients: ['riso', 'parmigiano', 'burro', 'brodo', 'cipolla'],
    description: 'Il risotto base, con il parmigiano come protagonista.',
    difficulty: 'medium', time: 30,
  },
  {
    id: 'risotto-zucca', name: 'Risotto alla zucca', emoji: '🎃',
    ingredients: ['riso', 'zucca', 'cipolla', 'brodo', 'parmigiano', 'burro'],
    description: 'Dolce e cremoso, il comfort food dell\'autunno.',
    difficulty: 'medium', time: 40,
  },
  {
    id: 'risotto-mare', name: 'Risotto ai frutti di mare', emoji: '🦐',
    ingredients: ['riso', 'gamberi', 'cozze', 'vongole', 'pomodoro', 'aglio', 'prezzemolo'],
    description: 'Un risotto di mare ricco e profumato.',
    difficulty: 'hard', time: 45,
  },
  {
    id: 'riso-verdure', name: 'Riso saltato con verdure', emoji: '🥦',
    ingredients: ['riso', 'zucchine', 'carote', 'peperoni', 'cipolla', 'olio'],
    description: 'Leggero, colorato e nutriente.',
    difficulty: 'easy', time: 25,
  },
  // ── Zuppe e minestre ───────────────────────────────────────────────────────
  {
    id: 'minestrone', name: 'Minestrone di verdure', emoji: '🥣',
    ingredients: ['patate', 'carote', 'zucchine', 'fagioli', 'pomodoro', 'cipolla', 'sedano', 'pasta'],
    description: 'Nutriente e ricco, cambia con le stagioni.',
    difficulty: 'easy', time: 45,
  },
  {
    id: 'zuppa-lenticchie', name: 'Zuppa di lenticchie', emoji: '🥣',
    ingredients: ['lenticchie', 'pomodoro', 'cipolla', 'carote', 'sedano', 'aglio', 'rosmarino'],
    description: 'Calda e proteica, ideale d\'inverno.',
    difficulty: 'easy', time: 40,
  },
  {
    id: 'zuppa-fagioli', name: 'Pasta e fagioli', emoji: '🫘',
    ingredients: ['fagioli', 'pasta', 'pomodoro', 'rosmarino', 'aglio', 'pancetta'],
    description: 'Un piatto contadino povero ma ricchissimo di sapore.',
    difficulty: 'easy', time: 50,
  },
  {
    id: 'vellutata-zucca', name: 'Vellutata di zucca', emoji: '🎃',
    ingredients: ['zucca', 'cipolla', 'brodo', 'panna', 'zenzero'],
    description: 'Vellutata e delicata, ottima come antipasto.',
    difficulty: 'easy', time: 35,
  },
  {
    id: 'ribollita', name: 'Ribollita toscana', emoji: '🥣',
    ingredients: ['fagioli', 'cavolo nero', 'pane', 'pomodoro', 'cipolla', 'carote', 'sedano', 'olio'],
    description: 'La zuppa toscana per eccellenza, ribolle di sapore.',
    difficulty: 'medium', time: 60,
  },
  // ── Secondi di carne ───────────────────────────────────────────────────────
  {
    id: 'pollo-limone', name: 'Pollo al limone', emoji: '🍋',
    ingredients: ['pollo', 'limone', 'aglio', 'rosmarino', 'olio'],
    description: 'Tenero e aromatico, pronto in mezzora.',
    difficulty: 'easy', time: 35,
  },
  {
    id: 'pollo-funghi', name: 'Pollo ai funghi', emoji: '🍄',
    ingredients: ['pollo', 'funghi', 'cipolla', 'vino bianco', 'rosmarino', 'aglio'],
    description: 'Un classico della cucina casalinga.',
    difficulty: 'easy', time: 40,
  },
  {
    id: 'pollo-verdure', name: 'Pollo arrosto con verdure', emoji: '🍗',
    ingredients: ['pollo', 'patate', 'carote', 'rosmarino', 'aglio', 'olio'],
    description: 'Il pranzo domenicale definitivo.',
    difficulty: 'easy', time: 75,
  },
  {
    id: 'polpette-sugo', name: 'Polpette al sugo', emoji: '🍖',
    ingredients: ['carne macinata', 'uova', 'parmigiano', 'pangrattato', 'pomodoro', 'aglio'],
    description: 'Morbide e saporite, si mangiano in quantità.',
    difficulty: 'medium', time: 45,
  },
  {
    id: 'scaloppine-limone', name: 'Scaloppine al limone', emoji: '🍋',
    ingredients: ['vitello', 'limone', 'farina', 'burro', 'prezzemolo'],
    description: 'Tenere e delicate, pronte in 15 minuti.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'arrosto-maiale', name: 'Arrosto di maiale', emoji: '🐷',
    ingredients: ['maiale', 'rosmarino', 'aglio', 'vino bianco', 'salvia', 'olio'],
    description: 'Succoso e aromatico, perfetto per il pranzo domenicale.',
    difficulty: 'medium', time: 90,
  },
  {
    id: 'bistecca-ferri', name: 'Bistecca ai ferri', emoji: '🥩',
    ingredients: ['bistecca', 'aglio', 'rosmarino', 'sale', 'olio'],
    description: 'Semplice e soddisfacente.',
    difficulty: 'easy', time: 15,
  },
  {
    id: 'salsicce-patate', name: 'Salsicce e patate al forno', emoji: '🌭',
    ingredients: ['salsiccia', 'patate', 'rosmarino', 'aglio', 'olio'],
    description: 'Un comfort food senza fronzoli.',
    difficulty: 'easy', time: 50,
  },
  // ── Secondi di pesce ───────────────────────────────────────────────────────
  {
    id: 'salmone-forno', name: 'Salmone al forno', emoji: '🐟',
    ingredients: ['salmone', 'limone', 'aglio', 'prezzemolo', 'olio'],
    description: 'Leggero e saporito, in tavola in 20 minuti.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'baccala-pomodoro', name: 'Baccalà al pomodoro', emoji: '🐟',
    ingredients: ['baccalà', 'pomodoro', 'olive', 'capperi', 'aglio', 'prezzemolo'],
    description: 'Un piatto tradizionale napoletano.',
    difficulty: 'medium', time: 40,
  },
  {
    id: 'gamberetti-aglio', name: 'Gamberi in padella', emoji: '🦐',
    ingredients: ['gamberi', 'aglio', 'prezzemolo', 'olio', 'vino bianco'],
    description: 'Veloci, saporiti e sempre riusciti.',
    difficulty: 'easy', time: 15,
  },
  {
    id: 'trota-forno', name: 'Trota al forno con erbette', emoji: '🐟',
    ingredients: ['trota', 'limone', 'rosmarino', 'aglio', 'olio'],
    description: 'Delicata e profumata, ottima per chi vuole mangiare leggero.',
    difficulty: 'easy', time: 30,
  },
  {
    id: 'insalata-mare', name: 'Insalata di mare', emoji: '🦑',
    ingredients: ['calamari', 'gamberi', 'cozze', 'limone', 'prezzemolo', 'olio', 'sedano'],
    description: 'Fresca e colorata, perfetta d\'estate.',
    difficulty: 'medium', time: 30,
  },
  // ── Verdure e contorni ─────────────────────────────────────────────────────
  {
    id: 'parmigiana', name: 'Parmigiana di melanzane', emoji: '🍆',
    ingredients: ['melanzane', 'pomodoro', 'mozzarella', 'parmigiano', 'basilico'],
    description: 'Un capolavoro che vale il lavoro che richiede.',
    difficulty: 'hard', time: 90,
  },
  {
    id: 'caponata', name: 'Caponata siciliana', emoji: '🍆',
    ingredients: ['melanzane', 'pomodoro', 'olive', 'capperi', 'sedano', 'cipolla', 'aceto', 'zucchero'],
    description: 'Agrodolce, ricca e tipicamente siciliana.',
    difficulty: 'medium', time: 50,
  },
  {
    id: 'patate-forno', name: 'Patate al forno', emoji: '🥔',
    ingredients: ['patate', 'rosmarino', 'aglio', 'olio'],
    description: 'Il contorno più amato di sempre.',
    difficulty: 'easy', time: 45,
  },
  {
    id: 'peperonata', name: 'Peperonata', emoji: '🫑',
    ingredients: ['peperoni', 'pomodoro', 'cipolla', 'aglio', 'olio'],
    description: 'Colorata e saporita, ottima anche fredda.',
    difficulty: 'easy', time: 35,
  },
  {
    id: 'spinaci-saltati', name: 'Spinaci saltati con aglio', emoji: '🥬',
    ingredients: ['spinaci', 'aglio', 'olio', 'limone'],
    description: 'Un contorno leggero e rapidissimo.',
    difficulty: 'easy', time: 10,
  },
  {
    id: 'zucchine-trifolate', name: 'Zucchine trifolate', emoji: '🥒',
    ingredients: ['zucchine', 'aglio', 'prezzemolo', 'olio'],
    description: 'Semplici e profumate, pronte in 10 minuti.',
    difficulty: 'easy', time: 15,
  },
  {
    id: 'fagiolini-pomodoro', name: 'Fagiolini al pomodoro', emoji: '🫘',
    ingredients: ['fagiolini', 'pomodoro', 'aglio', 'basilico', 'olio'],
    description: 'Un contorno estivo dal sapore casalingo.',
    difficulty: 'easy', time: 25,
  },
  // ── Uova ───────────────────────────────────────────────────────────────────
  {
    id: 'frittata-verdure', name: 'Frittata di verdure', emoji: '🍳',
    ingredients: ['uova', 'zucchine', 'cipolla', 'parmigiano', 'olio'],
    description: 'Versatile e nutriente, ottima anche fredda.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'uova-purgatorio', name: 'Uova al purgatorio', emoji: '🍳',
    ingredients: ['uova', 'pomodoro', 'aglio', 'peperoncino', 'prezzemolo'],
    description: 'Piccanti e saporite, ideali per un pranzo veloce.',
    difficulty: 'easy', time: 15,
  },
  {
    id: 'frittata-patate', name: 'Frittata di patate', emoji: '🥔',
    ingredients: ['uova', 'patate', 'cipolla', 'olio', 'sale'],
    description: 'La tortilla italiana: sostanziosa e deliziosa.',
    difficulty: 'easy', time: 30,
  },
  {
    id: 'uova-strapazzate', name: 'Uova strapazzate con salmone', emoji: '🐟',
    ingredients: ['uova', 'salmone', 'burro', 'erba cipollina', 'panna'],
    description: 'Una colazione o cena elegante e veloce.',
    difficulty: 'easy', time: 10,
  },
  // ── Dolci ──────────────────────────────────────────────────────────────────
  {
    id: 'tiramisù', name: 'Tiramisù', emoji: '☕',
    ingredients: ['uova', 'mascarpone', 'zucchero', 'caffè', 'savoiardi', 'cacao'],
    description: 'Il dolce italiano per eccellenza.',
    difficulty: 'medium', time: 30,
  },
  {
    id: 'panna-cotta', name: 'Panna cotta', emoji: '🍮',
    ingredients: ['panna', 'zucchero', 'gelatina', 'vaniglia'],
    description: 'Elegante e semplice, si prepara il giorno prima.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'torta-mele', name: 'Torta di mele', emoji: '🍎',
    ingredients: ['mele', 'farina', 'zucchero', 'uova', 'burro', 'lievito', 'cannella'],
    description: 'Morbida e profumata, la torta della nonna.',
    difficulty: 'easy', time: 60,
  },
  {
    id: 'crema-pasticcera', name: 'Crema pasticcera', emoji: '🥛',
    ingredients: ['latte', 'uova', 'zucchero', 'farina', 'vaniglia'],
    description: 'Base indispensabile per molti dolci.',
    difficulty: 'medium', time: 20,
  },
  {
    id: 'mousse-cioccolato', name: 'Mousse al cioccolato', emoji: '🍫',
    ingredients: ['cioccolato', 'uova', 'panna', 'zucchero', 'burro'],
    description: 'Leggera e golosissima.',
    difficulty: 'medium', time: 25,
  },
  {
    id: 'budino-riso', name: 'Budino di riso', emoji: '🍚',
    ingredients: ['riso', 'latte', 'zucchero', 'uova', 'vaniglia', 'burro'],
    description: 'Un dolce al cucchiaio cremoso e confortante.',
    difficulty: 'easy', time: 40,
  },
  // ── Piatti unici ───────────────────────────────────────────────────────────
  {
    id: 'frittata-pasta', name: 'Frittata di pasta', emoji: '🍝',
    ingredients: ['pasta', 'uova', 'parmigiano', 'olio', 'mozzarella'],
    description: 'L\'avanzo più buono che esista.',
    difficulty: 'easy', time: 20,
  },
  {
    id: 'pizza-casa', name: 'Pizza fatta in casa', emoji: '🍕',
    ingredients: ['farina', 'lievito', 'pomodoro', 'mozzarella', 'olio', 'sale'],
    description: 'Ci vuole pazienza, ma ne vale la pena.',
    difficulty: 'hard', time: 120,
  },
  {
    id: 'panino-prosciutto', name: 'Panino artigianale', emoji: '🥪',
    ingredients: ['pane', 'prosciutto', 'mozzarella', 'pomodoro', 'basilico'],
    description: 'Veloce, buono e versatile.',
    difficulty: 'easy', time: 5,
  },
  {
    id: 'insalata-greca', name: 'Insalata greca', emoji: '🥗',
    ingredients: ['pomodoro', 'cetriolo', 'olive', 'feta', 'cipolla', 'olio', 'origano'],
    description: 'Fresca e colorata, perfetta d\'estate.',
    difficulty: 'easy', time: 10,
  },
  {
    id: 'bruschetta', name: 'Bruschetta al pomodoro', emoji: '🍅',
    ingredients: ['pane', 'pomodoro', 'basilico', 'aglio', 'olio'],
    description: 'L\'antipasto italiano più iconico.',
    difficulty: 'easy', time: 10,
  },
];

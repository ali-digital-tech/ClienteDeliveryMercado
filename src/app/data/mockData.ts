export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  unit: string;
  description: string;
  isPromo?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export interface Order {
  id: string;
  date: string;
  items: { product: Product; qty: number }[];
  total: number;
  status: 'recebido' | 'confirmado' | 'separacao' | 'saiu' | 'entregue';
  address: string;
  type: 'delivery' | 'pickup';
}

export const categories: Category[] = [
  { id: 'hortifruti', name: 'Hortifruti', emoji: '🥦', color: '#16a34a', bgColor: '#f0fdf4' },
  { id: 'acougue', name: 'Açougue', emoji: '🥩', color: '#dc2626', bgColor: '#fef2f2' },
  { id: 'bebidas', name: 'Bebidas', emoji: '🥤', color: '#2563eb', bgColor: '#eff6ff' },
  { id: 'padaria', name: 'Padaria', emoji: '🍞', color: '#d97706', bgColor: '#fffbeb' },
  { id: 'laticinios', name: 'Laticínios', emoji: '🥛', color: '#7c3aed', bgColor: '#f5f3ff' },
  { id: 'limpeza', name: 'Limpeza', emoji: '🧹', color: '#0891b2', bgColor: '#ecfeff' },
  { id: 'higiene', name: 'Higiene', emoji: '🧴', color: '#db2777', bgColor: '#fdf2f8' },
  { id: 'mercearia', name: 'Mercearia', emoji: '🛒', color: '#ea580c', bgColor: '#fff7ed' },
  { id: 'congelados', name: 'Congelados', emoji: '🧊', color: '#0284c7', bgColor: '#f0f9ff' },
  { id: 'pet', name: 'Pet', emoji: '🐾', color: '#854d0e', bgColor: '#fefce8' },
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Leite Integral',
    brand: 'Italac',
    price: 5.99,
    originalPrice: 7.49,
    image: 'https://images.unsplash.com/photo-1589606331047-02abd8b09de7?w=400&q=80',
    category: 'laticinios',
    unit: '1L',
    description: 'Leite integral pasteurizado de alta qualidade, rico em cálcio e vitaminas. Ideal para consumo diário, cereais e receitas.',
    isPromo: true,
    isBestseller: true,
  },
  {
    id: '2',
    name: 'Pão Artesanal',
    brand: 'Padaria Premium',
    price: 12.90,
    image: 'https://images.unsplash.com/photo-1768203630967-289f83db20d9?w=400&q=80',
    category: 'padaria',
    unit: '500g',
    description: 'Pão artesanal feito com farinha selecionada e fermentação natural. Crocante por fora e macio por dentro.',
    isFeatured: true,
    isBestseller: true,
  },
  {
    id: '3',
    name: 'Suco de Laranja',
    brand: 'Del Valle',
    price: 8.90,
    originalPrice: 11.99,
    image: 'https://images.unsplash.com/photo-1771904866954-9416ec52fce2?w=400&q=80',
    category: 'bebidas',
    unit: '1L',
    description: 'Suco de laranja 100% natural, sem adição de açúcar ou conservantes. Feito com laranjas selecionadas.',
    isPromo: true,
    isFeatured: true,
  },
  {
    id: '4',
    name: 'Ovos Brancos',
    brand: 'Granja Mantiqueira',
    price: 14.90,
    originalPrice: 17.90,
    image: 'https://images.unsplash.com/photo-1760393339745-18360fc2b6e3?w=400&q=80',
    category: 'laticinios',
    unit: 'Dúzia',
    description: 'Ovos brancos frescos, categoria A, provenientes de galinhas criadas com ração balanceada e bem-estar animal.',
    isPromo: true,
    isBestseller: true,
  },
  {
    id: '5',
    name: 'Café Torrado e Moído',
    brand: 'Melitta',
    price: 18.90,
    originalPrice: 23.90,
    image: 'https://images.unsplash.com/photo-1672854824277-5c142923c5ee?w=400&q=80',
    category: 'mercearia',
    unit: '500g',
    description: 'Café torrado e moído de grãos selecionados das melhores regiões cafeeiras do Brasil. Aroma intenso e sabor encorpado.',
    isPromo: true,
    isFeatured: true,
  },
  {
    id: '6',
    name: 'Iogurte Natural',
    brand: 'Danone',
    price: 4.49,
    image: 'https://images.unsplash.com/photo-1604095853918-1a1823a63dd5?w=400&q=80',
    category: 'laticinios',
    unit: '170g',
    description: 'Iogurte natural integral com culturas vivas e ativas. Rico em proteínas e probióticos para o seu bem-estar.',
    isBestseller: true,
  },
  {
    id: '7',
    name: 'Detergente Líquido',
    brand: 'Ypê',
    price: 2.99,
    originalPrice: 3.99,
    image: 'https://images.unsplash.com/photo-1758887262204-a49092d85f15?w=400&q=80',
    category: 'limpeza',
    unit: '500ml',
    description: 'Detergente líquido concentrado com poder de limpeza avançado. Remove gordura com facilidade e cuida das suas mãos.',
    isPromo: true,
  },
  {
    id: '8',
    name: 'Maçã Fuji',
    brand: 'Hortifruti Premium',
    price: 9.90,
    image: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400&q=80',
    category: 'hortifruti',
    unit: 'kg',
    description: 'Maçã Fuji fresca e selecionada, com sabor adocicado e textura crocante. Rica em fibras e vitaminas.',
    isFeatured: true,
  },
  {
    id: '9',
    name: 'Alcatra Bovina',
    brand: 'Açougue Premium',
    price: 49.90,
    originalPrice: 59.90,
    image: 'https://images.unsplash.com/photo-1680169126018-83f189ab694e?w=400&q=80',
    category: 'acougue',
    unit: 'kg',
    description: 'Alcatra bovina de primeira qualidade, macia e suculenta. Ideal para churrasco ou preparo na frigideira.',
    isPromo: true,
    isFeatured: true,
  },
  {
    id: '10',
    name: 'Água Mineral',
    brand: 'Crystal',
    price: 2.49,
    image: 'https://images.unsplash.com/photo-1638688569176-5b6db19f9d2a?w=400&q=80',
    category: 'bebidas',
    unit: '1,5L',
    description: 'Água mineral natural sem gás, extraída de fontes certificadas. Ideal para hidratação diária.',
    isBestseller: true,
  },
  {
    id: '11',
    name: 'Banana Prata',
    brand: 'Hortifruti Premium',
    price: 6.90,
    image: 'https://images.unsplash.com/photo-1711208224791-2cc390f53744?w=400&q=80',
    category: 'hortifruti',
    unit: 'kg',
    description: 'Banana prata madura e selecionada. Rica em potássio, carboidratos e energia para o seu dia a dia.',
    isBestseller: true,
    isFeatured: true,
  },
  {
    id: '12',
    name: 'Queijo Mussarela',
    brand: 'Tirolez',
    price: 34.90,
    originalPrice: 42.90,
    image: 'https://images.unsplash.com/photo-1604095853918-1a1823a63dd5?w=400&q=80',
    category: 'laticinios',
    unit: 'kg',
    description: 'Queijo mussarela fresco e cremoso, ideal para pizzas, sanduíches e receitas em geral.',
    isPromo: true,
  },
];

export const mockOrders: Order[] = [
  {
    id: '#12847',
    date: '12 Abr 2026',
    items: [
      { product: products[0], qty: 2 },
      { product: products[1], qty: 1 },
      { product: products[2], qty: 3 },
    ],
    total: 56.57,
    status: 'entregue',
    address: 'Rua das Flores, 123 - Jardim Paulista',
    type: 'delivery',
  },
  {
    id: '#12701',
    date: '05 Abr 2026',
    items: [
      { product: products[4], qty: 1 },
      { product: products[5], qty: 4 },
      { product: products[8], qty: 2 },
    ],
    total: 136.70,
    status: 'entregue',
    address: 'Rua das Flores, 123 - Jardim Paulista',
    type: 'delivery',
  },
  {
    id: '#12999',
    date: '15 Abr 2026',
    items: [
      { product: products[0], qty: 1 },
      { product: products[3], qty: 2 },
      { product: products[9], qty: 6 },
    ],
    total: 64.83,
    status: 'saiu',
    address: 'Rua das Flores, 123 - Jardim Paulista',
    type: 'delivery',
  },
];

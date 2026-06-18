import type { EstablishmentType } from '../types/market';

export interface EstablishmentLabels {
  singular: string;
  singularCapitalized: string;
  plural: string;
  pluralCapitalized: string;
  thisWithArticle: string;
  withDefiniteArticle: string;
  ofThis: string;
  inThis: string;
  inThe: string;
  fromThe: string;
  byThe: string;
  openAdjective: string;
  closedAdjective: string;
  digital: string;
}

const LABELS_BY_TYPE: Record<EstablishmentType, EstablishmentLabels> = {
  mercado: {
    singular: 'mercado',
    singularCapitalized: 'Mercado',
    plural: 'mercados',
    pluralCapitalized: 'Mercados',
    thisWithArticle: 'este mercado',
    withDefiniteArticle: 'o mercado',
    ofThis: 'deste mercado',
    inThis: 'neste mercado',
    inThe: 'no mercado',
    fromThe: 'do mercado',
    byThe: 'pelo mercado',
    openAdjective: 'aberto',
    closedAdjective: 'fechado',
    digital: 'Supermercado Digital',
  },
  lanchonete: {
    singular: 'lanchonete',
    singularCapitalized: 'Lanchonete',
    plural: 'lanchonetes',
    pluralCapitalized: 'Lanchonetes',
    thisWithArticle: 'esta lanchonete',
    withDefiniteArticle: 'a lanchonete',
    ofThis: 'desta lanchonete',
    inThis: 'nesta lanchonete',
    inThe: 'na lanchonete',
    fromThe: 'da lanchonete',
    byThe: 'pela lanchonete',
    openAdjective: 'aberta',
    closedAdjective: 'fechada',
    digital: 'Lanchonete Digital',
  },
  restaurante: {
    singular: 'restaurante',
    singularCapitalized: 'Restaurante',
    plural: 'restaurantes',
    pluralCapitalized: 'Restaurantes',
    thisWithArticle: 'este restaurante',
    withDefiniteArticle: 'o restaurante',
    ofThis: 'deste restaurante',
    inThis: 'neste restaurante',
    inThe: 'no restaurante',
    fromThe: 'do restaurante',
    byThe: 'pelo restaurante',
    openAdjective: 'aberto',
    closedAdjective: 'fechado',
    digital: 'Restaurante Digital',
  },
  hibrido: {
    singular: 'estabelecimento',
    singularCapitalized: 'Estabelecimento',
    plural: 'estabelecimentos',
    pluralCapitalized: 'Estabelecimentos',
    thisWithArticle: 'este estabelecimento',
    withDefiniteArticle: 'o estabelecimento',
    ofThis: 'deste estabelecimento',
    inThis: 'neste estabelecimento',
    inThe: 'no estabelecimento',
    fromThe: 'do estabelecimento',
    byThe: 'pelo estabelecimento',
    openAdjective: 'aberto',
    closedAdjective: 'fechado',
    digital: 'Delivery Digital',
  },
  outro: {
    singular: 'estabelecimento',
    singularCapitalized: 'Estabelecimento',
    plural: 'estabelecimentos',
    pluralCapitalized: 'Estabelecimentos',
    thisWithArticle: 'este estabelecimento',
    withDefiniteArticle: 'o estabelecimento',
    ofThis: 'deste estabelecimento',
    inThis: 'neste estabelecimento',
    inThe: 'no estabelecimento',
    fromThe: 'do estabelecimento',
    byThe: 'pelo estabelecimento',
    openAdjective: 'aberto',
    closedAdjective: 'fechado',
    digital: 'Loja Digital',
  },
};

export function getEstablishmentLabels(type: EstablishmentType | null | undefined) {
  return LABELS_BY_TYPE[type || 'mercado'] || LABELS_BY_TYPE.mercado;
}

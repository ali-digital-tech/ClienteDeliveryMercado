export type EstablishmentType = 'mercado' | 'lanchonete' | 'restaurante' | 'hibrido' | 'outro';

export interface Market {
  id: string;
  name: string;
  description: string;
  establishmentType: EstablishmentType;
  configurableMenuEnabled: boolean;
  allowCpfOnInvoice: boolean;
  digitalLabel: string;
  neighborhood: string;
  city: string;
  cities: string[];
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  deliveryEstimate: string;
  minimumOrder: number;
  deliveryFee: number;
  status: 'open' | 'closed';
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  phone?: string | null;
  whatsappSupport?: string | null;
  email?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  paymentMethods?: string[];
  acceptsCash?: boolean;
}

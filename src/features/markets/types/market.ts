export interface Market {
  id: string;
  name: string;
  description: string;
  neighborhood: string;
  address: string;
  deliveryEstimate: string;
  minimumOrder: number;
  deliveryFee: number;
  status: 'open' | 'closed';
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  phone?: string | null;
  whatsappSupport?: string | null;
}

export interface Market {
  id: string;
  name: string;
  description: string;
  neighborhood: string;
  deliveryEstimate: string;
  minimumOrder: number;
  deliveryFee: number;
  status: 'open' | 'closed';
  logo: string;
  primaryColor: string;
  secondaryColor: string;
}

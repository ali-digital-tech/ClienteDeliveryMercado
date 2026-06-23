export type PlatformBannerTargetType = 'loja' | 'rota_loja' | 'produto' | 'link_externo';

export interface PlatformBanner {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  cta_text?: string | null;
  imagem_url: string;
  destino_tipo: PlatformBannerTargetType;
  destino_loja_id?: string | null;
  destino_rota?: 'home' | 'categories' | 'produtos' | 'promocoes' | 'favorites' | null;
  destino_produto_loja_id?: string | null;
  destino_url?: string | null;
  prioridade: number;
}

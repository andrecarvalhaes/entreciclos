export type StatusPagar = 'pendente' | 'pago' | 'vencido'
export type StatusReceber = 'pendente' | 'recebido' | 'atrasado'

export interface ContaPagar {
  id: string
  descricao: string
  categoria: string
  fornecedor: string | null
  valor: number
  vencimento: string
  status: StatusPagar
  pago_em: string | null
  observacoes: string | null
  comprovante_url: string | null
  comprovante_nome: string | null
  created_at: string
  updated_at: string
}

export interface ContaReceber {
  id: string
  descricao: string
  origem: string
  valor: number
  data_prevista: string
  status: StatusReceber
  recebido_em: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export const CATEGORIAS_PAGAR = [
  'aluguel',
  'energia',
  'agua',
  'manutencao',
  'fornecedor',
  'contador',
  'marketing',
  'outros',
] as const

export const ORIGENS_RECEBER = [
  'maquina',
  'servico',
  'outros',
] as const

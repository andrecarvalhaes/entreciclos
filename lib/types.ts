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
  // Custos Operacionais (CMV / CPV)
  'insumos',
  'manutencao_equipamentos',
  'manutencao_predial',
  // Despesas Operacionais
  'aluguel',
  'energia',
  'agua',
  'internet_telefone',
  // Despesas Administrativas
  'contador',
  'juridico',
  'softwares',
  'material_escritorio',
  // Despesas com Pessoal
  'folha_pagamento',
  'pro_labore',
  'beneficios',
  // Despesas Financeiras
  'parcela_financiamento',
  'tarifas_bancarias',
  'juros',
  // Marketing & Vendas
  'marketing',
  'publicidade',
  // Impostos & Taxas
  'imposto',
  'alvara_licenca',
  // Outros
  'outros',
] as const

export const ORIGENS_RECEBER = [
  'maquina',
  'servico',
  'outros',
] as const

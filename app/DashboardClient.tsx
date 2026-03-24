'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ContaPagar, ContaReceber } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingDown, TrendingUp, DollarSign, CalendarCheck } from 'lucide-react'
import Link from 'next/link'
import FluxoCaixa from './components/FluxoCaixa'
import PageHeader from '@/components/PageHeader'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pendente: { label: 'Pendente', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    pago: { label: 'Pago', className: 'bg-green-50 text-green-700 border-green-200' },
    vencido: { label: 'Vencido', className: 'bg-red-50 text-red-700 border-red-200' },
    recebido: { label: 'Recebido', className: 'bg-green-50 text-green-700 border-green-200' },
    atrasado: { label: 'Atrasado', className: 'bg-red-50 text-red-700 border-red-200' },
  }
  const config = map[status] || { label: status, className: '' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  )
}

export default function DashboardClient() {
  const [loading, setLoading] = useState(true)
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])

  useEffect(() => {
    async function load() {
      const [pagarResult, receberResult] = await Promise.all([
        supabase.from('contas_pagar').select('*').order('vencimento', { ascending: true }),
        supabase.from('contas_receber').select('*').order('data_prevista', { ascending: true }),
      ])
      setContasPagar(pagarResult.data || [])
      setContasReceber(receberResult.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = today.substring(0, 8) + '01'

  const totalAPagar = contasPagar
    .filter(c => c.status === 'pendente' || c.status === 'vencido')
    .reduce((sum, c) => sum + Number(c.valor), 0)

  const totalAReceber = contasReceber
    .filter(c => c.status === 'pendente' || c.status === 'atrasado')
    .reduce((sum, c) => sum + Number(c.valor), 0)

  const receitaMes = contasReceber
    .filter(c => c.status === 'recebido' && c.recebido_em && c.recebido_em >= firstDayOfMonth)
    .reduce((sum, c) => sum + Number(c.valor), 0)

  const saldoProjetado = totalAReceber - totalAPagar

  const proximasPagar = contasPagar
    .filter(c => c.status === 'pendente' || c.status === 'vencido')
    .slice(0, 5)

  const proximasReceber = contasReceber
    .filter(c => c.status === 'pendente' || c.status === 'atrasado')
    .slice(0, 5)

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" subtitle="Visao geral do financeiro" />
        <p className="text-sm text-gray-400 text-center py-12">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Dashboard" subtitle="Visao geral do financeiro" />

      {/* KPI Cards — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'A Receber', value: totalAReceber, icon: TrendingUp, color: '#87CEEB' },
          { label: 'A Pagar', value: totalAPagar, icon: TrendingDown, color: '#E8A0B8' },
          { label: 'Saldo', value: saldoProjetado, icon: DollarSign, color: saldoProjetado >= 0 ? '#87CEEB' : '#E8A0B8' },
          { label: 'Receita do Mes', value: receitaMes, icon: CalendarCheck, color: '#87CEEB' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4 md:p-5" style={{ backgroundColor: '#2D2566' }}>
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <span className="text-xs font-medium text-white/60 leading-tight">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className={`text-lg md:text-2xl font-semibold ${value < 0 ? 'text-red-300' : 'text-white'}`}>
              {formatCurrency(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Proximas — cards empilhados no mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Proximas a Pagar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Proximas a Pagar</h3>
            <Link href="/contas-a-pagar" className="text-xs font-medium" style={{ color: '#E8A0B8' }}>Ver todas</Link>
          </div>
          {proximasPagar.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma conta pendente</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {proximasPagar.map(conta => (
                <div key={conta.id} className="flex items-center justify-between px-4 md:px-5 py-3">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{conta.descricao}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(conta.vencimento)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(conta.valor))}</p>
                    <div className="flex justify-end mt-0.5"><StatusBadge status={conta.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proximas a Receber */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Proximas a Receber</h3>
            <Link href="/contas-a-receber" className="text-xs font-medium" style={{ color: '#E8A0B8' }}>Ver todas</Link>
          </div>
          {proximasReceber.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma conta pendente</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {proximasReceber.map(conta => (
                <div key={conta.id} className="flex items-center justify-between px-4 md:px-5 py-3">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{conta.descricao}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(conta.data_prevista)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(conta.valor))}</p>
                    <div className="flex justify-end mt-0.5"><StatusBadge status={conta.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fluxo de Caixa */}
      <FluxoCaixa />
    </div>
  )
}

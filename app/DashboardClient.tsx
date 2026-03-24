'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ContaPagar, ContaReceber } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown, TrendingUp, DollarSign, CalendarCheck } from 'lucide-react'
import Link from 'next/link'

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
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Visao geral do financeiro</p>
        </div>
        <div className="text-sm text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Visao geral do financeiro</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm" style={{ backgroundColor: '#2D2566' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/60">Total a Receber</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(135,206,235,0.2)' }}>
                <TrendingUp className="w-4 h-4" style={{ color: '#87CEEB' }} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-white">{formatCurrency(totalAReceber)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm" style={{ backgroundColor: '#2D2566' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/60">Total a Pagar</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(232,160,184,0.2)' }}>
                <TrendingDown className="w-4 h-4" style={{ color: '#E8A0B8' }} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-white">{formatCurrency(totalAPagar)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm" style={{ backgroundColor: '#2D2566' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/60">Saldo Projetado</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <DollarSign className="w-4 h-4 text-white/80" />
              </div>
            </div>
            <p className={`text-2xl font-semibold ${saldoProjetado >= 0 ? 'text-white' : 'text-red-300'}`}>
              {formatCurrency(saldoProjetado)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm" style={{ backgroundColor: '#2D2566' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/60">Receita do Mes</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(135,206,235,0.2)' }}>
                <CalendarCheck className="w-4 h-4" style={{ color: '#87CEEB' }} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-white">{formatCurrency(receitaMes)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Proximas a Pagar</CardTitle>
              <Link href="/contas-a-pagar" className="text-xs font-medium" style={{color:"#E8A0B8"}}>
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {proximasPagar.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma conta pendente</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {proximasPagar.map((conta, idx) => (
                    <tr key={conta.id} className={idx !== proximasPagar.length - 1 ? 'border-b border-gray-100' : ''}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{conta.descricao}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(conta.vencimento)}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(conta.valor))}</p>
                        <div className="flex justify-end mt-0.5">
                          <StatusBadge status={conta.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Proximas a Receber</CardTitle>
              <Link href="/contas-a-receber" className="text-xs font-medium" style={{color:"#E8A0B8"}}>
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {proximasReceber.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma conta pendente</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {proximasReceber.map((conta, idx) => (
                    <tr key={conta.id} className={idx !== proximasReceber.length - 1 ? 'border-b border-gray-100' : ''}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{conta.descricao}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(conta.data_prevista)}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(conta.valor))}</p>
                        <div className="flex justify-end mt-0.5">
                          <StatusBadge status={conta.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

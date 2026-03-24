import { supabase } from '@/lib/supabase'
import { ContaPagar, ContaReceber } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { TrendingDown, TrendingUp, DollarSign, CalendarCheck } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const today = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = today.substring(0, 8) + '01'

  const [pagarResult, receberResult] = await Promise.all([
    supabase
      .from('contas_pagar')
      .select('*')
      .order('vencimento', { ascending: true }),
    supabase
      .from('contas_receber')
      .select('*')
      .order('data_prevista', { ascending: true }),
  ])

  const contasPagar: ContaPagar[] = pagarResult.data || []
  const contasReceber: ContaReceber[] = receberResult.data || []

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

  return {
    totalAPagar,
    totalAReceber,
    saldoProjetado,
    receitaMes,
    proximasPagar,
    proximasReceber,
  }
}

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

export default async function Dashboard() {
  const data = await getDashboardData()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Visão geral do financeiro</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Total a Receber</span>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.totalAReceber)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Total a Pagar</span>
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.totalAPagar)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Saldo Projetado</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${data.saldoProjetado >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <DollarSign className={`w-4 h-4 ${data.saldoProjetado >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
            <p className={`text-2xl font-semibold ${data.saldoProjetado >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(data.saldoProjetado)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Receita do Mes</span>
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.receitaMes)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Proximas a Pagar */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Proximas a Pagar</CardTitle>
              <Link href="/contas-a-pagar" className="text-xs text-blue-600 hover:underline font-medium">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.proximasPagar.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma conta pendente</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {data.proximasPagar.map((conta, idx) => (
                    <tr key={conta.id} className={idx !== data.proximasPagar.length - 1 ? 'border-b border-gray-100' : ''}>
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

        {/* Proximas a Receber */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Proximas a Receber</CardTitle>
              <Link href="/contas-a-receber" className="text-xs text-blue-600 hover:underline font-medium">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.proximasReceber.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma conta pendente</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {data.proximasReceber.map((conta, idx) => (
                    <tr key={conta.id} className={idx !== data.proximasReceber.length - 1 ? 'border-b border-gray-100' : ''}>
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

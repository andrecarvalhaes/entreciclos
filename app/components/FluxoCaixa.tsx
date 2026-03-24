'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

type ViewMode = 'mensal' | 'anual'

interface FluxoPoint {
  label: string
  entradas: number
  saidas: number
  acumulado: number
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface TooltipEntry { name: string; value: number; color: string }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p: TooltipEntry) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900">{formatCurrency(Math.abs(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

export default function FluxoCaixa() {
  const [mode, setMode] = useState<ViewMode>('mensal')
  const [data, setData] = useState<FluxoPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const now = new Date()

      if (mode === 'mensal') {
        // Dia a dia do mês corrente
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const daysInMonth = new Date(year, month, 0).getDate()
        const from = `${year}-${String(month).padStart(2,'0')}-01`
        const to = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

        const [pagarRes, receberRes] = await Promise.all([
          supabase.from('contas_pagar').select('vencimento,valor,status').gte('vencimento', from).lte('vencimento', to),
          supabase.from('contas_receber').select('data_prevista,valor,status').gte('data_prevista', from).lte('data_prevista', to),
        ])

        const pontos: FluxoPoint[] = []
        let acc = 0
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const saidas = (pagarRes.data || [])
            .filter(c => c.vencimento === key)
            .reduce((s, c) => s + Number(c.valor), 0)
          const entradas = (receberRes.data || [])
            .filter(c => c.data_prevista === key)
            .reduce((s, c) => s + Number(c.valor), 0)
          acc += entradas - saidas
          pontos.push({ label: `${d}`, entradas, saidas: -saidas, acumulado: acc })
        }
        setData(pontos)
      } else {
        // Mensal — 12 meses do ano corrente
        const year = now.getFullYear()
        const from = `${year}-01-01`
        const to = `${year}-12-31`

        const [pagarRes, receberRes] = await Promise.all([
          supabase.from('contas_pagar').select('vencimento,valor,status').gte('vencimento', from).lte('vencimento', to),
          supabase.from('contas_receber').select('data_prevista,valor,status').gte('data_prevista', from).lte('data_prevista', to),
        ])

        const pontos: FluxoPoint[] = []
        let acc = 0
        for (let m = 0; m < 12; m++) {
          const monthStr = String(m + 1).padStart(2, '0')
          const saidas = (pagarRes.data || [])
            .filter(c => c.vencimento?.startsWith(`${year}-${monthStr}`))
            .reduce((s, c) => s + Number(c.valor), 0)
          const entradas = (receberRes.data || [])
            .filter(c => c.data_prevista?.startsWith(`${year}-${monthStr}`))
            .reduce((s, c) => s + Number(c.valor), 0)
          acc += entradas - saidas
          pontos.push({ label: MESES[m], entradas, saidas: -saidas, acumulado: acc })
        }
        setData(pontos)
      }
      setLoading(false)
    }
    load()
  }, [mode])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Fluxo de Caixa</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {mode === 'mensal' ? 'Dia a dia do mês atual' : 'Visao mensal do ano atual'}
          </p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => setMode('mensal')}
            className="px-4 py-1.5 text-xs font-medium transition-all"
            style={mode === 'mensal' ? { backgroundColor: '#2D2566', color: '#fff' } : { color: '#6b7280' }}
          >
            Mensal
          </button>
          <button
            onClick={() => setMode('anual')}
            className="px-4 py-1.5 text-xs font-medium transition-all"
            style={mode === 'anual' ? { backgroundColor: '#2D2566', color: '#fff' } : { color: '#6b7280' }}
          >
            Anual
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">Carregando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barCategoryGap={mode === 'anual' ? '30%' : '15%'}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval={mode === 'mensal' ? 2 : 0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>}
            />
            <Bar dataKey="entradas" name="Entradas" fill="#87CEEB" radius={[4,4,0,0]} maxBarSize={mode === 'anual' ? 22 : 12} />
            <Bar dataKey="saidas" name="Saidas" fill="#E8A0B8" radius={[0,0,4,4]} maxBarSize={mode === 'anual' ? 22 : 12} />
            <Line
              type="monotone"
              dataKey="acumulado"
              name="Acumulado"
              stroke="#2D2566"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#2D2566' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

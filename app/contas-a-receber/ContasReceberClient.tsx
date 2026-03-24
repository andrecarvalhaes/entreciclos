'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ContaReceber, ORIGENS_RECEBER } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, CheckCircle, Filter } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  recebido: 'Recebido',
  atrasado: 'Atrasado',
}

const ORIGEM_LABELS: Record<string, string> = {
  maquina: 'Maquina',
  servico: 'Servico',
  outros: 'Outros',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    recebido: 'bg-green-50 text-green-700 border-green-200',
    atrasado: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

interface NovaContaForm {
  descricao: string
  origem: string
  valor: string
  data_prevista: string
  observacoes: string
}

const defaultForm: NovaContaForm = {
  descricao: '',
  origem: 'maquina',
  valor: '',
  data_prevista: '',
  observacoes: '',
}

export default function ContasReceberClient() {
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterPeriodFrom, setFilterPeriodFrom] = useState('')
  const [filterPeriodTo, setFilterPeriodTo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NovaContaForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchContas = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('contas_receber')
      .select('*')
      .order('data_prevista', { ascending: true })

    if (filterStatus !== 'todos') query = query.eq('status', filterStatus)
    if (filterPeriodFrom) query = query.gte('data_prevista', filterPeriodFrom)
    if (filterPeriodTo) query = query.lte('data_prevista', filterPeriodTo)

    const { data } = await query
    setContas(data || [])
    setLoading(false)
  }, [filterStatus, filterPeriodFrom, filterPeriodTo])

  useEffect(() => {
    fetchContas()
  }, [fetchContas])

  const handleMarkAsReceived = async (id: string) => {
    await supabase
      .from('contas_receber')
      .update({ status: 'recebido', recebido_em: new Date().toISOString() })
      .eq('id', id)
    fetchContas()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.data_prevista) return
    setSaving(true)
    await supabase.from('contas_receber').insert({
      descricao: form.descricao,
      origem: form.origem,
      valor: parseFloat(form.valor),
      data_prevista: form.data_prevista,
      observacoes: form.observacoes || null,
      status: 'pendente',
    })
    setSaving(false)
    setModalOpen(false)
    setForm(defaultForm)
    fetchContas()
  }

  const total = contas.reduce((sum, c) => sum + Number(c.valor), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Contas a Receber</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas receitas previstas</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "todos")}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">De</span>
            <Input
              type="date"
              value={filterPeriodFrom}
              onChange={e => setFilterPeriodFrom(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <span className="text-xs text-gray-500">ate</span>
            <Input
              type="date"
              value={filterPeriodTo}
              onChange={e => setFilterPeriodTo(e.target.value)}
              className="w-36 h-8 text-sm"
            />
          </div>

          {(filterStatus !== 'todos' || filterPeriodFrom || filterPeriodTo) && (
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs text-gray-500"
              onClick={() => {
                setFilterStatus('todos')
                setFilterPeriodFrom('')
                setFilterPeriodTo('')
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : contas.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhuma conta encontrada</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Descricao</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Origem</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Data Prevista</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Acao</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((conta, idx) => (
                <tr key={conta.id} className={idx !== contas.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{conta.descricao}</p>
                    {conta.observacoes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{conta.observacoes}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{ORIGEM_LABELS[conta.origem] || conta.origem}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(conta.valor))}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{formatDate(conta.data_prevista)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={conta.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {conta.status !== 'recebido' && (
                      <button
                        onClick={() => handleMarkAsReceived(conta.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Marcar recebido
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Total footer */}
        {contas.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">{contas.length} {contas.length === 1 ? 'registro' : 'registros'}</span>
            <span className="text-sm font-semibold text-gray-900">
              Total: {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descricao *</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Receita maquina 01"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Origem *</Label>
                <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v ?? "maquina" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENS_RECEBER.map(o => (
                      <SelectItem key={o} value={o}>{ORIGEM_LABELS[o] || o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={e => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="data_prevista">Data Prevista *</Label>
              <Input
                id="data_prevista"
                type="date"
                value={form.data_prevista}
                onChange={e => setForm({ ...form, data_prevista: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Input
                id="observacoes"
                value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Observacoes opcionais"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

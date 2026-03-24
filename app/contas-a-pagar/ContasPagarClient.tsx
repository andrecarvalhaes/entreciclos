'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadComprovante, analisarComprovante } from '@/lib/storage'
import { ContaPagar, CATEGORIAS_PAGAR } from '@/lib/types'
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
import Image from "next/image"
import { Plus, CheckCircle, Filter, Paperclip, Upload, Loader2, Sparkles, ExternalLink } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
}

const CATEGORIA_LABELS: Record<string, string> = {
  aluguel: 'Aluguel',
  energia: 'Energia',
  agua: 'Agua',
  manutencao: 'Manutencao',
  fornecedor: 'Fornecedor',
  contador: 'Contador',
  marketing: 'Marketing',
  outros: 'Outros',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    pago: 'bg-green-50 text-green-700 border-green-200',
    vencido: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

interface NovaContaForm {
  descricao: string
  categoria: string
  fornecedor: string
  valor: string
  vencimento: string
  observacoes: string
  recorrente: boolean
  recorrencia_meses: string
  recorrencia_parcelas: string
  recorrencia_dia: string
}

const defaultForm: NovaContaForm = {
  descricao: '',
  categoria: 'outros',
  fornecedor: '',
  valor: '',
  vencimento: '',
  observacoes: '',
  recorrente: false,
  recorrencia_meses: '1',
  recorrencia_parcelas: '12',
  recorrencia_dia: '',
}

function calcularVencimentos(diaDoMes: number, intervalMeses: number, parcelas: number): string[] {
  const dates: string[] = []
  const hoje = new Date()
  let ano = hoje.getFullYear()
  let mes = hoje.getMonth() + 1 // 1-12

  for (let i = 0; i < parcelas; i++) {
    // Ajustar dia para não ultrapassar o fim do mês
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const dia = Math.min(diaDoMes, ultimoDia)
    const dateStr = `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    dates.push(dateStr)
    // Avançar intervalMeses
    mes += intervalMeses
    while (mes > 12) { mes -= 12; ano++ }
  }
  return dates
}

export default function ContasPagarClient() {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterCategoria, setFilterCategoria] = useState('todos')
  const [filterPeriodFrom, setFilterPeriodFrom] = useState('')
  const [filterPeriodTo, setFilterPeriodTo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NovaContaForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Anexar comprovante em conta existente
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)

  const fetchContas = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('contas_pagar')
      .select('*')
      .order('vencimento', { ascending: true })

    if (filterStatus !== 'todos') query = query.eq('status', filterStatus)
    if (filterCategoria !== 'todos') query = query.eq('categoria', filterCategoria)
    if (filterPeriodFrom) query = query.gte('vencimento', filterPeriodFrom)
    if (filterPeriodTo) query = query.lte('vencimento', filterPeriodTo)

    const { data } = await query
    setContas(data || [])
    setLoading(false)
  }, [filterStatus, filterCategoria, filterPeriodFrom, filterPeriodTo])

  useEffect(() => { fetchContas() }, [fetchContas])

  const handleMarkAsPaid = async (id: string) => {
    await supabase
      .from('contas_pagar')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('id', id)
    fetchContas()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f))
    } else {
      setFilePreview(null)
    }
    // Analisar com IA automaticamente
    setAnalyzing(true)
    const resultado = await analisarComprovante(f)
    setAnalyzing(false)
    if (resultado) {
      setForm(prev => ({
        ...prev,
        descricao: resultado.descricao || prev.descricao,
        fornecedor: resultado.fornecedor || prev.fornecedor,
        valor: resultado.valor ? String(resultado.valor) : prev.valor,
        categoria: resultado.categoria || prev.categoria,
        vencimento: resultado.data || prev.vencimento,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.descricao || !form.valor) return
    if (!form.recorrente && !form.vencimento) return
    if (form.recorrente && !form.recorrencia_dia) return
    setSaving(true)

    if (form.recorrente) {
      // Criar N parcelas
      const dia = parseInt(form.recorrencia_dia)
      const meses = parseInt(form.recorrencia_meses) || 1
      const parcelas = parseInt(form.recorrencia_parcelas) || 1
      const vencimentos = calcularVencimentos(dia, meses, parcelas)
      const registros = vencimentos.map((v, i) => ({
        descricao: parcelas > 1 ? `${form.descricao} (${i + 1}/${parcelas})` : form.descricao,
        categoria: form.categoria,
        fornecedor: form.fornecedor || null,
        valor: parseFloat(form.valor),
        vencimento: v,
        observacoes: form.observacoes || null,
        status: 'pendente',
      }))
      await supabase.from('contas_pagar').insert(registros)
      setSaving(false)
      setModalOpen(false)
      setForm(defaultForm)
      setFile(null)
      setFilePreview(null)
      fetchContas()
      return
    }

    const { data: inserted } = await supabase.from('contas_pagar').insert({
      descricao: form.descricao,
      categoria: form.categoria,
      fornecedor: form.fornecedor || null,
      valor: parseFloat(form.valor),
      vencimento: form.vencimento,
      observacoes: form.observacoes || null,
      status: 'pendente',
    }).select().single()

    // Upload comprovante se houver
    if (file && inserted?.id) {
      const url = await uploadComprovante(file, inserted.id)
      if (url) {
        await supabase.from('contas_pagar').update({
          comprovante_url: url,
          comprovante_nome: file.name,
        }).eq('id', inserted.id)
      }
    }

    setSaving(false)
    setModalOpen(false)
    setForm(defaultForm)
    setFile(null)
    setFilePreview(null)
    fetchContas()
  }

  const handleAttachToExisting = async (contaId: string, f: File) => {
    const url = await uploadComprovante(f, contaId)
    if (url) {
      await supabase.from('contas_pagar').update({
        comprovante_url: url,
        comprovante_nome: f.name,
      }).eq('id', contaId)
      fetchContas()
    }
    setAttachingId(null)
  }

  const total = contas.reduce((sum, c) => sum + Number(c.valor), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Contas a Pagar</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas despesas</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="text-white"
          style={{ backgroundColor: '#2D2566' }}
        >
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
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v ?? "todos")}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {CATEGORIAS_PAGAR.map(c => (
                <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c] || c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">De</span>
            <Input type="date" value={filterPeriodFrom} onChange={e => setFilterPeriodFrom(e.target.value)} className="w-36 h-8 text-sm" />
            <span className="text-xs text-gray-500">ate</span>
            <Input type="date" value={filterPeriodTo} onChange={e => setFilterPeriodTo(e.target.value)} className="w-36 h-8 text-sm" />
          </div>

          {(filterStatus !== 'todos' || filterCategoria !== 'todos' || filterPeriodFrom || filterPeriodTo) && (
            <Button variant="ghost" className="h-8 px-3 text-xs text-gray-500" onClick={() => { setFilterStatus('todos'); setFilterCategoria('todos'); setFilterPeriodFrom(''); setFilterPeriodTo('') }}>
              Limpar
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
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Categoria</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vencimento</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((conta, idx) => (
                <tr key={conta.id} className={idx !== contas.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{conta.descricao}</p>
                    {conta.fornecedor && <p className="text-xs text-gray-400 mt-0.5">{conta.fornecedor}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{CATEGORIA_LABELS[conta.categoria] || conta.categoria}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(Number(conta.valor))}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{formatDate(conta.vencimento)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={conta.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      {/* Comprovante anexado */}
                      {(conta as ContaPagar).comprovante_url && (
                        <a
                          href={(conta as ContaPagar).comprovante_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Comprovante
                        </a>
                      )}
                      {/* Anexar comprovante */}
                      {!(conta as ContaPagar).comprovante_url && (
                        <>
                          <button
                            onClick={() => { setAttachingId(conta.id); attachInputRef.current?.click() }}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            Anexar
                          </button>
                          <input
                            ref={attachInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f && attachingId) handleAttachToExisting(attachingId, f)
                            }}
                          />
                        </>
                      )}
                      {/* Marcar como pago */}
                      {conta.status !== 'pago' && (
                        <button
                          onClick={() => handleMarkAsPaid(conta.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Marcar pago
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {contas.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">{contas.length} {contas.length === 1 ? 'registro' : 'registros'}</span>
            <span className="text-sm font-semibold text-gray-900">Total: {formatCurrency(total)}</span>
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      <Dialog open={modalOpen} onOpenChange={open => { setModalOpen(open); if (!open) { setFile(null); setFilePreview(null); setForm(defaultForm) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* Upload comprovante com IA */}
            <div className="space-y-2">
              <Label>Comprovante (opcional)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors text-center"
              >
                {analyzing ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> IA analisando...
                    </span>
                  </div>
                ) : filePreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <Image src={filePreview} className="max-h-32 rounded-lg object-contain mx-auto" alt="preview" width={200} height={128} />
                    <span className="text-xs text-gray-400">{file?.name}</span>
                    <span className="text-xs text-green-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Campos preenchidos pela IA</span>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Paperclip className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-600">{file.name}</span>
                    <span className="text-xs text-green-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Campos preenchidos pela IA</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Upload className="w-5 h-5 text-gray-300" />
                    <span className="text-xs text-gray-400">Clique para anexar foto ou PDF</span>
                    <span className="text-xs text-gray-300 flex items-center gap-1"><Sparkles className="w-3 h-3" /> IA vai preencher os campos automaticamente</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descricao *</Label>
              <Input id="descricao" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Conta de energia" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v ?? "outros" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_PAGAR.map(c => (
                      <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c] || c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input id="fornecedor" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Nome" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input id="valor" type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" required />
            </div>

            {/* Toggle recorrente */}
            <div
              className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer select-none"
              onClick={() => setForm(prev => ({ ...prev, recorrente: !prev.recorrente }))}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">Despesa recorrente</p>
                <p className="text-xs text-gray-400 mt-0.5">Cria multiplos lancamentos automaticamente</p>
              </div>
              <div
                className="w-10 h-5 rounded-full transition-colors flex items-center px-0.5"
                style={{ backgroundColor: form.recorrente ? '#2D2566' : '#e5e7eb' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: form.recorrente ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </div>
            </div>

            {form.recorrente ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rec_parcelas">Parcelas *</Label>
                  <Input
                    id="rec_parcelas"
                    type="number"
                    min="1"
                    max="120"
                    value={form.recorrencia_parcelas}
                    onChange={e => setForm({ ...form, recorrencia_parcelas: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec_meses">A cada (meses) *</Label>
                  <Input
                    id="rec_meses"
                    type="number"
                    min="1"
                    max="12"
                    value={form.recorrencia_meses}
                    onChange={e => setForm({ ...form, recorrencia_meses: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec_dia">Dia do mes *</Label>
                  <Input
                    id="rec_dia"
                    type="number"
                    min="1"
                    max="31"
                    value={form.recorrencia_dia}
                    onChange={e => setForm({ ...form, recorrencia_dia: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="vencimento">Vencimento *</Label>
                <Input id="vencimento" type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Input id="observacoes" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Opcional" />
            </div>

            {form.recorrente && form.recorrencia_dia && form.recorrencia_parcelas && form.recorrencia_meses && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
                Serao criados <strong>{form.recorrencia_parcelas} lancamentos</strong> a cada <strong>{form.recorrencia_meses} {parseInt(form.recorrencia_meses) === 1 ? 'mes' : 'meses'}</strong>, todo dia <strong>{form.recorrencia_dia}</strong>, a partir do mes atual.
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || analyzing} className="text-white" style={{ backgroundColor: '#2D2566' }}>
                {saving ? 'Salvando...' : form.recorrente ? `Criar ${form.recorrencia_parcelas} lancamentos` : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

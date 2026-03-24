import { supabase } from './supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function uploadComprovante(file: File, contaId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `contas_pagar/${contaId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('comprovantes')
    .upload(path, file, { upsert: true })

  if (error) {
    console.error('Erro upload:', error)
    return null
  }

  // Bucket privado — signed URL válida por 1 ano
  const { data: signed, error: signErr } = await supabase.storage
    .from('comprovantes')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  if (signErr || !signed) {
    const { data } = supabase.storage.from('comprovantes').getPublicUrl(path)
    return data.publicUrl
  }
  return signed.signedUrl
}

export async function analisarComprovante(file: File) {
  const form = new FormData()
  form.append('file', file)

  // Usar Supabase Edge Function (compatível com static export)
  const res = await fetch(`${SUPABASE_URL}/functions/v1/analisar-comprovante`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) return null

  return res.json() as Promise<{
    descricao?: string
    fornecedor?: string
    valor?: number
    categoria?: string
    data?: string
  }>
}

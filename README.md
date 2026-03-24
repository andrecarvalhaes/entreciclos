# Entreciclos — Sistema Financeiro

Sistema financeiro interno da Lavanderia Entreciclos (Guarapari, ES).

## Stack

- **Next.js 15** + TypeScript + Tailwind CSS
- **Supabase** — banco de dados PostgreSQL
- **Shadcn/ui** — componentes
- **Lucide React** — ícones

## Módulos

### Dashboard (`/`)
- KPIs: Total a Receber, Total a Pagar, Saldo Projetado, Receita do Mês
- Próximas 5 contas a pagar e a receber

### Contas a Pagar (`/contas-a-pagar`)
- Listagem com filtros por status, categoria e período
- Ação de marcar como pago
- Cadastro de nova conta via modal

### Contas a Receber (`/contas-a-receber`)
- Listagem com filtros por status e período
- Ação de marcar como recebido
- Cadastro de nova conta via modal

## Configuração

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Banco de dados

Execute o SQL abaixo no Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS contas_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  fornecedor TEXT,
  valor NUMERIC(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  pago_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'maquina',
  valor NUMERIC(10,2) NOT NULL,
  data_prevista DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  recebido_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

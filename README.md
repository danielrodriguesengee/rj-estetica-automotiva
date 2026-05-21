# RJ Estética Automotiva — Deploy Guide

## Estrutura do projeto

```
rj-estetica/
├── netlify.toml                  ← config do Netlify
├── package.json                  ← deps das functions
├── netlify/
│   └── functions/
│       ├── _gcal.js              ← helper compartilhado (Google Auth)
│       ├── book.js               ← POST /api/book
│       ├── slots.js              ← GET  /api/slots?date=YYYY-MM-DD
│       └── cancel.js             ← POST /api/cancel
└── frontend/
    ├── index.html                ← site completo
    └── image/                    ← fotos dos serviços (.webp)
```

---

## Passo a passo para ir ao ar

### 1. Service Account — Google Calendar

1. Acesse https://console.cloud.google.com
2. Crie um projeto (ex: "rj-estetica")
3. Ative a **Google Calendar API**
   - APIs & Services → Library → "Google Calendar API" → Enable
4. Crie uma Service Account
   - APIs & Services → Credentials → Create Credentials → Service Account
   - Nome: `rj-estetica-bot`
   - Role: não precisa (deixe em branco)
   - Finish
5. Gere a chave JSON
   - Clique na service account criada → Keys → Add Key → JSON
   - Salve o arquivo (esse é o `credentials.json`)
6. **Compartilhe o calendário com a service account**
   - Abra o Google Agenda → configurações do calendário desejado
   - "Compartilhar com pessoas específicas"
   - Cole o e-mail da service account (ex: `rj-estetica-bot@seu-projeto.iam.gserviceaccount.com`)
   - Permissão: **"Fazer alterações nos eventos"**
7. Copie o **Calendar ID** (nas configurações do calendário → "Endereço do calendário")
   - Parece com: `abc123@group.calendar.google.com`
   - Para o calendário principal: use `primary`

---

### 2. Variáveis de ambiente no Netlify

No Netlify: **Site → Site configuration → Environment variables → Add variable**

| Variável | Valor |
|---|---|
| `GOOGLE_CREDENTIALS` | Cole todo o conteúdo do `credentials.json` (o JSON inteiro) |
| `CALENDAR_ID` | ID do calendário (ou `primary`) |
| `CALLMEBOT_PHONE` | Seu número com código do país: `+5537984243487` |
| `CALLMEBOT_APIKEY` | Sua APIKEY do CallMeBot (ex: `7337266`) |

> ⚠️ **Nunca** suba o `credentials.json` para o repositório. Ele já está no `.gitignore`.

---

### 3. Deploy

```bash
# 1. Certifique-se que o repositório está correto
git add .
git commit -m "feat: netlify functions + service account"
git push

# 2. O Netlify detecta o netlify.toml e faz o deploy automaticamente
```

Se o Netlify não pegar automaticamente:
- Site → Deploys → Trigger deploy → Deploy site

---

### 4. Verificar se funcionou

Acesse: `https://seu-site.netlify.app/.netlify/functions/slots?date=2026-06-01`

Deve retornar:
```json
{ "date": "2026-06-01", "booked": [] }
```

Se aparecer `{"error": "Variável GOOGLE_CREDENTIALS não encontrada"}`, a env var não foi salva — revise o passo 2.

---

### 5. Fotos dos serviços (slider)

Coloque as imagens na pasta `frontend/image/` com esses nomes exatos:

| Serviço | Arquivo |
|---|---|
| Lavagem Simples | `lavagem-simples.webp` |
| Lavagem Técnica Premium | `lavagem-tecnica-premium.webp` |
| Higienização Interna Completa | `higienizacao-interna-completa.webp` |
| Polimento Comercial | `polimento-comercial.webp` |
| Polimento Técnico 3 Etapas | `polimento-tecnico-3-etapas.webp` |
| Vitrificação de Pintura | `vitrificacao-de-pintura.webp` |
| Detalhamento Completo | `detalhamento-completo.webp` |
| Cristalização de Pintura | `cristalizacao-de-pintura.webp` |
| Limpeza Técnica de Motor | `limpeza-tecnica-de-motor.webp` |
| Repelente de Chuva | `repelente-de-chuva.webp` |
| Restauração de Faróis | `restauracao-de-farois.webp` |

Dica: use `.webp` para melhor performance. Tamanho recomendado: 600×400px.

---

### 6. Atualizar serviços (sem mexer no código)

Edite o JSON no npoint.io:
- URL: https://api.npoint.io/ca31c753f52a34054c99
- Clique em Edit e salve. O site reflete na próxima carga.

---

## Fluxo completo do agendamento

```
Cliente clica "Agendar"
    ↓
Frontend chama GET /api/slots?date=X
    ↓
slots.js consulta Google Calendar (service account)
    ↓
Retorna horários ocupados → frontend trava os slots
    ↓
Cliente preenche dados e confirma
    ↓
Frontend chama POST /api/book
    ↓
book.js cria evento no Google Calendar
    ↓
book.js dispara mensagem CallMeBot → WhatsApp do dono
    ↓
Frontend mostra toast de confirmação ✅
```

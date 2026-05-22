# RJ Estética Automotiva — Documentação do Projeto

## Estrutura do projeto

```
rj-estetica-automotiva/
├── netlify.toml                    ← Configuração de build e redirects do Netlify
├── package.json                    ← Dependências das Netlify Functions (googleapis)
├── .gitignore                      ← Ignora credentials.json, node_modules, .env
├── credentials.json                ← ⚠️ NÃO SUBIR — Service Account local (só dev)
│
├── netlify/
│   └── functions/
│       ├── _gcal.js                ← Helper: autentica Google Calendar via Service Account
│       ├── _phone.js               ← Helper: normaliza telefones brasileiros + link wa.me
│       ├── book.js                 ← POST /api/book — cria evento + notifica WhatsApp
│       ├── slots.js                ← GET  /api/slots?date=YYYY-MM-DD — retorna horários ocupados
│       └── cancel.js               ← POST /api/cancel — cancela evento + notifica WhatsApp
│
└── frontend/
    ├── index.html                  ← Site completo (HTML + CSS + JS inline)
    ├── logo.webp                   ← Logo da empresa
    ├── icone.ico                   ← Favicon
    └── image/                      ← 📸 Fotos dos serviços (ver seção abaixo)
```

---

## Variáveis de ambiente (Netlify)

**Netlify → Site configuration → Environment variables**

| Variável             | Valor                                      | Descrição                                      |
|----------------------|--------------------------------------------|------------------------------------------------|
| `GOOGLE_CREDENTIALS` | Conteúdo completo do `credentials.json`    | Service Account para acesso ao Google Calendar |
| `CALENDAR_ID`        | ID do calendário (ex: `abc123@group...`)   | Calendário onde os eventos são criados         |
| `CALLMEBOT_PHONE`    | `+5537984243487` (sem o 9 extra)           | Seu WhatsApp que recebe as notificações        |
| `CALLMEBOT_APIKEY`   | Chave gerada pelo CallMeBot                | Autenticação da API gratuita                   |
| `DEFAULT_DDD`        | `37` (opcional)                            | DDD assumido quando cliente não informa        |

> ⚠️ **Nunca** suba o `credentials.json` para o repositório. Ele já está no `.gitignore`.

---

## Serviços de terceiros utilizados

### Google Calendar (Service Account)
- **O que faz:** armazena os agendamentos como eventos no Google Agenda
- **Tipo:** Service Account (autenticação server-to-server, sem login de usuário)
- **Console:** https://console.cloud.google.com — projeto `meucalendarioapi-496902`
- **API ativada:** Google Calendar API
- **Service Account:** `rj-estetica-bot@meucalendarioapi-496902.iam.gserviceaccount.com`
- **Permissão necessária:** calendário compartilhado com a service account com acesso "Fazer alterações nos eventos"

### CallMeBot (WhatsApp gratuito)
- **O que faz:** envia notificações WhatsApp para o dono a cada agendamento ou cancelamento
- **Custo:** gratuito, sem limite mensal declarado
- **Limitação:** envia apenas para o número que ativou o bot (seu número pessoal)
- **Ativação:** mande `I allow callmebot to send me messages` para `+34698289873` no WhatsApp
- **Docs:** https://www.callmebot.com/blog/free-api-whatsapp-messages/

### npoint.io (JSON como API)
- **O que faz:** hospeda o JSON de configuração dos serviços (catálogo, horários, regras)
- **URL:** https://api.npoint.io/ca31c753f52a34054c99
- **Editar:** https://www.npoint.io/docs/ca31c753f52a34054c99
- **Atualizar serviços sem mexer no código:** edite o JSON no npoint e salve — o site reflete na próxima carga

---

## Fotos dos serviços

### Convenção de nomenclatura

As imagens ficam em `frontend/image/` e são carregadas automaticamente pelo slider e pelos cards.
O nome do arquivo é gerado a partir do nome do serviço via `slugify()`:

**Regra:** minúsculas + sem acentos + espaços viram hífens + extensão `.webp`

| Serviço no JSON                  | Nome do arquivo esperado                    |
|----------------------------------|---------------------------------------------|
| Lavagem Simples                  | `lavagem-simples.webp`                      |
| Lavagem Técnica Premium          | `lavagem-tecnica-premium.webp`              |
| Higienização Interna Completa    | `higienizacao-interna-completa.webp`        |
| Polimento Comercial              | `polimento-comercial.webp`                  |
| Polimento Técnico 3 Etapas       | `polimento-tecnico-3-etapas.webp`           |
| Vitrificação de Pintura          | `vitrificacao-de-pintura.webp`              |
| Detalhamento Completo            | `detalhamento-completo.webp`                |
| Cristalização de Pintura         | `cristalizacao-de-pintura.webp`             |
| Limpeza Técnica de Motor         | `limpeza-tecnica-de-motor.webp`             |
| Repelente de Chuva               | `repelente-de-chuva.webp`                   |
| Restauração de Faróis            | `restauracao-de-farois.webp`                |

### Múltiplas fotos por serviço (slider)

O slider suporta **múltiplas imagens do mesmo serviço** usando sufixo numérico:

```
frontend/image/
├── polimento-comercial.webp          ← foto principal
├── polimento-comercial-2.webp        ← foto alternativa
├── polimento-comercial-3.webp        ← foto alternativa
├── lavagem-simples.webp
├── lavagem-simples-2.webp
└── ...
```

**Para ativar as fotos extras no slider**, adicione no array `SLIDER_DEFS` do `index.html`
entradas com o mesmo label e sufixo, ou use a pasta `image/` com os sufixos — o slider
já está preparado para carregar `slug.webp`, `slug-2.webp`, `slug-3.webp` automaticamente
se você adicionar as entradas correspondentes.

### Especificações técnicas das imagens

| Propriedade       | Recomendação                                              |
|-------------------|-----------------------------------------------------------|
| Formato           | `.webp` (melhor compressão e qualidade)                   |
| Dimensões         | 800×540px (proporção 3:2, ideal para cards horizontais)   |
| Peso máximo       | 150KB por imagem                                          |
| Estilo            | Fotos reais do serviço, ambiente bem iluminado            |
| Tom               | Profissional, detalhes do processo visíveis               |
| Conversão         | Use Squoosh (squoosh.app) para converter PNG/JPG → WebP   |

### Dicas de UX para as fotos (baseado em boas práticas da área)

- **Mostre o processo, não só o resultado** — foto do profissional aplicando o polimento
  tem mais engajamento que só o carro brilhando
- **Detalhes próximos** — close da pintura, reflexo no capô, interior limpo
- **Antes e depois** — se tiver, use como segunda foto do serviço (`-2.webp`)
- **Iluminação** — luz natural ou estúdio; evitar sombras duras
- **Consistência** — mesmo estilo visual em todas as fotos (tom de cor, enquadramento)

---

## Normalização de telefone (`_phone.js`)

O helper aceita qualquer formato e sempre retorna `+55DDXXXXXXXXX`:

| Cliente digita        | Resultado normalizado  | Observação                     |
|-----------------------|------------------------|--------------------------------|
| `984243487`           | `+5537984243487`       | Sem DDD → assume DEFAULT_DDD   |
| `37984243487`         | `+5537984243487`       | Com DDD 37                     |
| `11987654321`         | `+5511987654321`       | DDD diferente respeitado       |
| `(31) 9 9999-8888`    | `+5531999998888`       | Formatação variada             |
| `5511987654321`       | `+5511987654321`       | Com DDI sem o +                |
| `+55 37 98424-3487`   | `+5537984243487`       | Formato completo               |

O `DEFAULT_DDD` padrão é `37`. Para mudar, adicione a variável `DEFAULT_DDD` no Netlify.

---

## Lógica de bloqueio de horários

O sistema leva em conta **início E fim** de cada evento existente.
Um slot é bloqueado se causar qualquer sobreposição com um evento já agendado.

**Exemplo:** evento das 08:00 às 10:00 (120 min)
- 07:00 → ✅ livre (termina às 08:00, sem sobreposição)
- 07:30 → ❌ bloqueado (terminaria às 09:30, sobreposição com 08:00–10:00)
- 08:00 → ❌ bloqueado (início exato do evento)
- 08:30 → ❌ bloqueado (dentro do evento)
- 10:00 → ✅ livre (começa quando o anterior termina)

---

## Notificações WhatsApp

### Novo agendamento (vai para o dono)
```
🚗 *NOVO AGENDAMENTO*

👤 Cliente: João Silva
📞 WhatsApp: +5537989924162
🚘 Veículo: Ford Fusion (Sedan)
🔧 Serviço: Polimento Comercial
➕ Extras: Higienização Interna Completa
📅 Data: 22/05/2026 às 09:00
💰 Total: R$ 770,00
💬 Falar com cliente: https://wa.me/5537989924162?text=...

RJ Estética Automotiva
```

### Cancelamento (vai para o dono)
```
❌ *AGENDAMENTO CANCELADO*

👤 Cliente: João Silva
📞 WhatsApp: +5537989924162
📋 Serviço: Polimento Comercial — João Silva
📅 Era: 22/05/2026, 09:00:00

RJ Estética Automotiva
```

---

## Deploy e atualização

### Primeiro deploy
```bash
git add .
git commit -m "feat: initial deploy"
git push
```
O Netlify detecta o `netlify.toml` e faz o build automaticamente.

### Atualizar o site
```bash
git add .
git commit -m "descrição da mudança"
git push
```

### Forçar redeploy sem mudança de código
Netlify → Deploys → Trigger deploy → Deploy site

### Atualizar serviços/preços
Edite em https://www.npoint.io/docs/ca31c753f52a34054c99 e salve.
Nenhum deploy necessário — o site busca os dados a cada carregamento.

### Verificar se as functions estão funcionando
```bash
# Slots (deve retornar { date, busy: [] } se não há eventos)
curl https://rjesteticaautomotiva.netlify.app/.netlify/functions/slots?date=2026-06-02

# Logs em tempo real
# Netlify → Functions → selecionar function → ver logs
```

---

## Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `client_email não encontrado` | `credentials.json` é OAuth2, não Service Account | Gere uma chave de Service Account no Google Cloud |
| `Calendar API not enabled` | API não ativada no projeto | Acesse o link do erro e clique Enable |
| Eventos não aparecem na agenda | `CALENDAR_ID` incorreto | Compartilhe o calendário correto com a service account e use o ID dele |
| WhatsApp não chega | Variáveis não salvas ou APIKEY expirada | Verifique env vars no Netlify; reative CallMeBot se necessário |
| Horários não bloqueiam | `slots.js` retornando `booked` em vez de `busy` | Versão antiga — atualize para a versão com intervalos de colisão |
| Número normalizado errado | Cliente digitou sem DDD e DEFAULT_DDD não configurado | Adicione `DEFAULT_DDD=37` nas env vars do Netlify |

# Portal do Cliente para Escritórios de Contabilidade

MVP da Reforged Solutions. Clientes enviam XMLs e extratos num só lugar; o escritório vê quem enviou, quem falta, aprova ou pede ajuste e cobra por WhatsApp.

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # checagem de tipos + build de produção
```

Deploy: suba para o GitHub e importe na Vercel (sem variáveis de ambiente).

## O que já faz

- **Entrada de demo**: escolha "Sou do escritório" ou entre como qualquer um dos 6 clientes fictícios.
- **Painel do escritório**: KPIs do fechamento, progresso por cliente, faturamento lido dos XMLs, próximos vencimentos, atividade recente, botão **Cobrar** (abre o WhatsApp com a mensagem pronta listando o que falta).
- **Detalhe do cliente**: arquivos enviados, **Aprovar** / **Pedir ajuste** (com motivo), obrigações do regime.
- **Área do cliente**: checklist do mês, upload com arrastar e soltar, botão "Usar XMLs de exemplo" (para a demo funcionar sem arquivo real), aviso de ajuste pedido, faturamento atualizado na hora.
- **Leitor de XML** (no navegador): NF-e/NFC-e (`vNF`) e NFS-e (`vServ`, `ValorServicos`, `vLiq`); notas canceladas (cStat 101/151) são ignoradas na soma.
- **Estado salvo no navegador** (localStorage). Botão "Resetar demo" volta ao seed.

## Personalizar para um escritório

Edite só `lib/site.config.ts`: nome, cor da marca, WhatsApp do escritório e o seu WhatsApp comercial (`poweredBy.whatsapp`, **troque o número placeholder**).

## Importante

- As **datas de vencimento são ilustrativas** (`lib/obligations.ts`): só antecipam fim de semana, sem feriados nem regras municipais. Para uso real, troque por uma tabela por município/regime mantida pelo escritório.
- Os dados são fictícios e ficam só no navegador. Não há login real nem armazenamento de arquivos.

## Próximos passos (versão paga / piloto)

1. Supabase: auth real (escritório e cliente), Storage para os arquivos e RLS por escritório. O `lib/store.tsx` concentra todas as ações, então é o ponto de troca.
2. Alertas automáticos de prazo e cobrança por WhatsApp (API oficial ou provedor).
3. Exportar relatório de faturamento do mês (Excel).
4. Multi-escritório com domínio e marca próprios.

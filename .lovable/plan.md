# Comprovante de saque (PDF + imagem)

## O que será entregue

Na tela de detalhes do saque (`/withdraw/{id}`), um bloco novo "Comprovante" com dois botões:

- **Baixar PNG** — imagem pronta para enviar no WhatsApp/redes.
- **Baixar PDF** — mesmo comprovante em documento A4.

O comprovante é gerado no próprio celular do usuário, a partir dos dados reais do saque já carregados na tela. Nada novo é salvo no banco.

## Conteúdo do comprovante

- Logo Infinity Gain no topo, fundo escuro com o gradiente azul → rosa da marca.
- Selo de status (Solicitado / Processando / Concluído / Rejeitado) com a cor correspondente.
- Valor líquido em destaque, mais valor bruto e taxa.
- Chave PIX e tipo (CPF ou Telefone).
- Data e hora da solicitação e da última atualização.
- Código do comprovante (ID do saque) e rodapé com o endereço do site.

A chave PIX aparece **parcialmente mascarada** por padrão (ex.: `123.***.**9-04`), com um interruptor "Mostrar chave completa" caso o usuário queira o comprovante integral. Isso evita que prints publicados exponham CPF ou telefone.

O botão só fica disponível quando o saque não está em estado de erro de carregamento; para saques rejeitados o comprovante sai marcado como "Rejeitado", sem parecer pagamento efetuado.

## Detalhes técnicos

- Novo componente `src/components/WithdrawReceipt.tsx` que desenha o comprovante em um `<canvas>` (1080×1350, boa qualidade para redes) usando as fontes do sistema já em uso.
- PNG: `canvas.toBlob()` + download via link temporário.
- PDF: nova dependência `jspdf`; o PNG gerado é inserido numa página A4 centralizada.
- A geração roda apenas no navegador (dentro de handler de clique), sem impacto em SSR.
- Reaproveita `BRL`, `statusMeta` e o tipo `WithdrawalRow` de `WithdrawTracking.tsx`.
- Integração feita em `src/routes/withdraw.$id.tsx`; nenhuma alteração de banco, RPC ou política de acesso.

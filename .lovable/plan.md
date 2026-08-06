# Capturas e gravações de tela: confirmação

## Situação atual

O Infinity Gain é uma aplicação web aberta no navegador do celular. Navegadores não oferecem nenhum mecanismo para bloquear print ou gravação de tela (isso só existe em apps nativos Android/iOS, via FLAG_SECURE ou equivalente).

Portanto:

- Os usuários **podem** tirar print e gravar a tela do saldo, da carteira, do histórico e da solicitação/comprovante de saque.
- Não existe nada no código do projeto que tente impedir isso.
- Nenhuma tela usa proteção anti-captura, marca d'água ou ofuscação.

Ou seja, o material de prova social (print do saldo, print do saque aprovado) já é possível hoje, sem nenhuma alteração.

## Ação

Nenhuma mudança de código necessária. O comportamento desejado já é o comportamento atual.

## Observação de segurança

Prints do histórico de saque expõem a chave PIX cadastrada (CPF ou telefone). Vale orientar os usuários, no Centro de Ajuda, a cobrir esse dado antes de publicar nas redes. Se quiser, isso pode virar uma tarefa futura (aviso na tela de saque ou mascaramento automático da chave no comprovante).

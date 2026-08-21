# OddOne

OddOne é um jogo presencial de dedução social para jogar em grupo usando celulares.

Todos os jogadores recebem o mesmo local, exceto os impostores. Durante a rodada, cada pessoa dá pistas sobre o local sem ser direta demais. O objetivo do grupo é descobrir quem está improvisando, enquanto os impostores tentam passar despercebidos e descobrir qual é o local.

## Jogar

O jogo está disponível diretamente pelo GitHub Pages:

https://coimbrice.github.io/OddOne/

Não é necessário instalar nada ou criar uma conta. Basta abrir o site no navegador.

## Como jogar

1. Uma pessoa cria a partida e adiciona os nomes de todos os jogadores.
2. Escolhe quantos impostores haverá na rodada.
3. O OddOne escolhe aleatoriamente o local e os impostores.
4. A partida gera um QR Code para os outros jogadores entrarem.
5. Cada jogador toca no próprio nome para revelar seu papel.
6. Todos, exceto os impostores, verão o mesmo local.
7. Depois que todos tiverem visto seus papéis, o grupo pode sortear quem começa.
8. Cada jogador dá uma pista sobre o local.
9. O grupo tenta descobrir quem são os impostores.
10. Ao final da rodada, os impostores podem ser revelados. O local continua escondido até ser revelado separadamente.

Se alguém precisar sair durante a partida, o jogador também pode ser removido. O jogo informa se a pessoa removida era ou não um dos impostores. Se ainda houver outros impostores na partida, a rodada continua.

## Recursos

- Partidas para 3 ou mais jogadores
- Quantidade configurável de impostores
- Sorteio automático dos impostores
- Sorteio automático do local
- Diversos locais possíveis
- Entrada por QR Code
- Entrada pelo código da partida
- Revelação individual dos papéis
- Sorteio de quem começa
- Remoção de jogadores durante a rodada
- Continuação da rodada enquanto ainda houver impostores
- Revelação destacada dos impostores
- Revelação separada do local
- Interface responsiva para celulares e computadores
- Tema claro e escuro conforme a preferência do sistema
- Nenhuma conta ou cadastro necessário

## Como as partidas funcionam

OddOne é uma aplicação web estática e não utiliza um servidor próprio para armazenar partidas.

As informações necessárias para entrar em uma rodada são incluídas no próprio link compartilhado. O QR Code gerado pelo jogo contém esse link, permitindo que os outros jogadores entrem diretamente pelo navegador.

Por isso, não é necessário criar uma conta, manter uma sala em um servidor ou instalar um aplicativo.

## Tecnologias

O projeto utiliza:

- HTML
- CSS
- JavaScript
- Web Crypto API
- QRCode.js
- html5-qrcode

## Estrutura do projeto

```text
OddOne/
├── index.html
├── styles.css
├── script.js
└── README.md
```

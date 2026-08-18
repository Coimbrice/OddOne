# OddOne

OddOne é um jogo presencial de dedução social para jogar em grupo usando celulares.

Todos os jogadores recebem o mesmo local, exceto uma pessoa: o impostor. Durante a rodada, cada jogador dá pistas sobre o local sem ser direto demais. O objetivo do grupo é descobrir quem está improvisando, enquanto o impostor tenta passar despercebido e descobrir qual é o local.

## Jogar

O jogo está disponível diretamente pelo GitHub Pages:

https://coimbrice.github.io/OddOne/

Não é necessário instalar nada ou criar uma conta. Basta abrir o site no navegador.

## Como jogar

1. Uma pessoa cria a partida e adiciona os nomes de todos os jogadores.
2. O OddOne escolhe aleatoriamente um local e um impostor.
3. A partida gera um QR Code para os outros jogadores entrarem.
4. Cada jogador toca no próprio nome para revelar seu papel.
5. Todos, exceto o impostor, verão o mesmo local.
6. Depois que todos tiverem visto seus papéis, o grupo pode sortear quem começa.
7. Cada jogador dá uma pista sobre o local.
8. O grupo tenta descobrir quem é o impostor.
9. Ao final da rodada, o impostor e o local podem ser revelados.

Se alguém precisar sair durante a partida, o jogador também pode ser removido. O jogo informa se a pessoa removida era ou não o impostor.

## Recursos

- Partidas para 3 ou mais jogadores
- Sorteio automático do impostor
- Sorteio automático do local
- Diversos locais possíveis
- Entrada por QR Code
- Entrada pelo código da partida
- Revelação individual dos papéis
- Sorteio de quem começa
- Remoção de jogadores durante a rodada
- Revelação do impostor e do local
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

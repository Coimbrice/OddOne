# OddOneOut

OddOneOut é um jogo presencial de dedução social para jogar em grupo usando celulares.

Todos os jogadores recebem a mesma palavra secreta, exceto os impostores. A palavra vem do tema escolhido: um lugar, um animal, um jogo, uma comida e assim por diante. Durante a rodada, cada pessoa dá pistas sem ser direta demais. O objetivo do grupo é descobrir quem está improvisando, enquanto os impostores tentam passar despercebidos e adivinhar a palavra.

## Jogar

O jogo está no meu site:

https://coimbrice.com/oddoneout/

Este repositório também é publicado pelo GitHub Pages em https://coimbrice.github.io/OddOne/.

Não é necessário instalar nada ou criar uma conta. Basta abrir o site no navegador.

## Como jogar

1. Uma pessoa cria a partida e adiciona os nomes de todos os jogadores.
2. Escolhe o tema e quantos impostores haverá na rodada.
3. O OddOneOut sorteia a palavra e os impostores.
4. A partida gera um QR Code para os outros jogadores entrarem.
5. Cada jogador toca no próprio nome para revelar seu papel.
6. Todos, exceto os impostores, verão a mesma palavra.
7. Depois que todos tiverem visto seus papéis, o grupo pode sortear quem começa.
8. Cada jogador dá uma pista sobre a palavra.
9. O grupo tenta descobrir quem são os impostores.
10. Ao final da rodada, os impostores podem ser revelados. A palavra continua escondida até ser revelada separadamente.

Se alguém precisar sair durante a partida, o jogador também pode ser removido. O jogo informa se a pessoa removida era ou não um dos impostores. Se ainda houver outros impostores na partida, a rodada continua.

## Recursos

- Partidas para 3 ou mais jogadores
- Quantidade configurável de impostores
- Sorteio automático dos impostores
- Sorteio automático da palavra
- Seis temas: lugares, animais, cantores atuais, jogos, filmes e séries e comidas
- Entrada por QR Code
- Entrada pelo código da partida
- Revelação individual dos papéis
- Sorteio de quem começa
- Remoção de jogadores durante a rodada
- Continuação da rodada enquanto ainda houver impostores
- Revelação destacada dos impostores
- Revelação separada da palavra
- Interface responsiva para celulares e computadores
- Nenhuma conta ou cadastro necessário

## Como as partidas funcionam

OddOneOut é uma aplicação web estática e não utiliza um servidor próprio para armazenar partidas.

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
├── styles.css           # estilos específicos do jogo
├── script.js
└── assets/
    ├── base.css         # estilos compartilhados com coimbrice.com
    ├── party-games.css  # componentes comuns aos jogos de grupo do site
    ├── game-data.js     # temas e palavras
    └── fonts/
```

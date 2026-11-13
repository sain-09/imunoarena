# ImunoArena

Campeonato de imunologia no navegador, com uma sala compartilhada por site e até 40 participantes. A turma joga ao mesmo tempo, cada pessoa no seu celular. O placar é atualizado depois que todos enviam o resultado ou a prova encerra.

## Como publicar no Netlify

1. Extraia o ZIP. Coloque o conteúdo da pasta ImunoArena na raiz de um repositório Git, incluindo netlify.toml, package.json e a pasta netlify.
2. No Netlify, importe o repositório e faça o deploy. O netlify.toml configura o comando npm run build, a pasta pública dist e a função sala.
3. Abra a URL HTTPS publicada e entre com seu nome antes de compartilhar o link com a turma. O primeiro participante que entra controla o início e a troca de prova.
4. Envie a mesma URL para todos. A turma digita o nome, escolhe o personagem e aguarda o início. Após o placar final, quem abriu a sala pode iniciar outro campeonato.

A sala usa Netlify Functions e Netlify Blobs. Para esta versão, publique pelo repositório integrado ao Netlify. Para testar localmente, instale as dependências com npm install e execute npx netlify dev. O Live Server sozinho serve os arquivos estáticos, mas não executa a função da sala.

O papel de anfitrião fica vinculado ao navegador que abriu a sala. Se a página for recarregada, reabra a mesma URL no mesmo navegador. Quem chega com o campeonato em andamento acompanha o placar e entra no próximo lobby.

## Provas

1. **Fábrica de anticorpos.** Use o joystick para andar até uma das cinco estações. Você pode trocar até o cronômetro zerar. A estação correta vale de 100 a 1.000 pontos conforme o tempo restante ao entrar nela.
2. **Corrida da hemácia.** Leve oxigênio até o músculo contornando as fileiras de hemácias. As três primeiras colocações valem 700, 500 e 300. Os demais que concluírem ganham 100. Tempos iguais recebem a mesma colocação. A pergunta vale 300.
3. **Alvo infectado.** Toque nas células com o fragmento triangular. Cada marcação incorreta anula um acerto. A prática vale até 700 e a pergunta vale 300.

O joystick aparece nas provas com movimentação. WASD e setas também funcionam. As perguntas, os tempos e os valores podem ser editados em js/config.js.

As corridas são executadas em pistas individuais e comparadas pelo tempo. A sala sincroniza largadas e placares. Ela foi feita para uma turma de confiança: o servidor calcula os pontos, usando os tempos de corrida e de entrada na estação registrados pelos celulares.

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

Cada prova começa com uma largada sincronizada de cinco segundos, com o objetivo da missão. Na fábrica, a pergunta abre junto com a prova. Na corrida e no recife, a pergunta aparece depois da atividade. Em celulares, você pode jogar com a tela em pé ou deitada.

1. **Fábrica de anticorpos.** Use o joystick para atravessar as bancadas do linfonodo até uma das cinco estações. Você pode trocar até o cronômetro zerar. A estação correta vale de 100 a 1.000 pontos conforme o tempo restante ao entrar nela.
2. **Corrida da hemácia.** Leve oxigênio até o músculo contornando as fileiras de hemácias e cruzando os bloqueios móveis. As três primeiras colocações valem 700, 500 e 300. Os demais que concluírem ganham 100. Tempos iguais recebem a mesma colocação. A pergunta vale 300.
3. **Alvo infectado.** Toque nas células com o fragmento indicado. Explore o recife com o joystick e use Marcar célula ao se aproximar de um alvo. A amostra de 20 células varia a cada campeonato e é igual para toda a turma. Você pode manter até sete marcações e desfazê-las para trocar. A pergunta abre automaticamente após os 44 segundos de inspeção, com 15 segundos para responder. Cada marcação incorreta anula um acerto. A prática vale até 700 e a pergunta vale 300.

4. **Patrulha em alerta.** Reparta três leucócitos entre pele, pulmão e intestino. Cinco ondas mostram ameaças diferentes. A distribuição é registrada ao fim de cada onda. A prática vale até 700 pela melhor contenção possível com os três patrulheiros.
5. **Primeira linha.** Toque em dois cartões para trocar suas posições e ordenar os acontecimentos da entrada de um agente por um corte na pele.
6. **Escola da imunidade.** Conecte cada etapa da vacinação ao seu efeito seguinte, chegando à formação de memória e à resposta no reencontro.
7. **Vaso em alerta.** Ajuste fluxo sanguíneo, permeabilidade e mediadores em um painel de simulação para reproduzir o padrão de tecido inflamado mostrado como referência.
8. **O invasor voltou.** Memorize a assinatura nos primeiros cinco segundos. Depois identifique, em seis encontros, se o agente é o mesmo ou é diferente.

As fases 4–8 têm cenários GLB próprios e controles por toque em painéis de atividade. A atividade termina automaticamente no prazo compartilhado e abre a pergunta por 15 segundos. Cada uma vale até 700 pela prática e mais 300 pela resposta, com total máximo de 8.000 no campeonato. Os sinais usados na simulação de inflamação são representações didáticas.


O joystick aparece nas provas com movimentação. WASD e setas também funcionam. As perguntas, os tempos e os valores podem ser editados em js/config.js.

As corridas têm largada comum e a classificação usa o tempo de cada jogador. Os avatares dos colegas aparecem no cenário com atualização periódica e movimento interpolado. O contato entre jogadores não bloqueia o movimento. Ela foi feita para uma turma de confiança: o servidor calcula os pontos, usando os tempos de corrida e de entrada na estação registrados pelos celulares.

Os três cenários ficam em models/factory.glb, models/race.glb e models/targets.glb, com texturas embutidas. js/arenas.js define os limites e as colisões correspondentes.

Para salas de até 16 jogadores, o movimento tenta usar um canal direto WebRTC. Redes que bloqueiam a conexão direta e salas maiores usam a função de movimento do Netlify. Pontuação e tempos continuam na função da sala.

Os cenários das provas 4–8 usam plantas e objetos próprios. Patrulha reúne três tecidos, Primeira Linha mostra um corte em camadas da pele, Vacinação usa um pavilhão hexagonal, Inflamação mostra uma janela do vaso e Memória usa um arquivo circular de reconhecimento.

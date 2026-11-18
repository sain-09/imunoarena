# ImunoArena

Campeonato de imunologia no navegador, com uma sala compartilhada por site e até 40 participantes. A turma joga ao mesmo tempo, cada pessoa no seu celular. O placar é atualizado depois que todos enviam o resultado ou a prova encerra.

## Como publicar no Netlify

1. Extraia o ZIP. Coloque o conteúdo da pasta ImunoArena na raiz de um repositório Git, incluindo netlify.toml, package.json e a pasta netlify.
2. No Netlify, importe o repositório e faça o deploy. O netlify.toml configura o comando npm run build, a pasta pública dist e a função sala.
3. Abra a URL HTTPS publicada e entre com seu nome antes de compartilhar o link com a turma. O primeiro participante que entra controla o início e a troca de prova.
4. Envie a mesma URL para todos. A turma digita o nome, escolhe o personagem e aguarda o início. Após o placar final, quem abriu a sala pode iniciar outro campeonato.

A sala usa Netlify Functions e Netlify Blobs. Para esta versão, publique pelo repositório integrado ao Netlify. Para testar localmente, instale as dependências com npm install e execute npx netlify dev. O Live Server sozinho serve os arquivos estáticos, mas não executa a função da sala.

Cada abertura da página recebe uma identidade temporária. Abrir o link ou deixar uma aba no menu não inscreve um jogador: é preciso tocar em Entrar na sala. Recarregar a página não restaura automaticamente a participação nem a fase anterior.

Participantes confirmam presença enquanto a página estiver visível. Fechar a página ou usar Sair da sala tenta comunicar a saída imediatamente. Se esse aviso não chegar, a presença expira após 15 segundos sem confirmação, na próxima consulta à sala. Abas em segundo plano param de confirmar presença. Jogadores desconectados deixam de contar na espera por resultados e, se o anfitrião sair, outro participante conectado assume o controle. Os identificadores dos colegas permanecem estáveis para a sincronização dos avatares.

Quando não sobra ninguém conectado, a sala anterior é encerrada e a próxima entrada encontra o lobby da primeira fase, sem pontos anteriores. Estados antigos publicados antes dessa verificação de presença também são descartados. Se outra turma ainda estiver jogando, quem abrir o link fica no menu aguardando um novo campeonato; não entra automaticamente na fase em andamento e não reinicia a partida dos demais.

Na tela de resultado de qualquer fase, o anfitrião pode usar Novo campeonato do início para zerar a pontuação e voltar à fase 1 com os participantes ainda conectados.

## Provas

Cada prova começa com uma explicação e largada sincronizada de 25 segundos, com o objetivo da missão. Na fábrica, a pergunta abre junto com a prova. Na corrida e no recife, a pergunta aparece depois da atividade. Em celulares, você pode jogar com a tela em pé ou deitada.

1. **Fábrica de anticorpos.** Use o joystick para atravessar as bancadas do linfonodo até uma das cinco estações. Você pode trocar até o cronômetro zerar. A estação correta vale de 100 a 1.000 pontos conforme o tempo restante ao entrar nela.
2. **Corrida da hemácia.** Leve oxigênio até o músculo contornando as fileiras de hemácias e cruzando os bloqueios móveis. As três primeiras colocações valem 700, 500 e 300. Os demais que concluírem ganham 100. Tempos iguais recebem a mesma colocação. A pergunta vale até 300, conforme a rapidez.
3. **Alvo infectado.** Toque nas células com o fragmento indicado. Explore o recife com o joystick e use Marcar célula ao se aproximar de um alvo. A amostra de 20 células varia a cada campeonato e é igual para toda a turma. Você pode manter até sete marcações e desfazê-las para trocar. A turma recebe a pergunta quando todos completam as marcações ou termina o prazo de 90 segundos, com 30 segundos para responder. Cada marcação incorreta anula um acerto. A prática vale até 700 e a pergunta vale 300.

4. **Patrulha em alerta.** Caminhe até os invasores que avançam para pele, pulmão e intestino. Neutralize-os por proximidade antes de atingirem o tecido. São três grupos e nove invasores; os que escapam reduzem o aproveitamento da defesa.
5. **Primeira linha.** Carregue as peças dos acontecimentos no mapa e leve-as aos quatro nichos numerados. Os modelos se deslocam com o personagem e ficam nas posições escolhidas. É possível pegar uma peça colocada usando o nicho quando estiver carregando outra peça.
6. **Caminho da vacina.** Só o próximo destino recebe uma marcação. Pegue o sinal na primeira estação e leve-o às próximas seguindo a linha verde. Não é necessário escolher entre quatro destinos nem memorizar uma ordem de botões. As quatro entregas e o tempo de conclusão compõem a prática.
7. **Investigação do inchaço.** Colete plasma em um dos três vazamentos azuis e leve o frasco à bancada de análise. Repita até analisar as três amostras. Não há controles numéricos ou valores para reproduzir. A coleta representa a investigação da saída de líquido dos vasos, e não o fechamento dos vasos.
8. **Reconheça o invasor.** Vá até o projetor e toque em Observar vírus. Após cinco segundos de observação, aparecem seis vírus. No próprio projetor, use Já vi este vírus ou É um vírus novo. Não é necessário correr entre dois dispositivos. Aparência e tipo A/B/C/D identificam o agente, sem depender somente da cor.

As cinco atividades usam joystick, tecla E no computador e um botão de interação que só funciona perto do objeto. Não há painel central de alternativas para realizar a prática. O cenário permanece visível, com instruções curtas no HUD e identificação dos objetos no próprio mapa. As práticas novas duram até 120 segundos e registram a conclusão individual e abrem a pergunta para todos assim que a turma termina ou acaba o prazo. O bônus de rapidez da prática multiplica o aproveitamento por `0,65 + 0,35 × fração de tempo restante`: agir rápido com erros não garante a pontuação máxima.

A explicação da fase dura 25 segundos. As perguntas finais duram 30 segundos; a fábrica tem 45 segundos, a corrida até 100 e o recife até 90. Na fase 3, completar as sete marcações registra o fim da inspeção; assim que todos terminam, a pergunta é liberada para a turma, inclusive se houver marcações erradas, que continuam descontando pontos na inspeção. O servidor registra a conclusão individual da prática e o início compartilhado da pergunta e congela os dados da prática. Uma resposta correta final vale de 105 a 300 pontos conforme o tempo restante; errar vale zero. A fábrica mantém sua fórmula própria de 100 a 1.000 pontos e a corrida mantém a classificação por tempo de chegada. O máximo do campeonato continua sendo 8.000 pontos.

O joystick aparece nas provas com movimentação. WASD e setas também funcionam. As perguntas, os tempos e os valores podem ser editados em js/config.js.

As corridas têm largada comum e a classificação usa o tempo de cada jogador. Os avatares dos colegas aparecem no cenário com atualização periódica e movimento interpolado. O contato entre jogadores não bloqueia o movimento. Ela foi feita para uma turma de confiança: o servidor calcula os pontos, usando os tempos de corrida e de entrada na estação registrados pelos celulares.

Os três cenários ficam em models/factory.glb, models/race.glb e models/targets.glb, com texturas embutidas. js/arenas.js define os limites e as colisões correspondentes.

O movimento usa WebRTC nas oito fases, inclusive para turmas de até 40 pessoas. Até oito participantes usam conexões diretas entre si. Acima disso, o primeiro participante distribui os movimentos da turma por canais WebRTC: cada colega mantém uma conexão com ele, em vez de abrir uma conexão com cada celular. Para turmas grandes, abra a sala no computador do professor e mantenha essa aba visível durante a partida. Se esse navegador ficar indisponível, o caminho HTTP continua funcionando, com maior atraso.

As posições usam pacotes binários de 24 bytes por jogador, enviados a cada 50 ms durante o movimento e com confirmação de presença a cada 250 ms quando parado. Pacotes fora de ordem são descartados, inclusive quando chegam pelo caminho HTTP depois de uma posição mais recente recebida por WebRTC. As conexões começam a ser negociadas no lobby, usam candidatos ICE progressivos e tentam se recuperar após uma falha. O envio descarta amostras quando o canal está congestionado, para evitar acumular movimentos antigos.

A função de movimento HTTP é uma alternativa para conexões indisponíveis. Ela consulta mais frequentemente os colegas que estão sem canal direto e deixa de buscar no armazenamento os que já estão chegando por WebRTC. Pontuação e tempos continuam na função da sala.

### Redes que bloqueiam WebRTC direto

O projeto aceita um serviço TURN, que retransmite o tráfego WebRTC quando a conexão direta é bloqueada. Esse serviço precisa ser contratado ou hospedado separadamente; o projeto não inclui credenciais e não cria um servidor TURN no Netlify. Sem ele, certas redes continuarão dependendo do caminho HTTP, que pode apresentar atraso.

No Netlify, configure estas variáveis no escopo de Functions e publique novamente:

- `IMUNO_TURN_URLS`: endereços do seu serviço separados por vírgulas, por exemplo `turn:seu-servidor:3478,turns:seu-servidor:5349`.
- `IMUNO_TURN_SECRET`: segredo compartilhado de um servidor compatível com TURN REST, como coturn. A função gera credenciais válidas por uma hora, sem entregar o segredo ao navegador.
- Se o serviço fornecer usuário e senha fixos, use `IMUNO_TURN_USERNAME` e `IMUNO_TURN_PASSWORD` no lugar de `IMUNO_TURN_SECRET`. As credenciais TURN são necessariamente entregues aos clientes autorizados; não use chaves administrativas do provedor nesses campos.

Referências: [TURN e bloqueios de rede](https://developers.cloudflare.com/realtime/turn/), [variáveis de ambiente nas Functions](https://docs.netlify.com/build/functions/environment-variables/).

### Verificação

`npm test` executa simulações de 2, 8 e 40 jogadores, troca pelas oito fases, reconexão, descarte de duplicatas, negociação ICE e emissão de credenciais TURN temporárias. Também verifica os dez modelos GLB, os pivôs das animações, os limites de geometria e o cache de cenários, além da expiração de jogadores ausentes, saída, mudança de anfitrião, limpeza de salas antigas e entrada pelo lobby inicial. Os testes não medem a latência real nem o desempenho gráfico dos celulares. Depois de publicar uma mudança no protocolo, todos devem recarregar a página antes de entrar na sala. Teste com dois celulares e depois com a turma, tanto na mesma rede quanto entre Wi-Fi e dados móveis.

### Modelos e memória

Os oito mapas usam aproximadamente 1,04 milhão de triângulos somados, uma redução de 72% em relação aos modelos anteriores. As texturas incorporadas dos cenários foram mantidas. Cada mapa tem entre 77 e 152 mil triângulos, e os oito arquivos somam cerca de 38,3 MiB, antes eram 95,5 MiB.

Os personagens têm cerca de 16 mil triângulos cada e cinco malhas por personagem, com uma paleta de materiais em atlas. Braços e pernas continuam em pivôs independentes para caminhada e comemoração. As instâncias compartilham geometria e materiais; os colegas não geram passagens extras de sombra.

O cache mantém no máximo dois cenários carregados. No resultado de cada prova, ele prepara o próximo mapa; os mais antigos têm geometria, materiais, texturas e imagens liberados. Se um cenário for necessário novamente, ele é recarregado. Em telas com controle por toque, a densidade do canvas 3D fica limitada a 1,5, sem reduzir a resolução dos textos e botões HTML.

Os cenários das provas 4–8 usam plantas e objetos próprios. Patrulha reúne três tecidos, Primeira Linha mostra um corte em camadas da pele, Vacinação usa um pavilhão hexagonal, Inflamação mostra uma janela do vaso e Memória usa um arquivo circular de reconhecimento.

### Leitura e controles no celular

A câmera das fases 4–8 acompanha o personagem durante a prática, com enquadramento próximo. Retrato e paisagem têm layouts próprios e respeitam as áreas seguras da tela. O joystick é exibido tanto nas fases de movimentação inicial quanto nas práticas novas. Botões de ação e resultado ficam acima de uma faixa inferior reservada à marca da hospedagem; Sair da sala fica no canto superior esquerdo. O selo do Netlify não é removido nem alterado pelo jogo.

Cada introdução explica o significado biológico do cenário antes dos comandos. No Recife, os pedestais representam células: os alvos exibem um ícone ilustrativo de fragmento viral igual à amostra. Proteínas próprias, membranas saudáveis e oxigênio são sinais que não devem ser marcados. O HUD identifica o sinal da célula mais próxima. Os ícones foram desenhados no próprio jogo, e não usam emojis. Ao concluir as marcações, o resultado da prática é registrado. Assim que todos os participantes conectados terminam seus objetivos, a pergunta abre para a turma, sem esperar o cronômetro original. Se alguém não concluir, ela abre ao fim do prazo. Todos têm o mesmo início e o mesmo prazo de 30 segundos; o bônus da prática usa o instante em que cada jogador concluiu.

A checagem automatizada em Edge/WebGL verificou joystick nas oito fases em 390×844 e 844×390, distância da câmera nas cinco práticas e ações fora de uma área simulada de selo no rodapé. Isso não substitui teste em Safari/iPhone e Android físicos, nem mede a rede móvel ou a injeção real do selo na publicação.

### Cards e troca de fase

As explicações usam texto escuro sobre fundos claros, com contexto e comandos em blocos separados. Os cards têm bordas cartoon, emblema médico próprio, entrada animada, contador destacado e alternativas com aparecimento curto. A preferência do aparelho por movimento reduzido desativa essas animações. Retrato e paisagem preservam a área de leitura e o rodapé do contador.

A troca de rodada encerra o controlador da atividade anterior e descarta o estado de espera antigo antes de carregar o próximo cenário. Comandos de entrada ou avanço clicados durante uma consulta ficam na fila. Uma exceção ao desenhar a tela é identificada como erro visual e não reenvia uma operação já aceita pelo servidor; falhas temporárias de rede continuam com reconexão automática.

A sequência completa das oito fases foi percorrida em dois contextos Edge/WebGL com backend local de teste. A verificação visual dos cards mediu contraste acima de 7:1 nos dois blocos de explicação, tanto em 390×844 quanto em 844×390, e confirmou a opção de movimento reduzido. Aparelhos físicos e a hospedagem publicada continuam exigindo validação após o deploy.

### Objetivos guiados das fases 6–8

A fase 6 sinaliza apenas o próximo destino; destinos incorretos não consomem uma tentativa. A fase 7 permite carregar uma amostra por vez e mantém a linha apontando para a bancada durante o transporte. Na fase 8, a observação inicial só começa quando o jogador a inicia no projetor, e as duas respostas ficam disponíveis por proximidade após os cinco segundos. As três fases continuam registrando conclusão e acerto da prática no servidor, com bônus por rapidez e pergunta liberada para a turma quando todos terminam.

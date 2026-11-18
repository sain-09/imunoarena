const IMUNO_CONFIG = {
  "introSeconds": 25,
  "roundSeconds": 45,
  "minPoints": 100,
  "maxPoints": 1000,
  "moveSpeed": 7,
  "raceSeconds": 100,
  "quizSeconds": 30,
  "targetSeconds": 90,
  "practicalPoints": 700,
  "quizPoints": 300,
  "racePlaces": [
    700,
    500,
    300,
    100
  ],
  "models": {
    "male": "models/enfermeiro.glb",
    "female": "models/enfermeira.glb"
  },
  "stages": [
    {
      "id": "factory",
      "title": "Fábrica de anticorpos",
      "goal": "Atravesse o linfonodo, contorne as bancadas e fique na estação da resposta até o sinal.",
      "text": "Durante uma infecção, o organismo identifica um agente estranho. Qual célula produz anticorpos?",
      "options": [
        "Hemácias",
        "Linfócitos B (plasmócitos)",
        "Plaquetas",
        "Neutrófilos",
        "Linfócitos T citotóxicos"
      ],
      "correct": "B",
      "explanation": "Plasmócitos são células derivadas de linfócitos B que secretam anticorpos.",
      "context": "Os linfócitos B podem se transformar em plasmócitos, células que secretam anticorpos. As estações representam tipos de células do sangue."
    },
    {
      "id": "race",
      "title": "Corrida da hemácia",
      "goal": "Leve O₂ dos pulmões ao músculo. Escolha a abertura certa nas fileiras e atravesse os bloqueios móveis.",
      "text": "Qual é a função dos glóbulos vermelhos?",
      "options": [
        "Produzir anticorpos",
        "Destruir bactérias",
        "Transportar oxigênio por meio da hemoglobina",
        "Realizar a coagulação",
        "Produzir células de defesa"
      ],
      "correct": "C",
      "explanation": "A hemoglobina das hemácias se liga ao oxigênio nos pulmões e o libera nos tecidos.",
      "context": "As hemácias levam oxigênio dos pulmões até os tecidos. Você fará essa entrega atravessando a corrente sanguínea."
    },
    {
      "id": "targets",
      "title": "Alvo infectado",
      "goal": "Veja o ícone viral da amostra. Explore com o joystick, aproxime-se de cada célula e marque somente as que exibem esse fragmento. Complete 7 marcações; assim que todos terminarem a inspeção, a pergunta abre para a turma.",
      "text": "Qual célula reconhece e destrói células infectadas por vírus?",
      "options": [
        "Hemácia",
        "Plaqueta",
        "Linfócito T citotóxico",
        "Eosinófilo",
        "Basófilo"
      ],
      "correct": "C",
      "explanation": "Linfócitos T citotóxicos reconhecem fragmentos virais apresentados pelas células infectadas e induzem sua morte.",
      "context": "Cada pedestal é uma célula do tecido. As infectadas exibem o fragmento viral da amostra. Você simula o reconhecimento feito por um linfócito T citotóxico. Proteínas próprias, membranas saudáveis e oxigênio não são alvos."
    },
    {
      "id": "patrol",
      "title": "Patrulha em alerta",
      "seconds": 120,
      "goal": "Defenda os três tecidos. Use o joystick para alcançar os invasores e toque em Neutralizar antes que atinjam o tecido. São três grupos, nove invasores no total.",
      "text": "Uma pessoa apresenta baixa quantidade de leucócitos no sangue. Qual consequência pode ocorrer?",
      "options": [
        "Aumento do transporte de oxigênio.",
        "Maior dificuldade de combater infecções.",
        "Aumento da coagulação sanguínea.",
        "Produção excessiva de hemoglobina.",
        "Diminuição da glicose no sangue."
      ],
      "correct": "B",
      "explanation": "Leucócitos participam da defesa do organismo. Uma quantidade reduzida pode dificultar o combate às infecções.",
      "context": "Leucócitos defendem o organismo. Nesta simulação, você representa essa defesa e protege pele, pulmão e intestino. Os vírus roxos são os invasores; alcançar e neutralizar cada um representa a ação das células de defesa. Com poucas células de defesa, fica mais difícil impedir que invasores atinjam os tecidos."
    },
    {
      "id": "barriers",
      "title": "Primeira linha",
      "seconds": 120,
      "goal": "Pegue um acontecimento com o botão Carregar, caminhe até um nicho numerado e coloque. Organize as quatro etapas no próprio mapa.",
      "text": "Sobre a imunidade inata e a imunidade adaptativa, assinale a alternativa correta.",
      "options": [
        "A imunidade inata possui memória imunológica específica.",
        "A imunidade adaptativa atua somente por barreiras físicas.",
        "A imunidade inata é a primeira linha de defesa e atua rapidamente.",
        "A imunidade adaptativa não envolve linfócitos.",
        "Ambas atuam exclusivamente por meio de anticorpos."
      ],
      "correct": "C",
      "explanation": "As barreiras e as respostas rápidas fazem parte da imunidade inata. A resposta adaptativa envolve linfócitos e reconhecimento específico. Os processos se sobrepõem no organismo.",
      "context": "A pele é uma barreira da imunidade inata. Após um corte, o agente entra; a defesa inata reage e a resposta adaptativa específica se desenvolve. Os processos podem se sobrepor. As peças mostram o começo de cada acontecimento."
    },
    {
      "id": "vaccine",
      "title": "Escola da imunidade",
      "seconds": 120,
      "goal": "Percorra as quatro estações na ordem dos efeitos da vacinação. Aproxime-se e transporte o sinal: antígeno, ativação, expansão e memória.",
      "text": "Qual é o objetivo principal da vacinação?",
      "options": [
        "Provocar a doença em sua forma mais grave.",
        "Eliminar todos os leucócitos do organismo.",
        "Estimular proteção e memória imunológica.",
        "Substituir permanentemente os anticorpos naturais.",
        "Impedir a produção de linfócitos."
      ],
      "correct": "C",
      "explanation": "A vacinação apresenta antígenos ou instruções para produzi-los e estimula respostas protetoras e memória imunológica.",
      "context": "A vacina apresenta um antígeno ou instruções para produzi-lo. Isso leva ao reconhecimento, à expansão de células específicas e à formação de memória. O sinal luminoso representa essa sequência; não é uma dose transportada entre órgãos."
    },
    {
      "id": "inflammation",
      "title": "Vaso em alerta",
      "seconds": 120,
      "goal": "Vá aos três mecanismos do vaso. Compare o valor de referência no local, ajuste com Diminuir/Aumentar e fixe cada ajuste.",
      "text": "Vermelhidão, calor, dor e inchaço durante a inflamação acontecem principalmente devido a quê?",
      "options": [
        "Diminuição do fluxo sanguíneo.",
        "Aumento do fluxo sanguíneo e da permeabilidade dos vasos.",
        "Destruição das hemácias pelos anticorpos.",
        "Interrupção da circulação sanguínea.",
        "Diminuição da atividade dos leucócitos."
      ],
      "correct": "B",
      "explanation": "O aumento do fluxo contribui para calor e vermelhidão. A saída de líquido favorece inchaço. Mediadores e pressão no tecido contribuem para a dor.",
      "context": "Durante a inflamação, os vasos mudam seu fluxo e deixam sair mais líquido, enquanto mediadores coordenam a resposta. Os mecanismos representam essas mudanças. Reproduza os valores do tecido de referência em cada mecanismo."
    },
    {
      "id": "memory",
      "title": "O invasor voltou",
      "seconds": 120,
      "goal": "Memorize a assinatura inicial por cinco segundos. Em cada encontro, caminhe ao selo se for o mesmo agente, ou à comporta se for outro. Toque para registrar.",
      "text": "Por que a resposta costuma ser mais rápida e eficiente no segundo contato com o mesmo microrganismo?",
      "options": [
        "As hemácias armazenam informações sobre vírus.",
        "As plaquetas produzem anticorpos específicos.",
        "O organismo deixa de produzir leucócitos.",
        "Células de memória imunológica reconhecem o agente.",
        "O sistema imunológico perde sua capacidade de reação."
      ],
      "correct": "D",
      "explanation": "Células de memória específicas permitem uma resposta adaptativa mais rápida e eficiente quando o mesmo antígeno é encontrado novamente.",
      "context": "Células de memória reconhecem antígenos encontrados antes. O desenho no projetor é uma assinatura molecular ilustrativa do agente. Memorize-o e compare cada reencontro: mesmo agente no selo, diferente na comporta."
    }
  ]
};

if (typeof module !== 'undefined') module.exports = IMUNO_CONFIG;

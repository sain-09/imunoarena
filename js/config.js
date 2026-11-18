const IMUNO_CONFIG = {
  introSeconds: 5,
  roundSeconds: 27,
  minPoints: 100,
  maxPoints: 1000,
  moveSpeed: 7,
  raceSeconds: 65,
  quizSeconds: 15,
  targetSeconds: 44,
  practicalPoints: 700,
  quizPoints: 300,
  racePlaces: [700, 500, 300, 100],
  models: { male: 'models/enfermeiro.glb', female: 'models/enfermeira.glb' },
  stages: [
    {
      id: 'factory', title: 'Fábrica de anticorpos',
      goal: 'Atravesse o linfonodo, contorne as bancadas e fique na estação da resposta até o sinal.',
      text: 'Durante uma infecção, o organismo identifica um agente estranho. Qual célula produz anticorpos?',
      options: ['Hemácias', 'Linfócitos B (plasmócitos)', 'Plaquetas', 'Neutrófilos', 'Linfócitos T citotóxicos'],
      correct: 'B',
      explanation: 'Plasmócitos são células derivadas de linfócitos B que secretam anticorpos.'
    },
    {
      id: 'race', title: 'Corrida da hemácia',
      goal: 'Leve O₂ dos pulmões ao músculo. Escolha a abertura certa nas fileiras e atravesse os bloqueios móveis.',
      text: 'Qual é a função dos glóbulos vermelhos?',
      options: ['Produzir anticorpos', 'Destruir bactérias', 'Transportar oxigênio por meio da hemoglobina', 'Realizar a coagulação', 'Produzir células de defesa'],
      correct: 'C',
      explanation: 'A hemoglobina das hemácias se liga ao oxigênio nos pulmões e o libera nos tecidos.'
    },
    {
      id: 'targets', title: 'Alvo infectado',
      goal: 'Encontre as sete células com o fragmento indicado. Você pode trocar marcações até o tempo acabar. A pergunta abre ao fim da inspeção.',
      text: 'Qual célula reconhece e destrói células infectadas por vírus?',
      options: ['Hemácia', 'Plaqueta', 'Linfócito T citotóxico', 'Eosinófilo', 'Basófilo'],
      correct: 'C',
      explanation: 'Linfócitos T citotóxicos reconhecem fragmentos virais apresentados pelas células infectadas e induzem sua morte.'
    },
    {
      "id": "patrol",
      "title": "Patrulha em alerta",
      "seconds": 35,
      "goal": "Distribua três leucócitos entre pele, pulmão e intestino. Observe as cinco ondas e reposicione a patrulha antes de cada ataque.",
      "text": "Uma pessoa apresenta baixa quantidade de leucócitos no sangue. Qual consequência pode ocorrer?",
      "options": [
        "Aumento do transporte de oxigênio.",
        "Maior dificuldade de combater infecções.",
        "Aumento da coagulação sanguínea.",
        "Produção excessiva de hemoglobina.",
        "Diminuição da glicose no sangue."
      ],
      "correct": "B",
      "explanation": "Leucócitos participam da defesa do organismo. Uma quantidade reduzida pode dificultar o combate às infecções."
    },
    {
      "id": "barriers",
      "title": "Primeira linha",
      "seconds": 32,
      "goal": "Organize os acontecimentos de um corte na pele. Toque em dois cartões para trocar suas posições na sequência.",
      "text": "Sobre a imunidade inata e a imunidade adaptativa, assinale a alternativa correta.",
      "options": [
        "A imunidade inata possui memória imunológica específica.",
        "A imunidade adaptativa atua somente por barreiras físicas.",
        "A imunidade inata é a primeira linha de defesa e atua rapidamente.",
        "A imunidade adaptativa não envolve linfócitos.",
        "Ambas atuam exclusivamente por meio de anticorpos."
      ],
      "correct": "C",
      "explanation": "As barreiras e as respostas rápidas fazem parte da imunidade inata. A resposta adaptativa envolve linfócitos e reconhecimento específico. Os processos se sobrepõem no organismo."
    },
    {
      "id": "vaccine",
      "title": "Escola da imunidade",
      "seconds": 35,
      "goal": "Monte o caminho da vacina até a memória. Escolha um destino para cada etapa do mapa de causa e efeito.",
      "text": "Qual é o objetivo principal da vacinação?",
      "options": [
        "Provocar a doença em sua forma mais grave.",
        "Eliminar todos os leucócitos do organismo.",
        "Estimular proteção e memória imunológica.",
        "Substituir permanentemente os anticorpos naturais.",
        "Impedir a produção de linfócitos."
      ],
      "correct": "C",
      "explanation": "A vacinação apresenta antígenos ou instruções para produzi-los e estimula respostas protetoras e memória imunológica."
    },
    {
      "id": "inflammation",
      "title": "Vaso em alerta",
      "seconds": 35,
      "goal": "Reproduza a inflamação no simulador. Compare o tecido de referência e ajuste fluxo, permeabilidade e mediadores.",
      "text": "Vermelhidão, calor, dor e inchaço durante a inflamação acontecem principalmente devido a quê?",
      "options": [
        "Diminuição do fluxo sanguíneo.",
        "Aumento do fluxo sanguíneo e da permeabilidade dos vasos.",
        "Destruição das hemácias pelos anticorpos.",
        "Interrupção da circulação sanguínea.",
        "Diminuição da atividade dos leucócitos."
      ],
      "correct": "B",
      "explanation": "O aumento do fluxo contribui para calor e vermelhidão. A saída de líquido favorece inchaço. Mediadores e pressão no tecido contribuem para a dor."
    },
    {
      "id": "memory",
      "title": "O invasor voltou",
      "seconds": 35,
      "goal": "Observe a assinatura do primeiro invasor. Depois identifique os reencontros e rejeite os agentes diferentes em seis encontros.",
      "text": "Por que a resposta costuma ser mais rápida e eficiente no segundo contato com o mesmo microrganismo?",
      "options": [
        "As hemácias armazenam informações sobre vírus.",
        "As plaquetas produzem anticorpos específicos.",
        "O organismo deixa de produzir leucócitos.",
        "Células de memória imunológica reconhecem o agente.",
        "O sistema imunológico perde sua capacidade de reação."
      ],
      "correct": "D",
      "explanation": "Células de memória específicas permitem uma resposta adaptativa mais rápida e eficiente quando o mesmo antígeno é encontrado novamente."
    }
  ]
};

if (typeof module !== 'undefined') module.exports = IMUNO_CONFIG;

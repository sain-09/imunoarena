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
      goal: 'Explore o recife, aproxime-se das células e marque as que exibem o fragmento viral indicado.',
      text: 'Qual célula reconhece e destrói células infectadas por vírus?',
      options: ['Hemácia', 'Plaqueta', 'Linfócito T citotóxico', 'Eosinófilo', 'Basófilo'],
      correct: 'C',
      explanation: 'Linfócitos T citotóxicos reconhecem fragmentos virais apresentados pelas células infectadas e induzem sua morte.'
    }
  ]
};

if (typeof module !== 'undefined') module.exports = IMUNO_CONFIG;

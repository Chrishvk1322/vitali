export interface PreguntaEntrevista {
  codigo: string;
  numero: string;
  texto: string;
}

export interface SeccionEntrevista {
  letra: string;
  titulo: string;
  preguntas: PreguntaEntrevista[];
}

export const SECCIONES_ENTREVISTA: SeccionEntrevista[] = [
  {
    letra: "a",
    titulo: "Delimitación de la conducta problema",
    preguntas: [
      { codigo: "a1", numero: "a.1.", texto: "Describa el problema por el que ha venido." },
      { codigo: "a2", numero: "a.2.", texto: "Explique con exactitud qué es lo que le pasa o siente." },
      { codigo: "a3", numero: "a.3.", texto: "Describa detalladamente la última vez que le ocurrió esto." },
    ],
  },
  {
    letra: "b",
    titulo: "Importancia del problema",
    preguntas: [
      {
        codigo: "b1",
        numero: "b.1.",
        texto: "¿Cómo afecta el problema a su vida (en el trabajo, en su casa, en su relación con otras personas)?",
      },
      { codigo: "b2", numero: "b.2.", texto: "¿Cómo afecta el problema a las personas que se relacionan con usted?" },
      { codigo: "b3", numero: "b.3.", texto: "¿En qué medida está interesado en solucionar este problema?" },
    ],
  },
  {
    letra: "c",
    titulo: "Parámetros de la conducta problema",
    preguntas: [
      { codigo: "c1", numero: "c.1.", texto: "¿Cuántas veces le ocurre al día, a la semana, ...?" },
      {
        codigo: "c2",
        numero: "c.2.",
        texto: "Describa con el máximo detalle la vez que el problema tuvo más intensidad, la que fue más fuerte, la que se sintió peor.",
      },
      {
        codigo: "c3",
        numero: "c.3.",
        texto: "Recuerde ahora, también con los máximos detalles que pueda, la vez que el problema tuvo menor intensidad.",
      },
      { codigo: "c4", numero: "c.4.", texto: "¿Cómo sitúa lo que le ocurre ahora en relación con los dos episodios anteriores?" },
      { codigo: "c5", numero: "c.5.", texto: "¿Cuánto tiempo dura la conducta problema cada vez que aparece?" },
    ],
  },
  {
    letra: "d",
    titulo: "Determinantes de la conducta problema",
    preguntas: [
      {
        codigo: "d1",
        numero: "d.1.",
        texto: "¿En qué situaciones aparece (en qué lugares, con qué personas, a qué horas, qué días)?",
      },
      { codigo: "d2", numero: "d.2.", texto: "¿Qué está haciendo usted cuando aparece el problema?" },
      {
        codigo: "d3",
        numero: "d.3.",
        texto: "¿Qué hace usted u otros después, o qué cosas suceden posteriormente?",
      },
      {
        codigo: "d4",
        numero: "d.4.",
        texto: "¿Qué se dice usted cuando ocurre el problema (antes, mientras, después)?",
      },
    ],
  },
  {
    letra: "e",
    titulo: "Evolución y desarrollo",
    preguntas: [
      { codigo: "e1", numero: "e.1.", texto: "¿Cuándo esto que le sucede empezó a ser para usted un problema?" },
      { codigo: "e2", numero: "e.2.", texto: "¿Qué pasó entonces?" },
      {
        codigo: "e3",
        numero: "e.3.",
        texto: "¿El problema ha permanecido igual desde entonces, ha mejorado, ha empeorado? (buscar algún punto de referencia para concretar fechas aproximadas)",
      },
      { codigo: "e4", numero: "e.4.", texto: "¿Qué cosas pasaron entonces?" },
      { codigo: "e5", numero: "e.5.", texto: "¿Qué circunstancias hacen que el problema se agrave, disminuya o desaparezca?" },
      { codigo: "e6", numero: "e.6.", texto: "¿A qué cree que es debido?" },
      { codigo: "e7", numero: "e.7.", texto: "¿A qué «causas» atribuye usted la aparición del problema?" },
    ],
  },
  {
    letra: "f",
    titulo: "Expectativas y objetivos",
    preguntas: [
      {
        codigo: "f1",
        numero: "f.1.",
        texto: "¿Qué ha hecho usted hasta ahora para solucionar su problema (por sí mismo, médicos u otros profesionales que ha visitado, tratamientos que ha seguido, si toma medicación actualmente)?",
      },
      { codigo: "f2", numero: "f.2.", texto: "¿Qué resultados le ha dado?" },
      { codigo: "f3", numero: "f.3.", texto: "¿Qué espera conseguir al finalizar este tratamiento?" },
    ],
  },
];

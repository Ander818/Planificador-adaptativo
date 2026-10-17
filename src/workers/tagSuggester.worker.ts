// Web Worker for background task tag suggestion and semantic categorization
// Processes task titles, descriptions, and user taxonomy off the main UI thread.

export interface TagWorkerRequest {
  id: string;
  title: string;
  description: string;
  category?: string;
  existingUserTags?: string[];
}

export interface TagWorkerResponse {
  id: string;
  suggestedTags: string[];
  confidence: Record<string, number>;
  sourceKeywords: Record<string, string[]>;
}

const STOPWORDS = new Set([
  // Spanish
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'en', 'para', 'por', 'con', 'sin', 'sobre',
  'que', 'del', 'al', 'se', 'su', 'sus', 'como', 'pero', 'mas', 'más', 'este', 'esta', 'estos', 'estas',
  'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquello', 'y', 'o', 'u', 'e', 'ni', 'donde', 'cuando',
  'cual', 'cuales', 'quien', 'quienes', 'cuyo', 'cuya', 'hacer', 'realizar', 'completar', 'crear', 'dar',
  'poner', 'tener', 'estar', 'ser', 'ir', 'todo', 'toda', 'todos', 'todas', 'cada', 'otro', 'otra', 'otros',
  'otras', 'mismo', 'misma', 'mismos', 'mismas', 'tan', 'tanto', 'tanta', 'tantos', 'tantas', 'mucho',
  'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas', 'muy', 'tambien', 'también', 'ademas',
  'además', 'luego', 'entonces', 'asi', 'así', 'solo', 'sólo', 'bien', 'mal', 'ya', 'aqui', 'aquí', 'alli',
  'allí', 'ahi', 'ahí', 'antes', 'despues', 'después', 'durante', 'hasta', 'desde', 'hacia', 'entre',
  // English
  'the', 'and', 'a', 'an', 'in', 'on', 'for', 'with', 'to', 'at', 'by', 'from', 'up', 'about', 'into',
  'over', 'after', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'that', 'this',
  'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him',
  'his', 'she', 'her', 'which', 'who', 'whom', 'whose', 'what', 'where', 'when', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'same', 'so', 'than', 'too', 'very'
]);

interface TaxonomyRule {
  tag: string;
  keywords: string[];
  weight: number;
}

const TAXONOMY_RULES: TaxonomyRule[] = [
  // Engineering & Tech
  {
    tag: 'Arquitectura',
    keywords: ['arquitectura', 'architecture', 'esquema', 'diagrama', 'modelado', 'sistema', 'system design', 'microservicio', 'patron', 'patrón', 'escalabilidad'],
    weight: 1.3
  },
  {
    tag: 'Performance',
    keywords: ['rendimiento', 'performance', 'optimizar', 'optimizacion', 'optimización', 'latencia', 'cuello de botella', 'bottleneck', 'cache', 'profiling', 'lento', 'speed'],
    weight: 1.3
  },
  {
    tag: 'Base de Datos',
    keywords: ['base de datos', 'database', 'sql', 'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'query', 'queries', 'migracion', 'migración', 'tabla', 'indices', 'índices', 'orm'],
    weight: 1.4
  },
  {
    tag: 'Frontend',
    keywords: ['frontend', 'ui', 'ux', 'interfaz', 'componentes', 'react', 'css', 'tailwind', 'estilos', 'pantalla', 'vista', 'responsive', 'accesibilidad', 'a11y', 'web'],
    weight: 1.2
  },
  {
    tag: 'Backend',
    keywords: ['backend', 'servidor', 'server', 'api', 'endpoints', 'controlador', 'rest', 'graphql', 'payload', 'servicio', 'microservice', 'node', 'express'],
    weight: 1.2
  },
  {
    tag: 'Seguridad',
    keywords: ['seguridad', 'security', 'cifrado', 'encriptacion', 'encriptación', 'token', 'jwt', 'oauth', 'autenticacion', 'autenticación', 'permisos', 'vulnerabilidad', 'ssl', 'auth', 'e2ee'],
    weight: 1.4
  },
  {
    tag: 'DevOps',
    keywords: ['devops', 'deploy', 'despliegue', 'ci/cd', 'pipeline', 'docker', 'kubernetes', 'aws', 'gcp', 'cloud', 'servidor', 'produccion', 'producción', 'release', 'staging'],
    weight: 1.3
  },
  {
    tag: 'Testing',
    keywords: ['testing', 'tests', 'pruebas', 'qa', 'unitarias', 'e2e', 'cobertura', 'cypress', 'jest', 'vitest', 'verificacion', 'verificación'],
    weight: 1.3
  },
  {
    tag: 'Bugfix',
    keywords: ['bug', 'bugfix', 'error', 'fallo', 'fix', 'corregir', 'incidencia', 'problema', 'crash', 'parche', 'excepcion', 'excepción'],
    weight: 1.3
  },

  // Strategy & Business
  {
    tag: 'Estrategia',
    keywords: ['estrategia', 'strategy', 'roadmap', 'q1', 'q2', 'q3', 'q4', 'planificacion', 'planificación', 'objetivos', 'okrs', 'kpis', 'vision', 'visión', 'metas'],
    weight: 1.2
  },
  {
    tag: 'Clientes',
    keywords: ['cliente', 'clientes', 'client', 'customer', 'cuenta', 'propuesta', 'onboarding', 'soporte', 'retencion', 'retención', 'feedback cliente'],
    weight: 1.3
  },
  {
    tag: 'Finanzas',
    keywords: ['finanzas', 'finance', 'presupuesto', 'factura', 'facturación', 'costos', 'gastos', 'precio', 'pago', 'ingresos', 'roi', 'inversion', 'inversión'],
    weight: 1.3
  },
  {
    tag: 'Ventas',
    keywords: ['ventas', 'sales', 'lead', 'leads', 'prospecto', 'cierre', 'crm', 'pipeline de ventas', 'comercial', 'pitch'],
    weight: 1.2
  },

  // Meetings & Collaboration
  {
    tag: 'Reunión',
    keywords: ['reunion', 'reunión', 'meeting', 'sync', 'llamada', 'call', '1:1', '1-on-1', 'daily', 'standup', 'alineacion', 'alineación', 'coordinacion', 'coordinación', 'zoom', 'meet'],
    weight: 1.4
  },
  {
    tag: 'Presentación',
    keywords: ['presentacion', 'presentación', 'demo', 'slides', 'diapositivas', 'pitch', 'exposicion', 'exposición', 'showcase'],
    weight: 1.2
  },

  // Operations & Admin
  {
    tag: 'Admin',
    keywords: ['admin', 'tramites', 'trámites', 'papeleo', 'inbox', 'correo', 'correos', 'email', 'emails', 'organizacion', 'organización', 'gestion', 'gestión', 'ordenar'],
    weight: 1.1
  },
  {
    tag: 'Documentación',
    keywords: ['documentacion', 'documentación', 'docs', 'manual', 'guia', 'guía', 'especificacion', 'especificación', 'rfc', 'readme', 'wiki', 'apuntes'],
    weight: 1.2
  },
  {
    tag: 'Legal',
    keywords: ['legal', 'contrato', 'contratos', 'terminos', 'términos', 'politica', 'política', 'rgpd', 'gdpr', 'compliance', 'abogado'],
    weight: 1.4
  },

  // Design & Creative
  {
    tag: 'Diseño',
    keywords: ['diseño', 'design', 'figma', 'prototipo', 'wireframes', 'mockup', 'paleta', 'tipografia', 'tipografía', 'branding', 'logo', 'ilustracion', 'ilustración'],
    weight: 1.3
  },

  // Health, Habit & Wellness
  {
    tag: 'Salud',
    keywords: ['salud', 'health', 'caminata', 'ejercicio', 'entrenamiento', 'gimnasio', 'estiramientos', 'postura', 'pausa', 'ergonomia', 'ergonomía', 'agua', 'almuerzo'],
    weight: 1.3
  },
  {
    tag: 'Recarga',
    keywords: ['recarga', 'descanso', 'desconexion', 'desconexión', 'meditacion', 'meditación', 'respiracion', 'respiración', 'relax', 'siesta'],
    weight: 1.2
  },

  // Learning & Development
  {
    tag: 'Aprendizaje',
    keywords: ['aprendizaje', 'aprender', 'learning', 'lectura', 'libro', 'estudio', 'curso', 'tutorial', 'investigacion', 'investigación', 'paper', 'certificacion', 'certificación'],
    weight: 1.3
  },

  // Priority & Action Types
  {
    tag: 'Urgente',
    keywords: ['urgente', 'urgent', 'asap', 'critico', 'crítico', 'bloqueante', 'emergencia', 'inmediato'],
    weight: 1.4
  },
  {
    tag: 'MVP',
    keywords: ['mvp', 'lanzamiento', 'release', 'version 1.0', 'versión 1.0', 'go-to-market', 'piloto'],
    weight: 1.2
  }
];

export function extractTagsFromText(
  title: string,
  description: string,
  category?: string,
  existingUserTags: string[] = []
): { suggestedTags: string[]; confidence: Record<string, number>; sourceKeywords: Record<string, string[]> } {
  const combinedRaw = `${title} ${description}`;
  const normalized = combinedRaw.toLowerCase();
  
  const scoreMap = new Map<string, number>();
  const sourceKeywords: Record<string, string[]> = {};

  // 1. Check explicit hashtags (#Tag)
  const hashtagMatches = combinedRaw.match(/#([a-zA-Z0-9_\u00C0-\u017F]+)/g);
  if (hashtagMatches) {
    hashtagMatches.forEach((ht) => {
      const tag = ht.slice(1);
      if (tag.length > 1) {
        const canonical = tag.charAt(0).toUpperCase() + tag.slice(1);
        scoreMap.set(canonical, (scoreMap.get(canonical) || 0) + 3.0);
        sourceKeywords[canonical] = [...(sourceKeywords[canonical] || []), `#${tag}`];
      }
    });
  }

  // 2. Check predefined Taxonomy Rules
  for (const rule of TAXONOMY_RULES) {
    let matchedKeywords: string[] = [];
    for (const kw of rule.keywords) {
      // Word boundary check or substring match
      const regex = new RegExp(`\\b${kw.replace('/', '\\/')}\\b`, 'i');
      if (regex.test(normalized)) {
        matchedKeywords.push(kw);
      }
    }

    if (matchedKeywords.length > 0) {
      // Calculate score based on match count, rule weight, and title appearance
      let score = matchedKeywords.length * rule.weight;
      // Bonus if matched inside the title
      for (const kw of matchedKeywords) {
        if (title.toLowerCase().includes(kw)) {
          score += 0.8;
        }
      }
      scoreMap.set(rule.tag, (scoreMap.get(rule.tag) || 0) + score);
      sourceKeywords[rule.tag] = matchedKeywords;
    }
  }

  // 3. User Taxonomy Learning: Check user's own existing tags in other tasks
  if (existingUserTags && existingUserTags.length > 0) {
    const uniqueUserTags = Array.from(new Set(existingUserTags));
    for (const userTag of uniqueUserTags) {
      if (!userTag || userTag.length < 2) continue;
      const lowerTag = userTag.toLowerCase();
      if (STOPWORDS.has(lowerTag)) continue;

      const regex = new RegExp(`\\b${lowerTag}\\b`, 'i');
      if (regex.test(normalized)) {
        const bonus = title.toLowerCase().includes(lowerTag) ? 2.5 : 1.8;
        scoreMap.set(userTag, (scoreMap.get(userTag) || 0) + bonus);
        sourceKeywords[userTag] = [...(sourceKeywords[userTag] || []), userTag];
      }
    }
  }

  // 4. Category-based context reinforcement
  if (category) {
    if (category === 'deep_work') {
      const dwTags = ['Arquitectura', 'Performance', 'Backend', 'Frontend', 'Estrategia'];
      dwTags.forEach((t) => {
        if (scoreMap.has(t)) scoreMap.set(t, scoreMap.get(t)! + 0.3);
      });
    } else if (category === 'meetings') {
      scoreMap.set('Reunión', (scoreMap.get('Reunión') || 0) + 0.5);
    } else if (category === 'health') {
      scoreMap.set('Salud', (scoreMap.get('Salud') || 0) + 0.5);
    } else if (category === 'learning') {
      scoreMap.set('Aprendizaje', (scoreMap.get('Aprendizaje') || 0) + 0.5);
    } else if (category === 'admin') {
      scoreMap.set('Admin', (scoreMap.get('Admin') || 0) + 0.5);
    }
  }

  // 5. Significant Acronyms & Tech Keywords detection (e.g. AWS, SQL, GCP, CRM, OKR, PR, MVP)
  const words = combinedRaw.split(/[\s,;:.()"'\/\\\[\]{}!?]+/);
  for (const w of words) {
    const trimmed = w.trim();
    if (trimmed.length >= 2 && trimmed.length <= 6 && /^[A-Z0-9]+$/.test(trimmed)) {
      if (!['EL', 'LA', 'DE', 'EN', 'UN', 'AL', 'SE', 'CON', 'SIN', 'POR', 'QUE', 'DEL', 'LOS', 'LAS', 'THE', 'AND', 'FOR', 'NOT'].includes(trimmed)) {
        const currentScore = scoreMap.get(trimmed) || 0;
        scoreMap.set(trimmed, currentScore + 1.2);
        sourceKeywords[trimmed] = [...(sourceKeywords[trimmed] || []), trimmed];
      }
    }
  }

  // Sort by confidence score descending
  const sortedEntries = Array.from(scoreMap.entries())
    .filter(([_, score]) => score >= 0.8)
    .sort((a, b) => b[1] - a[1]);

  const maxScore = sortedEntries.length > 0 ? sortedEntries[0][1] : 1;
  const confidence: Record<string, number> = {};
  
  // Pick top 5 suggestions
  const topTags = sortedEntries.slice(0, 5).map(([tag, score]) => {
    // normalized confidence between 0.5 and 0.99
    confidence[tag] = Math.min(0.99, Math.max(0.5, Number((score / (maxScore + 1.5) + 0.35).toFixed(2))));
    return tag;
  });

  return {
    suggestedTags: topTags,
    confidence,
    sourceKeywords
  };
}

// Worker message listener
if (typeof self !== 'undefined' && 'addEventListener' in self) {
  self.addEventListener('message', (event: MessageEvent<TagWorkerRequest>) => {
    const { id, title, description, category, existingUserTags } = event.data;
    const result = extractTagsFromText(title, description, category, existingUserTags);

    const response: TagWorkerResponse = {
      id,
      suggestedTags: result.suggestedTags,
      confidence: result.confidence,
      sourceKeywords: result.sourceKeywords
    };

    self.postMessage(response);
  });
}

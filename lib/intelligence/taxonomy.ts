// ============================================================
// Taxonomia de negócios — nicho › tipo de negócio › subnicho
// ------------------------------------------------------------
// Substitui o NICHE_DB por uma estrutura de EVIDÊNCIA. Cada nó
// declara os sinais que o identificam, o que ele NÃO pode dizer
// (a regra que impedia clínica médica de virar odontologia), a
// meta de conversão e a direção visual.
//
// Para estender: acrescente um nó. Nada de `if category.includes`
// espalhado pelo código.
// ============================================================

export type ConversionGoal =
  | "agendamento"
  | "orcamento"
  | "whatsapp"
  | "cardapio"
  | "pedido"
  | "visita"
  | "consulta"
  | "matricula"
  | "contato";

/** Seções disponíveis no renderer; a ordem vem do nó da taxonomia */
export type SectionKind =
  | "trust"
  | "services"
  | "about"
  | "team"
  | "gallery"
  | "reviews"
  | "location"
  | "process"
  | "cta";

export type VisualDirection =
  | "medical-clean"
  | "medical-premium"
  | "dental-clean"
  | "beauty-luxury"
  | "beauty-modern"
  | "food-editorial"
  | "food-bold"
  | "real-estate-premium"
  | "legal-authority"
  | "corporate-clean"
  | "automotive-performance"
  | "industrial-technical"
  | "local-service-modern"
  | "fitness-energy"
  | "pet-friendly"
  | "education-bright";

export interface NicheNode {
  /** `saude.clinica_medica.dermatologia` */
  id: string;
  mainNiche: string;
  businessType: string;
  subNiche?: string;
  label: string;

  /**
   * Termos que praticamente decidem a classificação sozinhos.
   * Devem ser específicos: "odonto" é forte, "clínica" não é.
   */
  strongSignals: string[];
  /** Contribuem, mas não decidem */
  weakSignals: string[];

  /**
   * Vocabulário proibido na copy deste nó. É o que impede a clínica
   * médica de falar em implante e clareamento.
   */
  bannedVocabulary?: string[];

  conversionGoal: ConversionGoal;
  ctaPrimary: string;
  ctaSecondary?: string;

  visualDirection: VisualDirection;
  /** Ordem das seções — muda por tipo de negócio, não é fixa */
  sectionFlow: SectionKind[];

  /** Rótulo da seção de serviços neste nicho */
  servicesLabel: string;
  /** Como os serviços são apresentados */
  servicesVariant: "list" | "cards" | "menu" | "areas";

  /** Setor regulado: proíbe promessa de resultado */
  regulated?: boolean;
}

// ─── Vocabulário proibido reaproveitado ───────────────────────────────────────
const ODONTO_VOCAB = [
  "sorriso",
  "dente",
  "dentes",
  "dental",
  "dentária",
  "dentário",
  "implante dentário",
  "clareamento",
  "ortodontia",
  "aparelho",
  "prótese dentária",
  "canal",
  "limpeza dental",
];

const MEDICO_VOCAB = ["consulta médica", "exame", "diagnóstico", "tratamento clínico"];

export const TAXONOMY: NicheNode[] = [
  // ─── SAÚDE ──────────────────────────────────────────────────────────────────
  {
    id: "saude.clinica_medica.geral",
    mainNiche: "saude",
    businessType: "clinica_medica",
    label: "Clínica médica",
    strongSignals: ["clinica medica", "policlinica", "centro medico", "consultorio medico", "ambulatorio"],
    weakSignals: ["clinica", "saude", "medico", "medica", "consulta"],
    // A regra que resolve o bug relatado
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Especialidades",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.clinica_medica.dermatologia",
    mainNiche: "saude",
    businessType: "clinica_medica",
    subNiche: "dermatologia",
    label: "Dermatologia",
    strongSignals: ["dermatolog", "dermato"],
    weakSignals: ["pele", "acne", "cabelo", "unha", "melasma"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "medical-premium",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Tratamentos",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.clinica_medica.cardiologia",
    mainNiche: "saude",
    businessType: "clinica_medica",
    subNiche: "cardiologia",
    label: "Cardiologia",
    strongSignals: ["cardiolog", "cardio"],
    weakSignals: ["coracao", "eletrocardiograma", "ecocardiograma"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Exames e consultas",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.clinica_medica.ortopedia",
    mainNiche: "saude",
    businessType: "clinica_medica",
    subNiche: "ortopedia",
    label: "Ortopedia",
    strongSignals: ["ortoped", "traumatolog"],
    weakSignals: ["coluna", "joelho", "ombro", "fratura"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Especialidades",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.clinica_medica.pediatria",
    mainNiche: "saude",
    businessType: "clinica_medica",
    subNiche: "pediatria",
    label: "Pediatria",
    strongSignals: ["pediatr"],
    weakSignals: ["infantil", "crianca", "bebe"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Atendimento",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.clinica_medica.ginecologia",
    mainNiche: "saude",
    businessType: "clinica_medica",
    subNiche: "ginecologia",
    label: "Ginecologia",
    strongSignals: ["ginecolog", "obstetr"],
    weakSignals: ["mulher", "gestante", "pre-natal", "prenatal"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    visualDirection: "medical-premium",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Especialidades",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.clinica_medica.oftalmologia",
    mainNiche: "saude",
    businessType: "clinica_medica",
    subNiche: "oftalmologia",
    label: "Oftalmologia",
    strongSignals: ["oftalmolog", "oftalmo"],
    weakSignals: ["olhos", "visao", "catarata", "grau"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Exames e consultas",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.fisioterapia.geral",
    mainNiche: "saude",
    businessType: "fisioterapia",
    label: "Fisioterapia",
    strongSignals: ["fisioterap", "rpg", "pilates clinico", "quiropraxia"],
    weakSignals: ["reabilitacao", "postura", "dor", "lesao"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar avaliação",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "about", "team", "location", "cta"],
    servicesLabel: "Tratamentos",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.psicologia.geral",
    mainNiche: "saude",
    businessType: "psicologia",
    label: "Psicologia",
    strongSignals: ["psicolog", "psicanal", "terapia", "psiquiatr"],
    weakSignals: ["ansiedade", "emocional", "mental", "acolhimento"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar sessão",
    visualDirection: "medical-premium",
    sectionFlow: ["about", "services", "trust", "team", "location", "cta"],
    servicesLabel: "Atendimentos",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.nutricao.geral",
    mainNiche: "saude",
    businessType: "nutricao",
    label: "Nutrição",
    strongSignals: ["nutricion", "nutrolog"],
    weakSignals: ["dieta", "alimentar", "emagrecimento"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar consulta",
    visualDirection: "medical-clean",
    sectionFlow: ["trust", "services", "about", "team", "location", "cta"],
    servicesLabel: "Acompanhamento",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "saude.veterinaria.geral",
    mainNiche: "saude",
    businessType: "veterinaria",
    label: "Clínica veterinária",
    strongSignals: ["veterinar", "hospital veterinario", "clinica veterinaria"],
    weakSignals: ["pet", "animal", "cachorro", "gato", "vacina"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar atendimento",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "pet-friendly",
    sectionFlow: ["trust", "services", "team", "gallery", "location", "cta"],
    servicesLabel: "Atendimento veterinário",
    servicesVariant: "cards",
    regulated: true,
  },

  // ─── ODONTOLOGIA ────────────────────────────────────────────────────────────
  {
    id: "odontologia.clinica_odontologica.geral",
    mainNiche: "odontologia",
    businessType: "clinica_odontologica",
    label: "Clínica odontológica",
    strongSignals: ["odontolog", "odonto", "dentista", "dental", "dentaria"],
    weakSignals: ["sorriso", "dente", "bucal"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar avaliação",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "dental-clean",
    sectionFlow: ["trust", "services", "team", "gallery", "location", "cta"],
    servicesLabel: "Tratamentos",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "odontologia.clinica_odontologica.ortodontia",
    mainNiche: "odontologia",
    businessType: "clinica_odontologica",
    subNiche: "ortodontia",
    label: "Ortodontia",
    strongSignals: ["ortodont", "aparelho ortodontico"],
    weakSignals: ["alinhador", "aparelho"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar avaliação",
    visualDirection: "dental-clean",
    sectionFlow: ["trust", "services", "team", "gallery", "location", "cta"],
    servicesLabel: "Tratamentos",
    servicesVariant: "list",
    regulated: true,
  },
  {
    id: "odontologia.clinica_odontologica.implantes",
    mainNiche: "odontologia",
    businessType: "clinica_odontologica",
    subNiche: "implantodontia",
    label: "Implantes",
    strongSignals: ["implantodont", "implante dentario"],
    weakSignals: ["implante", "protese"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar avaliação",
    visualDirection: "dental-clean",
    sectionFlow: ["trust", "services", "team", "about", "location", "cta"],
    servicesLabel: "Tratamentos",
    servicesVariant: "list",
    regulated: true,
  },

  // ─── ESTÉTICA E BELEZA ──────────────────────────────────────────────────────
  {
    id: "beleza.clinica_estetica.geral",
    mainNiche: "beleza",
    businessType: "clinica_estetica",
    label: "Clínica estética",
    strongSignals: ["estetica", "harmonizacao facial", "botox", "preenchimento"],
    weakSignals: ["beleza", "pele", "rejuvenesc", "corporal"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar avaliação",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "beauty-luxury",
    sectionFlow: ["gallery", "services", "trust", "team", "location", "cta"],
    servicesLabel: "Procedimentos",
    servicesVariant: "cards",
    regulated: true,
  },
  {
    id: "beleza.salao.geral",
    mainNiche: "beleza",
    businessType: "salao",
    label: "Salão de beleza",
    strongSignals: ["salao de beleza", "cabeleireir", "hair", "beauty salon"],
    weakSignals: ["salao", "corte", "coloracao", "escova", "penteado"],
    bannedVocabulary: ODONTO_VOCAB,
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar horário",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "beauty-modern",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },
  {
    id: "beleza.barbearia.geral",
    mainNiche: "beleza",
    businessType: "barbearia",
    label: "Barbearia",
    strongSignals: ["barbearia", "barber"],
    weakSignals: ["barba", "corte masculino", "navalha"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar horário",
    visualDirection: "beauty-modern",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },
  {
    id: "beleza.unhas.geral",
    mainNiche: "beleza",
    businessType: "unhas",
    label: "Nail design",
    strongSignals: ["nail", "manicure", "alongamento de unhas", "esmalteria"],
    weakSignals: ["unha", "pedicure", "gel"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar horário",
    visualDirection: "beauty-modern",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },
  {
    id: "beleza.sobrancelhas.geral",
    mainNiche: "beleza",
    businessType: "sobrancelhas",
    label: "Design de sobrancelhas",
    strongSignals: ["sobrancelha", "designer de sobrancelhas", "micropigmenta"],
    weakSignals: ["henna", "lash", "cilios"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar horário",
    visualDirection: "beauty-modern",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },

  // ─── ALIMENTAÇÃO ────────────────────────────────────────────────────────────
  {
    id: "alimentacao.restaurante.geral",
    mainNiche: "alimentacao",
    businessType: "restaurante",
    label: "Restaurante",
    strongSignals: ["restaurante", "bistro", "cantina", "trattoria"],
    weakSignals: ["almoco", "jantar", "prato", "culinaria", "comida"],
    conversionGoal: "cardapio",
    ctaPrimary: "Ver cardápio",
    ctaSecondary: "Reservar mesa",
    visualDirection: "food-editorial",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Do cardápio",
    servicesVariant: "menu",
  },
  {
    id: "alimentacao.restaurante.churrascaria",
    mainNiche: "alimentacao",
    businessType: "restaurante",
    subNiche: "churrascaria",
    label: "Churrascaria",
    strongSignals: ["churrascaria", "rodizio de carnes", "steakhouse"],
    weakSignals: ["churrasco", "carne", "picanha", "rodizio"],
    conversionGoal: "cardapio",
    ctaPrimary: "Ver cardápio",
    ctaSecondary: "Reservar mesa",
    visualDirection: "food-bold",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Do cardápio",
    servicesVariant: "menu",
  },
  {
    id: "alimentacao.pizzaria.geral",
    mainNiche: "alimentacao",
    businessType: "pizzaria",
    label: "Pizzaria",
    strongSignals: ["pizzaria", "pizza"],
    weakSignals: ["forno a lenha", "massa", "delivery"],
    conversionGoal: "pedido",
    ctaPrimary: "Pedir agora",
    ctaSecondary: "Ver cardápio",
    visualDirection: "food-bold",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Do cardápio",
    servicesVariant: "menu",
  },
  {
    id: "alimentacao.hamburgueria.geral",
    mainNiche: "alimentacao",
    businessType: "hamburgueria",
    label: "Hamburgueria",
    strongSignals: ["hamburgueria", "burger", "hamburguer", "smash"],
    weakSignals: ["lanche", "artesanal", "delivery"],
    conversionGoal: "pedido",
    ctaPrimary: "Pedir agora",
    ctaSecondary: "Ver cardápio",
    visualDirection: "food-bold",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Do cardápio",
    servicesVariant: "menu",
  },
  {
    id: "alimentacao.cafeteria.geral",
    mainNiche: "alimentacao",
    businessType: "cafeteria",
    label: "Cafeteria",
    strongSignals: ["cafeteria", "coffee", "cafe especial"],
    weakSignals: ["cafe", "brunch", "padaria"],
    conversionGoal: "cardapio",
    ctaPrimary: "Ver cardápio",
    visualDirection: "food-editorial",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Do cardápio",
    servicesVariant: "menu",
  },
  {
    id: "alimentacao.confeitaria.geral",
    mainNiche: "alimentacao",
    businessType: "confeitaria",
    label: "Confeitaria",
    strongSignals: ["confeitaria", "doceria", "bolos", "patisserie"],
    weakSignals: ["doce", "bolo", "torta", "encomenda"],
    conversionGoal: "pedido",
    ctaPrimary: "Fazer encomenda",
    visualDirection: "food-editorial",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Do cardápio",
    servicesVariant: "menu",
  },

  // ─── AUTOMOTIVO ─────────────────────────────────────────────────────────────
  {
    id: "automotivo.oficina.geral",
    mainNiche: "automotivo",
    businessType: "oficina",
    label: "Oficina mecânica",
    strongSignals: ["oficina", "mecanica", "auto center", "autocenter"],
    weakSignals: ["carro", "veiculo", "revisao", "motor"],
    conversionGoal: "orcamento",
    ctaPrimary: "Solicitar orçamento",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "automotive-performance",
    sectionFlow: ["services", "process", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },
  {
    id: "automotivo.auto_eletrica.geral",
    mainNiche: "automotivo",
    businessType: "auto_eletrica",
    label: "Auto elétrica",
    strongSignals: ["auto eletrica", "autoeletrica"],
    weakSignals: ["bateria", "alternador", "injecao"],
    conversionGoal: "orcamento",
    ctaPrimary: "Solicitar orçamento",
    visualDirection: "industrial-technical",
    sectionFlow: ["services", "process", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },
  {
    id: "automotivo.estetica_automotiva.geral",
    mainNiche: "automotivo",
    businessType: "estetica_automotiva",
    label: "Estética automotiva",
    strongSignals: ["estetica automotiva", "polimento", "vitrificacao", "lava rapido", "lava-rapido"],
    weakSignals: ["higienizacao", "cristalizacao", "detail"],
    conversionGoal: "orcamento",
    ctaPrimary: "Agendar serviço",
    visualDirection: "automotive-performance",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "cards",
  },
  {
    id: "automotivo.pneus.geral",
    mainNiche: "automotivo",
    businessType: "pneus",
    label: "Pneus e alinhamento",
    strongSignals: ["pneus", "borracharia", "alinhamento", "balanceamento"],
    weakSignals: ["roda", "suspensao"],
    conversionGoal: "orcamento",
    ctaPrimary: "Solicitar orçamento",
    visualDirection: "industrial-technical",
    sectionFlow: ["services", "process", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },

  // ─── SERVIÇOS PROFISSIONAIS ─────────────────────────────────────────────────
  {
    id: "profissional.advocacia.geral",
    mainNiche: "profissional",
    businessType: "advocacia",
    label: "Advocacia",
    strongSignals: ["advocacia", "advogad", "escritorio de advocacia", "sociedade de advogados"],
    weakSignals: ["juridic", "oab", "direito", "processo"],
    conversionGoal: "consulta",
    ctaPrimary: "Falar com advogado",
    ctaSecondary: "Agendar conversa",
    visualDirection: "legal-authority",
    sectionFlow: ["services", "about", "trust", "process", "cta"],
    servicesLabel: "Áreas de atuação",
    servicesVariant: "areas",
    regulated: true,
  },
  {
    id: "profissional.contabilidade.geral",
    mainNiche: "profissional",
    businessType: "contabilidade",
    label: "Contabilidade",
    strongSignals: ["contabilidade", "contabil", "escritorio contabil", "contador"],
    weakSignals: ["fiscal", "tributari", "folha", "imposto", "mei"],
    conversionGoal: "contato",
    ctaPrimary: "Falar com especialista",
    visualDirection: "corporate-clean",
    sectionFlow: ["services", "trust", "process", "about", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "areas",
  },
  {
    id: "profissional.seguros.geral",
    mainNiche: "profissional",
    businessType: "seguros",
    label: "Corretora de seguros",
    strongSignals: ["seguros", "corretora de seguros", "seguradora"],
    weakSignals: ["apolice", "sinistro", "protecao"],
    conversionGoal: "orcamento",
    ctaPrimary: "Solicitar cotação",
    visualDirection: "corporate-clean",
    sectionFlow: ["services", "trust", "process", "about", "cta"],
    servicesLabel: "Coberturas",
    servicesVariant: "areas",
    regulated: true,
  },
  {
    id: "profissional.consultoria.geral",
    mainNiche: "profissional",
    businessType: "consultoria",
    label: "Consultoria",
    strongSignals: ["consultoria", "assessoria"],
    weakSignals: ["gestao", "estrategia", "processos"],
    conversionGoal: "contato",
    ctaPrimary: "Falar com especialista",
    visualDirection: "corporate-clean",
    sectionFlow: ["services", "about", "trust", "process", "cta"],
    servicesLabel: "Como ajudamos",
    servicesVariant: "areas",
  },

  // ─── IMÓVEIS ────────────────────────────────────────────────────────────────
  {
    id: "imoveis.imobiliaria.geral",
    mainNiche: "imoveis",
    businessType: "imobiliaria",
    label: "Imobiliária",
    strongSignals: ["imobiliaria", "imoveis", "corretor de imoveis", "creci"],
    weakSignals: ["aluguel", "venda", "apartamento", "casa", "terreno"],
    conversionGoal: "visita",
    ctaPrimary: "Falar com corretor",
    ctaSecondary: "Agendar visita",
    visualDirection: "real-estate-premium",
    sectionFlow: ["gallery", "services", "trust", "team", "location", "cta"],
    servicesLabel: "Como atendemos",
    servicesVariant: "cards",
  },
  {
    id: "imoveis.construtora.geral",
    mainNiche: "imoveis",
    businessType: "construtora",
    label: "Construtora",
    strongSignals: ["construtora", "incorporadora", "empreendimento"],
    weakSignals: ["obra", "construcao", "lancamento"],
    conversionGoal: "visita",
    ctaPrimary: "Conhecer empreendimentos",
    visualDirection: "real-estate-premium",
    sectionFlow: ["gallery", "services", "about", "trust", "location", "cta"],
    servicesLabel: "O que fazemos",
    servicesVariant: "cards",
  },

  // ─── CASA E CONSTRUÇÃO ──────────────────────────────────────────────────────
  {
    id: "casa.arquitetura.geral",
    mainNiche: "casa",
    businessType: "arquitetura",
    label: "Arquitetura",
    strongSignals: ["arquitetura", "arquitet", "design de interiores"],
    weakSignals: ["projeto", "interiores", "reforma"],
    conversionGoal: "contato",
    ctaPrimary: "Solicitar projeto",
    visualDirection: "real-estate-premium",
    sectionFlow: ["gallery", "services", "process", "about", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "cards",
  },
  {
    id: "casa.reformas.geral",
    mainNiche: "casa",
    businessType: "reformas",
    label: "Reformas e manutenção",
    strongSignals: ["reforma", "eletricista", "encanador", "hidraulica", "pintura predial", "marcenaria", "serralheria", "vidracaria", "gesso", "dedetizadora"],
    weakSignals: ["manutencao", "instalacao", "obra", "pintor"],
    conversionGoal: "orcamento",
    ctaPrimary: "Solicitar orçamento",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "local-service-modern",
    sectionFlow: ["services", "process", "gallery", "trust", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "list",
  },

  // ─── FITNESS ────────────────────────────────────────────────────────────────
  {
    id: "fitness.academia.geral",
    mainNiche: "fitness",
    businessType: "academia",
    label: "Academia",
    strongSignals: ["academia", "gym", "musculacao", "smart fit"],
    weakSignals: ["treino", "fitness", "aparelhos", "cardio"],
    conversionGoal: "matricula",
    ctaPrimary: "Conhecer planos",
    ctaSecondary: "Agendar aula experimental",
    visualDirection: "fitness-energy",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Modalidades",
    servicesVariant: "cards",
  },
  {
    id: "fitness.crossfit.geral",
    mainNiche: "fitness",
    businessType: "crossfit",
    label: "CrossFit",
    strongSignals: ["crossfit", "box de crossfit", "funcional"],
    weakSignals: ["wod", "treino funcional"],
    conversionGoal: "matricula",
    ctaPrimary: "Agendar aula experimental",
    visualDirection: "fitness-energy",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Modalidades",
    servicesVariant: "cards",
  },
  {
    id: "fitness.pilates.geral",
    mainNiche: "fitness",
    businessType: "pilates",
    label: "Pilates",
    strongSignals: ["pilates", "yoga", "studio de pilates"],
    weakSignals: ["postura", "alongamento", "core"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar aula experimental",
    visualDirection: "beauty-modern",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Modalidades",
    servicesVariant: "cards",
  },
  {
    id: "fitness.personal.geral",
    mainNiche: "fitness",
    businessType: "personal",
    label: "Personal trainer",
    strongSignals: ["personal trainer", "personal training"],
    weakSignals: ["treinador", "consultoria esportiva"],
    conversionGoal: "contato",
    ctaPrimary: "Falar com o treinador",
    visualDirection: "fitness-energy",
    sectionFlow: ["about", "services", "trust", "gallery", "cta"],
    servicesLabel: "Como treinamos",
    servicesVariant: "cards",
  },

  // ─── PETS ───────────────────────────────────────────────────────────────────
  {
    id: "pets.pet_shop.geral",
    mainNiche: "pets",
    businessType: "pet_shop",
    label: "Pet shop",
    strongSignals: ["pet shop", "petshop", "banho e tosa", "agropet"],
    weakSignals: ["pet", "racao", "tosa", "banho", "animal"],
    conversionGoal: "agendamento",
    ctaPrimary: "Agendar banho e tosa",
    ctaSecondary: "Falar no WhatsApp",
    visualDirection: "pet-friendly",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "Serviços",
    servicesVariant: "cards",
  },

  // ─── EDUCAÇÃO ───────────────────────────────────────────────────────────────
  {
    id: "educacao.escola.geral",
    mainNiche: "educacao",
    businessType: "escola",
    label: "Escola e cursos",
    strongSignals: ["escola", "colegio", "curso", "cursinho", "idiomas", "autoescola", "creche"],
    weakSignals: ["aula", "ensino", "professor", "matricula", "aluno"],
    conversionGoal: "matricula",
    ctaPrimary: "Falar sobre matrícula",
    visualDirection: "education-bright",
    sectionFlow: ["trust", "services", "about", "team", "location", "cta"],
    servicesLabel: "Cursos e turmas",
    servicesVariant: "cards",
  },

  // ─── COMÉRCIO / SERVIÇO LOCAL GENÉRICO ──────────────────────────────────────
  {
    id: "comercio.loja.geral",
    mainNiche: "comercio",
    businessType: "loja",
    label: "Loja",
    strongSignals: ["loja", "magazine", "boutique", "papelaria", "farmacia", "drogaria", "otica", "floricultura"],
    weakSignals: ["venda", "produtos", "varejo"],
    conversionGoal: "whatsapp",
    ctaPrimary: "Falar no WhatsApp",
    visualDirection: "local-service-modern",
    sectionFlow: ["gallery", "services", "trust", "location", "cta"],
    servicesLabel: "O que oferecemos",
    servicesVariant: "cards",
  },
];

/** Nó usado quando a evidência não sustenta nenhuma classificação */
export const FALLBACK_NODE: NicheNode = {
  id: "generico.servico_local.geral",
  mainNiche: "generico",
  businessType: "servico_local",
  label: "Serviço local",
  strongSignals: [],
  weakSignals: [],
  conversionGoal: "whatsapp",
  ctaPrimary: "Falar no WhatsApp",
  ctaSecondary: "Ver no mapa",
  visualDirection: "local-service-modern",
  sectionFlow: ["trust", "services", "location", "cta"],
  servicesLabel: "O que oferecemos",
  servicesVariant: "cards",
};

// ─── Consultas ────────────────────────────────────────────────────────────────

export function findNodeById(id: string): NicheNode | undefined {
  return TAXONOMY.find((n) => n.id === id);
}

export function nodesOfBusinessType(businessType: string): NicheNode[] {
  return TAXONOMY.filter((n) => n.businessType === businessType);
}

/**
 * Vocabulário proibido acumulado: o do nó mais o de todos os tipos de
 * negócio irmãos que costumam ser confundidos com ele.
 */
export function forbiddenFor(node: NicheNode): string[] {
  const proibido = new Set(node.bannedVocabulary ?? []);

  // Saúde não-odontológica nunca fala em odontologia
  if (node.mainNiche === "saude") {
    ODONTO_VOCAB.forEach((t) => proibido.add(t));
  }
  // Odontologia não se apresenta como clínica médica geral
  if (node.mainNiche === "odontologia") {
    MEDICO_VOCAB.forEach((t) => proibido.add(t));
  }

  return Array.from(proibido);
}

/** Todos os `mainNiche` distintos — útil para UI e testes */
export function mainNiches(): string[] {
  return Array.from(new Set(TAXONOMY.map((n) => n.mainNiche)));
}

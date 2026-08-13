// ============================================================
// Arquétipos de nicho — conteúdo + design tokens
// ------------------------------------------------------------
// Paletas e pares tipográficos vêm da base do skill ui-ux-pro-max
// (`design-system/maps-lead-hunter/MASTER.md`), já validados para
// contraste WCAG. O conteúdo (serviços, headline, diferenciais)
// era duplicado entre LandingPagePreview e /preview/[id] — agora
// mora só aqui.
// ============================================================

export type LayoutVariant = "overlay" | "split" | "editorial";
export type ShapeStyle = "sharp" | "soft" | "round";

export interface NichePalette {
  primary: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  onAccent: string;
  background: string;
  foreground: string;
  muted: string;
}

export interface NicheFonts {
  heading: string;
  body: string;
  /** `true` quando a heading é serifada — muda tracking e peso no render */
  serifHeading?: boolean;
}

export interface NicheContent {
  /** Termos para busca de imagem temática */
  keywords: string[];
  services: string[];
  hero: string;
  description: string;
  emoji: string;
  testimonials: string[];
  differentials: { icon: string; title: string; desc: string }[];
}

export interface NicheArchetype {
  id: string;
  label: string;
  /** Chaves que aparecem na categoria do lead (já normalizada, sem acento) */
  aliases: string[];
  palette: NichePalette;
  fonts: NicheFonts;
  mood: string;
  /** Variações de layout coerentes com o nicho — a escolha final é por empresa */
  layouts: LayoutVariant[];
  shape: ShapeStyle;
  /** Fundo escuro pede tratamento invertido nas seções */
  darkHero: boolean;
  content: NicheContent;
}

// ─── Arquétipos ───────────────────────────────────────────────────────────────
export const ARCHETYPES: NicheArchetype[] = [
  {
    id: "health",
    label: "Saúde & Clínicas",
    aliases: ["dentist", "clinic", "medic", "saude", "odonto", "fisio", "psico", "laborat"],
    // ui-ux-pro-max › "Medical blue + alert red"
    palette: {
      primary: "#0284c7",
      onPrimary: "#ffffff",
      secondary: "#0891b2",
      accent: "#16a34a",
      onAccent: "#ffffff",
      background: "#f0f9ff",
      foreground: "#0f172a",
      muted: "#e2eef7",
    },
    fonts: { heading: "Figtree", body: "Noto Sans" },
    mood: "profissional, confiável, acolhedor",
    layouts: ["split", "overlay"],
    shape: "soft",
    darkHero: false,
    content: {
      keywords: ["dentist,clinic,teeth", "dental,office", "tooth,care"],
      services: ["Consulta & Avaliação", "Limpeza Dental", "Clareamento", "Ortodontia", "Implantes", "Restaurações"],
      hero: "Seu sorriso é nossa especialidade",
      description: "Atendimento odontológico completo com tecnologia de ponta e um ambiente acolhedor para toda a família.",
      emoji: "🦷",
      testimonials: [
        "Melhor dentista da cidade! Atendimento incrível e sem dor.",
        "Finalmente encontrei um dentista de confiança. Super indico!",
        "Ambiente super limpo e profissional. Resultado impecável!",
      ],
      differentials: [
        { icon: "🏥", title: "Clínica Moderna", desc: "Equipamentos de última geração para máxima precisão." },
        { icon: "😊", title: "Sem Dor", desc: "Técnicas avançadas para um tratamento confortável." },
        { icon: "👨‍👩‍👧", title: "Para Toda a Família", desc: "Atendemos crianças, adultos e idosos." },
      ],
    },
  },
  {
    id: "auto",
    label: "Automotivo",
    aliases: ["oficin", "mecanic", "auto", "funilar", "borrach", "pneu"],
    // ui-ux-pro-max › "Premium dark + action red"
    palette: {
      primary: "#1e293b",
      onPrimary: "#ffffff",
      secondary: "#334155",
      accent: "#dc2626",
      onAccent: "#ffffff",
      background: "#f8fafc",
      foreground: "#0f172a",
      muted: "#e2e8f0",
    },
    fonts: { heading: "Outfit", body: "Work Sans" },
    mood: "técnico, direto, confiável",
    layouts: ["overlay", "split"],
    shape: "sharp",
    darkHero: true,
    content: {
      keywords: ["mechanic,garage,car", "auto,repair,workshop", "car,service"],
      services: ["Revisão Completa", "Troca de Óleo", "Alinhamento & Balanceamento", "Freios", "Elétrica Automotiva", "Funilaria & Pintura"],
      hero: "Seu veículo em mãos de especialistas",
      description: "Mais de uma década cuidando dos automóveis da região com transparência, qualidade e preço justo.",
      emoji: "🔧",
      testimonials: [
        "Honesto e competente! Meu carro ficou como novo.",
        "Resolveram o problema que outros não conseguiram. Nota 10!",
        "Preço justo e serviço rápido. Sempre volto aqui.",
      ],
      differentials: [
        { icon: "🔍", title: "Diagnóstico Grátis", desc: "Avaliamos seu veículo sem cobrar a consulta." },
        { icon: "⚙️", title: "Peças Originais", desc: "Somente peças de qualidade com garantia." },
        { icon: "📋", title: "Orçamento Online", desc: "Solicite orçamento pelo WhatsApp em minutos." },
      ],
    },
  },
  {
    id: "food",
    label: "Alimentação",
    aliases: ["restaur", "lanchon", "pizz", "cafe", "bar", "buffet", "padar", "hamburg", "sushi", "food"],
    // ui-ux-pro-max › "Appetizing red + warm gold"
    palette: {
      primary: "#dc2626",
      onPrimary: "#ffffff",
      secondary: "#f87171",
      accent: "#a16207",
      onAccent: "#ffffff",
      background: "#fef6f4",
      foreground: "#450a0a",
      muted: "#fbe4de",
    },
    fonts: { heading: "Playfair Display", body: "Karla", serifHeading: true },
    mood: "aconchegante, apetitoso, familiar",
    layouts: ["editorial", "overlay"],
    shape: "soft",
    darkHero: true,
    content: {
      keywords: ["restaurant,food,brazil", "dining,cuisine,delicious", "food,meal,table"],
      services: ["Almoço Executivo", "Rodízio", "Delivery", "Eventos & Festas", "Buffet", "À la Carte"],
      hero: "Sabor que conquista, ambiente que encanta",
      description: "Gastronomia autêntica preparada com ingredientes frescos selecionados diariamente para você e sua família.",
      emoji: "🍽️",
      testimonials: [
        "Comida deliciosa e porção generosa. Ambiente aconchegante!",
        "Melhor restaurante da cidade, sem dúvidas. Sempre cheio!",
        "Atendimento impecável e preço justo. Virei cliente fiel.",
      ],
      differentials: [
        { icon: "🥗", title: "Ingredientes Frescos", desc: "Selecionamos o melhor diariamente." },
        { icon: "👨‍🍳", title: "Chef Especializado", desc: "Receitas exclusivas com toque artesanal." },
        { icon: "🚗", title: "Delivery Rápido", desc: "Entregamos em toda a cidade em até 40 min." },
      ],
    },
  },
  {
    id: "beauty",
    label: "Beleza & Estética",
    aliases: ["salao", "salon", "estetic", "beleza", "barber", "nail", "cabele", "spa", "manicure"],
    // ui-ux-pro-max › "Fashion rose + gold accent"
    palette: {
      primary: "#be185d",
      onPrimary: "#ffffff",
      secondary: "#ec4899",
      accent: "#d97706",
      onAccent: "#ffffff",
      background: "#fdf2f8",
      foreground: "#500724",
      muted: "#f7dfeb",
    },
    fonts: { heading: "Playfair Display", body: "Inter", serifHeading: true },
    mood: "elegante, moderno, sofisticado",
    layouts: ["editorial", "split"],
    shape: "round",
    darkHero: false,
    content: {
      keywords: ["hairdresser,beauty,salon", "hair,salon,woman", "beauty,spa,hair"],
      services: ["Corte Feminino & Masculino", "Coloração", "Hidratação", "Escova & Progressiva", "Manicure & Pedicure", "Sobrancelha"],
      hero: "Realce sua beleza com quem entende",
      description: "Um espaço dedicado à beleza e bem-estar, com profissionais especializados e produtos premium.",
      emoji: "💇",
      testimonials: [
        "Saí linda! Profissionais super atenciosos e caprichosos.",
        "Melhor salão da cidade. Meu cabelo nunca ficou tão bonito!",
        "Ambiente lindo e atendimento perfeito. Sempre volto!",
      ],
      differentials: [
        { icon: "✨", title: "Produtos Premium", desc: "Usamos apenas marcas de alta qualidade." },
        { icon: "📅", title: "Agendamento Fácil", desc: "Reserve pelo WhatsApp quando quiser." },
        { icon: "🎨", title: "Coloração Exclusiva", desc: "Técnicas modernas para o seu estilo." },
      ],
    },
  },
  {
    id: "fitness",
    label: "Fitness",
    aliases: ["academ", "gym", "crossfit", "pilates", "yoga", "personal", "fitness", "luta", "danc"],
    // ui-ux-pro-max › "Energy orange + success green" (fundo escuro)
    palette: {
      primary: "#f97316",
      onPrimary: "#0f172a",
      secondary: "#fb923c",
      accent: "#22c55e",
      onAccent: "#0f172a",
      background: "#111827",
      foreground: "#f8fafc",
      muted: "#1f2937",
    },
    fonts: { heading: "Barlow Condensed", body: "Barlow" },
    mood: "energético, motivacional, saudável",
    layouts: ["overlay", "split"],
    shape: "sharp",
    darkHero: true,
    content: {
      keywords: ["gym,fitness,workout", "exercise,training,sport", "fitness,body,health"],
      services: ["Musculação", "Cardio", "Aulas em Grupo", "Personal Trainer", "Spinning", "Pilates"],
      hero: "Transforme seu corpo, transforme sua vida",
      description: "Estrutura completa com equipamentos modernos e profissionais certificados para você atingir seus objetivos.",
      emoji: "💪",
      testimonials: [
        "Emagreci 12kg em 3 meses! Instrutores incríveis.",
        "Academia limpa, moderna e com ótimo custo-benefício!",
        "Melhor investimento que fiz. Me sinto outra pessoa!",
      ],
      differentials: [
        { icon: "🏋️", title: "Equipamentos Modernos", desc: "Parque de máquinas atualizado e completo." },
        { icon: "👨‍🏫", title: "Instrutores Certificados", desc: "Profissionais de educação física qualificados." },
        { icon: "🕐", title: "Horário Flexível", desc: "Abrimos cedo e fechamos tarde para você." },
      ],
    },
  },
  {
    id: "pet",
    label: "Pet",
    aliases: ["pet", "veterin", "banho", "tosa", "animal"],
    // ui-ux-pro-max › paleta laranja quente + azul de confiança
    palette: {
      primary: "#ea580c",
      onPrimary: "#ffffff",
      secondary: "#fb923c",
      accent: "#2563eb",
      onAccent: "#ffffff",
      background: "#fff7ed",
      foreground: "#7c2d12",
      muted: "#fde7d3",
    },
    fonts: { heading: "Varela Round", body: "Nunito Sans" },
    mood: "carinhoso, seguro, especializado",
    layouts: ["split", "editorial"],
    shape: "round",
    darkHero: false,
    content: {
      keywords: ["pet,shop,dog,cat", "veterinary,animal,care", "pet,grooming"],
      services: ["Banho & Tosa", "Consulta Veterinária", "Vacinas", "Hotel Pet", "Ração Premium", "Acessórios"],
      hero: "Cuidamos do seu pet como família",
      description: "Serviço completo de saúde e beleza para cães e gatos com profissionais que amam animais.",
      emoji: "🐾",
      testimonials: [
        "Meu cachorrinho saiu lindo e feliz! Adorou o atendimento.",
        "Equipe carinhosa e muito cuidadosa. Confio plenamente!",
        "Melhor pet shop da região. Preços ótimos e qualidade!",
      ],
      differentials: [
        { icon: "❤️", title: "Amor pelos Animais", desc: "Tratamos cada pet como se fosse nosso." },
        { icon: "💉", title: "Veterinário no Local", desc: "Consultas e vacinas sem precisar sair." },
        { icon: "🏨", title: "Hotel Pet", desc: "Seu pet bem cuidado enquanto você viaja." },
      ],
    },
  },
  {
    id: "pharma",
    label: "Farmácia & Bem-estar",
    aliases: ["farmac", "drogar", "manipul", "suplement"],
    // ui-ux-pro-max › "Medical teal + health green"
    palette: {
      primary: "#0891b2",
      onPrimary: "#ffffff",
      secondary: "#22d3ee",
      accent: "#16a34a",
      onAccent: "#ffffff",
      background: "#f0fdfa",
      foreground: "#134e4a",
      muted: "#d9f2ee",
    },
    fonts: { heading: "Figtree", body: "Noto Sans" },
    mood: "limpo, acessível, cuidadoso",
    layouts: ["split", "overlay"],
    shape: "soft",
    darkHero: false,
    content: {
      keywords: ["pharmacy,medicine,health", "drugstore,medication", "pharmacy,healthcare"],
      services: ["Medicamentos", "Dermocosméticos", "Manipulação", "Aferição de Pressão", "Teste de Glicemia", "Delivery"],
      hero: "Sua saúde com cuidado e atenção",
      description: "Farmácia completa com equipe farmacêutica sempre pronta para orientar e cuidar da sua saúde.",
      emoji: "💊",
      testimonials: [
        "Farmacêuticos muito atenciosos e preparados. Ótima orientação!",
        "Entrega rápida e produtos sempre disponíveis. Recomendo!",
        "Preço justo e atendimento humanizado. Minha farmácia favorita!",
      ],
      differentials: [
        { icon: "🧑‍⚕️", title: "Farmacêutico Presente", desc: "Orientação profissional a qualquer hora." },
        { icon: "🚚", title: "Delivery Grátis", desc: "Entregamos na sua casa rapidamente." },
        { icon: "💳", title: "Todos os Planos", desc: "Aceitamos convênios e cartões de benefício." },
      ],
    },
  },
  {
    id: "professional",
    label: "Serviços Profissionais",
    aliases: ["contab", "advog", "juridic", "consultor", "imobil", "corret", "financ", "seguro"],
    // ui-ux-pro-max › "Trust navy + premium gold"
    palette: {
      primary: "#0f172a",
      onPrimary: "#ffffff",
      secondary: "#1e3a8a",
      accent: "#a16207",
      onAccent: "#ffffff",
      background: "#f8fafc",
      foreground: "#020617",
      muted: "#e2e8f0",
    },
    fonts: { heading: "IBM Plex Sans", body: "IBM Plex Sans" },
    mood: "sério, profissional, confiável",
    layouts: ["split", "editorial"],
    shape: "sharp",
    darkHero: true,
    content: {
      keywords: ["accounting,office,business", "finance,professional,office", "tax,accountant"],
      services: ["Contabilidade Geral", "Abertura de Empresa", "Imposto de Renda", "Folha de Pagamento", "Consultoria Fiscal", "MEI"],
      hero: "Sua empresa em mãos experientes",
      description: "Soluções contábeis completas para empresas e pessoas físicas com atendimento personalizado e tecnologia.",
      emoji: "📊",
      testimonials: [
        "Economizei muito no IR com a ajuda deles. Super recomendo!",
        "Atendimento rápido e profissional. Minha empresa cresceu tranquila.",
        "Finalmente um contador que explica tudo de forma clara!",
      ],
      differentials: [
        { icon: "📈", title: "Gestão Estratégica", desc: "Ajudamos seu negócio a crescer de forma segura." },
        { icon: "⏰", title: "Sempre em Dia", desc: "Nunca perca um prazo fiscal conosco." },
        { icon: "💰", title: "Economia Tributária", desc: "Encontramos o melhor regime para você." },
      ],
    },
  },
  {
    id: "education",
    label: "Educação",
    aliases: ["escola", "curso", "cursinho", "aula", "ensino", "idioma", "coach", "creche"],
    palette: {
      primary: "#4f46e5",
      onPrimary: "#ffffff",
      secondary: "#6366f1",
      accent: "#f59e0b",
      onAccent: "#0f172a",
      background: "#f5f5ff",
      foreground: "#1e1b4b",
      muted: "#e4e4f8",
    },
    fonts: { heading: "Poppins", body: "Open Sans" },
    mood: "inspirador, transformador, educativo",
    layouts: ["editorial", "split"],
    shape: "soft",
    darkHero: false,
    content: {
      keywords: ["school,classroom,students", "education,learning,books", "teacher,study"],
      services: ["Turmas Regulares", "Reforço Escolar", "Aulas Particulares", "Preparatório", "Material Incluso", "Turmas Reduzidas"],
      hero: "Aprender com quem transforma",
      description: "Metodologia própria, turmas reduzidas e acompanhamento individual para cada aluno evoluir no seu ritmo.",
      emoji: "🎓",
      testimonials: [
        "Meu filho melhorou as notas em um bimestre. Equipe excelente!",
        "Professores atenciosos e didática muito clara. Recomendo demais.",
        "Ambiente organizado e acolhedor. Valeu cada real investido.",
      ],
      differentials: [
        { icon: "👩‍🏫", title: "Professores Titulados", desc: "Equipe qualificada e em formação contínua." },
        { icon: "👥", title: "Turmas Reduzidas", desc: "Atenção individual para cada aluno." },
        { icon: "📚", title: "Material Próprio", desc: "Conteúdo alinhado ao que cai nas provas." },
      ],
    },
  },
];

/** Arquétipo neutro para categorias fora do catálogo */
export function genericArchetype(category: string): NicheArchetype {
  return {
    id: "generic",
    label: "Serviço Local",
    aliases: [],
    // ui-ux-pro-max › paleta padrão "modern professional"
    palette: {
      primary: "#1e3a5f",
      onPrimary: "#ffffff",
      secondary: "#2563eb",
      accent: "#a16207",
      onAccent: "#ffffff",
      background: "#f8fafc",
      foreground: "#0f172a",
      muted: "#e9eef5",
    },
    fonts: { heading: "Poppins", body: "Open Sans" },
    mood: "profissional, moderno, confiável",
    layouts: ["overlay", "split", "editorial"],
    shape: "soft",
    darkHero: true,
    content: {
      keywords: [`${category},business,local`, "professional,service,brazil"],
      services: ["Atendimento Especializado", "Consultoria", "Serviço Premium", "Suporte Completo", "Orçamento Grátis", "Garantia de Qualidade"],
      hero: `${category} de confiança na sua cidade`,
      description: `Profissionais especializados em ${category.toLowerCase()} com anos de experiência e comprometimento com a satisfação do cliente.`,
      emoji: "⭐",
      testimonials: [
        "Excelente profissionalismo e atendimento! Super indico.",
        "Qualidade incomparável. Fiquei muito satisfeito com o resultado!",
        "Preço justo e serviço de primeira. Voltarei sempre!",
      ],
      differentials: [
        { icon: "🏆", title: "Experiência Comprovada", desc: "Anos atendendo a região com qualidade." },
        { icon: "⚡", title: "Atendimento Rápido", desc: "Sua solicitação atendida com agilidade." },
        { icon: "💎", title: "Qualidade Garantida", desc: "Satisfação total ou resolvemos o problema." },
      ],
    },
  };
}

export function normalizeCategory(category: string): string {
  return category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Resolve o arquétipo a partir da categoria do lead */
export function resolveArchetype(category: string): NicheArchetype {
  const key = normalizeCategory(category || "");
  const found = ARCHETYPES.find((a) => a.aliases.some((alias) => key.includes(alias)));
  return found ?? genericArchetype(category || "Serviço");
}
/**
 * Demo data for ChurchTech Rent. Every value here is editable in the admin
 * (Catálogo, Planos, Configurações) after seeding.
 */

type ProductType = "HARDWARE" | "SERVICE" | "INSTALLATION" | "SUPPORT" | "SOFTWARE" | "LICENSE" | "CONSUMABLE";

export const euros = (value: number) => Math.round(value * 100);

export const COMPANY = {
  name: "ChurchTech Rent",
  legalName: "ChurchTech Rent, Lda.",
  taxId: "PT 516 000 000",
  email: "ola@churchtech.pt",
  phone: "+351 210 000 000",
  website: "churchtech.pt",
  address: "Av. da Liberdade 100",
  city: "Lisboa",
  postalCode: "1250-096",
  tagline: "Sistemas audiovisuais para igrejas, em renting.",
  proposalTerms: [
    "Os equipamentos permanecem propriedade da ChurchTech Rent durante e após o contrato, salvo acordo de aquisição.",
    "A mensalidade inclui manutenção preventiva, substituição por avaria e atualizações de software.",
    "A instalação é agendada até 15 dias úteis após a assinatura e o pagamento do investimento inicial.",
    "Mensalidades faturadas no dia 1 de cada mês, por débito direto ou transferência bancária.",
    "No fim do contrato a igreja pode renovar com upgrade de equipamentos, adquirir os equipamentos pelo valor residual ou devolvê-los.",
  ].join("\n"),
};

export const DEMO_PASSWORD = "demo1234";

export const USERS = [
  { name: "Lucas Luna", email: "lucas@churchtech.pt", role: "ADMIN", title: "Diretor Comercial" },
  { name: "Ana Ribeiro", email: "ana@churchtech.pt", role: "SALES", title: "Consultora Comercial" },
  { name: "Rui Carvalho", email: "rui@churchtech.pt", role: "FINANCE", title: "Financeiro" },
  { name: "Tiago Mendes", email: "tiago@churchtech.pt", role: "TECHNICIAN", title: "Técnico AV" },
  { name: "Sofia Pires", email: "sofia@churchtech.pt", role: "VIEWER", title: "Assistente" },
] as const;

export const SUPPLIERS = [
  { key: "proav", name: "ProAV Distribuição", email: "encomendas@proav.example", phone: "+351 220 000 001" },
  { key: "lusonet", name: "Lusonet Equipamentos", email: "vendas@lusonet.example", phone: "+351 210 000 002" },
  { key: "internal", name: "Equipa ChurchTech", email: "tecnica@churchtech.pt" },
] as const;

export const CATEGORIES = [
  { slug: "cameras", name: "Câmeras", icon: "camera", description: "Captação de imagem para transmissão." },
  { slug: "controle", name: "Controle", icon: "joystick", description: "Controlo das câmeras em tempo real." },
  { slug: "producao", name: "Produção", icon: "clapperboard", description: "Realização, gráficos e streaming." },
  { slug: "captura", name: "Captura", icon: "usb", description: "Entrada de vídeo no sistema de produção." },
  { slug: "audio", name: "Áudio", icon: "audio-lines", description: "Som limpo para a transmissão." },
  { slug: "rede", name: "Rede", icon: "network", description: "Infraestrutura de rede dedicada." },
  { slug: "monitorizacao", name: "Monitorização", icon: "monitor", description: "Visualização para a equipa técnica." },
  { slug: "energia", name: "Energia", icon: "battery-charging", description: "Proteção contra falhas de energia." },
  { slug: "cabos", name: "Cabos", icon: "cable", description: "Cablagem e conectores certificados." },
  { slug: "instalacao", name: "Instalação", icon: "wrench", description: "Montagem profissional no local." },
  { slug: "servicos", name: "Serviços", icon: "sparkles", description: "Configuração e formação da equipa." },
  { slug: "suporte", name: "Suporte", icon: "life-buoy", description: "Acompanhamento durante todo o contrato." },
  { slug: "outros", name: "Outros", icon: "package", description: "Acessórios e complementos." },
] as const;

export interface SeedVariant {
  name: string;
  sku: string;
  cost: number;
  referencePrice?: number;
  description: string;
  benefit: string;
  residualPercent?: number;
  isDefault?: boolean;
  attributes?: Record<string, string>;
}

export interface SeedProduct {
  slug: string;
  sku: string;
  name: string;
  category: (typeof CATEGORIES)[number]["slug"];
  type: ProductType;
  supplier?: (typeof SUPPLIERS)[number]["key"];
  cost: number;
  referencePrice?: number;
  brand?: string;
  model?: string;
  description: string;
  salesDescription?: string;
  benefit?: string;
  image: string;
  warrantyMonths?: number;
  expectedLifeMonths?: number;
  residualPercent?: number;
  maxQuantity?: number;
  unitLabel?: string;
  variants?: SeedVariant[];
  service?: { deliveryMode: "REMOTE" | "ONSITE" | "HYBRID"; durationHours?: number };
  installation?: { estimatedHours: number; technicians: number };
}

export const PRODUCTS: SeedProduct[] = [
  {
    slug: "camera-ptz",
    sku: "PTZ",
    name: "Câmera PTZ",
    category: "cameras",
    type: "HARDWARE",
    supplier: "proav",
    cost: 990,
    description: "Câmera motorizada com zoom ótico 20× e presets de posição.",
    salesDescription:
      "Câmera robotizada controlada remotamente: um único operador cobre púlpito, louvor e congregação com movimentos suaves e presets instantâneos.",
    benefit: "Planos profissionais com apenas um operador.",
    image: "/products/ptz-camera.svg",
    warrantyMonths: 36,
    expectedLifeMonths: 60,
    residualPercent: 0.15,
    maxQuantity: 8,
    variants: [
      {
        name: "Standard",
        sku: "PTZ-STD",
        cost: 990,
        referencePrice: 1490,
        description: "PTZ tradicional com saídas HDMI/SDI.",
        benefit: "Boa para sistemas convencionais.",
        isDefault: true,
        attributes: { Transporte: "HDMI / SDI", Resolução: "1080p60", Zoom: "20× ótico" },
      },
      {
        name: "NDI",
        sku: "PTZ-NDI",
        cost: 1600,
        referencePrice: 2390,
        description: "Vídeo, controlo e alimentação por um único cabo de rede.",
        benefit: "Integração de vídeo via rede.",
        attributes: { Transporte: "NDI|HX · PoE+", Resolução: "1080p60", Zoom: "20× ótico" },
      },
    ],
  },
  {
    slug: "controladora-ptz",
    sku: "PTZ-CTRL",
    name: "Controladora PTZ",
    category: "controle",
    type: "HARDWARE",
    supplier: "proav",
    cost: 590,
    referencePrice: 890,
    description: "Joystick profissional para até 7 câmeras.",
    salesDescription: "Mesa de controlo com joystick e botões de preset: movimentos precisos durante o culto.",
    benefit: "Movimentos suaves e presets num toque.",
    image: "/products/ptz-controller.svg",
    warrantyMonths: 24,
    expectedLifeMonths: 72,
    residualPercent: 0.15,
    maxQuantity: 3,
  },
  {
    slug: "stream-deck-xl",
    sku: "SD-XL",
    name: "Stream Deck XL",
    category: "producao",
    type: "HARDWARE",
    supplier: "lusonet",
    cost: 210,
    referencePrice: 279,
    brand: "Elgato",
    model: "Stream Deck XL",
    description: "32 teclas LCD programáveis para a realização.",
    salesDescription: "Painel de 32 teclas personalizadas: cenas, câmeras, letras de louvor e gráficos com um toque.",
    benefit: "Toda a transmissão num painel simples.",
    image: "/products/stream-deck.svg",
    warrantyMonths: 24,
    expectedLifeMonths: 48,
    residualPercent: 0.1,
    maxQuantity: 4,
  },
  {
    slug: "computador-broadcast",
    sku: "PC-BC",
    name: "Computador Broadcast",
    category: "producao",
    type: "HARDWARE",
    supplier: "lusonet",
    cost: 890,
    description: "Workstation dedicada a produção e streaming.",
    salesDescription: "Computador otimizado para produção ao vivo, com configuração, licenças base e imagem de recuperação.",
    benefit: "Transmissões estáveis, sem surpresas.",
    image: "/products/broadcast-pc.svg",
    warrantyMonths: 36,
    expectedLifeMonths: 48,
    residualPercent: 0.1,
    maxQuantity: 3,
    variants: [
      {
        name: "Basic",
        sku: "PC-BC-BASIC",
        cost: 890,
        referencePrice: 1290,
        description: "Streaming 1080p com até 2 câmeras.",
        benefit: "Ideal para começar a transmitir.",
        isDefault: true,
        attributes: { CPU: "8 núcleos", GPU: "RTX 4060", Streaming: "1080p" },
      },
      {
        name: "Pro",
        sku: "PC-BC-PRO",
        cost: 1450,
        referencePrice: 1990,
        description: "Produção multicâmera com gráficos e gravação.",
        benefit: "Folga para crescer o sistema.",
        attributes: { CPU: "12 núcleos", GPU: "RTX 4070", Streaming: "1080p + gravação ISO" },
      },
      {
        name: "Advanced",
        sku: "PC-BC-ADV",
        cost: 2400,
        referencePrice: 3290,
        description: "Produção NDI, multistreaming e replays.",
        benefit: "Nível de televisão profissional.",
        attributes: { CPU: "16 núcleos", GPU: "RTX 4080", Streaming: "4K / multistream" },
      },
    ],
  },
  {
    slug: "licenca-vmix",
    sku: "LIC-VMIX-HD",
    name: "Licença vMix HD",
    category: "producao",
    type: "LICENSE",
    supplier: "lusonet",
    cost: 600,
    brand: "vMix",
    description: "Software de produção ao vivo, licença perpétua.",
    benefit: "Realização com gráficos e replays.",
    image: "/products/license.svg",
    maxQuantity: 2,
  },
  {
    slug: "placa-captura",
    sku: "CAP-HDMI",
    name: "Placa de captura",
    category: "captura",
    type: "HARDWARE",
    supplier: "lusonet",
    cost: 250,
    referencePrice: 349,
    description: "Captura HDMI/SDI 1080p60 de baixa latência.",
    benefit: "Liga câmeras e projetores ao sistema.",
    image: "/products/capture-card.svg",
    warrantyMonths: 24,
    expectedLifeMonths: 60,
    residualPercent: 0.1,
    maxQuantity: 6,
  },
  {
    slug: "interface-audio",
    sku: "AUD-IF",
    name: "Interface de áudio",
    category: "audio",
    type: "HARDWARE",
    supplier: "lusonet",
    cost: 190,
    referencePrice: 259,
    description: "Interface USB 2×2 para enviar a mesa de som para o stream.",
    benefit: "Som limpo e sem ruído na transmissão.",
    image: "/products/audio-interface.svg",
    warrantyMonths: 24,
    expectedLifeMonths: 72,
    residualPercent: 0.15,
    maxQuantity: 2,
  },
  {
    slug: "switch-gigabit",
    sku: "NET-SW8",
    name: "Switch Gigabit",
    category: "rede",
    type: "HARDWARE",
    supplier: "proav",
    cost: 140,
    referencePrice: 199,
    description: "8 portas Gigabit com PoE+ gerível.",
    benefit: "Rede dedicada e estável para o vídeo.",
    image: "/products/network-switch.svg",
    warrantyMonths: 36,
    expectedLifeMonths: 72,
    residualPercent: 0.1,
    maxQuantity: 4,
  },
  {
    slug: "monitor",
    sku: "MON-27",
    name: "Monitor 27\"",
    category: "monitorizacao",
    type: "HARDWARE",
    supplier: "lusonet",
    cost: 190,
    referencePrice: 259,
    description: "Monitor IPS 27\" para multiview e controlo.",
    benefit: "Visão de todas as câmeras de uma vez.",
    image: "/products/monitor.svg",
    warrantyMonths: 24,
    expectedLifeMonths: 60,
    residualPercent: 0.1,
    maxQuantity: 4,
  },
  {
    slug: "ups",
    sku: "PWR-UPS15",
    name: "UPS 1500VA",
    category: "energia",
    type: "HARDWARE",
    supplier: "proav",
    cost: 290,
    referencePrice: 389,
    description: "Autonomia de 15 minutos para todo o sistema.",
    benefit: "A transmissão não cai com falhas de luz.",
    image: "/products/ups.svg",
    warrantyMonths: 24,
    expectedLifeMonths: 60,
    residualPercent: 0.1,
    maxQuantity: 3,
  },
  {
    slug: "kit-cabos",
    sku: "CAB-KIT",
    name: "Kit de cabos",
    category: "cabos",
    type: "CONSUMABLE",
    supplier: "proav",
    cost: 90,
    description: "Cabos de rede, HDMI e energia certificados e etiquetados.",
    benefit: "Instalação limpa e organizada.",
    image: "/products/cables.svg",
    residualPercent: 0,
    maxQuantity: 6,
  },
  {
    slug: "suporte-parede-ptz",
    sku: "ACC-WALL",
    name: "Suporte de parede PTZ",
    category: "outros",
    type: "HARDWARE",
    supplier: "proav",
    cost: 45,
    description: "Suporte metálico para fixação de câmeras.",
    benefit: "Câmeras discretas e seguras.",
    image: "/products/wall-mount.svg",
    expectedLifeMonths: 120,
    residualPercent: 0,
    maxQuantity: 8,
  },
  {
    slug: "instalacao-standard",
    sku: "INST-STD",
    name: "Instalação Standard",
    category: "instalacao",
    type: "INSTALLATION",
    supplier: "internal",
    cost: 350,
    description: "Montagem, cablagem e testes num dia.",
    benefit: "Sistema pronto a usar no domingo.",
    image: "/products/installation.svg",
    maxQuantity: 1,
    installation: { estimatedHours: 8, technicians: 2 },
  },
  {
    slug: "instalacao-advanced",
    sku: "INST-ADV",
    name: "Instalação Advanced",
    category: "instalacao",
    type: "INSTALLATION",
    supplier: "internal",
    cost: 650,
    description: "Instalação multicâmera com passagem de cabos em calha.",
    benefit: "Acabamento invisível e profissional.",
    image: "/products/installation.svg",
    maxQuantity: 1,
    installation: { estimatedHours: 16, technicians: 2 },
  },
  {
    slug: "configuracao-broadcast",
    sku: "SRV-CFG-BC",
    name: "Configuração Broadcast",
    category: "servicos",
    type: "SERVICE",
    supplier: "internal",
    cost: 150,
    description: "Cenas, streaming para YouTube/Facebook e gravação.",
    benefit: "Transmissão pronta com um clique.",
    image: "/products/service.svg",
    maxQuantity: 1,
    service: { deliveryMode: "HYBRID", durationHours: 4 },
  },
  {
    slug: "configuracao-obs",
    sku: "SRV-CFG-OBS",
    name: "Configuração OBS",
    category: "servicos",
    type: "SERVICE",
    supplier: "internal",
    cost: 90,
    description: "Perfis, cenas e overlays no OBS Studio.",
    benefit: "Software gratuito, configurado por especialistas.",
    image: "/products/service.svg",
    maxQuantity: 1,
    service: { deliveryMode: "REMOTE", durationHours: 3 },
  },
  {
    slug: "configuracao-vmix",
    sku: "SRV-CFG-VMIX",
    name: "Configuração vMix",
    category: "servicos",
    type: "SERVICE",
    supplier: "internal",
    cost: 150,
    description: "Projeto vMix com gráficos, replays e multiview.",
    benefit: "Produção ao nível de televisão.",
    image: "/products/service.svg",
    maxQuantity: 1,
    service: { deliveryMode: "HYBRID", durationHours: 5 },
  },
  {
    slug: "configuracao-ptz",
    sku: "SRV-CFG-PTZ",
    name: "Configuração PTZ",
    category: "servicos",
    type: "SERVICE",
    supplier: "internal",
    cost: 70,
    description: "Presets de posição para cada momento do culto.",
    benefit: "Planos perfeitos sem improviso.",
    image: "/products/service.svg",
    maxQuantity: 1,
    service: { deliveryMode: "ONSITE", durationHours: 2 },
  },
  {
    slug: "configuracao-stream-deck",
    sku: "SRV-CFG-SD",
    name: "Configuração Stream Deck",
    category: "servicos",
    type: "SERVICE",
    supplier: "internal",
    cost: 60,
    description: "Botões personalizados com ícones da igreja.",
    benefit: "Qualquer voluntário opera o sistema.",
    image: "/products/service.svg",
    maxQuantity: 1,
    service: { deliveryMode: "REMOTE", durationHours: 2 },
  },
  {
    slug: "formacao",
    sku: "SRV-TRAIN",
    name: "Formação da equipa",
    category: "servicos",
    type: "SERVICE",
    supplier: "internal",
    cost: 180,
    description: "Sessão prática de 3 horas para voluntários.",
    benefit: "Equipa autónoma desde o primeiro culto.",
    image: "/products/training.svg",
    maxQuantity: 3,
    unitLabel: "sessão",
    service: { deliveryMode: "ONSITE", durationHours: 3 },
  },
];

export const SUPPORT_PLANS = [
  {
    slug: "basic",
    name: "Basic",
    description: "Incluído em todos os contratos.",
    monthlyCost: 5,
    monthlyPrice: 0,
    responseTimeHours: 48,
    onSite: false,
    isDefault: true,
    features: ["Suporte por email", "Resposta em 48h úteis", "Atualizações de software"],
  },
  {
    slug: "remote",
    name: "Remote",
    description: "Assistência remota em direto.",
    monthlyCost: 15,
    monthlyPrice: 29,
    responseTimeHours: 8,
    onSite: false,
    features: ["Suporte remoto em direto", "Resposta em 8h", "Assistência aos domingos"],
  },
  {
    slug: "premium",
    name: "Premium",
    description: "Prioridade máxima e visitas regulares.",
    monthlyCost: 40,
    monthlyPrice: 69,
    responseTimeHours: 4,
    onSite: true,
    features: ["Resposta prioritária em 4h", "Monitorização remota", "Visita técnica trimestral", "Equipamento de substituição"],
  },
  {
    slug: "on-site",
    name: "On-site",
    description: "Técnico dedicado no local.",
    monthlyCost: 90,
    monthlyPrice: 149,
    responseTimeHours: 24,
    onSite: true,
    features: ["Técnico no local em 24h", "Visitas mensais", "Operação assistida em eventos", "Substituição imediata"],
  },
] as const;

type PlanLine = { product: string; variant?: string; quantity: number };

export const PLANS: {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlight?: string;
  support: (typeof SUPPORT_PLANS)[number]["slug"];
  contractMonths: number;
  upfrontPercent: number;
  multiplierOverride?: number;
  items: PlanLine[];
}[] = [
  {
    slug: "broadcast-start",
    name: "Broadcast Start",
    tagline: "Comece a transmitir com qualidade.",
    description: "Uma câmera robotizada, produção simples e formação da equipa.",
    support: "basic",
    contractMonths: 24,
    upfrontPercent: 0.3,
    items: [
      { product: "camera-ptz", variant: "PTZ-STD", quantity: 1 },
      { product: "controladora-ptz", quantity: 1 },
      { product: "computador-broadcast", variant: "PC-BC-BASIC", quantity: 1 },
      { product: "stream-deck-xl", quantity: 1 },
      { product: "switch-gigabit", quantity: 1 },
      { product: "kit-cabos", quantity: 1 },
      { product: "instalacao-standard", quantity: 1 },
      { product: "configuracao-broadcast", quantity: 1 },
      { product: "formacao", quantity: 1 },
    ],
  },
  {
    slug: "broadcast-pro",
    name: "Broadcast Pro",
    tagline: "Multicâmera, pronto para crescer.",
    description: "Duas câmeras PTZ, produção dedicada e infraestrutura completa.",
    highlight: "Mais escolhido",
    support: "basic",
    contractMonths: 24,
    upfrontPercent: 0.3,
    items: [
      { product: "camera-ptz", variant: "PTZ-STD", quantity: 2 },
      { product: "controladora-ptz", quantity: 1 },
      { product: "computador-broadcast", variant: "PC-BC-BASIC", quantity: 1 },
      { product: "stream-deck-xl", quantity: 1 },
      { product: "switch-gigabit", quantity: 1 },
      { product: "ups", quantity: 1 },
      { product: "monitor", quantity: 1 },
      { product: "kit-cabos", quantity: 1 },
      { product: "instalacao-standard", quantity: 1 },
      { product: "configuracao-broadcast", quantity: 1 },
      { product: "formacao", quantity: 1 },
    ],
  },
  {
    slug: "broadcast-premium",
    name: "Broadcast Premium",
    tagline: "Produção ao nível de televisão.",
    description: "Três câmeras NDI, realização vMix e suporte premium.",
    support: "premium",
    contractMonths: 36,
    upfrontPercent: 0.3,
    multiplierOverride: 1.75,
    items: [
      { product: "camera-ptz", variant: "PTZ-NDI", quantity: 3 },
      { product: "controladora-ptz", quantity: 1 },
      { product: "computador-broadcast", variant: "PC-BC-ADV", quantity: 1 },
      { product: "licenca-vmix", quantity: 1 },
      { product: "stream-deck-xl", quantity: 1 },
      { product: "interface-audio", quantity: 1 },
      { product: "switch-gigabit", quantity: 1 },
      { product: "ups", quantity: 1 },
      { product: "monitor", quantity: 2 },
      { product: "kit-cabos", quantity: 2 },
      { product: "instalacao-advanced", quantity: 1 },
      { product: "configuracao-broadcast", quantity: 1 },
      { product: "configuracao-vmix", quantity: 1 },
      { product: "formacao", quantity: 2 },
    ],
  },
];

export const PAYMENT_CONDITIONS = [
  { name: "Standard", description: "24 meses · 30% de entrada", contractMonths: 24, upfrontPercent: 0.3 },
  { name: "Entrada reduzida", description: "36 meses · 20% de entrada", contractMonths: 36, upfrontPercent: 0.2 },
  { name: "Mensalidade baixa", description: "24 meses · 50% de entrada", contractMonths: 24, upfrontPercent: 0.5 },
  { name: "Curto prazo", description: "12 meses · 40% de entrada", contractMonths: 12, upfrontPercent: 0.4 },
];

export interface SeedClient {
  key: string;
  name: string;
  city: string;
  status: "LEAD" | "PROSPECT" | "ACTIVE" | "INACTIVE";
  email: string;
  phone: string;
  contact: { name: string; role: string; email?: string; phone?: string };
}

export const CLIENTS: SeedClient[] = [
  { key: "ibc", name: "Igreja Batista Central", city: "Lisboa", status: "PROSPECT", email: "secretaria@ibcentral.example", phone: "+351 912 000 101", contact: { name: "Pr. João Silva", role: "Pastor titular", email: "joao.silva@ibcentral.example", phone: "+351 912 000 101" } },
  { key: "novavida", name: "Igreja Evangélica Nova Vida", city: "Porto", status: "ACTIVE", email: "geral@novavida.example", phone: "+351 913 000 202", contact: { name: "Pr. Marcos Almeida", role: "Pastor", phone: "+351 913 000 202" } },
  { key: "esperanca", name: "Comunidade Cristã Esperança", city: "Braga", status: "ACTIVE", email: "info@esperanca.example", phone: "+351 914 000 303", contact: { name: "Pra. Helena Costa", role: "Pastora", phone: "+351 914 000 303" } },
  { key: "adcoimbra", name: "Assembleia de Deus Coimbra", city: "Coimbra", status: "ACTIVE", email: "media@adcoimbra.example", phone: "+351 915 000 404", contact: { name: "Pr. Daniel Rocha", role: "Pastor", phone: "+351 915 000 404" } },
  { key: "faro", name: "Igreja Presbiteriana de Faro", city: "Faro", status: "ACTIVE", email: "igreja@ipfaro.example", phone: "+351 916 000 505", contact: { name: "Rev. Paulo Neves", role: "Reverendo", phone: "+351 916 000 505" } },
  { key: "vidaplena", name: "Comunidade Vida Plena", city: "Setúbal", status: "ACTIVE", email: "ola@vidaplena.example", phone: "+351 917 000 606", contact: { name: "Pr. André Lopes", role: "Pastor", phone: "+351 917 000 606" } },
  { key: "funchal", name: "Igreja Metodista do Funchal", city: "Funchal", status: "ACTIVE", email: "geral@imfunchal.example", phone: "+351 918 000 707", contact: { name: "Pr. Miguel Freitas", role: "Pastor", phone: "+351 918 000 707" } },
  { key: "aveiro", name: "Igreja da Graça Aveiro", city: "Aveiro", status: "PROSPECT", email: "contacto@gracaaveiro.example", phone: "+351 919 000 808", contact: { name: "Pr. Samuel Dias", role: "Pastor", phone: "+351 919 000 808" } },
  { key: "leiria", name: "Igreja Batista de Leiria", city: "Leiria", status: "LEAD", email: "secretaria@ibleiria.example", phone: "+351 920 000 909", contact: { name: "Pr. Filipe Matos", role: "Pastor", phone: "+351 920 000 909" } },
  { key: "evora", name: "Comunidade Monte Sião", city: "Évora", status: "INACTIVE", email: "geral@montesiao.example", phone: "+351 921 000 010", contact: { name: "Pr. Ricardo Sousa", role: "Pastor", phone: "+351 921 000 010" } },
];

type ProposalStatus = "DRAFT" | "PRESENTED" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";
type ContractStatus = "AWAITING_SIGNATURE" | "AWAITING_INSTALLATION" | "ACTIVE" | "SUSPENDED" | "ENDED";

export interface SeedProposal {
  client: string;
  plan: string;
  status: ProposalStatus;
  /** Days ago the proposal was created. */
  createdDaysAgo: number;
  contractMonths?: number;
  upfrontPercent?: number;
  swapToNdi?: boolean;
  extraCameras?: number;
  support?: (typeof SUPPORT_PLANS)[number]["slug"];
  contract?: { status: ContractStatus; startMonthsAgo: number };
}

export const PROPOSALS: SeedProposal[] = [
  { client: "novavida", plan: "broadcast-pro", status: "CONVERTED", createdDaysAgo: 430, support: "remote", contract: { status: "ACTIVE", startMonthsAgo: 13 } },
  { client: "esperanca", plan: "broadcast-start", status: "CONVERTED", createdDaysAgo: 360, contract: { status: "ACTIVE", startMonthsAgo: 11 } },
  { client: "adcoimbra", plan: "broadcast-premium", status: "CONVERTED", createdDaysAgo: 300, contract: { status: "ACTIVE", startMonthsAgo: 9 } },
  { client: "faro", plan: "broadcast-pro", status: "CONVERTED", createdDaysAgo: 230, swapToNdi: true, contract: { status: "ACTIVE", startMonthsAgo: 7 } },
  { client: "vidaplena", plan: "broadcast-pro", status: "CONVERTED", createdDaysAgo: 150, extraCameras: 1, contractMonths: 36, contract: { status: "ACTIVE", startMonthsAgo: 4 } },
  { client: "funchal", plan: "broadcast-start", status: "CONVERTED", createdDaysAgo: 80, support: "remote", contract: { status: "ACTIVE", startMonthsAgo: 2 } },
  { client: "evora", plan: "broadcast-start", status: "CONVERTED", createdDaysAgo: 700, contractMonths: 12, contract: { status: "ENDED", startMonthsAgo: 20 } },
  { client: "novavida", plan: "broadcast-start", status: "CONVERTED", createdDaysAgo: 25, contractMonths: 24, upfrontPercent: 0.4, contract: { status: "AWAITING_INSTALLATION", startMonthsAgo: 0 } },
  { client: "aveiro", plan: "broadcast-pro", status: "SENT", createdDaysAgo: 6 },
  { client: "aveiro", plan: "broadcast-start", status: "REJECTED", createdDaysAgo: 60 },
  { client: "leiria", plan: "broadcast-start", status: "DRAFT", createdDaysAgo: 2 },
  { client: "esperanca", plan: "broadcast-premium", status: "VIEWED", createdDaysAgo: 9, contractMonths: 48 },
  { client: "faro", plan: "broadcast-premium", status: "EXPIRED", createdDaysAgo: 120 },
  { client: "adcoimbra", plan: "broadcast-pro", status: "PRESENTED", createdDaysAgo: 3, swapToNdi: true },
];

# Cripto Monitor
[![Licença](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)

Uma aplicação web para monitoramento de criptomoedas em tempo real, com visualização de preços, gráficos, carteira de investimentos e alertas de preço.

## 🚀 Funcionalidades
- **Monitoramento em Tempo Real**: Acompanhe os preços das criptomoedas em diferentes exchanges (Mercado Bitcoin e CoinGecko)
- **Oportunidades de Arbitragem**: Identifique automaticamente diferenças de preço entre exchanges
- **Carteira de Investimentos**: Gerencie seu portfólio de criptomoedas
- **Alertas de Preço**: Configure notificações quando uma criptomoeda atingir um valor específico
- **Gráficos Interativos**: Visualize o histórico de preços com mini-gráficos
- **Modo Offline**: Continue acessando os dados mesmo sem conexão à internet
- **Interface Responsiva**: Funciona perfeitamente em desktop e dispositivos móveis
- **Temas Claro/Escuro**: Escolha entre temas para melhor visualização
- **Internacionalização**: Suporte a múltiplos idiomas (Português, Inglês e Espanhol)

## 📱 Capturas de Tela
*(Adicione capturas de tela aqui quando disponíveis)*

## 🛠️ Tecnologias Utilizadas
- **HTML5**: Estrutura semântica da aplicação
- **CSS3**: Estilização com animações e efeitos visuais
- **JavaScript (ES6+)**: Lógica da aplicação e manipulação de dados
- **Chart.js**: Biblioteca para criação de gráficos
- **Tailwind CSS**: Framework CSS para estilização
- **APIs Externas**:
  - Mercado Bitcoin API
  - CoinGecko API

## 🏗️ Arquitetura do Sistema
### Arquitetura do Frontend
- **JavaScript Vanilla**: Arquitetura modular ES6+ com módulos separados para diferentes preocupações
- **Aplicativo Web Progressivo (PWA)**: Implementação completa de PWA com manifesto, service worker e capacidades offline
- **Design Responsivo**: Abordagem mobile-first usando Tailwind CSS para estilização
- **Sistema de Módulos**: Separação clara de preocupações com módulos dedicados:
  - Manipulação de API com cache e limitação de taxa
  - Gestão de portfólio com rastreamento detalhado
  - Sistema de alertas com notificações do navegador
  - Visualização de gráficos usando Chart.js
  - Gestão de temas (modos escuro/claro/automático)
  - Armazenamento local com fallback para IndexedDB
  - Integração de análises com controles de privacidade
  - Módulos utilitários para formatação e validação

### Gestão de Dados
- **Armazenamento do Lado do Cliente**: Abordagem de armazenamento multicamadas
  - Primário: localStorage para configurações e dados do portfólio
  - Secundário: IndexedDB para grandes conjuntos de dados e dados offline
  - Alternativo: Cache em memória para navegadores com limitações de armazenamento
- **Cache de Dados**: Sistema inteligente de cache com TTL configurável
- **Suporte Offline**: Service worker gerencia funcionalidade offline e sincronização em segundo plano

### Integração de API Externa
- **API CoinGecko**: Fonte primária de dados para informações de criptomoedas
- **Limitação de Taxa**: Limitação de solicitações integrada para respeitar os limites da API
- **Tratamento de Erros**: Tratamento abrangente de erros com mecanismos alternativos
- **Fila de Solicitações**: Gestão inteligente de solicitações para otimizar o uso da API

### Sistema de Notificação
- **Notificações Multicanal**: Toasts no aplicativo, notificações do navegador e alertas sonoros
- **Alertas de Preço**: Limites de preço configuráveis com várias condições de disparo
- **Monitoramento em Segundo Plano**: Service worker permite monitoramento de preços em segundo plano

### Otimizações de Desempenho
- **Carregamento Preguiçoso (Lazy Loading)**: Carregamento dinâmico de módulos baseado em interações do usuário
- **Agrupamento de Solicitações**: Agrupamento eficiente de solicitações de API para minimizar chamadas de rede
- **Gestão de Memória**: Limpeza adequada e tratamento de coleta de lixo
- **Otimização de Imagens**: Ícones SVG e ativos otimizados para carregamento rápido

## 📦 Dependências Externas
### Bibliotecas Principais
- **Chart.js**: Biblioteca avançada de gráficos para visualização de preços e análises de portfólio
- **Tailwind CSS**: Framework CSS utilitário via CDN para estilização rápida
- **Feather Icons**: Biblioteca de ícones leve para elementos de UI consistentes

### APIs Externas
- **CoinGecko API v3**: Provedor principal de dados de criptomoedas
  - Dados de mercado e informações de preços
  - Dados históricos de preços para gráficos
  - Estatísticas globais do mercado
  - Criptomoedas em tendência
  - Funcionalidade de busca e listagem de moedas

### APIs Web
- **Service Worker API**: Para funcionalidade offline e tarefas em segundo plano
- **Notification API**: Notificações do navegador para alertas de preço
- **Web Audio API**: Sons de alerta personalizados e feedback de áudio
- **Intersection Observer API**: Otimização de desempenho para carregamento baseado em viewport
- **localStorage/IndexedDB**: Persistência de dados do lado do cliente

### Análise e Rastreamento
- **Google Analytics 4**: Rastreamento de comportamento do usuário com controles de privacidade
- **Análise Personalizada**: Rastreamento interno de eventos para métricas específicas do aplicativo

### Infraestrutura PWA
- **Web App Manifest**: Instalação do aplicativo e comportamento semelhante a nativo
- **Service Worker**: Cache, suporte offline e sincronização em segundo plano
- **Push Notifications**: Pronto para o futuro para notificações enviadas pelo servidor

### Recursos de Fontes
- **Google Fonts**: Família de fontes Inter para tipografia moderna
- **JetBrains Mono**: Fonte monoespaçada para exibição de dados numéricos

## 📦 Instalação
1. Clone o repositório:
   ```bash
   git clone https://github.com/SamuelOliveiraBRA/monitor-stablecoins
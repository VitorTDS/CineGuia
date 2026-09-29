# CineGuia

Catálogo de filmes e séries para descobrir **onde assistir no Brasil**. O CineGuia não reproduz vídeos: ele mostra sinopse, trailer, elenco e em quais serviços de streaming, aluguel ou compra cada título está disponível.

Os dados vêm da API do [TMDB](https://www.themoviedb.org/), e as informações de onde assistir vêm da [JustWatch](https://www.justwatch.com/br). Os clássicos em domínio público vêm do [Internet Archive](https://archive.org/).

**Acesse o site: https://cineguia.onrender.com**

> O site está hospedado no plano gratuito do Render. Depois de um tempo sem acessos ele "dorme", e o primeiro carregamento pode levar cerca de 1 minuto.

## Funcionalidades

- Listas **Em alta**, **Filmes** e **Séries**, com rolagem infinita
- **Busca** por qualquer filme ou série
- **Filtros** por gênero, época e nota mínima
- **Cinema**: filmes **em cartaz** e **em breve** nos cinemas do Brasil, com a data de estreia brasileira
- **Lembretes**: toque no sino de um título para ser avisado. Ao abrir o site, o CineGuia confere e avisa o que estreou, o que chegou a uma plataforma e se a estreia foi remarcada. Para estreias futuras, dá para adicionar ao Google Agenda ou baixar o evento (.ics) com alarme no dia
- **Sagas**: linha do tempo de franquias ao longo dos anos. As coleções de filmes do TMDB (ex.: Harry Potter, Velozes e Furiosos) aparecem automaticamente e dá para buscar qualquer uma; **Marvel** e **Star Wars** reúnem filmes e séries e podem ser vistas em **ordem de lançamento** ou **ordem da história**. Nos detalhes de cada título aparece a saga da qual ele faz parte
- **Assistir grátis**: clássicos em **domínio público** que tocam dentro do próprio site (acervo do [Internet Archive](https://archive.org/details/feature_films)). Só entram filmes marcados como domínio público, com vídeo compatível e sem conteúdo adulto; filmes em partes ganham botões para trocar de parte
- **Top 10 por plataforma**: filmes e séries em alta na Netflix, Prime Video, Disney+, HBO Max, Globoplay, Apple TV+, Paramount+ e Crunchyroll (pela popularidade no TMDB entre os títulos de cada plataforma no Brasil)
- **Detalhes** de cada título: sinopse, onde assistir, trailer, elenco, temporadas e episódios, e títulos semelhantes
- **Links para as plataformas**: tocar num serviço abre o título nele (Netflix, Prime Video, Apple TV, Google Play, YouTube e Crunchyroll abrem a busca do título; os demais abrem a página de onde assistir do TMDB)
- **Sem plataforma no Brasil**: mostra se o filme está em cartaz ou vai estrear nos cinemas, e onde está disponível em outros países
- **Responsivo**: funciona em celulares (em pé e deitados), tablets, notebooks e monitores grandes
- **Link direto** para cada título (ex.: `http://localhost:3000/#serie/1396`)
- **Minha lista** com lembretes e favoritos, salvos no navegador de cada pessoa
- **Tema claro e escuro**

## Requisitos

- [Node.js](https://nodejs.org/) **20.12 ou mais recente**
- Uma chave gratuita da API do TMDB

O projeto não tem dependências, então não é preciso rodar `npm install`.

## Como rodar

### 1. Obtenha a chave do TMDB

1. Crie uma conta em [themoviedb.org](https://www.themoviedb.org/signup) e confirme o e-mail.
2. Acesse **Configurações → API** ([link direto](https://www.themoviedb.org/settings/api)).
3. Peça uma chave do tipo **Developer** e responda que o uso é **pessoal**.
4. Copie a **Chave da API** ou o **Token de Leitura da API**. Qualquer um dos dois funciona.

### 2. Configure a chave

Na pasta do projeto, copie o arquivo de exemplo:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Abra o `.env` e cole a sua chave:

```
TMDB_API_KEY=sua_chave_aqui
PORT=3000
```

O `.env` fica fora do Git (está no `.gitignore`). Nunca envie esse arquivo para o GitHub nem compartilhe a chave.

### 3. Inicie o servidor

```bash
npm start
```

Depois abra **http://localhost:3000** no navegador.

Para usar outra porta, mude `PORT` no `.env`.

## Estrutura

```
filmes-series/
├── server.js          # Servidor Node: entrega a página e consulta o TMDB
├── public/
│   ├── index.html     # Página
│   ├── styles.css     # Visual, com os temas claro e escuro
│   ├── app.js         # Lógica da interface
│   ├── theme.js       # Aplica o tema salvo antes de a página aparecer
│   └── favicon.svg
├── data/sagas.json    # Sagas geradas por "npm run sagas"
├── scripts/           # Lista das sagas e o script que as monta a partir do TMDB
├── .env.example       # Modelo de configuração
└── package.json
```

O navegador nunca fala direto com o TMDB. Ele chama o `server.js`, que adiciona a chave e repassa o pedido. Assim a chave não fica exposta na página. O servidor também guarda as respostas em cache por 10 minutos para economizar requisições.

### Rotas da API interna

| Rota | O que retorna |
|---|---|
| `GET /api/list?category=trending\|movies\|series&page=N` | Lista de títulos. Filmes e séries aceitam `genre`, `from`, `to` e `rating` |
| `GET /api/search?q=texto&page=N` | Resultado da busca |
| `GET /api/genres/movie\|tv` | Lista de gêneros |
| `GET /api/cinema?section=now_playing\|upcoming&page=N` | Filmes em cartaz ou em breve nos cinemas do Brasil |
| `GET /api/reminders/check?items=movie:ID,tv:ID` | Situação atual dos títulos com lembrete (estreia e plataformas) |
| `GET /api/sagas` | Sagas completas e coleções em destaque |
| `GET /api/sagas/search?q=texto` | Busca de coleções de filmes no TMDB |
| `GET /api/saga/collection/ID` | Linha do tempo de uma coleção do TMDB |
| `GET /api/saga/curated/marvel\|star-wars` | Linha do tempo de uma saga completa (filmes + séries) |
| `GET /api/public-domain?page=N&q=texto` | Clássicos em domínio público do Internet Archive |
| `GET /api/public-domain/ID` | Detalhes e arquivos de vídeo de um clássico |
| `GET /api/platforms` | Plataformas de streaming em destaque no Brasil |
| `GET /api/platform-top?provider=ID` | Top 10 filmes e Top 10 séries de uma plataforma |
| `GET /api/title/movie\|tv/ID` | Detalhes completos do título |
| `GET /api/title/tv/ID/season/N` | Episódios de uma temporada |

## Publicação

O site é publicado no [Render](https://render.com/) como **Web Service** gratuito, ligado a este repositório:

| Configuração | Valor |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Variável de ambiente | `TMDB_API_KEY` com a chave do TMDB |

Cada envio para o branch `main` publica uma nova versão automaticamente. Não defina `PORT` no Render: ele informa a porta sozinho.

## Atualizar as sagas (Marvel, Star Wars e coleções em destaque)

As sagas montadas à mão ficam em `scripts/sagas-source.js`, com os títulos listados na **ordem da história**. Quando sair um filme ou série novo:

1. Adicione o título original em inglês e o ano de lançamento na posição certa da lista.
2. Rode `npm run sagas`. O script procura cada título no TMDB e gera `data/sagas.json`, avisando se algum não teve correspondência exata.
3. Confira os avisos, faça o commit de `data/sagas.json` e envie.

## Verificação de sintaxe

```bash
npm run check
```

## Problemas comuns

| Mensagem | Solução |
|---|---|
| *Chave do TMDB não configurada* | Crie o arquivo `.env` com `TMDB_API_KEY` (passo 2) |
| *Chave do TMDB inválida* | Confira se a chave foi copiada inteira, sem espaços |
| `process.loadEnvFile is not a function` | Atualize o Node.js para a versão 20.12 ou mais recente |
| `EADDRINUSE` | A porta já está em uso. Feche o outro servidor ou mude `PORT` no `.env` |

## Termos de uso

Este projeto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. A chave gratuita vale apenas para **uso não comercial**. Para ganhar dinheiro com o site (anúncios, assinaturas etc.), é preciso uma licença comercial do TMDB.

// Browser scenarios. Each step opens `path` and runs `run` inside the page (it is serialized, so it cannot
// use variables from this file; data goes in `args`). `fresh` clears the site's storage first.

const DESKTOP = { width: 1300, height: 900 };
const DEVICES = [
  { name: 'celular pequeno', width: 320, height: 568, dpr: 2, mobile: true },
  { name: 'celular', width: 390, height: 844, dpr: 3, mobile: true },
  { name: 'celular deitado', width: 844, height: 390, dpr: 3, mobile: true },
  { name: 'tablet', width: 768, height: 1024, dpr: 2, mobile: true },
  { name: 'notebook', width: 1366, height: 768 }
];

module.exports = [
  {
    name: 'Catálogo',
    steps: [{
      fresh: true,
      device: DESKTOP,
      run: async ({ $, grid, titles, sleep, waitFor, search, tab, select, check }) => {
        await waitFor(() => grid().length >= 20);
        for (let i = 0; i < 4 && grid().length < 60; i++) {
          const before = grid().length;
          window.scrollTo(0, document.documentElement.scrollHeight);
          await waitFor(() => grid().length > before, 4000);
        }
        check('Rolagem infinita carrega até a última página', grid().length === 60, grid().length);
        window.scrollTo(0, 0);

        check('Filtros escondidos em "Em alta"', $('filters').classList.contains('hidden'));
        tab('movies');
        await waitFor(() => $('filterGenre').options.length === 3);
        check('Filtros aparecem em Filmes com os gêneros do TMDB', [...$('filterGenre').options].map((o) => o.text).join(',') === 'Todos,Ação,Terror');
        select('filterGenre', '27');
        await waitFor(() => grid().length && titles()[0].includes('[g=27]'));
        check('Filtro de gênero aplica', titles().every((t) => t.includes('[g=27]')) && $('sectionTitle').textContent === 'Filmes filtrados');
        $('filtersClear').click();
        await waitFor(() => grid().length && titles()[0].includes('[g=]'));
        check('Limpar filtros volta ao normal', $('filterGenre').value === '' && $('sectionTitle').textContent === 'Filmes populares');
        tab('series');
        await waitFor(() => $('filterGenre').options.length === 2);
        check('Séries usa gêneros de séries', [...$('filterGenre').options].map((o) => o.text).join(',') === 'Todos,Drama');

        tab('trending');
        await waitFor(() => grid().length >= 20);
        const firstFav = grid()[0].querySelector('.fav-button');
        const favTitle = titles()[0];
        firstFav.click();
        check('Coração marca favorito e mostra aviso', firstFav.getAttribute('aria-pressed') === 'true' && $('toast').textContent.includes('adicionado'));
        tab('favorites');
        await waitFor(() => grid().length === 1);
        check('Minha lista mostra o favorito', titles()[0] === favTitle && !$('backupView').classList.contains('hidden'));
        grid()[0].querySelector('.fav-button').click();
        check('Remover na Minha lista esvazia os favoritos', grid().length === 0 && $('grid').textContent.includes('Nenhum favorito'));

        search('origem');
        await waitFor(() => grid().length === 2);
        check('Busca ignora pessoas e escapa HTML do título', grid()[0].querySelector('b') === null && titles()[0].includes('<b>origem</b>'));
        const img = grid()[0].querySelector('img');
        check('Pôster com versões em alta resolução', !!img && img.srcset.includes('/w780/poster7.jpg 780w'));

        grid()[0].querySelector('.card-open').click();
        await waitFor(() => $('detailsTitle'));
        const body = $('detailsBody');
        check('Abrir título muda o endereço para /filme/7', location.pathname === '/filme/7', location.pathname);
        check('Sinopse usa o texto em inglês quando falta em português', body.textContent.includes('English overview fallback.'));
        check('Trailer em português preferido', body.querySelector('iframe').src.endsWith('/embed/ptTrailer01'));
        const people = [...body.querySelectorAll('.person')];
        check('Elenco com nome, personagem e iniciais sem foto', people.length === 2 && people[0].textContent.includes('Cobb') && people[0].querySelector('.placeholder').textContent === 'LD');
        const links = [...body.querySelectorAll('a.provider-link')];
        const linkOf = (name) => links.find((a) => a.textContent.replace('↗', '').trim() === name);
        check('Netflix sem duplicata e abre a busca na Netflix', links.filter((a) => a.textContent.includes('Netflix')).length === 1 && linkOf('Netflix').href === 'https://www.netflix.com/search?q=A%20Origem');
        check('Plataforma sem link próprio usa a página do TMDB', linkOf('Plataforma Desconhecida').href.startsWith('https://www.themoviedb.org/movie/27205/watch'));
        body.querySelector('.action-button').click();
        await waitFor(() => $('toast').textContent.includes('ink'));
        check('Copiar link usa o endereço novo', /Link copiado|\/filme\/7/.test($('toast').textContent), $('toast').textContent);

        [...body.querySelectorAll('.recommendations .card-open')][0].click();
        await waitFor(() => $('detailsTitle') && $('detailsTitle').textContent === 'Tenet');
        check('Semelhante abre o outro título e muda o endereço', location.pathname === '/filme/555');
        history.back();
        await waitFor(() => $('detailsTitle') && $('detailsTitle').textContent === 'A Origem');
        check('Voltar do navegador retorna ao título anterior', location.pathname === '/filme/7');
        [...$('detailsBody').querySelectorAll('.recommendations .card-open')][1].click();
        await waitFor(() => $('detailsTitle') && $('detailsTitle').textContent === 'Amnésia');
        const unavailable = $('detailsBody');
        check('Sem plataforma no Brasil: em cartaz nos cinemas', unavailable.querySelector('.release-status').textContent.startsWith('Em cartaz nos cinemas'));
        check('Sem plataforma no Brasil: disponível em outros países', [...unavailable.querySelectorAll('.provider.abroad')].length === 2);
        $('closeDetails').click();
        await waitFor(() => !$('details').open && location.pathname === '/');
        check('Fechar depois de navegar volta para a página inicial', !$('details').open && location.pathname === '/', location.pathname);

        grid()[1].querySelector('.card-open').click();
        await waitFor(() => $('detailsBody').querySelectorAll('.episode').length === 3);
        const seasonSelect = $('detailsBody').querySelector('.season-select');
        check('Temporadas em ordem, Especiais por último', [...seasonSelect.options].map((o) => o.value).join(',') === '1,2,0');
        select(seasonSelect.id, '2');
        await waitFor(() => $('detailsBody').textContent.includes('Ep T2E1'));
        check('Trocar de temporada carrega os episódios', $('detailsBody').querySelectorAll('.episode').length === 2);
        $('closeDetails').click();
        await waitFor(() => !$('details').open);

        tab('platforms');
        await waitFor(() => document.querySelectorAll('.ranking-item').length === 20);
        check('Top 10 com 8 plataformas e 2 rankings filtrados', document.querySelectorAll('.platform-chip').length === 8 && !document.body.textContent.includes('SEM-FILTRO'));

        const darkBg = getComputedStyle(document.body).backgroundColor;
        $('themeToggle').click();
        check('Tema claro muda as cores e fica salvo', darkBg !== getComputedStyle(document.body).backgroundColor && localStorage.getItem('cineguia-theme') === 'light');
        $('themeToggle').click();
      }
    }]
  },
  {
    name: 'Links diretos',
    steps: [
      {
        fresh: true,
        path: '/filme/7',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => $('detailsTitle'));
          check('/filme/7 abre o título', $('details').open && $('detailsTitle').textContent === 'A Origem' && document.title.startsWith('A Origem'));
          $('closeDetails').click();
          await waitFor(() => !$('details').open && location.pathname === '/');
          check('Fechar o link direto continua no site, na página inicial', location.pathname === '/' && !$('details').open);
        }
      },
      {
        path: '/#filme/7',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => $('detailsTitle'));
          check('Link antigo com # ainda funciona e vira /filme/7', $('detailsTitle').textContent === 'A Origem' && location.pathname === '/filme/7' && location.hash === '', location.href);
        }
      },
      {
        path: '/serie/42',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => $('detailsTitle'));
          check('/serie/42 abre a série', $('detailsTitle').textContent === 'Série Com Temporadas');
        }
      }
    ]
  },
  {
    name: 'Já assisti',
    steps: [
      {
        fresh: true,
        run: async () => {
          // A mark saved by an older version: only the key, no title data.
          localStorage.setItem('cineguia-assistidos', JSON.stringify(['movie-7']));
        }
      },
      {
        run: async ({ $, grid, waitFor, search, tab, check }) => {
          await waitFor(() => grid().length >= 20);
          tab('favorites');
          await waitFor(() => $('watchedGrid').textContent.includes('A Origem'));
          check('Marcação antiga recuperada com nome e pôster', $('watchedGrid').querySelectorAll('.card').length === 1 && $('watchedSummary').textContent === '1 filme · 0 séries');
          search('origem');
          await waitFor(() => grid().length === 2);
          grid()[1].querySelector('.card-open').click();
          await waitFor(() => $('detailsTitle') && $('detailsTitle').textContent === 'Série Com Temporadas');
          $('detailsBody').querySelector('.watched-button.full').click();
          $('closeDetails').click();
          await waitFor(() => !$('details').open);
          tab('favorites');
          await waitFor(() => $('watchedGrid').querySelectorAll('.card').length === 2);
          const cards = [...$('watchedGrid').querySelectorAll('.card')];
          check('Marcar pelos detalhes adiciona à seção, o mais recente primeiro', cards[0].textContent.includes('Série Com Temporadas') && cards[0].querySelector('.card-meta').textContent.startsWith('Assistido em'));
        }
      }
    ]
  },
  {
    name: 'Lembretes',
    steps: [
      {
        fresh: true,
        before: ({ mock }) => mock.setPhase(0),
        run: async ({ $, grid, titles, waitFor, tab, check }) => {
          await waitFor(() => grid().length >= 20);
          tab('cinema');
          await waitFor(() => grid().length && titles()[0].startsWith('Cartaz'));
          check('Aba Cinema abre em "Em cartaz" com sino nos cards', grid().every((c) => c.querySelector('.reminder-button.icon')));
          document.querySelector('[data-section="upcoming"]').click();
          await waitFor(() => titles()[0] === 'Filme Futuro');
          const brDate = new Date(Date.now() + 20 * 864e5).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
          check('"Em breve" mostra a data de estreia no Brasil', grid()[0].querySelector('.card-meta').textContent === `Estreia ${brDate}`, grid()[0].querySelector('.card-meta').textContent);
          check('"Em breve" esconde o que já estreou', titles().join(',') === 'Filme Futuro,Outro Futuro');
          grid()[0].querySelector('.reminder-button').click();
          await waitFor(() => { const saved = JSON.parse(localStorage.getItem('cineguia-lembretes') || '[]'); return saved[0] && saved[0].known; });
          check('Lembrete salvo com a situação atual (sem aviso falso)', $('alerts').classList.contains('hidden'));
          grid()[0].querySelector('.card-open').click();
          await waitFor(() => $('detailsTitle') && $('detailsTitle').textContent === 'Filme Futuro');
          const gcal = [...$('detailsBody').querySelectorAll('a.action-button')].find((a) => a.textContent.includes('Google'));
          const ymd = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10).replaceAll('-', '');
          check('Google Agenda com a data da estreia e link novo', gcal.href.includes(`dates=${ymd}%2F`) && decodeURIComponent(gcal.href).includes('/filme/900'));
          let blob = null;
          const create = URL.createObjectURL;
          const click = HTMLAnchorElement.prototype.click;
          URL.createObjectURL = (value) => { blob = value; return create(value); };
          HTMLAnchorElement.prototype.click = function () {};
          [...$('detailsBody').querySelectorAll('button.action-button')].find((b) => b.textContent.includes('.ics')).click();
          URL.createObjectURL = create;
          HTMLAnchorElement.prototype.click = click;
          const ics = blob ? await blob.text() : '';
          check('Arquivo .ics com a data e alarme', ics.includes(`DTSTART;VALUE=DATE:${ymd}`) && ics.includes('BEGIN:VALARM'));
        }
      },
      {
        before: ({ mock }) => mock.setPhase(1),
        run: async ({ $, waitFor, tab, check }) => {
          await waitFor(() => !$('alerts').classList.contains('hidden'));
          const items = [...document.querySelectorAll('.alert')].map((a) => a.textContent);
          check('Ao voltar: aviso de estreia e de chegada na Netflix', items.some((t) => t.includes('estreou nos cinemas!')) && items.some((t) => t.includes('chegou em Netflix!')), items.join(' | '));
          check('Contador de novidades na aba', $('alertsBadge').textContent === '2');
          tab('favorites');
          await waitFor(() => $('remindersGrid').querySelector('.card-meta'));
          check('Status do lembrete atualizado', $('remindersGrid').querySelector('.card-meta').textContent === 'Disponível em Netflix');
          $('alertsClear').click();
          check('Limpar tudo esconde os avisos', $('alerts').classList.contains('hidden') && $('alertsBadge').classList.contains('hidden'));
        }
      }
    ]
  },
  {
    name: 'Domínio público',
    steps: [
      {
        fresh: true,
        run: async ({ $, grid, waitFor, tab, check }) => {
          await waitFor(() => grid().length >= 20);
          tab('public');
          await waitFor(() => document.querySelectorAll('#grid .public-card').length === 24);
          const names = [...document.querySelectorAll('#grid .public-card .card-title')].map((t) => t.textContent);
          check('Lista 24 clássicos com os filtros de licença e conteúdo', names.every((t) => t.startsWith('Clássico')));
          $('publicSearchInput').value = 'nosferatu';
          $('publicSearchForm').requestSubmit();
          await waitFor(() => document.querySelectorAll('#grid .public-card').length === 1);
          document.querySelector('#grid .public-card .card-open').click();
          await waitFor(() => $('publicVideo'));
          check('Player nativo com o vídeo do Internet Archive', $('publicVideo').getAttribute('src') === 'https://archive.org/download/nosferatu_teste/parte-1of3.mp4' && location.pathname === '/dominio/nosferatu_teste');
          check('Descrição sem HTML', $('detailsBody').querySelector('.public-description').textContent === 'Um clássico do terror.');
          const parts = [...$('detailsBody').querySelectorAll('.part-picker .segment')];
          parts[1].click();
          check('Botões de parte trocam o vídeo', parts.length === 3 && $('publicVideo').getAttribute('src').endsWith('parte-2of3.mp4'));
        }
      },
      {
        path: '/dominio/bloqueado',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => $('detailsBody').querySelector('.details-loading.error'));
          check('Conteúdo bloqueado não abre nem pelo link', $('detailsBody').textContent.includes('não está disponível') && !$('publicVideo'));
        }
      },
      {
        path: '/dominio/sem_licenca',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => $('detailsBody').querySelector('.details-loading.error'));
          check('Sem licença de domínio público é recusado', $('detailsBody').textContent.includes('não está marcado como domínio público'));
        }
      }
    ]
  },
  {
    name: 'Sagas',
    steps: [
      {
        fresh: true,
        run: async ({ $, grid, waitFor, tab, check }) => {
          await waitFor(() => grid().length >= 20);
          tab('sagas');
          await waitFor(() => document.querySelectorAll('#sagaCollections .saga-card').length > 100);
          check('15 sagas completas e as coleções por categoria', document.querySelectorAll('#sagaCurated .saga-card').length === 15 && document.querySelectorAll('.saga-category').length === 8);
          $('sagaSearchInput').value = 'harry';
          $('sagaSearchForm').requestSubmit();
          await waitFor(() => $('sagaCollections').textContent.includes('Harry Potter'));
          document.querySelector('#sagaCollections .card-open').click();
          await waitFor(() => document.querySelectorAll('#details .timeline-item').length === 2);
          const first = document.querySelector('#details .timeline-title').textContent;
          check('Coleção do TMDB em ordem de lançamento, sem ordem da história', first === 'Harry Potter e a Pedra Filosofal' && !document.querySelector('#details .saga-order') && location.pathname === '/saga/1241');
        }
      },
      {
        path: '/saga/marvel',
        run: async ({ waitFor, sleep, check }) => {
          await waitFor(() => document.querySelectorAll('#details .timeline-item').length === 54);
          const firstTitle = () => document.querySelector('#details .timeline-title').textContent;
          check('Marvel pelo link direto, em ordem de lançamento', firstTitle() === 'Homem de Ferro');
          document.querySelectorAll('#details .saga-order .segment')[1].click();
          await sleep(100);
          check('Ordem da história começa no Capitão América', firstTitle() === 'Capitão América: O Primeiro Vingador');
          document.querySelectorAll('#details .timeline-item .watched-button')[0].click();
          check('Já assisti atualiza a barra de progresso', document.querySelector('#details .saga-progress-text').textContent.startsWith('1 de 54'));
          [...document.querySelectorAll('#details .subsaga-chip')].find((chip) => chip.textContent.startsWith('Thor')).click();
          await sleep(100);
          const thor = [...document.querySelectorAll('#details .timeline-title')].map((t) => t.textContent);
          check('Filtro de sub-saga: só Thor', thor.length === 4 && thor.every((t) => t.startsWith('Thor')));
        }
      },
      {
        path: '/filme/1771',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => document.querySelector('#details .saga-link'));
          check('Detalhes mostram "Faz parte de" com a posição na história', document.querySelector('#details .saga-link').textContent.includes('1º de 54'));
          check('Marcado na saga aparece nos detalhes', $('detailsBody').querySelector('.watched-button.full').getAttribute('aria-pressed') === 'true');
        }
      }
    ]
  },
  {
    name: 'Para você',
    steps: [
      {
        fresh: true,
        run: async () => {
          localStorage.setItem('cineguia-assistidos', JSON.stringify(['movie-7']));
          localStorage.setItem('cineguia-assistidos-dados', JSON.stringify({ 'movie-7': { id: 7, type: 'movie', title: 'A Origem', year: '2010', poster: null, rating: 8, watchedAt: 1 } }));
          localStorage.setItem('cineguia-favoritos', JSON.stringify([{ id: 555, type: 'movie', title: 'Tenet', year: '2020', poster: null, rating: 7 }]));
        }
      },
      {
        run: async ({ $, waitFor, tab, check }) => {
          await waitFor(() => $('forYouRow').children.length > 0);
          const cards = [...$('forYouRow').querySelectorAll('.card')];
          const text = cards.map((c) => `${c.querySelector('.card-title').textContent} / ${c.querySelector('.card-meta').textContent}`);
          check('Para você aparece em Em alta com o mais recomendado primeiro', cards[0].querySelector('.card-title').textContent === 'Recomendado por todos', text.join(' | '));
          check('Explica o motivo (viu ou salvou)', text.some((t) => t.includes('Porque você viu A Origem')) && text.some((t) => t.includes('Porque você salvou Tenet')));
          check('Não recomenda o que já foi visto ou salvo', !text.some((t) => t.startsWith('A Origem /') || t.startsWith('Tenet /')));
          tab('movies');
          check('Some nas outras abas', $('forYou').classList.contains('hidden'));
        }
      },
      {
        fresh: true,
        run: async ({ $, grid, waitFor, sleep, check }) => {
          await waitFor(() => grid().length >= 20);
          await sleep(300);
          check('Sem histórico, a seção não aparece', $('forYou').classList.contains('hidden'));
        }
      }
    ]
  },
  {
    name: 'Backup',
    steps: [
      {
        fresh: true,
        run: async () => {
          localStorage.setItem('cineguia-favoritos', JSON.stringify([{ id: 555, type: 'movie', title: 'Tenet', year: '2020', poster: null, rating: 7 }]));
          localStorage.setItem('cineguia-assistidos', JSON.stringify(['movie-7']));
          localStorage.setItem('cineguia-assistidos-dados', JSON.stringify({ 'movie-7': { id: 7, type: 'movie', title: 'A Origem', year: '2010', poster: null, rating: 8, watchedAt: 1 } }));
        }
      },
      {
        run: async ({ $, grid, waitFor, tab, check }) => {
          await waitFor(() => grid().length >= 20);
          tab('favorites');
          let blob = null;
          const create = URL.createObjectURL;
          const click = HTMLAnchorElement.prototype.click;
          URL.createObjectURL = (value) => { blob = value; return create(value); };
          HTMLAnchorElement.prototype.click = function () {};
          $('backupExport').click();
          URL.createObjectURL = create;
          HTMLAnchorElement.prototype.click = click;
          const backup = JSON.parse(await blob.text());
          check('Exportar gera o arquivo com favoritos e assistidos', backup.app === 'cineguia' && backup.favorites.length === 1 && backup.watched.includes('movie-7') && backup.watchedData['movie-7'].title === 'A Origem');

          const pick = (content) => {
            const transfer = new DataTransfer();
            transfer.items.add(new File([content], 'backup.json', { type: 'application/json' }));
            $('backupFile').files = transfer.files;
            $('backupFile').dispatchEvent(new Event('change'));
          };
          backup.favorites.push({ id: 556, type: 'movie', title: 'Amnésia', year: '2000', poster: null, rating: 8 });
          backup.reminders = [{ id: 900, type: 'movie', title: 'Filme Futuro', year: '', poster: null, rating: null, releaseDate: null, known: null }];
          backup.watched.push('tv-42');
          backup.watchedData['tv-42'] = { id: 42, type: 'tv', title: 'Série Com Temporadas', year: '2019', poster: null, rating: 8, watchedAt: 2 };
          pick(JSON.stringify(backup));
          await waitFor(() => $('toast').textContent.startsWith('Backup importado'));
          check('Importar junta com o que já existe, sem duplicar', $('toast').textContent === 'Backup importado: 1 favorito, 1 lembrete, 1 assistido novos.', $('toast').textContent);
          check('Itens importados aparecem na Minha lista', grid().length === 2 && $('remindersGrid').children.length === 1 && $('watchedGrid').querySelectorAll('.card').length === 2);
          pick('{"qualquer": "coisa"}');
          await waitFor(() => $('toast').textContent.includes('não é um backup'));
          check('Arquivo que não é backup é recusado', $('toast').textContent === 'Este arquivo não é um backup do CineGuia.');
          pick('isto não é json');
          await waitFor(() => $('toast').textContent.includes('Não foi possível ler'));
          check('Arquivo corrompido é recusado', grid().length === 2);
        }
      }
    ]
  },
  {
    name: 'App instalável',
    steps: [{
      fresh: true,
      run: async ({ waitFor, check }) => {
        check('Página liga o manifesto e o ícone do iPhone', !!document.querySelector('link[rel="manifest"]') && !!document.querySelector('link[rel="apple-touch-icon"]'));
        const ready = await waitFor(() => navigator.serviceWorker.controller, 10000) || !!(await navigator.serviceWorker.getRegistration());
        const registration = await navigator.serviceWorker.getRegistration();
        check('Service worker registrado', ready && !!registration && registration.active !== undefined);
        const cache = await caches.open('cineguia-v1');
        await waitFor(() => true);
        const keys = (await cache.keys()).map((request) => new URL(request.url).pathname);
        check('Arquivos do app guardados para abrir sem internet', keys.includes('/') && keys.includes('/js/main.js'), `${keys.length} arquivos`);
      }
    }, {
      run: async ({ $, waitFor, check }) => {
        // Headless Chrome never offers its own install prompt, like iPhone or in-app browsers.
        check('Botão "Instalar app" aparece mesmo sem o convite do navegador', !$('installButton').classList.contains('hidden'));
        $('installButton').click();
        await waitFor(() => $('installHelp').open);
        check('Sem o convite, o botão mostra o passo a passo', $('installHelp').open && $('installHelpSteps').children.length >= 2);
        $('installHelp').querySelector('button[type="submit"]').click();
        await waitFor(() => !$('installHelp').open);
        check('Passo a passo fecha em "Entendi"', !$('installHelp').open);
      }
    }]
  },
  ...DEVICES.map((device) => ({
    name: `Responsivo (${device.name})`,
    steps: [
      {
        device,
        run: async ({ grid, waitFor, tab, check }) => {
          await waitFor(() => grid().length >= 20);
          const overflow = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
          check('Página inicial sem rolagem lateral', overflow() === 0, overflow());
          tab('sagas');
          await waitFor(() => document.querySelectorAll('#sagaCurated .saga-card').length === 15);
          check('Aba Sagas sem rolagem lateral', overflow() === 0, overflow());
          tab('platforms');
          await waitFor(() => document.querySelectorAll('.ranking-item').length === 20);
          check('Top 10 sem rolagem lateral', overflow() === 0, overflow());
        }
      },
      {
        device,
        path: '/filme/7',
        run: async ({ $, waitFor, check }) => {
          await waitFor(() => $('detailsTitle'));
          const dialog = $('details');
          check('Detalhes sem rolagem lateral', dialog.scrollWidth - dialog.clientWidth === 0);
          const rect = dialog.getBoundingClientRect();
          const fullScreen = rect.width >= innerWidth - 1 && rect.height >= innerHeight - 1;
          check(innerWidth <= 600 || innerHeight <= 500 ? 'Detalhes em tela cheia no celular' : 'Detalhes em janela no tablet/computador',
            innerWidth <= 600 || innerHeight <= 500 ? fullScreen : !fullScreen);
        }
      }
    ]
  }))
];

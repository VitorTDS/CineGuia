// Source list for the hand-built sagas and the featured TMDB collections.
// `year` is the release year used to find the right TMDB entry.
// Entries are listed in story (in-universe) order; release order comes from the dates.
// Run `npm run sagas` after editing this file to regenerate data/sagas.json.

const curated = [
  {
    slug: 'marvel',
    name: 'Universo Cinematográfico Marvel',
    description: 'Filmes e séries do MCU. A ordem da história segue a linha do tempo oficial divulgada pela Marvel/Disney, com Quarteto Fantástico, de outro universo, no fim.',
    items: [
      { type: 'movie', title: 'Captain America: The First Avenger', year: 2011 },
      { type: 'movie', title: 'Captain Marvel', year: 2019 },
      { type: 'movie', title: 'Iron Man', year: 2008 },
      { type: 'movie', title: 'Iron Man 2', year: 2010 },
      { type: 'movie', title: 'The Incredible Hulk', year: 2008 },
      { type: 'movie', title: 'Thor', year: 2011 },
      { type: 'movie', title: 'The Avengers', year: 2012 },
      { type: 'movie', title: 'Thor: The Dark World', year: 2013 },
      { type: 'movie', title: 'Iron Man 3', year: 2013 },
      { type: 'movie', title: 'Captain America: The Winter Soldier', year: 2014 },
      { type: 'movie', title: 'Guardians of the Galaxy', year: 2014 },
      { type: 'movie', title: 'Guardians of the Galaxy Vol. 2', year: 2017 },
      { type: 'movie', title: 'Avengers: Age of Ultron', year: 2015 },
      { type: 'movie', title: 'Ant-Man', year: 2015 },
      { type: 'movie', title: 'Captain America: Civil War', year: 2016 },
      { type: 'movie', title: 'Black Widow', year: 2021 },
      { type: 'movie', title: 'Black Panther', year: 2018 },
      { type: 'movie', title: 'Spider-Man: Homecoming', year: 2017 },
      { type: 'movie', title: 'Doctor Strange', year: 2016 },
      { type: 'movie', title: 'Thor: Ragnarok', year: 2017 },
      { type: 'movie', title: 'Ant-Man and the Wasp', year: 2018 },
      { type: 'movie', title: 'Avengers: Infinity War', year: 2018 },
      { type: 'movie', title: 'Avengers: Endgame', year: 2019 },
      { type: 'tv', title: 'Loki', year: 2021 },
      { type: 'tv', title: 'What If...?', year: 2021 },
      { type: 'tv', title: 'WandaVision', year: 2021 },
      { type: 'tv', title: 'The Falcon and the Winter Soldier', year: 2021 },
      { type: 'movie', title: 'Shang-Chi and the Legend of the Ten Rings', year: 2021 },
      { type: 'movie', title: 'Eternals', year: 2021 },
      { type: 'movie', title: 'Spider-Man: Far From Home', year: 2019 },
      { type: 'movie', title: 'Spider-Man: No Way Home', year: 2021 },
      { type: 'tv', title: 'Hawkeye', year: 2021 },
      { type: 'movie', title: 'Doctor Strange in the Multiverse of Madness', year: 2022 },
      { type: 'tv', title: 'Moon Knight', year: 2022 },
      { type: 'movie', title: 'Black Panther: Wakanda Forever', year: 2022 },
      { type: 'tv', title: 'Echo', year: 2024 },
      { type: 'tv', title: 'She-Hulk: Attorney at Law', year: 2022 },
      { type: 'tv', title: 'Ms. Marvel', year: 2022 },
      { type: 'movie', title: 'Thor: Love and Thunder', year: 2022 },
      { type: 'movie', title: 'Werewolf by Night', year: 2022 },
      { type: 'movie', title: 'The Guardians of the Galaxy Holiday Special', year: 2022 },
      { type: 'movie', title: 'Ant-Man and the Wasp: Quantumania', year: 2023 },
      { type: 'movie', title: 'Guardians of the Galaxy Vol. 3', year: 2023 },
      { type: 'tv', title: 'Secret Invasion', year: 2023 },
      { type: 'movie', title: 'The Marvels', year: 2023 },
      { type: 'tv', title: 'Agatha All Along', year: 2024 },
      { type: 'movie', title: 'Deadpool & Wolverine', year: 2024 },
      { type: 'movie', title: 'Captain America: Brave New World', year: 2025 },
      { type: 'tv', title: 'Daredevil: Born Again', year: 2025 },
      { type: 'movie', title: 'Thunderbolts*', year: 2025 },
      { type: 'tv', title: 'Ironheart', year: 2025 },
      { type: 'movie', title: 'Spider-Man: Brand New Day', year: 2026 },
      { type: 'movie', title: 'Avengers: Doomsday', year: 2026 },
      { type: 'movie', title: 'The Fantastic Four: First Steps', year: 2025 }
    ]
  },
  {
    slug: 'star-wars',
    name: 'Star Wars',
    description: 'Filmes e séries da linha do tempo oficial (cânone) de Star Wars, da Alta República à Ascensão Skywalker.',
    items: [
      { type: 'tv', title: 'The Acolyte', year: 2024 },
      { type: 'movie', title: 'Star Wars: Episode I - The Phantom Menace', year: 1999 },
      { type: 'movie', title: 'Star Wars: Episode II - Attack of the Clones', year: 2002 },
      { type: 'movie', title: 'Star Wars: The Clone Wars', year: 2008 },
      { type: 'tv', title: 'Star Wars: The Clone Wars', year: 2008 },
      { type: 'movie', title: 'Star Wars: Episode III - Revenge of the Sith', year: 2005 },
      { type: 'tv', title: 'Star Wars: The Bad Batch', year: 2021 },
      { type: 'movie', title: 'Solo: A Star Wars Story', year: 2018 },
      { type: 'tv', title: 'Obi-Wan Kenobi', year: 2022 },
      { type: 'tv', title: 'Andor', year: 2022 },
      { type: 'tv', title: 'Star Wars Rebels', year: 2014 },
      { type: 'movie', title: 'Rogue One: A Star Wars Story', year: 2016 },
      { type: 'movie', title: 'Star Wars', year: 1977 },
      { type: 'movie', title: 'The Empire Strikes Back', year: 1980 },
      { type: 'movie', title: 'Return of the Jedi', year: 1983 },
      { type: 'tv', title: 'The Mandalorian', year: 2019 },
      { type: 'tv', title: 'The Book of Boba Fett', year: 2021 },
      { type: 'tv', title: 'Ahsoka', year: 2023 },
      { type: 'tv', title: 'Star Wars: Skeleton Crew', year: 2024 },
      { type: 'movie', title: 'The Mandalorian and Grogu', year: 2026 },
      { type: 'tv', title: 'Star Wars Resistance', year: 2018 },
      { type: 'movie', title: 'Star Wars: The Force Awakens', year: 2015 },
      { type: 'movie', title: 'Star Wars: The Last Jedi', year: 2017 },
      { type: 'movie', title: 'Star Wars: The Rise of Skywalker', year: 2019 }
    ]
  },
  {
    slug: 'terra-media',
    name: 'Terra-média (O Senhor dos Anéis)',
    description: 'O mundo de Tolkien, da Segunda Era de Os Anéis de Poder até a Guerra do Anel.',
    items: [
      { type: 'tv', title: 'The Lord of the Rings: The Rings of Power', year: 2022 },
      { type: 'movie', title: 'The Lord of the Rings: The War of the Rohirrim', year: 2024 },
      { type: 'movie', title: 'The Hobbit: An Unexpected Journey', year: 2012 },
      { type: 'movie', title: 'The Hobbit: The Desolation of Smaug', year: 2013 },
      { type: 'movie', title: 'The Hobbit: The Battle of the Five Armies', year: 2014 },
      { type: 'movie', title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001 },
      { type: 'movie', title: 'The Lord of the Rings: The Two Towers', year: 2002 },
      { type: 'movie', title: 'The Lord of the Rings: The Return of the King', year: 2003 }
    ]
  },
  {
    slug: 'star-trek',
    name: 'Star Trek',
    description: 'Séries e filmes da linha do tempo principal, ordenados pelo início de cada história (Discovery salta para o século 32 a partir da 3ª temporada). Os filmes de 2009 em diante, da linha do tempo alternativa, ficam no fim.',
    items: [
      { type: 'tv', title: 'Star Trek: Enterprise', year: 2001 },
      { type: 'tv', title: 'Star Trek: Discovery', year: 2017 },
      { type: 'tv', title: 'Star Trek: Strange New Worlds', year: 2022 },
      { type: 'tv', title: 'Star Trek', year: 1966 },
      { type: 'tv', title: 'Star Trek: The Animated Series', year: 1973 },
      { type: 'movie', title: 'Star Trek: The Motion Picture', year: 1979 },
      { type: 'movie', title: 'Star Trek II: The Wrath of Khan', year: 1982 },
      { type: 'movie', title: 'Star Trek III: The Search for Spock', year: 1984 },
      { type: 'movie', title: 'Star Trek IV: The Voyage Home', year: 1986 },
      { type: 'movie', title: 'Star Trek V: The Final Frontier', year: 1989 },
      { type: 'movie', title: 'Star Trek VI: The Undiscovered Country', year: 1991 },
      { type: 'tv', title: 'Star Trek: The Next Generation', year: 1987 },
      { type: 'tv', title: 'Star Trek: Deep Space Nine', year: 1993 },
      { type: 'movie', title: 'Star Trek: Generations', year: 1994 },
      { type: 'tv', title: 'Star Trek: Voyager', year: 1995 },
      { type: 'movie', title: 'Star Trek: First Contact', year: 1996 },
      { type: 'movie', title: 'Star Trek: Insurrection', year: 1998 },
      { type: 'movie', title: 'Star Trek: Nemesis', year: 2002 },
      { type: 'tv', title: 'Star Trek: Lower Decks', year: 2020 },
      { type: 'tv', title: 'Star Trek: Prodigy', year: 2021 },
      { type: 'tv', title: 'Star Trek: Picard', year: 2020 },
      { type: 'movie', title: 'Star Trek', year: 2009 },
      { type: 'movie', title: 'Star Trek Into Darkness', year: 2013 },
      { type: 'movie', title: 'Star Trek Beyond', year: 2016 }
    ]
  },
  {
    slug: 'dc',
    name: 'Universo Estendido DC',
    description: 'Filmes e séries do DCEU, de Mulher-Maravilha na Primeira Guerra até Aquaman 2.',
    items: [
      { type: 'movie', title: 'Wonder Woman', year: 2017 },
      { type: 'movie', title: 'Wonder Woman 1984', year: 2020 },
      { type: 'movie', title: 'Man of Steel', year: 2013 },
      { type: 'movie', title: 'Batman v Superman: Dawn of Justice', year: 2016 },
      { type: 'movie', title: 'Suicide Squad', year: 2016 },
      { type: 'movie', title: 'Justice League', year: 2017 },
      { type: 'movie', title: 'Zack Snyder\'s Justice League', year: 2021 },
      { type: 'movie', title: 'Aquaman', year: 2018 },
      { type: 'movie', title: 'Shazam!', year: 2019 },
      { type: 'movie', title: 'Birds of Prey (and the Fantabulous Emancipation of One Harley Quinn)', year: 2020 },
      { type: 'movie', title: 'The Suicide Squad', year: 2021 },
      { type: 'tv', title: 'Peacemaker', year: 2022 },
      { type: 'movie', title: 'Black Adam', year: 2022 },
      { type: 'movie', title: 'Shazam! Fury of the Gods', year: 2023 },
      { type: 'movie', title: 'The Flash', year: 2023 },
      { type: 'movie', title: 'Blue Beetle', year: 2023 },
      { type: 'movie', title: 'Aquaman and the Lost Kingdom', year: 2023 }
    ]
  },
  {
    slug: 'breaking-bad',
    name: 'Breaking Bad',
    description: 'A história de Walter White e Jesse Pinkman, com a origem de Saul Goodman em Better Call Saul.',
    items: [
      { type: 'tv', title: 'Better Call Saul', year: 2015 },
      { type: 'tv', title: 'Breaking Bad', year: 2008 },
      { type: 'movie', title: 'El Camino: A Breaking Bad Movie', year: 2019 }
    ]
  },
  {
    slug: 'jurassic',
    name: 'Jurassic Park e Jurassic World',
    description: 'Os filmes e as séries animadas, que se passam entre Jurassic World e Domínio.',
    items: [
      { type: 'movie', title: 'Jurassic Park', year: 1993 },
      { type: 'movie', title: 'The Lost World: Jurassic Park', year: 1997 },
      { type: 'movie', title: 'Jurassic Park III', year: 2001 },
      { type: 'movie', title: 'Jurassic World', year: 2015 },
      { type: 'tv', title: 'Jurassic World: Camp Cretaceous', year: 2020 },
      { type: 'movie', title: 'Jurassic World: Fallen Kingdom', year: 2018 },
      { type: 'tv', title: 'Jurassic World: Chaos Theory', year: 2024 },
      { type: 'movie', title: 'Jurassic World Dominion', year: 2022 },
      { type: 'movie', title: 'Jurassic World Rebirth', year: 2025 }
    ]
  },
  {
    slug: 'alien',
    name: 'Alien',
    description: 'Dos engenheiros de Prometheus à Ripley, passando pela série Alien: Earth.',
    items: [
      { type: 'movie', title: 'Prometheus', year: 2012 },
      { type: 'movie', title: 'Alien: Covenant', year: 2017 },
      { type: 'tv', title: 'Alien: Earth', year: 2025 },
      { type: 'movie', title: 'Alien', year: 1979 },
      { type: 'movie', title: 'Alien: Romulus', year: 2024 },
      { type: 'movie', title: 'Aliens', year: 1986 },
      { type: 'movie', title: 'Alien³', year: 1992 },
      { type: 'movie', title: 'Alien Resurrection', year: 1997 }
    ]
  },
  {
    slug: 'john-wick',
    name: 'John Wick',
    description: 'O mundo dos assassinos do Continental, dos anos 1970 até o Capítulo 4.',
    items: [
      { type: 'tv', title: 'The Continental: From the World of John Wick', year: 2023 },
      { type: 'movie', title: 'John Wick', year: 2014 },
      { type: 'movie', title: 'John Wick: Chapter 2', year: 2017 },
      { type: 'movie', title: 'John Wick: Chapter 3 - Parabellum', year: 2019 },
      { type: 'movie', title: 'Ballerina', year: 2025 },
      { type: 'movie', title: 'John Wick: Chapter 4', year: 2023 }
    ]
  },
  {
    slug: 'stargate',
    name: 'Stargate',
    description: 'Do filme de 1994 às séries SG-1, Atlantis e Universe, com os filmes que encerram SG-1.',
    items: [
      { type: 'movie', title: 'Stargate', year: 1994 },
      { type: 'tv', title: 'Stargate SG-1', year: 1997 },
      { type: 'tv', title: 'Stargate Atlantis', year: 2004 },
      { type: 'movie', title: 'Stargate: The Ark of Truth', year: 2008 },
      { type: 'movie', title: 'Stargate: Continuum', year: 2008 },
      { type: 'tv', title: 'Stargate Universe', year: 2009 }
    ]
  },
  {
    slug: 'os-normais',
    name: 'Os Normais',
    description: 'Rui e Vani, da série da Globo aos dois filmes.',
    items: [
      { type: 'tv', title: 'Os Normais', year: 2001 },
      { type: 'movie', title: 'Os Normais: O Filme', year: 2003 },
      { type: 'movie', title: 'Os Normais 2: A Noite Mais Maluca de Todas', year: 2009 }
    ]
  },
  {
    slug: 'a-grande-familia',
    name: 'A Grande Família',
    description: 'A família Silva, da série da Globo ao filme.',
    items: [
      { type: 'tv', title: 'A Grande Família', year: 2001 },
      { type: 'movie', title: 'A Grande Família: O Filme', year: 2007 }
    ]
  },
  {
    slug: 'cidade-de-deus',
    name: 'Cidade de Deus',
    description: 'O filme de 2002, o universo de Cidade dos Homens e a continuação em série, 20 anos depois.',
    items: [
      { type: 'movie', title: 'Cidade de Deus', year: 2002 },
      { type: 'tv', title: 'Cidade dos Homens', year: 2002 },
      { type: 'movie', title: 'Cidade dos Homens', year: 2007 },
      { type: 'tv', title: 'Cidade de Deus: A Luta Não Para', year: 2024 }
    ]
  }
];

// Featured TMDB collections (movies only), grouped by category.
// Names are the collection's original (English) name on TMDB; the build script requires an exact match.
const featuredCollections = [
  {
    category: 'Super-heróis',
    names: [
      'The Avengers Collection', 'Iron Man Collection', 'Thor Collection', 'Captain America Collection',
      'Guardians of the Galaxy Collection', 'Ant-Man Collection', 'Black Panther Collection', 'Doctor Strange Collection',
      'Spider-Man (MCU) Collection', 'Spider-Man Collection', 'The Amazing Spider-Man Collection',
      'X-Men Collection', 'The Wolverine Collection', 'Deadpool Collection', 'Venom Collection',
      'The Dark Knight Collection', 'Superman Collection', 'Hellboy Collection', 'Blade Collection'
    ]
  },
  {
    category: 'Fantasia e ficção científica',
    names: [
      'Harry Potter Collection', 'Fantastic Beasts Collection', 'The Lord of the Rings Collection', 'The Hobbit Collection',
      'The Chronicles of Narnia Collection', 'Percy Jackson Collection', 'Avatar Collection', 'Dune Collection',
      'The Matrix Collection', 'Back to the Future Collection', 'Jurassic Park Collection', 'Planet of the Apes (Reboot) Collection',
      'Planet of the Apes (Original) Collection', 'Star Trek: The Original Series Collection', 'Star Trek: Alternate Reality Collection',
      'Transformers Collection', 'Men in Black Collection', 'Ghostbusters Collection', 'Alien Collection', 'Predator Collection',
      'The Terminator Collection', 'Mad Max Collection', 'Tron Collection', 'Jumanji Collection'
    ]
  },
  {
    category: 'Distopias e aventuras jovens',
    names: [
      'The Hunger Games Collection', 'Twilight Collection', 'Divergent Collection', 'The Maze Runner Collection',
      'The Karate Kid Collection', 'Spy Kids Collection', 'National Treasure Collection'
    ]
  },
  {
    category: 'Ação e aventura',
    names: [
      'The Fast and the Furious Collection', 'Mission: Impossible Collection', 'James Bond Collection', 'The Bourne Collection',
      'John Wick Collection', 'Pirates of the Caribbean Collection', 'Indiana Jones Collection', 'Die Hard Collection',
      'Lethal Weapon Collection', 'Rambo Collection', 'Rocky Collection', 'Creed Collection', 'The Expendables Collection',
      'Taken Collection', 'The Equalizer Collection', 'Kingsman Collection', 'Top Gun Collection', 'Bad Boys Collection',
      'Rush Hour Collection', 'Kill Bill Collection', 'Ocean\'s Collection', 'Now You See Me Collection', 'The Mummy Collection',
      'Tomb Raider Collection', 'Sherlock Holmes Collection', 'Underworld Collection', 'Resident Evil Collection',
      'The Transporter Collection', 'The Chronicles of Riddick Collection', 'The Godfather Collection'
    ]
  },
  {
    category: 'Animação',
    names: [
      'Toy Story Collection', 'Shrek Collection', 'Ice Age Collection', 'Madagascar Collection', 'Despicable Me Collection',
      'Kung Fu Panda Collection', 'How to Train Your Dragon Collection', 'Cars Collection', 'Frozen Collection',
      'Finding Nemo Collection', 'The Incredibles Collection', 'Monsters, Inc. Collection', 'Hotel Transylvania Collection',
      'The Lego Movie Collection', 'Rio Collection', 'Puss in Boots Collection', 'Inside Out Collection', 'Moana Collection',
      'Zootopia Collection', 'Sonic the Hedgehog Collection', 'Paddington Collection', 'The Secret Life of Pets Collection',
      'Sing Collection', 'The Trolls Collection', 'Wreck-It Ralph Collection', 'The Lion King Collection'
    ]
  },
  {
    category: 'Terror e suspense',
    names: [
      'The Conjuring Collection', 'Annabelle Collection', 'Insidious Collection', 'Scream Collection', 'Halloween Collection',
      'Friday the 13th Collection', 'A Nightmare on Elm Street Collection', 'Saw Collection', 'Final Destination Collection',
      'The Purge Collection', 'Paranormal Activity Collection', 'Texas Chainsaw Massacre Collection', 'Evil Dead Collection',
      'It Collection', 'Child\'s Play Collection', 'A Quiet Place Collection', 'Sinister Collection', 'The Ring Collection',
      '28 Days/Weeks/Years Later Collection', 'Zombieland Collection', 'Jaws Collection'
    ]
  },
  {
    category: 'Comédia',
    names: [
      'The Hangover Collection', 'American Pie Collection', 'Meet the Parents Collection', 'Night at the Museum Collection',
      'Home Alone Collection', 'Pitch Perfect Collection', 'Police Academy Collection', 'Beverly Hills Cop Collection',
      'Austin Powers Collection', 'Scary Movie Collection', 'Legally Blonde Collection', 'Bridget Jones Collection',
      'Ted Collection', 'Jump Street Collection', 'Grown Ups Collection', 'Mall Cop Collection'
    ]
  },
  {
    category: 'Brasileiros',
    names: [
      'Elite Squad Collection', 'Minha Mãe é uma Peça: Coleção', 'Se Eu Fosse Você: Coleção', 'De Pernas pro Ar: Coleção',
      'Os Normais Collection', 'Cine Holliúdy: Coleção', 'Coleção Muita Calma Nessa Hora',
      'Até que a Sorte Nos Separe: Coleção', 'Turma da Mônica: Coleção'
    ]
  }
];

module.exports = { curated, featuredCollections };

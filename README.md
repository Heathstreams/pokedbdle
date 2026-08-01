# Pokédle

A daily Pokémon guessing game, Wordle-style. Every day there's a hidden Pokémon —
guess one and the game tells you how close you are across nine categories
(type, generation, color, evolution stage, height, weight, base stat total,
egg groups, and abilities). Live at [pokedle.day](https://pokedle.day).

## Features

- New Pokémon every day at local midnight, with streaks
- Generation filter — play with only the gens you know
- Progressive hints (species category after 10 guesses, Pokédex entry after 15)
- Five random-guess assists per day
- Share your result as an emoji grid
- Color-blind friendly color modes
- One shiny Pokémon hidden in the guess pool each day

## Stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Neon](https://neon.tech) serverless Postgres, populated from [PokéAPI](https://pokeapi.co/)
- Deployed on Netlify

## Development

Create a `.env` with your database connection string:

```
DATABASE_URL=postgres://...
```

Then:

```bash
npm install
npm run dev
```

The one-off scripts in `netlify/functions/` populate the database from PokéAPI.

## Disclaimer

Pokédle is a fan project, not affiliated with or endorsed by Nintendo,
The Pokémon Company, or Game Freak. Pokémon data comes from PokéAPI.

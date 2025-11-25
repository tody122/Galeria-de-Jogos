import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GameCard } from '@/components/GameCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PlayerNameButton } from '@/components/PlayerNameButton';
import { gamesList } from '@/data/games';

export default function Home() {
  return (
    <>
      <Head>
        <title>Galeria de Jogos HTML</title>
        <meta name="description" content="Galeria de jogos HTML autorais com suporte multiplayer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeToggle />
      <PlayerNameButton />
      <main className="container">
        <header className="header">
          <h1>🎮 Galeria de Jogos HTML</h1>
          <p>Jogos autorais com suporte multiplayer em tempo real</p>
        </header>

        <div className="games-grid">
          {gamesList.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </main>
    </>
  );
}

